"use client";

import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/primitives/code-editor";
import { cn } from "@/lib/utils";

/** Editable, syntax-highlighted JSON. Commits the parsed object on valid JSON;
 *  re-syncs when the value changes externally. */
export function JsonField({
  value,
  onChange,
  minHeight = "8rem",
  maxHeight,
  className,
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [valid, setValid] = useState(true);

  useEffect(() => {
    try {
      if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(value)) {
        setText(JSON.stringify(value, null, 2));
        setValid(true);
      }
    } catch {
      /* mid-edit */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <CodeEditor
        value={text}
        language="json"
        minHeight={minHeight}
        maxHeight={maxHeight}
        onChange={(next) => {
          setText(next);
          try {
            onChange(JSON.parse(next));
            setValid(true);
          } catch {
            setValid(false);
          }
        }}
        className={cn(!valid && "ring-destructive ring-2")}
      />
      {!valid && (
        <span className="text-destructive bg-background/80 absolute bottom-1.5 right-1.5 z-10 rounded px-1 font-mono text-[0.6rem]">
          invalid
        </span>
      )}
    </div>
  );
}
