"use client";

import { useRef, useState } from "react";
import { WindowFrame } from "../_components/WindowFrame";
import { JsonField } from "../_components/JsonField";
import { Chat, type ChatItem } from "../_components/Chat";

const INITIAL = {
  name: "Maya Chen",
  remember: {
    role: "Head of Ops at Globex",
    prefers: "concise answers, metric units",
    timezone: "PST",
    context: "evaluating us for a 200-seat rollout",
    facts: ["dislikes marketing fluff", "loves a good changelog"],
  },
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function MemoryDemo() {
  const [data, setData] = useState<Record<string, unknown>>(INITIAL);
  const [turns, setTurns] = useState<ChatItem[]>([
    { kind: "agent", text: "I've got your profile in memory — ask me anything I remember." },
  ]);
  const [thinking, setThinking] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const mem = rec(data.remember);
  const str = (k: string) => (typeof mem[k] === "string" ? (mem[k] as string) : "—");

  const SCENARIOS: Record<string, { tool: ChatItem; answer: string }> = {
    "What do you remember?": {
      tool: { kind: "tool", name: "get_document_shape", meta: "memory", output: `name, remember{ role, prefers, context, facts[] }` },
      answer: `You're ${str("role")}. Right now you're ${str("context")} — and I keep things ${str("prefers")}.`,
    },
    "How should you reply?": {
      tool: { kind: "tool", name: "read_path", meta: "memory", input: `"remember.prefers"`, output: str("prefers") },
      answer: `Got it — ${str("prefers")}. I'll keep it that way.`,
    },
    "Any quirks to know?": {
      tool: { kind: "tool", name: "read_path", meta: "memory", input: `"remember.facts"`, output: Array.isArray(mem.facts) ? `[${(mem.facts as unknown[]).length}]` : "[]" },
      answer: Array.isArray(mem.facts)
        ? `Noted: ${(mem.facts as string[]).join("; ")}.`
        : "Nothing recorded yet.",
    },
  };

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
    <div
      ref={stageRef}
      className="demo-desktop ring-border/40 relative h-full w-full overflow-hidden rounded-2xl ring-1"
    >
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        title="memory · user_842"
        className="absolute left-[6%] top-[6%] z-10 h-[88%] w-[88%]"
      >
        <div className="flex min-h-0 flex-1">
          <div className="border-border/50 flex w-[48%] shrink-0 flex-col border-r">
            <div className="text-muted-foreground border-border/50 border-b px-3 py-2 text-[0.6rem] font-medium uppercase tracking-wider">
              user_842.json · editable
            </div>
            <JsonField
              value={data}
              onChange={setData}
              minHeight="100%"
              className="min-h-0 flex-1 [&>div]:h-full [&>div]:rounded-none [&>div]:border-0"
            />
          </div>
          <div className="min-w-0 flex-1">
            <Chat
              items={turns}
              thinking={thinking}
              prompts={Object.keys(SCENARIOS)}
              onPrompt={ask}
              disabled={thinking}
            />
          </div>
        </div>
      </WindowFrame>
    </div>
  );
}
