"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function GoogleWalletPage({
  params,
}: {
  params: { passId: string };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    fetch(`/api/passes/${params.passId}/google-save-url`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as { url: string };
      })
      .then((j) => setUrl(j.url))
      .catch((e) => setNote(String(e?.message ?? e)));
  }, [params.passId]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Google Wallet</h1>
        <p className="mt-2 text-sm opacity-70">
          This is a link. It becomes a pass.
        </p>

        <div className="mt-10 grid gap-3">
          {url ? (
            <a
              href={url}
              className="rounded-xl bg-black px-4 py-3 text-center text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Save to Google Wallet
            </a>
          ) : (
            <div className="rounded-xl bg-white px-4 py-3 text-sm opacity-70 ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
              Loading.
            </div>
          )}
          <Link
            href="/my"
            className="rounded-xl px-4 py-3 text-center text-sm font-medium opacity-70 ring-1 ring-black/10 hover:opacity-100 dark:ring-white/10"
          >
            Back
          </Link>
        </div>

        {note ? <p className="mt-6 text-xs opacity-70">{note}</p> : null}
      </div>
    </main>
  );
}

