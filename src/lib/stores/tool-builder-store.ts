import { create } from "zustand";
import type { ApiTool, UpdateToolParams } from "@/types/api";
import { useToolsStore, toolsActions } from "./tools-store";
import { registerStore } from "./registry";
import { getErrorMessage } from "@/lib/api/errors";

/**
 * Minimal slice of the tool surface area we expose in the builder UI today.
 * Other tool fields (pd_id, pass_context, is_async, is_client_side_tool,
 * stage_id, logical_name) are intentionally excluded so this builder's diff
 * never touches them — they remain whatever the API/SDK set them to.
 */
type FormState = {
  name: string;
  description: string;
  code: string;
};

interface BuilderState {
  toolId: string | null;
  original: FormState | null;
  form: FormState | null;
  hydrating: boolean;
  saving: boolean;
  saveError: string | null;
  notFound: boolean;
  init: (tool_id: string) => Promise<void>;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  isDirty: () => boolean;
  changedFields: () => Partial<FormState>;
  save: () => Promise<void>;
  discard: () => void;
  reset: () => void;
}

function fromTool(t: ApiTool): FormState {
  return {
    name: t.name,
    description: t.description ?? "",
    code: t.code ?? "",
  };
}

export const useToolBuilderStore = create<BuilderState>((set, get) => ({
  toolId: null,
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
    const base = fromTool(tool);
    set({ form: base, original: base, hydrating: false });
  },

  setField(key, value) {
    const f = get().form;
    if (!f) return;
    set({ form: { ...f, [key]: value } });
  },

  isDirty() {
    const { form, original } = get();
    return (
      !!form && !!original && JSON.stringify(form) !== JSON.stringify(original)
    );
  },

  changedFields() {
    const { form, original } = get();
    if (!form || !original) return {};
    const out: Partial<FormState> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((k) => {
      if (JSON.stringify(form[k]) !== JSON.stringify(original[k])) {
        (out as Record<string, unknown>)[k] = form[k];
      }
    });
    return out;
  },

  async save() {
    const { toolId, form } = get();
    if (!toolId || !form) return;
    if (!get().isDirty()) return;
    set({ saving: true, saveError: null });
    try {
      const patch = get().changedFields() as UpdateToolParams;
      const updated = await toolsActions.update(toolId, patch);
      const base = fromTool(updated);
      set({ form: base, original: base, saving: false });
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
