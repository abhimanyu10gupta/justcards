import { NextResponse } from "next/server";
import sharp from "sharp";
import { envFlag } from "@/lib/env";
import { getClientIdFromRequest } from "@/lib/clientId";
import { supabaseAnonServer, supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export async function POST(request: Request) {
  if (!envFlag("ENABLE_IMAGE_UPLOADS", true)) {
    return new NextResponse("uploads disabled", { status: 403 });
  }

  const clientId = await getClientIdFromRequest();
  if (!clientId) return new NextResponse("missing client_id", { status: 400 });

  const auth = request.headers.get("authorization");
  let userId: string | null = null;
  let unlocked = false;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length);
    const anon = supabaseAnonServer();
    const { data } = await anon.auth.getUser(token);
    userId = data.user?.id ?? null;
    const meta = data.user?.user_metadata;
    unlocked = isRecord(meta) && meta.unlocked === true;
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File))
    return new NextResponse("missing file", { status: 400 });

  const bytes = file.size ?? 0;
  if (bytes > 2_200_000) return new NextResponse("too big", { status: 413 });

  const type = file.type;
  if (type !== "image/jpeg" && type !== "image/png")
    return new NextResponse("jpg/png only", { status: 415 });

  const input = Buffer.from(await file.arrayBuffer());

  // auto-compress on upload (viral-first)
  const out = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  const path = `uploads/${clientId}/${crypto.randomUUID()}.jpg`;
  const supabase = supabaseServiceServer();

  const up = await supabase.storage.from("uploads").upload(path, out, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (up.error) return new NextResponse(up.error.message, { status: 500 });

  const ttlHours = 72;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  // ephemeral by default (anonymous launch behavior)
  const ins = await supabase.from("uploads").insert({
    client_id: clientId,
    user_id: userId,
    path,
    content_type: "image/jpeg",
    bytes: out.byteLength,
    ephemeral: !(userId && unlocked),
    expires_at: userId && unlocked ? null : expiresAt,
  });
  if (ins.error) return new NextResponse(ins.error.message, { status: 500 });

  return NextResponse.json({ path });
}

