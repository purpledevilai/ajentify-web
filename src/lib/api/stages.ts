import { api } from "./client";
import type {
  ApiStage,
  CreateStageParams,
  GetStagesResponse,
  UpdateStageParams,
} from "@/types/api";

export const stagesApi = {
  list: (org_id?: string) =>
    api.get<GetStagesResponse>("/stages", { query: { org_id } }),
  get: (stage_id: string) => api.get<ApiStage>(`/stage/${stage_id}`),
  create: (body: CreateStageParams) => api.post<ApiStage>("/stage", body),
  update: (stage_id: string, body: UpdateStageParams) =>
    api.post<ApiStage>(`/stage/${stage_id}`, body),
  delete: (stage_id: string) => api.delete<void>(`/stage/${stage_id}`),
};
