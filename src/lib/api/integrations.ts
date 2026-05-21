import { api } from "./client";
import type {
  ApiIntegration,
  CreateIntegrationParams,
  GetIntegrationsResponse,
  UpdateIntegrationParams,
} from "@/types/api";

export const integrationsApi = {
  list: (org_id?: string) =>
    api.get<GetIntegrationsResponse>("/integrations", { query: { org_id } }),
  get: (integration_id: string) =>
    api.get<ApiIntegration>(`/integration/${integration_id}`),
  create: (body: CreateIntegrationParams) =>
    api.post<ApiIntegration>("/integration", body),
  update: (integration_id: string, body: UpdateIntegrationParams) =>
    api.post<ApiIntegration>(`/integration/${integration_id}`, body),
  delete: (integration_id: string) =>
    api.delete<void>(`/integration/${integration_id}`),
};
