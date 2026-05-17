import { api } from "./client";
import type { AuthResponse, SuccessResponse } from "@/types/api";

// Endpoints that RETURN a Set-Cookie (refresh token) use `credentialedPublicPost`
// so the browser actually stores the cookie. Everything else uses `publicPost`
// (credentials: omit) to stay compatible with the backend's wildcard CORS on
// non-auth-cookie routes.
// `/auth` accepts two shapes:
//   • { provider: "microsoft", id_token }      — Microsoft's SPA platform is
//     truly secretless with PKCE, so the browser exchanges the code itself
//     and posts the resulting id_token.
//   • { provider: "google",    code, code_verifier, redirect_uri } — Google
//     "Web application" clients require client_secret at /token even with
//     PKCE, so the Lambda performs the exchange server-side.
export type OAuthPayload =
  | { provider: "microsoft"; id_token: string }
  | {
      provider: "google";
      code: string;
      code_verifier: string;
      redirect_uri: string;
    };

export const authApi = {
  oauth: (payload: OAuthPayload) =>
    api.credentialedPublicPost<AuthResponse>("/auth", payload),
  createAccount: (b: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) => api.publicPost<SuccessResponse>("/create-account", b),
  verifyCode: (email: string, code: string) =>
    api.credentialedPublicPost<AuthResponse>("/verify-code", { email, code }),
  resendCode: (email: string) =>
    api.publicPost<SuccessResponse>("/resend-code", { email }),
  login: (email: string, password: string) =>
    api.credentialedPublicPost<AuthResponse>("/login", { email, password }),
  resetPassword: (email: string) =>
    api.publicPost<SuccessResponse>("/reset-password", { email }),
  setNewPassword: (email: string, code: string, new_password: string) =>
    api.credentialedPublicPost<AuthResponse>("/set-new-password", {
      email,
      code,
      new_password,
    }),
  // /refresh is invoked directly by the client interceptor (with credentials).
};
