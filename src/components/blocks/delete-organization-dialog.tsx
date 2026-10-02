"use client";

import { useState } from "react";
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
import { orgApi } from "@/lib/api/organization";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import type { ApiJobAccepted } from "@/types/api";

export const ORG_DELETE_RESOURCES = [
  "agents",
  "contexts (chats)",
  "tools",
  "parameter definitions",
  "JSON documents",
  "data windows",
  "structured response endpoints",
  "integrations",
  "MCP connections",
  "API keys",
  "clients",
  "jobs",
  "stages",
  "chat pages",
];

export interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: { id: string; name: string };
  /** Called with the 202 body once the backend has accepted the deletion job. */
  onStarted: (job: ApiJobAccepted) => void;
}

export function DeleteOrganizationDialog({
  open,
  onOpenChange,
  org,
  onStarted,
}: DeleteOrganizationDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the dialog opens (state adjustment during
  // render — see react.dev "Adjusting some state when a prop changes").
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setConfirmInput("");
      setError(null);
      setSubmitting(false);
    }
  }

  // Exact, case-sensitive match; trimmed because mobile keyboards add spaces.
  const canDelete = confirmInput.trim() === org.name && !submitting;

  async function onConfirm() {
    if (!canDelete) return;
    setError(null);
    setSubmitting(true);
    try {
      const job = await orgApi.delete(org.id, confirmInput.trim());
      onStarted(job);
      onOpenChange(false);
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === "confirm_name_mismatch") {
        setError("The name you typed does not match this organization's name.");
      } else if (code === "stripe_cancel_failed") {
        setError(
          getErrorMessage(
            err,
            "We could not cancel this organization's Stripe subscription, so nothing was deleted. Try again or contact support."
          )
        );
      } else if (code === "api_key_forbidden") {
        setError("Organizations can only be deleted from a signed-in user session.");
      } else {
        setError(getErrorMessage(err, "Unable to delete organization"));
      }
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete organization &quot;{org.name}&quot;?</DialogTitle>
          <DialogDescription>
            This permanently deletes{" "}
            <strong className="text-foreground">{org.name}</strong> and everything
            in it. It cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="text-muted-foreground space-y-3 text-sm">
          <p>
            First, we cancel this organization&apos;s Stripe subscription
            immediately (no further charges; remaining credit is forfeited).
          </p>
          <div className="space-y-1.5">
            <p>Then we delete all of its resources:</p>
            <ul className="flex flex-wrap gap-1.5">
              {ORG_DELETE_RESOURCES.map((r) => (
                <li
                  key={r}
                  className="bg-muted text-foreground rounded px-1.5 py-0.5 text-xs"
                >
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <p>
            All members, including you, lose access. Members are not deleted —
            only their membership in this organization.
          </p>
          <p>
            Deletion runs in the background; you can watch progress here.
            Deployed API keys stop working as soon as they are removed.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-org-name">
            Type{" "}
            <code className="bg-muted rounded px-1 py-0.5 text-xs">{org.name}</code>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-org-name"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder={org.name}
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
            {submitting ? "Starting deletion…" : "Delete organization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
