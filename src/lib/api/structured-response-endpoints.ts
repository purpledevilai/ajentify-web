import { api } from "./client";
import type {
  ApiStructuredResponseEndpoint,
  CreateSREParams,
  GetSREsResponse,
  UpdateSREParams,
} from "@/types/api";

export const sresApi = {
  list: (org_id?: string, stage?: string) =>
    api.get<GetSREsResponse>("/sres", { query: { org_id, stage } }),
  get: (sre_id: string) =>
    api.get<ApiStructuredResponseEndpoint>(`/sre/${sre_id}`),
  create: (body: CreateSREParams) =>
    api.post<ApiStructuredResponseEndpoint>("/sre", body),
  update: (sre_id: string, body: UpdateSREParams) =>
    api.post<ApiStructuredResponseEndpoint>(`/sre/${sre_id}`, body),
  delete: (sre_id: string) => api.delete<void>(`/sre/${sre_id}`),
};
