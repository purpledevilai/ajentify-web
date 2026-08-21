import { api } from "./client";
import type {
  ApiMcpConnection,
  CreateMcpConnectionParams,
  DiscoverMcpParams,
  DiscoverMcpResponse,
  GetMcpConnectionsResponse,
  ListMcpToolsParams,
  ListMcpToolsResponse,
  McpTokenParams,
  McpTokenResponse,
  UpdateMcpConnectionParams,
} from "@/types/api";

export const mcpConnectionsApi = {
  list: (org_id?: string) =>
    api.get<GetMcpConnectionsResponse>("/mcp-connections", { query: { org_id } }),
  get: (mcp_connection_id: string) =>
    api.get<ApiMcpConnection>(`/mcp-connection/${mcp_connection_id}`),
  create: (body: CreateMcpConnectionParams) =>
    api.post<ApiMcpConnection>("/mcp-connection", body),
  update: (mcp_connection_id: string, body: UpdateMcpConnectionParams) =>
    api.post<ApiMcpConnection>(`/mcp-connection/${mcp_connection_id}`, body),
  delete: (mcp_connection_id: string) =>
    api.delete<void>(`/mcp-connection/${mcp_connection_id}`),
  // Server-side proxies (avoid browser CORS to arbitrary MCP servers / OAuth metadata).
  discover: (body: DiscoverMcpParams) =>
    api.post<DiscoverMcpResponse>("/mcp/discover", body),
  tools: (body: ListMcpToolsParams) =>
    api.post<ListMcpToolsResponse>("/mcp/tools", body),
  token: (body: McpTokenParams) =>
    api.post<McpTokenResponse>("/mcp/token", body),
};
