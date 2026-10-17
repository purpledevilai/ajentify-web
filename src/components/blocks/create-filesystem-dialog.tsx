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
import { getErrorMessage } from "@/lib/api/errors";
import type { ApiFilesystem } from "@/types/api";

export interface CreateFilesystemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (params: {
    name: string;
    description: string;
  }) => Promise<ApiFilesystem>;
  onCreated: (fs: ApiFilesystem) => void;
}

export function CreateFilesystemDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: CreateFilesystemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !submitting;

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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const fs = await onCreate({
        name: name.trim(),
        description: description.trim(),
      });
      reset();
      onOpenChange(false);
      onCreated(fs);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create filesystem"));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New filesystem</DialogTitle>
          <DialogDescription>
            A filesystem memory is a tree of folders and text files your
            agents navigate with the Filesystem tools. The description is
            what the agent reads at the root, so say what lives here.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="fs-name">Name</Label>
            <Input
              id="fs-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Company knowledge"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fs-description">Description</Label>
            <Textarea
              id="fs-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Policies, procedures and FAQs the support agent should consult before answering."
              rows={3}
            />
            <p className="text-muted-foreground text-xs">
              Shown to the agent when it lists the root folder.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter className="mt-4">
            <DialogClose
              render={
                <Button type="button" variant="ghost" size="md" disabled={submitting}>
                  Cancel
                </Button>
              }
            />
            <Button
              type="submit"
              variant="gradient"
              size="md"
              disabled={!canSubmit}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
