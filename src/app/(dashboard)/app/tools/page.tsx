"use client";

import { useEffect } from "react";
import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/blocks/page-header";
import { EmptyState } from "@/components/blocks/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToolsStore } from "@/lib/stores/tools-store";
import { useOrgStore } from "@/lib/stores/org-store";

export default function ToolsPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);
  const data = useToolsStore((s) => s.data);
  const loaded = useToolsStore((s) => s.loaded);
  const loading = useToolsStore((s) => s.loading);
  const error = useToolsStore((s) => s.error);
  const ensureLoaded = useToolsStore((s) => s.ensureLoaded);

  useEffect(() => {
    if (orgId) ensureLoaded();
  }, [orgId, ensureLoaded]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tools"
        subtitle="Tools that agents can call. Creation via API or SDK — full UI coming soon."
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      {loading && !loaded ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : data.length === 0 && loaded ? (
        <EmptyState
          icon={Wrench}
          title="No tools yet"
          description="Create tools via the Ajentify API or SDK to make them available to your agents."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.map((t) => (
            <div
              key={t.tool_id}
              className="bg-card border-border rounded-lg border p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium">{t.name}</div>
                <div className="flex gap-1">
                  {t.is_client_side_tool && (
                    <Badge variant="secondary">Client</Badge>
                  )}
                  {t.is_async && <Badge variant="secondary">Async</Badge>}
                </div>
              </div>
              {t.description && (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {t.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
