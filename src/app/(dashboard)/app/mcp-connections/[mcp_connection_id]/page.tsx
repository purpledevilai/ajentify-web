"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/blocks/page-header";
import { BuilderSection } from "@/components/blocks/builder-section";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { McpToolPicker } from "@/components/blocks/mcp-tool-picker";
import {
  useMcpConnectionsStore,
  mcpConnectionsActions,
} from "@/lib/stores/mcp-connections-store";
import { discoverMcp, listMcpTools, startMcpOAuth } from "@/lib/mcp/connect";
import { getErrorMessage } from "@/lib/api/errors";
import type { ApiMcpConnection, McpToolDef } from "@/types/api";

function McpConnectionBuilder() {
  const router = useRouter();
  const params = useParams<{ mcp_connection_id: string }>();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";
  const connectionId = params.mcp_connection_id;

  const getById = useMcpConnectionsStore((s) => s.getById);

  const [connection, setConnection] = useState<ApiMcpConnection | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // Live tool list fetched from the server (falls back to the saved snapshot).
  const [liveTools, setLiveTools] = useState<McpToolDef[] | null>(null);
  const [fetchingTools, setFetchingTools] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await getById(connectionId);
      if (cancelled) return;
      if (!c) {
        setNotFound(true);
        return;
      }
      setConnection(c);
      setName(c.name);
      setMcpUrl(c.mcp_url);
      setSelected(c.selected_tools.map((t) => t.name));
    })();
    return () => {
      cancelled = true;
    };
  }, [connectionId, getById]);

  async function refreshTools(conn: ApiMcpConnection) {
    setToolsError(null);
    setNeedsReauth(false);
    setFetchingTools(true);
    try {
      // The backend refreshes the stored token on a 401; needs_reauth means the
      // refresh token is gone/invalid and the user must re-authorize.
      const resp = await listMcpTools({
        mcp_url: conn.mcp_url,
        mcp_connection_id: conn.mcp_connection_id,
      });
      if (resp.needs_reauth) {
        setNeedsReauth(true);
        setLiveTools(conn.selected_tools);
        return;
      }
      setLiveTools(resp.tools);
    } catch (err: unknown) {
      setToolsError(getErrorMessage(err, "Could not fetch the server's tools"));
      setLiveTools(conn.selected_tools);
    } finally {
      setFetchingTools(false);
    }
  }

  useEffect(() => {
    if (connection) refreshTools(connection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.mcp_connection_id]);

  const displayTools: McpToolDef[] = useMemo(() => {
    if (liveTools) return liveTools;
    return connection?.selected_tools ?? [];
  }, [liveTools, connection]);

  const dirty = useMemo(() => {
    if (!connection) return false;
    const savedNames = connection.selected_tools.map((t) => t.name).sort();
    const currentNames = [...selected].sort();
    return (
      name !== connection.name ||
      mcpUrl !== connection.mcp_url ||
      JSON.stringify(savedNames) !== JSON.stringify(currentNames)
    );
  }, [connection, name, mcpUrl, selected]);

  async function onSave() {
    if (!connection) return;
    setSaveError(null);
    setSaving(true);
    try {
      // Persist the fresh tool defs for the chosen names so schemas stay current.
      const source = displayTools.length > 0 ? displayTools : connection.selected_tools;
      const chosen = source.filter((t) => selected.includes(t.name));
      const updated = await mcpConnectionsActions.update(connection.mcp_connection_id, {
        name: name.trim(),
        mcp_url: mcpUrl.trim(),
        selected_tools: chosen,
      });
      setConnection(updated);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Could not save the connection"));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!connection) return;
    setDeleting(true);
    try {
      await mcpConnectionsActions.delete(connection.mcp_connection_id);
      router.push("/app/mcp-connections");
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Could not delete the connection"));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function onReconnect() {
    if (!connection) return;
    try {
      const discovery = await discoverMcp(connection.mcp_url);
      if (!discovery.requires_auth) {
        refreshTools(connection);
        return;
      }
      await startMcpOAuth({ name: connection.name, mcpUrl: connection.mcp_url, discovery });
    } catch (err: unknown) {
      setToolsError(getErrorMessage(err, "Could not start re-authorization"));
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">MCP connection not found.</p>
        <Button variant="outline" onClick={() => router.push("/app/mcp-connections")}>
          Back to MCP connections
        </Button>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="text-muted-foreground py-16 text-center">Loading…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/app/mcp-connections")}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title={connection.name || "MCP connection"}
          subtitle={connection.mcp_url}
          actions={
            <>
              {dirty && (
                <Badge variant="secondary" className="hidden sm:inline-flex">
                  Unsaved changes
                </Badge>
              )}
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={deleting}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
              <Button variant="gradient" onClick={onSave} disabled={!dirty || saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? "Saving…" : "Save"}
              </Button>
            </>
          }
        />
      </div>

      {justConnected && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Authorized successfully. Choose the tools to expose, then Save.
        </p>
      )}
      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <BuilderSection title="Server" description="The MCP server this connection targets.">
        <div className="space-y-2">
          <Label htmlFor="mcp-name">Name</Label>
          <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mcp-url">MCP URL</Label>
          <Input id="mcp-url" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connection.requires_auth ? "outline" : "secondary"}>
            {connection.requires_auth ? "OAuth" : "No auth"}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {connection.selected_tools.length} tools currently exposed
          </span>
          {connection.requires_auth && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={onReconnect}
              disabled={fetchingTools}
            >
              <KeyRound className="size-4" />
              Re-authenticate
            </Button>
          )}
        </div>
      </BuilderSection>

      <BuilderSection
        title="Tools"
        description="Toggle which of the server's tools are exposed to agents."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshTools(connection)}
            disabled={fetchingTools}
          >
            {fetchingTools ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Refresh
          </Button>
        }
      >
        {needsReauth && (
          <div className="border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <p className="text-muted-foreground text-sm">
              This connection needs to be re-authorized to fetch its live tool list.
              Showing the saved tools below.
            </p>
            <Button variant="gradient" size="sm" onClick={onReconnect}>
              Reconnect
            </Button>
          </div>
        )}
        {toolsError && <p className="text-destructive text-sm">{toolsError}</p>}
        {fetchingTools && !liveTools ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Fetching tools…
          </div>
        ) : (
          <McpToolPicker
            tools={displayTools}
            selectedNames={selected}
            onChange={setSelected}
          />
        )}
      </BuilderSection>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this MCP connection?"
        description="Agents that reference it will lose its tools. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}

export default function McpConnectionBuilderPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground py-16 text-center">Loading…</div>}>
      <McpConnectionBuilder />
    </Suspense>
  );
}
