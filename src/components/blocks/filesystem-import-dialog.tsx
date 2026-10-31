"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderInput,
  Loader2,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/api/errors";
import { filesystemsApi } from "@/lib/api/filesystems";
import { filesystemsActions } from "@/lib/stores/filesystems-store";
import {
  pickedFilesFromFileList,
  planImport,
  runImport,
  type ImportClient,
  type ImportPlan,
  type ImportProgress,
  type ImportResult,
  type ImportSkipped,
  type SkipReason,
} from "@/lib/filesystems/archive";
import { ROOT_PATH } from "@/lib/filesystems/paths";
import { formatBytes } from "@/lib/filesystems/tree";
import { cn } from "@/lib/utils";

export type FilesystemImportMode =
  | { kind: "new" }
  | { kind: "into"; filesystemId: string; targetPath: string };

export interface FilesystemImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: FilesystemImportMode;
  /**
   * Called once the import finished (or was cancelled and the user chose to
   * keep). `filesystemId` is the new or target filesystem.
   */
  onFinished: (info: {
    filesystemId: string;
    result: ImportResult;
    targetPath: string;
  }) => void;
}

export const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  ignored: "ignored",
  binary: "not a text file",
  too_large: "larger than 256 KB",
  invalid_path: "invalid path",
};

type Step = "pick" | "review" | "running" | "report";

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Message for errors thrown by the API client *or* plain `Error`s. */
function errorText(err: unknown, fallback: string): string {
  const plain = err instanceof Error && err.message ? err.message : fallback;
  return getErrorMessage(err, plain);
}

function makeClient(filesystemId: string): ImportClient {
  return {
    createFolder: (path, description, createParents) =>
      filesystemsApi
        .createFolder(filesystemId, {
          path,
          description,
          create_parents: createParents || undefined,
        })
        .then(() => undefined),
    createFile: (path, content, createParents) =>
      filesystemsApi
        .createFile(filesystemId, {
          path,
          content,
          create_parents: createParents || undefined,
        })
        .then(() => undefined),
  };
}

export function FilesystemImportDialog({
  open,
  onOpenChange,
  mode,
  onFinished,
}: FilesystemImportDialogProps) {
  const targetPath = mode.kind === "into" ? mode.targetPath : ROOT_PATH;

  const [step, setStep] = useState<Step>("pick");
  const [planning, setPlanning] = useState(false);
  const [pickedCount, setPickedCount] = useState(0);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({
    done: 0,
    total: 0,
    current: null,
  });
  const [cancelling, setCancelling] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // `new` mode: id of the filesystem created on Import, kept so a retry after
  // a failed run never creates a second one.
  const createdIdRef = useRef<string | null>(null);
  const currentFilesystemId = () =>
    mode.kind === "into" ? mode.filesystemId : createdIdRef.current;

  const busy = planning || submitting || step === "running" || deleting;

  const reset = () => {
    setStep("pick");
    setPlanning(false);
    setPickedCount(0);
    setPlan(null);
    setName("");
    setDescription("");
    setSubmitting(false);
    setProgress({ done: 0, total: 0, current: null });
    setCancelling(false);
    setResult(null);
    setDeleting(false);
    setError(null);
    abortRef.current = null;
    createdIdRef.current = null;
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const finish = () => {
    const filesystemId = currentFilesystemId();
    const r = result;
    close();
    if (filesystemId && r) onFinished({ filesystemId, result: r, targetPath });
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) {
      // Dismissing the report is the same as "Done" / "Keep": the import
      // already happened, so the caller still needs to hear about it.
      if (step === "report" && result) finish();
      else close();
      return;
    }
    onOpenChange(next);
  };

  // --- pick ------------------------------------------------------------------
  const onFilesPicked = async (input: HTMLInputElement) => {
    const files = input.files;
    if (!files || files.length === 0) return;
    setError(null);
    setPlanning(true);
    setPickedCount(files.length);
    try {
      const picked = pickedFilesFromFileList(files);
      const nextPlan = await planImport(picked, { targetPath });
      setPlan(nextPlan);
      if (mode.kind === "new") {
        setName(nextPlan.rootName);
        setDescription(nextPlan.rootDescription);
      }
      setStep("review");
    } catch (err) {
      setError(errorText(err, "Could not read the selected folder"));
    } finally {
      setPlanning(false);
      // So re-picking the same folder fires `change` again.
      input.value = "";
    }
  };

  // --- running ---------------------------------------------------------------
  const startImport = async () => {
    if (!plan) return;
    setError(null);
    setSubmitting(true);
    try {
      let filesystemId = currentFilesystemId();
      if (!filesystemId) {
        const fs = await filesystemsActions.create({
          name: name.trim(),
          description: description.trim(),
        });
        filesystemId = fs.filesystem_id;
        createdIdRef.current = filesystemId;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setCancelling(false);
      setProgress({
        done: 0,
        total: plan.folders.length + plan.files.length,
        current: null,
      });
      setStep("running");
      setSubmitting(false);

      const r = await runImport(plan, makeClient(filesystemId), {
        signal: controller.signal,
        onProgress: setProgress,
      });
      setResult(r);
      setStep("report");
    } catch (err) {
      setError(errorText(err, "Import failed"));
      setStep("review");
    } finally {
      setSubmitting(false);
      abortRef.current = null;
    }
  };

  const cancelImport = () => {
    if (!abortRef.current) return;
    setCancelling(true);
    abortRef.current.abort();
  };

  // --- report ------------------------------------------------------------------
  const deletePartial = async () => {
    const filesystemId = createdIdRef.current;
    if (!filesystemId) return;
    setDeleting(true);
    setError(null);
    try {
      await filesystemsActions.delete(filesystemId);
      close();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete filesystem"));
      setDeleting(false);
    }
  };

  const canImport =
    !!plan &&
    plan.folders.length + plan.files.length > 0 &&
    (mode.kind === "into" || name.trim().length > 0) &&
    !submitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode.kind === "new" ? "Import folder as a new filesystem" : "Import folder here"}
          </DialogTitle>
          <DialogDescription>
            {step === "pick" &&
              "Choose a folder on your computer. Text and markdown files are imported; a .description.md file in a folder becomes that folder's description. Binary files are skipped."}
            {step === "review" && "Review what will be imported, then start."}
            {step === "running" && "Importing… keep this window open."}
            {step === "report" && "Import finished."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              aria-label="Folder to import"
              data-testid="import-folder-input"
              onChange={(e) => void onFilesPicked(e.currentTarget)}
              {...({ webkitdirectory: "" } as Record<string, string>)}
            />
            {planning ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Reading {plural(pickedCount, "file")}…
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => inputRef.current?.click()}
              >
                <FolderInput className="size-4" />
                Choose folder…
              </Button>
            )}
            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        )}

        {step === "review" && plan && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (canImport) void startImport();
            }}
          >
            <div className="space-y-2">
              <p className="text-sm">
                {plural(plan.folders.length, "folder")} ·{" "}
                {plural(plan.files.length, "file")} · {formatBytes(plan.totalBytes)}
              </p>
              <SkippedList skipped={plan.skipped} />
            </div>

            {mode.kind === "new" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fs-import-name">Name</Label>
                  <Input
                    id="fs-import-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Company knowledge"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fs-import-description">Description</Label>
                  <Textarea
                    id="fs-import-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What lives in this filesystem — the agent reads this at the root."
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm">
                Into{" "}
                <code className="bg-muted rounded px-1 py-0.5 font-mono text-xs">
                  {targetPath}
                </code>
              </p>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={submitting}
                onClick={() => {
                  setPlan(null);
                  setError(null);
                  setStep("pick");
                }}
              >
                Choose a different folder
              </Button>
              <Button type="submit" variant="gradient" size="md" disabled={!canImport}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Creating…" : "Import"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "running" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground uppercase tracking-wide">
                  Progress
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <Bar value={progress.done} total={progress.total} className="h-2" />
              <p
                className="text-muted-foreground truncate font-mono text-xs"
                title={progress.current ?? undefined}
              >
                {progress.current ?? "\u00a0"}
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="md"
                disabled={cancelling}
                onClick={cancelImport}
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                {cancelling ? "Cancelling…" : "Cancel"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "report" && result && (
          <div className="space-y-4">
            <ReportHeader result={result} />

            <div className="space-y-1 text-sm">
              <CountLine label="Folders" counts={result.folders} />
              <CountLine label="Files" counts={result.files} />
            </div>

            {result.items.length > 0 && (
              <ul className="divide-border max-h-40 divide-y overflow-y-auto rounded-md border font-mono text-xs">
                {result.items.map((item) => (
                  <li
                    key={`${item.type}:${item.path}`}
                    className="flex items-start gap-2 px-2 py-1"
                  >
                    <span className="min-w-0 flex-1 truncate" title={item.path}>
                      {item.path}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1 py-0.5",
                        item.status === "failed"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.status === "exists" ? "already existed" : "failed"}
                    </span>
                    {item.error && (
                      <span className="text-destructive shrink-0 truncate" title={item.error}>
                        {item.error}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {plan && <SkippedList skipped={plan.skipped} />}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <DialogFooter className="mt-4">
              {mode.kind === "new" && result.cancelled && (
                <Button
                  type="button"
                  variant="destructive"
                  size="md"
                  disabled={deleting}
                  onClick={() => void deletePartial()}
                >
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  {deleting ? "Deleting…" : "Delete partial filesystem"}
                </Button>
              )}
              <Button
                type="button"
                variant="gradient"
                size="md"
                disabled={deleting}
                onClick={finish}
              >
                {mode.kind === "into"
                  ? "Done"
                  : result.cancelled
                    ? "Keep"
                    : "Open filesystem"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReportHeader({ result }: { result: ImportResult }) {
  const failed = result.folders.failed + result.files.failed;
  if (result.cancelled) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-amber-500" />
        Import cancelled
      </div>
    );
  }
  if (failed > 0) {
    return (
      <div className="text-destructive flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4" />
        Import finished with {plural(failed, "error")}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      <CheckCircle2 className="size-4 text-emerald-500" />
      Import complete
    </div>
  );
}

function CountLine({
  label,
  counts,
}: {
  label: string;
  counts: ImportResult["folders"];
}) {
  return (
    <p>
      <span className="font-medium">{label}:</span>{" "}
      <span className="tabular-nums">
        created {counts.created} · already existed {counts.exists} ·{" "}
        <span className={counts.failed > 0 ? "text-destructive" : undefined}>
          failed {counts.failed}
        </span>
      </span>
    </p>
  );
}

function SkippedList({ skipped }: { skipped: ImportSkipped[] }) {
  const [openList, setOpenList] = useState(false);
  if (skipped.length === 0) return null;
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpenList((v) => !v)}
        aria-expanded={openList}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
      >
        {openList ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {plural(skipped.length, "skipped", "skipped")}
      </button>
      {openList && (
        <ul className="divide-border max-h-40 divide-y overflow-y-auto rounded-md border font-mono text-xs">
          {skipped.map((s) => (
            <li
              key={s.relativePath}
              className="flex items-start gap-2 px-2 py-1"
            >
              <span className="min-w-0 flex-1 truncate" title={s.relativePath}>
                {s.relativePath}
              </span>
              <span className="text-muted-foreground shrink-0">
                {SKIP_REASON_LABELS[s.reason]}
                {s.detail ? ` — ${s.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Bar({
  value,
  total,
  className,
}: {
  value: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div
      className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
