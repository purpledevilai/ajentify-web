"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/marketing/code-block";
import { SlidingTabs, type TabItem } from "../_components/SlidingTabs";
import { CodeWindow } from "../_components/CodeWindow";

const TABS: TabItem[] = [
  { id: "web-agent", label: "Web Agent" },
  { id: "workflow", label: "Workflow" },
  { id: "voice", label: "Voice" },
];

const EXAMPLES: Record<string, { code: string; insight: string }> = {
  "web-agent": {
    code: `{
  "web_agent": {
    "name": "Web Agent",
    "description": "Consumer facing agent in the frontend, helps users use the app, look up docs and automate things",
    "model_id": "gpt-5.2",
    "prompt": "You are a web agent operating in the browser. You have tools to navigate and perform actions on the web app. Use your tools to assist the user with the app, navigating, filling in forms, finding answers in docs, and automating processes.",
    "tools": [
      "get_page_data",
      "do_page_action",
      "navigate",
      "search_docs",
      "get_user_profile",
      "submit_support_ticket"
    ]
  }
}`,
    insight:
      "Build web agents for your web app. Our built-in tools and frontend SDK make this easy and secure.",
  },
  workflow: {
    code: `{
  "email_triage": {
    "name": "Email Triage Agent",
    "description": "Processes incoming emails and logs bugs in Jira",
    "model_id": "gpt-5.2",
    "prompt": "Go through today's unread emails. If any contain bug reports or error complaints, create a Jira ticket with appropriate priority and respond to the sender acknowledging the issue.",
    "tools": [
      "get_unread_emails",
      "classify_email",
      "create_jira_ticket",
      "send_email_reply",
      "ask_human"
    ]
  }
}`,
    insight:
      "Automate SOPs \u2014 Prompt agents in English, give them the tools and let run in the background.",
  },
  voice: {
    code: `{
  "phone_support": {
    "name": "Phone Support Agent",
    "description": "Handles inbound support calls",
    "model_id": "gpt-5.2",
    "voice_id": "pNInz6obpgDQGcFmaJgB",
    "prompt": "You are a friendly phone support agent. Speak naturally and conversationally \u2014 you're on a live call. Keep responses concise. Help callers with account questions, order status, and basic troubleshooting.",
    "tools": [
      "lookup_account",
      "get_order_status",
      "create_support_ticket"
    ]
  }
}`,
    insight:
      "Want voice? We've got you covered. Just add an ElevenLabs voice id and access it anywhere via WebRTC or a Twilio number.",
  },
};

export function AgentPrimitiveSection() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const example = EXAMPLES[activeTab];

  return (
    <section className="border-t border-border/50">
      <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em]">
          <span className="bg-primary inline-block size-2" />
          <span className="text-primary">01</span>
          <span className="text-border">/</span>
          <span className="text-muted-foreground">The Agent</span>
        </div>

        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Define agents,{" "}
              <span className="text-gradient-brand">for any environment.</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              A name, a model, a prompt, and a list of tools. Define them via
              our UI or as JSON in code. Ajentify handles the agentic
              loop, tool orchestration, and conversation state &mdash; you just
              describe what the agent should do.
            </p>

            <p
              key={activeTab}
              className="mt-8 text-xl font-semibold leading-snug tracking-tight text-foreground"
            >
              {example.insight}
            </p>
          </div>

          <CodeWindow filename="ajentify.json">
            <div className="border-b border-white/10 bg-zinc-900/80 px-4 py-2">
              <SlidingTabs
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
            <CodeBlock code={example.code} className="rounded-none border-0" />
          </CodeWindow>
        </div>
      </div>
    </section>
  );
}
