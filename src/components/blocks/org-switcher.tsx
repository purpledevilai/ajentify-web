"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";
import { useOrgStore } from "@/lib/stores/org-store";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/blocks/copy-button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher() {
  const router = useRouter();
  const organizations = useOrgStore((s) => s.organizations);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
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
        <DropdownMenuContent align="start" className="w-56">
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
              <span>{o.name}</span>
              {o.id === activeOrgId && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
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
    </div>
  );
}
