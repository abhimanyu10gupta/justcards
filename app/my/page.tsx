"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type PassRow = {
  id: string;
  type: "meme" | "streak" | "club";
  title: string;
  subtitle: string;
  status: "pending" | "active" | "expired" | null;
  club_slug: string | null;
  start_date: string | null;
  created_at: string;
};

export default function MyPassesPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [rows, setRows] = useState<PassRow[] | null>(null);
  const [who, setWho] = useState<"anon" | "user">("anon");
  const [note, setNote] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token ?? null
        : null;
      const isUser = Boolean(token);
      setWho(isUser ? "user" : "anon");
      setToken(token);

      // attach-on-login: harmless if already attached.
      if (token) {
        await fetch("/api/auth/attach", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }

      const res = await fetch("/api/passes", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const t = await res.text();
        if (!alive) return;
        setNote(t || "failed");
        setRows([]);
        return;
      }
      const json = (await res.json()) as { passes: PassRow[] };
      if (!alive) return;
      setRows(json.passes);
    }

    load().catch((e) => setNote(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [supabase]);

  async function resetStreak(passId: string) {
    if (!token) return;
    const res = await fetch(`/api/passes/${passId}/reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 402) {
      router.push("/unlock");
      return;
    }
    if (!res.ok) {
      setNote(await res.text());
      return;
    }
    // reload list
    setRows(null);
    const again = await fetch("/api/passes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = (await again.json()) as { passes: PassRow[] };
    setRows(json.passes);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-2xl px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Passes</h1>
            <p className="mt-2 text-sm opacity-70">
              {who === "anon"
                ? "Device-local. Clearing storage = new identity. That’s fine."
                : "Account-wide. The wallet is still the product."}
            </p>
          </div>
          <Link
            href="/design"
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Make one
          </Link>
        </div>

        {note ? <p className="mt-6 text-xs opacity-60">{note}</p> : null}

        <div className="mt-10 grid gap-3">
          {rows === null ? (
            <div className="rounded-2xl bg-white p-4 text-sm opacity-70 ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
              Loading.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl bg-white p-4 text-sm opacity-70 ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
              Nothing yet.
            </div>
          ) : (
            rows.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white p-4 ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">{p.title || "Untitled"}</div>
                    <div className="mt-1 text-xs opacity-70">
                      {p.type}
                      {p.type === "club" && p.status ? ` · ${p.status}` : ""}
                    </div>
                    {p.subtitle ? (
                      <div className="mt-1 text-xs opacity-60">{p.subtitle}</div>
                    ) : null}
                    {who === "user" && p.type === "streak" ? (
                      <button
                        className="mt-3 rounded-lg px-2 py-1 text-xs opacity-70 ring-1 ring-black/10 hover:opacity-100 dark:ring-white/10"
                        onClick={() => resetStreak(p.id)}
                      >
                        Reset streak
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-2 text-right">
                    <a
                      className="text-xs underline opacity-70 hover:opacity-100"
                      href={`/p/${p.id}/apple.pkpass`}
                    >
                      Apple Wallet
                    </a>
                    <a
                      className="text-xs underline opacity-70 hover:opacity-100"
                      href={`/p/${p.id}/google`}
                    >
                      Google Wallet
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-12 text-xs opacity-50">
          Wallet passes are the artifact. This page is the control panel.
        </div>
      </div>
    </main>
  );
}

