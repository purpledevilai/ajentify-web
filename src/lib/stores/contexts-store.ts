import { create } from "zustand";
import { contextsApi } from "@/lib/api/contexts";
import { getErrorMessage } from "@/lib/api/errors";
import type { ApiContext, ApiContextMessage, ApiOrgContextSummary } from "@/types/api";
import { useOrgStore } from "./org-store";
import { registerStore } from "./registry";

export const CONTEXTS_PAGE_SIZE = 25;
const PREVIEW_LEN = 140;

interface ContextFilters {
  agentId: string;
  clientId: string;
  contextId: string;
}

interface ContextsState {
  data: ApiOrgContextSummary[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  loaded: boolean;
  error: string | null;

  /** Filters that drove the data currently in `data`. Kept in the store so the
   *  index page's draft inputs can re-sync when the user navigates back. */
  appliedAgentId: string;
  appliedClientId: string;
  appliedContextId: string;

  setFilters: (filters: Partial<ContextFilters>) => void;
  /** Load the first page, honouring the cache unless `force` is true. */
  ensureLoaded: () => Promise<void>;
  load: (force?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * Adapt a full context (from GET /context/{id}) into the summary row shape.
 * Used for the exact `context_id` filter, since /org-contexts can't filter by
 * context id — we hit the single-context endpoint and reshape the result.
 */
function contextToSummary(c: ApiContext): ApiOrgContextSummary {
  let preview: string | null = null;
  const last: ApiContextMessage | undefined = c.messages?.[c.messages.length - 1];
  if (last) {
    if ("sender" in last && typeof last.message === "string") {
      preview = last.message.slice(0, PREVIEW_LEN);
    } else if ("type" in last && last.type === "tool_response") {
      preview = last.tool_output.slice(0, PREVIEW_LEN);
    } else if ("type" in last && last.type === "tool_call") {
      try {
        preview = JSON.stringify(last.tool_input ?? {}).slice(0, PREVIEW_LEN);
      } catch {
        preview = null;
      }
    }
  }
  return {
    context_id: c.context_id,
    agent_id: c.agent_id,
    org_id: c.org_id ?? "",
    user_id: c.user_id,
    client_id: c.client_id ?? null,
    owner_kind: c.user_id === "public" ? "public" : "api_key",
    last_message_preview: preview,
    created_at: c.created_at ?? 0,
    updated_at: c.updated_at ?? 0,
    expires_at: c.expires_at ?? null,
  };
}

export const useContextsStore = create<ContextsState>((set, get) => ({
  data: [],
  nextCursor: null,
  loading: false,
  loadingMore: false,
  loaded: false,
  error: null,
  appliedAgentId: "",
  appliedClientId: "",
  appliedContextId: "",

  setFilters(filters) {
    set({
      appliedAgentId: filters.agentId ?? get().appliedAgentId,
      appliedClientId: filters.clientId ?? get().appliedClientId,
      appliedContextId: filters.contextId ?? get().appliedContextId,
    });
  },

  async ensureLoaded() {
    if (get().loaded || get().loading) return;
    await get().load();
  },

  async load(force = false) {
    if (!force && get().loaded) return;
    set({ loading: true, error: null });

    const { appliedAgentId, appliedClientId, appliedContextId } = get();

    try {
      // Exact context_id lookup uses the single-context endpoint since the
      // list endpoint can't filter by context_id.
      if (appliedContextId) {
        try {
          const c = await contextsApi.get(appliedContextId, false);
          set({ data: [contextToSummary(c)] });
        } catch {
          // Missing / forbidden id behaves like a filter that matches nothing.
          set({ data: [] });
        }
        set({ nextCursor: null, loaded: true, loading: false });
        return;
      }

      const orgId = useOrgStore.getState().activeOrgId ?? undefined;
      const res = await contextsApi.listOrg({
        org_id: orgId,
        agent_id: appliedAgentId || undefined,
        client_id: appliedClientId || undefined,
        limit: CONTEXTS_PAGE_SIZE,
      });
      set({
        data: res.contexts,
        nextCursor: res.next_cursor ?? null,
        loaded: true,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: getErrorMessage(e, "Failed to load contexts"),
      });
    }
  },

  async loadMore() {
    const { nextCursor, loadingMore, appliedContextId } = get();
    if (!nextCursor || loadingMore || appliedContextId) return;
    set({ loadingMore: true });
    try {
      const orgId = useOrgStore.getState().activeOrgId ?? undefined;
      const res = await contextsApi.listOrg({
        org_id: orgId,
        agent_id: get().appliedAgentId || undefined,
        client_id: get().appliedClientId || undefined,
        limit: CONTEXTS_PAGE_SIZE,
        cursor: nextCursor,
      });
      set({
        data: [...get().data, ...res.contexts],
        nextCursor: res.next_cursor ?? null,
        loadingMore: false,
      });
    } catch (e) {
      set({
        loadingMore: false,
        error: getErrorMessage(e, "Failed to load more contexts"),
      });
    }
  },

  reset() {
    set({
      data: [],
      nextCursor: null,
      loading: false,
      loadingMore: false,
      loaded: false,
      error: null,
      appliedAgentId: "",
      appliedClientId: "",
      appliedContextId: "",
    });
  },
}));

registerStore({ reset: () => useContextsStore.getState().reset() });
