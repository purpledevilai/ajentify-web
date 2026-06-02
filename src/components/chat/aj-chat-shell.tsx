"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AjentifyProvider,
  defineClientSideTools,
  type AjentifyEvent,
} from "@ajentify/chat";
import { ChatPanel } from "@ajentify/chat/ui";

import { api } from "@/lib/api/client";
import { fetchAjentifyDocs } from "@/lib/ajentify-docs";

import { useAgentsStore } from "@/lib/stores/agents-store";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useDefaultToolsStore } from "@/lib/stores/default-tools-store";
import { useApiKeysStore } from "@/lib/stores/api-keys-store";
import { useSresStore } from "@/lib/stores/sres-store";
import { useIntegrationsStore } from "@/lib/stores/integrations-store";
import { usePdStore } from "@/lib/stores/parameter-definitions-store";
import { useDataWindowsStore } from "@/lib/stores/data-windows-store";
import { useJsonDocumentsStore } from "@/lib/stores/json-documents-store";
import { useStagesStore } from "@/lib/stores/stages-store";
import { useModelsStore } from "@/lib/stores/models-store";

/**
 * Two pieces of chat plumbing for the dashboard. Split because the
 * `AjentifyProvider` has to sit *above* both the TopBar (which renders
 * `<AjChatToggle />` driven by `useChatPanel()`) AND the panel itself —
 * any component reading the chat's panel state has to be inside the same
 * provider that owns it.
 *
 * Layout looks like:
 *
 * ```tsx
 * <AjChatProvider>
 *   <TopBar />        // contains <AjChatToggle />
 *   <AjChatPanel>     // docked ChatPanel
 *     <main>{children}</main>
 *   </AjChatPanel>
 * </AjChatProvider>
 * ```
 *
 * v0.2 simplifications:
 *  - The chat's stylesheet auto-injects (no `@layer ajentify-chat` dance).
 *  - Panel open/close is owned by the provider — `<AjChatToggle />` in the
 *    TopBar talks to it via `useChatPanel()`.
 *  - `defineClientSideTools<Tools>` types every tool's args + return.
 *  - No more `classNames` patch-overs; layout is driven by the chat's CSS
 *    variables and looks correct off the bat.
 *
 * `onAjentifyEvent` still goes through the dashboard's own authenticated
 * `api.post` so we inherit the bearer-token refresh wiring. The only piece
 * of work it does here is unwrap `{ token }` for `generate_access_token`,
 * which the upstream `POST /ajentify-event` returns wrapped.
 */
type AjTools = {
  navigate: { args: { path?: string; url?: string; route?: string }; result: { ok: boolean; path?: string; error?: string } };
  view_docs: { args: { path?: string }; result: Awaited<ReturnType<typeof fetchAjentifyDocs>> };
  list_agents: { args: Record<string, never>; result: unknown };
  list_tools: { args: Record<string, never>; result: unknown };
  list_default_tools: { args: Record<string, never>; result: unknown };
  list_api_keys: { args: Record<string, never>; result: unknown };
  list_sres: { args: Record<string, never>; result: unknown };
  list_integrations: { args: Record<string, never>; result: unknown };
  list_parameter_definitions: { args: Record<string, never>; result: unknown };
  list_data_windows: { args: Record<string, never>; result: unknown };
  list_json_documents: { args: Record<string, never>; result: unknown };
  list_stages: { args: Record<string, never>; result: unknown };
  list_models: { args: Record<string, never>; result: unknown };
};

async function onAjentifyEvent(event: AjentifyEvent): Promise<unknown> {
  const payload = await api.post<unknown>("/ajentify-event", event);
  if (event.type === "generate_access_token") {
    return (payload as { token: string }).token;
  }
  return payload;
}

export function AjChatProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const clientSideTools = useMemo(
    () =>
      defineClientSideTools<AjTools>({
        navigate: ({ path, url, route }) => {
          const target = path ?? url ?? route;
          if (!target) {
            return { ok: false, error: "navigate is missing a `path` argument" };
          }
          router.push(target);
          return { ok: true, path: target };
        },
        view_docs: ({ path }) => fetchAjentifyDocs(path),
        list_agents: async () => {
          await useAgentsStore.getState().ensureLoaded();
          return useAgentsStore.getState().data;
        },
        list_tools: async () => {
          await useToolsStore.getState().ensureLoaded();
          return useToolsStore.getState().data;
        },
        list_default_tools: async () => {
          await useDefaultToolsStore.getState().ensureLoaded();
          return useDefaultToolsStore.getState().data;
        },
        list_api_keys: async () => {
          await useApiKeysStore.getState().ensureLoaded();
          return useApiKeysStore.getState().data;
        },
        list_sres: async () => {
          await useSresStore.getState().ensureLoaded();
          return useSresStore.getState().data;
        },
        list_integrations: async () => {
          await useIntegrationsStore.getState().ensureLoaded();
          return useIntegrationsStore.getState().data;
        },
        list_parameter_definitions: async () => {
          await usePdStore.getState().ensureLoaded();
          return usePdStore.getState().data;
        },
        list_data_windows: async () => {
          await useDataWindowsStore.getState().ensureLoaded();
          return useDataWindowsStore.getState().data;
        },
        list_json_documents: async () => {
          await useJsonDocumentsStore.getState().ensureLoaded();
          return useJsonDocumentsStore.getState().data;
        },
        list_stages: async () => {
          await useStagesStore.getState().ensureLoaded();
          return useStagesStore.getState().data;
        },
        list_models: async () => {
          await useModelsStore.getState().ensureLoaded();
          return useModelsStore.getState().data;
        },
      }),
    [router],
  );

  return (
    <AjentifyProvider
      config={{
        onAjentifyEvent,
        clientSideTools,
        themeBridge: "shadcn",
        onError: (err) => console.error("[ajentify]", err),
      }}
    >
      {children}
    </AjentifyProvider>
  );
}

/**
 * Inline docked ChatPanel. Must be a descendant of `<AjChatProvider />`.
 * The `flex-1 min-h-0` keeps the panel filling the dashboard column
 * between the TopBar and the bottom of the viewport.
 */
export function AjChatPanel({ children }: { children: React.ReactNode }) {
  return (
    <ChatPanel
      desktopVariant="inline"
      title="Aj"
      classNames={{ root: "flex-1 min-h-0" }}
    >
      {children}
    </ChatPanel>
  );
}
