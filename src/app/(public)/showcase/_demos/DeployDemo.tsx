"use client";

import { useRef, useState } from "react";
import { ChevronDown, FileJson, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "@/components/marketing/code-block";
import { WindowFrame } from "../_components/WindowFrame";
import { Terminal, type TermLine } from "../_components/Terminal";
import { DemoStage } from "../_components/DemoStage";

const MANIFEST = `{
  "agents": {
    "storefront_assistant": {
      "name": "Storefront Assistant",
      "prompt": "./prompts/storefront.md",
      "model_id": "gpt-5.2",
      "tools": ["navigate", "get_orders", "process_return"]
    }
  },
  "tools": {
    "get_orders": { "pass_context": true },
    "process_return": { "pass_context": true }
  }
}`;

export function DeployDemo() {
  const [stage, setStage] = useState("dev");
  const [lines, setLines] = useState<TermLine[]>([
    { text: "# commit ajentify.json, then ship →", tone: "muted" },
  ]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const [front, setFront] = useState<"a" | "b">("b");
  const stageRef = useRef<HTMLDivElement>(null);

  const command = `npx ajentify deploy --stage ${stage}`;

  function deploy() {
    if (busy) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBusy(true);
    const seq: TermLine[] = [
      { text: command, tone: "cmd" },
      { text: "reading ajentify.json …", tone: "muted" },
      { text: "+ agent   storefront_assistant", tone: "add" },
      { text: "+ tools   2 created", tone: "add" },
      { text: "~ prompt  updated", tone: "add" },
      { text: `✓ deployed to ${stage} in 2.1s`, tone: "ok" },
    ];
    seq.forEach((l, i) => {
      const id = window.setTimeout(
        () => {
          setLines((prev) => [...prev, l].slice(-30));
          if (i === seq.length - 1) setBusy(false);
        },
        260 * (i + 1)
      );
      timers.current.push(id);
    });
  }

  return (
    <DemoStage image="/showcase/deploy.jpg" stageRef={stageRef}>
      {/* Repo / editor window */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("a")}
        title="your-app — ajentify.json"
        z={front === "a" ? 30 : 20}
        className="absolute left-[3%] top-[4%] h-[78%] w-[80%]"
      >
        <div className="flex min-h-0 flex-1">
          <div className="border-border/50 text-foreground/80 w-[34%] max-w-[11rem] shrink-0 space-y-0.5 overflow-y-auto border-r p-2 text-[0.72rem]">
            <Tree icon={<ChevronDown className="size-3" />} label="your-app" bold />
            <Tree icon={<Folder className="size-3" />} label="src" indent />
            <Tree icon={<Folder className="size-3" />} label="prompts" indent />
            <Tree label="storefront.md" indent={2} muted />
            <Tree
              icon={<FileJson className="text-primary size-3" />}
              label="ajentify.json"
              indent
              active
            />
            <Tree label="package.json" indent muted />
          </div>
          <div className="min-w-0 flex-1">
            <CodeBlock
              code={MANIFEST}
              filename="ajentify.json"
              transparent
              className="h-full rounded-none border-0"
            />
          </div>
        </div>
      </WindowFrame>

      {/* CLI window */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("b")}
        title="Ajentify CLI"
        z={front === "b" ? 30 : 20}
        className="absolute bottom-[4%] right-[3%] h-[56%] w-[54%]"
      >
          <div className="border-border/50 flex items-center gap-2 border-b bg-card p-2">
            <span className="text-muted-foreground text-[0.58rem] font-medium uppercase tracking-wider">
              stage
            </span>
            {["dev", "prod"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                disabled={busy}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[0.68rem] font-medium transition-colors disabled:opacity-50",
                  stage === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Terminal
            lines={lines}
            command={command}
            onRun={deploy}
            running={busy}
            className="flex-1"
          />
      </WindowFrame>
    </DemoStage>
  );
}

function Tree({
  icon,
  label,
  indent = 0,
  bold,
  muted,
  active,
}: {
  icon?: React.ReactNode;
  label: string;
  indent?: number | boolean;
  bold?: boolean;
  muted?: boolean;
  active?: boolean;
}) {
  const pad = typeof indent === "number" ? indent : indent ? 1 : 0;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-1 py-0.5 font-mono",
        active && "bg-primary/10 text-primary",
        bold && "font-semibold",
        muted && "text-muted-foreground"
      )}
      style={{ paddingLeft: `${pad * 0.85 + 0.25}rem` }}
    >
      {icon ?? <span className="size-3" />}
      {label}
    </div>
  );
}
