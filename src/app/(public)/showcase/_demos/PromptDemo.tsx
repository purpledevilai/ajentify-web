"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";

const MODELS = [
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT-5.2" },
  { id: "gemini", label: "Gemini" },
];

const RESPONSES: Record<string, (name: string, company: string) => string> = {
  "What can you do?": (n, c) =>
    `Plenty, ${n} — I handle ${c} orders, returns, product questions and account settings, all in chat.`,
  "Draft a welcome email": (n, c) =>
    `Done — a warm ${c} welcome email for new customers, friendly and signed off, ready to send.`,
  "Summarize my last order": (n) =>
    `Here you go, ${n}: 1× Aurora Lamp ($149), delivered Tuesday. Want the invoice?`,
};

export function PromptDemo() {
  const [model, setModel] = useState("gpt");
  const [name, setName] = useState("Alex");
  const [company, setCompany] = useState("Acme");
  const [turns, setTurns] = useState<ChatItem[]>([]);
  const [thinking, setThinking] = useState(false);

  const modelLabel = MODELS.find((m) => m.id === model)?.label;
  const greeting: ChatItem = {
    kind: "agent",
    text: `Hi ${name || "there"} — I'm ${company || "Acme"}'s assistant, running on ${modelLabel}. How can I help?`,
  };

  function ask(p: string) {
    if (thinking) return;
    setTurns((t) => [...t, { kind: "user", text: p }]);
    setThinking(true);
    window.setTimeout(() => {
      const r = RESPONSES[p]?.(name || "there", company || "Acme") ?? "…";
      setTurns((t) => [...t, { kind: "agent", text: r }]);
      setThinking(false);
    }, 750);
  }

  return (
    <WindowFrame title="agent · playground">
      <div className="border-border/50 grid gap-2 border-b p-2.5 sm:grid-cols-[auto_1fr_1fr]">
        <div className="flex gap-1">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[0.7rem] font-medium transition-colors",
                model === m.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ArgField label="ARG_USER_NAME" value={name} onChange={setName} />
        <ArgField label="ARG_COMPANY" value={company} onChange={setCompany} />
      </div>
      <Chat
        items={[greeting, ...turns]}
        thinking={thinking}
        prompts={Object.keys(RESPONSES)}
        onPrompt={ask}
        disabled={thinking}
      />
    </WindowFrame>
  );
}

function ArgField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="border-border/60 bg-card flex items-center gap-1.5 rounded-md border px-2 py-1">
      <span className="text-muted-foreground shrink-0 font-mono text-[0.58rem]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs outline-none"
      />
    </label>
  );
}
