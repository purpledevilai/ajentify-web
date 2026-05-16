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
      const isFirst = !get().loaded;
      set({ loading: isFirst, refreshing: !isFirst, error: null });
      inflight = (async () => {
        try {
          if (opts.dependencies?.length) {
            await Promise.all(opts.dependencies.map((d) => d.ensureLoaded()));
          }
          const data = await opts.fetcher();
          set({
            data,
            loaded: true,
            loading: false,
            refreshing: false,
            error: null,
          });
          return data;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          set({ loading: false, refreshing: false, error: msg });
          throw e;
        } finally {
          inflight = null;
        }
      })();
      return inflight;
    },

    reset() {
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
