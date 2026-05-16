import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground container mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row">
        <span>© {new Date().getFullYear()} Ajentify, Inc.</span>
        <nav className="flex items-center gap-4">
          <Link href="/docs" className="hover:text-foreground">
            Documentation
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
