import { create, type StateCreator, type StoreApi, type UseBoundStore } from "zustand";
import { registerStore } from "./registry";

export interface ListStoreState<T, K extends keyof T> {
  data: T[];
  loaded: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  ensureLoaded: () => Promise<T[]>;
  refresh: () => Promise<T[]>;
  reset: () => void;
  getById: (id: T[K]) => Promise<T | undefined>;
  upsert: (item: T) => void;
  removeById: (id: T[K]) => void;
}

export interface ListStoreOptions<T, K extends keyof T> {
  name: string;
  fetcher: () => Promise<T[]>;
  idKey: K;
  /**
   * Stores that must be loaded before this one's fetcher runs.
   * They are awaited in parallel via Promise.all.
   */
  dependencies?: Array<{ ensureLoaded: () => Promise<unknown> }>;
}

export function createListStore<T, K extends keyof T>(
  opts: ListStoreOptions<T, K>
): UseBoundStore<StoreApi<ListStoreState<T, K>>> {
  // Single-flight slot lives in the factory closure so concurrent
  // ensureLoaded() callers coalesce onto one fetcher invocation.
  let inflight: Promise<T[]> | null = null;
  // Generation token bumped by `refresh()` and `reset()`. Each in-flight
  // fetch captures the gen at start time; if a newer call (or a reset)
  // bumps it before this fetch resolves, the stale result is discarded
  // instead of clobbering the store.
  let generation = 0;

  const creator: StateCreator<ListStoreState<T, K>> = (set, get) => ({
    data: [],
    loaded: false,
    loading: false,
    refreshing: false,
    error: null,

    async ensureLoaded() {
      const s = get();
      if (s.loaded) return s.data;
      if (inflight) return inflight;
      return get().refresh();
    },

    async refresh() {
      const myGen = ++generation;
      const isFirst = !get().loaded;
      set({ loading: isFirst, refreshing: !isFirst, error: null });
      const run = async (): Promise<T[]> => {
        try {
          if (opts.dependencies?.length) {
            await Promise.all(opts.dependencies.map((d) => d.ensureLoaded()));
          }
          const data = await opts.fetcher();
          if (myGen === generation) {
            set({
              data,
              loaded: true,
              loading: false,
              refreshing: false,
              error: null,
            });
          }
          return data;
        } catch (e) {
          if (myGen === generation) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            set({ loading: false, refreshing: false, error: msg });
          }
          throw e;
        } finally {
          // Only clear the slot if it's still ours — a newer refresh() or
          // reset() may have replaced it while we were awaiting.
          if (inflight === p) inflight = null;
        }
      };
      const p = run();
      inflight = p;
      return p;
    },

    reset() {
      // Bumping generation neutralises any in-flight fetch so its eventual
      // resolve/reject can't write to the store after we've cleared it.
      generation++;
      inflight = null;
      set({
        data: [],
        loaded: false,
        loading: false,
        refreshing: false,
        error: null,
      });
    },

    async getById(id) {
      const s = get();
      if (!s.loaded) await get().ensureLoaded();
      return get().data.find((item) => item[opts.idKey] === id);
    },

    upsert(item) {
      const current = get().data;
      const idx = current.findIndex((d) => d[opts.idKey] === item[opts.idKey]);
      const next = [...current];
      if (idx >= 0) next[idx] = item;
      else next.push(item);
      set({ data: next });
    },

    removeById(id) {
      set({ data: get().data.filter((d) => d[opts.idKey] !== id) });
    },
  });

  const store = create<ListStoreState<T, K>>(creator);
  registerStore({ reset: () => store.getState().reset() });
  return store;
}
