"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/marketing/section-label";
import { AgentPreview } from "./anatomy/AgentPreview";
import {
  AgentEditor,
  PromptEditor,
  ToolsEditor,
  SREEditor,
  MemDocEditor,
  DataWindowEditor,
  DeployView,
} from "./anatomy/PrimitiveEditor";
import { INITIAL_CONFIG, mockRuntime } from "./anatomy/demo-runtime";
import type { AgentConfig } from "./anatomy/types";

type Update = (fn: (c: AgentConfig) => AgentConfig) => void;

const BLOCKS: {
  index: string;
  label: string;
  title: string;
  copy: string;
  render: (config: AgentConfig, update: Update) => React.ReactNode;
}[] = [
  {
    index: "01",
    label: "Agent",
    title: "Start with an agent",
    copy: "Name it, pick a model, done. Model-agnostic — switch providers without touching anything else.",
    render: (config, update) => <AgentEditor config={config} update={update} />,
  },
  {
    index: "02",
    label: "System prompt",
    title: "Tell it how to behave",
    copy: "Plain text with {{variables}} when you need them. Edit the persona and watch the agent's tone shift on the right.",
    render: (config, update) => (
      <PromptEditor config={config} update={update} />
    ),
  },
  {
    index: "03",
    label: "Tools",
    title: "Give it tools",
    copy: "Tools are just functions. Run them on your server, or client-side to drive your app's UI. Toggle one — it joins the agent's toolbelt.",
    render: (config, update) => <ToolsEditor config={config} update={update} />,
  },
  {
    index: "04",
    label: "SREs",
    title: "Add typed LLM calls",
    copy: "Structured Response Endpoints: a typed LLM call you define once and reuse — a prompt, its variables, and a JSON output schema.",
    render: (config, update) => <SREEditor config={config} update={update} />,
  },
  {
    index: "05",
    label: "Mem-docs",
    title: "Give it knowledge",
    copy: "Memory documents the agent reads. Edit a fact and the answer on the right changes with it.",
    render: (config, update) => <MemDocEditor config={config} update={update} />,
  },
  {
    index: "06",
    label: "Data Windows",
    title: "Stream in live data",
    copy: "Real-time data injected straight into the context window. Change a value — watch the agent's answer update instantly.",
    render: (config, update) => (
      <DataWindowEditor config={config} update={update} />
    ),
  },
  {
    index: "07",
    label: "Deploy",
    title: "Ship it as config",
    copy: "Your whole agent is declarative config. Commit it, diff it, deploy it — infra-as-code when you're ready.",
    render: (config) => <DeployView config={config} />,
  },
];

export function InteractiveBuild() {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const update: Update = (fn) => setConfig(fn);
  const preview = mockRuntime.derivePreview(config);

  return (
    <section className="border-border/50 border-t">
      <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
        <SectionLabel index="01">Anatomy of an agent</SectionLabel>
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Everything an agent needs, in one place
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Scroll the building blocks on the left and edit any of them. The
            agent stays pinned on the right and reacts as you go.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
          {/* Pinned agent — first in DOM so it shows on mobile, placed right on desktop */}
          <div className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
            <div className="draft-ticks">
              <div className="h-[520px] lg:h-[calc(100vh-9rem)]">
                <AgentPreview preview={preview} />
              </div>
            </div>
            <p className="fig-label text-muted-foreground mt-3 text-center">
              Live preview · updates as you edit
            </p>
          </div>

          {/* Scrolling control blocks */}
          <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1">
            {BLOCKS.map((block) => (
              <div
                key={block.index}
                className="bg-card/60 border-border/60 rounded-lg border p-6"
              >
                <div className="fig-label text-muted-foreground mb-3 flex items-center gap-2">
                  <span className="text-primary">{block.index}</span>
                  <span className="text-border">/</span>
                  <span className="text-foreground">{block.label}</span>
                </div>
                <h3 className="font-display text-xl font-semibold tracking-tight">
                  {block.title}
                </h3>
                <p className="text-muted-foreground mb-5 mt-1.5 text-sm">
                  {block.copy}
                </p>
                {block.render(config, update)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
