"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function UnlockPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const [status, setStatus] = useState<string>("");

  async function fakePay() {
    setStatus("Processing $4 of chaos…");

    // v0 stub: "payment succeeded" then require login, then mark unlock in user_metadata.
    if (!supabase) {
      setStatus("Missing Supabase env.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("Login required after payment. Do that part now.");
      router.push("/login");
      return;
    }

    const res = await fetch("/api/payments/unlock", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setStatus(await res.text());
      return;
    }
    setStatus("Unlocked.");
    router.push("/my");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Unlock</h1>
        <p className="mt-2 text-sm opacity-70">
          One-time. $4. Unlimited cards + permanence.
        </p>

        <div className="mt-10 grid gap-3">
          <button
            onClick={fakePay}
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Pay $4 (stub)
          </button>
          <Link
            href="/login"
            className="rounded-xl px-4 py-3 text-center text-sm font-medium opacity-70 ring-1 ring-black/10 hover:opacity-100 dark:ring-white/10"
          >
            Login
          </Link>
        </div>

        {status ? <p className="mt-6 text-xs opacity-70">{status}</p> : null}
      </div>
    </main>
  );
}

