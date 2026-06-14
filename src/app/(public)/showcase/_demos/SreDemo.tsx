"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WindowFrame } from "../_components/WindowFrame";
import { Terminal, type TermLine } from "../_components/Terminal";
import { JsonField } from "../_components/JsonField";
import { ModelPicker, DEFAULT_MODEL } from "../_components/ModelPicker";
import { DemoStage } from "../_components/DemoStage";
import { Switch } from "@/components/ui/switch";

type Field = {
  name: string;
  type: string;
  required: boolean;
  description: string;
};

const TYPES = ["string", "number", "enum", "boolean"];
const VALUES: Record<string, string> = {
  name: '"Dana Lee"',
  company: '"Globex"',
  intent: '"demo_request"',
  urgency: '"high"',
  budget: "48000",
};

const DEFAULT_PROMPT = `You are a lead-extraction assistant. Read the inbound email and return the fields defined in the output schema below.

Use only what is present in EMAIL_BODY — if a value is missing, return null. Normalise the company name and infer intent from what they ask for.

EMAIL_BODY:
{{EMAIL_BODY}}`;

function cap(lines: TermLine[]) {
  return lines.slice(-30);
}

export function SreDemo() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isPublic, setIsPublic] = useState(false);
  const [fields, setFields] = useState<Field[]>([
    { name: "name", type: "string", required: true, description: "Full name of the lead" },
    { name: "company", type: "string", required: true, description: "Company they represent" },
    { name: "intent", type: "enum", required: true, description: "What the lead is asking for" },
  ]);
  const [emailBody, setEmailBody] = useState<Record<string, unknown>>({
    EMAIL_BODY:
      "Hi, this is Dana from Globex. We'd love a demo asap — evaluating this week.",
  });
  const [lines, setLines] = useState<TermLine[]>([
    { text: "# edit the output_schema + email.json, then run →", tone: "muted" },
  ]);
  const [busy, setBusy] = useState(false);
  const [front, setFront] = useState<"a" | "b">("b");
  const [tab, setTab] = useState<"terminal" | "email">("terminal");
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const command = isPublic
    ? `curl -sX POST .../run-sre/extract_lead -d @email.json`
    : `curl -sX POST .../run-sre/extract_lead -H "Authorization: Bearer $KEY" -d @email.json`;

  function setField(i: number, patch: Partial<Field>) {
    setFields((fs) => fs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }

  function run() {
    if (busy) return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const out = fields.filter((f) => f.name.trim());
    setBusy(true);
    setLines((prev) => cap([...prev, { text: command, tone: "cmd" }]));
    const id = window.setTimeout(() => {
      setLines((prev) =>
        cap([
          ...prev,
          { text: "{", tone: "ok" },
          ...out.map((f, i) => ({
            text: `  "${f.name}": ${VALUES[f.name] ?? '"…"'}${i < out.length - 1 ? "," : ""}`,
            tone: "ok" as const,
          })),
          { text: "}", tone: "ok" },
        ])
      );
      setBusy(false);
    }, 700);
    timers.current.push(id);
  }

  return (
    <DemoStage image="/showcase/sre.jpg" stageRef={stageRef}>
      {/* SRE config */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("a")}
        title="sre · extract_lead"
        z={front === "a" ? 30 : 20}
        className="absolute left-[3%] top-[4%] h-[82%] w-[80%]"
      >
        <div className="flex min-h-0 flex-1">
          {/* Left: model + visibility */}
          <div className="border-border/50 w-[32%] max-w-[11rem] shrink-0 space-y-3.5 overflow-y-auto border-r p-3">
            <div>
              <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                Model
              </div>
              <ModelPicker value={model} onChange={setModel} />
            </div>
            <div>
              <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                Visibility
              </div>
              <label className="border-border/60 bg-card/40 flex cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                <span className="text-foreground/85 text-[0.72rem] font-medium">
                  Public
                </span>
                <Switch
                  size="sm"
                  checked={isPublic}
                  onCheckedChange={(v) => setIsPublic(v)}
                />
              </label>
              <p className="text-muted-foreground mt-1 text-[0.6rem] leading-snug">
                {isPublic
                  ? "Callable by anyone — no API key."
                  : "Requires an API key to run."}
              </p>
            </div>
          </div>

          {/* Right: prompt_template + output_schema field cards */}
          <div className="min-w-0 flex-1 space-y-3 overflow-y-auto p-3">
            <div>
              <div className="text-muted-foreground mb-1.5 text-[0.6rem] font-medium uppercase tracking-wider">
                prompt_template
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                spellCheck={false}
                className="border-border/60 bg-background h-[7.5rem] w-full resize-none rounded-md border p-2.5 font-mono text-[0.7rem] leading-relaxed outline-none"
              />
            </div>
            <div className="text-muted-foreground text-[0.6rem] font-medium uppercase tracking-wider">
              output_schema
            </div>
            {fields.map((f, i) => (
              <div
                key={i}
                className="border-border/60 bg-card/60 space-y-2 rounded-lg border p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <input
                    value={f.name}
                    onChange={(e) => setField(i, { name: e.target.value })}
                    className="border-border/60 bg-background min-w-0 flex-1 rounded-md border px-2 py-1 font-mono text-[0.72rem] outline-none"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => setField(i, { type: e.target.value })}
                    className="border-border/60 bg-background rounded-md border px-1.5 py-1 font-mono text-[0.68rem] outline-none"
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
                    <X className="size-3.5" />
                  </button>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 text-[0.68rem]">
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => setField(i, { required: e.target.checked })}
                    className="accent-primary size-3.5"
                  />
                  <span className="text-foreground/80">Required</span>
                </label>
                <input
                  value={f.description}
                  onChange={(e) => setField(i, { description: e.target.value })}
                  placeholder="Describe this field…"
                  className="border-border/50 bg-background/60 placeholder:text-muted-foreground/60 w-full rounded-md border px-2 py-1 text-[0.7rem] outline-none"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFields((fs) => [
                  ...fs,
                  { name: "field", type: "string", required: false, description: "" },
                ])
              }
              className="border-primary/40 text-primary hover:bg-primary/5 inline-flex w-full items-center justify-center gap-1 rounded-md border py-1.5 text-[0.72rem] font-semibold transition-colors"
            >
              <Plus className="size-3.5" /> Add field
            </button>
          </div>
        </div>
      </WindowFrame>

      {/* Run window: email.json + terminal tabs */}
      <WindowFrame
        draggable
        constraintsRef={stageRef}
        onFocus={() => setFront("b")}
        title="extract_lead · run"
        z={front === "b" ? 30 : 20}
        className="absolute bottom-[3%] right-[3%] h-[58%] w-[58%]"
      >
        {/* Tab bar */}
        <div className="border-border/50 bg-muted/40 flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
          {(
            [
              ["terminal", "terminal"],
              ["email", "email.json"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "rounded-md px-2.5 py-1 font-mono text-[0.68rem] transition-colors",
                tab === key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "terminal" ? (
          <Terminal
            lines={lines}
            command={command}
            onRun={run}
            running={busy}
            className="min-h-0 flex-1"
          />
        ) : (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            <p className="text-muted-foreground text-[0.7rem]">
              The prompt arg{" "}
              <code className="text-foreground font-mono">EMAIL_BODY</code> — sent as{" "}
              <code className="text-foreground font-mono">-d @email.json</code>. Edit it,
              then run.
            </p>
            <JsonField
              value={emailBody}
              onChange={setEmailBody}
              minHeight="9rem"
              maxHeight="14rem"
            />
          </div>
        )}
      </WindowFrame>
    </DemoStage>
  );
}
