import Link from "next/link";
import { Button } from "@/components/primitives/button";

export function HeroSection() {
  return (
    <section className="container mx-auto max-w-5xl px-6 py-24 md:py-32">
      <h1 className="font-display text-5xl font-bold tracking-tight md:text-7xl">
        All the AI primitives,{" "}
        <span className="text-gradient-brand">fully hosted</span>.
      </h1>
      <p className="text-muted-foreground mt-6 max-w-2xl text-lg md:text-xl">
        Define agents, create tools, deploy instantly. Ajentify handles
        the message storage, tool orchestration, and context management so you can
        unlock all the AI features for your business.
      </p>
      <div className="mt-10 flex gap-3">
        <Button asChild variant="gradient" size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/docs">Read the docs</Link>
        </Button>
      </div>
    </section>
  );
}
