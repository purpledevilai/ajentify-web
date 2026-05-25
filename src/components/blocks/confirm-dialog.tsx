"use client";

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

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "destructive" | "solid";
  /** When true, blocks dismiss via overlay/escape and disables Cancel. */
  loading?: boolean;
  /** Shown on the confirm button while `loading`. Defaults to `${confirmLabel}…`. */
  loadingLabel?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * Reusable confirmation modal — replaces `window.confirm()` for destructive
 * or other actions that need explicit user consent.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  loading = false,
  loadingLabel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" size="md" disabled={loading}>
                {cancelLabel}
              </Button>
            }
          />
          <Button
            variant={confirmVariant}
            size="md"
            disabled={loading}
            onClick={() => onConfirm()}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading
              ? (loadingLabel ?? `${confirmLabel}…`)
              : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
