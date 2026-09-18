"use client";

import { toast } from "sonner";
import { configureBillingHandlers } from "./client";

/**
 * Wire the api client's global billing gates (402 insufficient_balance / 403
 * subscription_required) to debounced sonner toasts that route the user to
 * /app/billing. Mounted at app boot alongside `wireApiClientToAuthStore`.
 *
 * Debounced by a fixed toast `id` (sonner de-dupes / refreshes rather than
 * stacking) plus a short time guard, so a burst of gated requests surfaces
 * one prompt, not a wall of toasts.
 */
const DEBOUNCE_MS = 5000;
let lastPaymentToastAt = 0;
let lastSubscriptionToastAt = 0;

function goToBilling() {
  if (typeof window !== "undefined") window.location.assign("/app/billing");
}

export function wireBillingHandlers() {
  configureBillingHandlers({
    onPaymentRequired: () => {
      const now = Date.now();
      if (now - lastPaymentToastAt < DEBOUNCE_MS) return;
      lastPaymentToastAt = now;
      toast.error("You're out of credits", {
        id: "insufficient-balance",
        description: "Add funds to continue.",
        action: { label: "Add funds", onClick: goToBilling },
      });
    },
    onSubscriptionRequired: () => {
      const now = Date.now();
      if (now - lastSubscriptionToastAt < DEBOUNCE_MS) return;
      lastSubscriptionToastAt = now;
      toast.error("A plan is required", {
        id: "subscription-required",
        description: "Start a plan to use this feature.",
        action: { label: "View plans", onClick: goToBilling },
      });
    },
  });
}
