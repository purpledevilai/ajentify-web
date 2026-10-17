import type { ApiFilesystemTreeNode } from "@/types/api";
import { ROOT_PATH, parentPath } from "./paths";

/** A folder or file in the client-side tree built from `GET /tree`. */
export interface TreeNode {
  path: string;
  name: string;
  type: "folder" | "file";
  description: string | null;
  size_bytes: number;
  updated_at: number | null;
  /** Folders only — sorted folders-first, then alphabetically. */
  children: TreeNode[];
}

export interface FilesystemTree {
  root: TreeNode;
  /** Every node (including the synthetic root) keyed by internal path. */
  byPath: Map<string, TreeNode>;
}

/** Folders first, then case-insensitive alpha — matches `list_folder`. */
export function compareNodes(a: TreeNode, b: TreeNode): number {
  if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function makeNode(n: ApiFilesystemTreeNode): TreeNode {
  return {
    path: n.path,
    name: n.name,
    type: n.type,
    description: n.description ?? null,
    size_bytes: n.size_bytes ?? 0,
    updated_at: n.updated_at ?? null,
    children: [],
  };
}

/**
 * Build a nested tree from the flat `/tree` rows. The root is synthetic
 * (`/` is not a row server-side); its description is the filesystem's.
 *
 * Tolerant of missing intermediate folders — a node whose parent row is
 * absent is attached to the nearest present ancestor (or the root) so a
 * partially-returned tree still renders.
 */
export function buildTree(
  nodes: ApiFilesystemTreeNode[],
  root: { name: string; description: string }
): FilesystemTree {
  const rootNode: TreeNode = {
    path: ROOT_PATH,
    name: root.name,
    type: "folder",
    description: root.description,
    size_bytes: 0,
    updated_at: null,
    children: [],
  };
  const byPath = new Map<string, TreeNode>([[ROOT_PATH, rootNode]]);

  const parentOf = new Map<string, string>();
  for (const n of nodes) {
    if (byPath.has(n.path)) continue;
    byPath.set(n.path, makeNode(n));
    parentOf.set(n.path, n.parent_path || parentPath(n.path));
  }

  for (const [path, declaredParent] of parentOf) {
    const node = byPath.get(path)!;
    let parent = declaredParent;
    while (parent !== ROOT_PATH && !byPath.has(parent)) parent = parentPath(parent);
    const parentNode = byPath.get(parent) ?? rootNode;
    if (parentNode !== node) parentNode.children.push(node);
  }

  for (const node of byPath.values()) {
    if (node.children.length > 1) node.children.sort(compareNodes);
  }

  return { root: rootNode, byPath };
}

/** All ancestor folder paths of `path` (excluding itself), root first. */
export function ancestorPaths(path: string): string[] {
  const out: string[] = [];
  let p = path;
  while (p !== ROOT_PATH) {
    p = parentPath(p);
    out.unshift(p);
  }
  return out;
}

/** Recursive descendant counts for a folder — used in delete confirmations. */
export function countDescendants(node: TreeNode): {
  folders: number;
  files: number;
} {
  let folders = 0;
  let files = 0;
  const stack = [...node.children];
  while (stack.length) {
    const n = stack.pop()!;
    if (n.type === "folder") {
      folders++;
      stack.push(...n.children);
    } else {
      files++;
    }
  }
  return { folders, files };
}

/** Human-readable byte size (`0 B`, `1.2 KB`, `3.4 MB`). */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
