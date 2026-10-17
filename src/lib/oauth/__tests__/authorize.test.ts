import { describe, it, expect } from "vitest";
import {
  appendRedirectParams,
  buildAccessOptions,
  buildDenyRedirect,
  buildErrorRedirect,
  buildLoginRedirect,
  defaultAccessOption,
  FILESYSTEM_READ,
  FILESYSTEM_WRITE,
  parseAuthorizeParams,
  parseScopeString,
  previewErrorAction,
  requestedScopes,
} from "../authorize";

const VALID: Record<string, string> = {
  response_type: "code",
  client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  scope: "filesystem:read filesystem:write",
  state: "abc123",
  code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
  code_challenge_method: "S256",
  resource: "https://api.ajentify.com/mcp",
};

function sp(overrides: Record<string, string | null> = {}) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...VALID, ...overrides })) {
    if (v !== null) p.set(k, v);
  }
  return p;
}

describe("parseAuthorizeParams", () => {
  it("accepts a complete, valid request", () => {
    const r = parseAuthorizeParams(sp());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.params).toEqual({
      response_type: "code",
      client_id: VALID.client_id,
      redirect_uri: VALID.redirect_uri,
      scope: VALID.scope,
      state: VALID.state,
      code_challenge: VALID.code_challenge,
      code_challenge_method: "S256",
      resource: VALID.resource,
    });
  });

  it("treats absent scope / resource as undefined (not empty string)", () => {
    const r = parseAuthorizeParams(sp({ scope: null, resource: null }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.params.scope).toBeUndefined();
    expect(r.params.resource).toBeUndefined();
    expect("scope" in r.params).toBe(true);
  });

  it("rejects a missing response_type", () => {
    const r = parseAuthorizeParams(sp({ response_type: null }));
    expect(r).toMatchObject({ ok: false, error: { error: "invalid_request" } });
  });

  it("rejects response_type other than code", () => {
    const r = parseAuthorizeParams(sp({ response_type: "token" }));
    expect(r).toMatchObject({
      ok: false,
      error: { error: "unsupported_response_type" },
    });
  });

  it.each(["client_id", "redirect_uri", "code_challenge"])(
    "rejects a missing %s",
    (key) => {
      const r = parseAuthorizeParams(sp({ [key]: null }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.error).toBe("invalid_request");
      expect(r.error.description).toContain(key);
    }
  );

  it("accepts a missing or blank state (the MCP TypeScript SDK sends none)", () => {
    for (const value of [null, "   "]) {
      const r = parseAuthorizeParams(sp({ state: value }));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.params.state).toBeUndefined();
    }
  });

  it("rejects whitespace-only required values", () => {
    const r = parseAuthorizeParams(sp({ code_challenge: "   " }));
    expect(r.ok).toBe(false);
  });

  it("deny/error redirects omit state when the request had none", () => {
    const deny = new URL(buildDenyRedirect("http://localhost:8787/callback", undefined));
    expect(deny.searchParams.get("error")).toBe("access_denied");
    expect(deny.searchParams.has("state")).toBe(false);
    const err = new URL(buildErrorRedirect("http://localhost:8787/callback", "invalid_scope", undefined));
    expect(err.searchParams.has("state")).toBe(false);
  });

  it("rejects code_challenge_method other than S256, including plain and missing", () => {
    expect(parseAuthorizeParams(sp({ code_challenge_method: "plain" })).ok).toBe(false);
    expect(parseAuthorizeParams(sp({ code_challenge_method: null })).ok).toBe(false);
  });

  it("rejects a redirect_uri that is not an absolute URL", () => {
    const r = parseAuthorizeParams(sp({ redirect_uri: "/relative/path" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.description).toContain("redirect_uri");
  });

  it("accepts loopback http and custom-scheme redirect URIs (server validates ownership)", () => {
    expect(parseAuthorizeParams(sp({ redirect_uri: "http://127.0.0.1:53421/callback" })).ok).toBe(true);
    expect(
      parseAuthorizeParams(
        sp({ redirect_uri: "cursor://anysphere.cursor-retrieval/oauth/callback" })
      ).ok
    ).toBe(true);
  });
});

describe("scope helpers", () => {
  it("parseScopeString splits on whitespace and de-duplicates", () => {
    expect(parseScopeString("filesystem:read  filesystem:write filesystem:read")).toEqual([
      FILESYSTEM_READ,
      FILESYSTEM_WRITE,
    ]);
    expect(parseScopeString(undefined)).toEqual([]);
    expect(parseScopeString("   ")).toEqual([]);
  });

  it("requestedScopes defaults to read + write when scope is absent", () => {
    expect(requestedScopes(undefined)).toEqual([FILESYSTEM_READ, FILESYSTEM_WRITE]);
    expect(requestedScopes("")).toEqual([FILESYSTEM_READ, FILESYSTEM_WRITE]);
    expect(requestedScopes(FILESYSTEM_READ)).toEqual([FILESYSTEM_READ]);
  });

  it("offers Read only + Read & write when both were requested", () => {
    const opts = buildAccessOptions([FILESYSTEM_READ, FILESYSTEM_WRITE]);
    expect(opts.map((o) => o.id)).toEqual(["read", "read_write"]);
    expect(opts[0].scope).toBe(FILESYSTEM_READ);
    expect(opts[1].scope).toBe(`${FILESYSTEM_READ} ${FILESYSTEM_WRITE}`);
  });

  it("offers only Read only when the client asked for read", () => {
    const opts = buildAccessOptions([FILESYSTEM_READ]);
    expect(opts.map((o) => o.id)).toEqual(["read"]);
  });

  it("never widens: write-only request yields a write-only option", () => {
    const opts = buildAccessOptions([FILESYSTEM_WRITE]);
    expect(opts.map((o) => o.id)).toEqual(["write"]);
    expect(opts[0].scope).toBe(FILESYSTEM_WRITE);
  });

  it("ignores unknown scopes and returns nothing if no filesystem scope was requested", () => {
    expect(buildAccessOptions(["crm:read"])).toEqual([]);
    expect(buildAccessOptions(["crm:read", FILESYSTEM_READ]).map((o) => o.id)).toEqual(["read"]);
  });

  it("defaults to the broadest option offered", () => {
    expect(defaultAccessOption(buildAccessOptions([FILESYSTEM_READ, FILESYSTEM_WRITE]))?.id).toBe(
      "read_write"
    );
    expect(defaultAccessOption(buildAccessOptions([FILESYSTEM_READ]))?.id).toBe("read");
    expect(defaultAccessOption([])).toBeUndefined();
  });
});

describe("redirect builders", () => {
  it("appends params with encoding to a bare redirect_uri", () => {
    const u = new URL(
      appendRedirectParams("https://claude.ai/api/mcp/auth_callback", {
        error: "access_denied",
        state: "a b&c=d",
      })
    );
    expect(u.origin + u.pathname).toBe("https://claude.ai/api/mcp/auth_callback");
    expect(u.searchParams.get("error")).toBe("access_denied");
    expect(u.searchParams.get("state")).toBe("a b&c=d");
  });

  it("preserves an existing query on the redirect_uri", () => {
    const out = appendRedirectParams("http://localhost:3333/cb?foo=bar", { state: "s" });
    const u = new URL(out);
    expect(u.searchParams.get("foo")).toBe("bar");
    expect(u.searchParams.get("state")).toBe("s");
    expect(out.startsWith("http://localhost:3333/cb?")).toBe(true);
  });

  it("skips undefined values", () => {
    const out = appendRedirectParams("https://x.test/cb", { error: "e", error_description: undefined });
    expect(out).toBe("https://x.test/cb?error=e");
  });

  it("works for custom-scheme redirect URIs", () => {
    const out = buildDenyRedirect("cursor://anysphere.cursor-retrieval/oauth/callback", "st");
    expect(out).toBe(
      "cursor://anysphere.cursor-retrieval/oauth/callback?error=access_denied&state=st"
    );
  });

  it("buildDenyRedirect sets error=access_denied and echoes state", () => {
    const u = new URL(buildDenyRedirect("https://claude.ai/cb", "xyz"));
    expect(u.searchParams.get("error")).toBe("access_denied");
    expect(u.searchParams.get("state")).toBe("xyz");
  });

  it("buildErrorRedirect includes error_description when given", () => {
    const u = new URL(
      buildErrorRedirect("https://claude.ai/cb", "invalid_scope", "xyz", "Unknown scope crm:read")
    );
    expect(u.searchParams.get("error")).toBe("invalid_scope");
    expect(u.searchParams.get("error_description")).toBe("Unknown scope crm:read");
    expect(u.searchParams.get("state")).toBe("xyz");
  });

  it("buildLoginRedirect round-trips the full path + query via next=", () => {
    const search = "response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fcimd&state=s";
    const out = buildLoginRedirect("/oauth/authorize", search);
    expect(out.startsWith("/login?next=")).toBe(true);
    const next = new URLSearchParams(out.slice("/login".length)).get("next");
    expect(next).toBe(`/oauth/authorize?${search}`);
    // Also accepts a leading "?" and an empty query.
    expect(buildLoginRedirect("/oauth/authorize", `?${search}`)).toBe(out);
    expect(buildLoginRedirect("/oauth/authorize", "")).toBe(
      `/login?next=${encodeURIComponent("/oauth/authorize")}`
    );
  });
});

describe("previewErrorAction", () => {
  it("redirects for invalid_scope (the API validates redirect_uri before scopes)", () => {
    expect(previewErrorAction("invalid_scope")).toBe("redirect");
  });

  it("never redirects for client / redirect / resource / request errors", () => {
    expect(previewErrorAction("invalid_client")).toBe("card");
    expect(previewErrorAction("invalid_redirect_uri")).toBe("card");
    expect(previewErrorAction("invalid_resource")).toBe("card");
    expect(previewErrorAction("invalid_request")).toBe("card");
    expect(previewErrorAction(undefined)).toBe("card");
  });
});
