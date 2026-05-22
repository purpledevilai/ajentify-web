/**
 * Internal tree representation used by the visual JSON-Schema editor.
 *
 * Each `SchemaNode` is a stable, id-keyed projection of a single JSON Schema
 * fragment. The id only lives in memory — it lets the React tree maintain
 * selection / expand state across edits without depending on the (mutable)
 * field name. Conversion to/from raw JSON Schema lives in
 * `./schema-conversion`.
 *
 * `required` is stored on the node for ergonomics, even though canonical
 * JSON Schema records it as an array on the *containing* object. The
 * serializer aggregates these back into the parent's `required` field.
 */

export type SchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array";

export interface SchemaNode {
  id: string;
  /** Property name. Empty string is allowed mid-edit but the serializer
   *  drops unnamed nodes from the parent's `properties` map. The synthetic
   *  array-items slot uses the reserved name `"items"`. */
  name: string;
  type: SchemaType;
  description?: string;
  /** Whether the *parent* object should list this property as required.
   *  Ignored on the root node and on array items. */
  required?: boolean;
  default?: unknown;

  // string-only constraints
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  enumValues?: string[];

  // number / integer constraints
  minimum?: number;
  maximum?: number;
  multipleOf?: number;

  // object-only
  properties?: SchemaNode[];
  additionalProperties?: boolean;

  // array-only
  items?: SchemaNode;
  minItems?: number;
  maxItems?: number;

  /** JSON Schema keywords we don't surface in the visual editor (e.g.
   *  `$schema`, `title`, `oneOf`, …). Preserved verbatim so round-tripping
   *  is non-destructive for the common case. */
  extra?: Record<string, unknown>;
}

/** Reserved name for the synthetic node representing an array's `items`
 *  schema. Treated specially by the UI (locked name, not deletable). */
export const ITEMS_SLOT_NAME = "items";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Build a node, applying type-appropriate defaults. When the caller flips
 * a node's `type`, calling `makeNode({...prev, type: newType})` will both
 * clear inapplicable fields and seed the structural ones (e.g. an array
 * gets a fresh `items` template).
 */
export function makeNode(partial: Partial<SchemaNode> = {}): SchemaNode {
  const type: SchemaType = partial.type ?? "string";
  const base: SchemaNode = {
    id: partial.id ?? newId(),
    name: partial.name ?? "",
    type,
    description: partial.description,
    required: partial.required,
    default: partial.default,
    extra: partial.extra,
  };

  if (type === "string") {
    base.minLength = partial.minLength;
    base.maxLength = partial.maxLength;
    base.pattern = partial.pattern;
    base.format = partial.format;
    base.enumValues = partial.enumValues;
  } else if (type === "number" || type === "integer") {
    base.minimum = partial.minimum;
    base.maximum = partial.maximum;
    base.multipleOf = partial.multipleOf;
  } else if (type === "object") {
    base.properties = partial.properties ?? [];
    base.additionalProperties = partial.additionalProperties;
  } else if (type === "array") {
    base.items =
      partial.items ?? makeNode({ name: ITEMS_SLOT_NAME, type: "string" });
    base.minItems = partial.minItems;
    base.maxItems = partial.maxItems;
  }

  return base;
}

/* -------------------------------------------------------------------------- */
/* Tree operations (all immutable)                                            */
/* -------------------------------------------------------------------------- */

export interface FindResult {
  node: SchemaNode;
  /** Ancestors from the root (exclusive of the node itself), root first. */
  path: SchemaNode[];
}

export function findNode(
  root: SchemaNode,
  id: string,
  path: SchemaNode[] = []
): FindResult | null {
  if (root.id === id) return { node: root, path };
  if (root.type === "object" && root.properties) {
    for (const child of root.properties) {
      const r = findNode(child, id, [...path, root]);
      if (r) return r;
    }
  }
  if (root.type === "array" && root.items) {
    const r = findNode(root.items, id, [...path, root]);
    if (r) return r;
  }
  return null;
}

/** Replace a node by id with an arbitrary new node. */
function replaceNode(
  root: SchemaNode,
  id: string,
  replacement: SchemaNode
): SchemaNode {
  if (root.id === id) return replacement;
  if (root.type === "object" && root.properties) {
    let changed = false;
    const next = root.properties.map((c) => {
      const r = replaceNode(c, id, replacement);
      if (r !== c) changed = true;
      return r;
    });
    if (changed) return { ...root, properties: next };
  }
  if (root.type === "array" && root.items) {
    const r = replaceNode(root.items, id, replacement);
    if (r !== root.items) return { ...root, items: r };
  }
  return root;
}

/**
 * Patch a single node identified by id. Type changes are handled via
 * `makeNode` so structural defaults (e.g. fresh `items` for new arrays)
 * are applied automatically. Children of a type that didn't change are
 * preserved.
 */
export function patchNode(
  root: SchemaNode,
  id: string,
  patch: Partial<SchemaNode>
): SchemaNode {
  const found = findNode(root, id);
  if (!found) return root;
  const prev = found.node;
  const typeChanged = patch.type !== undefined && patch.type !== prev.type;
  const merged = makeNode({ ...prev, ...patch });

  if (!typeChanged) {
    // Keep existing structural children unless explicitly replaced.
    if (prev.type === "object") {
      merged.properties = patch.properties ?? prev.properties;
    } else if (prev.type === "array") {
      merged.items = patch.items ?? prev.items;
    }
  }

  return replaceNode(root, id, merged);
}

/** Append a child to an object node. No-op on non-object parents. */
export function addChild(
  root: SchemaNode,
  parentId: string,
  child: SchemaNode
): SchemaNode {
  const found = findNode(root, parentId);
  if (!found || found.node.type !== "object") return root;
  const next: SchemaNode = {
    ...found.node,
    properties: [...(found.node.properties ?? []), child],
  };
  return replaceNode(root, parentId, next);
}

/**
 * Remove a node. Refuses to remove the root or an array's `items` slot
 * (those are positional, not deletable — change their type instead).
 * Returns the original tree unchanged in those cases.
 */
export function removeNode(root: SchemaNode, id: string): SchemaNode {
  if (root.id === id) return root;
  // The items slot is identified by being the `items` field of an array
  // parent. We block removal by short-circuiting before descending into it.
  if (root.type === "object" && root.properties) {
    const idx = root.properties.findIndex((c) => c.id === id);
    if (idx >= 0) {
      const next = [...root.properties];
      next.splice(idx, 1);
      return { ...root, properties: next };
    }
    let changed = false;
    const recursed = root.properties.map((c) => {
      const r = removeNode(c, id);
      if (r !== c) changed = true;
      return r;
    });
    if (changed) return { ...root, properties: recursed };
  }
  if (root.type === "array" && root.items) {
    if (root.items.id === id) {
      // refuse to delete items slot
      return root;
    }
    const r = removeNode(root.items, id);
    if (r !== root.items) return { ...root, items: r };
  }
  return root;
}

/**
 * Collect the ids of every node in the tree. Used by the visual editor to
 * default-expand all containers on initial mount.
 */
export function collectContainerIds(root: SchemaNode, into: Set<string> = new Set()): Set<string> {
  if (root.type === "object" || root.type === "array") into.add(root.id);
  if (root.type === "object") {
    for (const c of root.properties ?? []) collectContainerIds(c, into);
  } else if (root.type === "array" && root.items) {
    collectContainerIds(root.items, into);
  }
  return into;
}
