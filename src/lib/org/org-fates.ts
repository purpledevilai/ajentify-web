import type { DeletionOrgAction } from "@/types/api";

export interface OrgFate {
  org_id: string;
  name: string;
  action: DeletionOrgAction;
}

/**
 * What `DELETE /user` does to one organization: if nobody else is a member,
 * the org is deleted (Stripe subscription cancelled, every resource removed);
 * otherwise the user simply leaves it. Mirrors the backend rule (plan D7) so
 * the account-deletion dialog can show the list BEFORE the user confirms.
 */
export function orgFateForUser(
  org: { org_id: string; name: string; users: string[] },
  userId: string
): OrgFate {
  const others = (org.users ?? []).filter((u) => u !== userId);
  return {
    org_id: org.org_id,
    name: org.name,
    action: others.length === 0 ? "delete" : "leave",
  };
}

export function computeOrgFates(
  orgs: Array<{ org_id: string; name: string; users: string[] }>,
  userId: string
): OrgFate[] {
  return orgs.map((o) => orgFateForUser(o, userId));
}
