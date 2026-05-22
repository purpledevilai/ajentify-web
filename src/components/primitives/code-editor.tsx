"use client";

import * as React from "react";
import CodeMirror, {
  EditorView,
  type ReactCodeMirrorProps,
  type ReactCodeMirrorRef,
} from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export type CodeLanguage =
  | "python"
  | "json"
  | "javascript"
  | "typescript"
  | "markdown"
  | "plain";

const languageExtension = (lang: CodeLanguage) => {
  switch (lang) {
    case "python":
      return [python()];
    case "json":
      return [json()];
    case "javascript":
      return [javascript()];
    case "typescript":
      return [javascript({ typescript: true })];
    case "markdown":
      return [markdown()];
    case "plain":
    default:
      return [];
  }
};

export interface CodeEditorProps
  extends Omit<
    ReactCodeMirrorProps,
    "value" | "onChange" | "extensions" | "theme" | "basicSetup"
  > {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLanguage;
  readOnly?: boolean;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
  /** Override or extend the default basicSetup. */
  basicSetup?: ReactCodeMirrorProps["basicSetup"];
  /** Additional CodeMirror extensions appended after language + wrap. */
  extensions?: ReactCodeMirrorProps["extensions"];
}

const defaultBasicSetup: ReactCodeMirrorProps["basicSetup"] = {
  lineNumbers: true,
  foldGutter: true,
  highlightActiveLine: true,
  highlightActiveLineGutter: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  indentOnInput: true,
  syntaxHighlighting: true,
  searchKeymap: true,
  history: true,
};

export const CodeEditor = React.forwardRef<ReactCodeMirrorRef, CodeEditorProps>(
  (
    {
      value,
      onChange,
      language = "plain",
      readOnly = false,
      minHeight = "8rem",
      maxHeight,
      className,
      basicSetup,
      extensions,
      ...rest
    },
    ref
  ) => {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const allExtensions = React.useMemo(
      () => [
        ...languageExtension(language),
        EditorView.lineWrapping,
        ...(extensions ?? []),
      ],
      [language, extensions]
    );

    const mergedBasicSetup = React.useMemo(() => {
      if (typeof basicSetup === "boolean") return basicSetup;
      return { ...defaultBasicSetup, ...(basicSetup ?? {}) };
    }, [basicSetup]);

    if (!mounted) {
      return (
        <div
          className={cn(
            "rounded-md border border-input bg-muted/30 font-mono text-sm",
            className
          )}
          style={{ minHeight }}
          aria-hidden
        />
      );
    }

    return (
      <div
        className={cn(
          "overflow-hidden rounded-md border border-input bg-background text-sm",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0",
          readOnly && "opacity-90",
          className
        )}
      >
        <CodeMirror
          ref={ref}
          value={value}
          onChange={onChange}
          theme={resolvedTheme === "dark" ? oneDark : "light"}
          extensions={allExtensions}
          basicSetup={mergedBasicSetup}
          readOnly={readOnly}
          editable={!readOnly}
          minHeight={minHeight}
          maxHeight={maxHeight}
          {...rest}
        />
      </div>
    );
  }
);
CodeEditor.displayName = "CodeEditor";
