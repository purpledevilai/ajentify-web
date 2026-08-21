"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plug, Plus, Trash2, Lock, LockOpen } from "lucide-react";
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
  useMcpConnectionsStore,
  mcpConnectionsActions,
} from "@/lib/stores/mcp-connections-store";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiMcpConnection } from "@/types/api";

export default function McpConnectionsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useMcpConnectionsStore((s) => s.data);
  const loaded = useMcpConnectionsStore((s) => s.loaded);
  const loading = useMcpConnectionsStore((s) => s.loading);
  const error = useMcpConnectionsStore((s) => s.error);
  const ensureLoaded = useMcpConnectionsStore((s) => s.ensureLoaded);

  const [bulkMode, setBulkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>({
    columnId: "updated_at",
    direction: "desc",
  });

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  const columns = useMemo<ColumnDef<ApiMcpConnection>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortable: true,
        minWidth: "260px",
        sortValue: (c) => c.name.toLowerCase(),
        searchValue: (c) => `${c.name} ${c.mcp_url}`,
        cell: (c) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
              <Plug className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-foreground text-sm font-medium break-words">
                {c.name}
              </div>
              <div className="text-muted-foreground truncate text-xs" title={c.mcp_url}>
                {c.mcp_url}
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "tools",
        header: "Tools",
        sortable: true,
        width: "100px",
        sortValue: (c) => c.selected_tools.length,
        cell: (c) => (
          <Badge variant="secondary">
            {c.selected_tools.length} selected
          </Badge>
        ),
      },
      {
        id: "auth",
        header: "Auth",
        sortable: true,
        width: "120px",
        sortValue: (c) => (c.requires_auth ? "oauth" : "none"),
        cell: (c) =>
          c.requires_auth ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" />
              OAuth
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <LockOpen className="size-3" />
              None
            </Badge>
          ),
      },
      {
        id: "updated_at",
        header: "Updated",
        sortable: true,
        width: "160px",
        sortValue: (c) => c.updated_at,
        cell: (c) => (
          <span
            className="text-muted-foreground tabular-nums"
            title={formatDateTime(c.updated_at)}
          >
            {formatRelativeTime(c.updated_at)}
          </span>
        ),
      },
    ],
    []
  );

  const bulkActions = useMemo<BulkAction<ApiMcpConnection>[]>(
    () => [
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        variant: "destructive",
        confirm: {
          title: (rows) =>
            rows.length === 1
              ? "Delete this MCP connection?"
              : `Delete ${rows.length} MCP connections?`,
          description: () =>
            "Agents that reference the connection will lose its tools. This cannot be undone.",
          confirmLabel: "Delete",
        },
        successMessage: (rows) =>
          `Deleted ${rows.length} ${rows.length === 1 ? "connection" : "connections"}`,
        async run(rows) {
          const results = await Promise.allSettled(
            rows.map((r) => mcpConnectionsActions.delete(r.mcp_connection_id))
          );
          const failed = results.filter((r) => r.status === "rejected").length;
          if (failed > 0) {
            throw new Error(
              `Deleted ${rows.length - failed} of ${rows.length} connections · ${failed} failed`
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
        title="MCP Connections"
        subtitle="Connect to MCP servers and expose a chosen subset of their tools to agents."
        actions={
          <Button
            variant="gradient"
            onClick={() => router.push("/app/mcp-connections/new")}
          >
            <Plus className="size-4" />
            New connection
          </Button>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}

      <DataTable<ApiMcpConnection>
        data={data}
        columns={columns}
        getRowKey={(c) => c.mcp_connection_id}
        rowHref={(c) => `/app/mcp-connections/${c.mcp_connection_id}`}
        loading={loading}
        loaded={loaded}
        defaultSort={{ columnId: "updated_at", direction: "desc" }}
        searchPlaceholder="Search connections…"
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        bulkSelectMode={bulkMode}
        onBulkSelectModeChange={setBulkMode}
        bulkActions={bulkActions}
        resourceLabel={{ singular: "connection", plural: "connections" }}
        emptyState={
          <EmptyState
            icon={Plug}
            title="No MCP connections yet"
            description="Connect an MCP server to make its tools available to your agents."
            action={
              <Button
                variant="gradient"
                onClick={() => router.push("/app/mcp-connections/new")}
              >
                <Plus className="size-4" />
                New connection
              </Button>
            }
          />
        }
      />
    </div>
  );
}
