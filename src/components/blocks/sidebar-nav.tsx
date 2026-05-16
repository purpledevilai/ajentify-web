"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Wrench, Home, FileText } from "lucide-react";
import { Logo } from "@/components/primitives/logo";
import { cn } from "@/lib/utils";

const items: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/app", label: "Overview", icon: Home },
  { href: "/app/agents", label: "Agents", icon: Bot },
  { href: "/app/tools", label: "Tools", icon: Wrench },
  { href: "/docs", label: "Docs", icon: FileText },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <aside className="bg-sidebar border-sidebar-border flex w-60 flex-col gap-2 border-r p-4">
      <Link href="/app" className="mb-4 inline-flex items-center gap-2">
        <Logo withWordmark />
      </Link>
      <nav className="flex flex-col gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/app" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
