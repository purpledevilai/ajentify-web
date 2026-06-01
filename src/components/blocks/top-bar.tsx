"use client";

import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { ThemeToggle } from "@/components/primitives/theme-toggle";
import { AjChatToggle } from "@/components/primitives/aj-chat-toggle";

export function TopBar() {
  return (
    <header className="border-border bg-background flex h-14 items-center justify-between gap-2 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileSidebar />
        <OrgSwitcher />
      </div>
      <div className="flex items-center gap-2">
        <AjChatToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
