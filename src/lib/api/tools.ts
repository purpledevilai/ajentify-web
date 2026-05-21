import { api } from "./client";
import type {
  ApiTool,
  GetDefaultToolsResponse,
  GetToolsResponse,
} from "@/types/api";

export const toolsApi = {
  list: (org_id?: string) =>
    api.get<GetToolsResponse>("/tools", { query: { org_id } }),
  get: (tool_id: string) => api.get<ApiTool>(`/tool/${tool_id}`),
  delete: (tool_id: string) => api.delete<void>(`/tool/${tool_id}`),
  listDefault: () => api.get<GetDefaultToolsResponse>("/default-tools"),
};
