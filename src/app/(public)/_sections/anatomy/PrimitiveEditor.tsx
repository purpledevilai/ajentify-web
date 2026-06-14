"use client";

import { useEffect, useRef, useState } from "react";
import { Boxes, Radio, ShoppingCart, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/marketing/code-block";
import { CodeEditor } from "@/components/primitives/code-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildManifest, MODELS } from "./demo-runtime";
import type { AgentConfig } from "./types";
import { Chip, FieldLabel, Toggle } from "./ui";

type Update = (fn: (c: AgentConfig) => AgentConfig) => void;
type EditorProps = { config: AgentConfig; update: Update };

/**
 * Editable JSON field rendered with the CodeMirror code editor (syntax
 * highlighting, theme-aware). Keeps local text while typing; commits the parsed
 * object on valid JSON, and re-syncs when the value changes externally
 * (e.g. a simulated sale mutating a Data Window).
 */
function JsonEditor({
  value,
  onChange,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [valid, setValid] = useState(true);

  useEffect(() => {
    try {
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(value)) {
        setText(JSON.stringify(value, null, 2));
        setValid(true);
      }
    } catch {
      /* current text is mid-edit / invalid — leave it */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <CodeEditor
        value={text}
        language="json"
        minHeight="7rem"
        maxHeight="18rem"
        onChange={(next) => {
          setText(next);
          try {
            const parsed = JSON.parse(next);
            setValid(true);
            onChange(parsed);
          } catch {
            setValid(false);
          }
        }}
        className={cn(!valid && "ring-destructive ring-2")}
      />
      {!valid && (
        <span className="text-destructive bg-background/80 absolute bottom-2 right-2 z-10 rounded px-1 font-mono text-[0.65rem]">
          invalid JSON
        </span>
      )}
    </div>
  );
}

function Row({
  enabled,
  onToggle,
  title,
  badge,
  children,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  title: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-card p-3.5 transition-opacity",
        !enabled && "opacity-55"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-mono text-sm">
          {title}
          {badge}
        </div>
        <Toggle checked={enabled} onChange={onToggle} aria-label="Enable" />
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export function AgentEditor({ config, update }: EditorProps) {
  return (
    <>
      <FieldLabel>Name</FieldLabel>
      <Input
        value={config.name}
        onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
        className="mb-5"
      />
      <FieldLabel>Model</FieldLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => update((c) => ({ ...c, model: m.id }))}
            className={cn(
              "rounded-md border p-3 text-left transition-all",
              config.model === m.id
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:bg-muted hover:-translate-y-0.5"
            )}
          >
            <div className="text-sm font-semibold">{m.label}</div>
            <div className="text-muted-foreground text-xs">{m.vendor}</div>
          </button>
        ))}
      </div>
    </>
  );
}

export function PromptEditor({ config, update }: EditorProps) {
  return (
    <>
      <FieldLabel>System prompt</FieldLabel>
      <Textarea
        value={config.systemPrompt}
        onChange={(e) =>
          update((c) => ({ ...c, systemPrompt: e.target.value }))
        }
        className="h-44 resize-none font-mono text-[0.8rem] leading-relaxed"
      />
    </>
  );
}

export function ToolsEditor({ config, update }: EditorProps) {
  const builtins = config.tools.filter((t) => t.kind === "builtin");
  const custom = config.tools.filter((t) => t.kind !== "builtin");

  return (
    <div className="space-y-4">
      {/* Built-in PageTools */}
      <div className="border-border/60 bg-muted/30 rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="text-primary size-4" />
            Built-in PageTools
          </span>
          <Chip tone="primary">{builtins.length} ready</Chip>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">
          Provided by @ajentify/chat — attach by name, no code, always available.
        </p>
        <div className="space-y-1.5">
          {builtins.map((tool) => (
            <div key={tool.id} className="flex items-baseline gap-2">
              <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
              <code className="text-foreground font-mono text-xs">
                {tool.name}
              </code>
              <span className="text-muted-foreground text-xs">
                {tool.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom tools */}
      <div>
        <div className="mb-1 text-sm font-semibold">Your tools</div>
        <p className="text-muted-foreground mb-3 text-xs">
          Or write your own — server-side in Python, or client-side in JS that
          posts back to the agent.
        </p>
        <div className="space-y-3">
          {custom.map((tool) => (
            <div
              key={tool.id}
              className={cn(
                "overflow-hidden rounded-md border border-border/60 bg-card transition-opacity",
                !tool.enabled && "opacity-55"
              )}
            >
              <div className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    {tool.name}
                    <Chip tone={tool.kind === "server" ? "muted" : "primary"}>
                      {tool.kind === "client" ? "client-side" : "server"}
                    </Chip>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {tool.description}
                  </p>
                </div>
                <Toggle
                  checked={tool.enabled}
                  onChange={(v) =>
                    update((c) => ({
                      ...c,
                      tools: c.tools.map((t) =>
                        t.id === tool.id ? { ...t, enabled: v } : t
                      ),
                    }))
                  }
                  aria-label={`Enable ${tool.name}`}
                />
              </div>
              {tool.code && (
                <CodeBlock
                  code={tool.code}
                  filename={
                    tool.language === "python"
                      ? `${tool.name}.py`
                      : "clientSideTools.ts"
                  }
                  className="rounded-none border-x-0 border-b-0"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Use the built-ins and/or your own — mix freely.
      </p>
    </div>
  );
}

export function MemDocEditor({ config, update }: EditorProps) {
  return (
    <div className="space-y-2.5">
      {config.memDocs.map((doc) => (
        <Row
          key={doc.id}
          enabled={doc.enabled}
          onToggle={(v) =>
            update((c) => ({
              ...c,
              memDocs: c.memDocs.map((m) =>
                m.id === doc.id ? { ...m, enabled: v } : m
              ),
            }))
          }
          title={doc.name}
          badge={<Chip>.json</Chip>}
        >
          <JsonEditor
            value={doc.data}
            onChange={(next) =>
              update((c) => ({
                ...c,
                memDocs: c.memDocs.map((m) =>
                  m.id === doc.id ? { ...m, data: next } : m
                ),
              }))
            }
          />
        </Row>
      ))}
    </div>
  );
}

export function DataWindowEditor({ config, update }: EditorProps) {
  const [live, setLive] = useState(false);
  const liveRef = useRef(live);
  liveRef.current = live;

  const firstWindowId = config.dataWindows[0]?.id;

  function sellOne(dwId: string) {
    update((c) => ({
      ...c,
      dataWindows: c.dataWindows.map((d) => {
        if (d.id !== dwId) return d;
        const data = { ...d.data };
        const aurora = { ...(data["Aurora Lamp"] as Record<string, unknown>) };
        const stock = typeof aurora.stock === "number" ? aurora.stock : 0;
        aurora.stock = Math.max(0, stock - 1);
        data["Aurora Lamp"] = aurora;
        return { ...d, data };
      }),
    }));
  }

  useEffect(() => {
    if (!live || !firstWindowId) return;
    const t = window.setInterval(() => {
      if (liveRef.current) sellOne(firstWindowId);
    }, 2600);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, firstWindowId]);

  return (
    <div className="space-y-2.5">
      {config.dataWindows.map((dw) => (
        <Row
          key={dw.id}
          enabled={dw.enabled}
          onToggle={(v) =>
            update((c) => ({
              ...c,
              dataWindows: c.dataWindows.map((d) =>
                d.id === dw.id ? { ...d, enabled: v } : d
              ),
            }))
          }
          title={dw.name}
          badge={<Chip>.json</Chip>}
        >
          <p className="text-muted-foreground mb-2.5 text-xs">
            {dw.description}
          </p>
          <JsonEditor
            value={dw.data}
            onChange={(next) =>
              update((c) => ({
                ...c,
                dataWindows: c.dataWindows.map((d) =>
                  d.id === dw.id ? { ...d, data: next } : d
                ),
              }))
            }
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => sellOne(dw.id)}
              className="border-border/70 hover:bg-muted inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors"
            >
              <ShoppingCart className="size-3.5" />
              Sell one Aurora Lamp
            </button>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                live
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/70 hover:bg-muted"
              )}
            >
              <Radio className={cn("size-3.5", live && "animate-pulse")} />
              {live ? "Live feed on" : "Start live feed"}
            </button>
            <span className="text-muted-foreground text-[0.7rem]">
              watch the window — and the agent — update
            </span>
          </div>
        </Row>
      ))}
    </div>
  );
}

export function DeployView({ config }: { config: AgentConfig }) {
  const enabledTools = config.tools.filter(
    (t) => t.enabled && t.kind !== "builtin"
  ).length;

  return (
    <>
      <CodeBlock
        code={buildManifest(config)}
        filename="ajentify.json"
        className="mb-4"
      />
      <div className="overflow-hidden rounded-md border border-border/60 bg-zinc-950 font-mono text-xs">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-zinc-400">
          <Terminal className="size-3.5" />
          npx ajentify deploy --stage dev
        </div>
        <div className="space-y-1 p-3">
          <div className="text-emerald-400">+ agent &nbsp;&nbsp;{config.name}</div>
          <div className="text-emerald-400">
            + tools &nbsp;&nbsp;{enabledTools} created
          </div>
          <div className="pt-1 text-zinc-400">
            ✓ deployed to stage <span className="text-primary">dev</span> in 2.1s
          </div>
        </div>
      </div>
    </>
  );
}
