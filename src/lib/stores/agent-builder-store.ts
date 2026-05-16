import { create } from "zustand";
import type { ApiAgent, UpdateAgentParams } from "@/types/api";
import { useAgentsStore, agentsActions } from "./agents-store";
import { registerStore } from "./registry";

type FormState = {
  agent_name: string;
  agent_description: string;
  prompt: string;
  is_public: boolean;
  agent_speaks_first: boolean;
  tools: string[];
  uses_prompt_args: boolean;
  prompt_arg_names: string[];
  voice_id: string | null;
  initialize_tool_id: string | null;
  model_id: string | null;
};

interface BuilderState {
  agentId: string | null;
  original: FormState | null;
  form: FormState | null;
  hydrating: boolean;
  saving: boolean;
  saveError: string | null;
  notFound: boolean;
  init: (agent_id: string) => Promise<void>;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  isDirty: () => boolean;
  changedFields: () => Partial<FormState>;
  save: () => Promise<void>;
  discard: () => void;
  reset: () => void;
}

function fromAgent(a: ApiAgent): FormState {
  return {
    agent_name: a.agent_name,
    agent_description: a.agent_description,
    prompt: a.prompt,
    is_public: a.is_public,
    agent_speaks_first: a.agent_speaks_first ?? false,
    tools: a.tools ?? [],
    uses_prompt_args: a.uses_prompt_args ?? false,
    prompt_arg_names: a.prompt_arg_names ?? [],
    voice_id: a.voice_id ?? null,
    initialize_tool_id: a.initialize_tool_id ?? null,
    model_id: a.model_id ?? null,
  };
}

export const useAgentBuilderStore = create<BuilderState>((set, get) => ({
  agentId: null,
  original: null,
  form: null,
  hydrating: false,
  saving: false,
  saveError: null,
  notFound: false,

  async init(agent_id) {
    if (get().agentId === agent_id && get().form) return;
    set({
      agentId: agent_id,
      hydrating: true,
      form: null,
      original: null,
      saveError: null,
      notFound: false,
    });
    const agent = await useAgentsStore.getState().getById(agent_id);
    if (!agent) {
      set({ hydrating: false, notFound: true });
      return;
    }
    const base = fromAgent(agent);
    set({ form: base, original: base, hydrating: false });
  },

  setField(key, value) {
    const f = get().form;
    if (!f) return;
    set({ form: { ...f, [key]: value } });
  },

  isDirty() {
    const { form, original } = get();
    return !!form && !!original && JSON.stringify(form) !== JSON.stringify(original);
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
    const { agentId, form } = get();
    if (!agentId || !form) return;
    if (!get().isDirty()) return;
    set({ saving: true, saveError: null });
    try {
      const patch = get().changedFields() as UpdateAgentParams;
      const updated = await agentsActions.update(agentId, patch);
      const base = fromAgent(updated);
      set({ form: base, original: base, saving: false });
    } catch (e) {
      const body = (e as { body?: { message?: string } })?.body;
      const message = body?.message ?? (e instanceof Error ? e.message : "Save failed");
      set({ saving: false, saveError: message });
    }
  },

  discard() {
    const { original } = get();
    if (original) set({ form: { ...original }, saveError: null });
  },

  reset() {
    set({
      agentId: null,
      original: null,
      form: null,
      hydrating: false,
      saving: false,
      saveError: null,
      notFound: false,
    });
  },
}));

registerStore({ reset: () => useAgentBuilderStore.getState().reset() });
