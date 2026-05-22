import { api } from "./client";
import type {
  ApiTool,
  CreateToolParams,
  GetDefaultToolsResponse,
  GetToolsResponse,
  UpdateToolParams,
} from "@/types/api";

export const toolsApi = {
  list: (org_id?: string) =>
    api.get<GetToolsResponse>("/tools", { query: { org_id } }),
  get: (tool_id: string) => api.get<ApiTool>(`/tool/${tool_id}`),
  create: (body: CreateToolParams) => api.post<ApiTool>("/tool", body),
  update: (tool_id: string, body: UpdateToolParams) =>
    api.post<ApiTool>(`/tool/${tool_id}`, body),
  delete: (tool_id: string) => api.delete<void>(`/tool/${tool_id}`),
  listDefault: () => api.get<GetDefaultToolsResponse>("/default-tools"),
};
