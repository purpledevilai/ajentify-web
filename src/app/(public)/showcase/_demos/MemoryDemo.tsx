"use client";

import { useState } from "react";
import { Database } from "lucide-react";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";

const DOC = `{
  "customer": "Maya Chen",
  "tier": "enterprise",
  "billing": { "plan": "Scale", "seats": 240, "renewal": "2026-11" },
  "preferences": { "channel": "email", "language": "en" },
  "orders": [ { "id": "#5012", "total": 12400 }, … 23 more ],
  "tickets": [ { "id": "T-91", "status": "open", "topic": "SSO" } ]
}`;

const SCENARIOS: Record<string, { tool: ChatItem; answer: string }> = {
  "What plan are they on?": {
    tool: {
      kind: "tool",
      name: "read_path",
      meta: "memory",
      input: `"billing.plan"`,
      output: `"Scale" · 240 seats`,
    },
    answer: "They're on Scale — 240 seats, renewing Nov 2026.",
  },
  "Any open tickets?": {
    tool: {
      kind: "tool",
      name: "query",
      meta: "memory",
      input: `tickets[status="open"]`,
      output: `[ { "id": "T-91", "topic": "SSO" } ]`,
    },
    answer: "Yes — ticket T-91 is open, about SSO setup.",
  },
  "What shape is the data?": {
    tool: {
      kind: "tool",
      name: "get_document_shape",
      meta: "memory",
      output: `customer, tier, billing{…}, preferences{…}, orders[], tickets[]`,
    },
    answer:
      "It's a customer profile: tier + billing, preferences, 24 orders and a tickets list — I can read any path.",
  },
};

export function MemoryDemo() {
  const [turns, setTurns] = useState<ChatItem[]>([
    {
      kind: "agent",
      text: "I've got Maya Chen's profile in memory. Ask me anything about it.",
    },
  ]);
  const [thinking, setThinking] = useState(false);

  function ask(p: string) {
    const s = SCENARIOS[p];
    if (!s || thinking) return;
    setTurns((t) => [...t, { kind: "user", text: p }]);
    setThinking(true);
    window.setTimeout(() => setTurns((t) => [...t, s.tool]), 500);
    window.setTimeout(() => {
      setTurns((t) => [...t, { kind: "agent", text: s.answer }]);
      setThinking(false);
    }, 1050);
  }

  return (
    <WindowFrame title="memory · customer_8842">
      <div className="border-border/50 border-b">
        <div className="text-muted-foreground flex items-center gap-1.5 px-3 pt-2.5 text-[0.62rem] font-medium uppercase tracking-wider">
          <Database className="size-3" />
          memory document · customer_8842.json
        </div>
        <pre className="text-foreground/75 max-h-[8.5rem] overflow-auto px-3 pb-3 pt-1.5 font-mono text-[0.68rem] leading-relaxed">
          {DOC}
        </pre>
      </div>
      <Chat
        items={turns}
        thinking={thinking}
        prompts={Object.keys(SCENARIOS)}
        onPrompt={ask}
        disabled={thinking}
      />
    </WindowFrame>
  );
}
