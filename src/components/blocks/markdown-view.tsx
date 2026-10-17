"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";

/* Allow GFM task-list checkboxes (disabled inputs) on top of the default
 * schema; everything else — scripts, event handlers, raw HTML — is stripped. */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "input"],
  attributes: {
    ...defaultSchema.attributes,
    input: ["type", "checked", "disabled"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
  },
};

const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [[rehypeSanitize, sanitizeSchema] as const];

/* Prose styling done with descendant selectors so it tracks the app's
 * tokens without pulling in @tailwindcss/typography. */
const PROSE =
  "text-foreground text-sm leading-relaxed break-words " +
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0 " +
  "[&_h1]:font-display [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight " +
  "[&_h2]:font-display [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight " +
  "[&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold " +
  "[&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-base [&_h4]:font-semibold " +
  "[&_h5]:mt-4 [&_h5]:mb-1 [&_h5]:font-semibold [&_h6]:mt-4 [&_h6]:mb-1 [&_h6]:font-semibold [&_h6]:text-muted-foreground " +
  "[&_p]:my-3 " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:opacity-80 " +
  "[&_strong]:font-semibold [&_em]:italic " +
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li>p]:my-1 " +
  "[&_ul_ul]:my-1 [&_ol_ol]:my-1 [&_ul_ol]:my-1 [&_ol_ul]:my-1 " +
  "[&_li:has(>input[type=checkbox])]:list-none [&_li:has(>input[type=checkbox])]:-ml-5 [&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:align-middle " +
  "[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic " +
  "[&_hr]:border-border [&_hr]:my-6 " +
  "[&_code]:bg-muted [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] " +
  "[&_pre]:bg-muted [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-relaxed " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit " +
  "[&_table]:my-3 [&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-xs " +
  "[&_th]:border-border [&_th]:bg-muted/60 [&_th]:border [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border-border [&_td]:border [&_td]:px-3 [&_td]:py-1.5 [&_td]:align-top " +
  "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md " +
  "[&_del]:line-through [&_del]:text-muted-foreground";

export interface MarkdownViewProps {
  children: string;
  className?: string;
}

/** Sanitised GFM markdown renderer with app-consistent prose styling. */
export function MarkdownView({ children, className }: MarkdownViewProps) {
  return (
    <div className={cn(PROSE, className)}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS as never}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
