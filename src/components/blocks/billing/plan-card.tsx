"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import type { BillingPlans } from "@/lib/api/billing";
import type { ApiBilling } from "@/types/api";
import { formatUnixDate } from "./utils";

/**
 * Plan zone for a subscribed / previously-subscribed org (contract states
 * active | past_due | incomplete | canceled). The trial ("none") state is
 * rendered by {@link PlanPicker} instead. The subscription is branded "plan"
 * throughout (doc 13 §2).
 */
export function PlanCard({
  billing,
  plans,
  cancelAt,
  onStartPlan,
  onCancel,
  onOpenPortal,
  starting,
  canceling,
  openingPortal,
}: {
  billing: ApiBilling;
  plans: BillingPlans | null;
  cancelAt: number | null;
  onStartPlan: () => void;
  onCancel: () => void | Promise<void>;
  onOpenPortal: () => void;
  starting: boolean;
  canceling: boolean;
  openingPortal: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const status = billing.subscription_status;
  const rate = billing.subscription_rate ?? plans?.standard.fee ?? null;
  const interval = billing.subscription_interval;
  const cycleEnd = billing.allowance?.cycle_end ?? null;

  const statusBadge =
    status === "past_due" ? (
      <Badge variant="destructive">Past due</Badge>
    ) : status === "incomplete" ? (
      <Badge variant="secondary">Incomplete</Badge>
    ) : status === "canceled" ? (
      <Badge variant="outline">Canceled</Badge>
    ) : (
      <Badge variant="secondary">Active</Badge>
    );

  const portalButton = (
    <Button variant="outline" onClick={onOpenPortal} disabled={openingPortal}>
      {openingPortal && <Loader2 className="size-4 animate-spin" />}
      {openingPortal ? "Redirecting…" : "Manage payment & invoices"}
    </Button>
  );

  const resubscribeButton = (
    <Button variant="gradient" onClick={onStartPlan} disabled={starting || !plans}>
      {starting && <Loader2 className="size-4 animate-spin" />}
      {starting ? "Redirecting…" : "Start plan"}
    </Button>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>
          {status === "canceled" ? "No active plan" : "Standard plan"}
        </CardTitle>
        {statusBadge}
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "canceled" ? (
          <>
            <p className="text-muted-foreground text-sm">
              Your plan has ended. Resubscribe to resume metered access. Any
              remaining credit stays usable.
            </p>
            <div className="flex flex-wrap gap-2">{resubscribeButton}</div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              {rate != null && (
                <p className="text-lg font-semibold">
                  {formatCurrency(rate)}/{interval === "monthly" ? "mo" : interval}
                </p>
              )}
              {status === "incomplete" ? (
                <p className="text-muted-foreground text-sm">
                  Finish setting up your plan to activate metered access.
                </p>
              ) : cancelAt ? (
                <p className="text-muted-foreground text-sm">
                  Plan ends on {formatUnixDate(cancelAt)}.
                </p>
              ) : cycleEnd ? (
                <p className="text-muted-foreground text-sm">
                  Free usage resets on {formatUnixDate(cycleEnd)}.
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {portalButton}
              {status === "active" && !cancelAt && (
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen(true)}
                  disabled={canceling}
                >
                  Cancel plan
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Cancel your plan?"
        description={
          cycleEnd
            ? `Your plan stays active until ${formatUnixDate(
                cycleEnd
              )}, then ends. You can resubscribe any time.`
            : "Your plan will be canceled at the end of the current billing period. You can resubscribe any time."
        }
        confirmLabel="Cancel plan"
        cancelLabel="Keep plan"
        confirmVariant="destructive"
        loading={canceling}
        loadingLabel="Canceling…"
        onConfirm={async () => {
          await onCancel();
          setConfirmOpen(false);
        }}
      />
    </Card>
  );
}
