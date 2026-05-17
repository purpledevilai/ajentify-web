"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { popPkce } from "@/lib/auth/pkce";
import {
  exchangeMicrosoftCodeForIdToken,
  oauthRedirectUri,
} from "@/lib/auth/providers";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";

function OAuthCallback() {
  const router = useRouter();
  const sp = useSearchParams();
  const complete = useAuthStore((s) => s.completeAuthResponse);
  const [error, setError] = useState<string | null>(null);
  // React 18+ Strict Mode mounts effects twice in dev. Guard so we
  // don't run the one-time PKCE exchange more than once.
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
      const pkce = popPkce();
      if (!code || !state || !pkce || pkce.state !== state) {
        setError("Invalid OAuth callback");
        return;
      }
      try {
        // Google: hand the raw code + verifier to the backend so it can
        // include client_secret in the token exchange (required by Google
        // for "Web application" clients even with PKCE).
        // Microsoft: SPA platform is secretless with PKCE — exchange in the
        // browser and post the id_token to the backend.
        const r =
          pkce.provider === "google"
            ? await authApi.oauth({
                provider: "google",
                code,
                code_verifier: pkce.verifier,
                redirect_uri: oauthRedirectUri(),
              })
            : await authApi.oauth({
                provider: "microsoft",
                id_token: await exchangeMicrosoftCodeForIdToken(
                  code,
                  pkce.verifier
                ),
              });
        complete(r);
        router.replace(resolvePostAuthDestination(r.user));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "OAuth login failed";
        setError(message);
      }
    })();
  }, [sp, complete, router]);

  return (
    <div className="space-y-3 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold">Sign-in failed</h1>
          <p className="text-destructive text-sm">{error}</p>
          <a href="/login" className="text-foreground text-sm underline">
            Back to sign in
          </a>
        </>
      ) : (
        <p className="text-muted-foreground">Completing sign-in…</p>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground text-center">Loading…</p>}
    >
      <OAuthCallback />
    </Suspense>
  );
}
