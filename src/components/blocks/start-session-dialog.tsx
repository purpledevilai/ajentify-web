"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/primitives/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/primitives/code-editor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface StartSessionConfig {
  promptArgs: Record<string, string>;
  userDefined: Record<string, unknown>;
}

export interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the target agent uses a realtime model (affects labels/copy). */
  isRealtime: boolean;
  /** From the saved agent: whether it expects prompt args + their names. */
  usesPromptArgs: boolean;
  promptArgNames: string[];
  /** Fired when the user confirms. Parent then creates the context + opens session. */
  onStart: (config: StartSessionConfig) => void;
}

/** Validate that a string parses to a plain JSON object (not array/primitive). */
function parseUserDefined(
  raw: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: true, value: {} };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return { ok: false, error: "Must be a JSON object, e.g. { \"key\": \"value\" }." };
  }
  return { ok: true, value: parsed as Record<string, unknown> };
}

export function StartSessionDialog({
  open,
  onOpenChange,
  isRealtime,
  usesPromptArgs,
  promptArgNames,
  onStart,
}: StartSessionDialogProps) {
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [userDefinedRaw, setUserDefinedRaw] = useState("{}");

  const showPromptArgs = usesPromptArgs && promptArgNames.length > 0;

  // Reset local state whenever the dialog opens so reopening is clean.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArgValues(Object.fromEntries(promptArgNames.map((name) => [name, ""])));
    setUserDefinedRaw("{}");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const userDefinedResult = useMemo(
    () => parseUserDefined(userDefinedRaw),
    [userDefinedRaw]
  );

  const title = isRealtime ? "Start voice call" : "Start chat";

  function handleStart() {
    if (!userDefinedResult.ok) return;
    onStart({
      promptArgs: showPromptArgs ? argValues : {},
      userDefined: userDefinedResult.value,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Optionally provide prompt arguments and user-defined variables for
            this session.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {showPromptArgs && (
            <div className="space-y-3">
              <Label>Prompt arguments</Label>
              {promptArgNames.map((name) => (
                <div key={name} className="space-y-1.5">
                  <Label htmlFor={`arg-${name}`} className="font-mono text-xs">
                    {name}
                  </Label>
                  <Textarea
                    id={`arg-${name}`}
                    value={argValues[name] ?? ""}
                    onChange={(e) =>
                      setArgValues((prev) => ({
                        ...prev,
                        [name]: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder={`Value for ${name}…`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>User-defined variables (JSON)</Label>
            <CodeEditor
              value={userDefinedRaw}
              onChange={setUserDefinedRaw}
              language="json"
              minHeight="6rem"
              maxHeight="14rem"
            />
            {!userDefinedResult.ok && (
              <p className="text-destructive text-sm">
                {userDefinedResult.error}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose
            render={
              <Button variant="ghost" size="md">
                Cancel
              </Button>
            }
          />
          <Button
            variant="gradient"
            size="md"
            disabled={!userDefinedResult.ok}
            onClick={handleStart}
          >
            {title}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
