export default function DocsPage() {
  return (
    <section className="container mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Documentation
      </h1>
      <p className="text-muted-foreground mt-4 text-sm">
        Documentation is coming soon. The full reference is available at{" "}
        <a
          href="https://api.ajentify.com/docs"
          className="text-foreground underline"
          target="_blank"
          rel="noreferrer"
        >
          api.ajentify.com/docs
        </a>
        .
      </p>
    </section>
  );
}
