"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/blocks/page-header";
import { BuilderSection } from "@/components/blocks/builder-section";
import { McpToolPicker } from "@/components/blocks/mcp-tool-picker";
import { discoverMcp, listMcpTools, startMcpOAuth } from "@/lib/mcp/connect";
import { mcpConnectionsActions } from "@/lib/stores/mcp-connections-store";
import { getErrorMessage } from "@/lib/api/errors";
import type { McpToolDef } from "@/types/api";

export default function NewMcpConnectionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [mcpUrl, setMcpUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populated when the server is reachable without auth.
  const [tools, setTools] = useState<McpToolDef[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const canConnect = name.trim().length > 0 && mcpUrl.trim().length > 0;

  async function onConnect() {
    setError(null);
    setConnecting(true);
    setTools(null);
    try {
      const discovery = await discoverMcp(mcpUrl.trim());
      if (discovery.requires_auth) {
        // Redirects the browser to the MCP authorization server; the callback
        // page finishes the exchange and creates the connection.
        await startMcpOAuth({ name: name.trim(), mcpUrl: mcpUrl.trim(), discovery });
        return;
      }
      // No auth needed — list the server's tools so the user can pick.
      const { tools: discovered } = await listMcpTools({ mcp_url: mcpUrl.trim() });
      setTools(discovered);
      setSelected(discovered.map((t) => t.name));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not reach the MCP server"));
    } finally {
      setConnecting(false);
    }
  }

  async function onSave() {
    if (!tools) return;
    setError(null);
    setSaving(true);
    try {
      const chosen = tools.filter((t) => selected.includes(t.name));
      const created = await mcpConnectionsActions.create({
        name: name.trim(),
        mcp_url: mcpUrl.trim(),
        requires_auth: false,
        selected_tools: chosen,
      });
      router.push(`/app/mcp-connections/${created.mcp_connection_id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Could not save the connection"));
      setSaving(false);
    }
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
          title="New MCP connection"
          subtitle="Point at an MCP server, authorize if needed, then choose which tools to expose."
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <BuilderSection
        title="Server"
        description="The MCP server's JSON-RPC endpoint URL."
      >
        <div className="space-y-2">
          <Label htmlFor="mcp-name">Name</Label>
          <Input
            id="mcp-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Linear"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mcp-url">MCP URL</Label>
          <Input
            id="mcp-url"
            value={mcpUrl}
            onChange={(e) => setMcpUrl(e.target.value)}
            placeholder="https://mcp.example.com/mcp"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gradient" onClick={onConnect} disabled={!canConnect || connecting}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {connecting ? "Connecting…" : "Connect"}
          </Button>
          <span className="text-muted-foreground text-xs">
            If the server requires OAuth you&apos;ll be redirected to authorize.
          </span>
        </div>
      </BuilderSection>

      {tools && (
        <BuilderSection
          title="Tools"
          description="Toggle the tools you want to expose to your agents."
          actions={
            <Button variant="gradient" onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Saving…" : "Save connection"}
            </Button>
          }
        >
          <McpToolPicker tools={tools} selectedNames={selected} onChange={setSelected} />
        </BuilderSection>
      )}
    </div>
  );
}
