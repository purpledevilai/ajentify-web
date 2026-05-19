"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Keep this in sync with `validate_password_strength` in
// AgentLambda/src/Lib/Auth.py. The server is the source of truth — these
// regexes only drive the live UI checklist and submit gating.
export const passwordRules: ReadonlyArray<{
  id: string;
  label: string;
  test: (v: string) => boolean;
}> = [
  { id: "len", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    id: "symbol",
    label: "One symbol",
    test: (v) => /[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]/.test(v),
  },
];

export function isPasswordValid(value: string): boolean {
  return passwordRules.every((r) => r.test(value));
}

export function PasswordRequirements({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <ul
      className={cn("space-y-1 text-xs", className)}
      aria-label="Password requirements"
    >
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5",
              ok ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {ok ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
            <span>{rule.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
