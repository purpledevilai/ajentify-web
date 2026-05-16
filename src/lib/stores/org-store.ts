import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiOrganizationRef } from "@/types/api";
import { resetAllStores } from "./registry";
import { useAuthStore } from "./auth-store";

interface OrgState {
  organizations: ApiOrganizationRef[];
  activeOrgId: string | null;
  setOrganizations: (orgs: ApiOrganizationRef[]) => void;
  setActiveOrg: (org_id: string) => void;
  syncFromUser: () => void;
  reset: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      organizations: [],
      activeOrgId: null,

      setOrganizations(organizations) {
        const active = get().activeOrgId;
        const stillValid = active && organizations.some((o) => o.id === active);
        set({
          organizations,
          activeOrgId: stillValid ? active : (organizations[0]?.id ?? null),
        });
      },

      setActiveOrg(org_id) {
        if (org_id === get().activeOrgId) return;
        set({ activeOrgId: org_id });
        // Reset every primitive store so they refetch under the new org.
        // authStore and orgStore intentionally do NOT register themselves
        // with `resetAllStores` to avoid a reset loop here.
        resetAllStores();
      },

      syncFromUser() {
        const u = useAuthStore.getState().user;
        if (!u) {
          set({ organizations: [], activeOrgId: null });
          return;
        }
        get().setOrganizations(u.organizations);
      },

      reset() {
        set({ organizations: [], activeOrgId: null });
      },
    }),
    {
      name: "ajentify.org",
      // Only persist the active org choice; the org list comes from /user.
      partialize: (s) => ({ activeOrgId: s.activeOrgId }),
    }
  )
);

// orgStore intentionally does NOT register with `resetAllStores` (because
// setActiveOrg calls resetAllStores, which would loop). Instead, subscribe
// to authStore so logout clears the org state too.
let lastUserId: string | null = null;
useAuthStore.subscribe((state) => {
  const id = state.user?.id ?? null;
  if (lastUserId && !id) {
    useOrgStore.getState().reset();
  }
  lastUserId = id;
});

