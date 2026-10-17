import { api } from "./client";
import type {
  OAuthAuthorizeGrantRequest,
  OAuthAuthorizeGrantResponse,
  OAuthAuthorizePreviewRequest,
  OAuthAuthorizePreviewResponse,
} from "@/types/oauth";

/**
 * MCP OAuth consent endpoints. Both take the normal login Bearer token (the
 * api client injects it) — the user is consenting as themselves.
 */
export const oauthAuthorizeApi = {
  /** Validates client / redirect_uri / scope / resource; writes nothing. */
  preview: (body: OAuthAuthorizePreviewRequest) =>
    api.post<OAuthAuthorizePreviewResponse>("/oauth/authorize/preview", body),
  /** Persists the authorization code and returns the final redirect URL. */
  grant: (body: OAuthAuthorizeGrantRequest) =>
    api.post<OAuthAuthorizeGrantResponse>("/oauth/authorize/grant", body),
};
