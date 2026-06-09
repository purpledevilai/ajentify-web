"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LOGICAL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

function suggestLogicalName(displayName: string): string {
  const cleaned = displayName
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+/, "")
    .replace(/^[0-9]+/, "")
    .replace(/_+$/, "")
    .slice(0, 63);
  return cleaned || "resource";
}

export interface PickableResource {
  id: string;
  name: string;
  description?: string | null;
}

export interface AddExistingResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kindLabel: string;
  stageName: string;
  availableResources: PickableResource[];
  onAttach: (resourceId: string, logicalName: string) => Promise<void>;
  onAttached?: () => void;
}

export function AddExistingResourceDialog({
  open,
  onOpenChange,
  kindLabel,
  stageName,
  availableResources,
  onAttach,
  onAttached,
}: AddExistingResourceDialogProps) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<PickableResource | null>(null);
  const [logicalName, setLogicalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setPicked(null);
      setLogicalName("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableResources;
    return availableResources.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q)
    );
  }, [availableResources, search]);

  const logicalNameValid = LOGICAL_NAME_PATTERN.test(logicalName);

  const handlePick = (resource: PickableResource) => {
    setPicked(resource);
    setLogicalName(suggestLogicalName(resource.name));
    setError(null);
  };

  const handleBack = () => {
    setPicked(null);
    setLogicalName("");
    setError(null);
  };

  const handleSave = async () => {
    if (!picked || !logicalNameValid) return;
    setSaving(true);
    setError(null);
    try {
      await onAttach(picked.id, logicalName);
      onAttached?.();
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message ?? "Failed to attach");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {picked && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                disabled={saving}
                className="size-7 shrink-0"
              >
                <ArrowLeft className="size-4" />
              </Button>
            )}
            <div>
              <DialogTitle>
                Add existing {kindLabel} to{" "}
                <span className="font-mono">{stageName}</span>
              </DialogTitle>
              <DialogDescription>
                {picked
                  ? `Choose a logical name for this ${kindLabel}.`
                  : `Pick an unattached ${kindLabel} to bring under this stage.`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Pick a resource */}
        {!picked && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder={`Search unattached ${kindLabel}s\u2026`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {availableResources.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No unattached {kindLabel}s in this organization.
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No matches for &ldquo;{search}&rdquo;.
              </p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handlePick(r)}
                    className="border-border hover:bg-muted/50 w-full cursor-pointer rounded-md border p-3 text-left transition-colors"
                  >
                    <span className="text-sm font-medium">{r.name}</span>
                    {r.description && (
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {r.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Set logical name */}
        {picked && (
          <div className="space-y-4">
            <div className="border-border rounded-md border p-3">
              <p className="text-muted-foreground text-xs">
                Selected {kindLabel}
              </p>
              <p className="text-sm font-medium">{picked.name}</p>
              {picked.description && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {picked.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="logical-name">Logical name</Label>
              <Input
                id="logical-name"
                value={logicalName}
                onChange={(e) => setLogicalName(e.target.value)}
                placeholder="e.g. navigate_to_page"
                className="font-mono"
                autoFocus
                maxLength={63}
                aria-invalid={!!logicalName && !logicalNameValid}
              />
              {logicalName && !logicalNameValid ? (
                <p className="text-destructive text-xs">
                  Must start with a lowercase letter; only lowercase letters,
                  digits, and underscores.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Will be reachable as{" "}
                  <code className="bg-muted rounded px-1 py-0.5 text-xs">
                    ({stageName}, {logicalName || "logical_name"})
                  </code>
                  .
                </p>
              )}
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            size="md"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          {picked && (
            <Button
              variant="gradient"
              size="md"
              disabled={!logicalNameValid || saving}
              onClick={handleSave}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Attaching\u2026" : "Attach"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
