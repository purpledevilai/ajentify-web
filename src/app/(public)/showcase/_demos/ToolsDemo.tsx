"use client";

import { useState } from "react";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";

const BUILTIN = ["navigate", "get_page_data", "do_page_action"];
const CUSTOM = ["process_return", "reset_password", "get_order_status"];

const SCENARIOS: Record<string, { tools: ChatItem[]; answer: string }> = {
  "Return my lamp": {
    tools: [
      {
        kind: "tool",
        name: "process_return",
        meta: "server",
        input: `{ "order": "#1024", "item": "Aurora Lamp" }`,
        output: `{ "rma": "RMA-88", "refund": "$149" }`,
      },
    ],
    answer:
      "Done — return RMA-88 is created. Your $149 refund lands in 3–5 days. Anything else?",
  },
  "Reset my password": {
    tools: [
      {
        kind: "tool",
        name: "reset_password",
        meta: "server",
        input: `{ "email": "alex@acme.com" }`,
        output: `{ "sent": true }`,
      },
    ],
    answer: "I've emailed you a reset link — it's valid for 30 minutes.",
  },
  "Where's order #1024?": {
    tools: [
      {
        kind: "tool",
        name: "get_order_status",
        meta: "server",
        input: `{ "order": "#1024" }`,
        output: `{ "status": "out_for_delivery" }`,
      },
    ],
    answer: "It's out for delivery — should arrive today by 5pm.",
  },
  "Open my account": {
    tools: [
      {
        kind: "tool",
        name: "navigate",
        meta: "built-in",
        input: `{ "path": "/account" }`,
        output: `{ "navigated": true }`,
      },
    ],
    answer: "Opened your account page — you can manage everything from there.",
  },
};

export function ToolsDemo() {
  const [turns, setTurns] = useState<ChatItem[]>([
    { kind: "agent", text: "Hey! I'm Acme support. What can I help with today?" },
  ]);
  const [thinking, setThinking] = useState(false);

  function run(p: string) {
    const s = SCENARIOS[p];
    if (!s || thinking) return;
    setTurns((t) => [...t, { kind: "user", text: p }]);
    setThinking(true);
    window.setTimeout(() => setTurns((t) => [...t, ...s.tools]), 550);
    window.setTimeout(() => {
      setTurns((t) => [...t, { kind: "agent", text: s.answer }]);
      setThinking(false);
    }, 1150);
  }

  return (
    <WindowFrame url="support.acme.store">
      <div className="border-border/50 space-y-1.5 border-b px-3 py-2.5">
        <ToolRow label="Built-in PageTools" names={BUILTIN} tone="primary" />
        <ToolRow label="Your tools" names={CUSTOM} tone="accent" />
      </div>
      <Chat
        items={turns}
        thinking={thinking}
        prompts={Object.keys(SCENARIOS)}
        onPrompt={run}
        disabled={thinking}
      />
    </WindowFrame>
  );
}

function ToolRow({
  label,
  names,
  tone,
}: {
  label: string;
  names: string[];
  tone: "primary" | "accent";
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-muted-foreground w-[6.5rem] shrink-0 text-[0.62rem] font-medium uppercase tracking-wider">
        {label}
      </span>
      {names.map((n) => (
        <span
          key={n}
          className={
            tone === "primary"
              ? "bg-primary/10 text-primary rounded-md px-1.5 py-0.5 font-mono text-[0.65rem]"
              : "bg-accent/10 text-accent rounded-md px-1.5 py-0.5 font-mono text-[0.65rem]"
          }
        >
          {n}
        </span>
      ))}
    </div>
  );
}
