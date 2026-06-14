import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border/80 border-t">
      <div className="text-muted-foreground fig-label container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
        <span>© {new Date().getFullYear()} AJENTIFY, INC.</span>
        <nav className="flex items-center gap-5">
          <Link href="/docs" className="hover:text-primary transition-colors">
            Documentation
          </Link>
          <Link href="/login" className="hover:text-primary transition-colors">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
