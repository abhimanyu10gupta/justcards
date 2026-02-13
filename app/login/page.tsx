"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setStatus("Logged in.");
    });
  }, [supabase]);

  async function signIn(provider: "google" | "apple") {
    if (!supabase) {
      setStatus("Missing Supabase env.");
      return;
    }
    setStatus("Opening wallet-shaped door…");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/my`,
      },
    });
    if (error) setStatus(error.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setStatus("Logged out.");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
        <p className="mt-2 text-sm opacity-70">
          Anonymous works. Login is for cross-device persistence and post-payment
          unlocks.
        </p>

        <div className="mt-10 grid gap-3">
          <button
            className="rounded-xl bg-black px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
            onClick={() => signIn("apple")}
          >
            Sign in with Apple
          </button>
          <button
            className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-black ring-1 ring-black/10 dark:bg-zinc-900 dark:text-white dark:ring-white/10"
            onClick={() => signIn("google")}
          >
            Sign in with Google
          </button>
          <button
            className="rounded-xl px-4 py-3 text-sm font-medium opacity-70 ring-1 ring-black/10 hover:opacity-100 dark:ring-white/10"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>

        {status ? (
          <p className="mt-6 text-xs opacity-70">{status}</p>
        ) : (
          <p className="mt-6 text-xs opacity-50">No drama.</p>
        )}
      </div>
    </main>
  );
}

