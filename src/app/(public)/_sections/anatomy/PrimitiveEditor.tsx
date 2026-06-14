"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, ShoppingCart, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/marketing/code-block";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildManifest, MODELS } from "./demo-runtime";
import type { AgentConfig } from "./types";
import { Chip, FieldLabel, Toggle } from "./ui";

type Update = (fn: (c: AgentConfig) => AgentConfig) => void;
type EditorProps = { config: AgentConfig; update: Update };

/**
 * Editable JSON field. Keeps local text while typing; commits the parsed
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
      <Textarea
        value={text}
        spellCheck={false}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next);
            setValid(true);
            onChange(parsed);
          } catch {
            setValid(false);
          }
        }}
        className={cn(
          "h-auto min-h-[132px] resize-none font-mono text-[0.78rem] leading-relaxed",
          !valid && "ring-destructive ring-1"
        )}
      />
      {!valid && (
        <span className="text-destructive absolute bottom-2 right-2 font-mono text-[0.65rem]">
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
      <div className="grid grid-cols-3 gap-2">
        {MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => update((c) => ({ ...c, model: m.id }))}
            className={cn(
              "rounded-md border p-3 text-left transition-colors",
              config.model === m.id
                ? "border-primary bg-primary/5"
                : "border-border/60 hover:bg-muted"
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
      <FieldLabel>Persona — drives the agent&apos;s tone</FieldLabel>
      <Input
        value={config.persona}
        onChange={(e) => update((c) => ({ ...c, persona: e.target.value }))}
        className="mb-5"
        placeholder="warm, concise, never pushy"
      />
      <FieldLabel>Prompt</FieldLabel>
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
  return (
    <div className="space-y-3">
      {config.tools.map((tool) => {
        const badge =
          tool.kind === "builtin"
            ? "built-in"
            : tool.kind === "client"
              ? "client-side"
              : "server";
        return (
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
                    {badge}
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
        );
      })}
    </div>
  );
}

export function SREEditor({ config, update }: EditorProps) {
  return (
    <div className="space-y-2.5">
      {config.sres.map((sre) => (
        <Row
          key={sre.id}
          enabled={sre.enabled}
          onToggle={(v) =>
            update((c) => ({
              ...c,
              sres: c.sres.map((s) =>
                s.id === sre.id ? { ...s, enabled: v } : s
              ),
            }))
          }
          title={`${sre.name}()`}
        >
          <p className="text-muted-foreground mb-2.5 text-xs">
            {sre.description}
          </p>
          <div className="text-muted-foreground mb-1 font-mono text-[0.65rem] uppercase tracking-wider">
            prompt_template
          </div>
          <pre className="text-foreground/75 mb-2.5 overflow-x-auto rounded bg-background/60 p-2 font-mono text-[0.72rem] leading-relaxed">
            {sre.promptTemplate}
          </pre>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[0.7rem]">
              variable_names:
            </span>
            {sre.variables.map((v) => (
              <Chip key={v}>{v}</Chip>
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground text-[0.7rem]">
              output schema:
            </span>
            {sre.outputFields.map((f) => (
              <Chip key={f.name} tone="accent">
                {f.name}: {f.type}
              </Chip>
            ))}
          </div>
        </Row>
      ))}
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

  // Auto "live feed": sell one Aurora Lamp every few seconds while on.
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
  const enabledTools = config.tools.filter((t) => t.enabled).length;
  const enabledSres = config.sres.filter((s) => s.enabled).length;

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
          <div className="text-emerald-400">
            + sres &nbsp;&nbsp;&nbsp;{enabledSres} created
          </div>
          <div className="pt-1 text-zinc-400">
            ✓ deployed to stage <span className="text-primary">dev</span> in 2.1s
          </div>
        </div>
      </div>
    </>
  );
}
