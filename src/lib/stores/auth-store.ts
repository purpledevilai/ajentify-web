import { create } from "zustand";
import type { ApiUser, AuthResponse } from "@/types/api";
import { authApi } from "@/lib/api/auth";
import { userApi } from "@/lib/api/user";
import { configureApiClient } from "@/lib/api/client";
import {
  setIsAuthenticatedCookie,
  clearIsAuthenticatedCookie,
} from "@/lib/auth/cookie";
import { resetAllStores } from "./registry";

interface AuthState {
  accessToken: string | null;
  user: ApiUser | null;
  bootstrapping: boolean;
  bootstrapped: boolean;
  setAccessToken: (t: string | null) => void;
  setUser: (u: ApiUser | null) => void;
  /**
   * Called once from dashboard/setup layouts on cold mount.
   * Calls /refresh using the HttpOnly cookie to mint a new access token.
   * Returns true if the user is authenticated after the attempt.
   */
  bootstrap: () => Promise<boolean>;
  loginWithCredentials: (email: string, password: string) => Promise<ApiUser>;
  completeAuthResponse: (r: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  bootstrapping: false,
  bootstrapped: false,

  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),

  completeAuthResponse({ access_token, user }) {
    set({ accessToken: access_token, user, bootstrapped: true });
    setIsAuthenticatedCookie();
  },

  async bootstrap() {
    if (get().bootstrapping) return get().accessToken !== null;
    if (get().bootstrapped) return get().accessToken !== null;
    set({ bootstrapping: true });
    try {
      const refreshUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/refresh`;
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        get().logout();
        return false;
      }
      const body = (await res.json()) as Partial<AuthResponse>;
      if (!body.access_token || !body.user) {
        get().logout();
        return false;
      }
      set({ accessToken: body.access_token, user: body.user });
      setIsAuthenticatedCookie();
      // Refresh `/user` to ensure we have the freshest org list (the JWT may
      // have been minted before the most recent organization change).
      try {
        const fresh = await userApi.get();
        set({ user: fresh });
      } catch {
        // Non-fatal — we still have a usable user from /refresh.
      }
      return true;
    } catch {
      get().logout();
      return false;
    } finally {
      set({ bootstrapping: false, bootstrapped: true });
    }
  },

  async loginWithCredentials(email, password) {
    const r = await authApi.login(email, password);
    get().completeAuthResponse(r);
    return r.user;
  },

  logout() {
    set({ accessToken: null, user: null, bootstrapped: true });
    clearIsAuthenticatedCookie();
    resetAllStores();
  },
}));

/**
 * Wire the api client to the auth store. Idempotent.
 * Call from any client entrypoint (dashboard layout, setup layout) on module load.
 */
export function wireApiClientToAuthStore() {
  configureApiClient({
    getAccessToken: () => useAuthStore.getState().accessToken,
    setAccessToken: (t) => useAuthStore.getState().setAccessToken(t),
    onAuthFailure: () => useAuthStore.getState().logout(),
  });
}
