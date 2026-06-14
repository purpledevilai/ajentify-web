"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useDoPageAction, useGetPageData } from "@ajentify/chat";
import { Button } from "@/components/primitives/button";
import { CodeEditor } from "@/components/primitives/code-editor";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BuilderSection } from "@/components/blocks/builder-section";
import { ConfirmDialog } from "@/components/blocks/confirm-dialog";
import { useDocumentBuilderStore } from "@/lib/stores/document-builder-store";
import {
  useJsonDocumentsStore,
  jsonDocumentsActions,
} from "@/lib/stores/json-documents-store";

const DEFAULT_NEW_DOCUMENT_NAME = "Untitled Document";

export default function DocumentBuilderPage() {
  const params = useParams<{ document_id: string }>();
  const document_id = params.document_id;
  const router = useRouter();

  const canGoBack = useRef(false);
  useEffect(() => {
    canGoBack.current =
      typeof window !== "undefined" && window.history.length > 1;
  }, []);

  function handleBack() {
    if (canGoBack.current) router.back();
    else router.push("/app/documents");
  }

  const form = useDocumentBuilderStore((s) => s.form);
  const dataError = useDocumentBuilderStore((s) => s.dataError);
  const hydrating = useDocumentBuilderStore((s) => s.hydrating);
  const saving = useDocumentBuilderStore((s) => s.saving);
  const saveError = useDocumentBuilderStore((s) => s.saveError);
  const notFound = useDocumentBuilderStore((s) => s.notFound);
  const init = useDocumentBuilderStore((s) => s.init);
  const setName = useDocumentBuilderStore((s) => s.setName);
  const setDataString = useDocumentBuilderStore((s) => s.setDataString);
  const save = useDocumentBuilderStore((s) => s.save);
  const discard = useDocumentBuilderStore((s) => s.discard);
  const isDirty = useDocumentBuilderStore((s) => s.isDirty);
  const documentId = useDocumentBuilderStore((s) => s.documentId);

  const ensureDocs = useJsonDocumentsStore((s) => s.ensureLoaded);

  const nameRef = useRef<HTMLInputElement>(null);
  const didAutoFocus = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    ensureDocs();
  }, [ensureDocs]);

  useEffect(() => {
    if (document_id && document_id !== "_") {
      init(document_id);
      didAutoFocus.current = false;
    }
  }, [document_id, init]);

  // For new documents (route param is "_"), initialize with empty form state
  useEffect(() => {
    if (document_id === "_") {
      useDocumentBuilderStore.setState({
        documentId: "_",
        form: { name: DEFAULT_NEW_DOCUMENT_NAME, dataString: "{\n  \n}" },
        original: { name: DEFAULT_NEW_DOCUMENT_NAME, dataString: "{\n  \n}" },
        hydrating: false,
        notFound: false,
        dataError: null,
        saveError: null,
      });
      didAutoFocus.current = false;
    }
  }, [document_id]);

  useEffect(() => {
    if (!form || didAutoFocus.current) return;
    didAutoFocus.current = true;
    if (form.name === DEFAULT_NEW_DOCUMENT_NAME) {
      requestAnimationFrame(() => {
        nameRef.current?.focus();
        nameRef.current?.select();
      });
    }
  }, [form]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (useDocumentBuilderStore.getState().isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // --- Aj page hooks --------------------------------------------------------
  const SetDataArgs = useMemo(
    () => z.object({ value: z.string() }),
    [],
  );

  useGetPageData(
    () => ({
      data: {
        page: "document_detail",
        document_id,
        not_found: notFound,
        loading: hydrating || !form,
        is_dirty: form ? isDirty() : false,
        data_error: dataError,
        draft: form,
        note: "You can set the name and data via set_name/set_data actions; saving and deleting are user actions.",
      },
      actions: {
        set_name: {
          description: "Set the document name.",
          argsSchema: z.toJSONSchema(z.object({ value: z.string() })),
        },
        set_data: {
          description:
            "Set the document JSON data. Pass valid JSON as a string.",
          argsSchema: z.toJSONSchema(SetDataArgs),
        },
      },
    }),
    [document_id, notFound, hydrating, form, dataError, isDirty, SetDataArgs],
  );

  useDoPageAction(
    async (key, args) => {
      if (!form) {
        return { ok: false, error: "document draft not yet hydrated" };
      }
      switch (key) {
        case "set_name":
          setName(String((args as { value: unknown }).value ?? ""));
          return { ok: true };
        case "set_data": {
          const parsed = SetDataArgs.parse(args);
          setDataString(parsed.value);
          return { ok: true };
        }
        default:
          return { ok: false, error: `unknown action: ${key}` };
      }
    },
    [form, setName, setDataString, SetDataArgs],
  );

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Document not found
        </h1>
        <p className="text-muted-foreground text-sm">
          This document doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/app/documents">
            <ArrowLeft className="size-4" />
            Back to documents
          </Link>
        </Button>
      </div>
    );
  }

  if (hydrating || !form) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const dirty = isDirty();
  const isNew = document_id === "_";

  async function onDelete() {
    if (!documentId || documentId === "_") return;
    setDeleting(true);
    try {
      await jsonDocumentsActions.delete(documentId);
      router.replace("/app/documents");
    } catch {
      setDeleting(false);
    }
  }

  async function onSave() {
    const ok = await save();
    if (ok) {
      toast.success("Document saved");
      const newId = useDocumentBuilderStore.getState().documentId;
      if (isNew && newId && newId !== "_") {
        router.replace(`/app/documents/${newId}`);
      }
    }
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header with back, name, and save/discard */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 shrink-0"
              onClick={handleBack}
              aria-label="Back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <input
                ref={nameRef}
                value={form.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Document name"
                aria-label="Document name"
                spellCheck={false}
                className="w-full rounded-md bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 hover:bg-muted/60 focus:bg-muted/60 focus-visible:ring-ring/40 focus-visible:ring-2 -ml-2 transition-colors"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pt-1 sm:gap-2">
            {dirty && (
              <span className="text-muted-foreground hidden text-xs sm:inline-flex">
                Unsaved changes
              </span>
            )}
            <Button
              variant="ghost"
              onClick={discard}
              disabled={!dirty || saving}
              size="sm"
              className="sm:h-9 sm:px-4"
            >
              Discard
            </Button>
            <Button
              variant="gradient"
              onClick={onSave}
              disabled={(!dirty && !isNew) || saving || !!dataError}
              size="sm"
              className="sm:h-9 sm:px-4"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {saveError && <p className="text-destructive text-sm">{saveError}</p>}

      <BuilderSection
        title="Data"
        description="The JSON content of this document. Must be valid JSON."
      >
        {dataError && (
          <p className="text-destructive text-xs">{dataError}</p>
        )}
        <CodeEditor
          language="json"
          value={form.dataString}
          onChange={setDataString}
          minHeight="24rem"
          maxHeight="60vh"
        />
      </BuilderSection>

      {!isNew && (
        <BuilderSection title="Danger zone" className="border-destructive/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Delete document</Label>
              <p className="text-muted-foreground text-xs">Irreversible.</p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleting}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </BuilderSection>
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete this document?"
        description="This will permanently remove this document. This cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting"
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
