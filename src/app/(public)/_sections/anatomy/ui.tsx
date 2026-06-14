"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a value that can change as the visitor edits config. When `value`
 * changes, the children briefly highlight — this is how the showcase makes
 * config → behaviour visible ("change the number, watch the answer change").
 */
export function Flash({
  value,
  className,
  children,
}: {
  value: string | number;
  className?: string;
  children: React.ReactNode;
}) {
  const first = React.useRef(true);
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 900);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <span
      className={cn(
        "rounded-sm transition-colors duration-700",
        flash && "bg-primary/15 ring-1 ring-primary/25",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  children,
  tone = "muted",
  className,
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "accent";
  className?: string;
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground border-border",
    primary: "bg-primary/10 text-primary border-primary/20",
    accent: "bg-accent/10 text-accent border-accent/20",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[0.72rem]",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Toggle({
  checked,
  onChange,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-gradient-brand" : "bg-muted-foreground/30"
      )}
    >
      <span
        className={cn(
          "inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider">
      {children}
    </div>
  );
}
