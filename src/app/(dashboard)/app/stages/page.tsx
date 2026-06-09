"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { CopyButton } from "@/components/blocks/copy-button";
import {
  DataTable,
  type BulkAction,
  type ColumnDef,
} from "@/components/blocks/data-table";
import { CreateStageDialog } from "@/components/blocks/create-stage-dialog";
import { DeleteStageDialog } from "@/components/blocks/delete-stage-dialog";
import { useOrgStore } from "@/lib/stores/org-store";
import { useStagesStore, stagesActions } from "@/lib/stores/stages-store";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiStage, DeleteStageMode } from "@/types/api";

export default function StagesPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useStagesStore((s) => s.data);
  const loaded = useStagesStore((s) => s.loaded);
  const loading = useStagesStore((s) => s.loading);
  const error = useStagesStore((s) => s.error);
  const ensureLoaded = useStagesStore((s) => s.ensureLoaded);

  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  } | null>({ columnId: "updated_at", direction: "desc" });

  const [deleteTarget, setDeleteTarget] = useState<ApiStage | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  const onCreate = useCallback(
    async (params: { name: string; description?: string | null }) => {
      setCreateError(null);
      try {
        const s = await stagesActions.create({
          name: params.name,
          description: params.description,
        });
        return s;
      } catch (err: unknown) {
        setCreateError(getErrorMessage(err, "Unable to create stage"));
        throw err;
      }
    },
    []
  );

  const handleDeleteConfirm = async (mode: DeleteStageMode) => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await stagesActions.delete(deleteTarget.stage_id, mode);
      setDeleteTarget(null);
    } catch {
      // error handled by store
    } finally {
      setDeleting(false);
    }
  };

  // --- AI page hooks --------------------------------------------------------
  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);
  const CreateStageArgs = useMemo(
    () =>
      z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    []
  );
  const SetSortArgs = useMemo(
    () =>
      z.object({
        columnId: z.enum(["name", "description", "updated_at", "created_at"]),
        direction: z.enum(["asc", "desc"]),
      }),
    []
  );

  useGetPageData(
    () => ({
      data: {
        page: "stages",
        stage_count: data.length,
        search: query,
        sort,
        stages_summary: data.slice(0, 50).map((s) => ({
          stage_id: s.stage_id,
          name: s.name,
          description: s.description,
          updated_at: s.updated_at,
        })),
        note: "Use list_stages for the full set of fields. Saving and deleting stages are user actions.",
      },
      actions: {
        set_search: {
          description: "Filter the visible stages by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        set_sort: {
          description:
            "Sort the stages table by one of the allowed columns, ascending or descending.",
          argsSchema: z.toJSONSchema(SetSortArgs),
        },
        create_stage: {
          description:
            "Create a new stage with the given name and optional description. If the user hasn't specified a name, ask them for one before calling this action. The name must be lowercase letters, digits, and hyphens, starting with a letter (max 63 chars).",
          argsSchema: z.toJSONSchema(CreateStageArgs),
        },
      },
    }),
    [data, query, sort, SetSearchArgs, SetSortArgs, CreateStageArgs]
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
      if (key === "create_stage") {
        const parsed = CreateStageArgs.parse(args);
        const s = await onCreate({
          name: parsed.name,
          description: parsed.description ?? null,
        });
        if (s) {
          router.push(`/app/stages/${s.stage_id}`);
          return { ok: true, stage_id: s.stage_id, name: s.name };
        }
        return { ok: false, error: "Stage creation failed" };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [SetSearchArgs, SetSortArgs, CreateStageArgs, onCreate, router]
  );

  // --- Columns --------------------------------------------------------------
  const columns = useMemo<ColumnDef<ApiStage>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "200px",
        sortValue: (s) => s.name.toLowerCase(),
        searchValue: (s) => `${s.name} ${s.description ?? ""}`,
        cell: (s) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <Layers className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium">
                {s.name}
              </div>
              {s.description && (
                <div
                  className="text-muted-foreground mt-0.5 truncate text-xs"
                  title={s.description}
                >
                  {s.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "stage_id",
        header: "ID",
        width: "140px",
        cell: (s) => (
          <div className="flex min-w-0 items-center gap-1">
            <span
              className="text-muted-foreground truncate font-mono text-xs"
              title={s.stage_id}
            >
              {s.stage_id.slice(0, 8)}…
            </span>
            <CopyButton value={s.stage_id} label="Copy stage ID" />
          </div>
        ),
      },
      {
        id: "description",
        header: "Description",
        sortable: true,
        sortValue: (s) => s.description ?? "",
        searchValue: (s) => s.description ?? "",
        cell: (s) => (
          <span className="text-muted-foreground text-sm">
            {s.description || "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        header: "Created",
        sortable: true,
        sortValue: (s) => s.created_at,
        width: "160px",
        cell: (s) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(s.created_at)}
          >
            {formatRelativeTime(s.created_at)}
          </span>
        ),
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        sortValue: (s) => s.updated_at,
        width: "160px",
        cell: (s) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(s.updated_at)}
          >
            {formatRelativeTime(s.updated_at)}
          </span>
        ),
      },
    ],
    []
  );

  const bulkActions = useMemo<BulkAction<ApiStage>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this stage?"
              : `Delete ${rows.length} stages?`,
          description: (rows) =>
            rows.length === 1
              ? `Stage "${rows[0].name}" will be deleted and its resources detached.`
              : `These ${rows.length} stages will be deleted and their resources detached. This cannot be undone.`,
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "stage" : "stages"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => stagesActions.delete(r.stage_id, "detach"))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} stages · ${failed} failed`
            );
          }
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stages"
        subtitle="Stages scope deploy-managed resources (Agents, Tools, SREs, …) authored via ajentify.json."
        actions={
          <Button
            variant="gradient"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            New stage
          </Button>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && (
        <p className="text-destructive text-sm">{createError}</p>
      )}

      <DataTable<ApiStage>
        data={data}
        columns={columns}
        getRowKey={(s) => s.stage_id}
        rowHref={(s) => `/app/stages/${s.stage_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search stages…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "stage", plural: "stages" }}
        emptyState={
          <EmptyState
            icon={Layers}
            title="No stages yet"
            description='Create your first stage or run `ajdk deploy` against an `ajentify.json`.'
            action={
              <Button
                variant="gradient"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                New stage
              </Button>
            }
          />
        }
      />

      <CreateStageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreate}
        onCreated={(stage) => router.push(`/app/stages/${stage.stage_id}`)}
      />

      <DeleteStageDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
        stageName={deleteTarget?.name ?? ""}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
