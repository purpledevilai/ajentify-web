"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, Trash2, Wrench } from "lucide-react";
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
import { useToolsStore, toolsActions } from "@/lib/stores/tools-store";
import { usePdStore } from "@/lib/stores/parameter-definitions-store";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import {
  formatToolSignature,
  getToolParamNames,
} from "@/lib/utils/tool-signature";
import type { ApiParameterDefinition, ApiTool } from "@/types/api";

export default function ToolsPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useToolsStore((s) => s.data);
  const loaded = useToolsStore((s) => s.loaded);
  const loading = useToolsStore((s) => s.loading);
  const error = useToolsStore((s) => s.error);
  const ensureLoaded = useToolsStore((s) => s.ensureLoaded);
  const paramDefs = usePdStore((s) => s.data);
  const ensurePds = usePdStore((s) => s.ensureLoaded);

  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    if (orgId) {
      ensureLoaded();
      ensurePds();
    }
  }, [orgId, ensureLoaded, ensurePds]);

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
        id: "flags",
        header: "",
        width: "180px",
        cell: (t) => (
          <div className="flex flex-wrap items-center gap-1">
            {t.is_client_side_tool && (
              <Badge variant="secondary">Client</Badge>
            )}
            {t.is_async && <Badge variant="secondary">Async</Badge>}
            {t.pass_context && <Badge variant="outline">Context</Badge>}
          </div>
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
    [paramDefs]
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
        subtitle="Tools that agents can call. Creation via API or SDK — full UI coming soon."
        actions={
          <Button
            variant={bulkMode ? "solid" : "outline"}
            onClick={() => setBulkMode((v) => !v)}
            disabled={data.length === 0}
          >
            <CheckSquare className="size-4" />
            {bulkMode ? "Exit bulk select" : "Bulk select"}
          </Button>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}

      <DataTable<ApiTool>
        data={data}
        columns={columns}
        getRowKey={(t) => t.tool_id}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search tools…"
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "tool", plural: "tools" }}
        emptyState={
          <EmptyState
            icon={Wrench}
            title="No tools yet"
            description="Create tools via the Ajentify API or SDK to make them available to your agents."
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
          <div className="text-muted-foreground mt-0.5 text-xs break-words">
            {tool.description}
          </div>
        )}
      </div>
    </div>
  );
}
