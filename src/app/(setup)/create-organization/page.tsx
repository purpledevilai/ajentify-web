"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orgApi } from "@/lib/api/organization";
import { userApi } from "@/lib/api/user";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const syncOrgs = useOrgStore((s) => s.syncFromUser);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await orgApi.create(name);
      // Re-fetch /user to pick up the newly-created org (the JWT was
      // minted before it existed, but /user reads the latest list).
      const u = await userApi.get();
      setUser(u);
      syncOrgs();
      router.replace("/app");
    } catch (err: unknown) {
      const body = (err as { body?: { message?: string } })?.body;
      setError(body?.message ?? "Unable to create organization");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create your organization</h1>
        <p className="text-muted-foreground text-sm">
          All your agents, tools, and resources live here. You can rename it
          later.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="n">Organization name</Label>
          <Input
            id="n"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          disabled={submitting || !name.trim()}
        >
          {submitting ? "Creating…" : "Create"}
        </Button>
      </form>
    </div>
  );
}
