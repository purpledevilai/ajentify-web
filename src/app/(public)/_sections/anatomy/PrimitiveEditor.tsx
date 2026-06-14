"use client";

import { Terminal } from "lucide-react";
import { CodeBlock } from "@/components/marketing/code-block";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { buildManifest, MODELS } from "./demo-runtime";
import type { AgentConfig, PrimitiveKey } from "./types";
import { Chip, FieldLabel, Toggle } from "./ui";

type Update = (fn: (c: AgentConfig) => AgentConfig) => void;

export function PrimitiveEditor({
  selected,
  config,
  update,
}: {
  selected: PrimitiveKey;
  config: AgentConfig;
  update: Update;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      {selected === "agent" && <AgentEditor config={config} update={update} />}
      {selected === "prompt" && <PromptEditor config={config} update={update} />}
      {selected === "tools" && <ToolsEditor config={config} update={update} />}
      {selected === "sres" && <SREEditor config={config} update={update} />}
      {selected === "memdocs" && (
        <MemDocEditor config={config} update={update} />
      )}
      {selected === "datawindows" && (
        <DataWindowEditor config={config} update={update} />
      )}
      {selected === "deploy" && <DeployView config={config} />}
    </div>
  );
}

function Title({ children, sub }: { children: React.ReactNode; sub: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-display text-lg font-semibold">{children}</h3>
      <p className="text-muted-foreground mt-0.5 text-sm">{sub}</p>
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
        "rounded-lg border border-border/60 bg-card p-3.5 transition-opacity",
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

function AgentEditor({ config, update }: { config: AgentConfig; update: Update }) {
  return (
    <>
      <Title sub="Name it, pick a model, and you have a running agent.">
        Agent
      </Title>
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
              "rounded-lg border p-3 text-left transition-colors",
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
      <p className="text-muted-foreground mt-4 text-xs">
        Model-agnostic — switch providers without touching the rest of your
        agent.
      </p>
    </>
  );
}

function PromptEditor({
  config,
  update,
}: {
  config: AgentConfig;
  update: Update;
}) {
  return (
    <>
      <Title sub="Plain text, with {{variables}} when you need them. No framework to learn.">
        System prompt
      </Title>
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
        className="h-56 resize-none font-mono text-[0.8rem] leading-relaxed"
      />
    </>
  );
}

function ToolsEditor({ config, update }: { config: AgentConfig; update: Update }) {
  return (
    <>
      <Title sub="Tools are just functions. Run them on your server, or client-side to drive your app's UI.">
        Tools
      </Title>
      <div className="space-y-2.5">
        {config.tools.map((tool) => (
          <Row
            key={tool.id}
            enabled={tool.enabled}
            onToggle={(v) =>
              update((c) => ({
                ...c,
                tools: c.tools.map((t) =>
                  t.id === tool.id ? { ...t, enabled: v } : t
                ),
              }))
            }
            title={tool.name}
            badge={
              <Chip tone={tool.clientSide ? "primary" : "muted"}>
                {tool.clientSide ? "client-side" : "server"}
              </Chip>
            }
          >
            <p className="text-muted-foreground text-xs">{tool.description}</p>
          </Row>
        ))}
      </div>
    </>
  );
}

function SREEditor({ config, update }: { config: AgentConfig; update: Update }) {
  return (
    <>
      <Title sub="Structured Response Endpoints: a typed LLM call you define once and reuse — prompt, variables, JSON output.">
        SREs
      </Title>
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
            <p className="text-muted-foreground mb-2 text-xs">
              {sre.description}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[0.7rem]">in:</span>
              {sre.variables.map((v) => (
                <Chip key={v}>{v}</Chip>
              ))}
              <span className="text-muted-foreground ml-1 text-[0.7rem]">
                out:
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
    </>
  );
}

function MemDocEditor({
  config,
  update,
}: {
  config: AgentConfig;
  update: Update;
}) {
  return (
    <>
      <Title sub="Give the agent knowledge it can read. Edit a fact — the answer changes.">
        Mem-docs
      </Title>
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
          >
            <div className="space-y-2">
              {doc.facts.map((fact, idx) => (
                <Input
                  key={idx}
                  value={fact}
                  onChange={(e) =>
                    update((c) => ({
                      ...c,
                      memDocs: c.memDocs.map((m) =>
                        m.id === doc.id
                          ? {
                              ...m,
                              facts: m.facts.map((f, i) =>
                                i === idx ? e.target.value : f
                              ),
                            }
                          : m
                      ),
                    }))
                  }
                  className="text-xs"
                />
              ))}
            </div>
          </Row>
        ))}
      </div>
    </>
  );
}

function DataWindowEditor({
  config,
  update,
}: {
  config: AgentConfig;
  update: Update;
}) {
  return (
    <>
      <Title sub="Live data injected straight into the context. Change a value and watch the agent's answer update.">
        Data Windows
      </Title>
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
          >
            <p className="text-muted-foreground mb-2.5 text-xs">
              {dw.description}
            </p>
            <div className="space-y-2">
              {dw.rows.map((row, idx) => (
                <div key={row.key} className="flex items-center gap-2">
                  <span className="text-muted-foreground w-28 shrink-0 truncate font-mono text-xs">
                    {row.key}
                  </span>
                  <Input
                    value={row.value}
                    onChange={(e) =>
                      update((c) => ({
                        ...c,
                        dataWindows: c.dataWindows.map((d) =>
                          d.id === dw.id
                            ? {
                                ...d,
                                rows: d.rows.map((r, i) =>
                                  i === idx
                                    ? { ...r, value: e.target.value }
                                    : r
                                ),
                              }
                            : d
                        ),
                      }))
                    }
                    className="h-8 font-mono text-xs"
                  />
                </div>
              ))}
            </div>
          </Row>
        ))}
      </div>
    </>
  );
}

function DeployView({ config }: { config: AgentConfig }) {
  const enabledTools = config.tools.filter((t) => t.enabled).length;
  const enabledSres = config.sres.filter((s) => s.enabled).length;

  return (
    <>
      <Title sub="Your whole agent is config. Commit it, diff it, ship it — infra-as-code when you're ready.">
        Deploy
      </Title>
      <CodeBlock
        code={buildManifest(config)}
        filename="ajentify.manifest.json"
        className="mb-4"
      />
      <div className="overflow-hidden rounded-lg border border-border/60 bg-zinc-950 font-mono text-xs">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-zinc-400">
          <Terminal className="size-3.5" />
          npx ajentify deploy --stage dev
        </div>
        <div className="space-y-1 p-3">
          <div className="text-emerald-400">
            + agent &nbsp;&nbsp;{config.name}
          </div>
          <div className="text-emerald-400">
            + tools &nbsp;&nbsp;{enabledTools} created
          </div>
          <div className="text-emerald-400">
            + sres &nbsp;&nbsp;&nbsp;{enabledSres} created
          </div>
          <div className="pt-1 text-zinc-400">
            ✓ deployed to stage{" "}
            <span className="text-primary">dev</span> in 2.1s
          </div>
        </div>
      </div>
    </>
  );
}
