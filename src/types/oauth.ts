// Types for the MCP OAuth authorization-server endpoints the consent page
// talks to (`POST /oauth/authorize/preview`, `POST /oauth/authorize/grant`).
// Kept out of `types/api.ts` to avoid churn in that shared file.
//
// Naming: in our JSON bodies the OAuth client is `oauth_client_id` (Ajentify
// already has a native `Client` object); RFC `client_id` only appears on the
// wire between the MCP client and the browser.

export interface OAuthAuthorizePreviewRequest {
  oauth_client_id: string;
  redirect_uri: string;
  scope?: string;
  /** Optional per RFC 6749; the MCP TypeScript SDK omits it (PKCE binds the code). */
  state?: string;
  code_challenge: string;
  code_challenge_method: "S256";
  resource?: string;
}

export interface OAuthScopeDescription {
  scope: string;
  description: string;
}

export interface OAuthOrgRef {
  org_id: string;
  name: string;
}

export interface OAuthAuthorizePreviewResponse {
  client_name: string;
  client_uri?: string | null;
  client_host: string;
  redirect_host: string;
  is_loopback: boolean;
  scopes: OAuthScopeDescription[];
  resource: string;
  orgs: OAuthOrgRef[];
}

export interface OAuthAuthorizeGrantRequest
  extends OAuthAuthorizePreviewRequest {
  /** Granted scope — may only narrow what the client requested. */
  scope: string;
  /** The client's original `scope` (raw), so the API can enforce granted ⊆ requested. */
  requested_scope?: string;
  org_id: string;
}

export interface OAuthAuthorizeGrantResponse {
  /** `<redirect_uri>?code=…&state=…&iss=…` — the page does `location.replace` on it. */
  redirect_uri: string;
}

/** Error body for preview/grant failures (the router's `{error, code}` shape). */
export interface OAuthAuthorizeErrorBody {
  error?: string;
  code?: string;
  error_description?: string;
}
