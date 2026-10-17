import { describe, it, expect, vi, beforeEach } from "vitest";
import { configureApiClient, __resetApiClientForTests } from "../client";
import { oauthAuthorizeApi } from "../oauth-authorize";
import { ApiError } from "../errors";

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  credentials: RequestCredentials | undefined;
  body: unknown;
}

let captured: Captured[];

function mockFetch(status = 200, jsonValue: unknown = { ok: true }) {
  captured = [];
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    captured.push({
      url: String(url),
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      credentials: init?.credentials,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(jsonValue), { status });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  __resetApiClientForTests();
  configureApiClient({
    getAccessToken: () => "login-jwt",
    setAccessToken: () => {},
    onAuthFailure: vi.fn(),
  });
});

const BASE = "https://api.test.invalid";

const PREVIEW_BODY = {
  oauth_client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  scope: "filesystem:read filesystem:write",
  state: "st",
  code_challenge: "cc",
  code_challenge_method: "S256" as const,
  resource: "https://api.ajentify.com/mcp",
};

describe("oauthAuthorizeApi.preview", () => {
  it("POSTs the body to /oauth/authorize/preview with the login Bearer token and no cookies", async () => {
    const response = {
      client_name: "Claude",
      client_uri: "https://claude.ai",
      client_host: "claude.ai",
      redirect_host: "claude.ai",
      is_loopback: false,
      scopes: [
        { scope: "filesystem:read", description: "Read" },
        { scope: "filesystem:write", description: "Write" },
      ],
      resource: "https://api.ajentify.com/mcp",
      orgs: [{ org_id: "o1", name: "Acme" }],
    };
    mockFetch(200, response);
    const r = await oauthAuthorizeApi.preview(PREVIEW_BODY);
    expect(r).toEqual(response);
    expect(captured[0]).toMatchObject({
      url: `${BASE}/oauth/authorize/preview`,
      method: "POST",
      credentials: "omit",
      body: PREVIEW_BODY,
    });
    expect(captured[0].headers.Authorization).toBe("Bearer login-jwt");
  });

  it("omits scope / resource keys entirely when undefined", async () => {
    mockFetch(200, {});
    await oauthAuthorizeApi.preview({
      ...PREVIEW_BODY,
      scope: undefined,
      resource: undefined,
    });
    expect(captured[0].body).toEqual({
      oauth_client_id: PREVIEW_BODY.oauth_client_id,
      redirect_uri: PREVIEW_BODY.redirect_uri,
      state: "st",
      code_challenge: "cc",
      code_challenge_method: "S256",
    });
  });

  it("surfaces the error code + redirect_valid flag on an invalid_scope rejection", async () => {
    mockFetch(400, {
      error: "Unknown scope crm:read",
      code: "invalid_scope",
      redirect_valid: true,
    });
    await expect(oauthAuthorizeApi.preview(PREVIEW_BODY)).rejects.toMatchObject({
      status: 400,
      body: { code: "invalid_scope", redirect_valid: true },
    } satisfies Partial<ApiError>);
  });

  it("surfaces invalid_client", async () => {
    mockFetch(400, { error: "Unknown client", code: "invalid_client" });
    await expect(oauthAuthorizeApi.preview(PREVIEW_BODY)).rejects.toMatchObject({
      status: 400,
      body: { code: "invalid_client" },
    });
  });
});

describe("oauthAuthorizeApi.grant", () => {
  it("POSTs the granted scope + org_id to /oauth/authorize/grant and returns the redirect", async () => {
    mockFetch(200, {
      redirect_uri:
        "https://claude.ai/api/mcp/auth_callback?code=abc&state=st&iss=https%3A%2F%2Fapi.ajentify.com",
    });
    const body = { ...PREVIEW_BODY, scope: "filesystem:read", org_id: "o1" };
    const r = await oauthAuthorizeApi.grant(body);
    expect(r.redirect_uri).toContain("code=abc");
    expect(captured[0]).toMatchObject({
      url: `${BASE}/oauth/authorize/grant`,
      method: "POST",
      credentials: "omit",
      body,
    });
    expect(captured[0].headers.Authorization).toBe("Bearer login-jwt");
  });
});
