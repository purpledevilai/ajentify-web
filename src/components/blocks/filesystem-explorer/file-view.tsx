"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Loader2, PencilLine, Pencil, RotateCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/primitives/button";
import { CodeEditor } from "@/components/primitives/code-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MarkdownView } from "@/components/blocks/markdown-view";
import { filesystemsApi } from "@/lib/api/filesystems";
import { ApiError, getErrorCode, getErrorMessage } from "@/lib/api/errors";
import { isMarkdownPath } from "@/lib/filesystems/paths";
import { formatBytes, type TreeNode } from "@/lib/filesystems/tree";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import type { ApiFilesystemFileNode } from "@/types/api";
import { cn } from "@/lib/utils";
import { NodeIcon } from "./explorer-tree";
import type { NodeActions } from "./node-actions-menu";

export interface FileViewProps {
  filesystemId: string;
  node: TreeNode;
  actions: NodeActions;
  /** Tell the parent whether there are unsaved edits (navigation guard). */
  onDirtyChange: (dirty: boolean) => void;
  /** Called after a successful save so the parent can refresh tree metadata. */
  onSaved: (file: { path: string; size_bytes: number; updated_at: number }) => void;
  /** Open the editor immediately (e.g. right after creating the file). */
  startInEditMode?: boolean;
}

type Mode = "preview" | "edit";

export function FileView({
  filesystemId,
  node,
  actions,
  onDirtyChange,
  onSaved,
  startInEditMode = false,
}: FileViewProps) {
  const isMarkdown = isMarkdownPath(node.path);
  const [file, setFile] = useState<ApiFilesystemFileNode | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; code?: string } | null>(null);
  const [mode, setMode] = useState<Mode>(isMarkdown && !startInEditMode ? "preview" : "edit");
  const [saving, setSaving] = useState(false);
  const loadSeq = useRef(0);

  const dirty = file !== null && draft !== file.content;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  // `fetchFile` performs no synchronous setState so the mount effect can call
  // it directly; `load` (retry / reload) flips the loading flag first.
  const fetchFile = useCallback(() => {
    const seq = ++loadSeq.current;
    return filesystemsApi.node(filesystemId, node.path).then(
      (res) => {
        if (seq !== loadSeq.current) return;
        if (res.type !== "file") {
          setLoadError({ message: "This path is a folder." });
        } else {
          setFile(res);
          setDraft(res.content);
        }
        setLoading(false);
      },
      (err: unknown) => {
        if (seq !== loadSeq.current) return;
        const code = getErrorCode(err);
        setLoadError({
          message: getErrorMessage(
            err,
            code === "file_too_large"
              ? "This file is too large to open in the browser."
              : "Failed to load file"
          ),
          code,
        });
        setLoading(false);
      }
    );
  }, [filesystemId, node.path]);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    return fetchFile();
  }, [fetchFile]);

  // The parent keys this component by path, so a path change remounts us —
  // one initial load is all that's needed here.
  useEffect(() => {
    void fetchFile();
  }, [fetchFile]);

  async function save() {
    if (!file || !dirty || saving) return;
    setSaving(true);
    try {
      const res = await filesystemsApi.updateFile(filesystemId, {
        path: node.path,
        content: draft,
        expected_updated_at: file.updated_at,
      });
      const next: ApiFilesystemFileNode = {
        ...file,
        content: draft,
        size_bytes: res.size_bytes,
        updated_at: res.updated_at,
      };
      setFile(next);
      onSaved({ path: node.path, size_bytes: res.size_bytes, updated_at: res.updated_at });
      toast.success("File saved");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && getErrorCode(err) === "conflict") {
        toast.error("Someone else saved this file since you opened it.", {
          description: "Reload to see the latest version — your edits will be discarded.",
          duration: 10000,
          action: {
            label: "Reload",
            onClick: () => void load(),
          },
        });
      } else {
        toast.error(getErrorMessage(err, "Failed to save file"));
      }
    } finally {
      setSaving(false);
    }
  }

  // Cmd/Ctrl+S saves while the editor is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, draft, dirty, saving]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold tracking-tight">
            <NodeIcon node={node} className="size-5" />
            <span className="truncate">{node.name}</span>
          </h2>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {file && (
              <>
                <span>{formatBytes(file.size_bytes)}</span>
                <span title={formatDateTime(file.updated_at)}>
                  Updated {formatRelativeTime(file.updated_at)}
                </span>
              </>
            )}
            {isMarkdown && <Badge variant="outline">Markdown</Badge>}
            {dirty && (
              <Badge variant="secondary" className="text-muted-foreground">
                Unsaved changes
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isMarkdown && file && (
            <div className="border-border inline-flex rounded-md border p-0.5">
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors",
                  mode === "preview" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={mode === "preview"}
              >
                <Eye className="size-3.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={cn(
                  "inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors",
                  mode === "edit" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={mode === "edit"}
              >
                <Pencil className="size-3.5" />
                Edit
              </button>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => file && setDraft(file.content)}
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button variant="gradient" size="sm" onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => actions.onMove(node)} aria-label="Rename or move">
            <PencilLine className="size-4" />
            <span className="hidden sm:inline">Rename / move</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => actions.onDelete(node)}
            aria-label="Delete file"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {loading && !file ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-5/6" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : loadError ? (
          <div className="border-border flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
            <p className="text-destructive text-sm">{loadError.message}</p>
            {loadError.code !== "file_too_large" && (
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RotateCw className="size-4" />
                Retry
              </Button>
            )}
          </div>
        ) : file ? (
          mode === "preview" && isMarkdown ? (
            <div className="border-border bg-card rounded-lg border p-5">
              {draft.trim().length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  Empty file. Switch to Edit to add content.
                </p>
              ) : (
                <MarkdownView>{draft}</MarkdownView>
              )}
            </div>
          ) : (
            <CodeEditor
              language={isMarkdown ? "markdown" : "plain"}
              value={draft}
              onChange={setDraft}
              lineWrapping
              minHeight="24rem"
              maxHeight="calc(100vh - 20rem)"
              className="bg-card"
            />
          )
        ) : null}
      </div>
    </div>
  );
}
