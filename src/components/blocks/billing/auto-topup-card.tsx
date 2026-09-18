"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/utils";
import type { SetAutoTopupParams } from "@/lib/api/billing";
import type { ApiBilling } from "@/types/api";

type AutoTopup = NonNullable<ApiBilling["auto_topup"]>;

/**
 * Auto top-up config (doc 13 §3.2 / §10). Off-session consent is a required
 * checkbox that must be ticked before `enabled` can be turned on; the PUT is
 * only made after consent. Guard state (suspended / last_error) is surfaced
 * read-only.
 */
export function AutoTopupCard({
  autoTopup,
  onSave,
  saving,
}: {
  autoTopup: AutoTopup | null | undefined;
  onSave: (params: SetAutoTopupParams) => void | Promise<void>;
  saving: boolean;
}) {
  const [enabled, setEnabled] = useState(autoTopup?.enabled ?? false);
  const [threshold, setThreshold] = useState(
    autoTopup?.threshold != null ? String(autoTopup.threshold) : ""
  );
  const [amount, setAmount] = useState(
    autoTopup?.amount != null ? String(autoTopup.amount) : ""
  );
  // Already-enabled configs have consented previously; only re-consent when
  // turning it on from off.
  const [consent, setConsent] = useState(autoTopup?.enabled ?? false);

  const thresholdNum = Number(threshold);
  const amountNum = Number(amount);
  const validNumbers =
    Number.isFinite(thresholdNum) &&
    thresholdNum > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0;

  // Enabling requires valid amounts + consent; disabling can always save.
  const canSave = !saving && (!enabled || (validNumbers && consent));

  const handleSave = () => {
    if (enabled) {
      onSave({ enabled: true, threshold: thresholdNum, amount: amountNum });
    } else {
      onSave({ enabled: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auto top-up</CardTitle>
        <CardDescription>
          Automatically add credit when your balance runs low, so requests never
          pause.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(autoTopup?.suspended || autoTopup?.last_error) && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-medium">Auto top-up is paused.</p>
              {autoTopup?.last_error && (
                <p className="text-destructive/90">{autoTopup.last_error}</p>
              )}
              <p className="text-destructive/90">
                Update your payment method, then re-enable it below.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="auto-topup-enabled">Enable auto top-up</Label>
          <Switch
            id="auto-topup-enabled"
            checked={enabled}
            onCheckedChange={(next) => setEnabled(Boolean(next))}
          />
        </div>

        {enabled && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="auto-topup-threshold">
                  When balance falls below
                </Label>
                <Input
                  id="auto-topup-threshold"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  placeholder="5"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auto-topup-amount">Charge this amount</Label>
                <Input
                  id="auto-topup-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="1"
                  placeholder="20"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="border-input mt-0.5 size-4 rounded"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-muted-foreground">
                I authorize Ajentify to automatically charge my saved card{" "}
                {validNumbers ? formatCurrency(amountNum) : "the amount above"}{" "}
                whenever my balance falls below{" "}
                {validNumbers ? formatCurrency(thresholdNum) : "the threshold"},
                until I turn this off.
              </span>
            </label>
          </div>
        )}

        <div>
          <Button variant="gradient" onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
