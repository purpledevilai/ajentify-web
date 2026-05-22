/**
 * JSON Schema (Draft 2020-12) ↔ `SchemaNode` tree conversion.
 *
 * The conversion is intentionally lossy-tolerant: unknown keywords are
 * preserved verbatim in `node.extra` so round-tripping doesn't drop data
 * we don't surface visually. The visual editor focuses on the canonical
 * subset used by tool-input schemas (object with typed, possibly nested
 * properties); anything more exotic is round-tripped via the JSON tab.
 */

import {
  ITEMS_SLOT_NAME,
  makeNode,
  type SchemaNode,
  type SchemaType,
} from "./types";

/** Top-level + per-type JSON Schema keys we map onto explicit `SchemaNode`
 *  fields. Anything outside this list lands in `node.extra`. */
const KNOWN_KEYS = new Set([
  "type",
  "description",
  "default",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "enum",
  "minimum",
  "maximum",
  "multipleOf",
]);

function pickExtra(
  schema: Record<string, unknown>
): Record<string, unknown> | undefined {
  let extra: Record<string, unknown> | undefined;
  for (const k of Object.keys(schema)) {
    if (KNOWN_KEYS.has(k)) continue;
    extra ??= {};
    extra[k] = schema[k];
  }
  return extra;
}

function coerceType(t: unknown): SchemaType {
  if (
    typeof t === "string" &&
    (t === "string" ||
      t === "number" ||
      t === "integer" ||
      t === "boolean" ||
      t === "object" ||
      t === "array")
  ) {
    return t;
  }
  return "string";
}

/** Convert a JSON Schema fragment to a `SchemaNode`. The caller supplies
 *  the desired property `name` (since schemas don't store their own name)
 *  and whether the *parent* marks this property as required. */
export function schemaToNode(
  name: string,
  schema: Record<string, unknown>,
  isRequired = false
): SchemaNode {
  const type = coerceType(schema.type);
  const node: SchemaNode = makeNode({
    name,
    type,
    description:
      typeof schema.description === "string" ? schema.description : undefined,
    required: isRequired || undefined,
    default: "default" in schema ? schema.default : undefined,
    extra: pickExtra(schema),
  });

  if (type === "string") {
    if (typeof schema.minLength === "number") node.minLength = schema.minLength;
    if (typeof schema.maxLength === "number") node.maxLength = schema.maxLength;
    if (typeof schema.pattern === "string") node.pattern = schema.pattern;
    if (typeof schema.format === "string") node.format = schema.format;
    if (Array.isArray(schema.enum)) {
      const strings = schema.enum.filter(
        (v): v is string => typeof v === "string"
      );
      if (strings.length > 0) node.enumValues = strings;
    }
  } else if (type === "number" || type === "integer") {
    if (typeof schema.minimum === "number") node.minimum = schema.minimum;
    if (typeof schema.maximum === "number") node.maximum = schema.maximum;
    if (typeof schema.multipleOf === "number")
      node.multipleOf = schema.multipleOf;
  } else if (type === "object") {
    const props = (schema.properties ?? {}) as Record<string, unknown>;
    const requiredArr = Array.isArray(schema.required)
      ? (schema.required as unknown[]).filter(
          (v): v is string => typeof v === "string"
        )
      : [];
    const required = new Set(requiredArr);
    node.properties = Object.entries(props).map(([childName, child]) =>
      schemaToNode(
        childName,
        (child ?? {}) as Record<string, unknown>,
        required.has(childName)
      )
    );
    if (typeof schema.additionalProperties === "boolean") {
      node.additionalProperties = schema.additionalProperties;
    }
  } else if (type === "array") {
    const items = (schema.items ?? { type: "string" }) as Record<
      string,
      unknown
    >;
    node.items = schemaToNode(ITEMS_SLOT_NAME, items, false);
    if (typeof schema.minItems === "number") node.minItems = schema.minItems;
    if (typeof schema.maxItems === "number") node.maxItems = schema.maxItems;
  }

  return node;
}

/** Convert a `SchemaNode` back into a JSON Schema fragment. */
export function nodeToSchema(node: SchemaNode): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Preserve unknown keys first so explicit values below override them on
  // conflict — defensive in case `extra` was edited by hand.
  if (node.extra) Object.assign(out, node.extra);

  out.type = node.type;
  if (node.description) out.description = node.description;
  if (node.default !== undefined) out.default = node.default;

  if (node.type === "string") {
    if (node.minLength !== undefined) out.minLength = node.minLength;
    if (node.maxLength !== undefined) out.maxLength = node.maxLength;
    if (node.pattern) out.pattern = node.pattern;
    if (node.format) out.format = node.format;
    if (node.enumValues && node.enumValues.length > 0) out.enum = node.enumValues;
  } else if (node.type === "number" || node.type === "integer") {
    if (node.minimum !== undefined) out.minimum = node.minimum;
    if (node.maximum !== undefined) out.maximum = node.maximum;
    if (node.multipleOf !== undefined) out.multipleOf = node.multipleOf;
  } else if (node.type === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const child of node.properties ?? []) {
      if (!child.name) continue; // skip unnamed children (mid-edit state)
      properties[child.name] = nodeToSchema(child);
      if (child.required) required.push(child.name);
    }
    out.properties = properties;
    out.required = required;
    // Default to `additionalProperties: false` because OpenAI / Anthropic
    // tool-call payloads reject unknown keys. Callers can override via the
    // visual toggle or by providing a schema that explicitly sets it.
    out.additionalProperties =
      node.additionalProperties !== undefined ? node.additionalProperties : false;
  } else if (node.type === "array") {
    out.items = node.items ? nodeToSchema(node.items) : { type: "string" };
    if (node.minItems !== undefined) out.minItems = node.minItems;
    if (node.maxItems !== undefined) out.maxItems = node.maxItems;
  }

  return out;
}

/** Build the root tree node from an input schema. The root is always
 *  treated as an object — appropriate for tool-input parameter schemas
 *  and for the editor's mental model. If the caller passes a non-object
 *  type, we coerce. */
export function schemaToRoot(
  schema: Record<string, unknown> | undefined
): SchemaNode {
  if (!schema || typeof schema !== "object") {
    return makeNode({ name: "root", type: "object", properties: [] });
  }
  const coerced = { ...schema, type: "object" as const };
  return schemaToNode("root", coerced, false);
}

/** Stable JSON used to detect "did this schema actually change" without
 *  worrying about key order. Returns the canonical pretty-printed text. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return value;
}
