"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SchemaNode, SchemaType } from "./types";
import { ITEMS_SLOT_NAME } from "./types";

const TYPE_OPTIONS: { value: SchemaType; label: string; hint: string }[] = [
  { value: "string", label: "string", hint: "Text" },
  { value: "number", label: "number", hint: "Decimal" },
  { value: "integer", label: "integer", hint: "Whole number" },
  { value: "boolean", label: "boolean", hint: "True / false" },
  { value: "object", label: "object", hint: "Nested fields" },
  { value: "array", label: "array", hint: "List of items" },
];

/** Standard JSON Schema `format` values most useful for tool params. The
 *  agent isn't strictly bound by these, but they hint validation and help
 *  the LLM emit the right shape. */
const STRING_FORMATS = [
  "",
  "date",
  "date-time",
  "time",
  "email",
  "uri",
  "uuid",
  "ipv4",
  "ipv6",
  "hostname",
];

interface FieldDetailsPanelProps {
  node: SchemaNode | null;
  isRoot: boolean;
  isItemsSlot: boolean;
  /** Names used by the node's siblings (excluding the node itself), used
   *  to flag duplicate names. */
  siblingNames: string[];
  onChange: (patch: Partial<SchemaNode>) => void;
}

export function FieldDetailsPanel({
  node,
  isRoot,
  isItemsSlot,
  siblingNames,
  onChange,
}: FieldDetailsPanelProps) {
  if (!node) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
        Select a field on the left to edit its details, or add a new field to
        get started.
      </div>
    );
  }

  const nameLocked = isRoot || isItemsSlot;
  const duplicateName =
    !nameLocked && !!node.name && siblingNames.includes(node.name);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="jse-name">Field name</Label>
        <Input
          id="jse-name"
          value={isItemsSlot ? `<${ITEMS_SLOT_NAME}>` : node.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="propertyName"
          disabled={nameLocked}
          aria-invalid={duplicateName || undefined}
        />
        {duplicateName && (
          <p className="text-destructive text-xs">
            A sibling field already uses this name.
          </p>
        )}
        {isItemsSlot && (
          <p className="text-muted-foreground text-xs">
            Schema applied to every element of the parent array.
          </p>
        )}
        {isRoot && (
          <p className="text-muted-foreground text-xs">
            The root is always an object. Add fields below.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jse-type">Type</Label>
        <Select
          value={node.type}
          onValueChange={(v) => onChange({ type: v as SchemaType })}
          disabled={isRoot}
        >
          <SelectTrigger id="jse-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground text-xs">{t.hint}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jse-desc">Description</Label>
        <Textarea
          id="jse-desc"
          value={node.description ?? ""}
          onChange={(e) =>
            onChange({ description: e.target.value || undefined })
          }
          placeholder="Explain what this field is. Agents read this when deciding how to fill it in."
          rows={3}
        />
      </div>

      {!isRoot && !isItemsSlot && (
        <div className="border-input flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium">Required</div>
            <p className="text-muted-foreground text-xs">
              When off, the agent may omit this field entirely.
            </p>
          </div>
          <Switch
            checked={!!node.required}
            onCheckedChange={(checked) =>
              onChange({ required: checked || undefined })
            }
          />
        </div>
      )}

      <DefaultField node={node} onChange={onChange} />

      {(node.type === "string" ||
        node.type === "number" ||
        node.type === "integer" ||
        node.type === "array" ||
        node.type === "object") && (
        <ValidationFields node={node} onChange={onChange} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Default value editor                                                       */
/* -------------------------------------------------------------------------- */

function DefaultField({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  // Defaults for object / array are uncommon and easy to get wrong without
  // a JSON editor — keep them out of the visual panel for now.
  if (node.type === "object" || node.type === "array") return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor="jse-default">Default value</Label>
      {node.type === "string" && (
        <Input
          id="jse-default"
          value={typeof node.default === "string" ? node.default : ""}
          onChange={(e) =>
            onChange({ default: e.target.value ? e.target.value : undefined })
          }
          placeholder="Leave blank for no default"
        />
      )}
      {(node.type === "number" || node.type === "integer") && (
        <Input
          id="jse-default"
          type="number"
          value={typeof node.default === "number" ? node.default : ""}
          step={node.type === "integer" ? 1 : "any"}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") return onChange({ default: undefined });
            const parsed =
              node.type === "integer" ? parseInt(raw, 10) : parseFloat(raw);
            onChange({ default: Number.isFinite(parsed) ? parsed : undefined });
          }}
          placeholder="Leave blank for no default"
        />
      )}
      {node.type === "boolean" && (
        <div className="flex gap-1.5">
          {[
            { v: undefined, label: "Not set" },
            { v: true, label: "true" },
            { v: false, label: "false" },
          ].map((opt) => {
            const active = node.default === opt.v;
            return (
              <button
                key={String(opt.v)}
                type="button"
                onClick={() => onChange({ default: opt.v })}
                className={cn(
                  "border-input h-8 flex-1 rounded-lg border text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-type validation block                                                  */
/* -------------------------------------------------------------------------- */

function ValidationFields({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  const [open, setOpen] = React.useState(hasAnyConstraint(node));

  if (node.type === "boolean") return null;

  return (
    <div className="border-input rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="hover:bg-muted/40 flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium transition-colors"
      >
        <span>Validation</span>
        <span className="text-muted-foreground text-xs">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div className="border-input space-y-3 border-t px-3 py-3">
          {node.type === "string" && <StringValidation node={node} onChange={onChange} />}
          {(node.type === "number" || node.type === "integer") && (
            <NumberValidation node={node} onChange={onChange} />
          )}
          {node.type === "array" && <ArrayValidation node={node} onChange={onChange} />}
          {node.type === "object" && <ObjectValidation node={node} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

function hasAnyConstraint(node: SchemaNode): boolean {
  if (node.type === "string") {
    return (
      node.minLength !== undefined ||
      node.maxLength !== undefined ||
      !!node.pattern ||
      !!node.format ||
      (!!node.enumValues && node.enumValues.length > 0)
    );
  }
  if (node.type === "number" || node.type === "integer") {
    return (
      node.minimum !== undefined ||
      node.maximum !== undefined ||
      node.multipleOf !== undefined
    );
  }
  if (node.type === "array") {
    return node.minItems !== undefined || node.maxItems !== undefined;
  }
  if (node.type === "object") {
    return node.additionalProperties !== undefined;
  }
  return false;
}

/* ---------- String ------------------------------------------------------- */

function StringValidation({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberCell
          label="Min length"
          value={node.minLength}
          onChange={(v) => onChange({ minLength: v })}
          min={0}
        />
        <NumberCell
          label="Max length"
          value={node.maxLength}
          onChange={(v) => onChange({ maxLength: v })}
          min={0}
        />
      </div>
      <TextCell
        label="Pattern (regex)"
        value={node.pattern}
        onChange={(v) => onChange({ pattern: v })}
        placeholder="^\\d+$"
        mono
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Format</Label>
        <Select
          value={node.format ?? ""}
          onValueChange={(v) =>
            onChange({ format: typeof v === "string" && v ? v : undefined })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="No format" />
          </SelectTrigger>
          <SelectContent>
            {STRING_FORMATS.map((f) => (
              <SelectItem key={f || "_none"} value={f}>
                {f || "No format"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <EnumEditor
        values={node.enumValues}
        onChange={(v) =>
          onChange({ enumValues: v && v.length > 0 ? v : undefined })
        }
      />
    </>
  );
}

function EnumEditor({
  values,
  onChange,
}: {
  values: string[] | undefined;
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");
  const list = values ?? [];

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (list.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...list, trimmed]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(list.filter((v) => v !== value));
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Allowed values (enum)</Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {list.map((v) => (
          <span
            key={v}
            className="bg-muted text-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
          >
            <span className="font-mono">{v}</span>
            <button
              type="button"
              onClick={() => remove(v)}
              aria-label={`Remove ${v}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a value and press enter"
        />
        <button
          type="button"
          onClick={add}
          aria-label="Add enum value"
          className="border-input hover:bg-muted inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {list.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Restrict the value to a fixed set of options.
        </p>
      )}
    </div>
  );
}

/* ---------- Number ------------------------------------------------------- */

function NumberValidation({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  const step = node.type === "integer" ? 1 : "any";
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberCell
        label="Minimum"
        value={node.minimum}
        onChange={(v) => onChange({ minimum: v })}
        step={step}
      />
      <NumberCell
        label="Maximum"
        value={node.maximum}
        onChange={(v) => onChange({ maximum: v })}
        step={step}
      />
      <NumberCell
        label="Multiple of"
        value={node.multipleOf}
        onChange={(v) => onChange({ multipleOf: v })}
        step={step}
      />
    </div>
  );
}

/* ---------- Array -------------------------------------------------------- */

function ArrayValidation({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberCell
        label="Min items"
        value={node.minItems}
        onChange={(v) => onChange({ minItems: v })}
        min={0}
      />
      <NumberCell
        label="Max items"
        value={node.maxItems}
        onChange={(v) => onChange({ maxItems: v })}
        min={0}
      />
    </div>
  );
}

/* ---------- Object ------------------------------------------------------- */

function ObjectValidation({
  node,
  onChange,
}: {
  node: SchemaNode;
  onChange: (patch: Partial<SchemaNode>) => void;
}) {
  // `additionalProperties` here is tri-state: undefined (omit, defaults to
  // false on serialize), true (allow extras), false (reject extras). Most
  // tool APIs require false, so we surface the option as a single toggle —
  // off means "use the safe default" (omitting the key).
  return (
    <div className="space-y-3">
      <div className="border-input flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <div className="min-w-0">
          <div className="text-sm font-medium">Allow additional properties</div>
          <p className="text-muted-foreground text-xs">
            When off, the agent may only emit the fields listed above.
          </p>
        </div>
        <Switch
          checked={node.additionalProperties === true}
          onCheckedChange={(checked) =>
            onChange({ additionalProperties: checked ? true : undefined })
          }
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny reusable inputs                                                       */
/* -------------------------------------------------------------------------- */

function NumberCell({
  label,
  value,
  onChange,
  step = 1,
  min,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number | "any";
  min?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(undefined);
          const parsed = step === 1 ? parseInt(raw, 10) : parseFloat(raw);
          onChange(Number.isFinite(parsed) ? parsed : undefined);
        }}
      />
    </div>
  );
}

function TextCell({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className={cn(mono && "font-mono")}
      />
    </div>
  );
}
