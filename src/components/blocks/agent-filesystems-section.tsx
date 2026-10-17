"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, FolderTree, Plus, Unlink, Wrench } from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/blocks/copy-button";
import { BuilderSection } from "@/components/blocks/builder-section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilesystemsStore } from "@/lib/stores/filesystems-store";
import { useDefaultToolsStore } from "@/lib/stores/default-tools-store";
import {
  attachFilesystemToPrompt,
  detachFilesystemFromPrompt,
  referencedFilesystemIds,
} from "@/lib/filesystems/snippet";
import {
  filesystemToolIds,
  missingFilesystemToolIds,
  unionToolIds,
} from "@/lib/filesystems/tools";

export interface AgentFilesystemsSectionProps {
  prompt: string;
  tools: string[];
  /** Apply a prompt + tools change in one go (both come from one Attach). */
  onChange: (next: { prompt: string; tools: string[] }) => void;
}

/**
 * "Filesystems" section of the agent builder. A filesystem is bound to an
 * agent purely through prompt text + the Filesystem tool category (plan
 * §1.5 / D5): Attach inserts the standard snippet and adds the 10 tools;
 * Detach removes the snippet paragraph. Attached state is derived from
 * `/<uuid>` references in the prompt that match a known filesystem.
 */
export function AgentFilesystemsSection({
  prompt,
  tools,
  onChange,
}: AgentFilesystemsSectionProps) {
  const filesystems = useFilesystemsStore((s) => s.data);
  const fsLoaded = useFilesystemsStore((s) => s.loaded);
  const ensureFilesystems = useFilesystemsStore((s) => s.ensureLoaded);
  const defaultTools = useDefaultToolsStore((s) => s.data);

  useEffect(() => {
    ensureFilesystems();
  }, [ensureFilesystems]);

  const fsToolIds = useMemo(() => filesystemToolIds(defaultTools), [defaultTools]);
  const apiHasCategory = useMemo(
    () => defaultTools.some((t) => t.category === "Filesystem"),
    [defaultTools]
  );

  const attachedIds = useMemo(
    () =>
      referencedFilesystemIds(
        prompt,
        filesystems.map((f) => f.filesystem_id)
      ),
    [prompt, filesystems]
  );
  const attached = attachedIds
    .map((id) => filesystems.find((f) => f.filesystem_id.toLowerCase() === id))
    .filter((f): f is NonNullable<typeof f> => !!f);
  const available = filesystems.filter(
    (f) => !attachedIds.includes(f.filesystem_id.toLowerCase())
  );

  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = available.find((f) => f.filesystem_id === pickedId) ?? null;
  const missingTools = attached.length > 0 ? missingFilesystemToolIds(tools, fsToolIds) : [];

  function attach() {
    if (!picked) return;
    onChange({
      prompt: attachFilesystemToPrompt(prompt, picked),
      tools: unionToolIds(tools, fsToolIds),
    });
    setPickedId(null);
  }

  function detach(filesystemId: string) {
    onChange({ prompt: detachFilesystemFromPrompt(prompt, filesystemId), tools });
  }

  return (
    <BuilderSection
      title="Filesystems"
      description="Folder-and-file memories this agent can navigate. Attaching adds the Filesystem tools and a prompt snippet that tells the agent where the memory lives."
      actions={
        <Button asChild type="button" variant="outline" size="sm">
          <Link href="/app/filesystems">
            <FolderTree className="size-4" />
            Manage
          </Link>
        </Button>
      }
    >
      {attached.length > 0 && (
        <div className="min-w-0 space-y-2">
          {attached.map((f) => (
            <div
              key={f.filesystem_id}
              className="border-border flex w-full min-w-0 items-start gap-3 rounded-md border p-3"
            >
              <div className="bg-muted text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                <FolderTree className="size-4" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground text-sm font-medium break-words">
                    {f.name}
                  </span>
                  <Link
                    href={`/app/filesystems/${f.filesystem_id}`}
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-0.5 text-xs transition-colors"
                  >
                    Open
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
                {f.description && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                    {f.description}
                  </p>
                )}
                <div className="text-muted-foreground mt-1 flex items-center gap-1 font-mono text-xs">
                  <span className="truncate">/{f.filesystem_id}</span>
                  <CopyButton value={`/${f.filesystem_id}`} label="Copy agent path" />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => detach(f.filesystem_id)}
              >
                <Unlink className="size-4" />
                Detach
              </Button>
            </div>
          ))}
        </div>
      )}

      {missingTools.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-900 dark:bg-amber-950/40">
          <span className="text-amber-800 dark:text-amber-200">
            {missingTools.length} of {fsToolIds.length} Filesystem tools are not attached — the
            agent can&apos;t fully use its filesystem memory.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ prompt, tools: unionToolIds(tools, fsToolIds) })}
          >
            <Wrench className="size-4" />
            Add missing tools
          </Button>
        </div>
      )}

      {fsLoaded && filesystems.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No filesystems yet.{" "}
          <Link
            href="/app/filesystems"
            className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            Create one
          </Link>{" "}
          to give this agent a browsable memory.
        </p>
      ) : available.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={pickedId}
            onValueChange={(v) => setPickedId(typeof v === "string" ? v : null)}
          >
            <SelectTrigger className="w-full sm:flex-1" aria-label="Filesystem to attach">
              <SelectValue placeholder="Choose a filesystem…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((f) => (
                <SelectItem key={f.filesystem_id} value={f.filesystem_id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="sm:h-9 sm:px-4"
            disabled={!picked}
            onClick={attach}
          >
            <Plus className="size-4" />
            Attach
          </Button>
        </div>
      ) : attached.length > 0 ? (
        <p className="text-muted-foreground text-xs">
          Every filesystem in this organization is attached.
        </p>
      ) : null}

      {!apiHasCategory && defaultTools.length > 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Badge variant="outline">Heads-up</Badge>
          The API did not advertise a Filesystem tool category; Attach will add the standard
          tool ids anyway.
        </p>
      )}
    </BuilderSection>
  );
}
