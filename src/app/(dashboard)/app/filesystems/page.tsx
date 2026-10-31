"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  FolderInput,
  FolderTree,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { CopyButton } from "@/components/blocks/copy-button";
import { CreateFilesystemDialog } from "@/components/blocks/create-filesystem-dialog";
import { FilesystemImportDialog } from "@/components/blocks/filesystem-import-dialog";
import {
  DataTable,
  type BulkAction,
  type ColumnDef,
} from "@/components/blocks/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgStore } from "@/lib/stores/org-store";
import {
  useFilesystemsStore,
  filesystemsActions,
} from "@/lib/stores/filesystems-store";
import { FILESYSTEM_EXPLORER_PREFETCH_HREF } from "@/lib/constants/builder-routes";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { getErrorMessage } from "@/lib/api/errors";
import type { ApiFilesystem } from "@/types/api";

export default function FilesystemsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useFilesystemsStore((s) => s.data);
  const loaded = useFilesystemsStore((s) => s.loaded);
  const loading = useFilesystemsStore((s) => s.loading);
  const error = useFilesystemsStore((s) => s.error);
  const ensureLoaded = useFilesystemsStore((s) => s.ensureLoaded);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  } | null>({ columnId: "updated_at", direction: "desc" });
  const [pendingDelete, setPendingDelete] = useState<ApiFilesystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  useEffect(() => {
    router.prefetch(FILESYSTEM_EXPLORER_PREFETCH_HREF);
  }, [router]);

  const onDeleteConfirmed = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await filesystemsActions.delete(pendingDelete.filesystem_id);
      toast.success(
        `Deleted "${pendingDelete.name}" (${res.deleted.folders} folders, ${res.deleted.files} files)`
      );
      setPendingDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to delete filesystem"));
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete]);

  // --- Aj page hooks --------------------------------------------------------
  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);
  const SetSortArgs = useMemo(
    () =>
      z.object({
        columnId: z.enum(["name", "description", "updated_at"]),
        direction: z.enum(["asc", "desc"]),
      }),
    []
  );

  useGetPageData(
    () => ({
      data: {
        page: "filesystems",
        filesystem_count: data.length,
        search: query,
        sort,
        filesystems: data.slice(0, 50).map((f) => ({
          filesystem_id: f.filesystem_id,
          name: f.name,
          description: f.description,
          agent_path: `/${f.filesystem_id}`,
          updated_at: f.updated_at,
        })),
        note:
          "Filesystem memories are trees of folders and text files agents navigate with the Filesystem tools. Creating and deleting are user actions.",
      },
      actions: {
        set_search: {
          description: "Filter the visible filesystems by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        set_sort: {
          description: "Sort the table by one of the allowed columns.",
          argsSchema: z.toJSONSchema(SetSortArgs),
        },
        open_new_dialog: {
          description: "Open the 'New filesystem' dialog for the user to fill in.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        open_import_dialog: {
          description:
            "Open the 'Import folder' dialog so the user can pick a local folder to import as a new filesystem.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    }),
    [data, query, sort, SetSearchArgs, SetSortArgs]
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "set_search") {
        const parsed = SetSearchArgs.parse(args);
        setQuery(parsed.query);
        return { ok: true, query: parsed.query };
      }
      if (key === "set_sort") {
        const parsed = SetSortArgs.parse(args);
        setSort({ columnId: parsed.columnId, direction: parsed.direction });
        return { ok: true, sort: parsed };
      }
      if (key === "open_new_dialog") {
        setCreateOpen(true);
        return { ok: true };
      }
      if (key === "open_import_dialog") {
        setImportOpen(true);
        return { ok: true };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [SetSearchArgs, SetSortArgs]
  );

  const columns = useMemo<ColumnDef<ApiFilesystem>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "260px",
        sortValue: (f) => f.name.toLowerCase(),
        searchValue: (f) => `${f.name} ${f.filesystem_id}`,
        cell: (f) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <FolderTree className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium break-words">
                {f.name}
              </div>
              <div className="text-muted-foreground mt-0.5 flex items-center gap-1 font-mono text-xs">
                <span className="truncate" title={`/${f.filesystem_id}`}>
                  /{f.filesystem_id}
                </span>
                <CopyButton value={`/${f.filesystem_id}`} label="Copy agent path" />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        sortable: true,
        minWidth: "240px",
        sortValue: (f) => f.description.toLowerCase(),
        searchValue: (f) => f.description,
        cell: (f) => (
          <span className="text-muted-foreground line-clamp-2 text-sm">
            {f.description || <span className="italic">No description</span>}
          </span>
        ),
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        sortValue: (f) => f.updated_at,
        width: "150px",
        cell: (f) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(f.updated_at)}
          >
            {formatRelativeTime(f.updated_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        width: "56px",
        align: "right",
        cell: (f) => (
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="size-8" aria-label="Actions" />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => router.push(`/app/filesystems/${f.filesystem_id}`)}
                >
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setPendingDelete(f)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [router]
  );

  const bulkActions = useMemo<BulkAction<ApiFilesystem>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this filesystem?"
              : `Delete ${rows.length} filesystems?`,
          description: (rows) =>
            rows.length === 1 ? (
              <>
                <span className="text-foreground font-medium">{rows[0].name}</span>{" "}
                and every folder and file in it will be permanently removed.
                Agents whose prompts reference it will get{" "}
                <code className="font-mono text-xs">permission_denied</code>. This
                cannot be undone.
              </>
            ) : (
              `These ${rows.length} filesystems and all their contents will be permanently removed. This cannot be undone.`
            ),
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "filesystem" : "filesystems"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => filesystemsActions.delete(r.filesystem_id))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} filesystems · ${failed} failed`
            );
          }
        },
      },
    ],
    []
  );

  const importButton = (
    <Button variant="outline" onClick={() => setImportOpen(true)}>
      <FolderInput className="size-4" />
      Import folder
    </Button>
  );
  const newButton = (
    <Button variant="gradient" onClick={() => setCreateOpen(true)}>
      <Plus className="size-4" />
      New filesystem
    </Button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filesystems"
        subtitle="Folder-and-file memories your agents navigate, read and write."
        actions={
          <>
            <Button
              variant={bulkMode ? "solid" : "outline"}
              onClick={() => setBulkMode((v) => !v)}
              disabled={data.length === 0}
            >
              <CheckSquare className="size-4" />
              {bulkMode ? "Exit bulk select" : "Bulk select"}
            </Button>
            {importButton}
            {newButton}
          </>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}

      <DataTable<ApiFilesystem>
        data={data}
        columns={columns}
        getRowKey={(f) => f.filesystem_id}
        rowHref={(f) => `/app/filesystems/${f.filesystem_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search filesystems…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "filesystem", plural: "filesystems" }}
        emptyState={
          <EmptyState
            icon={FolderTree}
            title="No filesystems yet"
            description="A filesystem memory is a tree of folders (each with a description) and text files. Attach one to an agent and it navigates by folder names, opens only the files it needs, and keeps them up to date — a durable, browsable memory you can read and edit here."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                {importButton}
                {newButton}
              </div>
            }
          />
        }
      />

      <CreateFilesystemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={(p) => filesystemsActions.create(p)}
        onCreated={(fs) => router.push(`/app/filesystems/${fs.filesystem_id}`)}
      />

      <FilesystemImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode={{ kind: "new" }}
        onFinished={({ filesystemId }) =>
          router.push(`/app/filesystems/${filesystemId}`)
        }
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Delete this filesystem?"
        description={
          pendingDelete ? (
            <>
              <span className="text-foreground font-medium">{pendingDelete.name}</span>{" "}
              and every folder and file in it will be permanently removed. Agents
              whose prompts reference{" "}
              <code className="font-mono text-xs">/{pendingDelete.filesystem_id}</code>{" "}
              will get <code className="font-mono text-xs">permission_denied</code>.
              This cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Delete"
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
