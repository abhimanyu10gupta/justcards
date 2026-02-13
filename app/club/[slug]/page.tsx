"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

type Club = { slug: string; name: string; expiry_date: string };

export default function ClubPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [club, setClub] = useState<Club | null>(null);
  const [passId, setPassId] = useState<string | null>(null);
  const [code, setCode] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/clubs/${params.slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as { club: Club };
      })
      .then((j) => setClub(j.club))
      .catch((e) => setNote(String(e?.message ?? e)));
  }, [params.slug]);

  async function mint() {
    if (!club) return;
    setBusy(true);
    setNote("");
    try {
      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token ?? null
        : null;

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: "club",
          title: club.name,
          subtitle: `Expires ${club.expiry_date}`,
          club_slug: club.slug,
          status: "pending",
        }),
      });
      if (res.status === 402) {
        router.push("/unlock");
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { passId: string };
      setPassId(json.passId);
      setNote("Pending.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote(msg);
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!club || !passId) return;
    setBusy(true);
    setNote("");
    try {
      const res = await fetch(`/api/clubs/${club.slug}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId, code }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { status: string };
      setNote(json.status === "active" ? "Active." : "Expired.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">
          {club ? club.name : "Club"}
        </h1>
        <p className="mt-2 text-sm opacity-70">
          {club ? `Expires ${club.expiry_date}.` : "Loading."}
        </p>

        <div className="mt-10 grid gap-3 rounded-2xl bg-white p-5 ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
          {!passId ? (
            <button
              disabled={!club || busy}
              onClick={mint}
              className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {busy ? "Making…" : "Make membership pass"}
            </button>
          ) : (
            <>
              <div className="text-sm">
                Status: <span className="opacity-70">{note || "Pending."}</span>
              </div>

              <div className="grid gap-2">
                <div className="text-xs opacity-60">Activation code</div>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-xl bg-transparent px-3 py-2 ring-1 ring-black/10 dark:ring-white/10"
                  placeholder="enter code"
                />
              </div>

              <button
                disabled={busy || !code.trim()}
                onClick={activate}
                className="rounded-xl px-4 py-3 text-sm font-medium ring-1 ring-black/10 disabled:opacity-50 dark:ring-white/10"
              >
                {busy ? "Checking…" : "Activate"}
              </button>

              <div className="grid gap-2 pt-2">
                <a
                  className="text-sm underline opacity-70 hover:opacity-100"
                  href={`/p/${passId}/apple.pkpass`}
                >
                  Add to Apple Wallet
                </a>
                <a
                  className="text-sm underline opacity-70 hover:opacity-100"
                  href={`/p/${passId}/google`}
                >
                  Add to Google Wallet
                </a>
              </div>
            </>
          )}
        </div>

        {passId ? (
          <p className="mt-6 text-xs opacity-50">
            Card was issued as Pending. Activation flips it to Active immediately.
          </p>
        ) : null}
      </div>
    </main>
  );
}

