"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { AjentifyProvider } from "@ajentify/chat";
import { ChatPanel } from "@ajentify/chat/ui";

import { ajentifyEvent } from "@/lib/ajentify-event";
import { fetchAjentifyDocs } from "@/lib/ajentify-docs";
import { useAjChatStore } from "@/lib/stores/aj-chat-store";

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
 * Wraps the dashboard's content in an `AjentifyProvider` + docked `ChatPanel`.
 *
 * All client-side tools the Aj agent calls land in the `clientSideTools`
 * callback below. PageTools (`get_page_data`, `do_page_action`) are wired up
 * per-page via the SDK's `useGetPageData` / `useDoPageAction` hooks; only the
 * "global" tools (`navigate`, `view_docs`, `list_*`) need to be handled here.
 *
 * Open/close state is owned by `useAjChatStore` so any button anywhere in
 * the dashboard (the TopBar today) can toggle the chat.
 */
export function AjChatShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const open = useAjChatStore((s) => s.open);
  const setOpen = useAjChatStore((s) => s.setOpen);

  const clientSideTools = useCallback(
    async (toolName: string, args: Record<string, unknown>) => {
      switch (toolName) {
        case "navigate": {
          const path =
            (args.path as string | undefined) ??
            (args.url as string | undefined) ??
            (args.route as string | undefined);
          if (!path) {
            return { ok: false, error: "navigate is missing a `path` argument" };
          }
          router.push(path);
          return { ok: true, path };
        }

        case "view_docs":
          return await fetchAjentifyDocs(args.path as string | undefined);

        case "list_agents": {
          await useAgentsStore.getState().ensureLoaded();
          return useAgentsStore.getState().data;
        }
        case "list_tools": {
          await useToolsStore.getState().ensureLoaded();
          return useToolsStore.getState().data;
        }
        case "list_default_tools": {
          await useDefaultToolsStore.getState().ensureLoaded();
          return useDefaultToolsStore.getState().data;
        }
        case "list_api_keys": {
          await useApiKeysStore.getState().ensureLoaded();
          return useApiKeysStore.getState().data;
        }
        case "list_sres": {
          await useSresStore.getState().ensureLoaded();
          return useSresStore.getState().data;
        }
        case "list_integrations": {
          await useIntegrationsStore.getState().ensureLoaded();
          return useIntegrationsStore.getState().data;
        }
        case "list_parameter_definitions": {
          await usePdStore.getState().ensureLoaded();
          return usePdStore.getState().data;
        }
        case "list_data_windows": {
          await useDataWindowsStore.getState().ensureLoaded();
          return useDataWindowsStore.getState().data;
        }
        case "list_json_documents": {
          await useJsonDocumentsStore.getState().ensureLoaded();
          return useJsonDocumentsStore.getState().data;
        }
        case "list_stages": {
          await useStagesStore.getState().ensureLoaded();
          return useStagesStore.getState().data;
        }
        case "list_models": {
          await useModelsStore.getState().ensureLoaded();
          return useModelsStore.getState().data;
        }

        default:
          return { ok: false, error: `unknown tool: ${toolName}` };
      }
    },
    [router],
  );

  return (
    <AjentifyProvider
      config={{
        onAjentifyEvent: ajentifyEvent,
        clientSideTools,
        themeBridge: "shadcn",
        onError: (err) => console.error("[ajentify]", err),
      }}
    >
      <ChatPanel
        open={open}
        onOpenChange={setOpen}
        desktopVariant="inline"
        title="Aj"
        classNames={{ root: "flex-1 min-h-0" }}
      >
        {children}
      </ChatPanel>
    </AjentifyProvider>
  );
}
