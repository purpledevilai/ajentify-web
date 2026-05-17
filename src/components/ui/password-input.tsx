"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

// Same shape as <Input>, minus `type` (we control that internally to toggle
// between "password" and "text"). The reveal button is a sibling positioned
// absolutely so the input keeps its own focus ring + autofill styling.
export function PasswordInput({
  className,
  ...props
}: Omit<InputProps, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-9", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Skip in tab order so keyboard users moving through the form aren't
        // forced through a non-essential button.
        tabIndex={-1}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-8 items-center justify-center transition-colors"
      >
        {visible ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
      </button>
    </div>
  );
}
