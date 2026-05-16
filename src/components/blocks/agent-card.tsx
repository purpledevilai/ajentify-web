"use client";

import Link from "next/link";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useModelsStore } from "@/lib/stores/models-store";
import type { ApiAgent } from "@/types/api";

export function AgentCard({ agent }: { agent: ApiAgent }) {
  const model = useModelsStore((s) =>
    s.data.find((m) => m.model === agent.model_id)
  );
  const toolCount = agent.tools?.length ?? 0;
  return (
    <Link
      href={`/app/agents/${agent.agent_id}`}
      className="bg-card border-border hover:border-primary/40 group block rounded-lg border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-muted text-primary rounded-md p-2">
            <Bot className="size-4" />
          </div>
          <div>
            <div className="font-medium">
              {agent.agent_name || "Untitled agent"}
            </div>
            <div className="text-muted-foreground line-clamp-1 text-xs">
              {agent.agent_description || "No description"}
            </div>
          </div>
        </div>
        {agent.is_public && <Badge variant="secondary">Public</Badge>}
      </div>
      <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
        <span>
          {toolCount} tool{toolCount === 1 ? "" : "s"}
        </span>
        {model && (
          <>
            <span>•</span>
            <span>{model.model}</span>
          </>
        )}
      </div>
    </Link>
  );
}
