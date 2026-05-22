import { cn } from "@/lib/utils";

interface BuilderSectionProps {
  title: string;
  description?: string;
  /** Optional content rendered in the top-right of the section header,
   *  e.g. a contextual primary action like "Add tool". */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function BuilderSection({
  title,
  description,
  actions,
  children,
  className,
}: BuilderSectionProps) {
  return (
    <section
      className={cn("bg-card border-border rounded-lg border p-6", className)}
    >
      <div
        className={cn(
          "mb-4",
          actions && "flex items-start justify-between gap-4"
        )}
      >
        <div className={cn(actions && "min-w-0")}>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
