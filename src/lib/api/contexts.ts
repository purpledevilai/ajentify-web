import { api } from "./client";
import type { ApiContext, GetOrgContextsResponse } from "@/types/api";

export interface ListOrgContextsParams {
  org_id?: string;
  agent_id?: string;
  client_id?: string;
  limit?: number;
  cursor?: string;
}

export interface CreateContextParams {
  agent_id: string;
  prompt_args?: Record<string, string>;
  user_defined?: Record<string, unknown>;
  additional_agent_tools?: string[];
  additional_mcp_connections?: string[];
  ttl_days?: number;
  invoke_agent_message?: boolean;
  client_id?: string | null;
}

export const contextsApi = {
  /**
   * Paginated, filterable list of API-key-owned and public contexts for the
   * org. Cognito-user contexts are excluded server-side.
   */
  listOrg: (params: ListOrgContextsParams = {}) =>
    api.get<GetOrgContextsResponse>("/org-contexts", {
      query: {
        org_id: params.org_id,
        agent_id: params.agent_id,
        client_id: params.client_id,
        limit: params.limit,
        cursor: params.cursor,
      },
    }),
  /**
   * Single context by id. `with_tool_calls` includes tool_call / tool_response
   * messages in the returned `messages` array.
   */
  get: (context_id: string, with_tool_calls = false) =>
    api.get<ApiContext>(`/context/${context_id}`, {
      query: { with_tool_calls: with_tool_calls || undefined },
    }),
  /**
   * Create a new context for `agent_id`. In the authenticated web flow the
   * backend auto-generates a `client_id` under the agent's org and returns the
   * filtered context (no `client_api_key` — mint a token separately via
   * `apiKeysApi.generate`).
   */
  create: (body: CreateContextParams) => api.post<ApiContext>("/context", body),
};
