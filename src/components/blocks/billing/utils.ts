import type { ApiBilling } from "@/types/api";

/**
 * Balance is never stored — it's derived from the two scalars the backend
 * serializes (contract doc 14 §1). Both are already USD dollars.
 */
export function computeBalance(
  billing: ApiBilling | null | undefined
): number {
  if (!billing) return 0;
  return billing.total_transactions - billing.total_usage;
}

/** Format a unix-seconds timestamp as a human date, or an em dash if absent. */
export function formatUnixDate(unix: number | null | undefined): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Allowance usage this cycle: how much of the monthly free grant has been
 * consumed. `used = total_usage − usage_at_grant` (clamped to the grant),
 * `granted = allowance.granted_this_cycle` (doc 13 §3.2).
 */
export function allowanceUsage(billing: ApiBilling | null | undefined): {
  used: number;
  granted: number;
} | null {
  const a = billing?.allowance;
  if (!a) return null;
  const granted = a.granted_this_cycle;
  const rawUsed = billing!.total_usage - a.usage_at_grant;
  const used = Math.min(Math.max(rawUsed, 0), granted);
  return { used, granted };
}
