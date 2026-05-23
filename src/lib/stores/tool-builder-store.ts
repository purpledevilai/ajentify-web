import { create } from "zustand";
import type { ApiTool, UpdateToolParams } from "@/types/api";
import { useToolsStore, toolsActions } from "./tools-store";
import { usePdStore, pdActions } from "./parameter-definitions-store";
import { registerStore } from "./registry";
import { getErrorMessage } from "@/lib/api/errors";
import {
  canonicalJson,
  nodeToSchema,
  schemaToRoot,
} from "@/components/blocks/json-schema-editor";

/**
 * Minimal slice of the tool surface area we expose in the builder UI today.
 * `schema` lives here for dirty-tracking and is persisted to a separate
 * ParameterDefinition record on save (create / update / delete depending on
 * before-vs-after state — see `save()` below). Other tool fields
 * (pd_id, pass_context, is_async, is_client_side_tool, stage_id, logical_name)
 * are intentionally excluded — `pd_id` is managed by `save()` indirectly,
 * the rest remain whatever the API/SDK set them to.
 */
type FormState = {
  name: string;
  description: string;
  code: string;
  schema: Record<string, unknown>;
};

interface BuilderState {
  toolId: string | null;
  /** Current `pd_id` reflecting the persisted tool record. `null` when the
   *  tool has no PD attached. Updated by `save()` after PD create / delete. */
  pdId: string | null;
  original: FormState | null;
  form: FormState | null;
  hydrating: boolean;
  saving: boolean;
  saveError: string | null;
  notFound: boolean;
  init: (tool_id: string) => Promise<void>;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  isDirty: () => boolean;
  save: () => Promise<void>;
  discard: () => void;
  reset: () => void;
}

/** Canonical "no parameters" schema — also what the backend defaults to when
 *  a tool has no PD attached. Kept in sync with `Tool.EMPTY_OBJECT_SCHEMA`. */
const EMPTY_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
};

/** Run a raw schema through the editor's `schemaToRoot` + `nodeToSchema`
 *  pipeline so the in-memory representation matches what the editor will
 *  emit on edits. Without this step, a freshly-loaded raw schema and the
 *  editor's projection of the same tree compare as "dirty" via canonical
 *  JSON because the editor fills in defaults (`required: []`,
 *  `additionalProperties: false`). */
function canonicalSchema(
  raw: Record<string, unknown> | undefined
): Record<string, unknown> {
  return nodeToSchema(schemaToRoot(raw));
}

/** A schema with no defined properties is treated as "the tool takes no
 *  arguments" and persists as `pd_id: null` on the tool (no PD record). */
function isEmptySchema(schema: Record<string, unknown> | undefined): boolean {
  if (!schema || typeof schema !== "object") return true;
  const props = schema.properties;
  if (!props || typeof props !== "object") return true;
  return Object.keys(props as Record<string, unknown>).length === 0;
}

function fromTool(t: ApiTool, schema: Record<string, unknown>): FormState {
  return {
    name: t.name,
    description: t.description ?? "",
    code: t.code ?? "",
    schema,
  };
}

export const useToolBuilderStore = create<BuilderState>((set, get) => ({
  toolId: null,
  pdId: null,
  original: null,
  form: null,
  hydrating: false,
  saving: false,
  saveError: null,
  notFound: false,

  async init(tool_id) {
    if (get().toolId === tool_id && get().form) return;
    set({
      toolId: tool_id,
      pdId: null,
      hydrating: true,
      form: null,
      original: null,
      saveError: null,
      notFound: false,
    });
    const tool = await useToolsStore.getState().getById(tool_id);
    if (!tool) {
      set({ hydrating: false, notFound: true });
      return;
    }
    // PDs are loaded as a dependency of the tools store, so by the time
    // getById() resolves the PD list is warm. Belt-and-suspenders awaiting
    // ensureLoaded keeps this resilient if that wiring ever changes.
    await usePdStore.getState().ensureLoaded();
    const pd = tool.pd_id
      ? usePdStore.getState().data.find((p) => p.pd_id === tool.pd_id)
      : undefined;
    const baseSchema = canonicalSchema(pd?.schema ?? EMPTY_SCHEMA);
    const base = fromTool(tool, baseSchema);
    set({
      form: base,
      original: base,
      pdId: tool.pd_id ?? null,
      hydrating: false,
    });
  },

  setField(key, value) {
    const f = get().form;
    if (!f) return;
    set({ form: { ...f, [key]: value } });
  },

  isDirty() {
    const { form, original } = get();
    if (!form || !original) return false;
    if (form.name !== original.name) return true;
    if (form.description !== original.description) return true;
    if (form.code !== original.code) return true;
    // Schemas use canonical JSON so reordered keys don't read as dirty.
    if (canonicalJson(form.schema) !== canonicalJson(original.schema)) {
      return true;
    }
    return false;
  },

  async save() {
    const { toolId, pdId, form, original } = get();
    if (!toolId || !form || !original) return;
    if (!get().isDirty()) return;
    set({ saving: true, saveError: null });

    try {
      const hadPd = pdId != null;
      const wantsPd = !isEmptySchema(form.schema);
      const schemaChanged =
        canonicalJson(form.schema) !== canonicalJson(original.schema);

      // Plan the four phases up-front so the order is explicit. Phases run
      // sequentially because their dependencies require it:
      //   1. Create PD (tool needs the new pd_id before we can link it).
      //   2. Update existing PD (independent of the tool record).
      //   3. Update the tool (incl. linking/unlinking pd_id).
      //   4. Delete an unlinked PD (only safe once the tool no longer
      //      points at it — otherwise `get_agent_tool_with_id` would fail).
      const willCreatePd = !hadPd && wantsPd;
      const willUpdatePd = hadPd && wantsPd && schemaChanged;
      const willDeletePd = hadPd && !wantsPd;

      let newPdId: string | null = pdId;

      if (willCreatePd) {
        const pd = await pdActions.create({ schema: form.schema });
        newPdId = pd.pd_id;
      }

      if (willUpdatePd && pdId) {
        await pdActions.update(pdId, { schema: form.schema });
      }

      if (willDeletePd) {
        newPdId = null;
      }

      // Build the tool patch. Only include fields that actually changed.
      // `pd_id: null` is meaningful (it unlinks), so we send it explicitly
      // when transitioning to no-PD; the backend distinguishes "omitted"
      // (leave alone) from "set to null" (clear) via pydantic's
      // model_fields_set.
      const toolPatch: UpdateToolParams = {};
      if (form.name !== original.name) toolPatch.name = form.name;
      if (form.description !== original.description) {
        toolPatch.description = form.description;
      }
      if (form.code !== original.code) toolPatch.code = form.code;
      if (newPdId !== pdId) toolPatch.pd_id = newPdId;

      if (Object.keys(toolPatch).length > 0) {
        await toolsActions.update(toolId, toolPatch);
      }

      if (willDeletePd && pdId) {
        // Tool record has already been updated to drop pd_id; safe to
        // remove the orphaned PD now. We tolerate a failure here: the
        // worst case is an orphan PD record (invisible to the tool) which
        // the user can clean up separately. We log to the console so it
        // shows up during development.
        try {
          await pdActions.delete(pdId);
        } catch (e) {
          console.warn("Failed to delete unlinked PD", pdId, e);
        }
      }

      // Re-snapshot the form so `isDirty()` reads as clean. We re-canonicalize
      // the schema in case the user landed on a slightly-non-canonical
      // representation mid-edit; this keeps the visible state aligned with
      // what the editor would emit on the next render.
      const persistedSchema = canonicalSchema(form.schema);
      const next: FormState = { ...form, schema: persistedSchema };
      set({
        form: next,
        original: next,
        pdId: newPdId,
        saving: false,
      });
    } catch (e) {
      const fallback = e instanceof Error ? e.message : "Save failed";
      set({ saving: false, saveError: getErrorMessage(e, fallback) });
    }
  },

  discard() {
    const { original } = get();
    if (original) set({ form: { ...original }, saveError: null });
  },

  reset() {
    set({
      toolId: null,
      pdId: null,
      original: null,
      form: null,
      hydrating: false,
      saving: false,
      saveError: null,
      notFound: false,
    });
  },
}));

registerStore({ reset: () => useToolBuilderStore.getState().reset() });
