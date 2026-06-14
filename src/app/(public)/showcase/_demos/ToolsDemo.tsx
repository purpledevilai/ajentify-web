"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/marketing/code-block";
import { WindowFrame } from "../_components/WindowFrame";
import { Chat, type ChatItem } from "../_components/Chat";

type Tool = { name: string; kind: "builtin" | "server" | "client"; desc?: string; code?: string };

const GROUPS: { label: string; tools: Tool[] }[] = [
  {
    label: "Web Chat",
    tools: [
      { name: "navigate", kind: "builtin", desc: "Open any page in your app" },
      { name: "get_page_data", kind: "builtin", desc: "Read the current page" },
      { name: "do_page_action", kind: "builtin", desc: "Click / act on the page" },
    ],
  },
  {
    label: "Memory",
    tools: [
      { name: "get_document_shape", kind: "builtin", desc: "Inspect a memory doc" },
      { name: "read_path", kind: "builtin", desc: "Read a value by path" },
      { name: "query", kind: "builtin", desc: "Query nested memory" },
    ],
  },
  {
    label: "Utility",
    tools: [
      { name: "scrape_page", kind: "builtin", desc: "Fetch & read a web page" },
      { name: "view_docs", kind: "builtin", desc: "Read your product docs" },
    ],
  },
  {
    label: "Your tools",
    tools: [
      {
        name: "process_return",
        kind: "server",
        code: `def process_return(context, order: str, item: str):
    rma = returns.create(order=order, item=item)
    return {"rma": rma.id, "refund": rma.amount}`,
      },
      {
        name: "reset_password",
        kind: "server",
        code: `def reset_password(context, email: str):
    auth.send_reset_link(email)
    return {"sent": True}`,
      },
      {
        name: "get_order_status",
        kind: "server",
        code: `def get_order_status(context, order: str):
    o = db.orders.get(order)
    return {"status": o.status, "eta": o.eta}`,
      },
    ],
  },
];

const SCENARIOS: Record<string, { tools: ChatItem[]; answer: string }> = {
  "Return my lamp": {
    tools: [
      { kind: "tool", name: "process_return", meta: "server", input: `{ "order": "#1024", "item": "Aurora Lamp" }`, output: `{ "rma": "RMA-88", "refund": "$149" }` },
    ],
    answer: "Done — return RMA-88 created. Your $149 refund lands in 3–5 days.",
  },
  "Reset my password": {
    tools: [{ kind: "tool", name: "reset_password", meta: "server", input: `{ "email": "alex@acme.com" }`, output: `{ "sent": true }` }],
    answer: "I've emailed you a reset link — valid for 30 minutes.",
  },
  "Where's order #1024?": {
    tools: [{ kind: "tool", name: "get_order_status", meta: "server", input: `{ "order": "#1024" }`, output: `{ "status": "out_for_delivery" }` }],
    answer: "It's out for delivery — should arrive today by 5pm.",
  },
};

export function ToolsDemo() {
  const [selected, setSelected] = useState<Tool>(GROUPS[3].tools[0]);
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
    <div
      ref={stageRef}
      className="demo-desktop ring-border/40 relative h-full w-full overflow-hidden rounded-2xl ring-1"
    >
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("a")}
        url="support.acme.store"
        className={cn(
          "absolute left-[3%] top-[4%] h-[78%] w-[80%]",
          front === "a" ? "z-30" : "z-10"
        )}
      >
        <div className="flex min-h-0 flex-1">
          {/* Tools sidebar */}
          <div className="border-border/50 w-[40%] max-w-[13rem] shrink-0 space-y-3 overflow-y-auto border-r p-3">
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="text-muted-foreground mb-1 text-[0.58rem] font-medium uppercase tracking-wider">
                  {g.label}
                </div>
                <div className="space-y-0.5">
                  {g.tools.map((t) => (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => setSelected(t)}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left font-mono text-[0.68rem] transition-colors",
                        selected.name === t.name
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          t.kind === "builtin" ? "bg-muted-foreground/50" : "bg-primary"
                        )}
                      />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Chat */}
          <div className="min-w-0 flex-1">
            <Chat
              items={turns}
              thinking={thinking}
              prompts={Object.keys(SCENARIOS)}
              onPrompt={run}
              disabled={thinking}
            />
          </div>
        </div>
      </WindowFrame>

      {/* Code window for the selected tool */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("b")}
        title={
          selected.kind === "builtin"
            ? `${selected.name} · built-in`
            : `${selected.name}.py`
        }
        className={cn(
          "absolute bottom-[4%] right-[3%] h-[54%] w-[50%]",
          front === "b" ? "z-30" : "z-10"
        )}
      >
          {selected.code ? (
            <CodeBlock code={selected.code} className="h-full rounded-none border-0" />
          ) : (
            <div className="flex h-full flex-col justify-center gap-2 p-4 text-center">
              <div className="text-foreground font-mono text-sm">
                {selected.name}()
              </div>
              <div className="text-muted-foreground text-xs">{selected.desc}</div>
              <div className="text-muted-foreground/70 mt-1 text-[0.65rem]">
                Built-in — provided by @ajentify/chat. Attach by name, no code.
              </div>
            </div>
          )}
      </WindowFrame>
    </div>
  );
}
