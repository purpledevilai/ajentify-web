"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { orgApi } from "@/lib/api/organization";
import { userApi } from "@/lib/api/user";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { computeOrgFates, type OrgFate } from "@/lib/org/org-fates";
import type { ApiUser, ApiUserDeletionAccepted } from "@/types/api";

export interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Pick<ApiUser, "id" | "email" | "organizations">;
  /** Called with the 202 body once the backend has accepted the deletion job. */
  onStarted: (job: ApiUserDeletionAccepted) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  user,
  onStarted,
}: DeleteAccountDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fates, setFates] = useState<OrgFate[] | null>(null);
  const [fatesError, setFatesError] = useState<string | null>(null);

  // Reset the form each time the dialog opens (state adjustment during
  // render — see react.dev "Adjusting some state when a prop changes").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setConfirmInput("");
      setError(null);
      setSubmitting(false);
      setFates(null);
      setFatesError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    // Compute each org's fate client-side (sole member → deleted; otherwise
    // left) so the user sees the list BEFORE confirming.
    let cancelled = false;
    const ids = user.organizations.map((o) => o.id);
    if (ids.length === 0) {
      queueMicrotask(() => {
        if (!cancelled) setFates([]);
      });
      return () => {
        cancelled = true;
      };
    }
    Promise.allSettled(ids.map((id) => orgApi.get(id)))
      .then((results) => {
        if (cancelled) return;
        const orgs: Array<{ org_id: string; name: string; users: string[] }> = [];
        let failed = 0;
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            orgs.push({
              org_id: r.value.org_id,
              name: r.value.name,
              users: r.value.users ?? [],
            });
          } else {
            failed += 1;
            // Unknown membership → assume the safer (worse) outcome.
            const ref = user.organizations[i];
            orgs.push({ org_id: ref.id, name: ref.name, users: [user.id] });
          }
        });
        setFates(computeOrgFates(orgs, user.id));
        if (failed > 0) {
          setFatesError(
            `Could not load membership for ${failed} organization${failed === 1 ? "" : "s"}; shown as deleted to be safe.`
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, user.id, user.organizations]);

  const canDelete = confirmInput.trim() === user.email && !submitting;

  async function onConfirm() {
    if (!canDelete) return;
    setError(null);
    setSubmitting(true);
    try {
      const job = await userApi.delete(confirmInput.trim());
      onStarted(job);
      onOpenChange(false);
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === "confirm_email_mismatch") {
        setError("The email you typed does not match your account email.");
      } else if (code === "stripe_cancel_failed") {
        setError(
          getErrorMessage(
            err,
            "We could not cancel a Stripe subscription, so nothing was deleted. Try again or contact support."
          )
        );
      } else {
        setError(getErrorMessage(err, "Unable to delete account"));
      }
      setSubmitting(false);
    }
  }

  const toDelete = fates?.filter((f) => f.action === "delete") ?? [];
  const toLeave = fates?.filter((f) => f.action === "leave") ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your Ajentify account (
            <strong className="text-foreground">{user.email}</strong>). It cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground space-y-3 text-sm">
          <p>You will be removed from every organization you belong to.</p>
          <p>
            Any organization where you are the{" "}
            <strong className="text-foreground">only member</strong> will be
            deleted too — its Stripe subscription is canceled first, then all
            of its agents, contexts, tools, parameter definitions, JSON
            documents, data windows, structured response endpoints,
            integrations, MCP connections, API keys, clients, jobs, stages and
            chat pages are removed.
          </p>

          {fates === null ? (
            <div className="space-y-2" aria-busy>
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ) : fates.length > 0 ? (
            <ul className="divide-border divide-y rounded-md border">
              {toDelete.map((f) => (
                <li key={f.org_id} className="px-3 py-2">
                  You are the only member of{" "}
                  <strong className="text-foreground">{f.name}</strong> — it will
                  be deleted and its subscription cancelled
                </li>
              ))}
              {toLeave.map((f) => (
                <li key={f.org_id} className="px-3 py-2">
                  You will leave{" "}
                  <strong className="text-foreground">{f.name}</strong>
                </li>
              ))}
            </ul>
          ) : null}
          {fatesError && <p className="text-destructive text-xs">{fatesError}</p>}

          <p>
            Deletion runs in the background. You&apos;ll be signed out once it
            finishes.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-email">
            Type{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">{user.email}</code>{" "}
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
            disabled={submitting}
            onKeyDown={(e) => {
              if (e.key === "Enter") void onConfirm();
            }}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="md"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="md"
            disabled={!canDelete}
            onClick={onConfirm}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
