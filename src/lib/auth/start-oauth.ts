import { buildAuthUrl, type Provider } from "./providers";
import { randomString, sha256Base64Url, stashPkce } from "./pkce";

/**
 * Kick off a social sign-in. `next` (the login page's `?next=`) is stashed
 * in sessionStorage with the PKCE payload so `/callback` can honour it after
 * the provider redirects back without our query string.
 */
export async function startOAuth(provider: Provider, next?: string) {
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(24);
  stashPkce({ verifier, state, provider, next });
  window.location.href = await buildAuthUrl(provider, challenge, state);
}
