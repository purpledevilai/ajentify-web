import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, configureApiClient, __resetApiClientForTests } from "../client";

type TokenSlot = { token: string | null };

let tokens: TokenSlot;

beforeEach(() => {
  __resetApiClientForTests();
  tokens = { token: "good" };
  configureApiClient({
    getAccessToken: () => tokens.token,
    setAccessToken: (t) => {
      tokens.token = t;
    },
    onAuthFailure: vi.fn(),
  });
});

interface MockResponse {
  status?: number;
  jsonValue?: unknown;
}

function mockSequentialFetch(seq: MockResponse[]) {
  let i = 0;
  globalThis.fetch = vi.fn(async () => {
    const r = seq[i++];
    if (!r) throw new Error("mock fetch ran out of responses");
    return new Response(
      r.jsonValue !== undefined ? JSON.stringify(r.jsonValue) : null,
      { status: r.status ?? 200 }
    );
  }) as unknown as typeof fetch;
}

describe("api client refresh logic", () => {
  it("retries the original request once after a 401 + successful refresh", async () => {
    mockSequentialFetch([
      { status: 401 }, // original 401
      { status: 200, jsonValue: { access_token: "new" } }, // /refresh ok
      { status: 200, jsonValue: { ok: true } }, // retry ok
    ]);
    const r = await api.get<{ ok: boolean }>("/anything");
    expect(r.ok).toBe(true);
    expect(tokens.token).toBe("new");
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(3);
  });

  it("calls onAuthFailure if refresh fails", async () => {
    const fail = vi.fn();
    configureApiClient({
      getAccessToken: () => tokens.token,
      setAccessToken: (t) => {
        tokens.token = t;
      },
      onAuthFailure: fail,
    });
    mockSequentialFetch([{ status: 401 }, { status: 401 }]);
    await expect(api.get("/anything")).rejects.toThrow();
    expect(fail).toHaveBeenCalledOnce();
  });

  it("coalesces concurrent 401s onto a single /refresh call", async () => {
    let refreshCalls = 0;
    globalThis.fetch = vi.fn(async (url: unknown) => {
      const u = String(url);
      if (u.endsWith("/refresh")) {
        refreshCalls++;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(JSON.stringify({ access_token: "new" }), {
          status: 200,
        });
      }
      const t = tokens.token;
      if (t === "good") return new Response(null, { status: 401 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);
    expect(refreshCalls).toBe(1);
    expect(tokens.token).toBe("new");
  });

  it("does not attempt refresh on publicPost (no auth)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 401 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(api.publicPost("/login", { email: "a", password: "b" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("defaults to credentials: omit; opts in via credentialed flag", async () => {
    const captured: RequestInit[] = [];
    globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      captured.push(init!);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;

    await api.post("/something", { hello: "world" });
    await api.credentialedPublicPost("/auth-cookie", { hello: "world" });

    expect(captured[0]?.credentials).toBe("omit");
    expect((captured[0]?.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json"
    );
    expect(captured[0]?.body).toBe(JSON.stringify({ hello: "world" }));
    expect(captured[1]?.credentials).toBe("include");
  });

  it("serializes query params and skips null/undefined", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = vi.fn(async (url: unknown) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    await api.get("/agents", {
      query: { org_id: "abc", missing: undefined, none: null, flag: true },
    });
    expect(capturedUrl).toContain("org_id=abc");
    expect(capturedUrl).toContain("flag=true");
    expect(capturedUrl).not.toContain("missing=");
    expect(capturedUrl).not.toContain("none=");
  });
});
