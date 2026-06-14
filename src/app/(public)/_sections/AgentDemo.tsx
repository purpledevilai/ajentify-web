"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";
import { StorefrontPanel } from "./StorefrontPanel";
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
  id: string;
  n: string;
  label: string;
  title: string;
  body: string;
  render: (config: AgentConfig, update: Update) => React.ReactNode;
}

const CARDS: CardDef[] = [
  {
    id: "agent",
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
    id: "tools",
    n: "02",
    label: "Tools",
    title: "Give it tools that drive your app",
    body: "Tools are just functions. Server-side tools run sandboxed Python; client-side tools have no server code — a handler in your app runs and returns to the agent. navigate, get_page_data and do_page_action are built-in PageTools.",
    render: (config, update) => <ToolsEditor config={config} update={update} />,
  },
  {
    id: "sres",
    n: "03",
    label: "SREs",
    title: "Typed LLM calls you reuse",
    body: "A prompt, its variables and a JSON output schema, defined once. Judges, extractors, classifiers — callable like a function.",
    render: (config, update) => <SREEditor config={config} update={update} />,
  },
  {
    id: "memdocs",
    n: "04",
    label: "Mem-docs",
    title: "Hand it knowledge as JSON",
    body: "A JSON document the agent reads as context. Edit a field — the answer in the chat changes with it.",
    render: (config, update) => <MemDocEditor config={config} update={update} />,
  },
  {
    id: "datawindows",
    n: "05",
    label: "Data Windows",
    title: "Stream in live data",
    body: "A live JSON document injected into the context. Sell an Aurora Lamp and the product page's stock — and the agent's answer — update together.",
    render: (config, update) => (
      <DataWindowEditor config={config} update={update} />
    ),
  },
  {
    id: "ship",
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

const DOCS_BY_ID: Record<string, string> = {
  agent: "https://api.ajentify.com/docs/POST/agent",
  tools: "https://api.ajentify.com/docs/POST/tool",
  sres: "https://api.ajentify.com/docs/POST/sre",
  memdocs: "https://api.ajentify.com/docs/web-chat-quickstart",
  datawindows: "https://api.ajentify.com/docs",
  ship: "https://api.ajentify.com/docs/POST/deploy",
};

export function AgentDemo() {
  const [config, setConfig] = useState<AgentConfig>(INITIAL_CONFIG);
  const update: Update = (fn) => setConfig(fn);
  const preview = mockRuntime.derivePreview(config);

  const [active, setActive] = useState("agent");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-section]")
    );
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const best = visible.reduce((a, b) =>
          b.intersectionRatio > a.intersectionRatio ? b : a
        );
        const id = best.target.getAttribute("data-section");
        if (id) setActive(id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <section className="stage-glow relative">
      <div
        ref={containerRef}
        className="lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
      >
        {/* Hero — top-left */}
        <div className="lg:col-start-1 lg:row-start-1">
          <div className="mx-auto w-full max-w-2xl px-6 pb-6 pt-16 md:pt-24 lg:px-12">
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
              <Button asChild variant="outline" size="md" className="rounded-full">
                <Link href="/sign-up">Start building — free</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Floating white storefront — top-aligned with the first step, then sticky */}
        <div className="px-6 pb-10 lg:col-start-2 lg:row-start-2 lg:pl-0 lg:pr-12 lg:pt-12">
          <div className="lg:sticky lg:top-24">
            {/* Never taller than it is wide; also capped to the viewport. */}
            <div className="mx-auto aspect-square max-h-[560px] w-full lg:max-h-[calc(100vh-8rem)]">
              <StorefrontPanel config={config} preview={preview} active={active} />
            </div>
          </div>
        </div>

        {/* Config — left, scrolls; drives the panel spotlight */}
        <div className="lg:col-start-1 lg:row-start-2">
          <div className="divide-border/60 mx-auto w-full max-w-2xl divide-y px-6 pb-28 lg:px-12">
            {CARDS.map((card) => (
              <div
                key={card.n}
                data-section={card.id}
                className="scroll-mt-24 py-16 first:pt-12"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="fig-label text-muted-foreground flex items-center gap-2">
                    <span className="bg-primary inline-block size-2" />
                    <span className="text-primary">{card.n}</span>
                    <span className="text-border">/</span>
                    <span className="text-foreground">{card.label}</span>
                  </div>
                  <a
                    href={DOCS_BY_ID[card.id]}
                    target="_blank"
                    rel="noreferrer"
                    className="fig-label text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    Docs
                    <ArrowUpRight className="size-3" />
                  </a>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-tight">
                  {card.title}
                </h3>
                <p className="text-muted-foreground mb-6 mt-2">{card.body}</p>
                {card.render(config, update)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
