"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";
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

interface CardDef {
  n: string;
  label: string;
  title: string;
  body: string;
  render: (config: AgentConfig, update: Update) => React.ReactNode;
}

const CARDS: CardDef[] = [
  {
    n: "01",
    label: "Agent + prompt",
    title: "Describe it in plain language",
    body: "Name it, pick any model, write a prompt like a handbook. Edit the persona and the agent's tone shifts.",
    render: (config, update) => (
      <div className="space-y-5">
        <AgentEditor config={config} update={update} />
        <div className="border-border/60 border-t pt-5">
          <PromptEditor config={config} update={update} />
        </div>
      </div>
    ),
  },
  {
    n: "02",
    label: "Tools",
    title: "Give it tools that drive your app",
    body: "Just functions — server-side, or client-side to navigate routes, read page data and fill forms. Toggle one into the toolbelt.",
    render: (config, update) => <ToolsEditor config={config} update={update} />,
  },
  {
    n: "03",
    label: "SREs",
    title: "Typed LLM calls you reuse",
    body: "A prompt, its variables and a JSON output schema, defined once. Judges, extractors, classifiers — callable like a function.",
    render: (config, update) => <SREEditor config={config} update={update} />,
  },
  {
    n: "04",
    label: "Mem-docs",
    title: "Hand it knowledge",
    body: "Documents the agent reads as context. Edit a fact — the answer on the right changes with it.",
    render: (config, update) => <MemDocEditor config={config} update={update} />,
  },
  {
    n: "05",
    label: "Data Windows",
    title: "Stream in live data",
    body: "Cached, always-current data injected straight into the context. Change a value — the answer updates instantly.",
    render: (config, update) => (
      <DataWindowEditor config={config} update={update} />
    ),
  },
  {
    n: "06",
    label: "Ship it",
    title: "Test it, voice it, deploy it",
    body: "One agent definition, one place to run it.",
    render: (config) => (
      <div className="space-y-5">
        <ul className="space-y-2.5">
          {[
            "Test like code — assertions and LLM evals against the same context window your agent runs on.",
            "Same agent, now with a voice — chat and voice from one definition.",
            "Deploy as config — your whole agent is a manifest you commit and ship.",
          ].map((point) => (
            <li key={point} className="flex gap-2.5 text-sm">
              <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                <Check className="size-3" />
              </span>
              <span className="text-muted-foreground">{point}</span>
            </li>
          ))}
        </ul>
        <DeployView config={config} />
      </div>
    ),
  },
];

export function AgentDemo() {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const update: Update = (fn) => setConfig(fn);
  const preview = mockRuntime.derivePreview(config);

  return (
    <section className="marketing-grid border-border/60 relative border-b">
      <div className="container mx-auto max-w-6xl px-6 pb-20 md:pb-28">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-x-10">
          {/* Hero — blends straight into the cards below */}
          <div className="pb-8 pt-16 md:pt-24 lg:col-start-1 lg:row-start-1">
            <div className="fig-label text-muted-foreground mb-5 flex items-center gap-2">
              <span className="bg-primary inline-block size-2" />
              Fully-hosted agent infrastructure
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">
              Build AI agents,
              <br />
              <span className="text-gradient-brand">not infrastructure.</span>
            </h1>
            <p className="text-muted-foreground mt-5 max-w-md text-lg">
              Prototype in an afternoon. Scale to production — on the same
              platform.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <CopyPromptDialog
                label="Copy starter prompt"
                size="md"
                className="rounded-full"
              />
              <Button
                asChild
                variant="outline"
                size="md"
                className="rounded-full"
              >
                <Link href="/sign-up">Start building — free</Link>
              </Button>
            </div>
          </div>

          {/* Fixed output — pinned beside the hero and every card */}
          <div className="pt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-24">
            <div className="lg:sticky lg:top-24">
              <div className="draft-ticks h-[440px] lg:h-[calc(100vh-7rem)]">
                <AgentPreview preview={preview} />
              </div>
              <p className="fig-label text-muted-foreground mt-3 text-center">
                Live output · updates as you edit
              </p>
            </div>
          </div>

          {/* Stacking control cards */}
          <div className="relative lg:col-start-1 lg:row-start-2">
            {CARDS.map((card, i) => (
              <div
                key={card.n}
                className="mb-5 lg:sticky"
                style={{ top: `calc(5.5rem + ${i * 1.35}rem)` }}
              >
                <div className="bg-card border-border/70 overflow-hidden rounded-xl border shadow-[0_-2px_30px_-14px_rgba(0,0,0,0.4)]">
                  <div className="border-border/60 bg-card flex items-center justify-between border-b px-5 py-2.5">
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
                  <div className="p-5 md:p-6">
                    <h3 className="font-display text-xl font-bold tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-muted-foreground mb-5 mt-2 text-sm">
                      {card.body}
                    </p>
                    {card.render(config, update)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
