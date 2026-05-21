import { api } from "./client";
import type {
  ApiAPIKey,
  ApiAPIKeySummary,
  GetAPIKeysResponse,
} from "@/types/api";

export interface GenerateAPIKeyParams {
  org_id: string;
  type: "org" | "client";
  client_id?: string | null;
}

export const apiKeysApi = {
  list: (org_id?: string) =>
    api.get<GetAPIKeysResponse>("/api-keys", { query: { org_id } }),
  generate: (body: GenerateAPIKeyParams) =>
    api.post<ApiAPIKey>("/generate-api-key", body),
  revoke: (api_key_id: string) =>
    api.post<ApiAPIKeySummary>("/revoke-api-key", { api_key_id }),
};
