"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, LayoutGrid, Plus, Settings2 } from "lucide-react";
import { useOrgStore } from "@/lib/stores/org-store";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/blocks/copy-button";
import { CreateOrganizationDialog } from "@/components/blocks/create-organization-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher() {
  const router = useRouter();
  const organizations = useOrgStore((s) => s.organizations);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const [createOpen, setCreateOpen] = useState(false);
  const active = organizations.find((o) => o.id === activeOrgId);
  if (!active) return null;
  return (
    <div className="flex min-w-0 items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-2">
              <span className="font-medium">{active.name}</span>
              <ChevronsUpDown className="size-4 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-64">
          {organizations.map((o) => (
            <DropdownMenuItem
              key={o.id}
              onClick={() => {
                if (o.id === activeOrgId) return;
                setActiveOrg(o.id);
                router.push("/app/agents");
              }}
              className="justify-between"
            >
              <span className="truncate">{o.name}</span>
              {o.id === activeOrgId && <Check className="size-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/app/organization")}>
            <Settings2 className="mr-2 size-4" />
            Organization settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/app")}>
            <LayoutGrid className="mr-2 size-4" />
            All organizations
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New organization…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div
        className="text-muted-foreground hidden items-center gap-0.5 text-xs sm:flex"
        title={active.id}
      >
        <span className="uppercase tracking-wide">Org ID</span>
        <CopyButton
          value={active.id}
          label="Copy organization ID"
          stopRowPropagation={false}
        />
      </div>
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
