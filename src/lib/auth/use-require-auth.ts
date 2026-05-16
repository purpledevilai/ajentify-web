"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useAuthStore,
  wireApiClientToAuthStore,
} from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";

// Module-load side effect: wire the api client to the auth store
// the moment any authenticated layout is imported. Idempotent.
wireApiClientToAuthStore();

/**
 * Mount in any authenticated layout (dashboard, setup). On cold mount,
 * calls /refresh via the HttpOnly cookie to mint an access token, then
 * syncs the user's orgs into orgStore.
 */
export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const bootstrapping = useAuthStore((s) => s.bootstrapping);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const user = useAuthStore((s) => s.user);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);

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

  return { bootstrapped, bootstrapping, user };
}
