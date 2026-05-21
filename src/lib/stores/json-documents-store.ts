import { createListStore } from "./store-factory";
import { jsonDocumentsApi } from "@/lib/api/json-documents";
import { useOrgStore } from "./org-store";
import type {
  ApiJSONDocument,
  CreateJSONDocumentParams,
  UpdateJSONDocumentParams,
} from "@/types/api";

export const useJsonDocumentsStore = createListStore<
  ApiJSONDocument,
  "document_id"
>({
  name: "json_documents",
  idKey: "document_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await jsonDocumentsApi.list(orgId)).json_documents;
  },
});

export const jsonDocumentsActions = {
  async create(body: CreateJSONDocumentParams) {
    const params: CreateJSONDocumentParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const doc = await jsonDocumentsApi.create(params);
    useJsonDocumentsStore.getState().upsert(doc);
    return doc;
  },
  async update(document_id: string, body: UpdateJSONDocumentParams) {
    const doc = await jsonDocumentsApi.update(document_id, body);
    useJsonDocumentsStore.getState().upsert(doc);
    return doc;
  },
  async delete(document_id: string) {
    await jsonDocumentsApi.delete(document_id);
    useJsonDocumentsStore.getState().removeById(document_id);
  },
};
