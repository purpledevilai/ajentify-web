import { describe, it, expect, vi } from "vitest";

// `use-require-auth` wires the api client + billing handlers at module load;
// stub the stores so importing the pure helper has no side effects.
vi.mock("@/lib/stores/auth-store", () => ({
  useAuthStore: Object.assign(() => undefined, { getState: () => ({}) }),
  wireApiClientToAuthStore: () => {},
}));
vi.mock("@/lib/stores/org-store", () => ({
  useOrgStore: Object.assign(() => undefined, { getState: () => ({}) }),
}));
vi.mock("@/lib/stores/prefetch", () => ({ prefetchAllStores: async () => {} }));
vi.mock("@/lib/api/billing-handlers", () => ({ wireBillingHandlers: () => {} }));

import { buildNextTarget } from "../use-require-auth";

describe("buildNextTarget", () => {
  it("returns the bare pathname when there is no query", () => {
    expect(buildNextTarget("/app/agents", "")).toBe("/app/agents");
  });

  it("appends the query, with or without a leading '?'", () => {
    expect(buildNextTarget("/app/chat/abc", "?add_message=a")).toBe(
      "/app/chat/abc?add_message=a"
    );
    expect(buildNextTarget("/app/chat/abc", "add_message=a")).toBe(
      "/app/chat/abc?add_message=a"
    );
  });

  it("round-trips through encodeURIComponent as a single `next` value", () => {
    const next = buildNextTarget("/app/chat/abc", "?add_message=a%20b");
    const login = `/login?next=${encodeURIComponent(next)}`;
    const parsed = new URL(login, "http://localhost").searchParams.get("next");
    expect(parsed).toBe("/app/chat/abc?add_message=a%20b");
  });
});
