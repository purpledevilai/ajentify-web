"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useAuthStore,
  wireApiClientToAuthStore,
} from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { prefetchAllStores } from "@/lib/stores/prefetch";
import { wireBillingHandlers } from "@/lib/api/billing-handlers";

// Module-load side effect: wire the api client to the auth store, and wire
// the global billing gates (402/403) to their toasts, the moment any
// authenticated layout is imported. Both are idempotent.
wireApiClientToAuthStore();
wireBillingHandlers();

/** `pathname` + the current query (`search` with or without the leading `?`). */
export function buildNextTarget(pathname: string, search: string): string {
  if (!search) return pathname;
  return `${pathname}${search.startsWith("?") ? search : `?${search}`}`;
}

/**
 * Mount in any authenticated layout (dashboard, setup). On cold mount,
 * calls /refresh via the HttpOnly cookie to mint an access token, then
 * syncs the user's orgs into orgStore and kicks off a parallel prefetch
 * of every primitive list store for the active org.
 *
 * The prefetch effect is keyed on `(user.id, activeOrgId)` so it fires
 * once per session AND again on every org-switch (orgStore resets every
 * other store on switch, so the post-switch ensureLoaded() actually
 * refetches).
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  useEffect(() => {
    if (!bootstrapped && !bootstrapping) {
      bootstrap().then((ok) => {
        if (!ok) {
          // Carry the query along (deep links like `?add_message=…`). Read
          // from `window.location` rather than `useSearchParams()`: this
          // hook lives in the route-group layouts, and a `useSearchParams`
          // call there would force a Suspense boundary on every page.
          // The redirect only ever runs client-side, inside this callback.
          router.replace(
            `/login?next=${encodeURIComponent(buildNextTarget(pathname, window.location.search))}`
          );
        } else {
          syncOrgs();
        }
      });
    } else if (bootstrapped && user) {
      // user already in store (e.g. from login flow) — ensure orgs synced.
      syncOrgs();
    }
  }, [bootstrapped, bootstrapping, user, bootstrap, router, pathname, syncOrgs]);

  // Prefetch every primitive list store as soon as we know which org we're
  // operating under. ensureLoaded() coalesces, so calling it eagerly here
  // and lazily from components remains safe and idempotent.
  useEffect(() => {
    if (!user || !activeOrgId) return;
    void prefetchAllStores();
  }, [user, activeOrgId]);

  return { bootstrapped, bootstrapping, user };
}
