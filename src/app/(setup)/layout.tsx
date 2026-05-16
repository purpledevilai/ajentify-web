"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/primitives/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { bootstrapped, user } = useRequireAuth();

  // Gate: if the user already has orgs, they don't belong in setup.
  useEffect(() => {
    if (
      bootstrapped &&
      user &&
      (user.organizations?.length ?? 0) > 0 &&
      pathname === "/create-organization"
    ) {
      router.replace("/app");
    }
  }, [bootstrapped, user, pathname, router]);

  if (!bootstrapped) {
    return (
      <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="mb-10">
          <Logo withWordmark size={36} />
        </div>
        <div className="bg-card border-border w-full max-w-md space-y-4 rounded-lg border p-8 shadow-sm">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }
  if (!user) return null; // mid-redirect to /login

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Logo withWordmark size={36} />
      </div>
      <div className="bg-card border-border w-full max-w-md rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
