import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/primitives/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="text-muted-foreground hover:text-foreground absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <div className="mb-10">
        <Logo withWordmark size={48} />
      </div>
      <div className="bg-card border-border w-full max-w-md rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
