"use client";

import type { RefObject } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const descriptionClassName = cn(
  "text-muted-foreground field-sizing-content w-full resize-none rounded-md bg-transparent px-2 py-1 text-sm outline-none",
  "placeholder:text-muted-foreground/60",
  "hover:bg-muted/60 focus:bg-muted/60",
  "focus-visible:ring-ring/40 focus-visible:ring-2",
  "-ml-2 transition-colors"
);

export interface BuilderPageHeaderProps {
  onBack: () => void;
  name: string;
  onNameChange: (value: string) => void;
  namePlaceholder: string;
  nameAriaLabel: string;
  nameInputRef?: RefObject<HTMLInputElement | null>;
  nameClassName?: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  descriptionAriaLabel: string;
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void | Promise<void>;
}

export function BuilderPageHeader({
  onBack,
  name,
  onNameChange,
  namePlaceholder,
  nameAriaLabel,
  nameInputRef,
  nameClassName,
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  descriptionAriaLabel,
  dirty,
  saving,
  onDiscard,
  onSave,
}: BuilderPageHeaderProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: back + name + actions. On md+, description sits under name in the left group. */}
      <div className="flex items-start justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mt-1 shrink-0"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={namePlaceholder}
              aria-label={nameAriaLabel}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className={cn(
                "w-full rounded-md bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none",
                "placeholder:text-muted-foreground/60",
                "hover:bg-muted/60 focus:bg-muted/60",
                "focus-visible:ring-ring/40 focus-visible:ring-2",
                "-ml-2 transition-colors",
                nameClassName
              )}
            />
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={descriptionPlaceholder}
              aria-label={descriptionAriaLabel}
              rows={1}
              className={cn(descriptionClassName, "mt-0.5 hidden md:block")}
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:gap-2">
          {dirty && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="ghost"
            onClick={onDiscard}
            disabled={!dirty || saving}
            size="sm"
            className="sm:h-9 sm:px-4"
          >
            Discard
          </Button>
          <Button
            variant="gradient"
            onClick={onSave}
            disabled={!dirty || saving}
            size="sm"
            className="sm:h-9 sm:px-4"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Row 2 (mobile): description spans full width, indented to align with name */}
      <div className="pl-10 md:hidden">
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          aria-label={descriptionAriaLabel}
          rows={1}
          className={descriptionClassName}
        />
      </div>
    </div>
  );
}
