import { createListStore } from "./store-factory";
import { dataWindowsApi } from "@/lib/api/data-windows";
import { useOrgStore } from "./org-store";
import type {
  ApiDataWindow,
  CreateDataWindowParams,
  UpdateDataWindowParams,
} from "@/types/api";

export const useDataWindowsStore = createListStore<
  ApiDataWindow,
  "data_window_id"
>({
  name: "data_windows",
  idKey: "data_window_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await dataWindowsApi.list(orgId)).data_windows;
  },
});

export const dataWindowsActions = {
  async create(body: CreateDataWindowParams) {
    const params: CreateDataWindowParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const dw = await dataWindowsApi.create(params);
    useDataWindowsStore.getState().upsert(dw);
    return dw;
  },
  async update(data_window_id: string, body: UpdateDataWindowParams) {
    const dw = await dataWindowsApi.update(data_window_id, body);
    useDataWindowsStore.getState().upsert(dw);
    return dw;
  },
  async delete(data_window_id: string) {
    await dataWindowsApi.delete(data_window_id);
    useDataWindowsStore.getState().removeById(data_window_id);
  },
};
