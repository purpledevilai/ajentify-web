"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
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
import { useAgentBuilderStore } from "@/lib/stores/agent-builder-store";
import { useAgentsStore, agentsActions } from "@/lib/stores/agents-store";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useModelsStore } from "@/lib/stores/models-store";
import { cn } from "@/lib/utils";

/**
 * Name assigned by the agents list page when a brand-new agent is created.
 * Used to detect "first edit" so we can auto-focus the title input.
 */
const DEFAULT_NEW_AGENT_NAME = "Untitled agent";

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
  const models = useModelsStore((s) => s.data);
  const ensureModels = useModelsStore((s) => s.ensureLoaded);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);
  const [deleting, setDeleting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [promptFocused, setPromptFocused] = useState(false);
  const [promptOverflows, setPromptOverflows] = useState(false);
  // The textarea is only "capped" when the user has neither expanded it via
  // the toggle nor focused it for editing. Focus temporarily lifts the cap so
  // editing a long prompt feels natural.
  const promptCollapsed = !promptExpanded && !promptFocused;

  useEffect(() => {
    // Warm dependent stores. The builder needs agents (for lookup), tools (for picker), models (for picker).
    ensureAgents();
    ensureTools();
    ensureModels();
  }, [ensureAgents, ensureTools, ensureModels]);

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

  // Decide whether the System prompt needs the fade + toggle by comparing the
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
    if (!confirm("Delete this agent? This cannot be undone.")) return;
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
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
          >
            <Link href="/app/agents" aria-label="Back to agents">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <input
              ref={titleRef}
              value={form.agent_name}
              onChange={(e) => setField("agent_name", e.target.value)}
              placeholder={DEFAULT_NEW_AGENT_NAME}
              aria-label="Agent name"
              spellCheck={false}
              className={cn(
                "font-display w-full rounded-md bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none",
                "placeholder:text-muted-foreground/60",
                "hover:bg-muted/60 focus:bg-muted/60",
                "focus-visible:ring-ring/40 focus-visible:ring-2",
                "-ml-2 transition-colors"
              )}
            />
            <textarea
              value={form.agent_description}
              onChange={(e) =>
                setField("agent_description", e.target.value)
              }
              placeholder="Add a description…"
              aria-label="Agent description"
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

      <BuilderSection title="Tools" description="Tools the agent can call.">
        {tools.length === 0 ? (
          <div className="text-muted-foreground text-sm">
            No tools in this organization yet. Create tools via the Ajentify
            API or SDK.
          </div>
        ) : (
          <div className="space-y-2">
            {tools.map((t) => {
              const checked = form.tools.includes(t.tool_id);
              return (
                <label
                  key={t.tool_id}
                  className="hover:bg-muted border-border flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setField(
                        "tools",
                        e.target.checked
                          ? [...form.tools, t.tool_id]
                          : form.tools.filter((id) => id !== t.tool_id)
                      )
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t.name}</div>
                    {t.description && (
                      <div className="text-muted-foreground text-xs">
                        {t.description}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </BuilderSection>

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
            onClick={onDelete}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </BuilderSection>
    </div>
  );
}
