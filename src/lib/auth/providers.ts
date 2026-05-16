export type Provider = "google" | "microsoft";

const REDIRECT_URI = () => `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/callback`;

export async function buildAuthUrl(
  provider: Provider,
  challenge: string,
  state: string
): Promise<string> {
  if (provider === "google") {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    u.searchParams.set("client_id", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "");
    u.searchParams.set("redirect_uri", REDIRECT_URI());
    u.searchParams.set("response_type", "code");
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("code_challenge", challenge);
    u.searchParams.set("code_challenge_method", "S256");
    u.searchParams.set("state", state);
    u.searchParams.set("access_type", "online");
    u.searchParams.set("prompt", "select_account");
    return u.toString();
  }
  // microsoft (Entra common tenant)
  const u = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  u.searchParams.set("client_id", process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", REDIRECT_URI());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", state);
  u.searchParams.set("response_mode", "query");
  return u.toString();
}

export async function exchangeCodeForIdToken(
  provider: Provider,
  code: string,
  verifier: string
): Promise<string> {
  const clientId =
    provider === "google"
      ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""
      : process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID ?? "";
  const body = new URLSearchParams({
    code,
    redirect_uri: REDIRECT_URI(),
    code_verifier: verifier,
    grant_type: "authorization_code",
    client_id: clientId,
  });
  const tokenUrl =
    provider === "google"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`${provider} token exchange failed: ${res.status}`);
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new Error(`${provider} token exchange missing id_token`);
  return json.id_token;
}
