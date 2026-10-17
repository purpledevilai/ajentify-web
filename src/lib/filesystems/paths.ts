/**
 * Path helpers for filesystem memories.
 *
 * Two path spaces exist:
 *  - *internal* paths are what the REST API takes/returns: `/`, `/projects`,
 *    `/projects/notes.md`.
 *  - *external* paths are what an agent uses in tool calls: the filesystem id
 *    is the root segment — `/<filesystem_id>/projects/notes.md`.
 *
 * Validation mirrors the service rules (plan §1.1 / D3): absolute, no `.`
 * or `..`, no empty segments (`//`), no `\0`, segment ≤ 255 chars, whole
 * path ≤ 1 024 bytes.
 */

export const ROOT_PATH = "/";
export const MAX_SEGMENT_LENGTH = 255;
export const MAX_PATH_BYTES = 1024;

export type PathValidation =
  | { ok: true; path: string }
  | { ok: false; error: string };

/** Split an internal path into its segments (root → `[]`). */
export function splitPath(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

/** Join segments into a normalised absolute internal path. */
export function joinSegments(segments: string[]): string {
  return segments.length === 0 ? ROOT_PATH : `/${segments.join("/")}`;
}

/** `/a/b` + `c` → `/a/b/c`; root + `c` → `/c`. Does not validate. */
export function joinPath(parent: string, name: string): string {
  const base = parent === ROOT_PATH || parent === "" ? "" : parent.replace(/\/+$/, "");
  return `${base}/${name}`;
}

/** Parent of an internal path (`/a/b` → `/a`, `/a` → `/`, `/` → `/`). */
export function parentPath(path: string): string {
  const segs = splitPath(path);
  if (segs.length <= 1) return ROOT_PATH;
  return joinSegments(segs.slice(0, -1));
}

/** Last segment (`/a/b.md` → `b.md`, `/` → ``). */
export function baseName(path: string): string {
  const segs = splitPath(path);
  return segs.length === 0 ? "" : segs[segs.length - 1];
}

/** Lower-cased extension without the dot (`notes.MD` → `md`, `README` → ``). */
export function extensionOf(path: string): string {
  const name = baseName(path);
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

export function isMarkdownPath(path: string): boolean {
  const ext = extensionOf(path);
  return ext === "md" || ext === "markdown";
}

/** True when `candidate` equals `ancestor` or sits anywhere below it. */
export function isSameOrDescendant(ancestor: string, candidate: string): boolean {
  if (ancestor === ROOT_PATH) return true;
  return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
}

function utf8Length(s: string): number {
  return new TextEncoder().encode(s).length;
}

/**
 * Validate an *internal* path typed by the user. Returns the normalised
 * path on success (trailing slash stripped) or a human-readable error.
 *
 * `allowRoot` — whether a bare `/` is acceptable (it is for folder listings,
 * not for a new node's destination).
 */
export function validateInternalPath(
  raw: string,
  opts: { allowRoot?: boolean } = {}
): PathValidation {
  const input = raw.trim();
  if (input.length === 0) return { ok: false, error: "Path is required." };
  if (!input.startsWith("/"))
    return { ok: false, error: "Path must be absolute (start with /)." };
  if (input.includes("\0"))
    return { ok: false, error: "Path contains an invalid character." };

  // Allow exactly one optional trailing slash on non-root paths.
  const trimmed = input.length > 1 ? input.replace(/\/$/, "") : input;

  if (trimmed === ROOT_PATH) {
    if (opts.allowRoot) return { ok: true, path: ROOT_PATH };
    return { ok: false, error: "Path cannot be the root." };
  }

  const rawSegments = trimmed.slice(1).split("/");
  for (const seg of rawSegments) {
    if (seg.length === 0)
      return { ok: false, error: "Path cannot contain empty segments (//)." };
    if (seg === "." || seg === "..")
      return { ok: false, error: "Path cannot contain . or .. segments." };
    if (seg.length > MAX_SEGMENT_LENGTH)
      return {
        ok: false,
        error: `Each segment must be at most ${MAX_SEGMENT_LENGTH} characters.`,
      };
  }
  if (utf8Length(trimmed) > MAX_PATH_BYTES)
    return { ok: false, error: `Path must be at most ${MAX_PATH_BYTES} bytes.` };

  return { ok: true, path: trimmed };
}

/** Validate a single new segment (file or folder name). */
export function validateSegment(raw: string): PathValidation {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: "Name is required." };
  if (name.includes("/")) return { ok: false, error: "Name cannot contain /." };
  if (name.includes("\0"))
    return { ok: false, error: "Name contains an invalid character." };
  if (name === "." || name === "..")
    return { ok: false, error: "Name cannot be . or .." };
  if (name.length > MAX_SEGMENT_LENGTH)
    return {
      ok: false,
      error: `Name must be at most ${MAX_SEGMENT_LENGTH} characters.`,
    };
  return { ok: true, path: name };
}

/** The path an agent uses: `/<filesystem_id>` + internal path. */
export function externalPath(filesystemId: string, internal: string): string {
  const root = `/${filesystemId}`;
  if (internal === ROOT_PATH || internal === "") return root;
  return `${root}${internal.startsWith("/") ? internal : `/${internal}`}`;
}

/**
 * Breadcrumb segments for an internal path, each with its own internal
 * path so the UI can navigate to any ancestor. Root is always first.
 */
export function breadcrumbs(
  path: string
): Array<{ name: string; path: string }> {
  const segs = splitPath(path);
  const out: Array<{ name: string; path: string }> = [
    { name: "", path: ROOT_PATH },
  ];
  let acc = "";
  for (const s of segs) {
    acc += `/${s}`;
    out.push({ name: s, path: acc });
  }
  return out;
}

/**
 * Rewrite `path` after `source` was moved to `destination`. Returns the
 * unchanged path when it is not under `source`.
 */
export function rebasePath(
  path: string,
  source: string,
  destination: string
): string {
  if (path === source) return destination;
  if (path.startsWith(`${source}/`)) return destination + path.slice(source.length);
  return path;
}
