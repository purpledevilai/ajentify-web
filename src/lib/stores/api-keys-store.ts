import { createListStore } from "./store-factory";
import { apiKeysApi, type GenerateAPIKeyParams } from "@/lib/api/api-keys";
import { useOrgStore } from "./org-store";
import type { ApiAPIKey, ApiAPIKeySummary } from "@/types/api";

export const useApiKeysStore = createListStore<ApiAPIKeySummary, "api_key_id">({
  name: "api_keys",
  idKey: "api_key_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await apiKeysApi.list(orgId)).api_keys;
  },
});

/**
 * Mutation helpers — the generate endpoint returns the full APIKey (with the
 * raw JWT) which is only safe to show once at creation time; we still upsert
 * a `Summary` row into the store so the list reflects the new key.
 */
export const apiKeysActions = {
  async generate(body?: Partial<GenerateAPIKeyParams>): Promise<ApiAPIKey> {
    const orgId = body?.org_id ?? useOrgStore.getState().activeOrgId;
    if (!orgId) {
      throw new Error("No active organization to generate an API key for");
    }
    const params: GenerateAPIKeyParams = {
      org_id: orgId,
      type: body?.type ?? "org",
      client_id: body?.client_id,
    };
    const key = await apiKeysApi.generate(params);
    if (key.type === "org") {
      useApiKeysStore.getState().upsert({
        api_key_id: key.api_key_id,
        org_id: key.org_id,
        token_hint: `...${key.token.slice(-8)}`,
        valid: key.valid,
        created_at: key.created_at,
      });
    }
    return key;
  },
  async revoke(api_key_id: string) {
    const summary = await apiKeysApi.revoke(api_key_id);
    useApiKeysStore.getState().upsert(summary);
    return summary;
  },
};
