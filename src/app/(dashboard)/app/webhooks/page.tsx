"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApiKeysStore } from "@/lib/stores/api-keys-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { orgApi } from "@/lib/api/organization";
import { getErrorMessage } from "@/lib/api/errors";

export default function WebhooksPage() {
  const orgId = useOrgStore((s) => s.activeOrgId);

  const keys = useApiKeysStore((s) => s.data);
  const ensureKeysLoaded = useApiKeysStore((s) => s.ensureLoaded);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [signingKeyId, setSigningKeyId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Only valid keys are usable for signing.
  const validKeys = useMemo(() => keys.filter((k) => k.valid), [keys]);

  useEffect(() => {
    if (orgId) ensureKeysLoaded();
  }, [orgId, ensureKeysLoaded]);

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    orgApi
      .get(orgId)
      .then((org) => {
        if (cancelled) return;
        setWebhookUrl(org.webhook_url ?? "");
        setSigningKeyId(org.webhook_signing_api_key_id ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(getErrorMessage(err, "Unable to load webhook settings"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const trimmedUrl = webhookUrl.trim();
  // A configured webhook is unusable without a signing key.
  const missingSigningKey = trimmedUrl.length > 0 && !signingKeyId;
  const canSave = !!orgId && !saving && !missingSigningKey;

  const onSave = useCallback(async () => {
    if (!orgId) return;
    setSaveError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await orgApi.update(orgId, {
        webhook_url: trimmedUrl || null,
        webhook_signing_api_key_id: trimmedUrl ? signingKeyId : null,
      });
      setWebhookUrl(updated.webhook_url ?? "");
      setSigningKeyId(updated.webhook_signing_api_key_id ?? null);
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(getErrorMessage(err, "Unable to save webhook settings"));
    } finally {
      setSaving(false);
    }
  }, [orgId, trimmedUrl, signingKeyId]);

  useGetPageData(
    () => ({
      data: {
        page: "webhooks",
        webhook_url: trimmedUrl || null,
        webhook_signing_api_key_id: signingKeyId,
        available_signing_keys: validKeys.map((k) => ({
          api_key_id: k.api_key_id,
          token_hint: k.token_hint,
        })),
        note:
          "Configure the org's Ajentify proxy handler (webhook). Ajentify signs each request with the selected org API key so the integrator can verify authenticity. Saving is a user action.",
      },
      actions: {},
    }),
    [trimmedUrl, signingKeyId, validKeys],
  );

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Webhooks"
        subtitle="Route Ajentify events to your backend's proxy handler."
      />

      {loadError && <p className="text-destructive text-sm">{loadError}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Proxy handler</CardTitle>
          <CardDescription>
            Ajentify sends tagged proxy events (e.g. <code>create_context</code>,{" "}
            <code>generate_access_token</code>) to this URL. Your backend resolves
            the end-user, proxies to the Ajentify REST API with your org key, and
            returns the responses unchanged. Used by the realtime telephony flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://your-backend.example.com/ajentify/webhook"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
                setSaved(false);
              }}
              disabled={loading || saving}
            />
            <p className="text-muted-foreground text-xs">
              Leave blank to disable and fall back to Ajentify-managed context
              creation.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signing-key">Signing key</Label>
            <Select
              value={signingKeyId ?? ""}
              onValueChange={(val) => {
                setSigningKeyId((val as string) || null);
                setSaved(false);
              }}
            >
              <SelectTrigger id="signing-key" className="w-full">
                <SelectValue placeholder="Select an org API key" />
              </SelectTrigger>
              <SelectContent>
                {validKeys.map((k) => (
                  <SelectItem key={k.api_key_id} value={k.api_key_id}>
                    <span className="font-mono">{k.token_hint}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Ajentify signs each webhook request with this key using
              HMAC-SHA256 (header <code>X-Ajentify-Signature</code>). Use the same
              key on your backend to verify requests.{" "}
              {validKeys.length === 0 && (
                <>
                  You have no valid org API keys —{" "}
                  <Link href="/app/api-keys" className="underline">
                    create one first
                  </Link>
                  .
                </>
              )}
            </p>
            {missingSigningKey && (
              <p className="text-destructive text-sm">
                A signing key is required when a webhook URL is set.
              </p>
            )}
          </div>

          {saveError && <p className="text-destructive text-sm">{saveError}</p>}

          <div className="flex items-center gap-3">
            <Button variant="gradient" onClick={onSave} disabled={!canSave}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save"}
            </Button>
            {saved && !saving && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="size-4 text-emerald-500" />
                Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
