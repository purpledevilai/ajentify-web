import { createListStore } from "./store-factory";
import { integrationsApi } from "@/lib/api/integrations";
import { useOrgStore } from "./org-store";
import type {
  ApiIntegration,
  CreateIntegrationParams,
  UpdateIntegrationParams,
} from "@/types/api";

export const useIntegrationsStore = createListStore<
  ApiIntegration,
  "integration_id"
>({
  name: "integrations",
  idKey: "integration_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await integrationsApi.list(orgId)).integrations;
  },
});

export const integrationsActions = {
  async create(body: CreateIntegrationParams) {
    const params: CreateIntegrationParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const i = await integrationsApi.create(params);
    useIntegrationsStore.getState().upsert(i);
    return i;
  },
  async update(integration_id: string, body: UpdateIntegrationParams) {
    const i = await integrationsApi.update(integration_id, body);
    useIntegrationsStore.getState().upsert(i);
    return i;
  },
  async delete(integration_id: string) {
    await integrationsApi.delete(integration_id);
    useIntegrationsStore.getState().removeById(integration_id);
  },
};
