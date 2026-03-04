"use client";

import { useState } from "react";

export function RetroShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/r/${token}` : "";

  function copy() {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="akqaretro-share mt-6 flex flex-wrap items-center gap-2 akqaretro-caption text-[var(--akqa-muted)]">
      <span className="akqaretro-share__label">Share link:</span>
      <button
        type="button"
        onClick={copy}
        className="akqaretro-share__copy border border-[var(--akqa-border)] px-3 py-1.5 hover:bg-[var(--akqa-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--akqa-dove)] focus-visible:ring-offset-2"
        aria-label={copied ? "Copied to clipboard" : "Copy link"}
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <code className="akqaretro-share__url truncate max-w-[240px] border border-[var(--akqa-border)] px-2 py-1 akqaretro-caption">
        /r/{token}
      </code>
    </div>
  );
}
