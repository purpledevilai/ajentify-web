/**
 * Canonical JSON Schema of an `edits` tool parameter.
 *
 * Source of truth: `ajentify-api/src/Services/TextEdits.py` (`EDITS_SCHEMA`).
 * Keep this byte-for-byte equivalent — the API strips every `x-ajentify-*`
 * key before the schema reaches an LLM, and the web schema editor uses the
 * `x-ajentify-type: "edits"` marker to recognise the pseudo-type on reload.
 *
 * Python tools apply the edits with `new_text = aj_apply_edits(old_text, edits)`;
 * client-side tools use `applyEdits(oldText, edits)` from @ajentify/chat / voice.
 */

export const EDITS_TYPE_MARKER = "x-ajentify-type";

export const EDIT_OPERATIONS = [
  "replace",
  "insert_before",
  "insert_after",
  "delete",
] as const;

export type EditOperation = (typeof EDIT_OPERATIONS)[number];

export const EDITS_DESCRIPTION =
  "Ordered, all-or-nothing text edits. Each target/anchor must occur EXACTLY once in the text (matching is exact, case- and whitespace-sensitive); include enough surrounding text to make it unique. A later edit may reference text produced by an earlier one.";

export const EDITS_SCHEMA = {
  type: "array",
  minItems: 1,
  [EDITS_TYPE_MARKER]: "edits",
  description: EDITS_DESCRIPTION,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["operation"],
    properties: {
      operation: { type: "string", enum: [...EDIT_OPERATIONS] },
      target: {
        type: "string",
        description: "Exact existing text to replace or delete (replace, delete).",
      },
      anchor: {
        type: "string",
        description:
          "Exact existing text to insert next to (insert_before, insert_after).",
      },
      content: {
        type: "string",
        description: "New text (replace, insert_before, insert_after).",
      },
    },
  },
} as const;

/** True when a JSON Schema fragment carries the `edits` marker. */
export function isEditsSchema(schema: unknown): boolean {
  return (
    !!schema &&
    typeof schema === "object" &&
    !Array.isArray(schema) &&
    (schema as Record<string, unknown>)[EDITS_TYPE_MARKER] === "edits"
  );
}

/** Build a fresh (deep-copied) `edits` schema, optionally overriding the
 *  parameter description. */
export function buildEditsSchema(description?: string): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(EDITS_SCHEMA)) as Record<string, unknown>;
  if (description) out.description = description;
  return out;
}

/** Names of the top-level properties of a tool-input schema whose type is
 *  `edits`. Used by the tool page to show the apply-edits hint. */
export function editsParamNames(schema: unknown): string[] {
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as Record<string, unknown>).properties;
  if (!props || typeof props !== "object") return [];
  return Object.entries(props as Record<string, unknown>)
    .filter(([, child]) => isEditsSchema(child))
    .map(([name]) => name);
}
