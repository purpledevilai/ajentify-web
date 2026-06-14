"use client";

import { useState } from "react";
import { Check } from "lucide-react";
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
import type { AgentConfig, PreviewModel } from "./anatomy/types";

type Update = (fn: (c: AgentConfig) => AgentConfig) => void;

interface CardDef {
  n: string;
  label: string;
  title: string;
  body: string;
  left: (config: AgentConfig, update: Update) => React.ReactNode;
  right: (config: AgentConfig, preview: PreviewModel) => React.ReactNode;
}

const AgentPane = (preview: PreviewModel) => (
  <div className="h-[440px]">
    <AgentPreview preview={preview} />
  </div>
);

const CARDS: CardDef[] = [
  {
    n: "01",
    label: "Agent + prompt",
    title: "Describe your agent in plain language",
    body: "Name it, pick any model, and write a system prompt like a handbook. No framework, no orchestration graph. Edit the persona and the agent on the right changes its tone instantly.",
    left: (config, update) => (
      <div className="space-y-6">
        <AgentEditor config={config} update={update} />
        <div className="border-border/60 border-t pt-5">
          <PromptEditor config={config} update={update} />
        </div>
      </div>
    ),
    right: (_c, preview) => AgentPane(preview),
  },
  {
    n: "02",
    label: "Tools",
    title: "Give it tools that drive your app",
    body: "Tools are just functions. Run them on your server, or client-side to navigate routes, read page data and fill forms — a copilot that operates your UI. Toggle one and it joins the agent's toolbelt.",
    left: (config, update) => <ToolsEditor config={config} update={update} />,
    right: (_c, preview) => AgentPane(preview),
  },
  {
    n: "03",
    label: "SREs",
    title: "Add typed LLM calls you reuse",
    body: "Structured Response Endpoints are a typed LLM call defined once — a prompt, its variables and a JSON output schema. Judges, extractors, classifiers, callable like a function.",
    left: (config, update) => <SREEditor config={config} update={update} />,
    right: (_c, preview) => AgentPane(preview),
  },
  {
    n: "04",
    label: "Mem-docs",
    title: "Hand it knowledge it can read",
    body: "Memory documents the agent reads as context. Edit a fact here and watch the agent's answer change with it — no retraining, no embeddings to manage.",
    left: (config, update) => <MemDocEditor config={config} update={update} />,
    right: (_c, preview) => AgentPane(preview),
  },
  {
    n: "05",
    label: "Data Windows",
    title: "Stream in live data",
    body: "Real-time data injected straight into the context window, cached and always current. Change a value — the agent's answer updates instantly, because it's reading the same live data your app is.",
    left: (config, update) => (
      <DataWindowEditor config={config} update={update} />
    ),
    right: (_c, preview) => AgentPane(preview),
  },
  {
    n: "06",
    label: "Ship it",
    title: "Test it, give it a voice, deploy it",
    body: "Everything above is one agent definition — and one place to run it.",
    left: () => (
      <ul className="space-y-3">
        {[
          "Test like code — simulated conversations with deterministic assertions and LLM evals, against the same context window your agent runs on.",
          "Same agent, now with a voice — chat and voice from a single definition, with full tool execution. No second agent to build.",
          "Deploy as config — your whole agent is a manifest. Commit it, diff it, ship it.",
        ].map((point) => (
          <li key={point} className="flex gap-3 text-sm">
            <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" />
            </span>
            <span className="text-muted-foreground">{point}</span>
          </li>
        ))}
      </ul>
    ),
    right: (config) => <DeployView config={config} />,
  },
];

export function HowItComesTogether() {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const update: Update = (fn) => setConfig(fn);
  const preview = mockRuntime.derivePreview(config);

  return (
    <section className="border-border/50 border-t">
      <div className="container mx-auto max-w-5xl px-6 py-20 md:py-28">
        <SectionLabel index="01">Anatomy of an agent</SectionLabel>
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Watch it come together
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Each layer is a building block. Scroll, and they stack into one
            working agent — edit anything and the live preview reacts.
          </p>
        </div>

        {/* Stacking deck — each card pins and the next layers over it */}
        <div className="relative mt-14">
          {CARDS.map((card, i) => (
            <div
              key={card.n}
              className="mb-6 lg:sticky"
              style={{ top: `calc(5.5rem + ${i * 1.5}rem)` }}
            >
              <div className="bg-card border-border/70 overflow-hidden rounded-xl border shadow-[0_-2px_30px_-12px_rgba(0,0,0,0.35)] lg:min-h-[70vh]">
                {/* Header strip — what peeks when stacked */}
                <div className="border-border/60 bg-card flex items-center justify-between border-b px-6 py-3">
                  <div className="fig-label flex items-center gap-2">
                    <span className="bg-primary inline-block size-2" />
                    <span className="text-primary">{card.n}</span>
                    <span className="text-border">/</span>
                    <span className="text-foreground">{card.label}</span>
                  </div>
                  <span className="fig-label text-muted-foreground">
                    {card.n} / 06
                  </span>
                </div>

                {/* Body */}
                <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-2 lg:items-center">
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground mb-6 mt-3">
                      {card.body}
                    </p>
                    {card.left(config, update)}
                  </div>
                  <div>{card.right(config, preview)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
