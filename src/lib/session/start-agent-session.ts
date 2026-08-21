import { contextsApi } from "@/lib/api/contexts";
import { apiKeysApi } from "@/lib/api/api-keys";
import { useOrgStore } from "@/lib/stores/org-store";

export interface AgentSessionParams {
  agentId: string;
  promptArgs?: Record<string, string>;
  userDefined?: Record<string, unknown>;
}

export interface AgentSession {
  contextId: string;
  clientId: string | null;
  accessToken: string;
}

/** Create a context for `agentId` and mint a client-scoped connect token. */
export async function startAgentSession(
  params: AgentSessionParams
): Promise<AgentSession> {
  const orgId = useOrgStore.getState().activeOrgId;
  if (!orgId) throw new Error("No active organization selected.");

  const ctx = await contextsApi.create({
    agent_id: params.agentId,
    prompt_args: params.promptArgs,
    user_defined: params.userDefined,
  });

  const key = await apiKeysApi.generate({
    org_id: orgId,
    type: "client",
    client_id: ctx.client_id ?? undefined,
  });

  return {
    contextId: ctx.context_id,
    clientId: ctx.client_id ?? null,
    accessToken: key.token,
  };
}

// --- TSS URL helpers ---
// We store one base URL (no path suffix). Chat needs `${base}/ws`; the voice
// SDK takes the base and appends `/ws-realtime` itself. When unset, both SDKs
// fall back to their built-in prod defaults.
const TSS_BASE =
  process.env.NEXT_PUBLIC_TOKEN_STREAMING_URL?.replace(/\/$/, "") || "";

/** Base URL for the voice SDK (it appends `/ws-realtime`). Undefined → SDK default. */
export function voiceTssUrl(): string | undefined {
  return TSS_BASE || undefined;
}

/** `/ws` URL for the chat SDK's `websocketUrl`. Undefined → SDK default. */
export function chatWebsocketUrl(): string | undefined {
  return TSS_BASE ? `${TSS_BASE}/ws` : undefined;
}
