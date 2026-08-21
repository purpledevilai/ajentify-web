import { randomString, sha256Base64Url } from "@/lib/auth/pkce";
import { mcpConnectionsApi } from "@/lib/api/mcp-connections";
import type {
  DiscoverMcpResponse,
  ListMcpToolsParams,
  ListMcpToolsResponse,
} from "@/types/api";

// Separate sessionStorage slot from the login PKCE (`ajentify.pkce`) so an
// in-progress MCP connect doesn't collide with sign-in.
const MCP_PKCE_KEY = "ajentify.mcp.oauth";

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "";

/** The MCP OAuth callback page. The frontend owns the redirect URI end-to-end
 * (authorize + token exchange); it must match a redirect URI registered for the
 * resolved client (the GitHub app / DCR registration / CIMD document). */
export const mcpRedirectUri = (): string => `${APP_URL()}/app/mcp/callback`;

export interface McpPkcePayload {
  verifier: string;
  state: string;
  name: string;
  mcpUrl: string;
  tokenEndpoint: string;
  resource: string | null;
  clientId: string;
  issuer: string | null;
  redirectUri: string;
}

function stashMcpPkce(p: McpPkcePayload) {
  sessionStorage.setItem(MCP_PKCE_KEY, JSON.stringify(p));
}

export function popMcpPkce(): McpPkcePayload | null {
  const raw = sessionStorage.getItem(MCP_PKCE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(MCP_PKCE_KEY);
  try {
    return JSON.parse(raw) as McpPkcePayload;
  } catch {
    return null;
  }
}

/** Endpoint 1 — resolve whether an MCP server needs OAuth and, if so, its
 * authorize/token endpoints plus a ready-to-use `client_id`. */
export function discoverMcp(mcpUrl: string): Promise<DiscoverMcpResponse> {
  return mcpConnectionsApi.discover({ mcp_url: mcpUrl });
}

/** Endpoint 2 — list an MCP server's tools. Pass `mcpConnectionId` for an
 * existing connection so the backend can refresh an expired token. */
export function listMcpTools(params: ListMcpToolsParams): Promise<ListMcpToolsResponse> {
  return mcpConnectionsApi.tools(params);
}

/** Kick off the PKCE authorization-code flow for an MCP server. `discovery`
 * must be a `requires_auth` result from `discoverMcp` (client_id already
 * resolved server-side). Stashes the verifier + connection metadata, then
 * navigates to the authorization endpoint. */
export async function startMcpOAuth(params: {
  name: string;
  mcpUrl: string;
  discovery: DiscoverMcpResponse;
}): Promise<void> {
  const { name, mcpUrl, discovery } = params;
  if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
    throw new Error("MCP server did not advertise OAuth endpoints");
  }
  if (!discovery.client_id) {
    throw new Error("Could not resolve an OAuth client_id for this MCP server");
  }
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(24);
  const clientId = discovery.client_id;
  const redirectUri = mcpRedirectUri();

  stashMcpPkce({
    verifier,
    state,
    name,
    mcpUrl,
    tokenEndpoint: discovery.token_endpoint,
    resource: discovery.resource ?? mcpUrl,
    clientId,
    issuer: discovery.issuer ?? null,
    redirectUri,
  });

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  // RFC 8707 resource indicator — the MCP server this token is for.
  if (discovery.resource ?? mcpUrl) {
    url.searchParams.set("resource", discovery.resource ?? mcpUrl);
  }
  if (discovery.scope) {
    url.searchParams.set("scope", discovery.scope);
  }
  // AS-specific extras (e.g. Google's access_type=offline & prompt=consent so a
  // refresh token is issued), configured on the oauth_clients row.
  if (discovery.authorization_params) {
    for (const [key, value] of Object.entries(discovery.authorization_params)) {
      url.searchParams.set(key, String(value));
    }
  }
  window.location.href = url.toString();
}
