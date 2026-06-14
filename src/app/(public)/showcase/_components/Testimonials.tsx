"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Quote = {
  body: string;
  name: string;
  role: string;
  accent?: boolean;
};

const QUOTES: Quote[] = [
  {
    body: "We shipped a customer-facing agent in a weekend. The same config that ran our prototype is now serving production traffic — we never touched a server.",
    name: "Maya Chen",
    role: "Head of Eng, Globex",
    accent: true,
  },
  {
    body: "SREs replaced a whole pile of glue code. A prompt template plus a JSON schema, called like any other endpoint. That's it.",
    name: "Daniel Ortiz",
    role: "Founder, Shipfast",
  },
  {
    body: "I'm a solo dev. Ajentify gave me the AI infra of a 20-person team without hiring one. Memory, tools, deploy — all just there.",
    name: "Priya Nair",
    role: "Indie maker",
  },
  {
    body: "The client-side tools are the killer feature. My agent navigates the actual app and fills the cart — it's not just chat, it does things.",
    name: "Tom Becker",
    role: "Frontend Lead, Lumen",
  },
  {
    body: "ajentify.json in git, deploy on merge. Our agents are infra-as-code now and code review actually covers them.",
    name: "Sara Lindqvist",
    role: "Platform Eng, Northwind",
    accent: true,
  },
  {
    body: "Data Windows mean the model always sees current stock and pricing. No re-prompting, no stale answers. Support deflection jumped overnight.",
    name: "Marcus Webb",
    role: "CTO, Tidal Commerce",
  },
  {
    body: "Switching from GPT to Claude was one click. Being model-agnostic by default saved us a migration project.",
    name: "Aisha Rahman",
    role: "ML Eng, Corewave",
  },
  {
    body: "The testing framework caught a regression before it hit users. SimAgent role-plays the conversation and asserts the tool calls — proper CI for agents.",
    name: "Leo Fontaine",
    role: "Staff Eng, Backline",
  },
  {
    body: "Memory documents let the agent actually remember our customers. Nested JSON it can query — no embedding pipeline to babysit.",
    name: "Hannah Kim",
    role: "Product Eng, Settle",
    accent: true,
  },
  {
    body: "I went from idea to a deployed agent in an afternoon. The docs read like a handbook and everything just worked.",
    name: "Rafael Souza",
    role: "Hackathon winner",
  },
  {
    body: "We started on the free tier to prototype and never had to re-architect to scale. Easy to start, never outgrew it.",
    name: "Elena Vargas",
    role: "Founder, Quanta",
  },
  {
    body: "Full API control when we need it, sensible defaults when we don't. We inject system prompts mid-conversation for our agentic pipeline.",
    name: "Chris Donovan",
    role: "Principal Eng, Vector",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

export function Testimonials() {
  return (
    <section className="border-border/50 relative overflow-hidden border-t">
      <div className="stage-glow pointer-events-none absolute inset-0 opacity-60" />
      <div className="container relative mx-auto max-w-7xl px-6 py-24 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <div className="fig-label text-muted-foreground mb-4 inline-flex items-center gap-2">
            <span className="bg-primary inline-block size-2" />
            Loved by builders
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Teams ship faster on Ajentify
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            From solo makers to platform teams — the same hosted primitives take
            them from first prototype to production scale.
          </p>
          <div className="text-muted-foreground mt-5 inline-flex items-center gap-1.5 text-sm">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </span>
            <span className="text-foreground font-semibold">4.9/5</span>
            <span>from 600+ developers</span>
          </div>
        </div>

        <div className="mt-14 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (i % 3) * 0.06, ease: "easeOut" }}
              className={cn(
                "mb-4 break-inside-avoid rounded-2xl border p-5 backdrop-blur-sm",
                q.accent
                  ? "border-primary/30 from-primary/10 to-accent/10 bg-gradient-to-br"
                  : "border-border/60 bg-card/60"
              )}
            >
              <blockquote className="text-foreground/90 text-[0.95rem] leading-relaxed">
                “{q.body}”
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3">
                <span className="bg-gradient-brand flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
                  {initials(q.name)}
                </span>
                <span className="leading-tight">
                  <span className="text-foreground block text-sm font-semibold">
                    {q.name}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {q.role}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
