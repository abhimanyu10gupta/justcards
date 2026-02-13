import { NextResponse } from "next/server";
import { getClientIdFromRequest } from "@/lib/clientId";
import { supabaseAnonServer, supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getUserIdFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const supabase = supabaseAnonServer();
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}

async function isUnlocked(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  const supabase = supabaseAnonServer();
  const { data } = await supabase.auth.getUser(token);
  const meta = data.user?.user_metadata;
  if (!isRecord(meta)) return false;
  return meta.unlocked === true;
}

export async function GET(request: Request) {
  const clientId = await getClientIdFromRequest();
  if (!clientId) return new NextResponse("missing client_id", { status: 400 });

  const auth = request.headers.get("authorization");
  const userId = await getUserIdFromAuthHeader(auth);

  const supabase = supabaseServiceServer();
  const q = supabase
    .from("passes")
    .select(
      "id,type,title,subtitle,status,club_slug,start_date,created_at",
    )
    .order("created_at", { ascending: false });

  const { data, error } = userId
    ? await q.eq("user_id", userId)
    : await q.eq("client_id", clientId);

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ passes: data ?? [] });
}

export async function POST(request: Request) {
  const clientId = await getClientIdFromRequest();
  if (!clientId) return new NextResponse("missing client_id", { status: 400 });

  const auth = request.headers.get("authorization");
  const userId = await getUserIdFromAuthHeader(auth);
  const unlocked = await isUnlocked(auth);

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (!isRecord(bodyUnknown)) return new NextResponse("bad json", { status: 400 });
  const body = bodyUnknown;

  const type = body.type as "meme" | "streak" | "club";
  const title = String(body.title ?? "").slice(0, 80);
  const subtitle = String(body.subtitle ?? "").slice(0, 80);
  const upload_path =
    typeof body.upload_path === "string" ? body.upload_path : null;

  if (!["meme", "streak", "club"].includes(type))
    return new NextResponse("bad type", { status: 400 });

  const supabase = supabaseServiceServer();

  // Paywall: multiple cards. One free per identity.
  if (!unlocked) {
    const { count } = await supabase
      .from("passes")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);
    if ((count ?? 0) >= 1) return new NextResponse("paywall", { status: 402 });
  }

  const row: Record<string, unknown> = {
    client_id: clientId,
    user_id: userId,
    type,
    title,
    subtitle,
    upload_path,
    upload_ephemeral: !Boolean(userId && unlocked),
  };

  if (type === "streak") {
    // store a date. day X is computed at render time.
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    row.start_date = `${yyyy}-${mm}-${dd}`;
  }

  if (type === "club") {
    row.club_slug = body.club_slug ?? null;
    row.status = body.status ?? "pending";
  }

  // Apple auth token (kept in-row on purpose)
  row.apple_auth_token = crypto.randomUUID().replace(/-/g, "");

  const { data, error } = await supabase
    .from("passes")
    .insert(row)
    .select("id")
    .single();
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ passId: data.id });
}

