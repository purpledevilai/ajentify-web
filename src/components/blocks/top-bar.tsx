"use client";

import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/primitives/theme-toggle";

export function TopBar() {
  return (
    <header className="border-border bg-background flex h-14 items-center justify-between border-b px-6">
      <OrgSwitcher />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
