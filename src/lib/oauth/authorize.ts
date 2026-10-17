/**
 * Pure logic for the `/oauth/authorize` consent page: query parsing +
 * validation, scope narrowing (Read only / Read & write), and redirect URL
 * building. No React, no fetch — unit-tested in `__tests__/authorize.test.ts`.
 *
 * Wire names (`client_id`, `redirect_uri`, …) follow RFC 6749 because they
 * come straight off the MCP client's authorize URL. The API bodies we build
 * use `oauth_client_id` (Ajentify already has a native `Client` object).
 */

export const FILESYSTEM_READ = "filesystem:read";
export const FILESYSTEM_WRITE = "filesystem:write";

/** Scopes this page knows how to describe. Anything else is left to the server. */
export const KNOWN_SCOPES = [FILESYSTEM_READ, FILESYSTEM_WRITE] as const;

export interface AuthorizeParams {
  response_type: "code";
  client_id: string;
  redirect_uri: string;
  /** Raw `scope` string as sent by the client; `undefined` when absent. */
  scope?: string;
  /**
   * CSRF token echoed back on the redirect. RFC 6749 makes it RECOMMENDED, not
   * required, and the official MCP TypeScript SDK (Claude Code et al.) omits it —
   * PKCE already binds the code to the client instance.
   */
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
  resource?: string;
}

export interface AuthorizeParamError {
  /** RFC 6749 error code we would have sent if we trusted `redirect_uri`. */
  error: "invalid_request" | "unsupported_response_type";
  description: string;
}

export type ParseAuthorizeResult =
  | { ok: true; params: AuthorizeParams }
  | { ok: false; error: AuthorizeParamError };

function nonEmpty(sp: URLSearchParams, key: string): string | undefined {
  const v = sp.get(key);
  if (v === null) return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Parse + validate the authorize request. We refuse to redirect on any
 * failure here because `redirect_uri` has not been validated against the
 * client yet — the caller must render an error card instead.
 */
export function parseAuthorizeParams(
  sp: URLSearchParams
): ParseAuthorizeResult {
  const response_type = nonEmpty(sp, "response_type");
  if (!response_type) {
    return fail("invalid_request", "Missing response_type.");
  }
  if (response_type !== "code") {
    return fail(
      "unsupported_response_type",
      `Unsupported response_type "${response_type}". Only "code" is supported.`
    );
  }

  const client_id = nonEmpty(sp, "client_id");
  if (!client_id) return fail("invalid_request", "Missing client_id.");

  const redirect_uri = nonEmpty(sp, "redirect_uri");
  if (!redirect_uri) return fail("invalid_request", "Missing redirect_uri.");
  if (!canParseUrl(redirect_uri)) {
    return fail("invalid_request", "redirect_uri is not a valid absolute URL.");
  }

  const state = nonEmpty(sp, "state");

  const code_challenge = nonEmpty(sp, "code_challenge");
  if (!code_challenge) return fail("invalid_request", "Missing code_challenge.");

  const code_challenge_method = nonEmpty(sp, "code_challenge_method");
  if (code_challenge_method !== "S256") {
    return fail(
      "invalid_request",
      code_challenge_method
        ? `Unsupported code_challenge_method "${code_challenge_method}". Only S256 is supported.`
        : "Missing code_challenge_method (S256 is required)."
    );
  }

  return {
    ok: true,
    params: {
      response_type: "code",
      client_id,
      redirect_uri,
      scope: nonEmpty(sp, "scope"),
      state,
      code_challenge,
      code_challenge_method: "S256",
      resource: nonEmpty(sp, "resource"),
    },
  };
}

function fail(
  error: AuthorizeParamError["error"],
  description: string
): ParseAuthorizeResult {
  return { ok: false, error: { error, description } };
}

export function canParseUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scopes
// ---------------------------------------------------------------------------

/** Split a space-delimited scope string into unique, non-empty tokens. */
export function parseScopeString(scope: string | undefined): string[] {
  if (!scope) return [];
  const out: string[] = [];
  for (const s of scope.split(/\s+/)) {
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * Scopes the client asked for. Per the plan, an absent `scope` means the
 * client wants everything we offer (read + write).
 */
export function requestedScopes(scope: string | undefined): string[] {
  const parsed = parseScopeString(scope);
  return parsed.length > 0 ? parsed : [...KNOWN_SCOPES];
}

export type AccessLevelId = "read" | "read_write" | "write";

export interface AccessOption {
  id: AccessLevelId;
  label: string;
  description: string;
  /** Space-delimited scope string that will be granted for this option. */
  scope: string;
}

/**
 * Build the access radio options from the *requested* filesystem scopes.
 * We only ever offer what was requested (the page can narrow, never widen):
 *   - read requested            → "Read only"
 *   - read + write requested    → "Read only" + "Read & write"
 *   - write only requested      → "Write only"
 * Non-filesystem scopes are ignored here; the server rejects unknown ones
 * via `invalid_scope` on preview.
 */
export function buildAccessOptions(requested: string[]): AccessOption[] {
  const wantsRead = requested.includes(FILESYSTEM_READ);
  const wantsWrite = requested.includes(FILESYSTEM_WRITE);
  const options: AccessOption[] = [];
  if (wantsRead) {
    options.push({
      id: "read",
      label: "Read only",
      description: "List, open and search files in the selected organization.",
      scope: FILESYSTEM_READ,
    });
  }
  if (wantsRead && wantsWrite) {
    options.push({
      id: "read_write",
      label: "Read & write",
      description:
        "Read files, plus create, edit, move and delete files and folders.",
      scope: `${FILESYSTEM_READ} ${FILESYSTEM_WRITE}`,
    });
  } else if (wantsWrite) {
    options.push({
      id: "write",
      label: "Write only",
      description: "Create, edit, move and delete files and folders.",
      scope: FILESYSTEM_WRITE,
    });
  }
  return options;
}

/** Default selection = the broadest option offered (what the client asked for). */
export function defaultAccessOption(
  options: AccessOption[]
): AccessOption | undefined {
  return options[options.length - 1];
}

// ---------------------------------------------------------------------------
// Redirects
// ---------------------------------------------------------------------------

/**
 * Append query params to `redirectUri`, preserving any query the client
 * already put there and percent-encoding values. Works for https, loopback
 * http and custom schemes (`cursor://…`) alike.
 */
export function appendRedirectParams(
  redirectUri: string,
  params: Record<string, string | undefined>
): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Redirect the client receives when the user clicks Deny. */
export function buildDenyRedirect(redirectUri: string, state?: string): string {
  return appendRedirectParams(redirectUri, {
    error: "access_denied",
    state,
  });
}

/** Redirect for a server-reported error we are allowed to forward (e.g. invalid_scope). */
export function buildErrorRedirect(
  redirectUri: string,
  error: string,
  state: string | undefined,
  description?: string
): string {
  return appendRedirectParams(redirectUri, {
    error,
    error_description: description,
    state,
  });
}

/**
 * The `/login?next=…` URL that brings the user back to this exact authorize
 * request (path + full query) after signing in.
 */
export function buildLoginRedirect(pathname: string, search: string): string {
  const q = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  return `/login?next=${encodeURIComponent(`${pathname}${q}`)}`;
}

// ---------------------------------------------------------------------------
// Preview error → page behaviour
// ---------------------------------------------------------------------------

/** Error codes returned by `POST /oauth/authorize/preview`. */
export type PreviewErrorCode =
  | "invalid_client"
  | "invalid_redirect_uri"
  | "invalid_scope"
  | "invalid_resource";

/**
 * Decide what to do with a preview error. We may only redirect back to the
 * client for `invalid_scope`: the API validates the client and `redirect_uri`
 * BEFORE the scopes (`RequestHandlers/OAuthServer/_common.validate_authorize_request`
 * raises `invalid_client` / `invalid_redirect_uri` first), so an `invalid_scope`
 * error is itself the server's confirmation that `redirect_uri` belongs to the
 * client. Every other code is an error card, never a redirect.
 */
export function previewErrorAction(
  code: string | undefined
): "redirect" | "card" {
  return code === "invalid_scope" ? "redirect" : "card";
}
