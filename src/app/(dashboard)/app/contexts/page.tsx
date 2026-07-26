"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessagesSquare,
  RefreshCw,
  Search,
} from "lucide-react";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { CopyButton } from "@/components/blocks/copy-button";
import { useOrgStore } from "@/lib/stores/org-store";
import { useAgentsStore } from "@/lib/stores/agents-store";
import {
  useContextsStore,
  CONTEXTS_PAGE_SIZE,
} from "@/lib/stores/contexts-store";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiAgent } from "@/types/api";

// Sentinel for the "All agents" option — base-ui Select needs a concrete value.
const ALL_AGENTS = "__all__";

function truncateId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export default function ContextsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);

  const data = useContextsStore((s) => s.data);
  const loaded = useContextsStore((s) => s.loaded);
  const loading = useContextsStore((s) => s.loading);
  const loadingMore = useContextsStore((s) => s.loadingMore);
  const nextCursor = useContextsStore((s) => s.nextCursor);
  const error = useContextsStore((s) => s.error);
  const appliedAgentId = useContextsStore((s) => s.appliedAgentId);
  const appliedClientId = useContextsStore((s) => s.appliedClientId);
  const appliedContextId = useContextsStore((s) => s.appliedContextId);
  const setFilters = useContextsStore((s) => s.setFilters);
  const ensureLoaded = useContextsStore((s) => s.ensureLoaded);
  const load = useContextsStore((s) => s.load);
  const loadMore = useContextsStore((s) => s.loadMore);

  const agents = useAgentsStore((s) => s.data);
  const agentsLoading = useAgentsStore((s) => s.loading);
  const ensureAgentsLoaded = useAgentsStore((s) => s.ensureLoaded);

  // Draft inputs — typed but not applied until Apply / Enter. Seeded from the
  // store's applied filters so navigating back from a detail page shows the
  // same query that produced the visible data.
  const [agentDraft, setAgentDraft] = useState(appliedAgentId);
  const [clientDraft, setClientDraft] = useState(appliedClientId);
  const [contextIdDraft, setContextIdDraft] = useState(appliedContextId);

  useEffect(() => {
    if (orgId) {
      ensureAgentsLoaded();
      ensureLoaded();
    }
  }, [orgId, ensureAgentsLoaded, ensureLoaded]);

  const agentNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.agent_id, a.agent_name);
    return m;
  }, [agents]);

  const applyFilters = useCallback(() => {
    setFilters({
      agentId: agentDraft,
      clientId: clientDraft.trim(),
      contextId: contextIdDraft.trim(),
    });
    load(true);
  }, [agentDraft, clientDraft, contextIdDraft, setFilters, load]);

  const hasAnyDraft =
    !!agentDraft || !!clientDraft || !!contextIdDraft;
  const hasAnyApplied =
    !!appliedAgentId || !!appliedClientId || !!appliedContextId;

  const clearFilters = useCallback(() => {
    setAgentDraft("");
    setClientDraft("");
    setContextIdDraft("");
    setFilters({ agentId: "", clientId: "", contextId: "" });
    if (hasAnyApplied) load(true);
  }, [setFilters, load, hasAnyApplied]);

  const refresh = useCallback(() => load(true), [load]);

  // --- Aj page hooks --------------------------------------------------------
  const SetFiltersArgs = useMemo(
    () =>
      z.object({
        agent_id: z.string().optional(),
        client_id: z.string().optional(),
        context_id: z.string().optional(),
      }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "contexts",
        context_count: data.length,
        has_more: !!nextCursor,
        filters: {
          agent_id: appliedAgentId || null,
          client_id: appliedClientId || null,
          context_id: appliedContextId || null,
        },
        contexts_summary: data.slice(0, 50).map((c) => ({
          context_id: c.context_id,
          agent_id: c.agent_id,
          client_id: c.client_id,
          owner_kind: c.owner_kind,
          last_message_preview: c.last_message_preview,
          updated_at: c.updated_at,
        })),
        note: "Read-only inspector. Use set_filters/clear_filters to change the query, refresh to reload, and load_more to fetch the next page.",
      },
      actions: {
        set_filters: {
          description:
            "Apply list filters (any subset of agent_id, client_id, exact context_id) and reload the first page.",
          argsSchema: z.toJSONSchema(SetFiltersArgs),
        },
        clear_filters: {
          description: "Clear all filters and reload.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        refresh: {
          description: "Reload the current page of contexts.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
        load_more: {
          description: "Fetch and append the next page of contexts, if any.",
          argsSchema: { type: "object", properties: {}, additionalProperties: false },
        },
      },
    }),
    [data, nextCursor, appliedAgentId, appliedClientId, appliedContextId, SetFiltersArgs],
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "set_filters") {
        const parsed = SetFiltersArgs.parse(args);
        setAgentDraft(parsed.agent_id ?? "");
        setClientDraft(parsed.client_id ?? "");
        setContextIdDraft(parsed.context_id ?? "");
        setFilters({
          agentId: parsed.agent_id ?? "",
          clientId: (parsed.client_id ?? "").trim(),
          contextId: (parsed.context_id ?? "").trim(),
        });
        await load(true);
        return { ok: true };
      }
      if (key === "clear_filters") {
        clearFilters();
        return { ok: true };
      }
      if (key === "refresh") {
        await load(true);
        return { ok: true };
      }
      if (key === "load_more") {
        await loadMore();
        return { ok: true, has_more: !!useContextsStore.getState().nextCursor };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [SetFiltersArgs, setFilters, load, loadMore, clearFilters],
  );

  const showInitialLoading = loading && !loaded;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contexts"
        subtitle="Read-only view of contexts created by API keys or public agents. User-owned contexts are excluded."
        actions={
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        }
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Agent
          </label>
          <Select
            value={agentDraft || ALL_AGENTS}
            onValueChange={(v) =>
              setAgentDraft(v === ALL_AGENTS ? "" : (v as string))
            }
          >
            <SelectTrigger className="h-8 w-full" disabled={agentsLoading}>
              <SelectValue placeholder="All agents">
                {(value) =>
                  !value || value === ALL_AGENTS
                    ? "All agents"
                    : (agentNameById.get(value as string) ??
                      (value as string))
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AGENTS}>All agents</SelectItem>
              {agents.map((a: ApiAgent) => (
                <SelectItem key={a.agent_id} value={a.agent_id}>
                  {a.agent_name || "Untitled agent"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Client ID
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={clientDraft}
              onChange={(e) => setClientDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Filter by client_id…"
              className="pl-8 font-mono"
            />
          </div>
        </div>

        <div className="min-w-[200px] flex-1">
          <label className="text-muted-foreground mb-1 block text-xs font-medium">
            Context ID
          </label>
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={contextIdDraft}
              onChange={(e) => setContextIdDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Exact context_id…"
              className="pl-8 font-mono"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="solid" onClick={applyFilters}>
            Apply
          </Button>
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasAnyDraft && !hasAnyApplied}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
        <div className="relative overflow-x-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-0 text-sm"
            style={{ minWidth: "980px" }}
          >
            <thead>
              <tr className="bg-muted/30">
                <Th className="w-[160px]">Updated</Th>
                <Th className="w-[220px]">Agent</Th>
                <Th className="w-[110px]">Owner</Th>
                <Th className="w-[180px]">Client</Th>
                <Th>Last message</Th>
                <Th className="w-[180px]">Context ID</Th>
              </tr>
            </thead>
            <tbody>
              {showInitialLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="border-border border-b px-3 py-3.5">
                        <Skeleton className="h-4 w-full max-w-40" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={MessagesSquare}
                      title={
                        hasAnyApplied
                          ? "No contexts match these filters"
                          : "No contexts yet"
                      }
                      description={
                        hasAnyApplied
                          ? "Try adjusting or clearing the filters above."
                          : "Contexts created by your API keys or public agents will appear here."
                      }
                      className="rounded-none border-0 bg-transparent"
                    />
                  </td>
                </tr>
              ) : (
                data.map((ctx) => (
                  <tr
                    key={ctx.context_id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/app/contexts/${ctx.context_id}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/app/contexts/${ctx.context_id}`);
                      }
                    }}
                    className="hover:bg-muted/40 focus-visible:bg-muted/60 cursor-pointer outline-none transition-colors"
                  >
                    <Td className="whitespace-nowrap">
                      <span
                        className="text-muted-foreground tabular-nums"
                        title={formatDateTime(ctx.updated_at)}
                      >
                        {formatRelativeTime(ctx.updated_at)}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="truncate font-medium"
                        title={agentNameById.get(ctx.agent_id) ?? ctx.agent_id}
                      >
                        {agentNameById.get(ctx.agent_id) ?? ctx.agent_id}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        variant={
                          ctx.owner_kind === "public" ? "default" : "secondary"
                        }
                      >
                        {ctx.owner_kind === "public" ? "Public" : "API Key"}
                      </Badge>
                    </Td>
                    <Td>
                      {ctx.client_id ? (
                        <div className="flex min-w-0 items-center gap-1">
                          <span
                            className="text-muted-foreground truncate font-mono text-xs"
                            title={ctx.client_id}
                          >
                            {truncateId(ctx.client_id)}
                          </span>
                          <CopyButton
                            value={ctx.client_id}
                            label="Copy client ID"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        className="text-muted-foreground block truncate"
                        title={ctx.last_message_preview ?? undefined}
                      >
                        {ctx.last_message_preview || "—"}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className="text-muted-foreground truncate font-mono text-xs"
                          title={ctx.context_id}
                        >
                          {truncateId(ctx.context_id)}
                        </span>
                        <CopyButton
                          value={ctx.context_id}
                          label="Copy context ID"
                        />
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {nextCursor && (
          <div className="border-border flex justify-center border-t p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore && <Loader2 className="size-3.5 animate-spin" />}
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>

      {loaded && data.length > 0 && (
        <p className="text-muted-foreground text-xs tabular-nums">
          Showing {data.length} context{data.length === 1 ? "" : "s"}
          {nextCursor ? ` (page size ${CONTEXTS_PAGE_SIZE})` : ""}
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={
        "border-border text-muted-foreground h-10 border-b px-3 text-left text-[0.7rem] font-medium tracking-wider uppercase " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={
        "border-border border-b px-3 py-3 align-middle " + (className ?? "")
      }
    >
      {children}
    </td>
  );
}
