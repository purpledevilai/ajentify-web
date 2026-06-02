"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarNav } from "@/components/blocks/sidebar-nav";
import { TopBar } from "@/components/blocks/top-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { AjChatProvider, AjChatPanel } from "@/components/chat/aj-chat-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { bootstrapped, user } = useRequireAuth();

  // Gate: dashboard requires at least one organization.
  useEffect(() => {
    if (bootstrapped && user) {
      const hasOrgs = (user.organizations?.length ?? 0) > 0;
      if (!hasOrgs && pathname.startsWith("/app")) {
        router.replace("/create-organization");
      }
    }
  }, [bootstrapped, user, pathname, router]);

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen">
        <aside className="bg-sidebar border-sidebar-border hidden w-60 space-y-3 border-r p-4 md:block">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </aside>
        <main className="flex-1 space-y-4 p-4 md:p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }
  if (!user) return null; // mid-redirect to /login

  return (
    // Lock the dashboard to exact viewport height (h-screen + overflow-hidden
    // on the column) so the inline ChatPanel — which stretches to fill its
    // parent — always fits between the TopBar and the bottom of the viewport.
    // The dashboard's own scroll is delegated to <main> instead of the body.
    // The `AjentifyProvider` wraps the entire dashboard column so the
    // TopBar's `<AjChatToggle />` and the docked `<AjChatPanel />` share
    // the same chat state via `useChatPanel()`.
    <AjChatProvider>
      <div className="flex h-screen overflow-hidden">
        <SidebarNav className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <AjChatPanel>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </AjChatPanel>
        </div>
      </div>
    </AjChatProvider>
  );
}
