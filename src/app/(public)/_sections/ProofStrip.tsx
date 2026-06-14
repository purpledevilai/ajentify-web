import { Boxes, CreditCard, Lock, Server } from "lucide-react";

const SIGNALS = [
  { icon: Server, text: "Fully hosted — zero infra to run" },
  { icon: CreditCard, text: "Free to start, no card" },
  { icon: Lock, text: "Own your prompts & context — no lock-in" },
  { icon: Boxes, text: "Bring any model" },
];

export function ProofStrip() {
  return (
    <section className="border-t border-border/50 bg-muted/30">
      <div className="container mx-auto max-w-5xl px-6 py-12">
        <p className="text-center text-base md:text-lg">
          <span className="font-semibold">
            From prototype to production on one platform.
          </span>{" "}
          <span className="text-muted-foreground">
            10xAgent started as a prototype on Ajentify. Today it&apos;s a
            complex, live AI product — same platform, no migration, no rebuild.
          </span>
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SIGNALS.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-4 py-3"
            >
              <Icon className="text-primary size-4 shrink-0" />
              <span className="text-sm text-foreground/80">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
