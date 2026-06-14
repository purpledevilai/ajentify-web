"use client";

import { cn } from "@/lib/utils";

export type TermLine = {
  text: string;
  tone?: "cmd" | "add" | "muted" | "ok" | "plain";
};

const TONES: Record<NonNullable<TermLine["tone"]>, string> = {
  cmd: "text-zinc-100",
  add: "text-emerald-400",
  muted: "text-zinc-500",
  ok: "text-sky-400",
  plain: "text-zinc-300",
};

export function Terminal({
  lines,
  className,
}: {
  lines: TermLine[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full overflow-y-auto whitespace-pre-wrap bg-zinc-950 p-4 font-mono text-xs leading-relaxed",
        className
      )}
    >
      {lines.map((l, i) => (
        <div key={i} className={TONES[l.tone ?? "plain"]}>
          {l.tone === "cmd" ? (
            <>
              <span className="text-emerald-400">$ </span>
              {l.text}
            </>
          ) : (
            l.text
          )}
        </div>
      ))}
    </div>
  );
}
