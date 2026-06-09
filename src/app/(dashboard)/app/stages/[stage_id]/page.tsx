"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ClipboardCopy,
  Copy,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/primitives/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuilderSection } from "@/components/blocks/builder-section";
import { CopyButton } from "@/components/blocks/copy-button";
import { CodeEditor } from "@/components/primitives/code-editor";
import { CloneStageDialog } from "@/components/blocks/clone-stage-dialog";
import { DeleteStageDialog } from "@/components/blocks/delete-stage-dialog";
import { PlanResultModal } from "@/components/blocks/plan-result-modal";
import {
  AddExistingResourceDialog,
  type PickableResource,
} from "@/components/blocks/add-existing-resource-dialog";

import { useOrgStore } from "@/lib/stores/org-store";
import { useStagesStore, stagesActions } from "@/lib/stores/stages-store";
import { useAgentsStore, agentsActions } from "@/lib/stores/agents-store";
import { useToolsStore, toolsActions } from "@/lib/stores/tools-store";
import { useSresStore, sresActions } from "@/lib/stores/sres-store";
import {
  useJsonDocumentsStore,
  jsonDocumentsActions,
} from "@/lib/stores/json-documents-store";
import { deployApi } from "@/lib/api/deploy";
import { getErrorMessage } from "@/lib/api/errors";
import { sanitizeStageName, isValidStageName } from "@/lib/utils/stage-name";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type {
  ApiAgent,
  ApiStage,
  ApiTool,
  ApiStructuredResponseEndpoint,
  ApiJSONDocument,
  DeleteStageMode,
  DeployResponse,
  Manifest,
} from "@/types/api";

export default function StageDetailPage() {
  const params = useParams<{ stage_id: string }>();
  const stageId = params.stage_id;
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);

  const canGoBack = useRef(false);
  useEffect(() => {
    canGoBack.current =
      typeof window !== "undefined" && window.history.length > 1;
  }, []);
  function handleBack() {
    if (canGoBack.current) router.back();
    else router.push("/app/stages");
  }

  // --- Stage data -----------------------------------------------------------
  const stageFromStore = useStagesStore((s) =>
    s.data.find((st) => st.stage_id === stageId)
  );
  const ensureStages = useStagesStore((s) => s.ensureLoaded);
  const stagesLoaded = useStagesStore((s) => s.loaded);

  const [stage, setStage] = useState<ApiStage | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Draft state for editing
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<string>("visual");

  // JSON manifest
  const [manifestText, setManifestText] = useState("");
  const [manifestLoading, setManifestLoading] = useState(false);
  const [manifestLoaded, setManifestLoaded] = useState(false);

  // Plan / Deploy
  const [planning, setPlanning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [planResponse, setPlanResponse] = useState<DeployResponse | null>(null);
  const [planApplied, setPlanApplied] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Dialogs
  const [cloneOpen, setCloneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add existing resource
  type AddKind = "agents" | "tools" | "sres" | "documents";
  const [addKind, setAddKind] = useState<AddKind | null>(null);

  // --- Resource stores ------------------------------------------------------
  const agents = useAgentsStore((s) => s.data);
  const ensureAgents = useAgentsStore((s) => s.ensureLoaded);
  const tools = useToolsStore((s) => s.data);
  const ensureTools = useToolsStore((s) => s.ensureLoaded);
  const sres = useSresStore((s) => s.data);
  const ensureSres = useSresStore((s) => s.ensureLoaded);
  const docs = useJsonDocumentsStore((s) => s.data);
  const ensureDocs = useJsonDocumentsStore((s) => s.ensureLoaded);

  useEffect(() => {
    if (orgId) {
      ensureStages();
      ensureAgents();
      ensureTools();
      ensureSres();
      ensureDocs();
    }
  }, [orgId, ensureStages, ensureAgents, ensureTools, ensureSres, ensureDocs]);

  // Hydrate stage from store
  useEffect(() => {
    if (stageFromStore) {
      setStage(stageFromStore);
      setDraftName(stageFromStore.name);
      setDraftDescription(stageFromStore.description ?? "");
      setNotFound(false);
    } else if (stagesLoaded) {
      setNotFound(true);
    }
  }, [stageFromStore, stagesLoaded]);

  // Filtered resources for this stage
  const stageAgents = useMemo(
    () => agents.filter((a) => a.stage_id === stageId),
    [agents, stageId]
  );
  const stageTools = useMemo(
    () => tools.filter((t) => t.stage_id === stageId),
    [tools, stageId]
  );
  const stageSres = useMemo(
    () => sres.filter((s) => s.stage_id === stageId),
    [sres, stageId]
  );
  const stageDocs = useMemo(
    () => docs.filter((d) => d.stage_id === stageId),
    [docs, stageId]
  );

  // Unattached resources (no stage_id) — pool for "Add existing" picker
  const unattachedAgents = useMemo(
    () => agents.filter((a) => !a.stage_id),
    [agents]
  );
  const unattachedTools = useMemo(
    () => tools.filter((t) => !t.stage_id),
    [tools]
  );
  const unattachedSres = useMemo(
    () => sres.filter((s) => !s.stage_id),
    [sres]
  );
  const unattachedDocs = useMemo(
    () => docs.filter((d) => !d.stage_id),
    [docs]
  );

  const KIND_LABELS: Record<AddKind, string> = {
    agents: "agent",
    tools: "tool",
    sres: "SRE",
    documents: "document",
  };

  const buildPickable = (kind: AddKind): PickableResource[] => {
    switch (kind) {
      case "agents":
        return unattachedAgents.map((a) => ({
          id: a.agent_id,
          name: a.agent_name,
          description: a.agent_description ?? null,
        }));
      case "tools":
        return unattachedTools.map((t) => ({
          id: t.tool_id,
          name: t.name,
          description: t.description ?? null,
        }));
      case "sres":
        return unattachedSres.map((s) => ({
          id: s.sre_id,
          name: s.name,
          description: s.description ?? null,
        }));
      case "documents":
        return unattachedDocs.map((d) => ({
          id: d.document_id,
          name: d.name || "Untitled",
          description: null,
        }));
    }
  };

  const handleAttach = async (
    kind: AddKind,
    resourceId: string,
    logicalName: string
  ) => {
    if (!stage) return;
    const binding = { stage_id: stage.stage_id, logical_name: logicalName };
    switch (kind) {
      case "agents":
        await agentsActions.update(resourceId, binding as never);
        break;
      case "tools":
        await toolsActions.update(resourceId, binding as never);
        break;
      case "sres":
        await sresActions.update(resourceId, binding);
        break;
      case "documents":
        await jsonDocumentsActions.update(resourceId, binding);
        break;
    }
  };

  // --- Dirty tracking -------------------------------------------------------
  const isDirty = stage
    ? draftName !== stage.name ||
      draftDescription !== (stage.description ?? "")
    : false;

  const validName = isValidStageName(draftName);

  // --- Save -----------------------------------------------------------------
  const handleSave = async () => {
    if (!stage || !isDirty || !validName) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await stagesActions.update(stage.stage_id, {
        name: draftName,
        description: draftDescription.trim() || null,
      });
      setStage(updated);
      toast.success("Stage saved");
    } catch (err) {
      setSaveError(getErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!stage) return;
    setDraftName(stage.name);
    setDraftDescription(stage.description ?? "");
    setSaveError(null);
  };

  // --- Load manifest when JSON tab activates --------------------------------
  useEffect(() => {
    if (activeTab !== "json" || !stage || manifestLoaded) return;
    let cancelled = false;
    setManifestLoading(true);
    stagesActions
      .getManifest(stage.stage_id)
      .then((manifest) => {
        if (cancelled) return;
        const ordered = orderManifest(manifest);
        setManifestText(JSON.stringify(ordered, null, 2));
        setManifestLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setManifestText("{}");
        setManifestLoaded(true);
      })
      .finally(() => {
        if (!cancelled) setManifestLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, stage, manifestLoaded]);

  // --- Plan / Deploy --------------------------------------------------------
  const handlePlan = async () => {
    if (!stage) return;
    const manifest = parseManifest();
    if (!manifest) return;
    setPlanning(true);
    setDeployError(null);
    try {
      const res = await deployApi.plan(stage.name, manifest, orgId ?? undefined);
      setPlanResponse(res);
      setPlanApplied(false);
      setPlanModalOpen(true);
    } catch (err) {
      setDeployError(getErrorMessage(err, "Plan failed"));
    } finally {
      setPlanning(false);
    }
  };

  const handleDeploy = async () => {
    if (!stage) return;
    const manifest = parseManifest();
    if (!manifest) return;
    setDeploying(true);
    setDeployError(null);
    try {
      const res = await deployApi.deploy(stage.name, manifest, orgId ?? undefined);
      setPlanResponse(res);
      setPlanApplied(true);
      setPlanModalOpen(true);
      toast.success(
        `Deployed: ${res.summary.create} created, ${res.summary.update} updated, ${res.summary.delete} deleted`
      );
      // Refresh resource stores
      useAgentsStore.getState().refresh();
      useToolsStore.getState().refresh();
      useSresStore.getState().refresh();
      useJsonDocumentsStore.getState().refresh();
      useStagesStore.getState().refresh();
    } catch (err) {
      setDeployError(getErrorMessage(err, "Deploy failed"));
    } finally {
      setDeploying(false);
    }
  };

  const parseManifest = (): Manifest | null => {
    try {
      return JSON.parse(manifestText) as Manifest;
    } catch {
      setDeployError("Invalid JSON — fix syntax errors before continuing.");
      return null;
    }
  };

  // --- Delete ---------------------------------------------------------------
  const handleDeleteConfirm = async (mode: DeleteStageMode) => {
    if (!stage) return;
    setDeleting(true);
    try {
      await stagesActions.delete(stage.stage_id, mode);
      toast.success(
        mode === "destroy"
          ? `Stage "${stage.name}" and all its resources were deleted.`
          : `Stage "${stage.name}" deleted; its resources were detached.`
      );
      router.push("/app/stages");
    } catch {
      setDeleting(false);
    }
  };

  // --- AI page hooks --------------------------------------------------------
  const SetNameArgs = useMemo(
    () => z.object({ value: z.string() }),
    []
  );
  const SetTabArgs = useMemo(
    () => z.object({ tab: z.enum(["visual", "json"]) }),
    []
  );
  const SetManifestArgs = useMemo(
    () => z.object({ value: z.string() }),
    []
  );

  useGetPageData(
    () => ({
      data: {
        page: "stage_detail",
        stage_id: stageId,
        not_found: notFound,
        loading: !stage,
        is_dirty: isDirty,
        draft: stage
          ? { name: draftName, description: draftDescription }
          : null,
        active_tab: activeTab,
        manifest_json: activeTab === "json" ? manifestText : undefined,
        resources: stage
          ? {
              agents: stageAgents.length,
              tools: stageTools.length,
              sres: stageSres.length,
              documents: stageDocs.length,
            }
          : null,
        note: "You can set name, description, active tab, and manifest JSON via the matching set_* actions. Saving, deleting, cloning, plan, and deploy are user actions.",
      },
      actions: {
        set_name: {
          description:
            "Set the stage name. Must be lowercase letters, digits, and hyphens, starting with a letter.",
          argsSchema: z.toJSONSchema(SetNameArgs),
        },
        set_description: {
          description: "Set the stage description.",
          argsSchema: z.toJSONSchema(SetNameArgs),
        },
        set_tab: {
          description:
            'Switch between "visual" and "json" tabs on the stage detail page.',
          argsSchema: z.toJSONSchema(SetTabArgs),
        },
        set_manifest_json: {
          description:
            "Replace the JSON manifest in the editor. Only meaningful when on the JSON tab.",
          argsSchema: z.toJSONSchema(SetManifestArgs),
        },
      },
    }),
    [
      stageId,
      notFound,
      stage,
      isDirty,
      draftName,
      draftDescription,
      activeTab,
      manifestText,
      stageAgents.length,
      stageTools.length,
      stageSres.length,
      stageDocs.length,
      SetNameArgs,
      SetTabArgs,
      SetManifestArgs,
    ]
  );

  useDoPageAction(
    async (key, args) => {
      if (!stage) {
        return { ok: false, error: "stage not yet loaded" };
      }
      switch (key) {
        case "set_name": {
          const parsed = SetNameArgs.parse(args);
          setDraftName(sanitizeStageName(parsed.value));
          return { ok: true };
        }
        case "set_description": {
          const parsed = SetNameArgs.parse(args);
          setDraftDescription(parsed.value);
          return { ok: true };
        }
        case "set_tab": {
          const parsed = SetTabArgs.parse(args);
          setActiveTab(parsed.tab);
          return { ok: true };
        }
        case "set_manifest_json": {
          const parsed = SetManifestArgs.parse(args);
          setManifestText(parsed.value);
          return { ok: true };
        }
        default:
          return { ok: false, error: `unknown action: ${key}` };
      }
    },
    [stage, SetNameArgs, SetTabArgs, SetManifestArgs]
  );

  // --- Render ---------------------------------------------------------------

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Stage not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This stage doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/stages">
            <ArrowLeft className="size-4" />
            Back to stages
          </Link>
        </Button>
      </div>
    );
  }

  if (!stage) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 shrink-0"
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1 space-y-1">
              <input
                value={draftName}
                onChange={(e) => setDraftName(sanitizeStageName(e.target.value))}
                placeholder="stage-name"
                aria-label="Stage name"
                className={cn(
                  "font-display w-full bg-transparent text-2xl font-semibold tracking-tight outline-none",
                  "placeholder:text-muted-foreground/60",
                  "font-mono"
                )}
                maxLength={63}
              />
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Describe this stage…"
                aria-label="Stage description"
                className={cn(
                  "text-muted-foreground field-sizing-content w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm outline-none",
                  "placeholder:text-muted-foreground/60",
                  "hover:bg-muted/60 focus:bg-muted/60",
                  "focus-visible:ring-ring/40 focus-visible:ring-2",
                  "-ml-2 transition-colors"
                )}
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isDirty && (
              <>
                <Badge variant="outline">Unsaved</Badge>
                <Button variant="ghost" size="sm" onClick={handleDiscard}>
                  Discard
                </Button>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !validName}
                >
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {saving ? "Saving…" : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-mono text-xs">
            {stage.stage_id}
          </span>
          <CopyButton value={stage.stage_id} label="Copy stage ID" />
        </div>
        <span className="text-muted-foreground text-xs">
          Created {formatDateTime(stage.created_at)}
        </span>
        <span className="text-muted-foreground text-xs">
          Updated {formatDateTime(stage.updated_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setCloneOpen(true)}>
          <Copy className="size-4" />
          Clone to new stage
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line">
          <TabsTrigger value="visual">Visual</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="visual">
          <div className="space-y-6 pt-4">
            <ResourceSection
              title="Agents"
              icon={Bot}
              emptyHint={"No agents attached to this stage yet."}
              items={stageAgents.map((a) => ({
                id: a.agent_id,
                logical: a.logical_name ?? null,
                name: a.agent_name,
                description: a.agent_description ?? null,
                href: `/app/agents/${a.agent_id}`,
              }))}
              onAddExisting={() => setAddKind("agents")}
              hasUnattached={unattachedAgents.length > 0}
              addLabel="agent"
            />
            <ResourceSection
              title="Tools"
              icon={Wrench}
              emptyHint={"No tools attached to this stage yet."}
              items={stageTools.map((t) => ({
                id: t.tool_id,
                logical: t.logical_name ?? null,
                name: t.name,
                description: t.description ?? null,
                href: `/app/tools/${t.tool_id}`,
              }))}
              onAddExisting={() => setAddKind("tools")}
              hasUnattached={unattachedTools.length > 0}
              addLabel="tool"
            />
            <ResourceSection
              title="Structured Response Endpoints"
              icon={FileText}
              emptyHint={"No SREs attached to this stage yet."}
              items={stageSres.map((s) => ({
                id: s.sre_id,
                logical: s.logical_name ?? null,
                name: s.name,
                description: s.description ?? null,
                href: undefined,
              }))}
              onAddExisting={() => setAddKind("sres")}
              hasUnattached={unattachedSres.length > 0}
              addLabel="SRE"
            />
            <ResourceSection
              title="Documents"
              icon={FileText}
              emptyHint="No documents attached to this stage yet."
              items={stageDocs.map((d) => ({
                id: d.document_id,
                logical: d.logical_name ?? null,
                name: d.name,
                description: null,
                href: undefined,
              }))}
              onAddExisting={() => setAddKind("documents")}
              hasUnattached={unattachedDocs.length > 0}
              addLabel="document"
            />
          </div>
        </TabsContent>

        <TabsContent value="json">
          <div className="space-y-4 pt-4">
            {manifestLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <>
                <div className="relative">
                  <CodeEditor
                    language="json"
                    value={manifestText}
                    onChange={setManifestText}
                    minHeight="24rem"
                    maxHeight="40rem"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => {
                      navigator.clipboard.writeText(manifestText);
                      toast.success("Copied to clipboard");
                    }}
                  >
                    <ClipboardCopy className="size-4" />
                  </Button>
                </div>

                {deployError && (
                  <p className="text-destructive text-sm">{deployError}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePlan}
                    disabled={planning || deploying}
                  >
                    {planning && <Loader2 className="size-4 animate-spin" />}
                    {planning ? "Planning…" : "Plan"}
                  </Button>
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={handleDeploy}
                    disabled={planning || deploying}
                  >
                    {deploying && <Loader2 className="size-4 animate-spin" />}
                    {deploying ? "Deploying…" : "Deploy"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CloneStageDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        sourceStageId={stage.stage_id}
        sourceStageName={stage.name}
        orgId={orgId}
        onCloned={(newId) => {
          setCloneOpen(false);
          useStagesStore.getState().refresh();
          useAgentsStore.getState().refresh();
          useToolsStore.getState().refresh();
          useSresStore.getState().refresh();
          useJsonDocumentsStore.getState().refresh();
          router.push(`/app/stages/${newId}`);
        }}
      />

      <DeleteStageDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
        stageName={stage.name}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />

      <PlanResultModal
        open={planModalOpen}
        onOpenChange={setPlanModalOpen}
        response={planResponse}
        applied={planApplied}
      />

      <AddExistingResourceDialog
        open={addKind !== null}
        onOpenChange={(open) => {
          if (!open) setAddKind(null);
        }}
        kindLabel={addKind ? KIND_LABELS[addKind] : ""}
        stageName={stage.name}
        availableResources={addKind ? buildPickable(addKind) : []}
        onAttach={async (resourceId, logicalName) => {
          if (!addKind) return;
          await handleAttach(addKind, resourceId, logicalName);
        }}
        onAttached={() => {
          toast.success(`Resource added to ${stage.name}`);
          setAddKind(null);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function orderManifest(manifest: Manifest): Manifest {
  const ordered: Manifest = {};
  if (manifest.$schema !== undefined) ordered.$schema = manifest.$schema;
  if (manifest.agents !== undefined) ordered.agents = manifest.agents;
  if (manifest.tools !== undefined) ordered.tools = manifest.tools;
  if (manifest.sres !== undefined) ordered.sres = manifest.sres;
  return ordered;
}

interface ResourceItem {
  id: string;
  logical: string | null;
  name: string;
  description?: string | null;
  href?: string;
}

function ResourceSection({
  title,
  icon: Icon,
  emptyHint,
  items,
  onAddExisting,
  hasUnattached,
  addLabel,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  emptyHint: string;
  items: ResourceItem[];
  onAddExisting?: () => void;
  hasUnattached?: boolean;
  addLabel?: string;
}) {
  const router = useRouter();
  return (
    <BuilderSection
      title={title}
      actions={
        <div className="flex items-center gap-2">
          {onAddExisting && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddExisting}
              disabled={!hasUnattached}
              title={
                hasUnattached
                  ? `Attach an unattached ${addLabel} to this stage`
                  : `No unattached ${addLabel}s in this org`
              }
            >
              <Plus className="size-3.5" />
              Add existing {addLabel}
            </Button>
          )}
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyHint}</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2 transition-colors",
                item.href && "hover:bg-muted/50 cursor-pointer"
              )}
              onClick={item.href ? () => router.push(item.href!) : undefined}
            >
              <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <code className="text-foreground font-mono text-sm">
                  {item.logical ?? item.name}
                </code>
                {item.description && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </BuilderSection>
  );
}
