import { api } from "./client";
import type { ApiOrganization } from "@/types/api";

export interface UpdateOrganizationParams {
  webhook_url?: string | null;
  webhook_signing_api_key_id?: string | null;
}

export const orgApi = {
  create: (name: string) => api.post<ApiOrganization>("/organization", { name }),
  get: (org_id: string) => api.get<ApiOrganization>(`/organization/${org_id}`),
  update: (org_id: string, body: UpdateOrganizationParams) =>
    api.post<ApiOrganization>(`/organization/${org_id}`, body),
};
