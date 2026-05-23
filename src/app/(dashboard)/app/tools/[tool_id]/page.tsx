"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { CodeEditor } from "@/components/primitives/code-editor";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderSection } from "@/components/blocks/builder-section";
import { JsonSchemaEditor } from "@/components/blocks/json-schema-editor";
import { useToolBuilderStore } from "@/lib/stores/tool-builder-store";
import { useToolsStore } from "@/lib/stores/tools-store";
import { cn } from "@/lib/utils";

/**
 * Name assigned by the tools list page when a brand-new tool is created.
 * Used to detect "first edit" so we can auto-focus the name input.
 */
const DEFAULT_NEW_TOOL_NAME = "untitled_tool";

export default function ToolBuilderPage() {
  const params = useParams<{ tool_id: string }>();
  const tool_id = params.tool_id;

  const form = useToolBuilderStore((s) => s.form);
  const hydrating = useToolBuilderStore((s) => s.hydrating);
  const saving = useToolBuilderStore((s) => s.saving);
  const saveError = useToolBuilderStore((s) => s.saveError);
  const notFound = useToolBuilderStore((s) => s.notFound);
  const init = useToolBuilderStore((s) => s.init);
  const setField = useToolBuilderStore((s) => s.setField);
  const save = useToolBuilderStore((s) => s.save);
  const discard = useToolBuilderStore((s) => s.discard);
  const isDirty = useToolBuilderStore((s) => s.isDirty);

  const ensureTools = useToolsStore((s) => s.ensureLoaded);

  const nameRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);

  useEffect(() => {
    ensureTools();
  }, [ensureTools]);

  useEffect(() => {
    if (tool_id) init(tool_id);
    didAutoFocus.current = false;
  }, [tool_id, init]);

  // Auto-focus + select the name when the form first hydrates with the
  // default name, so a newly-created tool lands ready to be renamed.
  useEffect(() => {
    if (!form || didAutoFocus.current) return;
    didAutoFocus.current = true;
    if (form.name === DEFAULT_NEW_TOOL_NAME) {
      requestAnimationFrame(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      });
    }
  }, [form]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (useToolBuilderStore.getState().isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Tool not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This tool doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/tools">
            <ArrowLeft className="size-4" />
            Back to tools
          </Link>
        </Button>
      </div>
    );
  }

  if (hydrating || !form) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dirty = isDirty();

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
          >
            <Link href="/app/tools" aria-label="Back to tools">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <input
              ref={nameRef}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder={DEFAULT_NEW_TOOL_NAME}
              aria-label="Tool name"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className={cn(
                "w-full rounded-md bg-transparent px-2 py-1 font-mono text-2xl font-semibold tracking-tight outline-none",
                "placeholder:text-muted-foreground/60",
                "hover:bg-muted/60 focus:bg-muted/60",
                "focus-visible:ring-ring/40 focus-visible:ring-2",
                "-ml-2 transition-colors"
              )}
            />
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Describe what this tool does…"
              aria-label="Tool description"
              rows={1}
              className={cn(
                "text-muted-foreground field-sizing-content mt-0.5 w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm outline-none",
                "placeholder:text-muted-foreground/60",
                "hover:bg-muted/60 focus:bg-muted/60",
                "focus-visible:ring-ring/40 focus-visible:ring-2",
                "-ml-2 transition-colors"
              )}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {dirty && <Badge variant="secondary">Unsaved changes</Badge>}
          <Button
            variant="ghost"
            onClick={discard}
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button
            variant="gradient"
            onClick={save}
            disabled={!dirty || saving}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <BuilderSection
        title="Parameters"
        description="Define the input shape the agent calls this tool with. Saved as a Parameter Definition record attached to this tool."
      >
        <JsonSchemaEditor
          value={form.schema}
          onChange={(s) => setField("schema", s)}
        />
      </BuilderSection>

      <BuilderSection
        title="Code"
        description="Python function whose name matches the tool name. Runs in a sandbox with requests, pandas, numpy, and a curated standard library."
      >
        <CodeEditor
          language="python"
          value={form.code}
          onChange={(v) => setField("code", v)}
          minHeight="24rem"
          maxHeight="40rem"
        />
      </BuilderSection>
    </div>
  );
}
