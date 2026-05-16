"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useOrgStore } from "@/lib/stores/org-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function OrgSwitcher() {
  const organizations = useOrgStore((s) => s.organizations);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const setActiveOrg = useOrgStore((s) => s.setActiveOrg);
  const active = organizations.find((o) => o.id === activeOrgId);
  if (!active) return null;
  return (
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
            onClick={() => setActiveOrg(o.id)}
            className="justify-between"
          >
            <span>{o.name}</span>
            {o.id === activeOrgId && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
