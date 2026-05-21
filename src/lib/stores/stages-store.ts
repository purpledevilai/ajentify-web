import { createListStore } from "./store-factory";
import { stagesApi } from "@/lib/api/stages";
import { useOrgStore } from "./org-store";
import type {
  ApiStage,
  CreateStageParams,
  UpdateStageParams,
} from "@/types/api";

export const useStagesStore = createListStore<ApiStage, "stage_id">({
  name: "stages",
  idKey: "stage_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await stagesApi.list(orgId)).stages;
  },
});

export const stagesActions = {
  async create(body: CreateStageParams) {
    const params: CreateStageParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const s = await stagesApi.create(params);
    useStagesStore.getState().upsert(s);
    return s;
  },
  async update(stage_id: string, body: UpdateStageParams) {
    const s = await stagesApi.update(stage_id, body);
    useStagesStore.getState().upsert(s);
    return s;
  },
  async delete(stage_id: string) {
    await stagesApi.delete(stage_id);
    useStagesStore.getState().removeById(stage_id);
  },
};
