"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { ApiBilling } from "@/types/api";
import { allowanceUsage, computeBalance } from "./utils";

/**
 * Balance zone. Label + emphasis vary by subscription state:
 *  - none      → "Free trial credit"
 *  - active    → "Available credit" + allowance sub-line
 *  - past_due  → negative balance in the destructive color
 *  - canceled  → leftover top-up credit
 */
export function BalanceCard({ billing }: { billing: ApiBilling }) {
  const balance = computeBalance(billing);
  const status = billing.subscription_status;
  const negative = balance < 0;

  const label =
    status === "none"
      ? "Free trial credit"
      : status === "canceled"
        ? "Remaining credit"
        : "Available credit";

  const allowance =
    status === "active" || status === "past_due" || status === "incomplete"
      ? allowanceUsage(billing)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p
          className={cn(
            "text-3xl font-bold tabular-nums",
            negative && "text-destructive"
          )}
        >
          {formatCurrency(balance)}
        </p>
        {allowance && (
          <p className="text-muted-foreground text-sm">
            {formatCurrency(allowance.used)} of{" "}
            {formatCurrency(allowance.granted)} monthly free usage used
          </p>
        )}
      </CardContent>
    </Card>
  );
}
