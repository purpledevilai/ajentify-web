import { createListStore } from "./store-factory";
import { filesystemsApi } from "@/lib/api/filesystems";
import { useOrgStore } from "./org-store";
import type {
  ApiFilesystem,
  CreateFilesystemParams,
  UpdateFilesystemParams,
} from "@/types/api";

export const useFilesystemsStore = createListStore<
  ApiFilesystem,
  "filesystem_id"
>({
  name: "filesystems",
  idKey: "filesystem_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId ?? undefined;
    return (await filesystemsApi.list(orgId)).filesystems;
  },
});

export const filesystemsActions = {
  async create(body: CreateFilesystemParams) {
    const params: CreateFilesystemParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const fs = await filesystemsApi.create(params);
    useFilesystemsStore.getState().upsert(fs);
    return fs;
  },
  async update(filesystem_id: string, body: UpdateFilesystemParams) {
    const fs = await filesystemsApi.update(filesystem_id, body);
    useFilesystemsStore.getState().upsert(fs);
    return fs;
  },
  async delete(filesystem_id: string) {
    const res = await filesystemsApi.delete(filesystem_id);
    useFilesystemsStore.getState().removeById(filesystem_id);
    return res;
  },
};
