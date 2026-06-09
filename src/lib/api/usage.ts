import { api } from "./client";
import type { UsageResponse } from "@/types/api";

export const usageApi = {
  get: (params: { start_date: string; end_date: string; org_id?: string }) =>
    api.get<UsageResponse>("/usage", { query: params }),
};
