import { createListStore } from "./store-factory";
import { toolsApi } from "@/lib/api/tools";
import type { ApiDefaultTool } from "@/types/api";

/**
 * Built-in tools shipped by the platform. Unlike `useToolsStore`, this list
 * is identical for every authenticated user — there is no org scoping — so
 * the fetcher takes no org_id and the data survives org-switches. We still
 * register with `resetAllStores` for consistency (e.g. logout clears it).
 */
export const useDefaultToolsStore = createListStore<ApiDefaultTool, "tool_id">({
  name: "default_tools",
  idKey: "tool_id",
  fetcher: async () => (await toolsApi.listDefault()).tools,
});
