"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orgApi } from "@/lib/api/organization";
import { userApi } from "@/lib/api/user";
import { getErrorMessage } from "@/lib/api/errors";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";

export interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the org exists and is the active org. Defaults to navigating to /app/agents. */
  onCreated?: (org: { id: string; name: string }) => void;
}

/**
 * In-app "New organization" dialog. Deliberately does NOT route through
 * `/create-organization` — the setup layout bounces users who already have
 * orgs back to `/app`.
 */
export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateOrganizationDialogProps) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !submitting;

  const reset = useCallback(() => {
    setName("");
    setError(null);
    setSubmitting(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await orgApi.create(trimmed);
      // The JWT predates the new org; /user reads the latest list.
      const u = await userApi.get();
      setUser(u);
      syncOrgs();
      setActiveOrg(created.org_id);
      reset();
      onOpenChange(false);
      toast.success(`Created ${created.name}`);
      if (onCreated) onCreated({ id: created.org_id, name: created.name });
      else router.push("/app/agents");
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to create organization"));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New organization</DialogTitle>
          <DialogDescription>
            All agents, tools, and resources live inside an organization. You
            can rename it later and invite teammates from its settings page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-org-name">Organization name</Label>
            <Input
              id="new-org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              autoFocus
              autoComplete="organization"
              maxLength={120}
              disabled={submitting}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          {/* Hidden submit so Enter in the input submits the form. */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" size="md" disabled={submitting}>
                Cancel
              </Button>
            }
          />
          <Button
            variant="gradient"
            size="md"
            disabled={!canSubmit}
            onClick={() => handleSubmit()}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
