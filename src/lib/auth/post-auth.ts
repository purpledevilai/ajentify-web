import type { ApiUser } from "@/types/api";

/**
 * Strict allow-list of where a `next` parameter may send a freshly
 * authenticated user. Matched as an exact path or as `<prefix>/…` /
 * `<prefix>?…`, so `/application` or `//evil.example` never pass.
 */
const ALLOWED_NEXT_PREFIXES = ["/app", "/oauth/authorize"] as const;

export function isAllowedNext(requested: string | null | undefined): boolean {
  if (!requested) return false;
  return ALLOWED_NEXT_PREFIXES.some(
    (p) =>
      requested === p ||
      requested.startsWith(`${p}/`) ||
      requested.startsWith(`${p}?`)
  );
}

/**
 * Decide where to send a freshly-authenticated user.
 * - Users with no organizations must complete org setup first.
 * - Otherwise honor the requested `next` only if it is on the allow-list
 *   (dashboard, or the MCP OAuth consent page which round-trips through login).
 */
export function resolvePostAuthDestination(user: ApiUser, requested = "/app") {
  if (!user.organizations || user.organizations.length === 0) {
    return "/create-organization";
  }
  return isAllowedNext(requested) ? requested : "/app";
}
