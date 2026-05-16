import { api } from "./client";
import type {
  ApiAgent,
  CreateAgentParams,
  GetAgentsResponse,
  UpdateAgentParams,
} from "@/types/api";

export const agentsApi = {
  list: (org_id?: string) =>
    api.get<GetAgentsResponse>("/agents", { query: { org_id } }),
  get: (agent_id: string) => api.get<ApiAgent>(`/agent/${agent_id}`),
  create: (body: CreateAgentParams) => api.post<ApiAgent>("/agent", body),
  update: (agent_id: string, body: UpdateAgentParams) =>
    api.post<ApiAgent>(`/agent/${agent_id}`, body),
  delete: (agent_id: string) => api.delete<void>(`/agent/${agent_id}`),
};
