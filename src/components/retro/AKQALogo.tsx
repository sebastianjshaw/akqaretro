"use client";

/**
 * AKQA wordmark for centre-top placement.
 * Replace src with your logo asset if you have one: <img src="/akqa-logo.svg" alt="AKQA" />
 */
export function AKQALogo() {
  return (
    <div className="akqaretro-logo flex justify-center py-6">
      <a
        href="/"
        className="akqaretro-logo__link text-[1.75rem] font-semibold tracking-tight text-[var(--akqa-dove)] dark:text-[var(--akqa-white)] no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2"
        aria-label="AKQA – Home"
      >
        AKQA
      </a>
    </div>
  );
}
