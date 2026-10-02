import { api } from "./client";
import type { ApiJob } from "@/types/api";

export const jobsApi = {
  // Owner-scoped: 404 for jobs started by anyone else (or anonymous jobs).
  get: (job_id: string) => api.get<ApiJob>(`/job/${encodeURIComponent(job_id)}`),
};
