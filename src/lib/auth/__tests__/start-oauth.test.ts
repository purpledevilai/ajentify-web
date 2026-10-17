import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { popPkce, stashPkce } from "../pkce";
import { startOAuth } from "../start-oauth";
import { resolvePostAuthDestination } from "../post-auth";

vi.mock("../providers", () => ({
  buildAuthUrl: vi.fn(async (provider: string) => `https://provider.test/${provider}`),
}));

const OAUTH_NEXT =
  "/oauth/authorize?response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fcimd&state=s";

let originalLocation: Location;

beforeEach(() => {
  sessionStorage.clear();
  originalLocation = window.location;
  // jsdom does not implement navigation; swap in a plain object so the
  // `window.location.href = …` assignment in startOAuth is observable.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { href: "http://localhost:3000/login" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
});

describe("social login carries `next` through the provider round-trip", () => {
  it("startOAuth stashes `next` in sessionStorage with the PKCE payload", async () => {
    await startOAuth("google", OAUTH_NEXT);
    expect(window.location.href).toBe("https://provider.test/google");
    const pkce = popPkce();
    expect(pkce).not.toBeNull();
    expect(pkce?.provider).toBe("google");
    expect(pkce?.next).toBe(OAUTH_NEXT);
    expect(pkce?.verifier.length).toBeGreaterThan(0);
    expect(pkce?.state.length).toBeGreaterThan(0);
  });

  it("startOAuth without `next` leaves it undefined (existing behaviour)", async () => {
    await startOAuth("microsoft");
    const pkce = popPkce();
    expect(pkce?.provider).toBe("microsoft");
    expect(pkce?.next).toBeUndefined();
  });

  it("popPkce returns `next` exactly once (what /callback relies on)", () => {
    stashPkce({ verifier: "v", state: "s", provider: "google", next: OAUTH_NEXT });
    expect(popPkce()?.next).toBe(OAUTH_NEXT);
    expect(popPkce()).toBeNull();
  });

  it("/callback destination = resolvePostAuthDestination(user, pkce.next)", () => {
    stashPkce({ verifier: "v", state: "s", provider: "google", next: OAUTH_NEXT });
    const pkce = popPkce()!;
    const user = {
      id: "u1",
      email: "a@b.co",
      first_name: "A",
      last_name: "B",
      organizations: [{ id: "o1", name: "Acme" }],
    };
    expect(resolvePostAuthDestination(user, pkce.next)).toBe(OAUTH_NEXT);
    // Legacy payloads (no `next`) still land on the dashboard.
    expect(resolvePostAuthDestination(user, undefined)).toBe("/app");
  });
});
