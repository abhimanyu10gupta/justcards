import { createClient } from "@supabase/supabase-js";
import { env, envOptional } from "@/lib/env";

export function supabaseBrowser() {
  // Client bundle: don't hard-throw during prerender/build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function supabaseAnonServer() {
  // For auth.getUser(token) verification.
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function supabaseServiceServer() {
  const serviceKey =
    envOptional("SUPABASE_SERVICE_ROLE_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

