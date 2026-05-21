import { useAgentsStore } from "./agents-store";
import { useToolsStore } from "./tools-store";
import { useDefaultToolsStore } from "./default-tools-store";
import { useModelsStore } from "./models-store";
import { usePdStore } from "./parameter-definitions-store";
import { useApiKeysStore } from "./api-keys-store";
import { useDataWindowsStore } from "./data-windows-store";
import { useIntegrationsStore } from "./integrations-store";
import { useJsonDocumentsStore } from "./json-documents-store";
import { useStagesStore } from "./stages-store";
import { useSresStore } from "./sres-store";

/**
 * Trigger every primitive list store to load its data in parallel. Each
 * store's own single-flight slot coalesces concurrent callers, so it's
 * safe to call this multiple times — repeat calls during the same load
 * cycle just await the in-flight fetches, and calls after data is loaded
 * are no-ops.
 *
 * `tools-store` and `sres-store` declare `parameter-definitions-store` as
 * a dependency; we also kick `usePdStore.ensureLoaded()` directly here so
 * the fetch starts immediately rather than waiting for tools/SREs to
 * begin their dependency phase. Whichever caller arrives first wins.
 *
 * Returns a `Promise.allSettled` so one failing store never blocks the
 * others. UI surfaces error state per-store via `store.error`.
 */
export function prefetchAllStores() {
  return Promise.allSettled([
    usePdStore.getState().ensureLoaded(),
    useModelsStore.getState().ensureLoaded(),
    useDefaultToolsStore.getState().ensureLoaded(),
    useAgentsStore.getState().ensureLoaded(),
    useToolsStore.getState().ensureLoaded(),
    useApiKeysStore.getState().ensureLoaded(),
    useDataWindowsStore.getState().ensureLoaded(),
    useIntegrationsStore.getState().ensureLoaded(),
    useJsonDocumentsStore.getState().ensureLoaded(),
    useStagesStore.getState().ensureLoaded(),
    useSresStore.getState().ensureLoaded(),
  ]);
}
