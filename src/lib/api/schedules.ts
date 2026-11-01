import { api } from "./client";
import type {
  ApiJobAccepted,
  ApiSchedule,
  CreateScheduleParams,
  GetSchedulesResponse,
  SuccessResponse,
  UpdateScheduleParams,
} from "@/types/api";

export const schedulesApi = {
  list: (agent_id: string) =>
    api.get<GetSchedulesResponse>("/schedules", { query: { agent_id } }),
  get: (schedule_id: string) =>
    api.get<ApiSchedule>(`/schedule/${encodeURIComponent(schedule_id)}`),
  create: (body: CreateScheduleParams) => api.post<ApiSchedule>("/schedule", body),
  // Update is POST (not PUT), mirroring /mcp-connection/{id}.
  update: (schedule_id: string, body: UpdateScheduleParams) =>
    api.post<ApiSchedule>(`/schedule/${encodeURIComponent(schedule_id)}`, body),
  delete: (schedule_id: string) =>
    api.delete<SuccessResponse>(`/schedule/${encodeURIComponent(schedule_id)}`),
  // Always-async: responds 202 with the job row (`job_id`, `poll_url`). Poll
  // `GET /job/{job_id}` via `useJobPoll`; `job.result` is `RunScheduleResult`.
  run: (schedule_id: string) =>
    api.post<ApiJobAccepted>(`/schedule/${encodeURIComponent(schedule_id)}/run`),
};
