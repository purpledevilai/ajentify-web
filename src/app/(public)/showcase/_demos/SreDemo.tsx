"use client";

import { useRef, useState } from "react";
import { Play, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Terminal, type TermLine } from "../_components/Terminal";

type Field = { name: string; type: string };
const TYPES = ["string", "number", "enum", "boolean"];
const VALUES: Record<string, string> = {
  name: '"Dana Lee"',
  company: '"Globex"',
  intent: '"demo_request"',
  urgency: '"high"',
  budget: "48000",
};

export function SreDemo() {
  const [fields, setFields] = useState<Field[]>([
    { name: "name", type: "string" },
    { name: "company", type: "string" },
    { name: "intent", type: "enum" },
  ]);
  const [email, setEmail] = useState(
    "Hi, this is Dana from Globex. We'd love a demo asap — evaluating this week."
  );
  const [lines, setLines] = useState<TermLine[]>([
    { text: "# edit the schema, then run →", tone: "muted" },
  ]);

  const stageRef = useRef<HTMLDivElement>(null);

  function run() {
    const out = fields.filter((f) => f.name.trim());
    setLines([
      { text: `curl -X POST https://api.ajentify.com/run-sre/extract_lead \\`, tone: "cmd" },
      { text: `  -H "Authorization: $KEY" \\`, tone: "plain" },
      { text: `  -d '{ "EMAIL_BODY": "${email.slice(0, 30)}…" }'`, tone: "plain" },
      { text: "", tone: "plain" },
      { text: "{", tone: "ok" },
      ...out.map((f, i) => ({
        text: `  "${f.name}": ${VALUES[f.name] ?? '"…"'}${i < out.length - 1 ? "," : ""}`,
        tone: "ok" as const,
      })),
      { text: "}", tone: "ok" },
    ]);
  }

  return (
    <div ref={stageRef} className="relative h-full w-full">
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        title="sre · extract_lead"
        className="absolute left-0 top-0 z-10 h-[84%] w-[84%]"
      >
        <div className="flex min-h-0 flex-1">
          {/* Output schema editor (sidebar) */}
          <div className="border-border/50 w-[42%] max-w-[14rem] shrink-0 space-y-2 overflow-y-auto border-r p-3">
            <div className="text-muted-foreground text-[0.58rem] font-medium uppercase tracking-wider">
              output_schema
            </div>
            {fields.map((f, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  value={f.name}
                  onChange={(e) =>
                    setFields((fs) =>
                      fs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x))
                    )
                  }
                  className="border-border/60 bg-card min-w-0 flex-1 rounded-md border px-1.5 py-1 font-mono text-[0.68rem] outline-none"
                />
                <select
                  value={f.type}
                  onChange={(e) =>
                    setFields((fs) =>
                      fs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x))
                    )
                  }
                  className="border-border/60 bg-card rounded-md border px-1 py-1 font-mono text-[0.62rem] outline-none"
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFields((fs) => [...fs, { name: "field", type: "string" }])
              }
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[0.68rem]"
            >
              <Plus className="size-3" /> add field
            </button>
          </div>

          {/* Prompt + email + run */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
            <div>
              <div className="text-muted-foreground mb-1 text-[0.58rem] font-medium uppercase tracking-wider">
                prompt_template
              </div>
              <div className="text-foreground/80 bg-muted/40 rounded-md px-2 py-1.5 font-mono text-[0.68rem]">
                Extract the lead from this email: EMAIL_BODY
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="text-muted-foreground mb-1 text-[0.58rem] font-medium uppercase tracking-wider">
                EMAIL_BODY (prompt arg)
              </div>
              <textarea
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-border/60 bg-card min-h-0 flex-1 resize-none rounded-md border p-2 text-[0.72rem] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={run}
              className={cn(
                "bg-gradient-brand inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              )}
            >
              <Play className="size-3 fill-white" />
              Run SRE
            </button>
          </div>
        </div>
      </WindowFrame>

      {/* Terminal output */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        title="terminal"
        className="absolute bottom-0 right-0 z-20 h-[52%] w-[58%]"
      >
        <Terminal lines={lines} className="h-full" />
      </WindowFrame>
    </div>
  );
}
