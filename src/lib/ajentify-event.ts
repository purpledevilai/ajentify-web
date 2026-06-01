import type { AjentifyEvent } from "@ajentify/chat";
import { api } from "@/lib/api/client";

/**
 * Single async callback `@ajentify/chat` uses for all backend work.
 *
 * Routes every event to `POST /ajentify-event` on the Ajentify API, which is
 * a private handler that proxies to internal Context/Client/APIKey models —
 * see `AgentLambda/src/RequestHandlers/AjentifyChat/AjentifyEventHandler.py`.
 *
 * The bearer JWT and 401-refresh wiring come from the existing `api` client,
 * so we inherit the same auth as the rest of the dashboard for free.
 */
export async function ajentifyEvent(event: AjentifyEvent): Promise<unknown> {
  const payload = await api.post<unknown>("/ajentify-event", event);

  // Upstream `generate_access_token` returns `{ token }`. The SDK expects a
  // bare token string for that event type.
  if (event.type === "generate_access_token") {
    return (payload as { token: string }).token;
  }
  return payload;
}
