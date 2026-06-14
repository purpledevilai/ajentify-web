import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CopyPromptDialog } from "@/components/marketing/copy-prompt-dialog";
import { FeatureBlock } from "./showcase/_components/FeatureBlock";
import { Testimonials } from "./showcase/_components/Testimonials";
import {
  AgentTestingSection,
  ApiControlSection,
} from "./showcase/_components/CodeSections";
import { PromptDemo } from "./showcase/_demos/PromptDemo";
import { ToolsDemo } from "./showcase/_demos/ToolsDemo";
import { SreDemo } from "./showcase/_demos/SreDemo";
import { MemoryDemo } from "./showcase/_demos/MemoryDemo";
import { DataWindowDemo } from "./showcase/_demos/DataWindowDemo";
import { DeployDemo } from "./showcase/_demos/DeployDemo";

export const metadata: Metadata = {
  title: "Ajentify — Build AI agents, not infrastructure",
};

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="stage-glow relative overflow-hidden">
        <div className="container mx-auto max-w-3xl px-6 py-24 text-center md:py-32">
          <div className="fig-label text-muted-foreground mb-5 inline-flex items-center gap-2">
            <span className="bg-primary inline-block size-2" />
            Fully-hosted agent infrastructure
          </div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.04] tracking-tight md:text-6xl">
            Build AI agents,
            <br />
            <span className="text-gradient-brand">not infrastructure.</span>
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
            Prompt, tools, typed LLM calls, memory, live data and deploy — six
            primitives, one hosted platform. Try each one below.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <CopyPromptDialog label="Copy starter prompt" className="rounded-full" />
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/sign-up">Start building — free</Link>
            </Button>
          </div>
        </div>
      </section>

      <FeatureBlock
        index="01"
        eyebrow="Agent & prompt"
        title="Describe your agent in plain language"
        body="Name it, pick any model, attach prompt args, and write a prompt like a handbook. Change the model or an arg and the agent responds differently — instantly."
        points={[
          "Model-agnostic — Claude, GPT or Gemini in one click",
          "Per-user prompt args templated into the prompt",
          "No framework, no orchestration graph",
        ]}
        docs="/docs/agents"
        docsLabel="Agent docs"
      >
        <PromptDemo />
      </FeatureBlock>

      <FeatureBlock
        index="02"
        eyebrow="Tools"
        title="Give it tools that drive your app"
        body="Three built-in PageTools are ready out of the box. Add your own — server-side in Python, or client-side in JS that posts back to the agent. Watch it resolve real support tasks."
        points={[
          "Built-in: navigate, get_page_data, do_page_action",
          "Custom server (Python) or client (JS) tools",
          "Returns, password resets, order lookups — handled in chat",
        ]}
        docs="/docs/tools"
        docsLabel="Tools docs"
        reverse
      >
        <ToolsDemo />
      </FeatureBlock>

      <FeatureBlock
        index="03"
        eyebrow="SREs"
        title="Typed LLM calls, one curl away"
        body="A Structured Response Endpoint is a prompt template plus an output schema. Toggle the schema to change what it extracts, then call it with a single curl — here, an email as a prompt arg."
        points={[
          "Define a prompt + JSON output schema once",
          "Reconfigure the schema, change the output",
          "Call it like any API — public or authed",
        ]}
        docs="/docs/sres"
        docsLabel="SRE docs"
      >
        <SreDemo />
      </FeatureBlock>

      <FeatureBlock
        index="04"
        eyebrow="Memory documents"
        title="Deep, structured memory the agent can navigate"
        body="Store rich JSON documents the agent reads with memory tools — inspect the shape, read a path, or query nested data. No embeddings to manage."
        points={[
          "Complex nested documents, not flat key/values",
          "Agent uses get_shape / read_path / query tools",
          "Always-current, edited via the API",
        ]}
        docs="/docs/memory"
        docsLabel="Memory docs"
        reverse
      >
        <MemoryDemo />
      </FeatureBlock>

      <FeatureBlock
        index="05"
        eyebrow="Data Windows"
        title="Live data, always current in the context"
        body="Stream real-time data straight into the context window. Sell an item or flip on the live feed and the agent's answer updates with it — because it's reading the same live data your app writes."
        points={[
          "Cached, always-current JSON in-context",
          "No re-prompting — the answer just changes",
          "Perfect for stock, pricing, availability",
        ]}
        docs="/docs/data-windows"
        docsLabel="Data Window docs"
      >
        <DataWindowDemo />
      </FeatureBlock>

      <FeatureBlock
        index="06"
        eyebrow="Deploy"
        title="Ship it with one command"
        body="Your whole agent is declarative config in ajentify.json. Deploy with the CLI — it diffs and reconciles your tools, prompts and agents to any stage. Idempotent and instant."
        points={[
          "Infra-as-code: commit it, diff it, ship it",
          "Promote the same manifest between stages",
          "Re-deploying is a no-op",
        ]}
        docs="/docs/cli"
        docsLabel="CLI docs"
        reverse
      >
        <DeployDemo />
      </FeatureBlock>

      <Testimonials />

      <AgentTestingSection />

      <ApiControlSection />

      {/* Bottom CTA */}
      <section className="border-border/60 border-t">
        <div className="container mx-auto max-w-5xl px-6 py-24 text-center md:py-28">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Prototype today. Scale when you&apos;re ready.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
            Build your first agent in minutes on{" "}
            <span className="text-gradient-brand font-semibold">Ajentify</span>.
            Free to start — no credit card.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <CopyPromptDialog label="Copy starter prompt" className="rounded-full" />
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
