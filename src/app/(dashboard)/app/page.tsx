"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { OrgCard } from "@/components/blocks/org-card";
import { CreateOrganizationDialog } from "@/components/blocks/create-organization-dialog";
import { Button } from "@/components/primitives/button";
import { useOrgStore } from "@/lib/stores/org-store";
import { orgApi } from "@/lib/api/organization";

/**
 * Organizations dashboard (plan D10). Lists every org the user belongs to;
 * "Open" makes it the active org and jumps to its agents.
 */
export default function DashboardHomePage() {
  const router = useRouter();
  const organizations = useOrgStore((s) => s.organizations);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  const [createOpen, setCreateOpen] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  // Member counts come from GET /organization/{id}.users — one small call per
  // org; failures just leave the count blank.
  const orgIdsKey = useMemo(
    () => organizations.map((o) => o.id).sort().join(","),
    [organizations]
  );
  useEffect(() => {
    if (!orgIdsKey) return;
    let cancelled = false;
    const ids = orgIdsKey.split(",");
    Promise.allSettled(ids.map((id) => orgApi.get(id))).then((results) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") next[ids[i]] = r.value.users?.length ?? 0;
      });
      setMemberCounts(next);
    });
    return () => {
      cancelled = true;
    };
  }, [orgIdsKey]);

  const openOrg = useCallback(
    (orgId: string) => {
      setActiveOrg(orgId);
      router.push("/app/agents");
    },
    [router, setActiveOrg]
  );

  useGetPageData(
    () => ({
      data: {
        page: "organizations",
        active_org_id: activeOrgId,
        organizations: organizations.map((o) => ({
          id: o.id,
          name: o.name,
          member_count: memberCounts[o.id] ?? null,
        })),
        note:
          "Organizations dashboard. 'Open' switches the active organization and routes to its agents. Creating an organization is a user action.",
      },
      actions: {
        open_organization: {
          description: "Switch to an organization by id and go to its agents page.",
          argsSchema: {
            type: "object",
            properties: { org_id: { type: "string" } },
            required: ["org_id"],
            additionalProperties: false,
          },
        },
      },
    }),
    [organizations, activeOrgId, memberCounts]
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "open_organization") {
        const orgId = (args as { org_id?: string })?.org_id;
        if (!orgId || !organizations.some((o) => o.id === orgId)) {
          return { ok: false, error: "unknown org_id" };
        }
        openOrg(orgId);
        return { ok: true, org_id: orgId };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [openOrg, organizations]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Pick a workspace to open, or create a new one."
        actions={
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New organization
          </Button>
        }
      />

      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create an organization to start building agents."
          action={
            <Button variant="gradient" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              New organization
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((o) => (
            <OrgCard
              key={o.id}
              org={o}
              memberCount={memberCounts[o.id]}
              active={o.id === activeOrgId}
              onOpen={openOrg}
            />
          ))}
        </div>
      )}

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
