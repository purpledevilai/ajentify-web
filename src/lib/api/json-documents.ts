import { api } from "./client";
import type {
  ApiJSONDocument,
  CreateJSONDocumentParams,
  GetJSONDocumentsResponse,
  UpdateJSONDocumentParams,
} from "@/types/api";

export const jsonDocumentsApi = {
  list: (org_id?: string, stage?: string) =>
    api.get<GetJSONDocumentsResponse>("/json-documents", {
      query: { org_id, stage },
    }),
  get: (document_id: string) =>
    api.get<ApiJSONDocument>(`/json-document/${document_id}`),
  create: (body: CreateJSONDocumentParams) =>
    api.post<ApiJSONDocument>("/json-document", body),
  update: (document_id: string, body: UpdateJSONDocumentParams) =>
    api.post<ApiJSONDocument>(`/json-document/${document_id}`, body),
  delete: (document_id: string) =>
    api.delete<void>(`/json-document/${document_id}`),
};
