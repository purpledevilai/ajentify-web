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
import { sanitizeStageName, isValidStageName } from "@/lib/utils/stage-name";
import { stagesActions } from "@/lib/stores/stages-store";
import { deployApi } from "@/lib/api/deploy";
import { getErrorMessage } from "@/lib/api/errors";

export interface CloneStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceStageId: string;
  sourceStageName: string;
  orgId?: string | null;
  onCloned: (newStageId: string) => void;
}

export function CloneStageDialog({
  open,
  onOpenChange,
  sourceStageId,
  sourceStageName,
  orgId,
  onCloned,
}: CloneStageDialogProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const valid = isValidStageName(name);
  const sameAsSource = name === sourceStageName;
  const validationError = !name
    ? null
    : !valid
      ? "Use lowercase letters, digits, and hyphens. Must start with a letter."
      : sameAsSource
        ? "Pick a different name from the source stage."
        : null;
  const canSubmit = valid && !sameAsSource && !submitting;

  const handleNameChange = (raw: string) => {
    setName(sanitizeStageName(raw));
  };

  const handleClone = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const manifest = await stagesActions.getManifest(sourceStageId);
      const result = await deployApi.deploy(name, manifest, orgId ?? undefined);
      onOpenChange(false);
      onCloned(result.stage_id);
    } catch (err) {
      setError(getErrorMessage(err, "Clone failed"));
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Clone{" "}
            <span className="font-mono font-bold">{sourceStageName}</span> to a
            new stage
          </DialogTitle>
          <DialogDescription>
            Deploys the current manifest of{" "}
            <span className="font-semibold">{sourceStageName}</span> into a
            brand new stage. The source stage stays untouched — useful for
            promoting <code>staging</code> to <code>production</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="clone-stage-name">New stage name</Label>
          <Input
            id="clone-stage-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="frontend-prod"
            className="font-mono"
            autoFocus
            maxLength={63}
            aria-invalid={!!validationError}
          />
          {validationError ? (
            <p className="text-destructive text-xs">{validationError}</p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Lowercase letters, digits, and hyphens. Must start with a letter.
            </p>
          )}
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
            variant="gradient"
            size="md"
            disabled={!canSubmit}
            onClick={handleClone}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Cloning…" : "Clone & deploy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
