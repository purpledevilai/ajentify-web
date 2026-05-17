import { api } from "./client";
import type { ApiUser, SuccessResponse } from "@/types/api";

export const userApi = {
  get: () => api.get<ApiUser>("/user"),
  // Deletes the current user. Backend cascades: leaves every org, fully tears
  // down any org where the user was the last member (agents, tools, chats,
  // integrations, etc.), then deletes the user row itself.
  delete: () => api.delete<SuccessResponse>("/user"),
};
