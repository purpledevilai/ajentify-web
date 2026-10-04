import { api, request } from "./client";
import type {
  ApiJobAccepted,
  ApiOrganization,
  GetOrgInvitesResponse,
  GetOrgMembersResponse,
  InviteMemberResponse,
  SuccessResponse,
} from "@/types/api";

export interface UpdateOrganizationParams {
  name?: string;
  webhook_url?: string | null;
  webhook_signing_api_key_id?: string | null;
}

export const orgApi = {
  create: (name: string) => api.post<ApiOrganization>("/organization", { name }),
  get: (org_id: string) => api.get<ApiOrganization>(`/organization/${org_id}`),
  update: (org_id: string, body: UpdateOrganizationParams) =>
    api.post<ApiOrganization>(`/organization/${org_id}`, body),
  rename: (org_id: string, name: string) =>
    api.post<ApiOrganization>(`/organization/${org_id}`, { name }),

  // Starts the teardown job (202). Backend cancels the Stripe subscription
  // first, then cascades every org-owned resource, then removes the org and
  // memberships. `confirm_name` must equal the org's current name
  // (400 `confirm_name_mismatch`). Poll `GET /job/{job_id}` for progress.
  delete: (org_id: string, confirm_name: string) =>
    request<ApiJobAccepted>(`/organization/${org_id}`, {
      method: "DELETE",
      body: { confirm_name },
    }),

  // --- Members ---------------------------------------------------------------
  listMembers: (org_id: string) =>
    api.get<GetOrgMembersResponse>(`/organization/${org_id}/members`),
  // 400 `last_member` when `user_id` is the only member — delete the org instead.
  removeMember: (org_id: string, user_id: string) =>
    api.delete<SuccessResponse>(
      `/organization/${org_id}/members/${encodeURIComponent(user_id)}`
    ),

  // --- Invites ---------------------------------------------------------------
  // Existing account → attached immediately ({status:"added"}); unknown email →
  // pending invite ({status:"invited"}). 409 already_member|already_invited,
  // 400 cannot_invite_self, 429 invite_limit.
  invite: (org_id: string, email: string) =>
    api.post<InviteMemberResponse>(`/organization/${org_id}/invite`, { email }),
  listInvites: (org_id: string) =>
    api.get<GetOrgInvitesResponse>(`/organization/${org_id}/invites`),
  // `invite_id` is "<org_id>#<email>" — the `#` must be percent-encoded.
  revokeInvite: (org_id: string, invite_id: string) =>
    api.delete<SuccessResponse>(
      `/organization/${org_id}/invites/${encodeURIComponent(invite_id)}`
    ),
};
