"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeletionProgress } from "@/components/blocks/deletion-progress";
import { useJobPoll } from "@/lib/hooks/use-job-poll";
import { userApi } from "@/lib/api/user";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { resetAllStores } from "@/lib/stores/registry";
import type { StoredDeletionJob } from "@/lib/jobs/deletion-job-storage";

export interface DeletionJobDialogProps {
  /** The in-flight job; `null` keeps the dialog closed. */
  job: StoredDeletionJob | null;
  /** Called when the job is done (after navigation/logout) or dismissed after an error. */
  onFinished: () => void;
}

/**
 * Shows `DeletionProgress` for a running org/account deletion job. Cannot be
 * dismissed while the job is `queued`/`in_progress`. On `completed`:
 *  - organization → refetch /user, resync org store, go to `/app` (or
 *    `/create-organization` when no orgs remain);
 *  - user → `logout()` and go home.
 * On `error` the dialog stays open with the message and a Close button.
 */
export function DeletionJobDialog({ job, onFinished }: DeletionJobDialogProps) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);

  const { job: polled, error: pollError, isPolling } = useJobPoll(job?.jobId ?? null);
  const status = polled?.status;
  const terminal = status === "completed" || status === "error";
  // Polling gave up (e.g. 404 — the job record is gone after a reload long
  // after completion). Let the user close the dialog.
  const stalled = !!job && !isPolling && !terminal;
  const running = !!job && !terminal && !stalled;
  const showClose = status === "error" || stalled;
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!job || !polled || polled.status !== "completed") return;
    if (handledRef.current === job.jobId) return;
    handledRef.current = job.jobId;

    let cancelled = false;
    (async () => {
      if (job.kind === "user") {
        toast.success("Your account has been deleted.");
        onFinished();
        logout();
        router.replace("/");
        return;
      }
      // organization
      let remaining = 0;
      try {
        const u = await userApi.get();
        if (cancelled) return;
        setUser(u);
        syncOrgs();
        remaining = u.organizations.length;
      } catch {
        // /user failed — fall back to the store minus the deleted org.
        const current = useOrgStore.getState().organizations;
        remaining = current.length;
      }
      // The deleted org's data may still be cached in the list stores.
      resetAllStores();
      toast.success(job.label ? `Deleted ${job.label}` : "Organization deleted");
      onFinished();
      router.replace(remaining === 0 ? "/create-organization" : "/app");
    })();
    return () => {
      cancelled = true;
    };
  }, [job, polled, logout, onFinished, router, setUser, syncOrgs]);

  const title =
    job?.kind === "user" ? "Deleting your account" : "Deleting organization";

  return (
    <Dialog
      open={!!job}
      onOpenChange={(next) => {
        if (!next && !running) onFinished();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!running}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {running
              ? "This runs in the background. Keep this page open to watch progress — reloading is safe."
              : status === "error"
                ? "The deletion did not finish. Nothing further will be removed; you can try again or contact support."
                : stalled
                  ? "We could not check on this deletion job any more. It may have already finished — reload to see the current state."
                  : "Finishing up…"}
          </DialogDescription>
        </DialogHeader>

        {job && (
          <DeletionProgress
            kind={job.kind}
            label={job.label}
            job={polled}
            pollError={pollError}
          />
        )}

        {stalled && pollError && (
          <p className="text-destructive text-sm">{pollError}</p>
        )}

        {showClose && (
          <DialogFooter>
            <Button variant="outline" size="md" onClick={onFinished}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
