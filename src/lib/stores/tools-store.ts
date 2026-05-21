import { createListStore } from "./store-factory";
import { toolsApi } from "@/lib/api/tools";
import { useOrgStore } from "./org-store";
import { usePdStore } from "./parameter-definitions-store";
import type { ApiTool } from "@/types/api";

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
  async delete(tool_id: string) {
    await toolsApi.delete(tool_id);
    useToolsStore.getState().removeById(tool_id);
  },
};
