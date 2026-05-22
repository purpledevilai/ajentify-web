import { createListStore } from "./store-factory";
import { toolsApi } from "@/lib/api/tools";
import { useOrgStore } from "./org-store";
import { usePdStore } from "./parameter-definitions-store";
import type {
  ApiTool,
  CreateToolParams,
  UpdateToolParams,
} from "@/types/api";

export const useToolsStore = createListStore<ApiTool, "tool_id">({
  name: "tools",
  idKey: "tool_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await toolsApi.list(orgId)).tools;
  },
  dependencies: [{ ensureLoaded: () => usePdStore.getState().ensureLoaded() }],
});

/**
 * Mutation helpers — call the API and reflect the result in the store so
 * the tools index updates without a refetch.
 */
export const toolsActions = {
  async create(body: CreateToolParams) {
    const params: CreateToolParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const t = await toolsApi.create(params);
    useToolsStore.getState().upsert(t);
    return t;
  },
  async update(tool_id: string, body: UpdateToolParams) {
    const t = await toolsApi.update(tool_id, body);
    useToolsStore.getState().upsert(t);
    return t;
  },
  async delete(tool_id: string) {
    await toolsApi.delete(tool_id);
    useToolsStore.getState().removeById(tool_id);
  },
};
