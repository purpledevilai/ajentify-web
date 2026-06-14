"use client";

import { useRef, useState } from "react";
import { Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Terminal, type TermLine } from "../_components/Terminal";

export function DeployDemo() {
  const [stage, setStage] = useState("dev");
  const [lines, setLines] = useState<TermLine[]>([
    { text: "# one command ships your whole agent →", tone: "muted" },
  ]);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);

  function deploy() {
    if (busy) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setBusy(true);
    const seq: TermLine[] = [
      { text: `npx ajentify deploy --stage ${stage}`, tone: "cmd" },
      { text: "reconciling ajentify.json …", tone: "muted" },
      { text: "+ agent   storefront_assistant", tone: "add" },
      { text: "+ tools   2 created", tone: "add" },
      { text: "~ prompt  updated", tone: "add" },
      { text: `✓ deployed to ${stage} in 2.1s`, tone: "ok" },
    ];
    setLines([]);
    seq.forEach((l, i) => {
      const id = window.setTimeout(
        () => {
          setLines((prev) => [...prev, l]);
          if (i === seq.length - 1) setBusy(false);
        },
        260 * (i + 1)
      );
      timers.current.push(id);
    });
  }

  return (
    <WindowFrame title="deploy">
      <div className="border-border/50 flex items-center gap-2 border-b p-2.5">
        <span className="text-muted-foreground text-[0.62rem] font-medium uppercase tracking-wider">
          stage
        </span>
        {["dev", "prod"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(s)}
            className={cn(
              "rounded-md px-2 py-1 text-[0.7rem] font-medium transition-colors",
              stage === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {s}
          </button>
        ))}
        <button
          type="button"
          onClick={deploy}
          disabled={busy}
          className="bg-gradient-brand ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          <Rocket className="size-3.5" />
          {busy ? "Deploying…" : "Deploy"}
        </button>
      </div>
      <Terminal lines={lines} className="flex-1" />
    </WindowFrame>
  );
}
