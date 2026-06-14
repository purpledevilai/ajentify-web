import { create } from "zustand";
import type { ApiJSONDocument, UpdateJSONDocumentParams } from "@/types/api";
import {
  useJsonDocumentsStore,
  jsonDocumentsActions,
} from "./json-documents-store";
import { registerStore } from "./registry";
import { getErrorMessage } from "@/lib/api/errors";

type FormState = {
  name: string;
  dataString: string;
};

interface BuilderState {
  documentId: string | null;
  original: FormState | null;
  form: FormState | null;
  dataError: string | null;
  hydrating: boolean;
  saving: boolean;
  saveError: string | null;
  notFound: boolean;
  init: (document_id: string) => Promise<void>;
  setName: (name: string) => void;
  setDataString: (json: string) => void;
  isDirty: () => boolean;
  save: () => Promise<boolean>;
  discard: () => void;
  reset: () => void;
}

function fromDocument(doc: ApiJSONDocument): FormState {
  return {
    name: doc.name,
    dataString: JSON.stringify(doc.data, null, 2),
  };
}

export const useDocumentBuilderStore = create<BuilderState>((set, get) => ({
  documentId: null,
  original: null,
  form: null,
  dataError: null,
  hydrating: false,
  saving: false,
  saveError: null,
  notFound: false,

  async init(document_id) {
    if (get().documentId === document_id && get().form) return;
    set({
      documentId: document_id,
      hydrating: true,
      form: null,
      original: null,
      dataError: null,
      saveError: null,
      notFound: false,
    });
    const doc = await useJsonDocumentsStore.getState().getById(document_id);
    if (!doc) {
      set({ hydrating: false, notFound: true });
      return;
    }
    const base = fromDocument(doc);
    set({ form: base, original: base, hydrating: false });
  },

  setName(name) {
    const f = get().form;
    if (!f) return;
    set({ form: { ...f, name } });
  },

  setDataString(json) {
    const f = get().form;
    if (!f) return;
    try {
      JSON.parse(json);
      set({ form: { ...f, dataString: json }, dataError: null });
    } catch (e) {
      const msg = e instanceof SyntaxError ? e.message : "Invalid JSON";
      set({ form: { ...f, dataString: json }, dataError: msg });
    }
  },

  isDirty() {
    const { form, original } = get();
    if (!form || !original) return false;
    return (
      form.name !== original.name || form.dataString !== original.dataString
    );
  },

  async save() {
    const { documentId, form, original } = get();
    if (!form) return false;
    if (!get().isDirty()) return false;
    if (get().dataError) return false;

    set({ saving: true, saveError: null });

    try {
      const data = JSON.parse(form.dataString) as Record<string, unknown>;

      if (!documentId || documentId === "_") {
        const created = await jsonDocumentsActions.create({
          name: form.name,
          data,
        });
        const base = fromDocument(created);
        set({
          documentId: created.document_id,
          form: base,
          original: base,
          saving: false,
        });
        return true;
      }

      const patch: UpdateJSONDocumentParams = {};
      if (form.name !== original!.name) patch.name = form.name;
      if (form.dataString !== original!.dataString) patch.data = data;

      if (Object.keys(patch).length > 0) {
        const updated = await jsonDocumentsActions.update(documentId, patch);
        const base = fromDocument(updated);
        set({ form: base, original: base, saving: false });
      } else {
        set({ saving: false });
      }
      return true;
    } catch (e) {
      const fallback = e instanceof Error ? e.message : "Save failed";
      set({ saving: false, saveError: getErrorMessage(e, fallback) });
      return false;
    }
  },

  discard() {
    const { original } = get();
    if (original) set({ form: { ...original }, dataError: null, saveError: null });
  },

  reset() {
    set({
      documentId: null,
      original: null,
      form: null,
      dataError: null,
      hydrating: false,
      saving: false,
      saveError: null,
      notFound: false,
    });
  },
}));

registerStore({ reset: () => useDocumentBuilderStore.getState().reset() });
