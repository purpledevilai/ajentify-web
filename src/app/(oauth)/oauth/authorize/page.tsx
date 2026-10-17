"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ExternalLink,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { oauthAuthorizeApi } from "@/lib/api/oauth-authorize";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";
import {
  buildAccessOptions,
  buildDenyRedirect,
  buildErrorRedirect,
  defaultAccessOption,
  parseAuthorizeParams,
  previewErrorAction,
  requestedScopes,
  type AccessOption,
  type AuthorizeParams,
} from "@/lib/oauth/authorize";
import { useOAuthAuthGate } from "@/lib/oauth/use-oauth-auth-gate";
import { useOrgStore } from "@/lib/stores/org-store";
import { cn } from "@/lib/utils";
import type {
  OAuthAuthorizeErrorBody,
  OAuthAuthorizePreviewResponse,
} from "@/types/oauth";

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <AuthorizeFlow />
    </Suspense>
  );
}

function AuthorizeFlow() {
  const sp = useSearchParams();
  const parsed = useMemo(
    () => parseAuthorizeParams(new URLSearchParams(sp.toString())),
    [sp]
  );
  // Only bounce through login when the request itself is well-formed; a
  // malformed request gets its error card straight away.
  const { ready } = useOAuthAuthGate(parsed.ok);

  if (!parsed.ok) {
    return (
      <ErrorCard
        title="Invalid authorization request"
        message={parsed.error.description}
        detail={`error: ${parsed.error.error}`}
      />
    );
  }
  if (!ready) return <LoadingCard />;
  return <ConsentFlow params={parsed.params} />;
}

// ---------------------------------------------------------------------------
// Consent flow (authenticated)
// ---------------------------------------------------------------------------

type PreviewState =
  | { status: "loading" }
  | { status: "redirecting" }
  | { status: "error"; title: string; message: string; detail?: string; retryable: boolean }
  | { status: "ready"; data: OAuthAuthorizePreviewResponse };

const PREVIEW_ERROR_TITLES: Record<string, string> = {
  invalid_client: "Unknown application",
  invalid_redirect_uri: "Invalid redirect URL",
  invalid_resource: "Invalid resource",
  invalid_scope: "Invalid permissions requested",
};

function ConsentFlow({ params }: { params: AuthorizeParams }) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const ran = useRef(false);

  const loadPreview = useCallback(async () => {
    setPreview({ status: "loading" });
    try {
      const data = await oauthAuthorizeApi.preview({
        oauth_client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        state: params.state,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
        resource: params.resource,
      });
      setPreview({ status: "ready", data });
    } catch (err: unknown) {
      const code = getErrorCode(err);
      const body = (err as { body?: OAuthAuthorizeErrorBody } | null)?.body;
      const message = getErrorMessage(
        err,
        "We couldn't verify this authorization request."
      );
      if (previewErrorAction(code) === "redirect") {
        // The API rejects the client / redirect_uri before it checks scopes,
        // so `invalid_scope` means redirect_uri is valid and the client may
        // learn about the bad scope.
        setPreview({ status: "redirecting" });
        window.location.replace(
          buildErrorRedirect(
            params.redirect_uri,
            "invalid_scope",
            params.state,
            body?.error_description ?? body?.error
          )
        );
        return;
      }
      const known = code ? PREVIEW_ERROR_TITLES[code] : undefined;
      setPreview({
        status: "error",
        title: known ?? "Couldn't load authorization request",
        message,
        detail: code ? `error: ${code}` : undefined,
        // Validation failures are final; network/5xx may be transient.
        retryable: !known,
      });
    }
  }, [params]);

  useEffect(() => {
    if (ran.current) return; // Strict Mode double-invoke guard
    ran.current = true;
    void loadPreview();
  }, [loadPreview]);

  if (preview.status === "loading") return <LoadingCard />;
  if (preview.status === "redirecting") return <RedirectingCard />;
  if (preview.status === "error") {
    return (
      <ErrorCard
        title={preview.title}
        message={preview.message}
        detail={preview.detail}
        onRetry={preview.retryable ? loadPreview : undefined}
      />
    );
  }
  return <ConsentCard params={params} preview={preview.data} />;
}

// ---------------------------------------------------------------------------
// Consent card
// ---------------------------------------------------------------------------

function ConsentCard({
  params,
  preview,
}: {
  params: AuthorizeParams;
  preview: OAuthAuthorizePreviewResponse;
}) {
  const activeOrgId = useOrgStore((s) => s.activeOrgId);

  const options = useMemo<AccessOption[]>(() => {
    const fromServer = preview.scopes.map((s) => s.scope);
    return buildAccessOptions(
      fromServer.length > 0 ? fromServer : requestedScopes(params.scope)
    );
  }, [preview.scopes, params.scope]);

  const [accessId, setAccessId] = useState<AccessOption["id"] | null>(
    () => defaultAccessOption(options)?.id ?? null
  );
  const [orgId, setOrgId] = useState<string | null>(() => {
    if (activeOrgId && preview.orgs.some((o) => o.org_id === activeOrgId)) {
      return activeOrgId;
    }
    return preview.orgs[0]?.org_id ?? null;
  });
  const [granting, setGranting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);

  const selected = options.find((o) => o.id === accessId) ?? null;
  const canAllow = !!selected && !!orgId && !granting && !redirecting;

  async function onAllow() {
    if (!selected || !orgId) return;
    setGrantError(null);
    setGranting(true);
    try {
      const r = await oauthAuthorizeApi.grant({
        oauth_client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        scope: selected.scope,
        requested_scope: params.scope,
        state: params.state,
        code_challenge: params.code_challenge,
        code_challenge_method: params.code_challenge_method,
        resource: params.resource,
        org_id: orgId,
      });
      setRedirecting(true);
      window.location.replace(r.redirect_uri);
    } catch (err: unknown) {
      setGrantError(
        getErrorMessage(err, "Something went wrong while authorizing. Please try again.")
      );
      setGranting(false);
    }
  }

  function onDeny() {
    setRedirecting(true);
    window.location.replace(buildDenyRedirect(params.redirect_uri, params.state));
  }

  if (redirecting) return <RedirectingCard />;

  if (options.length === 0) {
    return (
      <ErrorCard
        title="No supported permissions requested"
        message="This application didn't request any permissions Ajentify can grant."
        detail="error: invalid_scope"
      />
    );
  }

  return (
    <Card className="gap-5 py-6">
      <CardHeader className="gap-2">
        <div className="bg-muted mb-1 flex size-10 items-center justify-center rounded-lg">
          <ShieldCheck className="text-foreground size-5" />
        </div>
        <CardTitle className="text-xl">
          Authorize {preview.client_name || preview.client_host}
        </CardTitle>
        <CardDescription>
          <span className="text-foreground font-medium">{preview.client_host}</span>{" "}
          wants to access your Ajentify filesystems.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Client + redirect */}
        <div className="border-border divide-border divide-y rounded-lg border text-sm">
          <div className="flex items-start gap-3 p-3">
            <Globe className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">
                Application
              </div>
              <div className="truncate font-medium" title={preview.client_host}>
                {preview.client_host}
              </div>
              {preview.client_uri && (
                <a
                  href={preview.client_uri}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                >
                  {preview.client_uri}
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 p-3">
            <ArrowRight className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wide">
                Redirects to
                {preview.is_loopback && (
                  <Badge variant="outline" className="normal-case tracking-normal">
                    <AlertTriangle />
                    Local application
                  </Badge>
                )}
              </div>
              <div className="truncate font-medium" title={preview.redirect_host}>
                {preview.redirect_host}
              </div>
              {preview.is_loopback && (
                <p className="text-muted-foreground mt-1 text-xs">
                  This will redirect to a local application on your computer.
                  Only continue if you started this request yourself.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="space-y-2">
          <Label htmlFor="oauth-org">
            <Building2 className="size-4" />
            Organization
          </Label>
          {preview.orgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You&apos;re not a member of any organization yet.{" "}
              <Link href="/create-organization" className="text-foreground underline">
                Create one
              </Link>{" "}
              and then retry from the application.
            </p>
          ) : (
            <Select
              value={orgId ?? ""}
              onValueChange={(v) => setOrgId((v as string) || null)}
            >
              <SelectTrigger id="oauth-org" className="w-full">
                <SelectValue placeholder="Select an organization">
                  {(value) =>
                    preview.orgs.find((o) => o.org_id === value)?.name ??
                    "Select an organization"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {preview.orgs.map((o) => (
                  <SelectItem key={o.org_id} value={o.org_id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-muted-foreground text-xs">
            The application will only see filesystems in this organization.
          </p>
        </div>

        {/* Access level */}
        <fieldset className="space-y-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium">
            Access
          </legend>
          <div className="space-y-2">
            {options.map((o) => {
              const checked = o.id === accessId;
              return (
                <label
                  key={o.id}
                  className={cn(
                    "border-border hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                    checked && "border-foreground/40 bg-muted/40"
                  )}
                >
                  <input
                    type="radio"
                    name="oauth-access"
                    value={o.id}
                    checked={checked}
                    onChange={() => setAccessId(o.id)}
                    className="accent-foreground mt-0.5 size-4 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="text-muted-foreground block text-xs">
                      {o.description}
                    </span>
                    <span className="text-muted-foreground mt-1 block font-mono text-[11px]">
                      {o.scope}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {grantError && (
          <div
            role="alert"
            className="border-destructive/40 bg-destructive/5 text-destructive flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <span>{grantError}</span>
            <button
              type="button"
              onClick={onAllow}
              disabled={!canAllow}
              className="shrink-0 font-medium underline underline-offset-2 disabled:opacity-50"
            >
              Try again
            </button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDeny} disabled={granting}>
          Deny
        </Button>
        <Button type="button" variant="gradient" onClick={onAllow} disabled={!canAllow}>
          {granting ? "Authorizing…" : "Allow"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Static cards
// ---------------------------------------------------------------------------

function LoadingCard() {
  return (
    <Card className="gap-5 py-6" aria-busy="true">
      <CardHeader className="gap-2">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </CardContent>
    </Card>
  );
}

function RedirectingCard() {
  return (
    <Card className="py-6">
      <CardContent className="text-center">
        <p className="text-muted-foreground text-sm">Returning to the application…</p>
      </CardContent>
    </Card>
  );
}

function ErrorCard({
  title,
  message,
  detail,
  onRetry,
}: {
  title: string;
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="gap-4 py-6">
      <CardHeader className="gap-2">
        <div className="bg-destructive/10 mb-1 flex size-10 items-center justify-center rounded-lg">
          <AlertTriangle className="text-destructive size-5" />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {detail && (
          <p className="text-muted-foreground font-mono text-xs">{detail}</p>
        )}
        <p className="text-muted-foreground text-xs">
          For your safety we haven&apos;t sent you back to the application.
          Close this tab and start again from the application.
        </p>
        <div className="flex items-center gap-2 pt-1">
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
          <Button asChild variant="ghost" size="sm">
            <Link href="/app">Go to dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
