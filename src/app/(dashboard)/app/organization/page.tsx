"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  UserMinus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { DeleteOrganizationDialog } from "@/components/blocks/delete-organization-dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { orgApi } from "@/lib/api/organization";
import { userApi } from "@/lib/api/user";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { useDeletionJob } from "@/lib/hooks/use-deletion-job";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiInvite, ApiOrgMember } from "@/types/api";

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const orgId = useOrgStore((s) => s.activeOrgId);
  const organizations = useOrgStore((s) => s.organizations);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);
  const activeOrg = organizations.find((o) => o.id === orgId) ?? null;

  const deletion = useDeletionJob();

  // --- Load -----------------------------------------------------------------
  // `loading` is derived from which org the data was loaded for, so switching
  // orgs flips back to loading without a setState in the effect body.
  const [loadedOrgId, setLoadedOrgId] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<{ orgId: string; message: string } | null>(null);
  const loadError = loadErr && loadErr.orgId === orgId ? loadErr.message : null;
  const loading = loadedOrgId !== orgId && !loadError;
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [members, setMembers] = useState<ApiOrgMember[]>([]);
  const [invites, setInvites] = useState<ApiInvite[]>([]);

  const refreshUser = useCallback(async () => {
    const u = await userApi.get();
    setUser(u);
    syncOrgs();
    return u;
  }, [setUser, syncOrgs]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    Promise.all([
      orgApi.get(orgId),
      orgApi.listMembers(orgId),
      orgApi.listInvites(orgId),
    ])
      .then(([org, m, inv]) => {
        if (cancelled) return;
        setName(org.name);
        setSavedName(org.name);
        setMembers(m.members);
        setInvites(inv.invites);
        setLoadErr(null);
        setLoadedOrgId(orgId);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLoadErr({
            orgId,
            message: getErrorMessage(err, "Unable to load organization settings"),
          });
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // --- Rename ---------------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const trimmedName = name.trim();
  const canSave = !!orgId && !saving && trimmedName.length > 0 && trimmedName !== savedName;

  const onSave = useCallback(async () => {
    if (!orgId || !canSave) return;
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await orgApi.rename(orgId, trimmedName);
      setName(updated.name);
      setSavedName(updated.name);
      setSaved(true);
      // Switcher/dashboard read names from /user.
      await refreshUser().catch(() => {});
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Unable to rename organization"));
    } finally {
      setSaving(false);
    }
  }, [orgId, canSave, trimmedName, refreshUser]);

  // --- Members --------------------------------------------------------------
  const [removeTarget, setRemoveTarget] = useState<ApiOrgMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const onlyMember = members.length <= 1;
  const userId = user?.id;

  const onRemove = useCallback(async () => {
    if (!orgId || !removeTarget) return;
    setRemoveError(null);
    setRemoving(true);
    try {
      await orgApi.removeMember(orgId, removeTarget.user_id);
      const isSelf = removeTarget.user_id === userId;
      setMembers((prev) => prev.filter((m) => m.user_id !== removeTarget.user_id));
      setRemoveTarget(null);
      if (isSelf) {
        toast.success(`You left ${savedName}`);
        await refreshUser().catch(() => {});
        router.replace("/app");
      } else {
        toast.success(`Removed ${memberLabel(removeTarget)}`);
      }
    } catch (err: unknown) {
      const code = getErrorCode(err);
      setRemoveError(
        code === "last_member"
          ? "This is the only member. Delete the organization instead."
          : getErrorMessage(err, "Unable to remove member")
      );
    } finally {
      setRemoving(false);
    }
  }, [orgId, removeTarget, userId, savedName, refreshUser, router]);

  // --- Invites --------------------------------------------------------------
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const inviteTrimmed = inviteEmail.trim();
  const canInvite = !!orgId && !inviting && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteTrimmed);

  const onInvite = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!orgId || !canInvite) return;
      setInviteError(null);
      setInviting(true);
      try {
        const r = await orgApi.invite(orgId, inviteTrimmed);
        if (r.status === "added") {
          setMembers((prev) =>
            prev.some((m) => m.user_id === r.member.user_id) ? prev : [...prev, r.member]
          );
          toast.success(`${r.member.email} already had an account — added as a member`);
        } else {
          setInvites((prev) =>
            prev.some((i) => i.invite_id === r.invite.invite_id) ? prev : [...prev, r.invite]
          );
          toast.success(`Invite sent to ${r.invite.email}`);
        }
        setInviteEmail("");
      } catch (err: unknown) {
        const code = getErrorCode(err);
        const friendly: Record<string, string> = {
          already_member: "That person is already a member of this organization.",
          already_invited:
            "There is already a pending invite for that address. Revoke it to re-send.",
          cannot_invite_self: "You can't invite yourself.",
          invite_limit:
            "This organization has reached the limit of 50 pending invites. Revoke some first.",
          api_key_forbidden: "Invites can only be sent from a signed-in user session.",
        };
        setInviteError(
          (code && friendly[code]) ?? getErrorMessage(err, "Unable to send invite")
        );
      } finally {
        setInviting(false);
      }
    },
    [orgId, canInvite, inviteTrimmed]
  );

  const onRevoke = useCallback(
    async (invite: ApiInvite) => {
      if (!orgId) return;
      setRevokingId(invite.invite_id);
      try {
        await orgApi.revokeInvite(orgId, invite.invite_id);
        setInvites((prev) => prev.filter((i) => i.invite_id !== invite.invite_id));
        toast.success(`Revoked invite for ${invite.email}`);
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, "Unable to revoke invite"));
      } finally {
        setRevokingId(null);
      }
    },
    [orgId]
  );

  // --- Delete ---------------------------------------------------------------
  const [deleteOpen, setDeleteOpen] = useState(false);

  // --- Aj page data ---------------------------------------------------------
  const pageData = useMemo(
    () => ({
      page: "organization",
      org_id: orgId,
      name: savedName,
      member_count: members.length,
      members: members.map((m) => ({
        user_id: m.user_id,
        email: m.email,
        name: memberLabel(m),
      })),
      pending_invites: invites.map((i) => ({
        email: i.email,
        expires_at: i.expires_at,
      })),
      note:
        "Organization settings. Renaming, inviting, removing members and deleting the organization are user actions.",
    }),
    [orgId, savedName, members, invites]
  );
  useGetPageData(() => ({ data: pageData, actions: {} }), [pageData]);

  if (!orgId || !activeOrg) return null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Organization"
        subtitle="Name, members and invites for the current organization."
      />

      {loadError && <p className="text-destructive text-sm">{loadError}</p>}

      {/* Rename */}
      <Card>
        <CardHeader>
          <CardTitle>Name</CardTitle>
          <CardDescription>Shown in the organization switcher and invites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              disabled={loading || saving}
              maxLength={120}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onSave();
              }}
            />
          </div>
          {saveError && <p className="text-destructive text-sm">{saveError}</p>}
          <div className="flex items-center gap-3">
            <Button variant="gradient" onClick={onSave} disabled={!canSave}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && !saving && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Everyone here has full access to this organization. Remove yourself to leave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members found.</p>
          ) : (
            <ul className="divide-border divide-y">
              {members.map((m) => {
                const isSelf = m.user_id === user?.id;
                return (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="truncate font-medium">{memberLabel(m)}</span>
                        {isSelf && <Badge variant="secondary">You</Badge>}
                      </div>
                      {memberLabel(m) !== m.email && (
                        <div className="text-muted-foreground truncate text-xs">
                          {m.email}
                        </div>
                      )}
                    </div>
                    {/* Disabled buttons swallow pointer events, so the tooltip lives on the wrapper. */}
                    <span
                      title={
                        onlyMember
                          ? "This is the only member — delete the organization instead"
                          : undefined
                      }
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={onlyMember}
                        onClick={() => {
                          setRemoveError(null);
                          setRemoveTarget(m);
                        }}
                      >
                        <UserMinus className="size-4" />
                        {isSelf ? "Leave" : "Remove"}
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Invites</CardTitle>
          <CardDescription>
            People with an Ajentify account are added immediately; everyone else
            gets an email and joins when they sign in with that address. Invites
            expire after 14 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={onInvite} className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <div className="flex gap-2">
              <Input
                id="invite-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="teammate@example.com"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteError(null);
                }}
                disabled={loading || inviting}
              />
              <Button type="submit" variant="gradient" disabled={!canInvite}>
                {inviting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {inviting ? "Sending…" : "Send invite"}
              </Button>
            </div>
            {inviteError && <p className="text-destructive text-sm">{inviteError}</p>}
          </form>

          <div className="space-y-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">
              Pending
            </div>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : invites.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending invites.</p>
            ) : (
              <ul className="divide-border divide-y">
                {invites.map((i) => (
                  <li
                    key={i.invite_id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Mail className="text-muted-foreground size-4 shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-sm">{i.email}</div>
                        <div
                          className="text-muted-foreground text-xs"
                          title={formatDateTime(i.expires_at)}
                        >
                          Expires {formatRelativeTime(i.expires_at)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revokingId === i.invite_id}
                      onClick={() => onRevoke(i)}
                      aria-label={`Revoke invite for ${i.email}`}
                    >
                      {revokingId === i.invite_id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="ring-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete <strong className="text-foreground">{savedName || activeOrg.name}</strong>.
            Its Stripe subscription is cancelled first, then every agent,
            context, tool, document, integration, API key and other resource is
            removed. Members keep their accounts.{" "}
            <strong className="text-foreground">This cannot be undone.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={loading}
          >
            Delete organization
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title={
          removeTarget?.user_id === user?.id
            ? `Leave ${savedName}?`
            : `Remove ${removeTarget ? memberLabel(removeTarget) : "member"}?`
        }
        description={
          <>
            {removeTarget?.user_id === user?.id ? (
              <>You will lose access to this organization and everything in it.</>
            ) : (
              <>
                <span className="text-foreground font-medium">
                  {removeTarget?.email}
                </span>{" "}
                will immediately lose access to this organization. Their account
                is not deleted.
              </>
            )}
            {removeError && (
              <span className="text-destructive mt-2 block">{removeError}</span>
            )}
          </>
        }
        confirmLabel={removeTarget?.user_id === user?.id ? "Leave" : "Remove"}
        loading={removing}
        loadingLabel={removeTarget?.user_id === user?.id ? "Leaving…" : "Removing…"}
        onConfirm={onRemove}
      />

      <DeleteOrganizationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        org={{ id: orgId, name: savedName || activeOrg.name }}
        onStarted={(job) =>
          deletion.start({
            jobId: job.job_id,
            kind: "organization",
            label: savedName || activeOrg.name,
          })
        }
      />

      <DeletionJobDialog job={deletion.job} onFinished={deletion.clear} />
    </div>
  );
}

function memberLabel(m: ApiOrgMember): string {
  const full = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return full || m.email;
}
