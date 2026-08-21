"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mcpConnectionsApi } from "@/lib/api/mcp-connections";
import { mcpConnectionsActions } from "@/lib/stores/mcp-connections-store";
import { popMcpPkce } from "@/lib/mcp/connect";
import { getErrorMessage } from "@/lib/api/errors";

function McpCallback() {
  const router = useRouter();
  const sp = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      const code = sp.get("code");
      const state = sp.get("state");
      const oauthError = sp.get("error");
      if (oauthError) {
        setError(sp.get("error_description") ?? oauthError);
        return;
      }
      const pkce = popMcpPkce();
      if (!code || !state || !pkce || pkce.state !== state) {
        setError("Invalid OAuth callback");
        return;
      }
      try {
        // Exchange the authorization code for tokens (server-side proxy).
        const tokens = await mcpConnectionsApi.token({
          token_endpoint: pkce.tokenEndpoint,
          grant_type: "authorization_code",
          client_id: pkce.clientId,
          issuer: pkce.issuer,
          code,
          code_verifier: pkce.verifier,
          redirect_uri: pkce.redirectUri,
          resource: pkce.resource ?? undefined,
        });
        if (!tokens.access_token) {
          throw new Error("Token exchange did not return an access token");
        }
        // Persist the connection now (with tokens, no tools selected yet) so the
        // builder can load it, fetch the live tool list, and let the user pick.
        const created = await mcpConnectionsActions.create({
          name: pkce.name,
          mcp_url: pkce.mcpUrl,
          requires_auth: true,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_endpoint: pkce.tokenEndpoint,
          client_id: pkce.clientId,
          issuer: pkce.issuer,
          selected_tools: [],
        });
        router.replace(`/app/mcp-connections/${created.mcp_connection_id}?connected=1`);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "MCP authorization failed"));
      }
    })();
  }, [sp, router]);

  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold">Connection failed</h1>
          <p className="text-destructive text-sm">{error}</p>
          <a
            href="/app/mcp-connections"
            className="text-foreground text-sm underline"
          >
            Back to MCP connections
          </a>
        </>
      ) : (
        <p className="text-muted-foreground">Completing MCP authorization…</p>
      )}
    </div>
  );
}

export default function McpCallbackPage() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground py-16 text-center">Loading…</p>}
    >
      <McpCallback />
    </Suspense>
  );
}
