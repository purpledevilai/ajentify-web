import { api } from "./client";
import type {
  ApiParameterDefinition,
  GetParameterDefinitionsResponse,
} from "@/types/api";

export const pdApi = {
  list: (org_id?: string) =>
    api.get<GetParameterDefinitionsResponse>("/parameter-definitions", {
      query: { org_id },
    }),
  get: (pd_id: string) =>
    api.get<ApiParameterDefinition>(`/parameter-definition/${pd_id}`),
};
