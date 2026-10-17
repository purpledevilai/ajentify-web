/**
 * The standard system-prompt snippet that binds an agent to a filesystem
 * memory (plan §1.5, D5). The agent builder inserts it on "Attach" and
 * removes it on "Detach"; detection is by the `/<filesystem_id>` root path
 * since the id is the only stable token in free-form prompt text.
 */

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export interface SnippetFilesystem {
  filesystem_id: string;
  name: string;
  description: string;
}

/** Collapse whitespace so a one-line snippet survives multi-line descriptions. */
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function buildFilesystemSnippet(fs: SnippetFilesystem): string {
  const desc = oneLine(fs.description) || "no description";
  return (
    `You have a filesystem memory at \`/${fs.filesystem_id}\` ("${oneLine(fs.name)}": ${desc}). ` +
    "When you need information or instructions, call `list_folder` on it, navigate by folder names and descriptions, " +
    "and `open_file` only the relevant file. Use `search_filesystem` only when navigation fails. " +
    "Keep it up to date with the write tools."
  );
}

/** Whether the prompt already references `/<filesystem_id>` anywhere. */
export function promptReferencesFilesystem(
  prompt: string,
  filesystemId: string
): boolean {
  return prompt.includes(`/${filesystemId}`);
}

/**
 * Ids of the known filesystems referenced (as `/<uuid>`) in the prompt,
 * in the order they first appear.
 */
export function referencedFilesystemIds(
  prompt: string,
  knownIds: Iterable<string>
): string[] {
  const known = new Set(Array.from(knownIds, (id) => id.toLowerCase()));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of prompt.matchAll(UUID_RE)) {
    const idx = m.index ?? 0;
    if (idx === 0 || prompt[idx - 1] !== "/") continue;
    const id = m[0].toLowerCase();
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * Insert the snippet with exactly one blank line before it. No-op when the
 * prompt already references the filesystem.
 */
export function attachFilesystemToPrompt(
  prompt: string,
  fs: SnippetFilesystem
): string {
  if (promptReferencesFilesystem(prompt, fs.filesystem_id)) return prompt;
  const snippet = buildFilesystemSnippet(fs);
  const trimmed = prompt.replace(/\s+$/, "");
  return trimmed.length === 0 ? snippet : `${trimmed}\n\n${snippet}`;
}

/**
 * Remove the snippet for `filesystemId`. Removes the paragraph (text
 * between blank lines) that contains `/<filesystemId>`; if the id appears
 * in a paragraph that is not our snippet we still remove just that
 * paragraph — the user can undo via Discard.
 */
export function detachFilesystemFromPrompt(
  prompt: string,
  filesystemId: string
): string {
  const needle = `/${filesystemId}`;
  if (!prompt.includes(needle)) return prompt;
  const paragraphs = prompt.split(/\n[ \t]*\n/);
  const kept = paragraphs.filter((p) => !p.includes(needle));
  return kept.join("\n\n").replace(/\s+$/, "");
}
