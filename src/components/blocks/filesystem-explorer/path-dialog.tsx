"use client";

import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { externalPath, validateInternalPath } from "@/lib/filesystems/paths";

export type PathDialogKind = "new-folder" | "new-file" | "move";

export interface PathDialogSubmit {
  path: string;
  description: string;
  createParents: boolean;
}

export interface PathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PathDialogKind;
  filesystemId: string;
  /** Prefilled destination (internal path). */
  initialPath: string;
  /** For `move`: the node being moved (shown for context). */
  sourcePath?: string;
  /** For `move`: the node type (folder/file) — affects copy. */
  sourceType?: "folder" | "file";
  /** Existing internal paths, used to flag `already_exists` client-side. */
  existingPaths?: ReadonlySet<string>;
  onSubmit: (values: PathDialogSubmit) => Promise<void>;
}

const COPY: Record<
  PathDialogKind,
  { title: string; description: string; submit: string; busy: string }
> = {
  "new-folder": {
    title: "New folder",
    description:
      "Folders carry a description the agent reads when listing the parent — say what belongs inside.",
    submit: "Create folder",
    busy: "Creating…",
  },
  "new-file": {
    title: "New file",
    description:
      "Use a .md extension for markdown — it previews rendered and the agent reads it as text either way.",
    submit: "Create file",
    busy: "Creating…",
  },
  move: {
    title: "Rename or move",
    description:
      "Enter the full destination path. Changing only the last segment renames; changing the folder moves.",
    submit: "Move",
    busy: "Moving…",
  },
};

/**
 * Destination-path dialog shared by New folder / New file / Rename-or-move.
 * Validates the internal path client-side with the same rules as the API.
 * Mount it fresh for each use (the parent renders it conditionally) — state
 * is initialised from props once.
 */
export function PathDialog({
  open,
  onOpenChange,
  kind,
  filesystemId,
  initialPath,
  sourcePath,
  sourceType,
  existingPaths,
  onSubmit,
}: PathDialogProps) {
  const [path, setPath] = useState(initialPath);
  const [description, setDescription] = useState("");
  const [createParents, setCreateParents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validation = useMemo(() => {
    const v = validateInternalPath(path);
    if (!v.ok) return v;
    if (kind === "move" && sourcePath) {
      if (v.path === sourcePath)
        return { ok: false as const, error: "Destination is the same as the current path." };
      if (sourceType === "folder" && v.path.startsWith(`${sourcePath}/`))
        return { ok: false as const, error: "Cannot move a folder into itself." };
    }
    if (existingPaths?.has(v.path))
      return { ok: false as const, error: "Something already exists at this path." };
    return v;
  }, [path, kind, sourcePath, sourceType, existingPaths]);

  const copy = COPY[kind];
  const canSubmit = validation.ok && !submitting;

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!validation.ok || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        path: validation.path,
        description: description.trim(),
        createParents,
      });
      onOpenChange(false);
    } catch (err) {
      const code = getErrorCode(err);
      const fallback =
        code === "already_exists"
          ? "Something already exists at this path."
          : code === "not_found"
            ? "The parent folder does not exist. Turn on “Create missing folders” or pick another path."
            : code === "invalid_path"
              ? "The API rejected this path."
              : "Request failed";
      setError(getErrorMessage(err, fallback));
      setSubmitting(false);
    }
  };

  const showError = touched && !validation.ok ? validation.error : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          {kind === "move" && sourcePath && (
            <div className="text-muted-foreground text-xs">
              Moving{" "}
              <code className="text-foreground font-mono">{sourcePath}</code>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fs-path">
              {kind === "move" ? "Destination path" : "Path"}
            </Label>
            <Input
              id="fs-path"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder={kind === "new-folder" ? "/projects/acme" : "/projects/acme/notes.md"}
              className="font-mono"
              autoFocus
              spellCheck={false}
              aria-invalid={!!showError}
            />
            {showError ? (
              <p className="text-destructive text-xs">{showError}</p>
            ) : (
              <p className="text-muted-foreground truncate font-mono text-xs">
                Agent path: {externalPath(filesystemId, validation.ok ? validation.path : path)}
              </p>
            )}
          </div>

          {kind === "new-folder" && (
            <div className="space-y-2">
              <Label htmlFor="fs-folder-description">Description</Label>
              <Textarea
                id="fs-folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What lives in this folder, so the agent knows when to open it."
                rows={3}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="fs-create-parents">Create missing folders</Label>
              <p className="text-muted-foreground text-xs">
                Create any intermediate folders in the path (with empty descriptions).
              </p>
            </div>
            <Switch
              id="fs-create-parents"
              checked={createParents}
              onCheckedChange={setCreateParents}
            />
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
            <Button type="submit" variant="gradient" size="md" disabled={!canSubmit}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? copy.busy : copy.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
