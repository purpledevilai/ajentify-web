"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { BillingPlans } from "@/lib/api/billing";

const ENTERPRISE_EMAIL = "keanu@ajentify.com";

function enterpriseMailto(orgName?: string, orgId?: string): string {
  const subject = "Ajentify Enterprise plan inquiry";
  const body = [
    "Hi Ajentify team,",
    "",
    "I'd like to learn more about Enterprise pricing and custom limits" +
      (orgName ? ` for my organization "${orgName}"` : "") +
      (orgId ? ` (org id: ${orgId})` : "") +
      ".",
    "",
    "Thanks,",
  ].join("\n");
  return `mailto:${ENTERPRISE_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * Trial (subscription_status "none") plan chooser — the only billing action a
 * trial org can take (doc 13 §3.1). Standard → Stripe Checkout; Enterprise →
 * mailto. Money comes from `GET /billing/plans` (backend-owned), never
 * hardcoded here.
 */
export function PlanPicker({
  plans,
  orgName,
  orgId,
  onStartPlan,
  starting,
}: {
  plans: BillingPlans | null;
  orgName?: string;
  orgId?: string;
  onStartPlan: () => void;
  starting: boolean;
}) {
  const fee = plans?.standard.fee;
  const allowance = plans?.standard.allowance;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Standard */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Standard plan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {fee != null ? `${formatCurrency(fee)} / month` : "—"}
            </p>
            {allowance != null && (
              <p className="text-muted-foreground text-sm">
                Includes {formatCurrency(allowance)} free usage every month.
              </p>
            )}
          </div>
          <Button
            variant="gradient"
            onClick={onStartPlan}
            disabled={starting || !plans}
          >
            {starting && <Loader2 className="size-4 animate-spin" />}
            {starting ? "Redirecting…" : "Start plan"}
          </Button>
        </CardContent>
      </Card>

      {/* Enterprise */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Custom limits &amp; pricing for higher-volume teams.
          </p>
          <Button variant="outline" asChild>
            <a href={enterpriseMailto(orgName, orgId)}>Contact us</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
