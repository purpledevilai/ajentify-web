"use client";

import {
  FilePlus2,
  FolderInput,
  FolderPlus,
  MoreHorizontal,
  PencilLine,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/primitives/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TreeNode } from "@/lib/filesystems/tree";
import { cn } from "@/lib/utils";

export interface NodeActions {
  onNewFolder: (parent: TreeNode) => void;
  onNewFile: (parent: TreeNode) => void;
  /** Import a local folder's contents into this folder. */
  onImportHere: (folder: TreeNode) => void;
  onMove: (node: TreeNode) => void;
  onDelete: (node: TreeNode) => void;
}

/** "…" menu for a tree row / header. Root gets only the create actions. */
export function NodeActionsMenu({
  node,
  actions,
  className,
  size = "sm",
}: {
  node: TreeNode;
  actions: NodeActions;
  className?: string;
  size?: "sm" | "md";
}) {
  const isRoot = node.path === "/";
  const isFolder = node.type === "folder";
  return (
    <div
      className={className}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className={cn(size === "sm" ? "size-6" : "size-8")}
              aria-label="Node actions"
            />
          }
        >
          <MoreHorizontal className={size === "sm" ? "size-3.5" : "size-4"} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {isFolder && (
            <>
              <DropdownMenuItem onClick={() => actions.onNewFolder(node)}>
                <FolderPlus className="size-4" />
                New folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onNewFile(node)}>
                <FilePlus2 className="size-4" />
                New file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onImportHere(node)}>
                <FolderInput className="size-4" />
                Import folder here…
              </DropdownMenuItem>
            </>
          )}
          {!isRoot && (
            <>
              {isFolder && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => actions.onMove(node)}>
                <PencilLine className="size-4" />
                Rename or move
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(node)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
