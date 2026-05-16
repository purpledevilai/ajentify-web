import { api } from "./client";
import type { AuthResponse, SuccessResponse } from "@/types/api";

export const authApi = {
  oauth: (id_token: string, provider: "google" | "microsoft") =>
    api.publicPost<AuthResponse>("/auth", { id_token, provider }),
  createAccount: (b: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => api.publicPost<SuccessResponse>("/create-account", b),
  verifyCode: (email: string, code: string) =>
    api.publicPost<AuthResponse>("/verify-code", { email, code }),
  resendCode: (email: string) =>
    api.publicPost<SuccessResponse>("/resend-code", { email }),
  login: (email: string, password: string) =>
    api.publicPost<AuthResponse>("/login", { email, password }),
  resetPassword: (email: string) =>
    api.publicPost<SuccessResponse>("/reset-password", { email }),
  setNewPassword: (email: string, code: string, new_password: string) =>
    api.publicPost<AuthResponse>("/set-new-password", {
      email,
      code,
      new_password,
    }),
  // /refresh is invoked directly by the client interceptor; no wrapper needed here.
};
