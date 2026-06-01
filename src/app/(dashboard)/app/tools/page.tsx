"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Plus, Trash2, Wrench } from "lucide-react";
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
import { useOrgStore } from "@/lib/stores/org-store";
import { useToolsStore, toolsActions } from "@/lib/stores/tools-store";
import { TOOL_BUILDER_PREFETCH_HREF } from "@/lib/constants/builder-routes";
import { usePdStore } from "@/lib/stores/parameter-definitions-store";
import { useStagesStore } from "@/lib/stores/stages-store";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import {
  formatToolSignature,
  getToolParamNames,
} from "@/lib/utils/tool-signature";
import type { ApiParameterDefinition, ApiStage, ApiTool } from "@/types/api";

export default function ToolsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useToolsStore((s) => s.data);
  const loaded = useToolsStore((s) => s.loaded);
  const loading = useToolsStore((s) => s.loading);
  const error = useToolsStore((s) => s.error);
  const ensureLoaded = useToolsStore((s) => s.ensureLoaded);
  const paramDefs = usePdStore((s) => s.data);
  const ensurePds = usePdStore((s) => s.ensureLoaded);
  const stages = useStagesStore((s) => s.data);
  const ensureStagesLoaded = useStagesStore((s) => s.ensureLoaded);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>({
    columnId: "updated_at",
    direction: "desc",
  });

  const onCreate = useCallback(async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const t = await toolsActions.create({
        name: "untitled_tool",
        description: "",
        code: "",
      });
      router.push(`/app/tools/${t.tool_id}`);
      return t;
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Unable to create tool"));
      setCreating(false);
      throw err;
    }
  }, [router]);

  const SetSearchArgs = useMemo(() => z.object({ query: z.string() }), []);
  const SetSortArgs = useMemo(
    () =>
      z.object({
        columnId: z.enum([
          "name",
          "language",
          "stage",
          "logical_name",
          "updated_at",
        ]),
        direction: z.enum(["asc", "desc"]),
      }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "tools",
        tool_count: data.length,
        search: query,
        sort,
        tools_summary: data.slice(0, 50).map((t) => ({
          tool_id: t.tool_id,
          name: t.name,
          description: t.description,
          stage_id: t.stage_id,
          logical_name: t.logical_name,
          is_async: t.is_async,
          is_client_side_tool: t.is_client_side_tool,
          updated_at: t.updated_at,
        })),
        note:
          "Use list_tools for the full set of fields. Saving and deleting tools are user actions.",
      },
      actions: {
        set_search: {
          description: "Filter the visible tools by a search query.",
          argsSchema: z.toJSONSchema(SetSearchArgs),
        },
        set_sort: {
          description:
            "Sort the tools table by one of the allowed columns, ascending or descending.",
          argsSchema: z.toJSONSchema(SetSortArgs),
        },
        create_new: {
          description:
            "Click the '+ New tool' button: creates an untitled_tool and routes to its detail page. The user still has to save any subsequent changes.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
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
        const t = await onCreate();
        return { ok: true, tool_id: t?.tool_id };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [onCreate, SetSearchArgs, SetSortArgs],
  );

  useEffect(() => {
    if (orgId) {
      ensureLoaded();
      ensurePds();
      ensureStagesLoaded();
    }
  }, [orgId, ensureLoaded, ensurePds, ensureStagesLoaded]);

  useEffect(() => {
    router.prefetch(TOOL_BUILDER_PREFETCH_HREF);
  }, [router]);

  const stagesById = useMemo(() => {
    const m = new Map<string, ApiStage>();
    for (const s of stages) m.set(s.stage_id, s);
    return m;
  }, [stages]);

  const columns = useMemo<ColumnDef<ApiTool>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "280px",
        sortValue: (t) => t.name.toLowerCase(),
        searchValue: (t) => `${t.name} ${t.description ?? ""}`,
        cell: (t) => (
          <ToolNameCell tool={t} paramDefs={paramDefs} />
        ),
      },
      {
        id: "language",
        header: "Language",
        sortable: true,
        // Hardcoded for now — every tool is Python today. When the backend
        // exposes a `language` field on `ApiTool`, swap this for `t.language`.
        sortValue: () => "python",
        width: "160px",
        cell: (t) => (
          <div className="flex flex-wrap items-center gap-1">
            <Badge variant="secondary">Python</Badge>
            {t.is_async && <Badge variant="outline">Async</Badge>}
          </div>
        ),
      },
      {
        id: "stage",
        header: "Stage",
        sortable: true,
        sortValue: (t) =>
          t.stage_id ? (stagesById.get(t.stage_id)?.name ?? t.stage_id) : "",
        searchValue: (t) =>
          t.stage_id ? (stagesById.get(t.stage_id)?.name ?? t.stage_id) : "",
        width: "140px",
        cell: (t) => {
          if (!t.stage_id) {
            return <span className="text-muted-foreground">—</span>;
          }
          const stage = stagesById.get(t.stage_id);
          return (
            <span
              className="bg-muted text-foreground inline-flex max-w-full items-center rounded px-1.5 py-0.5 text-xs"
              title={stage ? `${stage.name} · ${t.stage_id}` : t.stage_id}
            >
              <span className="truncate">{stage?.name ?? t.stage_id}</span>
            </span>
          );
        },
      },
      {
        id: "logical_name",
        header: "Logical name",
        sortable: true,
        sortValue: (t) => t.logical_name ?? "",
        searchValue: (t) => t.logical_name ?? "",
        width: "200px",
        cell: (t) =>
          t.logical_name ? (
            <div className="flex min-w-0 items-center gap-1">
              <span
                className="text-foreground truncate font-mono text-xs"
                title={t.logical_name}
              >
                {t.logical_name}
              </span>
              <CopyButton value={t.logical_name} label="Copy logical name" />
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        sortValue: (t) => t.updated_at,
        width: "160px",
        cell: (t) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(t.updated_at)}
          >
            {formatRelativeTime(t.updated_at)}
          </span>
        ),
      },
    ],
    [paramDefs, stagesById]
  );

  const bulkActions = useMemo<BulkAction<ApiTool>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this tool?"
              : `Delete ${rows.length} tools?`,
          description: (rows) =>
            rows.length === 1 ? (
              <>
                <span className="text-foreground font-mono">
                  {formatToolSignature(rows[0], paramDefs)}
                </span>{" "}
                will be permanently removed. Agents that reference it will lose
                this tool. This cannot be undone.
              </>
            ) : (
              `These ${rows.length} tools will be permanently removed. Agents that reference them will lose those tools. This cannot be undone.`
            ),
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "tool" : "tools"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => toolsActions.delete(r.tool_id))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} tools · ${failed} failed`
            );
          }
        },
      },
    ],
    [paramDefs]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        subtitle="Tools that agents can call."
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
              {creating ? "Creating…" : "New tool"}
            </Button>
          </>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && <p className="text-destructive text-sm">{createError}</p>}

      <DataTable<ApiTool>
        data={data}
        columns={columns}
        getRowKey={(t) => t.tool_id}
        rowHref={(t) => `/app/tools/${t.tool_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search tools…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "tool", plural: "tools" }}
        emptyState={
          <EmptyState
            icon={Wrench}
            title="No tools yet"
            description="Create your first tool to make it available to your agents."
            action={
              <Button
                variant="gradient"
                onClick={onCreate}
                disabled={creating}
              >
                <Plus className="size-4" />
                {creating ? "Creating…" : "New tool"}
              </Button>
            }
          />
        }
      />
    </div>
  );
}

function ToolNameCell({
  tool,
  paramDefs,
}: {
  tool: ApiTool;
  paramDefs: ApiParameterDefinition[];
}) {
  const pd = tool.pd_id
    ? paramDefs.find((p) => p.pd_id === tool.pd_id)
    : undefined;
  const params = getToolParamNames(pd);
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
        <Wrench className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-sm break-words">
          <span className="text-foreground font-medium">{tool.name}</span>
          <span className="text-muted-foreground">(</span>
          {params.length === 0 ? null : (
            <span className="text-muted-foreground">
              {params.map((p, i) => (
                <span key={p.name}>
                  {i > 0 && ", "}
                  <span className="text-foreground/80">{p.name}</span>
                  {p.optional && "?"}
                </span>
              ))}
            </span>
          )}
          <span className="text-muted-foreground">)</span>
        </div>
        {tool.description && (
          <div
            className="text-muted-foreground mt-0.5 truncate text-xs"
            title={tool.description}
          >
            {tool.description}
          </div>
        )}
      </div>
    </div>
  );
}
