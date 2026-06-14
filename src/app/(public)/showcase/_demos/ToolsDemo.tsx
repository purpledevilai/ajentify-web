"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/marketing/code-block";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";
import { DemoStage } from "../_components/DemoStage";

type Tool = {
  name: string;
  builtin: boolean;
  runtime: "client" | "server";
  inputs: { name: string; type: string }[];
  code?: string;
};

const GROUPS: { label: string; tools: Tool[] }[] = [
  {
    label: "Web Chat · built-in",
    tools: [
      { name: "navigate", builtin: true, runtime: "client", inputs: [{ name: "path", type: "string" }] },
      { name: "get_page_data", builtin: true, runtime: "client", inputs: [] },
      { name: "do_page_action", builtin: true, runtime: "client", inputs: [{ name: "action", type: "string" }, { name: "target", type: "string" }] },
    ],
  },
  {
    label: "Memory · built-in",
    tools: [
      { name: "get_document_shape", builtin: true, runtime: "server", inputs: [] },
      { name: "read_path", builtin: true, runtime: "server", inputs: [{ name: "path", type: "string" }] },
      { name: "query", builtin: true, runtime: "server", inputs: [{ name: "filter", type: "string" }] },
    ],
  },
  {
    label: "Your tools",
    tools: [
      {
        name: "process_return",
        builtin: false,
        runtime: "server",
        inputs: [{ name: "order", type: "string" }, { name: "item", type: "string" }],
        code: `def process_return(context, order: str, item: str):
    rma = returns.create(order=order, item=item)
    return {"rma": rma.id, "refund": rma.amount}`,
      },
      {
        name: "reset_password",
        builtin: false,
        runtime: "server",
        inputs: [{ name: "email", type: "string" }],
        code: `def reset_password(context, email: str):
    auth.send_reset_link(email)
    return {"sent": True}`,
      },
      {
        name: "add_to_cart",
        builtin: false,
        runtime: "client",
        inputs: [{ name: "sku", type: "string" }, { name: "qty", type: "number" }],
        code: `defineClientSideTools({
  add_to_cart: async ({ sku, qty }) => {
    await api.cart.add(sku, qty);
    return { ok: true };
  },
});`,
      },
    ],
  },
];

const SCENARIOS: Record<string, { tools: ChatItem[]; answer: string }> = {
  "Return my lamp": {
    tools: [{ kind: "tool", name: "process_return", meta: "server", input: `{ "order": "#1024", "item": "Aurora Lamp" }`, output: `{ "rma": "RMA-88", "refund": "$149" }` }],
    answer: "Done — return RMA-88 created. Your $149 refund lands in 3–5 days.",
  },
  "Reset my password": {
    tools: [{ kind: "tool", name: "reset_password", meta: "server", input: `{ "email": "alex@acme.com" }`, output: `{ "sent": true }` }],
    answer: "I've emailed you a reset link — valid for 30 minutes.",
  },
  "Add 2 lamps to cart": {
    tools: [{ kind: "tool", name: "add_to_cart", meta: "client", input: `{ "sku": "aurora", "qty": 2 }`, output: `{ "ok": true }` }],
    answer: "Added 2 Aurora Lamps to your cart — ready when you are.",
  },
};

function RuntimeBadge({ runtime }: { runtime: "client" | "server" }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 font-mono text-[0.62rem]",
        runtime === "client"
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {runtime}-side
    </span>
  );
}

export function ToolsDemo() {
  const [selected, setSelected] = useState<Tool>(GROUPS[2].tools[0]);
  const [turns, setTurns] = useState<ChatItem[]>([
    { kind: "agent", text: "Hey! I'm Acme support. What can I help with today?" },
  ]);
  const [thinking, setThinking] = useState(false);
  const [front, setFront] = useState<"a" | "b">("b");
  const stageRef = useRef<HTMLDivElement>(null);

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
    <DemoStage image="/showcase/tools.jpg" stageRef={stageRef}>
      {/* Tool editor */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("a")}
        title="tools · acme-store"
        z={front === "a" ? 30 : 20}
        className="absolute left-[3%] top-[4%] h-[80%] w-[80%]"
      >
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <div className="border-border/50 w-[38%] max-w-[14rem] shrink-0 space-y-3 overflow-y-auto border-r p-3">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="text-muted-foreground mb-1 text-[0.56rem] font-medium uppercase tracking-wider">
                  {g.label}
                </div>
                <div className="space-y-0.5">
                  {g.tools.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setSelected(t)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left font-mono text-[0.7rem] transition-colors",
                        selected.name === t.name
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          t.runtime === "client" ? "bg-primary" : "bg-muted-foreground/50"
                        )}
                      />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Selected tool */}
          <div className="min-w-0 flex-1 space-y-3 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-foreground font-mono text-sm">
                {selected.name}()
              </code>
              <RuntimeBadge runtime={selected.runtime} />
              {selected.builtin && (
                <span className="border-border bg-muted text-muted-foreground rounded-md border px-1.5 py-0.5 font-mono text-[0.62rem]">
                  built-in
                </span>
              )}
            </div>

            <div>
              <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                inputs
              </div>
              {selected.inputs.length === 0 ? (
                <span className="text-muted-foreground text-xs">no inputs</span>
              ) : (
                <div className="space-y-1.5">
                  {selected.inputs.map((p) => (
                    <div
                      key={p.name}
                      className="border-border/60 bg-muted/40 flex items-center justify-between rounded-md border px-2 py-1 font-mono text-[0.72rem]"
                    >
                      <span className="text-foreground/85">{p.name}</span>
                      <span className="text-muted-foreground">{p.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selected.code ? (
              <div>
                <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                  {selected.runtime === "client" ? "handler (JS)" : "code (Python)"}
                </div>
                <CodeBlock
                  code={selected.code}
                  transparent
                  filename={
                    selected.runtime === "client"
                      ? "clientSideTools.ts"
                      : `${selected.name}.py`
                  }
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Built-in PageTool — provided by @ajentify/chat. Attach by name,
                no code.
              </p>
            )}
          </div>
        </div>
      </WindowFrame>

      {/* Agent chat — its own window */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("b")}
        url="support.acme.store"
        z={front === "b" ? 30 : 20}
        className="absolute bottom-[4%] right-[3%] h-[60%] w-[44%]"
      >
        <Chat
          items={turns}
          header={{ name: "Acme Support", sub: "calling your tools" }}
          thinking={thinking}
          prompts={Object.keys(SCENARIOS)}
          onPrompt={run}
          disabled={thinking}
        />
      </WindowFrame>
    </DemoStage>
  );
}
