import { createListStore } from "./store-factory";
import { mcpConnectionsApi } from "@/lib/api/mcp-connections";
import { useOrgStore } from "./org-store";
import type {
  ApiMcpConnection,
  CreateMcpConnectionParams,
  UpdateMcpConnectionParams,
} from "@/types/api";

export const useMcpConnectionsStore = createListStore<
  ApiMcpConnection,
  "mcp_connection_id"
>({
  name: "mcp-connections",
  idKey: "mcp_connection_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await mcpConnectionsApi.list(orgId)).mcp_connections;
  },
});

export const mcpConnectionsActions = {
  async create(body: CreateMcpConnectionParams) {
    const params: CreateMcpConnectionParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const c = await mcpConnectionsApi.create(params);
    useMcpConnectionsStore.getState().upsert(c);
    return c;
  },
  async update(mcp_connection_id: string, body: UpdateMcpConnectionParams) {
    const c = await mcpConnectionsApi.update(mcp_connection_id, body);
    useMcpConnectionsStore.getState().upsert(c);
    return c;
  },
  async delete(mcp_connection_id: string) {
    await mcpConnectionsApi.delete(mcp_connection_id);
    useMcpConnectionsStore.getState().removeById(mcp_connection_id);
  },
};
