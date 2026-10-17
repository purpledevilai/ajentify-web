"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useAuthStore,
  wireApiClientToAuthStore,
} from "@/lib/stores/auth-store";
import { wireBillingHandlers } from "@/lib/api/billing-handlers";
import { buildLoginRedirect } from "./authorize";

// Same module-load wiring the dashboard/setup layouts get via
// `useRequireAuth`: Bearer injection + refresh-on-401 for the api client.
wireApiClientToAuthStore();
wireBillingHandlers();

/**
 * Auth gate for `/oauth/authorize`, which lives outside the `(dashboard)` /
 * `(setup)` layouts and is not covered by `middleware.ts`.
 *
 * Differs from `useRequireAuth` in two ways: the login redirect carries the
 * **full** path + query (the whole OAuth request must survive the round
 * trip), and we skip the dashboard store prefetch — the consent page only
 * needs the user.
 */
export function useOAuthAuthGate(enabled = true) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    if (!enabled || bootstrapped || bootstrapping) return;
    const search = searchParams.toString();
    bootstrap().then((ok) => {
      if (!ok) router.replace(buildLoginRedirect(pathname, search));
    });
  }, [
    enabled,
    bootstrapped,
    bootstrapping,
    bootstrap,
    router,
    pathname,
    searchParams,
  ]);

  // Covers the case where bootstrap already ran (e.g. token expired and
  // `logout()` cleared the user) — never render the consent card signed out.
  useEffect(() => {
    if (enabled && bootstrapped && !bootstrapping && !user) {
      router.replace(buildLoginRedirect(pathname, searchParams.toString()));
    }
  }, [enabled, bootstrapped, bootstrapping, user, router, pathname, searchParams]);

  return { ready: bootstrapped && !bootstrapping && !!user, user };
}
