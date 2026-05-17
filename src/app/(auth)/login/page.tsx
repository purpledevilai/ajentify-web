"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { GoogleIcon, MicrosoftIcon } from "@/components/primitives/brand-icons";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";
import { startOAuth } from "@/lib/auth/start-oauth";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";
import { getErrorCode, getErrorMessage } from "@/lib/api/errors";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/app";
  const login = useAuthStore((s) => s.loginWithCredentials);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.replace(resolvePostAuthDestination(user, next));
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === "email_not_verified" || code === "email_not_verified_resent") {
        const resent = code === "email_not_verified_resent" ? "1" : "0";
        router.replace(
          `/verify-email?email=${encodeURIComponent(email)}&from=login&resent=${resent}`
        );
        return;
      }
      setError(getErrorMessage(err, "Invalid email or password"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="text-muted-foreground text-sm">Welcome back.</p>
      </div>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => startOAuth("google")}
        >
          <GoogleIcon className="size-5" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => startOAuth("microsoft")}
        >
          <MicrosoftIcon className="size-5" />
          Continue with Microsoft
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs uppercase">or</span>
        <div className="bg-border h-px flex-1" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href={
                email.trim()
                  ? `/reset-password?email=${encodeURIComponent(email.trim())}`
                  : "/reset-password"
              }
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput
            id="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-sm">
        No account?{" "}
        <Link href="/sign-up" className="text-foreground underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
