import Link from "next/link";
import { PageHeader } from "@/components/blocks/page-header";

export default function DashboardHomePage() {
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
