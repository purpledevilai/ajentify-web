"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ApiBilling } from "@/types/api";
import { computeBalance } from "./utils";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 6; // ~15s total

/**
 * Reconciles a return from Stripe hosted Checkout (doc 13 §7). Reads the
 * `?checkout=&flow=` query on mount:
 *  - `cancel`  → toast, strip query.
 *  - `success` → optimistic toast, then poll #1 (org) + #2 (transactions) via
 *    `refetch` for ~10–15s until the async webhook write is reflected, then
 *    strip query (so a refresh doesn't re-trigger).
 *
 * `getBilling` must read the LATEST billing (pass a ref-backed getter) so the
 * once-only effect sees fresh data across polls.
 */
export function CheckoutReturnHandler({
  getBilling,
  refetch,
}: {
  getBilling: () => ApiBilling | null;
  refetch: () => Promise<void> | void;
}) {
  const [processing, setProcessing] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout !== "success" && checkout !== "cancel") return;
    startedRef.current = true;
    const flow = params.get("flow"); // "subscription" | "topup"

    const stripQuery = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("flow");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
    };

    if (checkout === "cancel") {
      toast.message("Checkout canceled.");
      stripQuery();
      return;
    }

    // success — the balance/subscription change is applied by the async
    // webhook, which may land a few seconds after redirect.
    const baselineBalance = computeBalance(getBilling());
    const baselineStatus = getBilling()?.subscription_status;

    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;

    const reflected = () => {
      const b = getBilling();
      if (!b) return false;
      if (flow === "subscription") {
        return (
          b.subscription_status === "active" &&
          b.subscription_status !== baselineStatus
        );
      }
      // topup (or unknown flow): balance increased.
      return computeBalance(b) > baselineBalance + 1e-9;
    };

    const finish = (msg?: string) => {
      setProcessing(false);
      if (msg) toast.message(msg);
      stripQuery();
    };

    const tick = async () => {
      if (cancelled) return;
      polls += 1;
      await refetch();
      if (cancelled) return;
      if (reflected()) return finish();
      if (polls >= MAX_POLLS)
        return finish("This can take a moment; refresh shortly.");
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    // Defer into a microtask so no setState runs synchronously in the effect
    // body (avoids cascading-render lint + any hydration mismatch).
    queueMicrotask(() => {
      if (cancelled) return;
      toast.success("Payment received — updating your balance…");
      setProcessing(true);
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!processing) return null;
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-md border p-3 text-sm">
      <Loader2 className="size-4 animate-spin" />
      <span>Updating your balance… this can take a few seconds.</span>
    </div>
  );
}
