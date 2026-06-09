import { api } from "./client";
import type { DeployResponse, Manifest } from "@/types/api";

export const deployApi = {
  plan: (stage: string, manifest: Manifest, org_id?: string) =>
    api.post<DeployResponse>("/deploy/plan", { stage, manifest, org_id }),
  deploy: (stage: string, manifest: Manifest, org_id?: string) =>
    api.post<DeployResponse>("/deploy", { stage, manifest, org_id }),
};
