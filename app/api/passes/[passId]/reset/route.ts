import { NextResponse } from "next/server";
import { supabaseAnonServer, supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getUserFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const anon = supabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  const { passId } = await params;
  const user = await getUserFromAuthHeader(request.headers.get("authorization"));
  if (!user) return new NextResponse("login required", { status: 401 });

  const meta = user.user_metadata;
  const unlocked = isRecord(meta) && meta.unlocked === true;
  if (!unlocked) return new NextResponse("paywall", { status: 402 });

  const supabase = supabaseServiceServer();
  const { data: pass, error } = await supabase
    .from("passes")
    .select("id,type,user_id")
    .eq("id", passId)
    .single();
  if (error || !pass) return new NextResponse("not found", { status: 404 });
  if (pass.type !== "streak") return new NextResponse("not a streak pass", { status: 400 });
  if (pass.user_id !== user.id) return new NextResponse("forbidden", { status: 403 });

  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(today.getUTCDate()).padStart(2, "0");
  const start_date = `${yyyy}-${mm}-${dd}`;

  const upd = await supabase
    .from("passes")
    .update({ start_date })
    .eq("id", passId);
  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });

  return NextResponse.json({ ok: true, start_date });
}

