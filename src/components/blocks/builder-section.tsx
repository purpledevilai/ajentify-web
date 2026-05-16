import { cn } from "@/lib/utils";

interface BuilderSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function BuilderSection({
  title,
  description,
  children,
  className,
}: BuilderSectionProps) {
  return (
    <section
      className={cn("bg-card border-border rounded-lg border p-6", className)}
    >
      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
