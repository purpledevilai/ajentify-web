import { api } from "./client";
import type {
  ApiDataWindow,
  CreateDataWindowParams,
  GetDataWindowsResponse,
  UpdateDataWindowParams,
} from "@/types/api";

export const dataWindowsApi = {
  list: (org_id?: string, stage?: string) =>
    api.get<GetDataWindowsResponse>("/data-windows", {
      query: { org_id, stage },
    }),
  get: (data_window_id: string) =>
    api.get<ApiDataWindow>(`/data-window/${data_window_id}`),
  create: (body: CreateDataWindowParams) =>
    api.post<ApiDataWindow>("/data-window", body),
  update: (data_window_id: string, body: UpdateDataWindowParams) =>
    api.post<ApiDataWindow>(`/data-window/${data_window_id}`, body),
  delete: (data_window_id: string) =>
    api.delete<void>(`/data-window/${data_window_id}`),
};
