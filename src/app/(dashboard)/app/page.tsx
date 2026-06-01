"use client";

import Link from "next/link";
import { useGetPageData } from "@ajentify/chat";
import { PageHeader } from "@/components/blocks/page-header";

export default function DashboardHomePage() {
  useGetPageData(
    () => ({
      data: {
        page: "overview",
        note:
          "Placeholder dashboard. No data or actions yet — point the user at /app/agents to get started.",
      },
      actions: {},
    }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Monitor and orchestrate your agent systems."
      />
      <div className="text-muted-foreground rounded-lg border p-12 text-center">
        Dashboard coming soon. Head to{" "}
        <Link href="/app/agents" className="text-foreground underline">
          Agents
        </Link>{" "}
        to get started.
      </div>
    </div>
  );
}
