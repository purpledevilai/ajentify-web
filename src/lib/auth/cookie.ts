const NAME = "is_authenticated";
// Shared attributes used for both set and clear. SameSite=Lax (not Strict) is
// intentional: after an OAuth flow the browser performs a top-level cross-site
// redirect from the OAuth provider back to /callback. Safari tracks this
// "cross-site navigation context" and — with SameSite=Strict — will NOT include
// the cookie in the very next page reload (F5), causing the Next.js middleware
// to redirect to /login before the client-side bootstrap can ever run. SameSite
// =Lax sends the cookie on ALL top-level navigations (including reloads in a
// cross-site context) while still withholding it from cross-origin subresource
// requests, which is the right trade-off for a cosmetic-only middleware hint.
// The clear directive must match the same attributes so Safari doesn't silently
// ignore the delete.
const PATH_AND_SAMESITE = "Path=/; SameSite=Lax";

/**
 * Cosmetic-only cookie. Read by middleware to gate dashboard routes before
 * the client-side bootstrap runs (avoids a flash of unauthenticated content).
 * Not signed, not trusted for security — the real auth is the HttpOnly
 * `ajentify_refresh` cookie that only the backend can read.
 */
export function setIsAuthenticatedCookie() {
  if (typeof document === "undefined") return;
  // 30 days, matches the backend refresh-cookie TTL.
  document.cookie = `${NAME}=true; ${PATH_AND_SAMESITE}; Max-Age=2592000`;
}

export function clearIsAuthenticatedCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${NAME}=; ${PATH_AND_SAMESITE}; Max-Age=0`;
}
