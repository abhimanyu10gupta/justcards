import { NextResponse } from "next/server";
import { supabaseAnonServer, supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer "))
    return new NextResponse("missing auth", { status: 401 });

  const token = auth.slice("Bearer ".length);
  const anon = supabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return new NextResponse("bad auth", { status: 401 });

  // v0 stub: mark user unlocked in auth metadata.
  const svc = supabaseServiceServer();
  const prev = isRecord(data.user.user_metadata) ? data.user.user_metadata : {};
  const upd = await svc.auth.admin.updateUserById(data.user.id, {
    user_metadata: { ...prev, unlocked: true },
  });

  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}

