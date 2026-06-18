import { TopNav } from "@/components/marketing/top-nav";
import { Footer } from "@/components/marketing/footer";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="marketing bg-background text-foreground flex min-h-screen flex-col">
      <TopNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
