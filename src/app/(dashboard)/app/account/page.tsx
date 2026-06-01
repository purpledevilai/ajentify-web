"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Mail, User as UserIcon } from "lucide-react";
import { useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import { userApi } from "@/lib/api/user";
import { getErrorMessage } from "@/lib/api/errors";

export default function AccountPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        note: "Read-only profile. Deleting an account is a user action.",
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

  // Type-to-confirm: requires an exact, case-sensitive email match. Trim
  // because users sometimes auto-add a trailing space on mobile.
  const canDelete = confirmInput.trim() === user.email;

  async function onDelete() {
    setError(null);
    setDeleting(true);
    try {
      await userApi.delete();
      // Server has invalidated the row; clear local state and bounce home.
      logout();
      router.replace("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to delete account"));
      setDeleting(false);
    }
  }

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
        <CardContent>
          {user.organizations.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You&apos;re not a member of any organizations.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {user.organizations.map((org) => (
                <li
                  key={org.id}
                  className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <Building2 className="text-muted-foreground size-4" />
                  <span className="text-sm">{org.name}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="ring-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account. Any organization where you are the
            last remaining member will be torn down along with its agents,
            tools, chats, integrations, and API keys.{" "}
            <strong className="text-foreground">This cannot be undone.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              setError(null);
              setConfirmInput("");
              setConfirmOpen(true);
            }}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently remove your profile and, for any
              organization where you are the only member, all of its agents,
              tools, chats, integrations, and API keys. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-email">
              Type{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">
                {user.email}
              </code>{" "}
              to confirm
            </Label>
            <Input
              id="confirm-email"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={user.email}
            />
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={!canDelete || deleting}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
