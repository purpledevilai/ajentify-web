"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, ExternalLink, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useDefaultToolsStore } from "@/lib/stores/default-tools-store";
import {
  CUSTOM_TOOLS_TAB,
  DEFAULT_TOOL_CATEGORY_ORDER,
  TOOL_CATEGORY_COPY,
  type DefaultToolCategory,
} from "@/lib/constants/default-tool-categories";
import type { ApiDefaultTool, ApiTool } from "@/types/api";
import { cn } from "@/lib/utils";

export {
  CUSTOM_TOOLS_TAB,
  TOOL_CATEGORY_COPY,
} from "@/lib/constants/default-tool-categories";

export interface PickerTool {
  tool_id: string;
  name: string;
  description?: string | null;
  source: "custom" | "default";
}

export type AddToolTabId = typeof CUSTOM_TOOLS_TAB | DefaultToolCategory;

export const ADD_TOOL_TAB_IDS = [
  CUSTOM_TOOLS_TAB,
  ...DEFAULT_TOOL_CATEGORY_ORDER,
] as const;

export function tabLabel(tabId: AddToolTabId): string {
  if (tabId === CUSTOM_TOOLS_TAB) return "Your tools";
  return tabId;
}

export interface AddToolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachedIds: string[];
  onChangeAttached: (ids: string[]) => void;
}

export function matchesQuery(tool: PickerTool, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    tool.name.toLowerCase().includes(q) ||
    (tool.description?.toLowerCase().includes(q) ?? false) ||
    tool.tool_id.toLowerCase().includes(q)
  );
}

export function toggleAttached(
  attachedIds: string[],
  toolId: string,
  onChangeAttached: (ids: string[]) => void
) {
  if (attachedIds.includes(toolId)) {
    onChangeAttached(attachedIds.filter((id) => id !== toolId));
  } else {
    onChangeAttached([...attachedIds, toolId]);
  }
}

export function useAddToolPickerData() {
  const customTools = useToolsStore((s) => s.data);
  const defaultTools = useDefaultToolsStore((s) => s.data);

  const defaultByCategory = useMemo(() => {
    const m = new Map<DefaultToolCategory, ApiDefaultTool[]>();
    for (const cat of DEFAULT_TOOL_CATEGORY_ORDER) m.set(cat, []);
    for (const t of defaultTools) {
      const cat = t.category as DefaultToolCategory;
      if (m.has(cat)) m.get(cat)!.push(t);
    }
    return m;
  }, [defaultTools]);

  const customPickerTools = useMemo<PickerTool[]>(
    () =>
      customTools.map((t: ApiTool) => ({
        tool_id: t.tool_id,
        name: t.name,
        description: t.description,
        source: "custom" as const,
      })),
    [customTools]
  );

  return { customTools, customPickerTools, defaultByCategory };
}

export function toolsForTab(
  tabId: AddToolTabId,
  customPickerTools: PickerTool[],
  defaultByCategory: Map<DefaultToolCategory, ApiDefaultTool[]>
): PickerTool[] {
  if (tabId === CUSTOM_TOOLS_TAB) return customPickerTools;
  return (defaultByCategory.get(tabId) ?? []).map((t) => ({
    tool_id: t.tool_id,
    name: t.name,
    description: t.description,
    source: "default" as const,
  }));
}

export function EmptyCustomTools() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-muted-foreground max-w-sm text-sm">
        You have not created any custom tools yet. Built-in tools are available
        in the other categories.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/app/tools" onClick={(e) => e.stopPropagation()}>
          <Plus className="size-4" />
          Create a tool
        </Link>
      </Button>
    </div>
  );
}

export function CategoryAbout({
  tabId,
  defaultExpanded = false,
  className,
}: {
  tabId: AddToolTabId;
  defaultExpanded?: boolean;
  className?: string;
}) {
  const copy = TOOL_CATEGORY_COPY[tabId];
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 text-left text-xs font-medium transition-colors"
      >
        <span>About {copy.title ?? tabLabel(tabId)}</span>
        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0" />
        )}
      </button>
      {expanded && (
        <p className="text-muted-foreground text-xs leading-relaxed">
          {copy.description}
        </p>
      )}
    </div>
  );
}

export function ToolPickerRow({
  tool,
  attached,
  onToggle,
  layout = "horizontal",
}: {
  tool: PickerTool;
  attached: boolean;
  onToggle: () => void;
  layout?: "horizontal" | "stacked";
}) {
  if (layout === "stacked") {
    return (
      <li
        className={cn(
          "border-border rounded-md border p-3 transition-colors",
          attached && "border-primary/30 bg-primary/5"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="bg-muted text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
            <Wrench className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium">{tool.name}</span>
              {tool.source === "custom" && (
                <Link
                  href={`/app/tools/${tool.tool_id}`}
                  className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 text-xs transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
            {tool.description ? (
              <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-relaxed">
                {tool.description}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs italic">
                No description
              </p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant={attached ? "solid" : "outline"}
          size="sm"
          className="mt-3 w-full"
          onClick={onToggle}
          aria-pressed={attached}
        >
          {attached ? (
            <>
              <Check className="size-4" />
              Added
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Add
            </>
          )}
        </Button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "border-border flex items-start gap-3 rounded-md border p-3 transition-colors",
        attached && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="bg-muted text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
        <Wrench className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium">{tool.name}</span>
          {tool.source === "custom" && (
            <Link
              href={`/app/tools/${tool.tool_id}`}
              className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 text-xs transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
        {tool.description ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
            {tool.description}
          </p>
        ) : (
          <p className="text-muted-foreground mt-0.5 text-xs italic">
            No description
          </p>
        )}
      </div>
      <Button
        type="button"
        variant={attached ? "solid" : "outline"}
        size="sm"
        className="shrink-0"
        onClick={onToggle}
        aria-pressed={attached}
      >
        {attached ? (
          <>
            <Check className="size-4" />
            Added
          </>
        ) : (
          <>
            <Plus className="size-4" />
            Add
          </>
        )}
      </Button>
    </li>
  );
}

export function ToolPickerList({
  tabId,
  query,
  attachedIds,
  onChangeAttached,
  customToolsCount,
  customPickerTools,
  defaultByCategory,
  layout = "horizontal",
}: {
  tabId: AddToolTabId;
  query: string;
  attachedIds: string[];
  onChangeAttached: (ids: string[]) => void;
  customToolsCount: number;
  customPickerTools: PickerTool[];
  defaultByCategory: Map<DefaultToolCategory, ApiDefaultTool[]>;
  layout?: "horizontal" | "stacked";
}) {
  const tools = toolsForTab(tabId, customPickerTools, defaultByCategory);
  const filtered = tools.filter((t) => matchesQuery(t, query));

  if (tabId === CUSTOM_TOOLS_TAB && customToolsCount === 0) {
    return <EmptyCustomTools />;
  }

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {query ? "No tools match your search." : "No tools in this category."}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {filtered.map((tool) => (
        <ToolPickerRow
          key={tool.tool_id}
          tool={tool}
          attached={attachedIds.includes(tool.tool_id)}
          layout={layout}
          onToggle={() =>
            toggleAttached(attachedIds, tool.tool_id, onChangeAttached)
          }
        />
      ))}
    </ul>
  );
}
