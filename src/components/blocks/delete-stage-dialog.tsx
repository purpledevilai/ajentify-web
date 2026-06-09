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
import type { DeleteStageMode } from "@/types/api";
import { cn } from "@/lib/utils";

export interface DeleteStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageName: string;
  loading?: boolean;
  onConfirm: (mode: DeleteStageMode) => void | Promise<void>;
}

export function DeleteStageDialog({
  open,
  onOpenChange,
  stageName,
  loading = false,
  onConfirm,
}: DeleteStageDialogProps) {
  const [mode, setMode] = useState<DeleteStageMode>("detach");

  useEffect(() => {
    if (open) setMode("detach");
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Delete stage <span className="font-bold">{stageName}</span>
          </DialogTitle>
          <DialogDescription>
            Pick what should happen to the resources owned by this stage. This
            action can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <ModeOption
            selected={mode === "detach"}
            onSelect={() => setMode("detach")}
            label="Detach resources, then delete stage"
            description="Agents, tools, SREs, JSON documents, and their parameter definitions stay in your org but lose their stage binding. They can be re-attached to another stage later."
          />
          <ModeOption
            selected={mode === "destroy"}
            onSelect={() => setMode("destroy")}
            label="Destroy stage and all resources in it"
            description="Permanently deletes every agent, tool, SRE, JSON document, and parameter definition that belongs to this stage. Use when you're tearing the stage down for good."
            destructive
          />
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="md"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="md"
            disabled={loading}
            onClick={() => onConfirm(mode)}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading
              ? mode === "destroy"
                ? "Destroying…"
                : "Detaching…"
              : mode === "destroy"
                ? "Destroy stage"
                : "Detach & delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeOption({
  selected,
  onSelect,
  label,
  description,
  destructive,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full cursor-pointer rounded-md border p-3 text-left transition-colors",
        selected
          ? destructive
            ? "border-destructive/50 bg-destructive/5"
            : "border-border bg-muted/50"
          : "border-transparent hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected
              ? destructive
                ? "border-destructive"
                : "border-primary"
              : "border-muted-foreground/40"
          )}
        >
          {selected && (
            <div
              className={cn(
                "size-2 rounded-full",
                destructive ? "bg-destructive" : "bg-primary"
              )}
            />
          )}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            destructive && selected && "text-destructive"
          )}
        >
          {label}
        </span>
      </div>
      <p className="text-muted-foreground mt-1 pl-6 text-xs">{description}</p>
    </button>
  );
}
