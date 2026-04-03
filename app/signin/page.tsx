"use client";

import { Suspense, FormEvent, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SignInInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/practice";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
      callbackUrl,
    });

    setSubmitting(false);

    if (!result || result.error) {
      setError("Use a username (min 3) and password (min 6).");
      return;
    }

    router.push(result.url ?? callbackUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface-secondary p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-6">
          <Link href="/" className="font-mono font-bold text-base tracking-tight">
            <span className="text-brand">typ</span><span className="text-sky-400">dr</span>
          </Link>
        </div>

        <h1 className="font-mono text-2xl font-bold text-slate-100 mb-2">Sign in or sign up</h1>
        <p className="text-sm text-slate-500 mb-6">
          Use one username and password. If you're new, this acts like sign up automatically.
        </p>

        {session?.user ? (
          <div className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm text-slate-300">
            Signed in as{" "}
            <span className="font-mono text-brand">{session.user.name}</span>.
            <div className="mt-4">
              <Link
                href={callbackUrl}
                className="px-4 py-2 bg-brand text-surface font-mono font-bold text-xs rounded-lg hover:bg-brand-dim"
              >
                Continue →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-slate-500 mb-2">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="typepilot"
                autoFocus
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wide text-slate-500 mb-2">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand/40"
              />
            </div>

            {error && (
              <div className="text-xs font-mono text-red-400">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand px-4 py-3 font-mono text-sm font-bold text-surface hover:bg-brand-dim disabled:opacity-50 transition-all"
            >
              {submitting ? "Continuing…" : "Continue →"}
            </button>

            <p className="text-xs text-slate-600 font-mono text-center">
              Username must be at least 3 characters. Password must be at least 6 characters.
              Same form for both returning and new users.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="font-mono text-slate-600 text-sm">Loading…</div>
        </div>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
