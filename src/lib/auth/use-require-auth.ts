"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useAuthStore,
  wireApiClientToAuthStore,
} from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { prefetchAllStores } from "@/lib/stores/prefetch";

// Module-load side effect: wire the api client to the auth store
// the moment any authenticated layout is imported. Idempotent.
wireApiClientToAuthStore();

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
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
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
