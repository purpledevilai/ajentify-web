import { buildAuthUrl, type Provider } from "./providers";
import { randomString, sha256Base64Url, stashPkce } from "./pkce";

export async function startOAuth(provider: Provider) {
  const verifier = randomString(64);
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(24);
  stashPkce({ verifier, state, provider });
  window.location.href = await buildAuthUrl(provider, challenge, state);
}
