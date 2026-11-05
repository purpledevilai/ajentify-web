import { api } from "./client";
import type {
  ApiPhoneNumber,
  ApiTelephonySecret,
  CreatePhoneNumberParams,
  GetPhoneNumbersResponse,
  SuccessResponse,
  UpdatePhoneNumberParams,
} from "@/types/api";

export const phoneNumbersApi = {
  /** Every number registered to the org (attached or not). */
  listByOrg: (org_id: string) =>
    api.get<GetPhoneNumbersResponse>("/phone-numbers", { query: { org_id } }),
  /** Numbers currently routed to one agent. */
  listByAgent: (agent_id: string) =>
    api.get<GetPhoneNumbersResponse>("/phone-numbers", { query: { agent_id } }),
  get: (phone_number_id: string) =>
    api.get<ApiPhoneNumber>(`/phone-number/${encodeURIComponent(phone_number_id)}`),
  // Registers a BYO Twilio number (ownership `byo`). 409 when the number is
  // already registered; 400 when `agent_id` is not on a realtime model.
  create: (body: CreatePhoneNumberParams) => api.post<ApiPhoneNumber>("/phone-number", body),
  // Update is POST (not PUT), mirroring /schedule/{id}. `agent_id: null`
  // detaches; `twilio_auth_token: null` clears the stored token.
  update: (phone_number_id: string, body: UpdatePhoneNumberParams) =>
    api.post<ApiPhoneNumber>(`/phone-number/${encodeURIComponent(phone_number_id)}`, body),
  delete: (phone_number_id: string) =>
    api.delete<SuccessResponse>(`/phone-number/${encodeURIComponent(phone_number_id)}`),
};

export const telephonySecretApi = {
  /** The org's active telephony secret; the API mints one on first call. */
  get: (org_id: string) =>
    api.get<ApiTelephonySecret>(
      `/organization/${encodeURIComponent(org_id)}/telephony-secret`
    ),
  /** Mints a new secret and revokes the old one — every connected Twilio
   *  number's webhook password must be updated afterwards. */
  rotate: (org_id: string) =>
    api.post<ApiTelephonySecret>(
      `/organization/${encodeURIComponent(org_id)}/telephony-secret/rotate`
    ),
};
