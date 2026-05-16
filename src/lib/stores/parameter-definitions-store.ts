import { createListStore } from "./store-factory";
import { pdApi } from "@/lib/api/parameter-definitions";
import { useOrgStore } from "./org-store";
import type { ApiParameterDefinition } from "@/types/api";

export const usePdStore = createListStore<ApiParameterDefinition, "pd_id">({
  name: "parameter_definitions",
  idKey: "pd_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await pdApi.list(orgId)).parameter_definitions;
  },
});
