import { NextResponse } from "next/server";
import { supabaseServiceServer } from "@/lib/supabase";
import { envOptional } from "@/lib/env";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }
) {
  const { deviceLibraryIdentifier, passTypeIdentifier } = await params;
  const expectedPassType = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!expectedPassType || passTypeIdentifier !== expectedPassType) {
    return new NextResponse("not found", { status: 404 });
  }

  const sinceParam = new URL(request.url).searchParams.get("passesUpdatedSince");
  const since = sinceParam ? Number(sinceParam) : null;

  const supabase = supabaseServiceServer();
  const { data, error } = await supabase
    .from("passes")
    .select("id,updated_at,apple_devices");
  if (error) return new NextResponse(error.message, { status: 500 });

  const serialNumbers: string[] = [];
  for (const p of data ?? []) {
    const devices = normalizeDevices(p.apple_devices);
    const has = devices.some((d) => d.deviceLibraryIdentifier === deviceLibraryIdentifier);
    if (!has) continue;

    if (since !== null) {
      const updated = Date.parse(String(p.updated_at));
      const updatedSeconds = Math.floor(updated / 1000);
      if (!(updatedSeconds > since)) continue;
    }
    serialNumbers.push(String(p.id));
  }

  const lastUpdated = Math.floor(Date.now() / 1000);
  return NextResponse.json({ serialNumbers, lastUpdated });
}

