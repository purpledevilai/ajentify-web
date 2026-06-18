import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/primitives/logo";
import { ThemeToggle } from "@/components/primitives/theme-toggle";
import { Button } from "@/components/primitives/button";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
    >
      {children}
    </Link>
  );
}

export function TopNav() {
  return (
    <header className="border-border/60 bg-background/70 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="inline-flex items-center">
            <Logo withWordmark />
          </Link>
          <nav className="hidden items-center gap-0.5 md:flex">
            <NavLink href="/docs">Docs</NavLink>
            <NavLink href="/docs">Quickstart</NavLink>
            <NavLink href="/sign-up">Pricing</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            asChild
            variant="gradient"
            size="sm"
            className="shadow-primary/25 group rounded-full shadow-sm"
          >
            <Link href="/sign-up">
              Get started
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
