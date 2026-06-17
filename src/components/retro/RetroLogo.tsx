import Link from "next/link";

/** Text wordmark — no third-party brand assets. */
export function RetroLogo() {
  return (
    <div className="retro-logo flex justify-center py-6">
      <Link
        href="/"
        className="retro-logo__link retro-headline text-2xl font-normal tracking-wide text-[var(--retro-accent)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--retro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
        aria-label="Retro — Home"
      >
        Retro
      </Link>
    </div>
  );
}
