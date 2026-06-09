"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sanitizeStageName, isValidStageName } from "@/lib/utils/stage-name";

export interface CreateStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (stage: { stage_id: string; name: string }) => void;
  onCreate: (params: {
    name: string;
    description?: string | null;
  }) => Promise<{ stage_id: string; name: string }>;
}

export function CreateStageDialog({
  open,
  onOpenChange,
  onCreated,
  onCreate,
}: CreateStageDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidStageName(name);
  const canSubmit = valid && !submitting;

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setError(null);
    setSubmitting(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleNameChange = (raw: string) => {
    setName(sanitizeStageName(raw));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const stage = await onCreate({
        name,
        description: description.trim() || null,
      });
      reset();
      onOpenChange(false);
      onCreated(stage);
    } catch (err) {
      setError((err as Error).message ?? "Failed to create stage");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New stage</DialogTitle>
          <DialogDescription>
            Stages scope deploy-managed resources. The name must be lowercase
            letters, digits, and hyphens, starting with a letter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Name</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="frontend-staging"
              className="font-mono"
              autoFocus
              maxLength={63}
              aria-invalid={name.length > 0 && !valid}
            />
            <p className="text-muted-foreground text-xs">
              Lowercase letters, digits, and hyphens. Must start with a letter.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stage-description">Description</Label>
            <Textarea
              id="stage-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

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
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
