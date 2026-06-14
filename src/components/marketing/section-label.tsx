/**
 * Monospace "figure" label used as the eyebrow on every marketing section —
 * `▪ FIG.03 / FRONTEND SDK`. Part of the technical-drawing aesthetic.
 */
export function SectionLabel({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fig-label mb-4 flex items-center gap-2">
      <span className="bg-primary inline-block size-2" />
      <span className="text-muted-foreground">FIG.{index}</span>
      <span className="text-border">/</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}
