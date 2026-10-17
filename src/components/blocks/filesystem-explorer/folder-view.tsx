"use client";

import { useState } from "react";
import { FilePlus2, FolderPlus, Loader2, PencilLine, Trash2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/date";
import { formatBytes, type TreeNode } from "@/lib/filesystems/tree";
import { cn } from "@/lib/utils";
import { NodeIcon } from "./explorer-tree";
import type { NodeActions } from "./node-actions-menu";

export interface FolderViewProps {
  node: TreeNode;
  /** Root only: the filesystem name is editable here. */
  isRoot: boolean;
  onSelect: (path: string) => void;
  onSaveDescription: (description: string) => Promise<void>;
  onSaveName?: (name: string) => Promise<void>;
  actions: NodeActions;
}

export function FolderView({
  node,
  isRoot,
  onSelect,
  onSaveDescription,
  onSaveName,
  actions,
}: FolderViewProps) {
  // `null` draft = "not editing": show the node's current value. This keeps
  // the view in sync after a save (node props change) without an effect.
  const [descDraft, setDescDraft] = useState<string | null>(null);
  const [savingDesc, setSavingDesc] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);

  const description = descDraft ?? node.description ?? "";
  const name = nameDraft ?? node.name;
  const descDirty = description !== (node.description ?? "");
  const nameDirty = isRoot && name.trim() !== node.name && name.trim().length > 0;

  async function saveDesc() {
    setSavingDesc(true);
    try {
      await onSaveDescription(description.trim());
      setDescDraft(null);
    } catch {
      // Parent already toasted; keep the draft so the user can retry.
    } finally {
      setSavingDesc(false);
    }
  }

  async function saveName() {
    if (!onSaveName || !nameDirty) {
      setNameDraft(null);
      return;
    }
    setSavingName(true);
    try {
      await onSaveName(name.trim());
      setNameDraft(null);
    } catch {
      // Parent toasted; keep the draft.
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRoot && onSaveName ? (
            <div className="flex items-center gap-2">
              <input
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setNameDraft(null);
                }}
                aria-label="Filesystem name"
                spellCheck={false}
                className="font-display -ml-2 w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-xl font-semibold tracking-tight outline-none transition-colors hover:bg-muted/60 focus:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              {savingName && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
            </div>
          ) : (
            <h2 className="font-display flex items-center gap-2 text-xl font-semibold tracking-tight">
              <NodeIcon node={node} open className="size-5" />
              <span className="truncate">{node.name}</span>
            </h2>
          )}
          <p className="text-muted-foreground mt-0.5 text-xs">
            {node.children.length === 0
              ? "Empty folder"
              : `${node.children.filter((c) => c.type === "folder").length} folders · ${node.children.filter((c) => c.type === "file").length} files`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => actions.onNewFolder(node)}>
            <FolderPlus className="size-4" />
            New folder
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.onNewFile(node)}>
            <FilePlus2 className="size-4" />
            New file
          </Button>
          {!isRoot && (
            <>
              <Button variant="ghost" size="sm" onClick={() => actions.onMove(node)}>
                <PencilLine className="size-4" />
                Rename / move
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => actions.onDelete(node)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="folder-description">Description</Label>
        <Textarea
          id="folder-description"
          value={description}
          onChange={(e) => setDescDraft(e.target.value)}
          rows={2}
          placeholder={
            isRoot
              ? "What this filesystem holds — the agent reads this when it lists the root."
              : "What lives in this folder — the agent reads this when it lists the parent."
          }
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {isRoot
              ? "Shown to the agent as the root folder's description."
              : "Shown to the agent alongside the folder name in list_folder."}
          </p>
          {descDirty && (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDescDraft(null)}
                disabled={savingDesc}
              >
                Cancel
              </Button>
              <Button variant="solid" size="sm" onClick={saveDesc} disabled={savingDesc}>
                {savingDesc && <Loader2 className="size-4 animate-spin" />}
                {savingDesc ? "Saving…" : "Save description"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="hidden px-3 py-2 text-left font-medium sm:table-cell">Details</th>
              <th className="w-28 px-3 py-2 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {node.children.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground px-3 py-8 text-center text-sm">
                  Nothing here yet. Add a folder or a file.
                </td>
              </tr>
            ) : (
              node.children.map((child) => (
                <tr
                  key={child.path}
                  tabIndex={0}
                  onClick={() => onSelect(child.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSelect(child.path);
                  }}
                  className={cn(
                    "border-border cursor-pointer border-t transition-colors outline-none",
                    "hover:bg-muted/40 focus-visible:bg-muted/40"
                  )}
                >
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <NodeIcon node={child} />
                      <span className="truncate font-medium">{child.name}</span>
                    </div>
                    {child.type === "folder" && child.description && (
                      <div className="text-muted-foreground mt-0.5 truncate pl-6 text-xs sm:hidden">
                        {child.description}
                      </div>
                    )}
                  </td>
                  <td className="text-muted-foreground hidden truncate px-3 py-2 text-xs sm:table-cell">
                    {child.type === "folder" ? (
                      child.description || <span className="italic">No description</span>
                    ) : (
                      formatBytes(child.size_bytes)
                    )}
                  </td>
                  <td
                    className="text-muted-foreground px-3 py-2 text-right text-xs tabular-nums"
                    title={child.updated_at ? formatDateTime(child.updated_at) : undefined}
                  >
                    {child.updated_at ? formatRelativeTime(child.updated_at) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
