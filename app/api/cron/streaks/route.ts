import { NextResponse } from "next/server";
import http2 from "node:http2";
import { SignJWT, importPKCS8 } from "jose";
import { envOptional } from "@/lib/env";
import { supabaseServiceServer } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeDevices(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (isRecord(v) ? v : null))
    .filter((v): v is Record<string, unknown> => Boolean(v))
    .map((v) => ({
      deviceLibraryIdentifier: String(v.deviceLibraryIdentifier ?? ""),
      pushToken: String(v.pushToken ?? ""),
    }))
    .filter((d) => d.deviceLibraryIdentifier && d.pushToken);
}

function daysSince(startDate: string) {
  const [y, m, d] = startDate.split("-").map((x) => Number(x));
  const start = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
  return diff + 1;
}

async function apnsAuthToken() {
  const keyId = envOptional("APPLE_APNS_KEY_ID");
  const teamId = envOptional("APPLE_APNS_TEAM_ID");
  const p8b64 = envOptional("APPLE_APNS_PRIVATE_KEY_P8_BASE64");
  if (!keyId || !teamId || !p8b64) return null;

  const pkcs8 = Buffer.from(p8b64, "base64").toString("utf8");
  const key = await importPKCS8(pkcs8, "ES256");
  const iat = Math.floor(Date.now() / 1000);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuedAt(iat)
    .setIssuer(teamId)
    .sign(key);
}

async function pushOne({
  host,
  bearer,
  topic,
  pushToken,
}: {
  host: string;
  bearer: string;
  topic: string;
  pushToken: string;
}) {
  return await new Promise<{ ok: boolean; status: number }>((resolve) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", () => resolve({ ok: false, status: 0 }));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      authorization: `bearer ${bearer}`,
      "apns-topic": topic,
      "apns-push-type": "background",
      "apns-priority": "5",
    });

    let status = 0;
    req.on("response", (headers) => {
      const s = headers[":status"];
      status = typeof s === "number" ? s : Number(s ?? 0);
    });
    req.on("error", () => resolve({ ok: false, status: 0 }));
    req.on("end", () => {
      client.close();
      resolve({ ok: status >= 200 && status < 300, status });
    });

    req.end("{}");
  });
}

export async function POST(request: Request) {
  const secret = envOptional("CRON_SECRET");
  if (!secret) return new NextResponse("missing CRON_SECRET", { status: 500 });

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return new NextResponse("forbidden", { status: 403 });

  const topic = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!topic) return new NextResponse("missing APPLE_PASS_TYPE_IDENTIFIER", { status: 500 });

  const bearer = await apnsAuthToken();
  if (!bearer) {
    return NextResponse.json({ ok: false, reason: "missing APNs env" }, { status: 501 });
  }

  const host = envOptional("APPLE_APNS_USE_SANDBOX") === "true"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";

  const supabase = supabaseServiceServer();
  const { data, error } = await supabase
    .from("passes")
    .select("id,start_date,streak_last_day,apple_devices,type")
    .eq("type", "streak");
  if (error) return new NextResponse(error.message, { status: 500 });

  let updated = 0;
  let pushes = 0;
  let pushFails = 0;

  for (const p of data ?? []) {
    if (!p.start_date) continue;
    const day = daysSince(String(p.start_date));
    if (p.streak_last_day === day) continue;

    // Mark updated; devices will fetch the latest pass.
    const upd = await supabase
      .from("passes")
      .update({ streak_last_day: day })
      .eq("id", p.id);
    if (upd.error) continue;
    updated += 1;

    const devices = normalizeDevices(p.apple_devices);
    for (const d of devices) {
      const r = await pushOne({ host, bearer, topic, pushToken: d.pushToken });
      pushes += 1;
      if (!r.ok) pushFails += 1;
    }
  }

  return NextResponse.json({ ok: true, updated, pushes, pushFails });
}

