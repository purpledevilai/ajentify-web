/**
 * Filesystem import / export — pure logic + runners (no React, no fetch).
 *
 * Conventions (Notebook 2026-10-31 plan §2):
 *  - Every folder in an export carries a `.description.md` holding the folder
 *    description (always written, even when empty, so empty folders survive a
 *    re-import — `<input webkitdirectory>` never reports empty directories).
 *  - On import `.description.md` is consumed, never created as a file: its
 *    trimmed content becomes the parent folder's description; at the picked
 *    root it becomes `rootDescription`.
 *  - The zip has one top-level folder named after the filesystem; import strips
 *    the picked folder's name (first `webkitRelativePath` segment).
 *  - Existing nodes are never overwritten (`already_exists` → status `exists`).
 */

import { strToU8, zipSync, type Zippable } from "fflate";
import type { ApiFilesystemTreeNode } from "@/types/api";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import {
  ROOT_PATH,
  extensionOf,
  joinPath,
  splitPath,
  validateInternalPath,
} from "./paths";
import { formatBytes } from "./tree";

export const DESCRIPTION_FILE_NAME = ".description.md";
export const MAX_IMPORT_FILE_BYTES = 256 * 1024;
export const DEFAULT_CONCURRENCY = 6;

/* -------------------------------------------------------------------------- */
/* Import: picking + planning                                                 */
/* -------------------------------------------------------------------------- */

/** Minimal view of a browser `File` so tests can use plain objects. */
export interface PickedFile {
  /** Path relative to the picked folder, e.g. `My Notes/projects/a.md`. */
  relativePath: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** Wrap a `FileList` / `File[]` from `<input type="file" webkitdirectory>`. */
export function pickedFilesFromFileList(files: FileList | File[]): PickedFile[] {
  return Array.from(files).map((file) => ({
    relativePath: file.webkitRelativePath || file.name,
    size: file.size,
    arrayBuffer: () => file.arrayBuffer(),
  }));
}

export type SkipReason = "ignored" | "binary" | "too_large" | "invalid_path";

export interface ImportPlanFolder {
  /** Internal path (already prefixed with `targetPath`). */
  path: string;
  description: string;
  /** Number of segments in `path`; folders are created depth by depth. */
  depth: number;
}

export interface ImportPlanFile {
  path: string;
  content: string;
  /** UTF-8 byte size of `content`. */
  size: number;
}

export interface ImportSkipped {
  relativePath: string;
  reason: SkipReason;
  detail?: string;
}

export interface ImportPlan {
  /** Picked folder's name (`""` when the files had no common root segment). */
  rootName: string;
  /** Trimmed root `.description.md`, `""` if absent. */
  rootDescription: string;
  /** Sorted by depth, then path. */
  folders: ImportPlanFolder[];
  /** Sorted by path. */
  files: ImportPlanFile[];
  skipped: ImportSkipped[];
  /** Σ `files[].size`. */
  totalBytes: number;
}

export interface PlanImportOptions {
  /** Internal folder the tree is imported under (default root `/`). */
  targetPath?: string;
}

/** Basenames that are never imported (OS / tooling litter). */
const IGNORED_BASENAMES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);
/** Any path containing one of these segments is never imported. */
const IGNORED_SEGMENTS = new Set([".git", ".svn", ".hg", "node_modules", "__MACOSX"]);
/** Extensions treated as binary without attempting a UTF-8 decode. */
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tiff",
  "pdf", "zip", "gz", "tgz", "tar", "7z", "rar",
  "mp3", "mp4", "mov", "avi", "wav", "ogg",
  "woff", "woff2", "ttf", "otf", "eot",
  "exe", "dll", "so", "dylib", "class", "pyc", "jar",
  "doc", "docx", "xls", "xlsx", "ppt", "pptx",
]);

const BOM = "\uFEFF";

/** `My Notes\\a\\b.md` / `./x` / `/x` → `["My Notes", "a", "b.md"]`. */
function normaliseSegments(relativePath: string): string[] {
  let s = relativePath.replace(/\\/g, "/");
  for (;;) {
    if (s.startsWith("./")) s = s.slice(2);
    else if (s.startsWith("/")) s = s.slice(1);
    else break;
  }
  return s.split("/").filter((seg) => seg.length > 0);
}

function isIgnored(segments: string[]): boolean {
  const base = segments[segments.length - 1];
  if (IGNORED_BASENAMES.has(base)) return true;
  return segments.some((seg) => IGNORED_SEGMENTS.has(seg));
}

function stripBom(text: string): string {
  return text.startsWith(BOM) ? text.slice(1) : text;
}

type DecodeResult = { ok: true; text: string } | { ok: false; detail: string };

/** Strict UTF-8 decode; NUL bytes and invalid sequences mean "binary". */
function decodeText(bytes: Uint8Array): DecodeResult {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, detail: "not valid UTF-8" };
  }
  if (text.includes("\u0000")) return { ok: false, detail: "contains NUL bytes" };
  return { ok: true, text: stripBom(text) };
}

function tooLargeDetail(size: number): string {
  return `${formatBytes(size)} > ${formatBytes(MAX_IMPORT_FILE_BYTES)}`;
}

/** Resolve `targetPath` to a normalised internal folder path (root allowed). */
function resolveTargetPath(targetPath: string | undefined): string {
  if (targetPath === undefined || targetPath === "") return ROOT_PATH;
  const v = validateInternalPath(targetPath, { allowRoot: true });
  if (!v.ok) throw new Error(`Invalid targetPath: ${v.error}`);
  return v.path;
}

/**
 * Read every picked file, classify it (ignored / binary / too large /
 * invalid path / description file / text), and produce the ordered plan.
 */
export async function planImport(
  files: PickedFile[],
  opts: PlanImportOptions = {}
): Promise<ImportPlan> {
  const targetPath = resolveTargetPath(opts.targetPath);
  const entries = files.map((file) => ({ file, segments: normaliseSegments(file.relativePath) }));

  // Common root: every file has ≥ 2 segments and shares the first one.
  let rootName = "";
  if (entries.length > 0) {
    const first = entries[0].segments[0];
    const shared = entries.every(
      (e) => e.segments.length >= 2 && e.segments[0] === first
    );
    if (shared) {
      rootName = first;
      for (const e of entries) e.segments = e.segments.slice(1);
    }
  }

  let rootDescription = "";
  const folderDescriptions = new Map<string, string>();
  const folderPaths = new Set<string>();
  const planFiles: ImportPlanFile[] = [];
  const skipped: ImportSkipped[] = [];
  const claimedPaths = new Set<string>();

  const toInternal = (segments: string[]): string =>
    joinPath(targetPath, segments.join("/"));

  /** Register every ancestor folder strictly below `targetPath`. */
  const addAncestors = (segments: string[]): void => {
    for (let i = 1; i < segments.length; i++) {
      folderPaths.add(toInternal(segments.slice(0, i)));
    }
  };

  for (const { file, segments } of entries) {
    const { relativePath } = file;
    if (segments.length === 0) {
      skipped.push({ relativePath, reason: "invalid_path", detail: "Path is empty." });
      continue;
    }
    if (isIgnored(segments)) {
      skipped.push({ relativePath, reason: "ignored" });
      continue;
    }

    const baseName = segments[segments.length - 1];

    if (baseName === DESCRIPTION_FILE_NAME) {
      const parentSegments = segments.slice(0, -1);
      if (parentSegments.length > 0) {
        const folderPath = toInternal(parentSegments);
        const v = validateInternalPath(folderPath);
        if (!v.ok) {
          skipped.push({ relativePath, reason: "invalid_path", detail: v.error });
          continue;
        }
      }
      const decoded = decodeText(new Uint8Array(await file.arrayBuffer()));
      if (!decoded.ok) {
        skipped.push({ relativePath, reason: "binary", detail: decoded.detail });
        continue;
      }
      const description = decoded.text.trim();
      if (parentSegments.length === 0) {
        rootDescription = description;
      } else {
        folderDescriptions.set(toInternal(parentSegments), description);
        addAncestors(segments);
      }
      continue;
    }

    const path = toInternal(segments);
    const v = validateInternalPath(path);
    if (!v.ok) {
      skipped.push({ relativePath, reason: "invalid_path", detail: v.error });
      continue;
    }
    if (claimedPaths.has(v.path)) {
      skipped.push({ relativePath, reason: "invalid_path", detail: "duplicate path" });
      continue;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      skipped.push({ relativePath, reason: "too_large", detail: tooLargeDetail(file.size) });
      continue;
    }
    if (BINARY_EXTENSIONS.has(extensionOf(baseName))) {
      skipped.push({ relativePath, reason: "binary", detail: `.${extensionOf(baseName)} file` });
      continue;
    }
    const decoded = decodeText(new Uint8Array(await file.arrayBuffer()));
    if (!decoded.ok) {
      skipped.push({ relativePath, reason: "binary", detail: decoded.detail });
      continue;
    }
    const size = new TextEncoder().encode(decoded.text).length;
    if (size > MAX_IMPORT_FILE_BYTES) {
      skipped.push({ relativePath, reason: "too_large", detail: tooLargeDetail(size) });
      continue;
    }

    claimedPaths.add(v.path);
    planFiles.push({ path: v.path, content: decoded.text, size });
    addAncestors(segments);
  }

  const folders: ImportPlanFolder[] = Array.from(folderPaths, (path) => ({
    path,
    description: folderDescriptions.get(path) ?? "",
    depth: splitPath(path).length,
  }));
  folders.sort((a, b) => a.depth - b.depth || comparePaths(a.path, b.path));
  planFiles.sort((a, b) => comparePaths(a.path, b.path));

  return {
    rootName,
    rootDescription,
    folders,
    files: planFiles,
    skipped,
    totalBytes: planFiles.reduce((sum, f) => sum + f.size, 0),
  };
}

function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* -------------------------------------------------------------------------- */
/* Concurrency                                                                */
/* -------------------------------------------------------------------------- */

interface PoolHooks<T> {
  onStart?: (item: T) => void;
  onSettle?: (item: T, result: PromiseSettledResult<unknown>) => void;
}

/**
 * Run `fn` over `items` at most `limit` at a time. Stops launching new items
 * once `shouldStop()` is true (in-flight work finishes). The result slot of
 * an item that never started is `undefined`.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  shouldStop: () => boolean = () => false,
  hooks: PoolHooks<T> = {}
): Promise<Array<PromiseSettledResult<R> | undefined>> {
  const results: Array<PromiseSettledResult<R> | undefined> = new Array(items.length);
  let next = 0;
  const workers = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));

  const worker = async (): Promise<void> => {
    while (next < items.length && !shouldStop()) {
      const index = next++;
      const item = items[index];
      hooks.onStart?.(item);
      let result: PromiseSettledResult<R>;
      try {
        result = { status: "fulfilled", value: await fn(item, index) };
      } catch (reason) {
        result = { status: "rejected", reason };
      }
      results[index] = result;
      hooks.onSettle?.(item, result);
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/* -------------------------------------------------------------------------- */
/* Import: running                                                            */
/* -------------------------------------------------------------------------- */

export interface ImportClient {
  createFolder(path: string, description: string, createParents: boolean): Promise<void>;
  createFile(path: string, content: string, createParents: boolean): Promise<void>;
}

export interface ImportProgress {
  done: number;
  total: number;
  /** Path currently being written (last started), `null` when idle/finished. */
  current: string | null;
}

export type ImportItemStatus = "created" | "exists" | "failed";

export interface ImportResultItem {
  path: string;
  type: "folder" | "file";
  status: Exclude<ImportItemStatus, "created">;
  error?: string;
}

export interface ImportResult {
  folders: Record<ImportItemStatus, number>;
  files: Record<ImportItemStatus, number>;
  /** Only non-created items, so the report stays small. */
  items: ImportResultItem[];
  cancelled: boolean;
}

export interface RunOptions {
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (p: ImportProgress) => void;
}

/** Map an API error to an import item status (`already_exists` → `exists`). */
export function classifyImportError(err: unknown): {
  status: Exclude<ImportItemStatus, "created">;
  error?: string;
} {
  if (getErrorCode(err) === "already_exists") return { status: "exists" };
  const fallback = err instanceof Error ? err.message : "Request failed";
  return { status: "failed", error: getErrorMessage(err, fallback) };
}

function emptyCounts(): Record<ImportItemStatus, number> {
  return { created: 0, exists: 0, failed: 0 };
}

/**
 * Create folders depth by depth (parallel within a depth, no parent creation),
 * then files `concurrency`-wide with `createParents=true` as a safety net.
 * Aborting stops launching new work; in-flight calls finish; `cancelled=true`.
 */
export async function runImport(
  plan: ImportPlan,
  client: ImportClient,
  opts: RunOptions = {}
): Promise<ImportResult> {
  const { concurrency = DEFAULT_CONCURRENCY, signal, onProgress } = opts;
  const result: ImportResult = {
    folders: emptyCounts(),
    files: emptyCounts(),
    items: [],
    cancelled: false,
  };
  if (signal?.aborted) {
    result.cancelled = true;
    return result;
  }

  const total = plan.folders.length + plan.files.length;
  let done = 0;
  let inFlight = 0;
  let lastStarted: string | null = null;
  const shouldStop = (): boolean => signal?.aborted === true;
  const emit = (): void => {
    onProgress?.({ done, total, current: inFlight > 0 ? lastStarted : null });
  };
  emit();

  const hooks = (
    type: "folder" | "file",
    counts: Record<ImportItemStatus, number>
  ): PoolHooks<{ path: string }> => ({
    onStart: (item) => {
      inFlight++;
      lastStarted = item.path;
    },
    onSettle: (item, settled) => {
      inFlight--;
      done++;
      if (settled.status === "fulfilled") {
        counts.created++;
      } else {
        const { status, error } = classifyImportError(settled.reason);
        counts[status]++;
        result.items.push({ path: item.path, type, status, error });
      }
      emit();
    },
  });

  // Phase 1: folders, one depth at a time.
  const byDepth = new Map<number, ImportPlanFolder[]>();
  for (const folder of plan.folders) {
    const bucket = byDepth.get(folder.depth);
    if (bucket) bucket.push(folder);
    else byDepth.set(folder.depth, [folder]);
  }
  const depths = Array.from(byDepth.keys()).sort((a, b) => a - b);
  for (const depth of depths) {
    if (shouldStop()) break;
    await mapPool(
      byDepth.get(depth)!,
      concurrency,
      (f) => client.createFolder(f.path, f.description, false),
      shouldStop,
      hooks("folder", result.folders)
    );
  }

  // Phase 2: files.
  if (!shouldStop()) {
    await mapPool(
      plan.files,
      concurrency,
      (f) => client.createFile(f.path, f.content, true),
      shouldStop,
      hooks("file", result.files)
    );
  }

  result.cancelled = shouldStop();
  return result;
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

export interface ExportEntry {
  /** Zip-relative path, no leading slash, e.g. `My Notes/projects/a.md`. */
  path: string;
  content: string;
}

export interface ExportTree {
  name: string;
  description: string;
  nodes: ApiFilesystemTreeNode[];
}

const ARCHIVE_NAME_MAX = 100;
const ARCHIVE_NAME_FALLBACK = "filesystem";

/** Safe single path segment for the zip's top folder / filename. */
export function sanitizeArchiveName(name: string): string {
  const strip = (s: string): string => s.replace(/^[.\-]+|[.\-]+$/g, "").trim();
  let out = name
    .trim()
    .replace(/[/\\:*?"<>|\u0000-\u001f\u007f]+/g, "-")
    .replace(/\s+/g, " ");
  out = strip(out);
  if (out.length > ARCHIVE_NAME_MAX) out = strip(out.slice(0, ARCHIVE_NAME_MAX));
  return out.length === 0 ? ARCHIVE_NAME_FALLBACK : out;
}

/**
 * Entries for the zip: `<root>/.description.md`, one `.description.md` per
 * folder (always), and every file's content from `contents` (keyed by
 * internal path; files missing from the map are skipped).
 */
export function buildExportEntries(
  tree: ExportTree,
  contents: Map<string, string>
): ExportEntry[] {
  const root = sanitizeArchiveName(tree.name);
  const entries: ExportEntry[] = [
    { path: `${root}/${DESCRIPTION_FILE_NAME}`, content: `${tree.description}\n` },
  ];
  const nodes = [...tree.nodes].sort((a, b) => comparePaths(a.path, b.path));
  for (const node of nodes) {
    if (node.type === "folder") {
      entries.push({
        path: `${root}${node.path}/${DESCRIPTION_FILE_NAME}`,
        content: `${node.description ?? ""}\n`,
      });
    } else {
      const content = contents.get(node.path);
      if (content === undefined) continue;
      entries.push({ path: `${root}${node.path}`, content });
    }
  }
  return entries;
}

/** Deflate the entries into a zip (fflate `zipSync`). */
export function zipEntries(entries: ExportEntry[]): Uint8Array {
  const mtime = new Date();
  const zippable: Zippable = {};
  for (const entry of entries) {
    zippable[entry.path] = [strToU8(entry.content), { level: 6, mtime }];
  }
  return zipSync(zippable);
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

/**
 * Fetch every file's content `concurrency`-wide, then zip. Progress counts
 * files fetched. Returns the bytes and a suggested `<name>.zip` filename.
 */
export async function exportFilesystem(
  tree: ExportTree,
  fetchContent: (path: string) => Promise<string>,
  opts: RunOptions = {}
): Promise<{ bytes: Uint8Array; filename: string }> {
  const { concurrency = DEFAULT_CONCURRENCY, signal, onProgress } = opts;
  if (signal?.aborted) throw abortError();

  const files = tree.nodes.filter((n) => n.type === "file");
  const total = files.length;
  let done = 0;
  let inFlight = 0;
  let lastStarted: string | null = null;
  let failed = false;
  const emit = (): void => {
    onProgress?.({ done, total, current: inFlight > 0 ? lastStarted : null });
  };
  emit();

  const results = await mapPool(
    files,
    concurrency,
    (n) => fetchContent(n.path),
    () => failed || signal?.aborted === true,
    {
      onStart: (n) => {
        inFlight++;
        lastStarted = n.path;
      },
      onSettle: (_n, settled) => {
        inFlight--;
        done++;
        if (settled.status === "rejected") failed = true;
        emit();
      },
    }
  );

  if (signal?.aborted) throw abortError();
  const contents = new Map<string, string>();
  for (let i = 0; i < files.length; i++) {
    const r = results[i];
    if (!r) throw abortError();
    if (r.status === "rejected") throw r.reason;
    contents.set(files[i].path, r.value);
  }

  const entries = buildExportEntries(tree, contents);
  return {
    bytes: zipEntries(entries),
    filename: `${sanitizeArchiveName(tree.name)}.zip`,
  };
}

/** Trigger a browser download of `bytes`. Browser only. */
export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mime = "application/zip"
): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
