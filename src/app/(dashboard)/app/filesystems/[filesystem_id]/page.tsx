"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, FolderTree, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { ExplorerTree } from "@/components/blocks/filesystem-explorer/explorer-tree";
import { FolderView } from "@/components/blocks/filesystem-explorer/folder-view";
import { FileView } from "@/components/blocks/filesystem-explorer/file-view";
import { PathBreadcrumb } from "@/components/blocks/filesystem-explorer/path-breadcrumb";
import {
  PathDialog,
  type PathDialogSubmit,
} from "@/components/blocks/filesystem-explorer/path-dialog";
import type { NodeActions } from "@/components/blocks/filesystem-explorer/node-actions-menu";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { filesystemsApi } from "@/lib/api/filesystems";
import { ApiError, getErrorCode, getErrorMessage } from "@/lib/api/errors";
import {
  useFilesystemsStore,
  filesystemsActions,
} from "@/lib/stores/filesystems-store";
import {
  ROOT_PATH,
  externalPath,
  isSameOrDescendant,
  joinPath,
  parentPath,
  rebasePath,
  validateInternalPath,
} from "@/lib/filesystems/paths";
import {
  ancestorPaths,
  buildTree,
  countDescendants,
  type FilesystemTree,
  type TreeNode,
} from "@/lib/filesystems/tree";
import type { GetFilesystemTreeResponse } from "@/types/api";

export default function FilesystemExplorerPage() {
  const params = useParams<{ filesystem_id: string }>();
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      {/* Keyed so all explorer state resets when the id changes. */}
      <FilesystemExplorer key={params.filesystem_id} />
    </Suspense>
  );
}

type PathDialogState =
  | { kind: "new-folder" | "new-file"; parent: TreeNode }
  | { kind: "move"; node: TreeNode };

function FilesystemExplorer() {
  const params = useParams<{ filesystem_id: string }>();
  const filesystemId = params.filesystem_id;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const selectedPath = useMemo(() => {
    const raw = searchParams.get("path");
    if (!raw) return ROOT_PATH;
    const v = validateInternalPath(raw, { allowRoot: true });
    return v.ok ? v.path : ROOT_PATH;
  }, [searchParams]);

  // --- Tree ----------------------------------------------------------------
  const [treeData, setTreeData] = useState<GetFilesystemTreeResponse | null>(null);
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<{ message: string; notFound: boolean } | null>(null);
  const treeSeq = useRef(0);

  // All state updates happen in promise callbacks (never synchronously), so
  // the mount effect can call this directly; `refreshTree` additionally flips
  // the loading flag for user-triggered refreshes.
  const runTreeFetch = useCallback(
    (seq: number) =>
      filesystemsApi.tree(filesystemId).then(
        (res) => {
          if (seq !== treeSeq.current) return;
          setTreeData(res);
          setTreeError(null);
          setTreeLoading(false);
          // Keep the list store's copy in sync with the tree's name/description.
          const store = useFilesystemsStore.getState();
          const inStore = store.data.find((f) => f.filesystem_id === filesystemId);
          if (
            inStore &&
            (inStore.name !== res.name || inStore.description !== res.description)
          ) {
            store.upsert({ ...inStore, name: res.name, description: res.description });
          }
        },
        (err: unknown) => {
          if (seq !== treeSeq.current) return;
          const status = err instanceof ApiError ? err.status : 0;
          setTreeError({
            message: getErrorMessage(err, "Failed to load filesystem"),
            notFound: status === 404 || status === 403,
          });
          setTreeLoading(false);
        }
      ),
    [filesystemId]
  );

  const refreshTree = useCallback(() => {
    setTreeLoading(true);
    return runTreeFetch(++treeSeq.current);
  }, [runTreeFetch]);

  useEffect(() => {
    if (!filesystemId || filesystemId === "_") return;
    void runTreeFetch(++treeSeq.current);
  }, [filesystemId, runTreeFetch]);

  const tree: FilesystemTree | null = useMemo(
    () =>
      treeData
        ? buildTree(treeData.nodes, {
            name: treeData.name,
            description: treeData.description,
          })
        : null,
    [treeData]
  );

  const selectedNode: TreeNode | null = tree
    ? (tree.byPath.get(selectedPath) ?? null)
    : null;

  const existingPaths = useMemo(
    () => new Set(tree ? tree.byPath.keys() : []),
    [tree]
  );

  // --- Expansion -------------------------------------------------------------
  // Ancestors of the selected path (and the selected folder itself) open
  // automatically. Done as a state adjustment during render — React's
  // sanctioned alternative to a setState-in-effect — keyed on selectedPath.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  const expandKey = `${selectedPath}|${selectedNode?.type ?? ""}`;
  if (expandedFor !== expandKey) {
    setExpandedFor(expandKey);
    const toOpen = [
      ...ancestorPaths(selectedPath),
      ...(selectedNode?.type === "folder" ? [selectedPath] : []),
    ];
    if (toOpen.some((p) => !expanded.has(p))) {
      const next = new Set(expanded);
      for (const p of toOpen) next.add(p);
      setExpanded(next);
    }
  }

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // --- Navigation + unsaved guard -------------------------------------------
  const fileDirtyRef = useRef(false);
  const [fileDirty, setFileDirty] = useState(false);
  const onDirtyChange = useCallback((d: boolean) => {
    fileDirtyRef.current = d;
    setFileDirty(d);
  }, []);

  const [mobileView, setMobileView] = useState<"tree" | "content">("tree");
  const [editOnOpen, setEditOnOpen] = useState<string | null>(null);

  const confirmDiscard = useCallback((): boolean => {
    if (!fileDirtyRef.current) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  }, []);

  const navigateTo = useCallback(
    (path: string, opts: { replace?: boolean; force?: boolean } = {}) => {
      if (path !== selectedPath && !opts.force && !confirmDiscard()) return;
      fileDirtyRef.current = false;
      const sp = new URLSearchParams();
      if (path !== ROOT_PATH) sp.set("path", path);
      const href = sp.size > 0 ? `${pathname}?${sp.toString()}` : pathname;
      if (opts.replace) router.replace(href);
      else router.push(href);
      setMobileView("content");
    },
    [selectedPath, confirmDiscard, pathname, router]
  );

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (fileDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // If the URL points at a path that no longer exists (deleted / moved), fall
  // back to the nearest existing ancestor.
  useEffect(() => {
    if (!tree || treeLoading || selectedNode) return;
    let p = selectedPath;
    while (p !== ROOT_PATH && !tree.byPath.has(p)) p = parentPath(p);
    fileDirtyRef.current = false;
    router.replace(p === ROOT_PATH ? pathname : `${pathname}?path=${encodeURIComponent(p)}`);
  }, [tree, treeLoading, selectedNode, selectedPath, pathname, router]);

  // --- Search ------------------------------------------------------------------
  const [query, setQuery] = useState("");

  // --- Mutations -----------------------------------------------------------------
  const [pathDialog, setPathDialog] = useState<PathDialogState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TreeNode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nodeActions: NodeActions = useMemo(
    () => ({
      onNewFolder: (parent) => setPathDialog({ kind: "new-folder", parent }),
      onNewFile: (parent) => setPathDialog({ kind: "new-file", parent }),
      onMove: (node) => setPathDialog({ kind: "move", node }),
      onDelete: (node) => setPendingDelete(node),
    }),
    []
  );

  async function submitPathDialog(values: PathDialogSubmit) {
    if (!pathDialog) return;
    if (pathDialog.kind === "new-folder") {
      await filesystemsApi.createFolder(filesystemId, {
        path: values.path,
        description: values.description,
        create_parents: values.createParents || undefined,
      });
      toast.success(`Created folder ${values.path}`);
      await refreshTree();
      navigateTo(values.path);
    } else if (pathDialog.kind === "new-file") {
      await filesystemsApi.createFile(filesystemId, {
        path: values.path,
        content: "",
        create_parents: values.createParents || undefined,
      });
      toast.success(`Created ${values.path}`);
      await refreshTree();
      setEditOnOpen(values.path);
      navigateTo(values.path);
    } else if (pathDialog.kind === "move") {
      const source = pathDialog.node.path;
      const res = await filesystemsApi.move(filesystemId, {
        source_path: source,
        destination_path: values.path,
        create_parents: values.createParents || undefined,
      });
      toast.success(`Moved to ${res.destination_path}`);
      await refreshTree();
      if (isSameOrDescendant(source, selectedPath)) {
        navigateTo(rebasePath(selectedPath, source, res.destination_path), {
          replace: true,
          force: true,
        });
      }
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const node = pendingDelete;
    const counts = countDescendants(node);
    const recursive = node.type === "folder" && counts.folders + counts.files > 0;
    setDeleting(true);
    try {
      const res = await filesystemsApi.deleteNode(filesystemId, node.path, recursive);
      const detail =
        node.type === "folder"
          ? ` (${res.deleted.folders} ${res.deleted.folders === 1 ? "folder" : "folders"}, ${res.deleted.files} ${res.deleted.files === 1 ? "file" : "files"})`
          : "";
      toast.success(`Deleted ${node.path}${detail}`);
      setPendingDelete(null);
      if (isSameOrDescendant(node.path, selectedPath)) {
        fileDirtyRef.current = false;
        navigateTo(parentPath(node.path), { replace: true, force: true });
      }
      await refreshTree();
    } catch (err) {
      if (getErrorCode(err) === "folder_not_empty") {
        toast.error("Folder is not empty — the tree was out of date. Refreshed; try again.");
        await refreshTree();
      } else {
        toast.error(getErrorMessage(err, "Failed to delete"));
      }
    } finally {
      setDeleting(false);
    }
  }

  async function saveFolderDescription(node: TreeNode, description: string) {
    try {
      if (node.path === ROOT_PATH) {
        await filesystemsActions.update(filesystemId, { description });
      } else {
        await filesystemsApi.updateFolder(filesystemId, { path: node.path, description });
      }
      toast.success("Description saved");
      await refreshTree();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save description"));
      throw err;
    }
  }

  async function saveFilesystemName(name: string) {
    try {
      await filesystemsActions.update(filesystemId, { name });
      toast.success("Filesystem renamed");
      await refreshTree();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to rename filesystem"));
      throw err;
    }
  }

  const onFileSaved = useCallback(
    (f: { path: string; size_bytes: number; updated_at: number }) => {
      setTreeData((prev) =>
        prev
          ? {
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.path === f.path
                  ? { ...n, size_bytes: f.size_bytes, updated_at: f.updated_at }
                  : n
              ),
            }
          : prev
      );
    },
    []
  );

  // --- Aj page hooks ---------------------------------------------------------------
  const NavigateArgs = useMemo(() => z.object({ path: z.string() }), []);
  const SearchArgs = useMemo(() => z.object({ query: z.string() }), []);

  useGetPageData(
    () => ({
      data: {
        page: "filesystem_explorer",
        filesystem_id: filesystemId,
        name: treeData?.name,
        description: treeData?.description,
        agent_root_path: `/${filesystemId}`,
        selected_path: selectedPath,
        selected_agent_path: externalPath(filesystemId, selectedPath),
        selected_type: selectedNode?.type,
        file_has_unsaved_changes: fileDirty,
        search: query,
        node_count: treeData?.nodes.length ?? 0,
        nodes: (treeData?.nodes ?? []).slice(0, 200).map((n) => ({
          path: n.path,
          type: n.type,
          description: n.description ?? undefined,
          size_bytes: n.size_bytes,
        })),
        note:
          "Paths here are internal (root '/'); the agent-facing path is '/<filesystem_id>' + internal path. Editing, creating, moving and deleting are user actions.",
      },
      actions: {
        navigate_to_path: {
          description: "Select a folder or file by its internal path (e.g. '/projects/notes.md').",
          argsSchema: z.toJSONSchema(NavigateArgs),
        },
        set_search: {
          description: "Search file/folder names and file contents; results replace the tree.",
          argsSchema: z.toJSONSchema(SearchArgs),
        },
      },
    }),
    [filesystemId, treeData, selectedPath, selectedNode?.type, fileDirty, query, NavigateArgs, SearchArgs]
  );

  useDoPageAction(
    async (key, args) => {
      if (key === "navigate_to_path") {
        const parsed = NavigateArgs.parse(args);
        const v = validateInternalPath(parsed.path, { allowRoot: true });
        if (!v.ok) return { ok: false, error: v.error };
        if (tree && !tree.byPath.has(v.path)) return { ok: false, error: "no such path" };
        navigateTo(v.path);
        return { ok: true, path: v.path };
      }
      if (key === "set_search") {
        const parsed = SearchArgs.parse(args);
        setQuery(parsed.query);
        return { ok: true };
      }
      return { ok: false, error: `unknown action: ${key}` };
    },
    [NavigateArgs, SearchArgs, navigateTo, tree]
  );

  // --- Render ---------------------------------------------------------------------
  if (filesystemId === "_") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (treeError?.notFound) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Filesystem not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This filesystem doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/filesystems">
            <ArrowLeft className="size-4" />
            Back to filesystems
          </Link>
        </Button>
      </div>
    );
  }

  const showTree = !isMobile || mobileView === "tree";
  const showContent = !isMobile || mobileView === "content";

  // New folder/file: prefill the parent with a trailing slash so the user
  // only types the name. Move: prefill the current path.
  const pathDialogInitial = !pathDialog
    ? ROOT_PATH
    : pathDialog.kind === "move"
      ? pathDialog.node.path
      : joinPath(pathDialog.parent.path, "");

  const content = (
    <>
      {treeError && !treeError.notFound && (
        <div className="border-destructive/40 bg-destructive/5 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="text-destructive">{treeError.message}</span>
          <Button variant="outline" size="sm" onClick={() => void refreshTree()}>
            <RotateCw className="size-4" />
            Retry
          </Button>
        </div>
      )}
      {!tree || !selectedNode ? (
        <div className="space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : selectedNode.type === "folder" ? (
        <FolderView
          key={selectedNode.path}
          node={selectedNode}
          isRoot={selectedNode.path === ROOT_PATH}
          onSelect={navigateTo}
          onSaveDescription={(d) => saveFolderDescription(selectedNode, d)}
          onSaveName={selectedNode.path === ROOT_PATH ? saveFilesystemName : undefined}
          actions={nodeActions}
        />
      ) : (
        <FileView
          key={selectedNode.path}
          filesystemId={filesystemId}
          node={selectedNode}
          actions={nodeActions}
          onDirtyChange={onDirtyChange}
          onSaved={onFileSaved}
          startInEditMode={editOnOpen === selectedNode.path}
        />
      )}
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Back to filesystems"
          onClick={() => {
            if (!confirmDiscard()) return;
            router.push("/app/filesystems");
          }}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <FolderTree className="text-primary size-5 shrink-0" />
        <h1 className="font-display min-w-0 truncate text-xl font-semibold tracking-tight">
          {treeData?.name ?? <Skeleton className="inline-block h-6 w-40 align-middle" />}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshTree()}
            disabled={treeLoading}
            aria-label="Refresh tree"
          >
            <RotateCw className={treeLoading ? "size-4 animate-spin" : "size-4"} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <PathBreadcrumb
        filesystemId={filesystemId}
        path={selectedPath}
        onNavigate={navigateTo}
        className="bg-muted/40 shrink-0 rounded-md px-2 py-1.5"
      />

      {/* Panes */}
      <div className="border-border bg-card flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        {showTree && (
          <div
            className={
              isMobile
                ? "flex min-h-0 w-full flex-col"
                : "border-border flex min-h-0 w-72 shrink-0 flex-col border-r"
            }
          >
            <ExplorerTree
              filesystemId={filesystemId}
              root={tree?.root ?? null}
              loading={treeLoading}
              selectedPath={selectedPath}
              expanded={expanded}
              onSelect={navigateTo}
              onToggleExpand={toggleExpand}
              actions={nodeActions}
              query={query}
              onQueryChange={setQuery}
            />
          </div>
        )}
        {showContent && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {isMobile && (
              <div className="border-border flex shrink-0 items-center border-b px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (!confirmDiscard()) return;
                    setMobileView("tree");
                  }}
                >
                  <ChevronLeft className="size-4" />
                  Files
                </Button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">{content}</div>
          </div>
        )}
      </div>

      {pathDialog && (
        <PathDialog
          open
          onOpenChange={(o) => {
            if (!o) setPathDialog(null);
          }}
          kind={pathDialog.kind}
          filesystemId={filesystemId}
          initialPath={pathDialogInitial}
          sourcePath={pathDialog.kind === "move" ? pathDialog.node.path : undefined}
          sourceType={pathDialog.kind === "move" ? pathDialog.node.type : undefined}
          existingPaths={existingPaths}
          onSubmit={submitPathDialog}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title={
          pendingDelete?.type === "folder" ? "Delete this folder?" : "Delete this file?"
        }
        description={
          pendingDelete ? (
            <DeleteDescription node={pendingDelete} />
          ) : undefined
        }
        confirmLabel={
          pendingDelete?.type === "folder" &&
          countDescendants(pendingDelete).files + countDescendants(pendingDelete).folders > 0
            ? "Delete everything"
            : "Delete"
        }
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function DeleteDescription({ node }: { node: TreeNode }) {
  if (node.type === "file") {
    return (
      <>
        <code className="text-foreground font-mono text-xs">{node.path}</code> will be
        permanently removed. This cannot be undone.
      </>
    );
  }
  const counts = countDescendants(node);
  const total = counts.folders + counts.files;
  if (total === 0) {
    return (
      <>
        The empty folder{" "}
        <code className="text-foreground font-mono text-xs">{node.path}</code> will be
        removed.
      </>
    );
  }
  return (
    <>
      <code className="text-foreground font-mono text-xs">{node.path}</code> is not
      empty. Deleting it will <span className="text-foreground font-medium">recursively</span>{" "}
      remove {counts.folders} {counts.folders === 1 ? "subfolder" : "subfolders"} and{" "}
      {counts.files} {counts.files === 1 ? "file" : "files"}. This cannot be undone.
    </>
  );
}
