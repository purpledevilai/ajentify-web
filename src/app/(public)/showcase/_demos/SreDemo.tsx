"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Terminal, type TermLine } from "../_components/Terminal";

const FIELDS = [
  { name: "name", value: '"Dana Lee"' },
  { name: "company", value: '"Globex"' },
  { name: "intent", value: '"demo_request"' },
  { name: "urgency", value: '"high"' },
];

const SAMPLE_EMAIL =
  "Hi, this is Dana from Globex. We'd love a demo asap — we're evaluating this week.";

export function SreDemo() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    name: true,
    company: true,
    intent: true,
    urgency: false,
  });
  const [email, setEmail] = useState(SAMPLE_EMAIL);
  const [lines, setLines] = useState<TermLine[]>([
    { text: "# configure the schema, then run →", tone: "muted" },
  ]);

  function run() {
    const out = FIELDS.filter((f) => enabled[f.name]);
    const body = `{ "EMAIL_BODY": "${email.slice(0, 42)}…" }`;
    const next: TermLine[] = [
      {
        text: `curl -X POST https://api.ajentify.com/run-sre/extract_lead \\`,
        tone: "cmd",
      },
      { text: `  -H "Authorization: $KEY" -d '${body}'`, tone: "plain" },
      { text: "", tone: "plain" },
      { text: "{", tone: "ok" },
      ...out.map((f, i) => ({
        text: `  "${f.name}": ${f.value}${i < out.length - 1 ? "," : ""}`,
        tone: "ok" as const,
      })),
      { text: "}", tone: "ok" },
    ];
    setLines(next);
  }

  return (
    <WindowFrame title="sre · extract_lead">
      <div className="border-border/50 space-y-2.5 border-b p-3">
        <div>
          <div className="text-muted-foreground mb-1 font-mono text-[0.6rem] uppercase tracking-wider">
            prompt_template
          </div>
          <div className="text-foreground/80 bg-muted/40 rounded-md px-2 py-1.5 font-mono text-[0.7rem]">
            Extract the lead from this email: EMAIL_BODY
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1.5 font-mono text-[0.6rem] uppercase tracking-wider">
            output_schema — toggle fields
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FIELDS.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() =>
                  setEnabled((e) => ({ ...e, [f.name]: !e[f.name] }))
                }
                className={cn(
                  "rounded-md border px-2 py-1 font-mono text-[0.68rem] transition-colors",
                  enabled[f.name]
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 text-muted-foreground"
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-border/60 bg-card min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs outline-none"
          />
          <button
            type="button"
            onClick={run}
            className="bg-gradient-brand inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-white"
          >
            <Play className="size-3 fill-white" />
            Run
          </button>
        </div>
      </div>
      <Terminal lines={lines} className="flex-1" />
    </WindowFrame>
  );
}
