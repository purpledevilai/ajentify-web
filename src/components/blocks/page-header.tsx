import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-3",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
