import { api } from "./client";
import type { ApiUser } from "@/types/api";

export const userApi = {
  get: () => api.get<ApiUser>("/user"),
};
