import { createListStore } from "./store-factory";
import { agentsApi } from "@/lib/api/agents";
import { useOrgStore } from "./org-store";
import { useToolsStore } from "./tools-store";
import { useModelsStore } from "./models-store";
import type {
  ApiAgent,
  CreateAgentParams,
  UpdateAgentParams,
} from "@/types/api";

export const useAgentsStore = createListStore<ApiAgent, "agent_id">({
  name: "agents",
  idKey: "agent_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await agentsApi.list(orgId)).agents;
  },
  dependencies: [
    { ensureLoaded: () => useToolsStore.getState().ensureLoaded() },
    { ensureLoaded: () => useModelsStore.getState().ensureLoaded() },
  ],
});

/**
 * Mutation helpers — call the API and reflect the result in the store
 * so the agents index updates without a refetch.
 */
export const agentsActions = {
  async create(body: CreateAgentParams) {
    const params: CreateAgentParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const a = await agentsApi.create(params);
    useAgentsStore.getState().upsert(a);
    return a;
  },
  async update(agent_id: string, body: UpdateAgentParams) {
    const a = await agentsApi.update(agent_id, body);
    useAgentsStore.getState().upsert(a);
    return a;
  },
  async delete(agent_id: string) {
    await agentsApi.delete(agent_id);
    useAgentsStore.getState().removeById(agent_id);
  },
};
