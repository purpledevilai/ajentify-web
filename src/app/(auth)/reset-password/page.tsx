"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordRequirements,
  isPasswordValid,
} from "@/components/ui/password-requirements";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";
import { getErrorMessage } from "@/lib/api/errors";

function ResetPasswordForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const codeFromUrl = sp.get("code");
  const emailFromUrl = sp.get("email") ?? "";
  const complete = useAuthStore((s) => s.completeAuthResponse);

  const [email, setEmail] = useState(emailFromUrl);
  const [code] = useState(codeFromUrl ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to send reset email"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onSet(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await authApi.setNewPassword(email, code, newPassword);
      complete(r);
      router.replace(resolvePostAuthDestination(r.user));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to reset password"));
    } finally {
      setSubmitting(false);
    }
  }

  if (codeFromUrl) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Set a new password</h1>
          <p className="text-muted-foreground text-sm">
            For {email || "your account"}.
          </p>
        </div>
        <form onSubmit={onSet} className="space-y-4">
          {!emailFromUrl && (
            <div className="space-y-1.5">
              <Label htmlFor="em">Email</Label>
              <Input
                id="em"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="np">New password</Label>
            <PasswordInput
              id="np"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordRequirements value={newPassword} className="pt-1" />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={submitting || !isPasswordValid(newPassword)}
          >
            {submitting ? "Saving…" : "Set new password"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground text-sm">
          We&apos;ll email you a link to set a new password.
        </p>
      </div>
      {sent ? (
        <p className="text-foreground text-sm">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={onRequest} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="em">Email</Label>
            <Input
              id="em"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
