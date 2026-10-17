"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { filesystemsApi } from "@/lib/api/filesystems";
import { getErrorMessage } from "@/lib/api/errors";
import { isMarkdownPath } from "@/lib/filesystems/paths";
import type { TreeNode } from "@/lib/filesystems/tree";
import type { FilesystemSearchMatch } from "@/types/api";
import { cn } from "@/lib/utils";
import { NodeActionsMenu, type NodeActions } from "./node-actions-menu";

/* -------------------------------------------------------------------------- */
/* Tree pane: search box + recursive rows                                     */
/* -------------------------------------------------------------------------- */

export interface ExplorerTreeProps {
  filesystemId: string;
  root: TreeNode | null;
  loading: boolean;
  selectedPath: string;
  expanded: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
  actions: NodeActions;
  query: string;
  onQueryChange: (q: string) => void;
}

export function ExplorerTree({
  filesystemId,
  root,
  loading,
  selectedPath,
  expanded,
  onSelect,
  onToggleExpand,
  actions,
  query,
  onQueryChange,
}: ExplorerTreeProps) {
  const searching = query.trim().length > 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative shrink-0 p-2">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search names and contents…"
          className="pr-8 pl-8"
          aria-label="Search filesystem"
        />
        {searching && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 rounded p-0.5"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" role="tree">
        {searching ? (
          <SearchResults
            filesystemId={filesystemId}
            query={query}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ) : loading && !root ? (
          <div className="space-y-2 p-1">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <Skeleton className="h-6 w-4/6" />
          </div>
        ) : root ? (
          <>
            <TreeRow
              node={root}
              depth={0}
              selectedPath={selectedPath}
              expanded={expanded}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              actions={actions}
            />
            {root.children.length === 0 && (
              <p className="text-muted-foreground mt-2 rounded-md border border-dashed px-3 py-4 text-center text-xs">
                Empty filesystem. Use the actions on the right to add a folder or file.
              </p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  selectedPath,
  expanded,
  onSelect,
  onToggleExpand,
  actions,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string;
  expanded: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
  actions: NodeActions;
}) {
  const isFolder = node.type === "folder";
  const isRoot = node.path === "/";
  const isOpen = isRoot || expanded.has(node.path);
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={isFolder ? isOpen : undefined}
        title={node.description || node.path}
        onClick={() => onSelect(node.path)}
        onDoubleClick={() => {
          if (isFolder && !isRoot) onToggleExpand(node.path);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node.path);
          } else if (e.key === "ArrowRight" && isFolder && !isOpen) {
            e.preventDefault();
            onToggleExpand(node.path);
          } else if (e.key === "ArrowLeft" && isFolder && isOpen && !isRoot) {
            e.preventDefault();
            onToggleExpand(node.path);
          }
        }}
        className={cn(
          "group/row flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1 text-sm outline-none transition-colors",
          "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50",
          isSelected && "bg-primary/10 hover:bg-primary/15"
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {isFolder && !isRoot ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.path);
            }}
            aria-label={isOpen ? "Collapse" : "Expand"}
            className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded"
          >
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span aria-hidden className="inline-block size-4 shrink-0" />
        )}

        <NodeIcon node={node} open={isOpen} />

        <div className="min-w-0 flex-1">
          <div className={cn("truncate", isFolder ? "font-medium" : "")}>
            {isRoot ? node.name || "Root" : node.name}
          </div>
          {isFolder && node.description && (
            <div className="text-muted-foreground truncate text-[11px] leading-tight">
              {node.description}
            </div>
          )}
        </div>

        <NodeActionsMenu
          node={node}
          actions={actions}
          className="ml-auto shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100"
        />
      </div>

      {isFolder && isOpen && (
        <div role="group">
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function NodeIcon({
  node,
  open = false,
  className,
}: {
  node: Pick<TreeNode, "type" | "path">;
  open?: boolean;
  className?: string;
}) {
  const cls = cn("size-4 shrink-0", className);
  if (node.type === "folder")
    return open ? (
      <FolderOpen className={cn(cls, "text-primary")} />
    ) : (
      <Folder className={cn(cls, "text-primary")} />
    );
  if (isMarkdownPath(node.path))
    return <FileText className={cn(cls, "text-muted-foreground")} />;
  return <File className={cn(cls, "text-muted-foreground")} />;
}

/* -------------------------------------------------------------------------- */
/* Search results                                                             */
/* -------------------------------------------------------------------------- */

function SearchResults({
  filesystemId,
  query,
  selectedPath,
  onSelect,
}: {
  filesystemId: string;
  query: string;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  const [matches, setMatches] = useState<FilesystemSearchMatch[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const mySeq = ++seq.current;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await filesystemsApi.search(filesystemId, q, {
          scope: "both",
          limit: 50,
        });
        if (mySeq !== seq.current) return;
        setMatches(res.matches);
        setTruncated(res.truncated);
      } catch (err) {
        if (mySeq !== seq.current) return;
        setError(getErrorMessage(err, "Search failed"));
      } finally {
        if (mySeq === seq.current) setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [filesystemId, query]);

  if (error) return <p className="text-destructive p-2 text-xs">{error}</p>;
  if (matches === null || (loading && matches.length === 0)) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-2 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Searching…
      </div>
    );
  }
  if (matches.length === 0) {
    return (
      <p className="text-muted-foreground p-2 text-xs">No matches for “{query.trim()}”.</p>
    );
  }
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground flex items-center justify-between px-1 pt-1 pb-1.5 text-[11px]">
        <span>
          {matches.length} {matches.length === 1 ? "match" : "matches"}
          {truncated && " (more not shown)"}
        </span>
        {loading && <Loader2 className="size-3 animate-spin" />}
      </div>
      {matches.map((m, i) => (
        <button
          key={`${m.path}-${m.matched_on}-${i}`}
          type="button"
          onClick={() => onSelect(m.path)}
          className={cn(
            "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            "hover:bg-muted/60",
            selectedPath === m.path && "bg-primary/10"
          )}
        >
          <span className="flex w-full min-w-0 items-center gap-1.5">
            <NodeIcon node={m} />
            <span className="truncate font-mono text-xs">{m.path}</span>
          </span>
          {m.snippet && (
            <span className="text-muted-foreground line-clamp-2 pl-5.5 text-[11px] leading-snug">
              {m.snippet}
            </span>
          )}
          <span className="text-muted-foreground/70 pl-5.5 text-[10px] uppercase tracking-wide">
            {m.matched_on}
          </span>
        </button>
      ))}
    </div>
  );
}
