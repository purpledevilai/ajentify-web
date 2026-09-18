"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import { useOrgStore } from "@/lib/stores/org-store";
import { orgApi } from "@/lib/api/organization";
import {
  billingApi,
  redirectToStripe,
  type BillingPlans,
  type SetAutoTopupParams,
} from "@/lib/api/billing";
import { getErrorMessage } from "@/lib/api/errors";
import type {
  ApiBilling,
  ApiOrganization,
  ApiTransaction,
} from "@/types/api";
import { BalanceCard } from "@/components/blocks/billing/balance-card";
import { PlanCard } from "@/components/blocks/billing/plan-card";
import { PlanPicker } from "@/components/blocks/billing/plan-picker";
import { AddFundsCard } from "@/components/blocks/billing/add-funds-card";
import { AutoTopupCard } from "@/components/blocks/billing/auto-topup-card";
import { TransactionsTable } from "@/components/blocks/billing/transactions-table";
import { StatusBanner } from "@/components/blocks/billing/status-banner";
import { CheckoutReturnHandler } from "@/components/blocks/billing/checkout-return-handler";
import {
  allowanceUsage,
  computeBalance,
} from "@/components/blocks/billing/utils";

const TX_PAGE = 25;

export default function BillingPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const organizations = useOrgStore((s) => s.organizations);
  const orgName = useMemo(
    () => organizations.find((o) => o.id === orgId)?.name,
    [organizations, orgId]
  );

  const [org, setOrg] = useState<ApiOrganization | null>(null);
  const [plans, setPlans] = useState<BillingPlans | null>(null);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A single in-flight marker: "subscription" | "portal" | "cancel" |
  // "autotopup" | "topup:<tier>". Redirect actions leave it set (the browser
  // navigates away); non-redirect actions reset it in `finally`.
  const [pending, setPending] = useState<string | null>(null);
  const [cancelAt, setCancelAt] = useState<number | null>(null);

  const billing = org?.billing ?? null;

  // Latest-billing getter for the checkout return handler (its effect runs
  // once, so it must read through a ref to see fresh polled data).
  const billingRef = useRef<ApiBilling | null>(null);
  useEffect(() => {
    billingRef.current = billing;
  }, [billing]);

  // ------------------------------------------------------------------ fetch
  const fetchOrg = useCallback(async () => {
    if (!orgId) return;
    const data = await orgApi.get(orgId);
    setOrg(data);
  }, [orgId]);

  const fetchTransactions = useCallback(async () => {
    if (!orgId) return;
    setTxLoading(true);
    try {
      const res = await billingApi.listTransactions(orgId, { limit: TX_PAGE });
      setTransactions(res.transactions);
      setNextCursor(res.next_cursor ?? null);
    } catch {
      // Ledger is non-fatal for the page; balance/plan still render.
    } finally {
      setTxLoading(false);
    }
  }, [orgId]);

  const fetchPlans = useCallback(async () => {
    try {
      setPlans(await billingApi.getPlans());
    } catch {
      // Plans are non-fatal; PlanCard falls back to billing.subscription_rate.
    }
  }, []);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchOrg();
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Unable to load billing"));
      } finally {
        if (!cancelled) setLoading(false);
      }
      fetchTransactions();
      fetchPlans();
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, fetchOrg, fetchTransactions, fetchPlans]);

  const refetch = useCallback(async () => {
    try {
      await Promise.all([fetchOrg(), fetchTransactions()]);
    } catch {
      // best-effort reconciliation
    }
  }, [fetchOrg, fetchTransactions]);

  const onLoadMore = useCallback(async () => {
    if (!orgId || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await billingApi.listTransactions(orgId, {
        limit: TX_PAGE,
        cursor: nextCursor,
      });
      setTransactions((prev) => [...prev, ...res.transactions]);
      setNextCursor(res.next_cursor ?? null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to load more transactions"));
    } finally {
      setLoadingMore(false);
    }
  }, [orgId, nextCursor]);

  // ---------------------------------------------------------------- actions
  const handleStartPlan = useCallback(async () => {
    if (!orgId) return;
    setPending("subscription");
    try {
      const { url } = await billingApi.startSubscription(orgId);
      redirectToStripe(url);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to start plan"));
      setPending(null);
    }
  }, [orgId]);

  const handleTopup = useCallback(
    async (tier: number) => {
      if (!orgId) return;
      setPending(`topup:${tier}`);
      try {
        const { url } = await billingApi.startTopup(orgId, tier);
        redirectToStripe(url);
      } catch (err) {
        toast.error(getErrorMessage(err, "Unable to start top-up"));
        setPending(null);
      }
    },
    [orgId]
  );

  const handleOpenPortal = useCallback(async () => {
    if (!orgId) return;
    setPending("portal");
    try {
      const { url } = await billingApi.openPortal(orgId);
      redirectToStripe(url);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to open billing portal"));
      setPending(null);
    }
  }, [orgId]);

  const handleCancel = useCallback(async () => {
    if (!orgId) return;
    setPending("cancel");
    try {
      const res = await billingApi.cancelSubscription(orgId);
      setCancelAt(res.cancel_at);
      toast.success("Plan will cancel at the end of the billing period.");
      await refetch();
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to cancel plan"));
    } finally {
      setPending(null);
    }
  }, [orgId, refetch]);

  const handleSaveAutoTopup = useCallback(
    async (params: SetAutoTopupParams) => {
      if (!orgId) return;
      setPending("autotopup");
      try {
        const updated = await billingApi.setAutoTopup(orgId, params);
        setOrg(updated);
        toast.success("Auto top-up saved.");
      } catch (err) {
        toast.error(getErrorMessage(err, "Unable to save auto top-up"));
      } finally {
        setPending(null);
      }
    },
    [orgId]
  );

  // ------------------------------------------------------ assistant hooks
  const AddFundsArgs = useMemo(
    () =>
      z.object({
        tier: z
          .number()
          .describe(
            "Top-up amount in USD dollars; must be one of the available tiers."
          ),
      }),
    []
  );
  const SetAutoTopupArgs = useMemo(
    () =>
      z.object({
        enabled: z.boolean().describe("Turn auto top-up on or off."),
        threshold: z
          .number()
          .optional()
          .describe("Balance (USD) below which to auto-charge."),
        amount: z
          .number()
          .optional()
          .describe("Amount (USD) to charge each time."),
      }),
    []
  );

  useGetPageData(
    () => {
      const allowance = allowanceUsage(billing);
      return {
        data: {
          page: "billing",
          loading,
          error,
          subscription_status: billing?.subscription_status ?? null,
          balance: billing ? computeBalance(billing) : null,
          currency: "USD",
          allowance: allowance
            ? {
                granted: allowance.granted,
                used: allowance.used,
                reset_at: billing?.allowance?.cycle_end ?? null,
              }
            : null,
          auto_topup: billing?.auto_topup
            ? {
                enabled: billing.auto_topup.enabled,
                threshold: billing.auto_topup.threshold,
                amount: billing.auto_topup.amount,
                suspended: billing.auto_topup.suspended,
              }
            : null,
          plan: plans
            ? {
                fee: plans.standard.fee,
                allowance: plans.standard.allowance,
                interval: plans.standard.interval,
              }
            : null,
          topup_tiers: plans?.topup_tiers ?? [],
          recent_transactions: transactions.slice(0, 10).map((t) => ({
            transaction_id: t.transaction_id,
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            description: t.description ?? null,
            created_at: t.created_at,
          })),
          note: "Money is USD dollars. Never expose stripe ids or secrets.",
        },
        actions: {
          start_plan: {
            description:
              "Start (or resubscribe to) the Standard plan. Redirects to Stripe Checkout.",
            argsSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          add_funds: {
            description:
              "Buy a fixed-tier top-up. Redirects to Stripe Checkout.",
            argsSchema: z.toJSONSchema(AddFundsArgs),
          },
          open_billing_portal: {
            description:
              "Open the Stripe customer portal to manage card and invoices.",
            argsSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          cancel_plan: {
            description:
              "Cancel the plan at the end of the current billing period.",
            argsSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          set_auto_topup: {
            description:
              "Configure auto top-up (enable/disable, threshold, amount).",
            argsSchema: z.toJSONSchema(SetAutoTopupArgs),
          },
        },
      };
    },
    [billing, plans, transactions, loading, error, AddFundsArgs, SetAutoTopupArgs]
  );

  useDoPageAction(
    async (key, args) => {
      switch (key) {
        case "start_plan":
          await handleStartPlan();
          return { ok: true };
        case "add_funds": {
          const { tier } = AddFundsArgs.parse(args);
          await handleTopup(tier);
          return { ok: true, tier };
        }
        case "open_billing_portal":
          await handleOpenPortal();
          return { ok: true };
        case "cancel_plan":
          await handleCancel();
          return { ok: true };
        case "set_auto_topup": {
          const parsed = SetAutoTopupArgs.parse(args);
          await handleSaveAutoTopup(parsed);
          return { ok: true };
        }
        default:
          return { ok: false, error: `unknown action: ${key}` };
      }
    },
    [
      handleStartPlan,
      handleTopup,
      handleOpenPortal,
      handleCancel,
      handleSaveAutoTopup,
      AddFundsArgs,
      SetAutoTopupArgs,
    ]
  );

  // --------------------------------------------------------------- render
  const status = billing?.subscription_status;
  const subscribed =
    status === "active" || status === "past_due" || status === "incomplete";
  // Pending-cancel timestamp: prefer the optimistic value from the just-completed
  // cancel action, else the persisted marker on billing (so "Plan ends on <date>"
  // and the hidden Cancel button survive a refresh).
  const effectiveCancelAt = cancelAt ?? billing?.subscription_cancel_at ?? null;
  const topupPendingTier = pending?.startsWith("topup:")
    ? Number(pending.slice("topup:".length))
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Billing"
        subtitle="Manage your plan, balance, and payment methods."
      />

      <CheckoutReturnHandler
        getBilling={() => billingRef.current}
        refetch={refetch}
      />

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="border-destructive/40 bg-destructive/10 rounded-md border p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && !billing && (
        <div className="bg-muted/40 rounded-md border p-4">
          <p className="text-muted-foreground text-sm">
            Billing isn&apos;t set up for this organization yet. Check back
            shortly.
          </p>
        </div>
      )}

      {!loading && !error && billing && (
        <>
          <StatusBanner status={billing.subscription_status} />

          {billing.subscription_status === "none" ? (
            <div className="space-y-4">
              <BalanceCard billing={billing} />
              <PlanPicker
                plans={plans}
                orgName={orgName}
                orgId={orgId ?? undefined}
                onStartPlan={handleStartPlan}
                starting={pending === "subscription"}
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <BalanceCard billing={billing} />
              <PlanCard
                billing={billing}
                plans={plans}
                cancelAt={effectiveCancelAt}
                onStartPlan={handleStartPlan}
                onCancel={handleCancel}
                onOpenPortal={handleOpenPortal}
                starting={pending === "subscription"}
                canceling={pending === "cancel"}
                openingPortal={pending === "portal"}
              />
            </div>
          )}

          {subscribed && (
            <AddFundsCard
              tiers={plans?.topup_tiers ?? []}
              onSelect={handleTopup}
              pendingTier={topupPendingTier}
            />
          )}

          {subscribed && (
            <AutoTopupCard
              autoTopup={billing.auto_topup}
              onSave={handleSaveAutoTopup}
              saving={pending === "autotopup"}
            />
          )}

          <TransactionsTable
            transactions={transactions}
            loading={txLoading}
            hasMore={!!nextCursor}
            onLoadMore={onLoadMore}
            loadingMore={loadingMore}
          />
        </>
      )}
    </div>
  );
}
