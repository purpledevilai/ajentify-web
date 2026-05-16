import Link from "next/link";
import { Logo } from "@/components/primitives/logo";
import { ThemeToggle } from "@/components/primitives/theme-toggle";
import { Button } from "@/components/primitives/button";

export function TopNav() {
  return (
    <header className="border-border border-b">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="inline-flex items-center">
          <Logo withWordmark />
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/docs"
            className="text-muted-foreground hover:text-foreground hidden px-3 py-2 text-sm md:inline-block"
          >
            Docs
          </Link>
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
