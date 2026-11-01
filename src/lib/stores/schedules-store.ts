import { create } from "zustand";
import { schedulesApi } from "@/lib/api/schedules";
import { registerStore } from "./registry";
import type {
  ApiJobAccepted,
  ApiSchedule,
  CreateScheduleParams,
  UpdateScheduleParams,
} from "@/types/api";

export interface AgentSchedulesSlice {
  data: ApiSchedule[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

export const EMPTY_SLICE: AgentSchedulesSlice = {
  data: [],
  loaded: false,
  loading: false,
  error: null,
};

interface SchedulesState {
  /** Schedules keyed by `agent_id` (the list route is agent-scoped, so the
   *  org-scoped `createListStore` factory doesn't fit). */
  byAgent: Record<string, AgentSchedulesSlice>;
  ensureLoaded: (agentId: string) => Promise<ApiSchedule[]>;
  refresh: (agentId: string) => Promise<ApiSchedule[]>;
  upsert: (schedule: ApiSchedule) => void;
  removeById: (scheduleId: string) => void;
  reset: () => void;
}

// Single-flight per agent + a generation token so a reset() (org switch /
// logout) discards any fetch that was still in flight.
const inflight = new Map<string, Promise<ApiSchedule[]>>();
let generation = 0;

function sliceFor(state: SchedulesState, agentId: string): AgentSchedulesSlice {
  return state.byAgent[agentId] ?? EMPTY_SLICE;
}

export const useSchedulesStore = create<SchedulesState>((set, get) => ({
  byAgent: {},

  async ensureLoaded(agentId) {
    const s = sliceFor(get(), agentId);
    if (s.loaded) return s.data;
    const pending = inflight.get(agentId);
    if (pending) return pending;
    return get().refresh(agentId);
  },

  async refresh(agentId) {
    const myGen = generation;
    set((state) => ({
      byAgent: {
        ...state.byAgent,
        [agentId]: { ...sliceFor(state, agentId), loading: true, error: null },
      },
    }));
    const run = async (): Promise<ApiSchedule[]> => {
      try {
        const { schedules } = await schedulesApi.list(agentId);
        if (myGen === generation) {
          set((state) => ({
            byAgent: {
              ...state.byAgent,
              [agentId]: { data: schedules, loaded: true, loading: false, error: null },
            },
          }));
        }
        return schedules;
      } catch (e) {
        if (myGen === generation) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          set((state) => ({
            byAgent: {
              ...state.byAgent,
              [agentId]: { ...sliceFor(state, agentId), loading: false, error: msg },
            },
          }));
        }
        throw e;
      } finally {
        if (inflight.get(agentId) === p) inflight.delete(agentId);
      }
    };
    const p = run();
    inflight.set(agentId, p);
    return p;
  },

  upsert(schedule) {
    set((state) => {
      const slice = sliceFor(state, schedule.agent_id);
      const idx = slice.data.findIndex((s) => s.schedule_id === schedule.schedule_id);
      const data = [...slice.data];
      if (idx >= 0) data[idx] = schedule;
      else data.push(schedule);
      return { byAgent: { ...state.byAgent, [schedule.agent_id]: { ...slice, data } } };
    });
  },

  removeById(scheduleId) {
    set((state) => {
      const byAgent: Record<string, AgentSchedulesSlice> = {};
      for (const [agentId, slice] of Object.entries(state.byAgent)) {
        byAgent[agentId] = slice.data.some((s) => s.schedule_id === scheduleId)
          ? { ...slice, data: slice.data.filter((s) => s.schedule_id !== scheduleId) }
          : slice;
      }
      return { byAgent };
    });
  },

  reset() {
    generation++;
    inflight.clear();
    set({ byAgent: {} });
  },
}));

registerStore({ reset: () => useSchedulesStore.getState().reset() });

/** Selector helper: the slice for one agent (stable `EMPTY_SLICE` when unknown). */
export function selectAgentSchedules(agentId: string) {
  return (state: SchedulesState): AgentSchedulesSlice => sliceFor(state, agentId);
}

export const schedulesActions = {
  async create(body: CreateScheduleParams): Promise<ApiSchedule> {
    const s = await schedulesApi.create(body);
    useSchedulesStore.getState().upsert(s);
    return s;
  },
  async update(schedule_id: string, body: UpdateScheduleParams): Promise<ApiSchedule> {
    const s = await schedulesApi.update(schedule_id, body);
    useSchedulesStore.getState().upsert(s);
    return s;
  },
  async remove(schedule_id: string) {
    const res = await schedulesApi.delete(schedule_id);
    useSchedulesStore.getState().removeById(schedule_id);
    return res;
  },
  async setEnabled(schedule_id: string, enabled: boolean): Promise<ApiSchedule> {
    return schedulesActions.update(schedule_id, { enabled });
  },
  /**
   * Starts the always-async run job (202). Returns the job row; callers poll
   * it with `useJobPoll` and upsert `job.result.schedule` on completion.
   */
  async run(schedule_id: string): Promise<ApiJobAccepted> {
    return schedulesApi.run(schedule_id);
  },
};
