import { createListStore } from "./store-factory";
import { sresApi } from "@/lib/api/structured-response-endpoints";
import { useOrgStore } from "./org-store";
import { usePdStore } from "./parameter-definitions-store";
import type {
  ApiStructuredResponseEndpoint,
  CreateSREParams,
  UpdateSREParams,
} from "@/types/api";

export const useSresStore = createListStore<
  ApiStructuredResponseEndpoint,
  "sre_id"
>({
  name: "sres",
  idKey: "sre_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await sresApi.list(orgId)).sres;
  },
  dependencies: [{ ensureLoaded: () => usePdStore.getState().ensureLoaded() }],
});

export const sresActions = {
  async create(body: CreateSREParams) {
    const params: CreateSREParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const s = await sresApi.create(params);
    useSresStore.getState().upsert(s);
    return s;
  },
  async update(sre_id: string, body: UpdateSREParams) {
    const s = await sresApi.update(sre_id, body);
    useSresStore.getState().upsert(s);
    return s;
  },
  async delete(sre_id: string) {
    await sresApi.delete(sre_id);
    useSresStore.getState().removeById(sre_id);
  },
};
