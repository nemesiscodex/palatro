export default function InternalServerErrorScreen() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-card/80 p-8 text-center shadow-xl backdrop-blur">
        <p className="ornate-label text-primary/60">Error 500</p>
        <h1 className="mt-2 font-serif text-4xl text-foreground">Internal server error</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Oops! Something went wrong on our side. Please try again later.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-primary/30 px-6 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}
