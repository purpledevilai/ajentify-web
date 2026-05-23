"use client";

import * as React from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CodeEditor } from "@/components/primitives/code-editor";
import { cn } from "@/lib/utils";
import {
  canonicalJson,
  nodeToSchema,
  schemaToRoot,
} from "./schema-conversion";
import { SchemaTree } from "./schema-tree";
import { FieldDetailsPanel } from "./field-details-panel";
import {
  ITEMS_SLOT_NAME,
  addChild,
  collectContainerIds,
  findNode,
  makeNode,
  patchNode,
  removeNode,
  type SchemaNode,
} from "./types";

/**
 * Visual + raw JSON editor for a JSON-Schema (Draft 2020-12) describing the
 * input parameters of an agent tool. The root is always treated as an object;
 * primitives, nested objects, and arrays of any type are supported.
 *
 * Works in both controlled and uncontrolled modes:
 *
 * - **Uncontrolled** (recommended for simple forms): pass `defaultValue` and
 *   hold a `ref` to call `getValue()` on submit.
 * - **Controlled** (recommended when state lives in a store): pass `value`
 *   and `onChange`. The editor will re-derive its tree whenever `value`
 *   structurally differs from its current projection.
 */
export interface JsonSchemaEditorProps {
  value?: Record<string, unknown>;
  defaultValue?: Record<string, unknown>;
  onChange?: (schema: Record<string, unknown>) => void;
  className?: string;
  /** Override the hint shown when the schema has no fields. */
  emptyHint?: React.ReactNode;
}

export interface JsonSchemaEditorHandle {
  /** Current schema as a plain JSON-Schema-shaped object. */
  getValue(): Record<string, unknown>;
}

export const JsonSchemaEditor = React.forwardRef<
  JsonSchemaEditorHandle,
  JsonSchemaEditorProps
>(function JsonSchemaEditor(
  { value, defaultValue, onChange, className, emptyHint },
  ref
) {
  const isControlled = value !== undefined;

  const [tree, setTree] = React.useState<SchemaNode>(() =>
    schemaToRoot(isControlled ? value : defaultValue)
  );
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() =>
    collectContainerIds(tree)
  );
  const [mode, setMode] = React.useState<"visual" | "json">("visual");

  // The JSON-mode buffer is independent of the tree so transient invalid
  // text doesn't blow away the visual state. We seed it on entry to the
  // JSON tab and try to commit it back to the tree on exit.
  const [jsonText, setJsonText] = React.useState<string>("");
  const [jsonError, setJsonError] = React.useState<string | null>(null);

  /* ----------------------------- Controlled sync ----------------------- */
  // When the parent feeds in a structurally different `value`, rebuild the
  // tree. We compare canonical JSON so reordered keys don't trigger a
  // pointless reset — and so our own onChange→value→effect loop short-
  // circuits as soon as the projection matches.
  const lastEmittedRef = React.useRef<string>(canonicalJson(nodeToSchema(tree)));
  React.useEffect(() => {
    if (!isControlled) return;
    const incoming = canonicalJson(value);
    if (incoming === lastEmittedRef.current) return;
    const fresh = schemaToRoot(value);
    setTree(fresh);
    lastEmittedRef.current = canonicalJson(nodeToSchema(fresh));
    setExpandedIds((prev) => {
      // Preserve user-toggled expand state where possible — only seed
      // newly-introduced container ids.
      const next = new Set(prev);
      collectContainerIds(fresh).forEach((id) => next.add(id));
      return next;
    });
  }, [value, isControlled]);

  /* ------------------------------- Mutators ---------------------------- */

  // `commitTree` is the only path that both updates the visual tree state
  // *and* notifies the parent. Side effects MUST NOT live inside a
  // `setState` updater function — React 19 re-invokes updaters during the
  // next render to validate purity, and a nested `onChange` would surface
  // as "Cannot update a component while rendering a different component".
  // Event handlers compute the next tree from the current render-scoped
  // closure (`tree`) and pass it in directly, which is fine for
  // user-driven events.
  const commitTree = React.useCallback(
    (next: SchemaNode) => {
      const schema = nodeToSchema(next);
      lastEmittedRef.current = canonicalJson(schema);
      setTree(next);
      onChange?.(schema);
    },
    [onChange]
  );

  /* ------------------------------- Imperative handle ------------------ */

  React.useImperativeHandle(
    ref,
    () => ({
      getValue: () => nodeToSchema(tree),
    }),
    [tree]
  );

  /* ------------------------------- Selection helpers ------------------ */

  const found = selectedId ? findNode(tree, selectedId) : null;
  const selectedNode = found?.node ?? null;
  const selectedParent = found?.path[found.path.length - 1] ?? null;
  const isRootSelected = selectedNode?.id === tree.id;
  const isItemsSlot =
    !!selectedNode &&
    !!selectedParent &&
    selectedParent.type === "array" &&
    selectedParent.items?.id === selectedNode.id;

  const siblingNames = React.useMemo(() => {
    if (!selectedParent || selectedParent.type !== "object") return [];
    return (selectedParent.properties ?? [])
      .filter((c) => c.id !== selectedNode?.id)
      .map((c) => c.name)
      .filter(Boolean);
  }, [selectedParent, selectedNode]);

  /* ------------------------------- Handlers --------------------------- */

  function handlePatch(patch: Partial<SchemaNode>) {
    if (!selectedNode) return;
    commitTree(patchNode(tree, selectedNode.id, patch));
  }

  function handleAddChild(parentId: string) {
    const child = makeNode({ name: "", type: "string" });
    commitTree(addChild(tree, parentId, child));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.add(parentId);
      return next;
    });
    setSelectedId(child.id);
  }

  function handleDelete(id: string) {
    commitTree(removeNode(tree, id));
    if (selectedId === id) setSelectedId(null);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ------------------------------- JSON mode --------------------------- */

  function commitJson(text: string) {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Schema must be a JSON object.");
        return null;
      }
      setJsonError(null);
      return parsed as Record<string, unknown>;
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return null;
    }
  }

  function handleJsonChange(text: string) {
    setJsonText(text);
    const parsed = commitJson(text);
    if (parsed) {
      commitTree(schemaToRoot(parsed));
    }
  }

  function handleModeChange(next: string | null) {
    if (next !== "visual" && next !== "json") return;
    if (next === "json" && mode === "visual") {
      setJsonText(JSON.stringify(nodeToSchema(tree), null, 2));
      setJsonError(null);
    } else if (next === "visual" && mode === "json") {
      // Best-effort commit. If invalid, the tree is left at the last valid
      // state and the error stays on screen if the user flips back.
      commitJson(jsonText);
    }
    setMode(next);
  }

  /* ------------------------------- Render ----------------------------- */

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs
        value={mode}
        onValueChange={(v) => handleModeChange(v as string | null)}
      >
        <TabsList>
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="visual" className="mt-0">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="bg-card border-border rounded-lg border p-3">
              <SchemaTree
                root={tree}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={setSelectedId}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                onToggleExpand={toggleExpand}
                emptyHint={emptyHint}
              />
            </div>

            <div className="bg-card border-border rounded-lg border p-4">
              <FieldDetailsPanel
                node={selectedNode}
                isRoot={!!isRootSelected}
                isItemsSlot={isItemsSlot}
                siblingNames={siblingNames}
                onChange={handlePatch}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="json" className="mt-0">
          <CodeEditor
            value={jsonText}
            language="json"
            onChange={handleJsonChange}
            minHeight="320px"
            maxHeight="600px"
          />
          {jsonError && (
            <p className="text-destructive mt-2 text-xs">{jsonError}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
});

JsonSchemaEditor.displayName = "JsonSchemaEditor";

/** Re-export the items slot name so callers building a schema by hand can
 *  reference the same constant the visual editor uses. */
export { ITEMS_SLOT_NAME };
