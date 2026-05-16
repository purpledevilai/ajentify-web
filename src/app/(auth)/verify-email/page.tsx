"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";

function VerifyEmailForm() {
  const router = useRouter();
  const email = useSearchParams().get("email") ?? "";
  const complete = useAuthStore((s) => s.completeAuthResponse);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await authApi.verifyCode(email, code);
      complete(r);
      router.replace(resolvePostAuthDestination(r.user));
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? "Invalid code");
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    try {
      await authApi.resendCode(email);
      setResent(true);
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? "Unable to resend code");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verify your email</h1>
        <p className="text-muted-foreground text-sm">
          We sent a 6-digit code to{" "}
          <span className="text-foreground">{email || "your email"}</span>.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            pattern="\d{6}"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoComplete="one-time-code"
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={submitting || code.length !== 6}
        >
          {submitting ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-sm"
        onClick={onResend}
      >
        {resent ? "Code resent" : "Resend code"}
      </button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
