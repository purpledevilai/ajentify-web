"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FileJson2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import {
  DataTable,
  type BulkAction,
  type ColumnDef,
} from "@/components/blocks/data-table";
import { useOrgStore } from "@/lib/stores/org-store";
import {
  useJsonDocumentsStore,
  jsonDocumentsActions,
} from "@/lib/stores/json-documents-store";
import { DOCUMENT_BUILDER_PREFETCH_HREF } from "@/lib/constants/builder-routes";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiJSONDocument } from "@/types/api";

export default function DocumentsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useJsonDocumentsStore((s) => s.data);
  const loaded = useJsonDocumentsStore((s) => s.loaded);
  const loading = useJsonDocumentsStore((s) => s.loading);
  const error = useJsonDocumentsStore((s) => s.error);
  const ensureLoaded = useJsonDocumentsStore((s) => s.ensureLoaded);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  } | null>({
    columnId: "updated_at",
    direction: "desc",
  });

  const onCreate = useCallback(async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const doc = await jsonDocumentsActions.create({
        name: "Untitled Document",
        data: {},
      });
      router.push(`/app/documents/${doc.document_id}`);
      return doc;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Unable to create document";
      setCreateError(msg);
      setCreating(false);
      throw err;
    }
  }, [router]);

  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);
  const SetSortArgs = useMemo(
    () =>
      z.object({
        columnId: z.enum(["name", "fields", "updated_at"]),
        direction: z.enum(["asc", "desc"]),
      }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "documents",
        document_count: data.length,
        search: query,
        sort,
        documents_summary: data.slice(0, 50).map((d) => ({
          document_id: d.document_id,
          name: d.name,
          field_count: Object.keys(d.data).length,
          stage_id: d.stage_id,
          logical_name: d.logical_name,
          updated_at: d.updated_at,
        })),
        note: "Use list_json_documents for full fields. Saving and deleting are user actions.",
      },
      actions: {
        set_search: {
          description: "Filter the visible documents by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        set_sort: {
          description:
            "Sort the documents table by one of the allowed columns, ascending or descending.",
          argsSchema: z.toJSONSchema(SetSortArgs),
        },
        create_new: {
          description:
            "Click the '+ New document' button: creates an untitled document and routes to its detail page.",
          argsSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
        },
      },
    }),
    [data, query, sort, SetSearchArgs, SetSortArgs],
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
      if (key === "create_new") {
        const doc = await onCreate();
        return { ok: true, document_id: doc?.document_id };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [onCreate, SetSearchArgs, SetSortArgs],
  );

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  useEffect(() => {
    router.prefetch(DOCUMENT_BUILDER_PREFETCH_HREF);
  }, [router]);

  const columns = useMemo<ColumnDef<ApiJSONDocument>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "280px",
        sortValue: (d) => d.name.toLowerCase(),
        searchValue: (d) => d.name,
        cell: (d) => <DocumentNameCell document={d} />,
      },
      {
        id: "fields",
        header: "Fields",
        sortable: true,
        sortValue: (d) => Object.keys(d.data).length,
        width: "100px",
        cell: (d) => (
          <Badge variant="secondary">
            {Object.keys(d.data).length}
          </Badge>
        ),
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        sortValue: (d) => d.updated_at,
        width: "160px",
        cell: (d) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(d.updated_at)}
          >
            {formatRelativeTime(d.updated_at)}
          </span>
        ),
      },
    ],
    [],
  );

  const bulkActions = useMemo<BulkAction<ApiJSONDocument>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this document?"
              : `Delete ${rows.length} documents?`,
          description: (rows) =>
            rows.length === 1 ? (
              <>
                <span className="text-foreground font-medium">
                  {rows[0].name}
                </span>{" "}
                will be permanently removed. This cannot be undone.
              </>
            ) : (
              `These ${rows.length} documents will be permanently removed. This cannot be undone.`
            ),
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "document" : "documents"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => jsonDocumentsActions.delete(r.document_id)),
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} documents · ${failed} failed`,
            );
          }
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        subtitle="JSON documents for agent memory and structured data."
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
            <Button variant="gradient" onClick={onCreate} disabled={creating}>
              <Plus className="size-4" />
              {creating ? "Creating…" : "New document"}
            </Button>
          </>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && <p className="text-destructive text-sm">{createError}</p>}

      <DataTable<ApiJSONDocument>
        data={data}
        columns={columns}
        getRowKey={(d) => d.document_id}
        rowHref={(d) => `/app/documents/${d.document_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search documents…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "document", plural: "documents" }}
        emptyState={
          <EmptyState
            icon={FileJson2}
            title="No documents yet"
            description="Create your first document to store structured data for your agents."
            action={
              <Button
                variant="gradient"
                onClick={onCreate}
                disabled={creating}
              >
                <Plus className="size-4" />
                {creating ? "Creating…" : "New document"}
              </Button>
            }
          />
        }
      />
    </div>
  );
}

function DocumentNameCell({ document: doc }: { document: ApiJSONDocument }) {
  const fieldCount = Object.keys(doc.data).length;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        <FileJson2 className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-sm font-medium break-words">
          {doc.name}
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          {fieldCount} {fieldCount === 1 ? "field" : "fields"}
        </div>
      </div>
    </div>
  );
}
