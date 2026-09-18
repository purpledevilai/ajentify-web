"use client";

import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiBilling } from "@/types/api";

/**
 * Top-of-page status messaging for non-healthy states (doc 13 §3.3/§3.4).
 * Renders nothing for `none`/`active`.
 */
export function StatusBanner({ status }: { status: ApiBilling["subscription_status"] }) {
  if (status === "none" || status === "active") return null;

  const config =
    status === "past_due"
      ? {
          tone: "destructive" as const,
          icon: AlertTriangle,
          text: "Your balance is negative and requests are paused. Add credits or update your payment method to resume.",
        }
      : status === "incomplete"
        ? {
            tone: "destructive" as const,
            icon: AlertTriangle,
            text: "Finish setting up your plan to activate metered access.",
          }
        : {
            tone: "muted" as const,
            icon: Info,
            text: "Your plan has ended. Resubscribe to resume metered access — any remaining credit stays usable.",
          };

  const Icon = config.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border p-4 text-sm",
        config.tone === "destructive"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "bg-muted/40 text-muted-foreground"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{config.text}</p>
    </div>
  );
}
