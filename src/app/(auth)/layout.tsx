import { Logo } from "@/components/primitives/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <Logo variant="mono" withWordmark size={36} />
      </div>
      <div className="bg-card border-border w-full max-w-md rounded-lg border p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
