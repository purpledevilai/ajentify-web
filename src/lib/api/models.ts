import { api } from "./client";
import type { GetModelsResponse } from "@/types/api";

export const modelsApi = {
  list: () => api.get<GetModelsResponse>("/models"),
};
