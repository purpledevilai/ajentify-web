"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { CopyButton } from "@/components/blocks/copy-button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderSection } from "@/components/blocks/builder-section";
import { BuilderPageHeader } from "@/components/blocks/builder-page-header";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { AddToolDialog } from "@/components/blocks/add-tool-dialog";
import { useAgentBuilderStore } from "@/lib/stores/agent-builder-store";
import { useAgentsStore, agentsActions } from "@/lib/stores/agents-store";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useDefaultToolsStore } from "@/lib/stores/default-tools-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { usePdStore } from "@/lib/stores/parameter-definitions-store";
import {
  getParamNamesFromSchema,
  getToolParamNames,
  type ToolParamName,
} from "@/lib/utils/tool-signature";
import { cn } from "@/lib/utils";

/**
 * Name assigned by the agents list page when a brand-new agent is created.
 * Used to detect "first edit" so we can auto-focus the title input.
 */
const DEFAULT_NEW_AGENT_NAME = "Untitled agent";

/** Number of attached tools to show before the list collapses behind a
 *  "Show N more" toggle. Mirrors the prompt's collapse pattern. */
const TOOLS_COLLAPSED_LIMIT = 5;

export default function AgentBuilderPage() {
  const router = useRouter();
  const params = useParams<{ agent_id: string }>();
  const agent_id = params.agent_id;

  const form = useAgentBuilderStore((s) => s.form);
  const hydrating = useAgentBuilderStore((s) => s.hydrating);
  const saving = useAgentBuilderStore((s) => s.saving);
  const saveError = useAgentBuilderStore((s) => s.saveError);
  const notFound = useAgentBuilderStore((s) => s.notFound);
  const init = useAgentBuilderStore((s) => s.init);
  const setField = useAgentBuilderStore((s) => s.setField);
  const save = useAgentBuilderStore((s) => s.save);
  const discard = useAgentBuilderStore((s) => s.discard);
  const isDirty = useAgentBuilderStore((s) => s.isDirty);

  const tools = useToolsStore((s) => s.data);
  const ensureTools = useToolsStore((s) => s.ensureLoaded);
  const defaultTools = useDefaultToolsStore((s) => s.data);
  const ensureDefaultTools = useDefaultToolsStore((s) => s.ensureLoaded);
  const paramDefs = usePdStore((s) => s.data);
  const ensurePds = usePdStore((s) => s.ensureLoaded);
  const models = useModelsStore((s) => s.data);
  const ensureModels = useModelsStore((s) => s.ensureLoaded);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);

  // Snapshotted at mount: lets the back button pop history when the user
  // navigated in (e.g. from a chat surface or stage page) and fall back
  // to the agents index when this page was loaded directly. Snapshot once
  // so intra-page route changes don't flip the flag mid-session.
  const canGoBack = useRef(false);
  useEffect(() => {
    canGoBack.current =
      typeof window !== "undefined" && window.history.length > 1;
  }, []);

  function handleBack() {
    if (canGoBack.current) router.back();
    else router.push("/app/agents");
  }

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptFocused, setPromptFocused] = useState(false);
  const [promptOverflows, setPromptOverflows] = useState(false);
  // The textarea is only "capped" when the user has neither expanded it via
  // the toggle nor focused it for editing. Focus temporarily lifts the cap so
  // editing a long prompt feels natural.
  const promptCollapsed = !promptExpanded && !promptFocused;

  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [addToolOpen, setAddToolOpen] = useState(false);

  useEffect(() => {
    // Warm dependent stores. The builder needs agents (for lookup), tools +
    // default tools (to render the attached-tool list with signatures),
    // parameter definitions (custom-tool params), and models (model picker).
    ensureAgents();
    ensureTools();
    ensureDefaultTools();
    ensurePds();
    ensureModels();
  }, [
    ensureAgents,
    ensureTools,
    ensureDefaultTools,
    ensurePds,
    ensureModels,
  ]);

  useEffect(() => {
    if (agent_id) init(agent_id);
    // Allow auto-focus to happen for the next agent loaded.
    didAutoFocus.current = false;
  }, [agent_id, init]);

  // Auto-focus + select the title when the form first hydrates with the
  // default name, so a newly-created agent lands ready to be renamed.
  useEffect(() => {
    if (!form || didAutoFocus.current) return;
    didAutoFocus.current = true;
    if (form.agent_name === DEFAULT_NEW_AGENT_NAME) {
      // Defer a tick so the input is mounted and focusable.
      requestAnimationFrame(() => {
        titleRef.current?.focus();
        titleRef.current?.select();
      });
    }
  }, [form]);

  // Warn on unload if there are unsaved changes.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (useAgentBuilderStore.getState().isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Decide whether the System prompt needs the toggle by comparing the
  // textarea's natural content height to its capped client height. Only
  // meaningful while the cap is in effect; when focused/expanded we keep the
  // last known value so the toggle stays visible.
  useEffect(() => {
    if (!promptCollapsed) return;
    const el = promptRef.current;
    if (!el) return;
    const check = () =>
      setPromptOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [form?.prompt, promptCollapsed]);

  // Unified lookup for any tool_id the agent might reference, regardless of
  // whether it comes from the org's custom tools or the platform's built-in
  // default tools. Returns `undefined` for IDs that resolve to neither
  // (e.g. a tool deleted after being attached) so the UI can render a
  // graceful "unknown" placeholder.
  const toolsById = useMemo(() => {
    const m = new Map<
      string,
      {
        name: string;
        description?: string | null;
        params: ToolParamName[];
        source: "custom" | "default";
        isClientSide: boolean;
      }
    >();
    for (const t of tools) {
      const pd = t.pd_id
        ? paramDefs.find((p) => p.pd_id === t.pd_id)
        : undefined;
      m.set(t.tool_id, {
        name: t.name,
        description: t.description,
        params: getToolParamNames(pd),
        source: "custom",
        isClientSide: t.is_client_side_tool,
      });
    }
    for (const t of defaultTools) {
      m.set(t.tool_id, {
        name: t.name,
        description: t.description,
        params: getParamNamesFromSchema(t.parameters),
        source: "default",
        isClientSide: !!t.is_client_side_tool,
      });
    }
    return m;
  }, [tools, defaultTools, paramDefs]);

  // --- Aj page hooks ------------------------------------------------------
  // Expose the current draft + a per-field set_* action for each editable
  // field on this page. Save and Delete are deliberately NOT exposed — those
  // remain user actions (human-in-the-loop). Hooks must run unconditionally
  // before any early returns.
  const PromptArgNamesArgs = useMemo(
    () => z.object({ names: z.array(z.string()) }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "agent_detail",
        agent_id,
        not_found: notFound,
        loading: hydrating || !form,
        is_dirty: form ? isDirty() : false,
        draft: form,
        attached_tools: form?.tools.map((id) => {
          const t = toolsById.get(id);
          return t
            ? { tool_id: id, name: t.name, source: t.source, description: t.description }
            : { tool_id: id, name: null, source: "unknown" };
        }),
        available_models: models.map((m) => ({
          model: m.model,
          model_provider: m.model_provider,
        })),
        note:
          "You can set any field via the matching set_* action; saving and deleting are user actions. To add or remove tools, point the user at the '+ Add tool' dialog.",
      },
      actions: {
        set_name: {
          description: "Set the agent's display name.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_description: {
          description: "Set the agent's description.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_prompt: {
          description: "Replace the agent's system prompt with `value`.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_model_id: {
          description:
            "Set the LLM model the agent uses. Use list_models to see allowed values.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_is_public: {
          description: "Toggle whether the agent is publicly addressable.",
          argsSchema: z.toJSONSchema(z.object({ value: z.boolean() })),
        },
        set_agent_speaks_first: {
          description:
            "Toggle whether the agent sends an initial message on context create.",
          argsSchema: z.toJSONSchema(z.object({ value: z.boolean() })),
        },
        set_uses_prompt_args: {
          description: "Toggle whether the prompt expects template arguments.",
          argsSchema: z.toJSONSchema(z.object({ value: z.boolean() })),
        },
        set_prompt_arg_names: {
          description: "Replace the list of prompt argument names.",
          argsSchema: z.toJSONSchema(PromptArgNamesArgs),
        },
      },
    }),
    [agent_id, notFound, hydrating, form, toolsById, models, isDirty, PromptArgNamesArgs],
  );

  useDoPageAction(
    async (key, args) => {
      if (!form) {
        return { ok: false, error: "agent draft not yet hydrated" };
      }
      switch (key) {
        case "set_name":
          setField("agent_name", String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_description":
          setField(
            "agent_description",
            String((args as { value: unknown }).value ?? ""),
          );
          return { ok: true };
        case "set_prompt":
          setField("prompt", String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_model_id":
          setField("model_id", String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_is_public":
          setField("is_public", Boolean((args as { value: unknown }).value));
          return { ok: true };
        case "set_agent_speaks_first":
          setField(
            "agent_speaks_first",
            Boolean((args as { value: unknown }).value),
          );
          return { ok: true };
        case "set_uses_prompt_args":
          setField(
            "uses_prompt_args",
            Boolean((args as { value: unknown }).value),
          );
          return { ok: true };
        case "set_prompt_arg_names": {
          const parsed = PromptArgNamesArgs.parse(args);
          setField("prompt_arg_names", parsed.names);
          return { ok: true };
        }
        default:
          return { ok: false, error: `unknown action: ${key}` };
      }
    },
    [form, setField, PromptArgNamesArgs],
  );

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Agent not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This agent doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/agents">
            <ArrowLeft className="size-4" />
            Back to agents
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
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  const dirty = isDirty();

  async function onDelete() {
    setDeleting(true);
    try {
      await agentsActions.delete(agent_id);
      router.replace("/app/agents");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <BuilderPageHeader
        onBack={handleBack}
        name={form.agent_name}
        onNameChange={(v) => setField("agent_name", v)}
        namePlaceholder={DEFAULT_NEW_AGENT_NAME}
        nameAriaLabel="Agent name"
        nameInputRef={titleRef}
        nameClassName="font-display"
        description={form.agent_description}
        onDescriptionChange={(v) => setField("agent_description", v)}
        descriptionPlaceholder="Add a description…"
        descriptionAriaLabel="Agent description"
        dirty={dirty}
        saving={saving}
        onDiscard={discard}
        onSave={save}
      />
      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 -mt-2">
        <div className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
          <span className="uppercase tracking-wide">Agent ID</span>
          <span
            className="text-foreground/80 max-w-full truncate font-mono"
            title={agent_id}
          >
            {agent_id}
          </span>
          <CopyButton value={agent_id} label="Copy agent ID" />
        </div>
      </div>

      <BuilderSection
        title="System prompt"
        description="Defines how the agent behaves."
      >
        <div className="relative">
          <Textarea
            ref={promptRef}
            rows={10}
            value={form.prompt}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            onChange={(e) => setField("prompt", e.target.value)}
            className={cn(
              "min-h-64 font-mono text-sm",
              promptCollapsed && "max-h-[28rem] overflow-hidden"
            )}
          />
          {promptExpanded && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPromptExpanded(false)}
              className="text-muted-foreground hover:text-foreground bg-card/80 absolute top-2 right-2 h-7 backdrop-blur-sm"
            >
              <ChevronUp className="size-4" />
              Show less
            </Button>
          )}
        </div>
        {(promptOverflows || promptExpanded) && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPromptExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground"
            >
              {promptExpanded ? (
                <>
                  <ChevronUp className="size-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  Show more
                </>
              )}
            </Button>
          </div>
        )}
      </BuilderSection>

      <BuilderSection
        title="Tools"
        description="Tools the agent can call."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddToolOpen(true)}
          >
            <Plus className="size-4" />
            Add tool
          </Button>
        }
      >
        {form.tools.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tools attached yet.
          </p>
        ) : (
          (() => {
            const canCollapse = form.tools.length > TOOLS_COLLAPSED_LIMIT;
            const visibleTools = toolsExpanded
              ? form.tools
              : form.tools.slice(0, TOOLS_COLLAPSED_LIMIT);
            const hiddenCount = form.tools.length - visibleTools.length;
            return (
              <>
                {canCollapse && toolsExpanded && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setToolsExpanded(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronUp className="size-4" />
                      Show less
                    </Button>
                  </div>
                )}
                <div className="min-w-0 space-y-2">
                  {visibleTools.map((id) => {
                    const t = toolsById.get(id);
                    const linkable = t?.source === "custom";
                    const cardClass = cn(
                      "group border-border flex w-full min-w-0 items-start gap-3 rounded-md border p-3 transition-colors",
                      linkable
                        ? "hover:border-foreground/30 hover:bg-muted/30"
                        : "hover:border-foreground/20"
                    );
                    const inner = (
                      <>
                        <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                          <Wrench className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          {t ? (
                            <>
                              <div className="font-mono text-sm wrap-break-word break-all">
                                <span className="text-foreground font-medium">
                                  {t.name}
                                </span>
                                <span className="text-muted-foreground">(</span>
                                {t.params.length > 0 && (
                                  <span className="text-muted-foreground">
                                    {t.params.map((p, i) => (
                                      <span key={p.name}>
                                        {i > 0 && ", "}
                                        <span className="text-foreground/80">
                                          {p.name}
                                        </span>
                                        {p.optional && "?"}
                                      </span>
                                    ))}
                                  </span>
                                )}
                                <span className="text-muted-foreground">)</span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                {t.source === "default" && (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground"
                                  >
                                    Built-in
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className="text-muted-foreground"
                                >
                                  {t.isClientSide ? "Client-side" : "Server-side"}
                                </Badge>
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground font-mono text-sm break-all italic">
                              unknown ({id.slice(0, 8)}…)
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove tool"
                          onClick={(e) => {
                            // Stop the wrapping Link (for custom tools) from
                            // navigating when the user is trying to detach
                            // the tool from this agent.
                            e.preventDefault();
                            e.stopPropagation();
                            setField(
                              "tools",
                              form.tools.filter((other) => other !== id)
                            );
                          }}
                          className="text-muted-foreground hover:text-destructive size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    );
                    return linkable ? (
                      <Link
                        key={id}
                        href={`/app/tools/${id}`}
                        className={cardClass}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={id} className={cardClass}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
                {canCollapse && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setToolsExpanded((v) => !v)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {toolsExpanded ? (
                        <>
                          <ChevronUp className="size-4" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-4" />
                          Show {hiddenCount} more
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            );
          })()
        )}
      </BuilderSection>

      <AddToolDialog
        open={addToolOpen}
        onOpenChange={setAddToolOpen}
        attachedIds={form.tools}
        onChangeAttached={(ids) => setField("tools", ids)}
      />

      <BuilderSection title="Model" description="LLM that powers this agent.">
        <Select
          value={form.model_id}
          onValueChange={(v) =>
            setField("model_id", typeof v === "string" ? v : null)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.model} value={m.model}>
                {m.model}{" "}
                <span className="text-muted-foreground text-xs">
                  ({m.model_provider})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </BuilderSection>

      <BuilderSection title="Configuration">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Public</Label>
            <p className="text-muted-foreground text-xs">
              Allow access without authentication.
            </p>
          </div>
          <Switch
            checked={form.is_public}
            onCheckedChange={(v) => setField("is_public", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Agent speaks first</Label>
            <p className="text-muted-foreground text-xs">
              Send an initial message when context is created.
            </p>
          </div>
          <Switch
            checked={form.agent_speaks_first}
            onCheckedChange={(v) => setField("agent_speaks_first", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Uses prompt arguments</Label>
            <p className="text-muted-foreground text-xs">
              Template variables passed in at context creation.
            </p>
          </div>
          <Switch
            checked={form.uses_prompt_args}
            onCheckedChange={(v) => setField("uses_prompt_args", v)}
          />
        </div>
        {form.uses_prompt_args && (
          <div className="space-y-1.5">
            <Label htmlFor="args">Argument names (comma-separated)</Label>
            <Input
              id="args"
              value={form.prompt_arg_names.join(", ")}
              onChange={(e) =>
                setField(
                  "prompt_arg_names",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>
        )}
      </BuilderSection>

      <BuilderSection title="Danger zone" className="border-destructive/40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Delete agent</Label>
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
        title="Delete this agent?"
        description="This will permanently remove this agent. This cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
