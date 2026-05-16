import { api } from "./client";
import type { ApiOrganization } from "@/types/api";

export const orgApi = {
  create: (name: string) => api.post<ApiOrganization>("/organization", { name }),
};
