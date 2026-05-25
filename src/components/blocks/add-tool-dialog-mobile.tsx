"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ADD_TOOL_TAB_IDS,
  CategoryAbout,
  CUSTOM_TOOLS_TAB,
  tabLabel,
  ToolPickerList,
  useAddToolPickerData,
  type AddToolDialogProps,
  type AddToolTabId,
} from "@/components/blocks/add-tool-picker-shared";
import { cn } from "@/lib/utils";

export function AddToolDialogMobile({
  open,
  onOpenChange,
  attachedIds,
  onChangeAttached,
}: AddToolDialogProps) {
  const { customTools, customPickerTools, defaultByCategory } =
    useAddToolPickerData();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<AddToolTabId>(CUSTOM_TOOLS_TAB);

  useEffect(() => {
    if (open) {
      setActiveTab(CUSTOM_TOOLS_TAB);
      setQuery("");
    }
  }, [open]);

  const attachedCount = attachedIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="fixed inset-0 top-0 left-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none p-0 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <DialogHeader className="border-border shrink-0 space-y-1 border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <DialogTitle>Add tools</DialogTitle>
          <DialogDescription className="text-xs">
            Tap Add on each tool you want this agent to use. Save the agent to
            keep changes.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border shrink-0 space-y-3 border-b px-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="tool-category" className="text-xs">
              Category
            </Label>
            <CategoryPickerNative
              id="tool-category"
              value={activeTab}
              onChange={(tabId) => {
                setActiveTab(tabId);
                setQuery("");
              }}
            />
          </div>

          <CategoryAbout key={activeTab} tabId={activeTab} />

          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools…"
              className="pl-8"
              aria-label="Search tools"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <ToolPickerList
            tabId={activeTab}
            query={query}
            attachedIds={attachedIds}
            onChangeAttached={onChangeAttached}
            customToolsCount={customTools.length}
            customPickerTools={customPickerTools}
            defaultByCategory={defaultByCategory}
            layout="stacked"
          />
        </div>

        {attachedCount > 0 && (
          <div className="border-border bg-muted/40 text-muted-foreground shrink-0 border-t px-4 py-2.5 text-center text-xs tabular-nums pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            {attachedCount} tool{attachedCount === 1 ? "" : "s"} selected
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Native `<select>` for mobile category picking. Base UI's Select popup sets
 * `--anchor-width` asynchronously on touch (alignItemWithTrigger is disabled
 * for touch), so the dropdown briefly renders at min-width then animates wider
 * on every open. The native control avoids portal positioning entirely and
 * uses the OS picker sheet on phones.
 */
function CategoryPickerNative({
  id,
  value,
  onChange,
}: {
  id: string;
  value: AddToolTabId;
  onChange: (tabId: AddToolTabId) => void;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as AddToolTabId)}
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base outline-none",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:bg-input/30"
        )}
      >
        {ADD_TOOL_TAB_IDS.map((tabId) => (
          <option key={tabId} value={tabId}>
            {tabLabel(tabId)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}
