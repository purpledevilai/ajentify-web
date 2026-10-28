"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MCP_QUICK_ADD_PRESETS, type McpQuickAddPreset } from "@/lib/constants/mcp-quick-add";
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

  // Quick-add presets: fill the form, scroll the server fields into view and
  // flash them so it's obvious something was entered.
  const serverSectionRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(false);

  function applyPreset(preset: McpQuickAddPreset) {
    setName(preset.name);
    setMcpUrl(preset.mcpUrl);
    setPresetId(preset.id);
    setTools(null);
    setError(null);
    serverSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Focus after the scroll settles so the browser doesn't fight it.
    window.setTimeout(() => urlInputRef.current?.focus({ preventScroll: true }), 350);
    setHighlight(true);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(false), 1600);
  }

  function onUrlChange(value: string) {
    setMcpUrl(value);
    // Editing the URL by hand means it's no longer "the preset".
    if (presetId && value.trim() !== MCP_QUICK_ADD_PRESETS.find((p) => p.id === presetId)?.mcpUrl) {
      setPresetId(null);
    }
  }

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

      <div ref={serverSectionRef} className="scroll-mt-6">
      <BuilderSection
        title="Server"
        description="The MCP server's JSON-RPC endpoint URL."
        className={cn(
          "transition-shadow duration-500",
          highlight && "ring-primary/60 shadow-primary/20 shadow-lg ring-2"
        )}
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
            ref={urlInputRef}
            value={mcpUrl}
            onChange={(e) => onUrlChange(e.target.value)}
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
      </div>

      {!tools && (
        <BuilderSection
          title="Quick add"
          description="Servers we've verified work with Ajentify. Pick one to fill in the details above, then hit Connect."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MCP_QUICK_ADD_PRESETS.map((preset) => {
              const active = presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  aria-pressed={active}
                  className={cn(
                    "border-border bg-background hover:border-primary/40 hover:bg-muted/40 group relative flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    active && "border-primary/60 bg-primary/5"
                  )}
                >
                  <span className="bg-card ring-border flex size-10 shrink-0 items-center justify-center rounded-md ring-1">
                    <Image
                      src={preset.logo}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 object-contain"
                      unoptimized
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-muted-foreground block font-mono text-[10px] tracking-[0.14em] uppercase">
                      {preset.vendor}
                    </span>
                    <span className="block font-medium">{preset.name}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs leading-5">
                      {preset.description}
                    </span>
                  </span>
                  {active && (
                    <Check className="text-primary absolute top-3 right-3 size-4" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </BuilderSection>
      )}

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
