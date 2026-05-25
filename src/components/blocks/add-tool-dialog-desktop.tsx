"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ADD_TOOL_TAB_IDS,
  CUSTOM_TOOLS_TAB,
  TOOL_CATEGORY_COPY,
  ToolPickerList,
  useAddToolPickerData,
  type AddToolDialogProps,
  type AddToolTabId,
} from "@/components/blocks/add-tool-picker-shared";

export function AddToolDialogDesktop({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-border shrink-0 border-b px-5 py-4">
          <DialogTitle>Add tools</DialogTitle>
          <DialogDescription>
            Attach tools this agent can call during a conversation. Changes
            apply when you save the agent.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as AddToolTabId);
            setQuery("");
          }}
          orientation="vertical"
          className="min-h-0 flex-1 gap-0 data-horizontal:flex-col sm:flex-row"
        >
          <TabsList
            variant="line"
            className="border-border shrink-0 flex-col items-stretch gap-0 overflow-y-auto border-b p-2 sm:h-auto sm:w-48 sm:border-r sm:border-b-0 sm:py-3"
          >
            {ADD_TOOL_TAB_IDS.map((tabId) => (
              <TabsTrigger
                key={tabId}
                value={tabId}
                className="justify-start px-3 py-2"
              >
                {tabId === CUSTOM_TOOLS_TAB ? "Your tools" : tabId}
              </TabsTrigger>
            ))}
          </TabsList>

          {ADD_TOOL_TAB_IDS.map((tabId) => {
            const copy = TOOL_CATEGORY_COPY[tabId];
            return (
              <TabsContent
                key={tabId}
                value={tabId}
                className="flex min-h-0 flex-1 flex-col gap-0 px-0 py-0"
              >
                <div className="border-border shrink-0 space-y-3 border-b px-5 py-4">
                  <div>
                    <h3 className="text-sm font-medium">
                      {copy.title ?? tabId}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {copy.description}
                    </p>
                  </div>
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

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
                  <ToolPickerList
                    tabId={tabId}
                    query={query}
                    attachedIds={attachedIds}
                    onChangeAttached={onChangeAttached}
                    customToolsCount={customTools.length}
                    customPickerTools={customPickerTools}
                    defaultByCategory={defaultByCategory}
                    layout="horizontal"
                  />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
