"use client";

import { useState } from "react";
import {
  BookOpen,
  Bot,
  Database,
  FileText,
  Rocket,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentPreview } from "./AgentPreview";
import { PrimitiveEditor } from "./PrimitiveEditor";
import { INITIAL_CONFIG, mockRuntime } from "./demo-runtime";
import type { AgentConfig, AgentRuntime, PrimitiveKey } from "./types";

const PRIMITIVES: {
  key: PrimitiveKey;
  label: string;
  icon: typeof Bot;
  count: (c: AgentConfig) => string;
}[] = [
  { key: "agent", label: "Agent", icon: Bot, count: () => "" },
  { key: "prompt", label: "System prompt", icon: FileText, count: () => "" },
  {
    key: "tools",
    label: "Tools",
    icon: Wrench,
    count: (c) => `${c.tools.filter((t) => t.enabled).length}`,
  },
  {
    key: "sres",
    label: "SREs",
    icon: Sparkles,
    count: (c) => `${c.sres.filter((s) => s.enabled).length}`,
  },
  {
    key: "memdocs",
    label: "Mem-docs",
    icon: BookOpen,
    count: (c) => `${c.memDocs.filter((m) => m.enabled).length}`,
  },
  {
    key: "datawindows",
    label: "Data Windows",
    icon: Database,
    count: (c) => `${c.dataWindows.filter((d) => d.enabled).length}`,
  },
  { key: "deploy", label: "Deploy", icon: Rocket, count: () => "" },
];

export function AnatomySection({
  runtime = mockRuntime,
}: {
  runtime?: AgentRuntime;
}) {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const [selected, setSelected] = useState<PrimitiveKey>("datawindows");

  const update = (fn: (c: AgentConfig) => AgentConfig) => setConfig(fn);
  const preview = runtime.derivePreview(config);

  return (
    <section className="border-t border-border/50">
      <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-primary mb-3 text-sm font-semibold uppercase tracking-wider">
          Anatomy of an agent
        </div>
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Everything an agent needs, in one place
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Tools, typed LLM calls, memory, live data, voice — assembled like
            building blocks, not wired together from five libraries. Edit any
            piece and watch the agent on the right react.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border/60 bg-muted/20 shadow-sm">
          <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_minmax(0,1fr)]">
            {/* Rail */}
            <nav className="flex gap-1 overflow-x-auto border-b border-border/60 p-2 lg:flex-col lg:border-b-0 lg:border-r">
              {PRIMITIVES.map(({ key, label, icon: Icon, count }) => {
                const active = selected === key;
                const c = count(config);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    className={cn(
                      "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-primary" : ""
                      )}
                    />
                    <span className="whitespace-nowrap">{label}</span>
                    {c && (
                      <span
                        className={cn(
                          "ml-auto hidden rounded-full px-1.5 text-xs lg:inline",
                          active
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {c}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Editor */}
            <div className="min-h-[480px] border-b border-border/60 bg-background lg:border-b-0 lg:border-r">
              <PrimitiveEditor
                selected={selected}
                config={config}
                update={update}
              />
            </div>

            {/* Preview */}
            <div className="min-h-[480px] bg-background p-4">
              <AgentPreview preview={preview} />
            </div>
          </div>
        </div>

        <p className="text-muted-foreground mt-4 text-center text-sm">
          This is a live, editable preview — try changing the inventory count or
          a policy.
        </p>
      </div>
    </section>
  );
}
