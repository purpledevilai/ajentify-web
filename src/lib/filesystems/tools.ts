import type { ApiDefaultTool } from "@/types/api";

/** Category name the API uses for the filesystem tools in `/default-tools`. */
export const FILESYSTEM_TOOL_CATEGORY = "Filesystem";

/**
 * The 10 tool ids the API is expected to return under the `Filesystem`
 * category. Used only as a fallback when the default-tools list has not
 * loaded (or the category is missing) — at runtime we match by category.
 */
export const FILESYSTEM_TOOL_IDS = [
  "list_folder",
  "open_file",
  "search_filesystem",
  "create_folder",
  "edit_folder_description",
  "create_file",
  "edit_file",
  "append_file",
  "move_path",
  "delete_path",
] as const;

/** Ids of the filesystem tools as advertised by the API (by category). */
export function filesystemToolIds(defaultTools: ApiDefaultTool[]): string[] {
  const fromApi = defaultTools
    .filter((t) => t.category === FILESYSTEM_TOOL_CATEGORY)
    .map((t) => t.tool_id);
  return fromApi.length > 0 ? fromApi : [...FILESYSTEM_TOOL_IDS];
}

/** `attached` ∪ `toAdd`, preserving order and without duplicates. */
export function unionToolIds(attached: string[], toAdd: string[]): string[] {
  const out = [...attached];
  for (const id of toAdd) if (!out.includes(id)) out.push(id);
  return out;
}

/** Filesystem tool ids not yet attached to the agent. */
export function missingFilesystemToolIds(
  attached: string[],
  all: string[]
): string[] {
  return all.filter((id) => !attached.includes(id));
}
