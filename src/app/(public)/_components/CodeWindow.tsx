import { cn } from "@/lib/utils";

export function CodeWindow({
  filename,
  className,
  children,
}: {
  filename: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 shadow-2xl",
        className
      )}
    >
      <div className="flex items-center border-b border-white/10 bg-zinc-900 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="flex-1 text-center text-xs text-zinc-400">
          {filename}
        </span>
      </div>
      {children}
    </div>
  );
}
