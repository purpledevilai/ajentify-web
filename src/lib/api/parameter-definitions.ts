import { api } from "./client";
import type {
  ApiParameterDefinition,
  CreateParameterDefinitionParams,
  GetParameterDefinitionsResponse,
  SuccessResponse,
  UpdateParameterDefinitionParams,
} from "@/types/api";

export const pdApi = {
  list: (org_id?: string) =>
    api.get<GetParameterDefinitionsResponse>("/parameter-definitions", {
      query: { org_id },
    }),
  get: (pd_id: string) =>
    api.get<ApiParameterDefinition>(`/parameter-definition/${pd_id}`),
  create: (body: CreateParameterDefinitionParams) =>
    api.post<ApiParameterDefinition>("/parameter-definition", body),
  update: (pd_id: string, body: UpdateParameterDefinitionParams) =>
    api.post<ApiParameterDefinition>(`/parameter-definition/${pd_id}`, body),
  delete: (pd_id: string) =>
    api.delete<SuccessResponse>(`/parameter-definition/${pd_id}`),
};
