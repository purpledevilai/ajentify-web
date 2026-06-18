"use client";

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft } from "lucide-react";
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
  command,
  onRun,
  running,
  className,
}: {
  lines: TermLine[];
  /** When set, an interactive pre-typed prompt is shown. Focus + Enter runs it. */
  command?: string;
  onRun?: () => void;
  running?: boolean;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const interactive = command !== undefined && !!onRun;

  // Keep the newest output / live prompt in view as history accumulates.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, running]);

  return (
    <div
      ref={ref}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      onFocus={interactive ? () => setFocused(true) : undefined}
      onBlur={interactive ? () => setFocused(false) : undefined}
      onClick={interactive ? () => ref.current?.focus() : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" && !running) {
                e.preventDefault();
                onRun?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex h-full flex-col bg-zinc-950/55 font-mono text-xs leading-relaxed outline-none backdrop-blur-xl",
        interactive && "cursor-text ring-inset transition-shadow",
        focused && "ring-2 ring-emerald-500/50",
        className
      )}
    >
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap p-4"
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

        {interactive && (
          <div className="mt-1 flex items-start text-zinc-100">
            <span className="shrink-0 text-emerald-400">$&nbsp;</span>
            <span className="break-all">{command}</span>
            {running ? (
              <span className="ml-2 shrink-0 text-zinc-500">running…</span>
            ) : (
              <span
                className={cn(
                  "ml-0.5 inline-block h-[1.05em] w-[0.55em] shrink-0 translate-y-[0.12em] bg-zinc-100",
                  focused ? "animate-pulse" : "opacity-40"
                )}
              />
            )}
          </div>
        )}
      </div>

      {interactive && (
        <div className="flex items-center justify-end gap-1.5 border-t border-zinc-800/80 bg-zinc-900/40 px-3 py-1.5 text-[0.68rem]">
          {running ? (
            <span className="text-zinc-500">running…</span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap transition-colors",
                focused ? "text-emerald-400/90" : "text-zinc-500"
              )}
            >
              {focused ? "Press" : "Click terminal, then"}
              <kbd className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                <CornerDownLeft className="size-3" />
                Enter
              </kbd>
              to run
            </span>
          )}
        </div>
      )}
    </div>
  );
}
