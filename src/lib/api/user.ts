import { api, request } from "./client";
import type { ApiUser, ApiUserDeletionAccepted } from "@/types/api";

export const userApi = {
  get: () => api.get<ApiUser>("/user"),
  // Starts the account-deletion job (202). Backend leaves every org, fully
  // tears down any org where the user was the last member (Stripe
  // subscription cancelled first, then agents, tools, chats, integrations,
  // etc.), then deletes the user row. `confirm_email` must equal the
  // account email (400 `confirm_email_mismatch`). The 202 body lists each
  // org with its fate (`orgs[]`); poll `GET /job/{job_id}` for progress.
  delete: (confirm_email: string) =>
    request<ApiUserDeletionAccepted>("/user", {
      method: "DELETE",
      body: { confirm_email },
    }),
};
