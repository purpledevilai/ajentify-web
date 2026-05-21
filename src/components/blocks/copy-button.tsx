"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  label?: string;
  /** Stop click events from bubbling so the surrounding row/link doesn't fire. */
  stopRowPropagation?: boolean;
}

/**
 * Small icon-only button that copies `value` to the clipboard and briefly
 * swaps to a check icon to confirm. Designed to sit inline next to a value.
 */
export function CopyButton({
  value,
  className,
  label = "Copy",
  stopRowPropagation = true,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function onCopy(e: React.MouseEvent<HTMLButtonElement>) {
    if (stopRowPropagation) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can fail on insecure origins or with permissions denied.
      // Silent failure is acceptable — the user will simply not see the tick.
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      onKeyDown={
        stopRowPropagation ? (e) => e.stopPropagation() : undefined
      }
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {copied ? (
        <Check className="text-foreground size-3.5" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}
