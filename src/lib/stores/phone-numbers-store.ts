import { createListStore } from "./store-factory";
import { phoneNumbersApi } from "@/lib/api/phone-numbers";
import { useOrgStore } from "./org-store";
import type {
  ApiPhoneNumber,
  CreatePhoneNumberParams,
  UpdatePhoneNumberParams,
} from "@/types/api";

/**
 * Every phone number registered to the active org. The agent builder derives
 * "attached to this agent" / "free to attach" from this one list so an
 * attach/detach on either page is reflected everywhere without a refetch.
 */
export const usePhoneNumbersStore = createListStore<ApiPhoneNumber, "phone_number_id">({
  name: "phone-numbers",
  idKey: "phone_number_id",
  fetcher: async () => {
    const orgId = useOrgStore.getState().activeOrgId;
    if (!orgId) return [];
    return (await phoneNumbersApi.listByOrg(orgId)).phone_numbers;
  },
});

/** Selector: numbers routed to `agentId`. */
export function selectAgentPhoneNumbers(agentId: string) {
  return (state: { data: ApiPhoneNumber[] }): ApiPhoneNumber[] =>
    state.data.filter((n) => n.agent_id === agentId);
}

/** Selector: numbers not routed to any agent. */
export function selectUnattachedPhoneNumbers(state: { data: ApiPhoneNumber[] }): ApiPhoneNumber[] {
  return state.data.filter((n) => n.agent_id === null);
}

export const phoneNumbersActions = {
  async create(body: CreatePhoneNumberParams): Promise<ApiPhoneNumber> {
    const params: CreatePhoneNumberParams = {
      ...body,
      org_id: body.org_id ?? useOrgStore.getState().activeOrgId ?? undefined,
    };
    const n = await phoneNumbersApi.create(params);
    usePhoneNumbersStore.getState().upsert(n);
    return n;
  },
  async update(phone_number_id: string, body: UpdatePhoneNumberParams): Promise<ApiPhoneNumber> {
    const n = await phoneNumbersApi.update(phone_number_id, body);
    usePhoneNumbersStore.getState().upsert(n);
    return n;
  },
  async attach(phone_number_id: string, agent_id: string): Promise<ApiPhoneNumber> {
    return phoneNumbersActions.update(phone_number_id, { agent_id });
  },
  async detach(phone_number_id: string): Promise<ApiPhoneNumber> {
    return phoneNumbersActions.update(phone_number_id, { agent_id: null });
  },
  async remove(phone_number_id: string) {
    const res = await phoneNumbersApi.delete(phone_number_id);
    usePhoneNumbersStore.getState().removeById(phone_number_id);
    return res;
  },
};
