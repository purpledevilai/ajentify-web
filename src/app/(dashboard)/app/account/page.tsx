"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Mail,
  Plus,
  User as UserIcon,
} from "lucide-react";
import { useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import { CreateOrganizationDialog } from "@/components/blocks/create-organization-dialog";
import { DeleteAccountDialog } from "@/components/blocks/delete-account-dialog";
import { DeletionJobDialog } from "@/components/blocks/deletion-job-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { useDeletionJob } from "@/lib/hooks/use-deletion-job";

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const deletion = useDeletionJob();

  // Read-only page: surface profile data, no actions. Deleting the account
  // is a user-only action (type-to-confirm modal). useGetPageData must run
  // unconditionally before any early returns.
  useGetPageData(
    () => ({
      data: {
        page: "account",
        user: user
          ? {
              id: user.id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              organizations: user.organizations,
            }
          : null,
        note: "Read-only profile. Creating an organization and deleting the account are user actions.",
      },
      actions: {},
    }),
    [user],
  );

  if (!user) return null;

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Account"
        subtitle="Your profile and account settings."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How Ajentify identifies you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row icon={UserIcon} label="Name" value={fullName || "—"} />
          <Row icon={Mail} label="Email" value={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Workspaces you&apos;re a member of.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.organizations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You&apos;re not a member of any organizations.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {user.organizations.map((org) => {
                const active = org.id === activeOrgId;
                return (
                  <li
                    key={org.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Building2 className="text-muted-foreground size-4 shrink-0" />
                      <span className="truncate text-sm">{org.name}</span>
                      {active && <Badge variant="secondary">Current</Badge>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActiveOrg(org.id);
                        router.push("/app/agents");
                      }}
                    >
                      Open
                      <ArrowRight className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New organization
          </Button>
        </CardContent>
      </Card>

      <Card className="ring-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account. You are removed from every
            organization; any organization where you are the only member is
            deleted too — its Stripe subscription is canceled first, then all
            of its agents, contexts, tools, documents, integrations, API keys
            and other resources are removed. Deletion runs in the background
            and signs you out when it finishes.{" "}
            <strong className="text-foreground">This cannot be undone.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />

      <DeleteAccountDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        user={user}
        onStarted={(job) =>
          deletion.start({ jobId: job.job_id, kind: "user", label: user.email })
        }
      />

      <DeletionJobDialog job={deletion.job} onFinished={deletion.clear} />
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="text-muted-foreground size-4" />
      <span className="text-muted-foreground w-20 text-xs uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
