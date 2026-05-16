function base64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomString(length = 64): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return base64urlEncode(arr);
}

export async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64urlEncode(new Uint8Array(digest));
}

export type PkceProvider = "google" | "microsoft";

interface PkcePayload {
  verifier: string;
  state: string;
  provider: PkceProvider;
}

const STORAGE_KEY = "ajentify.pkce";

export function stashPkce(p: PkcePayload) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export function popPkce(): PkcePayload | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(STORAGE_KEY);
  try {
    return JSON.parse(raw) as PkcePayload;
  } catch {
    return null;
  }
}
