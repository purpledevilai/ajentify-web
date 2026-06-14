"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Braces,
  Check,
  Database,
  SlidersHorizontal,
  Variable,
} from "lucide-react";
import { CodeBlock } from "@/components/marketing/code-block";

const TESTING_CODE = `from ajentify_testing import SimAgent, TargetContext, run_conversation

name = "property_lookup"
description = "Agent should look up property details"

def run(session):
    sim = SimAgent(session,
        persona="A buyer asking about a 3-bedroom house",
        first_message="What's the price for 42 Smith St?",
    )
    target = TargetContext(session, agent_id=session.agent_id)

    run_conversation(sim, target, max_turns=15)

    # Deterministic assertions — instant, zero-cost
    target.assert_called_tool("lookup_property")
    target.assert_message_contains("price guide")

    # LLM-powered assessments — semantic, subjective
    target.assess_true("Gave the user a price guide")
    target.assess_score("Professional sales approach")`;

const CONTEXT_CODE = `# Create a personalized context
context = ajentify.create_context(
    agent_id="agent_123",
    prompt_args={
        "ARG_USER_NAME": "Alice",
        "ARG_COMPANY": "Acme Corp",
    },
    user_defined={
        "user_id": "usr_456",
        "access_token": session.token,
        "api_url": "https://api.example.com",
    },
)

# Add messages or inject system prompts at any time
ajentify.add_messages(context.id, messages=[...])
ajentify.chat.add_ai_message(context.id, system_prompt=...)`;

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.5, ease: "easeOut" },
} as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="fig-label text-muted-foreground mb-4 flex items-center gap-2">
      <span className="bg-primary inline-block size-2" />
      <span className="text-primary">{children}</span>
    </div>
  );
}

function CodeWindow({ filename, code }: { filename: string; code: string }) {
  return (
    <div className="ring-border/50 overflow-hidden rounded-xl shadow-[0_30px_80px_-24px_rgba(30,41,90,0.4)] ring-1">
      <CodeBlock filename={filename} code={code} className="rounded-xl border-0" />
    </div>
  );
}

export function AgentTestingSection() {
  return (
    <section className="border-border/50 border-t">
      <div className="container mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 xl:gap-16">
          <motion.div {...fade}>
            <Eyebrow>Agent testing</Eyebrow>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
              Test your agents like you test your code
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              The{" "}
              <code className="text-foreground bg-muted rounded px-1.5 py-0.5 font-mono text-[0.9em]">
                ajentify-testing
              </code>{" "}
              framework lets you write automated tests for your agents using
              simulated conversations, deterministic assertions, and LLM-powered
              assessments. Catch regressions before they reach production.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "SimAgent role-plays real user scenarios against your agent",
                "assert_* checks tool calls, message content, turn counts — instant and deterministic",
                "assess_* uses LLM evaluation for subjective quality checks",
                "Results saved as markdown reports, ready for CI integration",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[0.95rem]">
                  <span className="bg-primary/10 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3" />
                  </span>
                  <span className="text-foreground/80">{p}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/docs/testing"
              className="text-primary group/docs mt-7 inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              Testing docs
              <ArrowUpRight className="size-4 transition-transform group-hover/docs:translate-x-0.5 group-hover/docs:-translate-y-0.5" />
            </Link>
          </motion.div>

          <motion.div {...fade}>
            <CodeWindow filename="test_property_lookup.py" code={TESTING_CODE} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const API_CARDS = [
  {
    Icon: Variable,
    title: "Prompt Arguments",
    body: "Personalize agent behavior per-user with dynamic prompt templating. Values are injected when creating a context.",
  },
  {
    Icon: Braces,
    title: "User-Defined Variables",
    body: "Attach user IDs, access tokens, or API URLs to a context. Tools receive these automatically.",
  },
  {
    Icon: Database,
    title: "Data Windows",
    body: "Real-time cached data injected into the context so the agent sees live information as soon as it's updated.",
  },
  {
    Icon: SlidersHorizontal,
    title: "Message Control",
    body: "Add, replace, or remove messages at any point. Trigger AI responses with custom system prompts.",
  },
];

export function ApiControlSection() {
  return (
    <section className="border-border/50 border-t">
      <div className="container mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 xl:gap-16">
          <motion.div {...fade} className="lg:order-1">
            <CodeWindow filename="context.py" code={CONTEXT_CODE} />
          </motion.div>
          <motion.div {...fade} className="lg:order-2">
            <Eyebrow>Full API control</Eyebrow>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
              Own every message in the context window
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              For deeply integrated agentic pipelines, the Ajentify API gives you
              fine-grained control over the conversation. Generate messages, edit
              or remove previous messages, inject system prompts mid-conversation,
              and use Data Windows to surface live data the moment it&apos;s
              available.
            </p>
            <Link
              href="/docs/api"
              className="text-primary group/docs mt-7 inline-flex items-center gap-1.5 text-sm font-semibold"
            >
              API reference
              <ArrowUpRight className="size-4 transition-transform group-hover/docs:translate-x-0.5 group-hover/docs:-translate-y-0.5" />
            </Link>
          </motion.div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {API_CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 2) * 0.06, ease: "easeOut" }}
              className="border-border/60 bg-card/60 rounded-2xl border p-5 backdrop-blur-sm"
            >
              <span className="border-primary/20 bg-primary/10 text-primary mb-3 inline-flex size-9 items-center justify-center rounded-lg border">
                <c.Icon className="size-5" />
              </span>
              <h3 className="text-foreground text-base font-semibold">{c.title}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {c.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
