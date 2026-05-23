import { createListStore } from "./store-factory";
import { pdApi } from "@/lib/api/parameter-definitions";
import { useOrgStore } from "./org-store";
import type {
  ApiParameterDefinition,
  CreateParameterDefinitionParams,
  UpdateParameterDefinitionParams,
} from "@/types/api";

export const usePdStore = createListStore<ApiParameterDefinition, "pd_id">({
  name: "parameter_definitions",
  idKey: "pd_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await pdApi.list(orgId)).parameter_definitions;
  },
});

/**
 * Mutation helpers — call the API and reflect the result in the store so
 * the PD list stays consistent without a refetch. Mirrors `toolsActions`.
 */
export const pdActions = {
  async create(body: CreateParameterDefinitionParams) {
    const params: CreateParameterDefinitionParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const pd = await pdApi.create(params);
    usePdStore.getState().upsert(pd);
    return pd;
  },
  async update(pd_id: string, body: UpdateParameterDefinitionParams) {
    const pd = await pdApi.update(pd_id, body);
    usePdStore.getState().upsert(pd);
    return pd;
  },
  async delete(pd_id: string) {
    await pdApi.delete(pd_id);
    usePdStore.getState().removeById(pd_id);
  },
};
