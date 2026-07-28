import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, Shield } from "lucide-react";
import { getVerifiedCertificate } from "@/lib/server/certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function CertificatePage({ params }: PageProps) {
  const id = params.id?.trim();
  if (!id) notFound();

  let result: Awaited<ReturnType<typeof getVerifiedCertificate>> = null;
  try {
    result = await getVerifiedCertificate(id);
  } catch {
    notFound();
  }

  if (!result) notFound();

  const { payload, verified } = result;
  const issued = new Date(payload.issuedAt);
  const dateLabel = issued.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="flex items-center justify-between px-8 py-4 border-b border-surface-border/50">
        <Link href="/" className="font-mono font-bold text-base tracking-tight">
          <span className="text-brand">typ</span>
          <span className="text-sky-400">dr</span>
        </Link>
        <Link
          href="/practice"
          className="font-mono text-xs text-slate-500 hover:text-slate-200"
        >
          Practice
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          <div className="relative overflow-hidden rounded-[28px] border border-brand/25 bg-[radial-gradient(circle_at_top_left,rgba(232,245,92,0.14),transparent_40%),linear-gradient(180deg,rgba(27,31,34,0.92),rgba(17,18,24,0.96))] p-8 md:p-10">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-brand/10" />
            <div className="absolute -right-4 top-8 h-24 w-24 rounded-full border border-brand/8" />

            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500 mb-2">
                  Typing certificate
                </div>
                <h1 className="font-mono font-bold text-2xl text-slate-100">
                  <span className="text-brand">typ</span>
                  <span className="text-sky-400">dr</span>
                </h1>
              </div>
              {verified ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-correct/30 bg-green-950/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-correct">
                  <BadgeCheck size={13} />
                  Verified
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-900/40 bg-amber-950/30 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-300">
                  <Shield size={13} />
                  Unverified
                </div>
              )}
            </div>

            <p className="text-slate-300 text-base leading-relaxed mb-8">
              <span className="text-slate-100 font-mono font-bold">
                {payload.username}
              </span>{" "}
              typed at{" "}
              <span className="text-brand font-mono font-bold">{payload.wpm} WPM</span>{" "}
              with{" "}
              <span className="text-brand font-mono font-bold">
                {payload.accuracy}%
              </span>{" "}
              accuracy on typdr.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="rounded-2xl border border-surface-border bg-surface/40 p-4 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                  WPM
                </div>
                <div className="font-mono text-3xl font-bold text-brand">
                  {payload.wpm}
                </div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface/40 p-4 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Accuracy
                </div>
                <div className="font-mono text-3xl font-bold text-slate-100">
                  {payload.accuracy}
                  <span className="text-lg text-slate-500">%</span>
                </div>
              </div>
              <div className="rounded-2xl border border-surface-border bg-surface/40 p-4 text-center">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">
                  Mode
                </div>
                <div className="font-mono text-lg font-bold text-slate-200 uppercase tracking-wide">
                  {payload.mode}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-surface-border/60 pt-5">
              <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
                <Award size={13} className="text-brand" />
                Issued {dateLabel}
              </div>
              <div className="font-mono text-[10px] text-slate-600 tracking-widest uppercase">
                ID {id.slice(0, 8)}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-xs text-slate-600">
            HMAC-signed · cryptographically verifiable
          </p>
        </div>
      </main>
    </div>
  );
}
