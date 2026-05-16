"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarNav } from "@/components/blocks/sidebar-nav";
import { TopBar } from "@/components/blocks/top-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

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
        <aside className="bg-sidebar border-sidebar-border w-60 space-y-3 border-r p-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </aside>
        <main className="flex-1 space-y-4 p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
        </main>
      </div>
    );
  }
  if (!user) return null; // mid-redirect to /login

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
