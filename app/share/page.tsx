import type { Metadata } from "next";
import Link from "next/link";

export function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Metadata {
  const wpm = String(searchParams.wpm ?? "—");
  const accuracy = String(searchParams.accuracy ?? "—");
  const mode = String(searchParams.mode ?? "words");

  const ogImage = `/api/og?wpm=${encodeURIComponent(wpm)}&accuracy=${encodeURIComponent(
    accuracy
  )}&mode=${encodeURIComponent(mode)}`;

  return {
    title: `typdr — ${wpm} WPM`,
    description: `I just typed ${wpm} WPM on typdr (${accuracy}% accuracy).`,
    openGraph: {
      title: `typdr — ${wpm} WPM`,
      description: `I just typed ${wpm} WPM on typdr (${accuracy}% accuracy).`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "typdr typing score",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `typdr — ${wpm} WPM`,
      description: `I just typed ${wpm} WPM on typdr (${accuracy}% accuracy).`,
      images: [ogImage],
    },
  };
}

export default function SharePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const wpm = String(searchParams.wpm ?? "—");
  const accuracy = String(searchParams.accuracy ?? "—");
  const mode = String(searchParams.mode ?? "words");

  // This page is intentionally minimal — social previews depend on metadata above.
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-2 mb-6 rounded-full border border-surface-border bg-surface-secondary/60 px-4 py-2 font-mono text-xs text-slate-400">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
          <span>·</span>
          <span>score share</span>
        </div>

        <h1 className="font-mono font-bold text-3xl text-slate-100 mb-3">
          {wpm} WPM
        </h1>
        <p className="text-sm font-mono text-slate-500 mb-6">
          {accuracy}% accuracy · {mode}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/practice"
            className="px-5 py-2.5 bg-brand text-surface font-mono font-bold text-sm rounded-lg hover:bg-brand-dim transition-all"
          >
            Practice on typdr →
          </Link>
          <a
            href={`/api/og?wpm=${encodeURIComponent(wpm)}&accuracy=${encodeURIComponent(
              accuracy
            )}&mode=${encodeURIComponent(mode)}`}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 border border-surface-border bg-surface-secondary/60 font-mono text-sm text-slate-300 rounded-lg hover:bg-surface-hover transition-all"
          >
            Open image
          </a>
        </div>
      </div>
    </div>
  );
}

