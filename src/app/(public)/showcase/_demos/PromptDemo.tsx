"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";
import { ModelPicker, modelLabel, DEFAULT_MODEL } from "../_components/ModelPicker";
import { DemoStage } from "../_components/DemoStage";

const DEFAULT_PROMPT = `You are {{COMPANY}}'s customer assistant. Greet {{USER_NAME}} warmly, then help with orders, returns, product questions and account settings.

Be concise and friendly. Confirm before taking any action that changes an order. If you're unsure what someone means, ask one clarifying question instead of guessing.

Never share another customer's details. Stay in character as a member of the {{COMPANY}} team.`;

const RESPONSES: Record<string, (name: string, company: string) => string> = {
  "What can you do?": (n, c) =>
    `Plenty, ${n} — I handle ${c} orders, returns, product questions and account settings, all in chat.`,
  "Draft a welcome email": (n, c) =>
    `Done — a warm ${c} welcome email for new customers, friendly and ready to send.`,
  "Summarize my last order": (n) =>
    `Here you go, ${n}: 1× Aurora Lamp ($149), delivered Tuesday. Want the invoice?`,
};

export function PromptDemo() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [name, setName] = useState("Alex");
  const [company, setCompany] = useState("Acme");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [turns, setTurns] = useState<ChatItem[]>([]);
  const [thinking, setThinking] = useState(false);
  const [front, setFront] = useState<"a" | "b">("b");
  const stageRef = useRef<HTMLDivElement>(null);

  const label = modelLabel(model);
  const greeting: ChatItem = {
    kind: "agent",
    text: `Hi ${name || "there"} — I'm ${company || "Acme"}'s assistant on ${label}. How can I help?`,
  };

  function ask(p: string) {
    if (thinking) return;
    setTurns((t) => [...t, { kind: "user", text: p }]);
    setThinking(true);
    window.setTimeout(() => {
      setTurns((t) => [
        ...t,
        { kind: "agent", text: RESPONSES[p]?.(name || "there", company || "Acme") ?? "…" },
      ]);
      setThinking(false);
    }, 750);
  }

  return (
    <DemoStage image="/showcase/agent.jpg" stageRef={stageRef}>
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("a")}
        title="agent · playground"
        z={front === "a" ? 30 : 20}
        className="absolute left-[3%] top-[4%] h-[78%] w-[80%]"
      >
        <div className="flex min-h-0 flex-1">
          {/* Controls sidebar */}
          <div className="border-border/50 flex w-[46%] max-w-[19rem] shrink-0 flex-col gap-3 overflow-hidden border-r p-3">
            <Group label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-border/60 bg-card w-full rounded-md border px-2 py-1.5 text-xs outline-none"
              />
            </Group>
            <Group label="Model">
              <ModelPicker value={model} onChange={setModel} />
            </Group>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                System prompt
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                spellCheck={false}
                className="border-border/60 bg-card min-h-[7rem] flex-1 resize-none rounded-md border p-2 font-mono text-[0.7rem] leading-relaxed outline-none"
              />
            </div>
            <Group label="Prompt args">
              <Arg label="USER_NAME" value={name} onChange={setName} />
              <Arg label="COMPANY" value={company} onChange={setCompany} />
            </Group>
          </div>

          {/* Chat */}
          <div className="min-w-0 flex-1">
            <Chat
              items={[greeting, ...turns]}
              header={{ name: `${company || "Acme"} Assistant`, sub: label }}
              thinking={thinking}
              prompts={Object.keys(RESPONSES)}
              onPrompt={ask}
              disabled={thinking}
            />
          </div>
        </div>
      </WindowFrame>

      {/* Voice call — same agent, on the phone */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("b")}
        title="voice · live call"
        z={front === "b" ? 30 : 20}
        className="absolute bottom-[4%] right-[3%] h-[56%] w-[48%]"
      >
        <VoiceCall name={name} />
      </WindowFrame>
    </DemoStage>
  );
}

function VoiceCall({ name }: { name: string }) {
  const SCRIPT = [
    `${name || "Caller"}: Hey — what are your hours?`,
    "Agent: We're open 9 to 6, Monday to Friday.",
    `${name || "Caller"}: Can I return a lamp I bought?`,
    "Agent: Of course — want me to start the return now?",
  ];
  const [shown, setShown] = useState(1);
  const [secs, setSecs] = useState(7);

  useEffect(() => {
    const t = window.setInterval(() => setSecs((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    const t = window.setInterval(
      () => setShown((s) => (s >= SCRIPT.length ? 1 : s + 1)),
      2200
    );
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col items-center bg-transparent p-3 text-center">
      <div className="relative mt-1">
        <motion.span
          className="bg-primary/30 absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
        />
        <span className="bg-gradient-brand relative flex size-11 items-center justify-center rounded-full">
          <Bot className="size-6 text-white" />
        </span>
      </div>
      <div className="text-foreground mt-2 text-xs font-semibold">
        Storefront Assistant
      </div>
      <div className="text-muted-foreground text-[0.65rem]">
        on call · {String(Math.floor(secs / 60)).padStart(2, "0")}:
        {String(secs % 60).padStart(2, "0")}
      </div>
      <div className="mt-2 flex h-5 items-center gap-0.5">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="bg-primary/70 w-0.5 rounded-full"
            animate={{ height: [4, 14, 6, 16, 5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.06 }}
          />
        ))}
      </div>
      <div className="mt-2 flex-1 space-y-1 overflow-hidden text-left text-[0.62rem] leading-snug">
        {SCRIPT.slice(0, shown).map((l, i) => (
          <div
            key={i}
            className={cn(
              "animate-in fade-in slide-in-from-bottom-1",
              l.startsWith("Agent")
                ? "text-foreground/80"
                : "text-muted-foreground"
            )}
          >
            {l}
          </div>
        ))}
      </div>
      <span className="mt-1 flex size-7 items-center justify-center rounded-full bg-red-500 text-white">
        <PhoneOff className="size-3.5" />
      </span>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
        {label}
      </div>
      {children}
    </div>
  );
}

function Arg({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="border-border/60 bg-card mb-1.5 flex items-center gap-1 rounded-md border px-1.5 py-1">
      <span className="text-muted-foreground shrink-0 font-mono text-[0.52rem]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[0.7rem] outline-none"
      />
    </label>
  );
}
