const NAME = "is_authenticated";
// 30 days, matches the backend refresh-cookie TTL.
const ATTRS = "Path=/; SameSite=Strict; Max-Age=2592000";

/**
 * Cosmetic-only cookie. Read by middleware to gate dashboard routes before
 * the client-side bootstrap runs (avoids the "flash of unauthenticated content").
 * Not signed, not trusted for security — the real auth is the HttpOnly
 * `ajentify_refresh` cookie that only the backend can read.
 */
export function setIsAuthenticatedCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${NAME}=true; ${ATTRS}`;
}

export function clearIsAuthenticatedCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${NAME}=; Path=/; Max-Age=0`;
}
