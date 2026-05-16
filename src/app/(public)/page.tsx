import Link from "next/link";
import { Button } from "@/components/primitives/button";

export default function LandingPage() {
  return (
    <section className="container mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
        Agent infrastructure{" "}
        <span className="text-gradient-brand">for developers</span>.
      </h1>
      <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
        Ajentify is the agent operating system. Design, orchestrate, and run
        stateful multi-agent systems with full control and observability.
      </p>
      <div className="mt-10 flex gap-3">
        <Button asChild variant="gradient" size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/docs">View documentation</Link>
        </Button>
      </div>
    </section>
  );
}
