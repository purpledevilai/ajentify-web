import { createListStore } from "./store-factory";
import { modelsApi } from "@/lib/api/models";
import type { ApiLLMModel } from "@/types/api";

export const useModelsStore = createListStore<ApiLLMModel, "model">({
  name: "models",
  idKey: "model",
  fetcher: async () => (await modelsApi.list()).models,
});
