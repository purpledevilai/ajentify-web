"use client";

import * as React from "react";
import {
  AsteriskSquare,
  Braces,
  Brackets,
  ChevronDown,
  ChevronRight,
  Hash,
  Plus,
  ToggleLeft,
  Trash2,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SchemaNode, SchemaType } from "./types";
import { ITEMS_SLOT_NAME } from "./types";

interface SchemaTreeProps {
  root: SchemaNode;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
  /** Optional placeholder shown above the "Add field" button when the
   *  root is empty. */
  emptyHint?: React.ReactNode;
}

export function SchemaTree({
  root,
  selectedId,
  expandedIds,
  onSelect,
  onAddChild,
  onDelete,
  onToggleExpand,
  emptyHint,
}: SchemaTreeProps) {
  const rootEmpty =
    root.type === "object" && (root.properties ?? []).length === 0;

  return (
    <div>
      <div className="text-muted-foreground mb-2 flex items-center justify-between gap-2 px-1 text-xs font-medium tracking-wider uppercase">
        <span>Schema</span>
        <button
          type="button"
          onClick={() => onAddChild(root.id)}
          className="text-foreground/70 hover:text-foreground inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.7rem] tracking-normal normal-case transition-colors"
          aria-label="Add top-level field"
        >
          <Plus className="size-3.5" />
          Add field
        </button>
      </div>

      <TreeRow
        node={root}
        depth={0}
        isRoot
        isItemsSlot={false}
        selectedId={selectedId}
        expandedIds={expandedIds}
        onSelect={onSelect}
        onAddChild={onAddChild}
        onDelete={onDelete}
        onToggleExpand={onToggleExpand}
      />

      {rootEmpty && (
        <div className="text-muted-foreground mt-2 rounded-md border border-dashed border-input px-3 py-4 text-center text-xs">
          {emptyHint ?? (
            <>
              No fields yet.
              <br />
              Click <span className="font-medium">Add field</span> to start.
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recursive row                                                              */
/* -------------------------------------------------------------------------- */

interface TreeRowProps {
  node: SchemaNode;
  depth: number;
  isRoot: boolean;
  isItemsSlot: boolean;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

function TreeRow({
  node,
  depth,
  isRoot,
  isItemsSlot,
  selectedId,
  expandedIds,
  onSelect,
  onAddChild,
  onDelete,
  onToggleExpand,
}: TreeRowProps) {
  const isContainer = node.type === "object" || node.type === "array";
  const expanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const canDelete = !isRoot && !isItemsSlot;
  const canAddChild = node.type === "object";

  // Root is rendered without its own row (the section header is the
  // implicit root indicator). We still render its children.
  if (isRoot) {
    return (
      <>
        {(node.properties ?? []).map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={0}
            isRoot={false}
            isItemsSlot={false}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onToggleExpand={onToggleExpand}
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-selected={isSelected}
        aria-expanded={isContainer ? expanded : undefined}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(node.id);
          } else if (e.key === "ArrowRight" && isContainer && !expanded) {
            e.preventDefault();
            onToggleExpand(node.id);
          } else if (e.key === "ArrowLeft" && isContainer && expanded) {
            e.preventDefault();
            onToggleExpand(node.id);
          }
        }}
        className={cn(
          "group/row flex cursor-pointer items-center gap-1.5 rounded-md py-1 pr-1 text-sm outline-none transition-colors",
          "hover:bg-muted/60",
          isSelected && "bg-primary/10 hover:bg-primary/15",
          "focus-visible:ring-2 focus-visible:ring-ring/50"
        )}
        style={{ paddingLeft: 4 + depth * 14 }}
      >
        {/* Expand caret (or spacer) */}
        {isContainer ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            aria-label={expanded ? "Collapse" : "Expand"}
            className="text-muted-foreground hover:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span aria-hidden className="inline-block size-4 shrink-0" />
        )}

        <TypeIcon type={node.type} />

        <span
          className={cn(
            "truncate font-medium",
            !node.name && "text-muted-foreground italic font-normal",
            isItemsSlot && "text-muted-foreground italic"
          )}
          title={node.name || "(unnamed)"}
        >
          {isItemsSlot ? (
            <>
              <span aria-hidden>&lt;</span>
              {ITEMS_SLOT_NAME}
              <span aria-hidden>&gt;</span>
            </>
          ) : (
            node.name || "(unnamed)"
          )}
        </span>

        <span className="text-muted-foreground shrink-0 text-xs">
          {formatTypeBadge(node)}
        </span>

        {node.required && !isItemsSlot && (
          <span
            aria-label="required"
            title="Required"
            className="text-destructive shrink-0 text-xs font-semibold leading-none"
          >
            *
          </span>
        )}

        {/* Hover actions */}
        <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
          {canAddChild && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              aria-label="Add field"
              title="Add field"
              className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-6 items-center justify-center rounded transition-colors"
            >
              <Plus className="size-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.id);
              }}
              aria-label="Delete field"
              title="Delete"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 inline-flex size-6 items-center justify-center rounded transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {isContainer && expanded && (
        <>
          {node.type === "object" &&
            (node.properties ?? []).map((child) => (
              <TreeRow
                key={child.id}
                node={child}
                depth={depth + 1}
                isRoot={false}
                isItemsSlot={false}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onToggleExpand={onToggleExpand}
              />
            ))}
          {node.type === "array" && node.items && (
            <TreeRow
              node={node.items}
              depth={depth + 1}
              isRoot={false}
              isItemsSlot
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onToggleExpand={onToggleExpand}
            />
          )}
          {/* Inline "add child" affordance — easier discovery than the
              hover-only button when a container is open and empty. */}
          {node.type === "object" && (node.properties ?? []).length === 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddChild(node.id);
              }}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded py-1 text-xs"
              style={{ paddingLeft: 4 + (depth + 1) * 14 + 22 }}
            >
              <Plus className="size-3" />
              Add field
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function TypeIcon({ type }: { type: SchemaType }) {
  const cls = "text-muted-foreground size-3.5 shrink-0";
  if (type === "object") return <Braces className={cls} />;
  if (type === "array") return <Brackets className={cls} />;
  if (type === "boolean") return <ToggleLeft className={cls} />;
  if (type === "number" || type === "integer")
    return <Hash className={cls} />;
  if (type === "string") return <Type className={cls} />;
  return <AsteriskSquare className={cls} />;
}

function formatTypeBadge(node: SchemaNode): string {
  if (node.type === "array") {
    const itemType = node.items?.type ?? "string";
    return `array<${itemType}>`;
  }
  return node.type;
}
