import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  variant?: "gradient" | "mono";
  size?: number;
  withWordmark?: boolean;
};

export function Logo({
  className,
  variant = "gradient",
  size = 32,
  withWordmark = false,
}: LogoProps) {
  const src = variant === "gradient" ? "/logo-gradient.png" : "/logo-mono.png";
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src={src} alt="Ajentify" width={size} height={size} priority />
      {withWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight">
          Ajentify
        </span>
      )}
    </span>
  );
}
