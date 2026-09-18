import { api } from "./client";
import type { ApiOrganization, ApiTransaction } from "@/types/api";

/**
 * Billing API wrappers — the F↔P seam (contract doc 14 §4, endpoints #2–#8).
 * Codes strictly to the frozen request/response shapes. Endpoints #3/#4/#5
 * return a Stripe-hosted `{ url }` that the caller redirects to via
 * {@link redirectToStripe}.
 */

// #2 GET /organization/{org_id}/transactions
export interface ListTransactionsParams {
  limit?: number;
  cursor?: string;
}

export interface ListTransactionsResponse {
  transactions: ApiTransaction[];
  next_cursor?: string | null;
}

// #3/#4/#5 → { url }
export interface UrlResponse {
  url: string;
}

// #6 POST /billing/subscription/cancel
export interface CancelSubscriptionResponse {
  subscription_status: string;
  cancel_at: number | null;
}

// #7 PUT /organization/{org_id}/auto-topup
export interface SetAutoTopupParams {
  enabled?: boolean;
  threshold?: number | null;
  amount?: number | null;
}

// #8 GET /billing/plans
export interface BillingPlans {
  standard: { fee: number; allowance: number; interval: string };
  topup_tiers: number[];
}

export const billingApi = {
  // #2 — paginated ledger read.
  listTransactions: (org_id: string, params?: ListTransactionsParams) =>
    api.get<ListTransactionsResponse>(`/organization/${org_id}/transactions`, {
      query: { limit: params?.limit, cursor: params?.cursor },
    }),

  // #3 — start / resubscribe plan (Stripe Checkout, mode=subscription).
  startSubscription: (org_id: string) =>
    api.post<UrlResponse>("/billing/subscription-session", { org_id }),

  // #4 — fixed-tier top-up (Stripe Checkout, mode=payment). `tier` is the
  // dollar amount chosen from BillingPlans.topup_tiers; P maps tier→price_id.
  startTopup: (org_id: string, tier: number) =>
    api.post<UrlResponse>("/billing/checkout-session", { org_id, tier }),

  // #5 — Stripe Customer Portal (manage card / invoices).
  openPortal: (org_id: string) =>
    api.post<UrlResponse>("/billing/portal-session", { org_id }),

  // #6 — cancel at period end; returns the pending state immediately.
  cancelSubscription: (org_id: string) =>
    api.post<CancelSubscriptionResponse>("/billing/subscription/cancel", {
      org_id,
    }),

  // #7 — auto top-up prefs (active only; else 403 subscription_required).
  setAutoTopup: (org_id: string, body: SetAutoTopupParams) =>
    api.put<ApiOrganization>(`/organization/${org_id}/auto-topup`, body),

  // #8 — plan + tier catalog (money is backend-owned).
  getPlans: () => api.get<BillingPlans>("/billing/plans"),
};

/** Follow a Stripe-hosted `{ url }` (endpoints #3/#4/#5). */
export function redirectToStripe(url: string) {
  if (typeof window !== "undefined") window.location.href = url;
}
