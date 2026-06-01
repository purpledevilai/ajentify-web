"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { CodeEditor } from "@/components/primitives/code-editor";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BuilderPageHeader } from "@/components/blocks/builder-page-header";
import { BuilderSection } from "@/components/blocks/builder-section";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { JsonSchemaEditor } from "@/components/blocks/json-schema-editor";
import { useToolBuilderStore } from "@/lib/stores/tool-builder-store";
import { useToolsStore, toolsActions } from "@/lib/stores/tools-store";
import {
  isValidIdentifier,
  sanitizeIdentifier,
} from "@/lib/utils/tool-function-decl";
import { cn } from "@/lib/utils";

/**
 * Name assigned by the tools list page when a brand-new tool is created.
 * Used to detect "first edit" so we can auto-focus the name input.
 */
const DEFAULT_NEW_TOOL_NAME = "untitled_tool";

/** Inline validator for the schema editor. The typed-input path is
 *  already coerced to a valid identifier by `sanitizeIdentifier`, so this
 *  only fires for names imported via the JSON tab. */
function validateParameterName(name: string): string | null {
  if (isValidIdentifier(name)) return null;
  return "Not a valid Python identifier — use letters, digits, and underscores only (no leading digit).";
}

export default function ToolBuilderPage() {
  const params = useParams<{ tool_id: string }>();
  const tool_id = params.tool_id;
  const router = useRouter();

  // Snapshotted at mount: lets the back button pop history when the user
  // navigated in (e.g. from an agent's tool list) and fall back to the
  // tools index when this page was loaded directly. We snapshot once so
  // intra-page route changes don't flip the flag mid-session.
  const canGoBack = useRef(false);
  useEffect(() => {
    canGoBack.current =
      typeof window !== "undefined" && window.history.length > 1;
  }, []);

  function handleBack() {
    if (canGoBack.current) router.back();
    else router.push("/app/tools");
  }

  const form = useToolBuilderStore((s) => s.form);
  const codeWarning = useToolBuilderStore((s) => s.codeWarning);
  const hydrating = useToolBuilderStore((s) => s.hydrating);
  const saving = useToolBuilderStore((s) => s.saving);
  const saveError = useToolBuilderStore((s) => s.saveError);
  const notFound = useToolBuilderStore((s) => s.notFound);
  const init = useToolBuilderStore((s) => s.init);
  const setField = useToolBuilderStore((s) => s.setField);
  const resetDeclaration = useToolBuilderStore((s) => s.resetDeclaration);
  const save = useToolBuilderStore((s) => s.save);
  const discard = useToolBuilderStore((s) => s.discard);
  const isDirty = useToolBuilderStore((s) => s.isDirty);

  const ensureTools = useToolsStore((s) => s.ensureLoaded);

  const nameRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  // --- Aj page hooks ------------------------------------------------------
  // Expose the current draft + a per-field set_* action for every editable
  // field on this page. Save and Delete are deliberately NOT exposed — those
  // remain user actions. The schema is passed as a JSON value (any shape)
  // so the agent can hand back a full JSON Schema in one shot.
  const SetSchemaArgs = useMemo(
    () => z.object({ schema: z.unknown() }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "tool_detail",
        tool_id,
        not_found: notFound,
        loading: hydrating || !form,
        is_dirty: form ? isDirty() : false,
        code_warning: codeWarning,
        draft: form,
        note:
          "You can set any field via the matching set_* action; saving and deleting are user actions. The schema is a JSON Schema (Draft 2020-12) object — set_schema accepts the full schema as a JSON value.",
      },
      actions: {
        set_name: {
          description:
            "Set the tool name. Should be a Python identifier (letters, digits, underscores; no leading digit).",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_description: {
          description: "Set the tool description.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_schema: {
          description:
            "Replace the tool's parameter JSON Schema. Pass the full schema as `schema` — typically a JSON Schema Draft 2020-12 object with `type: 'object'` and a `properties` map.",
          argsSchema: z.toJSONSchema(SetSchemaArgs),
        },
        set_code: {
          description:
            "Replace the Python source for this tool. Only meaningful when is_client_side_tool is false; ignored otherwise.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_pass_context: {
          description:
            "Toggle whether the runtime context object is passed to the tool function as an extra parameter.",
          argsSchema: z.toJSONSchema(z.object({ value: z.boolean() })),
        },
        set_is_client_side_tool: {
          description:
            "Toggle client-side execution. When true, the tool runs in the browser and `code` is unused.",
          argsSchema: z.toJSONSchema(z.object({ value: z.boolean() })),
        },
      },
    }),
    [tool_id, notFound, hydrating, form, codeWarning, isDirty, SetSchemaArgs],
  );

  useDoPageAction(
    async (key, args) => {
      if (!form) {
        return { ok: false, error: "tool draft not yet hydrated" };
      }
      switch (key) {
        case "set_name":
          setField("name", String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_description":
          setField(
            "description",
            String((args as { value: unknown }).value ?? ""),
          );
          return { ok: true };
        case "set_schema": {
          const parsed = SetSchemaArgs.parse(args);
          setField("schema", parsed.schema as never);
          return { ok: true };
        }
        case "set_code":
          setField("code", String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_pass_context":
          setField("passContext", Boolean((args as { value: unknown }).value));
          return { ok: true };
        case "set_is_client_side_tool":
          setField(
            "isClientSideTool",
            Boolean((args as { value: unknown }).value),
          );
          return { ok: true };
        default:
          return { ok: false, error: `unknown action: ${key}` };
      }
    },
    [form, setField, SetSchemaArgs],
  );

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

  async function onDelete() {
    setDeleting(true);
    try {
      await toolsActions.delete(tool_id);
      router.replace("/app/tools");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <BuilderPageHeader
        onBack={handleBack}
        name={form.name}
        onNameChange={(v) => setField("name", v)}
        namePlaceholder={DEFAULT_NEW_TOOL_NAME}
        nameAriaLabel="Tool name"
        nameInputRef={nameRef}
        nameClassName="font-mono"
        description={form.description}
        onDescriptionChange={(v) => setField("description", v)}
        descriptionPlaceholder="Describe what this tool does…"
        descriptionAriaLabel="Tool description"
        dirty={dirty}
        saving={saving}
        onDiscard={discard}
        onSave={async () => {
          const ok = await save();
          if (ok) toast.success("Tool saved");
        }}
      />
      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <BuilderSection
        title="Parameters"
        description="Define the input shape the agent calls this tool with. Saved as a Parameter Definition record attached to this tool."
      >
        <JsonSchemaEditor
          value={form.schema}
          onChange={(s) => setField("schema", s)}
          sanitizePropertyName={sanitizeIdentifier}
          validatePropertyName={validateParameterName}
          propertyNameHint="Used directly as a Python parameter. Letters, digits, and underscores only."
        />
      </BuilderSection>

      <BuilderSection
        title="Behavior"
        description="Control how this tool runs at invocation time."
      >
        <ToggleRow
          label="Pass context"
          description="Inject the runtime context object (env, tokens, conversation metadata) as an extra parameter to your function."
          checked={form.passContext}
          onCheckedChange={(v) => setField("passContext", v)}
        />
        <ToggleRow
          label="Client-side execution"
          description="Delegate execution to the client. The agent only generates the call parameters; the client runs the tool and posts the result back into the conversation."
          checked={form.isClientSideTool}
          onCheckedChange={(v) => setField("isClientSideTool", v)}
        />
      </BuilderSection>

      {!form.isClientSideTool && (
        <BuilderSection
          title="Code"
          description="Python function whose name matches the tool name. Runs in a sandbox with requests, pandas, numpy, and a curated standard library."
        >
          {codeWarning === "drift" && (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">Function signature is out of sync</p>
                <p className="text-muted-foreground text-xs">
                  The <code className="font-mono">def</code> line in your code doesn&apos;t match the
                  tool name, parameters, or pass-context setting. Saving keeps
                  your version as-is.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={resetDeclaration}
                className="shrink-0"
              >
                Reset signature
              </Button>
            </div>
          )}
          <CodeEditor
            language="python"
            value={form.code}
            onChange={(v) => setField("code", v)}
            minHeight="24rem"
            maxHeight="40rem"
          />
        </BuilderSection>
      )}

      <BuilderSection title="Danger zone" className="border-destructive/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Delete tool</Label>
            <p className="text-muted-foreground text-xs">Irreversible.</p>
          </div>
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </BuilderSection>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this tool?"
        description="This will permanently remove this tool. This cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}

/** Row used inside the Behavior section: a labeled description on the
 *  left and a switch on the right, with the whole row clickable so the
 *  toggle target stays generous. */
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="hover:bg-muted/40 flex cursor-pointer items-start justify-between gap-4 rounded-md px-3 py-2 transition-colors select-none">
      <div className="min-w-0 flex-1">
        <Label className="cursor-pointer text-sm font-medium">{label}</Label>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </label>
  );
}
