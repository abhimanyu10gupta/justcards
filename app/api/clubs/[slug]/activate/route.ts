import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const bodyUnknown: unknown = await request.json().catch(() => null);
  const body = isRecord(bodyUnknown) ? bodyUnknown : {};
  const passId = String(body.passId ?? "");
  const code = String(body.code ?? "");
  if (!passId || !code) return new NextResponse("missing", { status: 400 });

  const supabase = supabaseServiceServer();
  const { data: club, error: clubErr } = await supabase
    .from("clubs")
    .select("slug,expiry_date,activation_code_hash,name")
    .eq("slug", slug)
    .single();
  if (clubErr || !club) return new NextResponse("club not found", { status: 404 });

  const ok = sha256Hex(code.trim()) === String(club.activation_code_hash);
  if (!ok) return new NextResponse("bad code", { status: 401 });

  const expiry = new Date(String(club.expiry_date) + "T00:00:00Z").getTime();
  const now = Date.now();
  const status = now > expiry ? "expired" : "active";

  const upd = await supabase
    .from("passes")
    .update({
      status,
      club_slug: slug,
      title: club.name,
      subtitle: `Expires ${club.expiry_date}`,
    })
    .eq("id", passId)
    .eq("club_slug", slug);

  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });
  return NextResponse.json({ ok: true, status });
}

