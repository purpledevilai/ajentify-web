"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { AgentCard } from "@/components/blocks/agent-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgentsStore, agentsActions } from "@/lib/stores/agents-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { getErrorMessage } from "@/lib/api/errors";

export default function AgentsPage() {
  const router = useRouter();
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useAgentsStore((s) => s.data);
  const loaded = useAgentsStore((s) => s.loaded);
  const loading = useAgentsStore((s) => s.loading);
  const error = useAgentsStore((s) => s.error);
  const ensureLoaded = useAgentsStore((s) => s.ensureLoaded);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  async function onCreate() {
    setCreateError(null);
    setCreating(true);
    try {
      const a = await agentsActions.create({
        agent_name: "Untitled agent",
        agent_description: "",
        prompt: "You are a helpful assistant.",
        is_public: false,
      });
      router.push(`/app/agents/${a.agent_id}`);
    } catch (err: unknown) {
      setCreateError(getErrorMessage(err, "Unable to create agent"));
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        subtitle="Design and orchestrate intelligent agents."
        actions={
          <Button variant="gradient" onClick={onCreate} disabled={creating}>
            <Plus className="size-4" />
            {creating ? "Creating…" : "New agent"}
          </Button>
        }
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {createError && <p className="text-destructive text-sm">{createError}</p>}
      {loading && !loaded ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 && loaded ? (
        <EmptyState
          icon={Bot}
          title="No agents yet"
          description="Create your first agent to get started."
          action={
            <Button variant="gradient" onClick={onCreate} disabled={creating}>
              <Plus className="size-4" />
              {creating ? "Creating…" : "New agent"}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <AgentCard key={a.agent_id} agent={a} />
          ))}
        </div>
      )}
    </div>
  );
}
