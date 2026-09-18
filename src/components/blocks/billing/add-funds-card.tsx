"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const MOST_POPULAR_TIER = 100;

/**
 * Fixed-tier top-up (doc 13 §3.2). Tiers come from `GET /billing/plans`
 * (`topup_tiers`, backend-owned). Selecting a tier mints a Stripe Checkout
 * session and redirects.
 */
export function AddFundsCard({
  tiers,
  onSelect,
  pendingTier,
}: {
  tiers: number[];
  onSelect: (tier: number) => void;
  pendingTier: number | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add funds</CardTitle>
        <CardDescription>
          Top up your balance. Credit never expires and is spent as you use the
          platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier) => {
            const pending = pendingTier === tier;
            const popular = tier === MOST_POPULAR_TIER;
            return (
              <Button
                key={tier}
                variant={popular ? "gradient" : "outline"}
                onClick={() => onSelect(tier)}
                disabled={pendingTier !== null}
                className="relative"
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                {formatCurrency(tier)}
                {popular && (
                  <Badge variant="secondary" className="ml-1">
                    Popular
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
