"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, CheckSquare, ChevronDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { CopyButton } from "@/components/blocks/copy-button";
import {
  DataTable,
  type BulkAction,
  type ColumnDef,
} from "@/components/blocks/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgentsStore, agentsActions } from "@/lib/stores/agents-store";
import { AGENT_BUILDER_PREFETCH_HREF } from "@/lib/constants/builder-routes";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useStagesStore } from "@/lib/stores/stages-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { getErrorMessage } from "@/lib/api/errors";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiAgent, ApiStage, ApiTool } from "@/types/api";

export default function AgentsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useAgentsStore((s) => s.data);
  const loaded = useAgentsStore((s) => s.loaded);
  const loading = useAgentsStore((s) => s.loading);
  const error = useAgentsStore((s) => s.error);
  const ensureLoaded = useAgentsStore((s) => s.ensureLoaded);
  const tools = useToolsStore((s) => s.data);
  const stages = useStagesStore((s) => s.data);
  const ensureStagesLoaded = useStagesStore((s) => s.ensureLoaded);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    // Agents store already declares tools as a dependency, so calling
    // ensureLoaded() warms both. Stages aren't a dependency of agents
    // (agents render without them) but we need them resolved to render
    // the Stage column with human-readable names.
    if (orgId) {
      ensureLoaded();
      ensureStagesLoaded();
    }
  }, [orgId, ensureLoaded, ensureStagesLoaded]);

  // Warm the shared builder page chunk once — same module for every agent id.
  useEffect(() => {
    router.prefetch(AGENT_BUILDER_PREFETCH_HREF);
  }, [router]);

  const toolsById = useMemo(() => {
    const m = new Map<string, ApiTool>();
    for (const t of tools) m.set(t.tool_id, t);
    return m;
  }, [tools]);

  const stagesById = useMemo(() => {
    const m = new Map<string, ApiStage>();
    for (const s of stages) m.set(s.stage_id, s);
    return m;
  }, [stages]);

  async function onCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      const a = await agentsActions.create({
        agent_name: "Untitled agent",
        agent_description: "",
        prompt: "You are a helpful assistant.",
        is_public: false,
      });
      router.push(`/app/agents/${a.agent_id}`);
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Unable to create agent"));
      setCreating(false);
    }
  }

  const columns = useMemo<ColumnDef<ApiAgent>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "280px",
        sortValue: (a) => a.agent_name.toLowerCase(),
        searchValue: (a) => `${a.agent_name} ${a.agent_description ?? ""}`,
        cell: (a) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <Bot className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium break-words">
                {a.agent_name || "Untitled agent"}
              </div>
              {a.agent_description && (
                <div className="text-muted-foreground mt-0.5 text-xs break-words">
                  {a.agent_description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        id: "stage",
        header: "Stage",
        sortable: true,
        sortValue: (a) =>
          a.stage_id ? (stagesById.get(a.stage_id)?.name ?? a.stage_id) : "",
        searchValue: (a) =>
          a.stage_id ? (stagesById.get(a.stage_id)?.name ?? a.stage_id) : "",
        width: "140px",
        cell: (a) => {
          if (!a.stage_id) {
            return <span className="text-muted-foreground">—</span>;
          }
          const stage = stagesById.get(a.stage_id);
          return (
            <span
              className="bg-muted text-foreground inline-flex max-w-full items-center rounded px-1.5 py-0.5 text-xs"
              title={stage ? `${stage.name} · ${a.stage_id}` : a.stage_id}
            >
              <span className="truncate">{stage?.name ?? a.stage_id}</span>
            </span>
          );
        },
      },
      {
        id: "logical_name",
        header: "Logical name",
        sortable: true,
        sortValue: (a) => a.logical_name ?? "",
        searchValue: (a) => a.logical_name ?? "",
        width: "200px",
        cell: (a) =>
          a.logical_name ? (
            <div className="flex min-w-0 items-center gap-1">
              <span
                className="text-foreground truncate font-mono text-xs"
                title={a.logical_name}
              >
                {a.logical_name}
              </span>
              <CopyButton value={a.logical_name} label="Copy logical name" />
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "tools",
        header: "Tools",
        sortable: true,
        sortValue: (a) => a.tools?.length ?? 0,
        width: "120px",
        cell: (a) => <ToolsCell agent={a} toolsById={toolsById} />,
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        sortValue: (a) => a.updated_at,
        width: "140px",
        cell: (a) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(a.updated_at)}
          >
            {formatRelativeTime(a.updated_at)}
          </span>
        ),
      },
    ],
    [toolsById, stagesById]
  );

  const bulkActions = useMemo<BulkAction<ApiAgent>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this agent?"
              : `Delete ${rows.length} agents?`,
          description: (rows) =>
            rows.length === 1 ? (
              <>
                <span className="text-foreground font-medium">
                  {rows[0].agent_name || "Untitled agent"}
                </span>{" "}
                will be permanently removed. This cannot be undone.
              </>
            ) : (
              `These ${rows.length} agents will be permanently removed. This cannot be undone.`
            ),
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "agent" : "agents"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => agentsActions.delete(r.agent_id))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} agents · ${failed} failed`
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
        title="Agents"
        subtitle="Design and orchestrate intelligent agents."
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
              {creating ? "Creating…" : "New agent"}
            </Button>
          </>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && <p className="text-destructive text-sm">{createError}</p>}

      <DataTable<ApiAgent>
        data={data}
        columns={columns}
        getRowKey={(a) => a.agent_id}
        rowHref={(a) => `/app/agents/${a.agent_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search agents…"
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "agent", plural: "agents" }}
        emptyState={
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create your first agent to get started."
            action={
              <Button
                variant="gradient"
                onClick={onCreate}
                disabled={creating}
              >
                <Plus className="size-4" />
                {creating ? "Creating…" : "New agent"}
              </Button>
            }
          />
        }
      />
    </div>
  );
}

function ToolsCell({
  agent,
  toolsById,
}: {
  agent: ApiAgent;
  toolsById: Map<string, ApiTool>;
}) {
  const ids = agent.tools ?? [];
  const count = ids.length;
  const label = `${count} tool${count === 1 ? "" : "s"}`;

  if (count === 0) {
    return <span className="text-muted-foreground tabular-nums">{label}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="text-foreground hover:text-primary inline-flex items-center gap-1 rounded-md text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>{label}</span>
            <ChevronDown className="size-3 opacity-60" />
          </button>
        }
      />
      <DropdownMenuContent align="start" className="max-h-72 min-w-48">
        <div className="text-muted-foreground px-2 py-1 text-[0.65rem] font-medium tracking-wide uppercase">
          {label}
        </div>
        {ids.map((id) => {
          const t = toolsById.get(id);
          if (!t) {
            return (
              <div
                key={id}
                className="text-muted-foreground px-2 py-1 font-mono text-xs italic"
                title={id}
              >
                unknown ({id.slice(0, 8)}…)
              </div>
            );
          }
          return (
            <Link
              key={id}
              href={`/app/tools/${id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-foreground hover:bg-muted hover:text-primary focus-visible:bg-muted block rounded-sm px-2 py-1 font-mono text-xs transition-colors focus:outline-none"
            >
              {t.name}
            </Link>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
