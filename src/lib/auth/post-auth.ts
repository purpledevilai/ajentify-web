import type { ApiUser } from "@/types/api";

/**
 * Decide where to send a freshly-authenticated user.
 * - Users with no organizations must complete org setup first.
 * - Otherwise honor the requested `next` only if it stays inside the dashboard.
 */
export function resolvePostAuthDestination(user: ApiUser, requested = "/app") {
  if (!user.organizations || user.organizations.length === 0) {
    return "/create-organization";
  }
  return requested.startsWith("/app") ? requested : "/app";
}
