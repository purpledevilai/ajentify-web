import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "gradient" | "mono";
  size?: number;
  withWordmark?: boolean;
};

// Intrinsic dimensions of the source PNGs. Next/Image uses these to reserve
// layout space; we then constrain the rendered height in CSS and let width
// auto-compute so the natural aspect ratio is preserved.
const INTRINSIC = {
  gradient: { width: 1330, height: 1183 },
  mono: { width: 1343, height: 1171 },
} as const;

export function Logo({
  className,
  variant = "gradient",
  size = 40,
  withWordmark = false,
}: LogoProps) {
  const src = variant === "gradient" ? "/logo-gradient.png" : "/logo-mono.png";
  const { width, height } = INTRINSIC[variant];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src={src}
        alt="Ajentify"
        width={width}
        height={height}
        priority
        style={{ height: size, width: "auto" }}
      />
      {withWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Ajentify
        </span>
      )}
    </span>
  );
}
