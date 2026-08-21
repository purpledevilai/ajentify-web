"use client";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { McpToolDef } from "@/types/api";
import { cn } from "@/lib/utils";

function schemaParamNames(schema?: Record<string, unknown> | null): string[] {
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== "object") return [];
  return Object.keys(props);
}

export interface McpToolPickerProps {
  tools: McpToolDef[];
  selectedNames: string[];
  onChange: (names: string[]) => void;
  className?: string;
}

/** Renders the full tool list from an MCP server with a Switch per tool to
 * include/exclude it from the connection's exposed set. Shows each tool's
 * name, description, input params, and output (when advertised). */
export function McpToolPicker({
  tools,
  selectedNames,
  onChange,
  className,
}: McpToolPickerProps) {
  const selected = new Set(selectedNames);

  function toggle(name: string) {
    if (selected.has(name)) {
      onChange(selectedNames.filter((n) => n !== name));
    } else {
      onChange([...selectedNames, name]);
    }
  }

  if (tools.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        This MCP server exposes no tools.
      </p>
    );
  }

  const selectedCount = tools.reduce((n, t) => (selected.has(t.name) ? n + 1 : n), 0);
  const allSelected = selectedCount === tools.length;

  function toggleAll() {
    onChange(allSelected ? [] : tools.map((t) => t.name));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="border-border bg-muted/30 flex items-center justify-between gap-3 rounded-md border px-3 py-2">
        <span className="text-muted-foreground text-xs">
          {selectedCount} of {tools.length} selected
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          Select all
          <Switch
            checked={allSelected}
            onCheckedChange={toggleAll}
            aria-label={allSelected ? "Deselect all tools" : "Select all tools"}
          />
        </label>
      </div>
      <ul className="space-y-2">
      {tools.map((tool) => {
        const isOn = selected.has(tool.name);
        const inputs = schemaParamNames(tool.input_schema);
        const outputs = schemaParamNames(tool.output_schema);
        return (
          <li
            key={tool.name}
            className={cn(
              "border-border rounded-md border p-3 transition-colors",
              isOn && "border-primary/30 bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium break-all">
                    {tool.name}
                  </span>
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
                {(inputs.length > 0 || outputs.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {inputs.map((p) => (
                      <Badge key={`in-${p}`} variant="secondary" className="font-mono text-[10px]">
                        in: {p}
                      </Badge>
                    ))}
                    {outputs.map((p) => (
                      <Badge key={`out-${p}`} variant="outline" className="font-mono text-[10px]">
                        out: {p}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Switch
                checked={isOn}
                onCheckedChange={() => toggle(tool.name)}
                aria-label={`Include ${tool.name}`}
                className="mt-0.5 shrink-0"
              />
            </div>
          </li>
        );
      })}
      </ul>
    </div>
  );
}
