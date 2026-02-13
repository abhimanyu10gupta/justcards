import { NextResponse } from "next/server";
import { supabaseServiceServer } from "@/lib/supabase";
import { envOptional } from "@/lib/env";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getPass(serialNumber: string) {
  const supabase = supabaseServiceServer();
  const { data } = await supabase.from("passes").select("*").eq("id", serialNumber).single();
  return { supabase, pass: data ?? null };
}

function authorized(request: Request, authToken: string | null) {
  const h = request.headers.get("authorization");
  if (!h || !authToken) return false;
  return h === `ApplePass ${authToken}`;
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
  const expectedPassType = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!expectedPassType || passTypeIdentifier !== expectedPassType) {
    return new NextResponse("not found", { status: 404 });
  }

  const { supabase, pass } = await getPass(serialNumber);
  if (!pass) return new NextResponse("not found", { status: 404 });
  if (!authorized(request, (pass.apple_auth_token as string | null) ?? null)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  if (!isRecord(bodyUnknown) || typeof bodyUnknown.pushToken !== "string") {
    return new NextResponse("bad request", { status: 400 });
  }
  const pushToken = bodyUnknown.pushToken;

  const devices = normalizeDevices(pass.apple_devices);
  const existingIndex = devices.findIndex(
    (d) => d.deviceLibraryIdentifier === deviceLibraryIdentifier
  );
  const nextDevices =
    existingIndex >= 0
      ? devices.map((d, i) =>
          i === existingIndex ? { deviceLibraryIdentifier, pushToken } : d
        )
      : [...devices, { deviceLibraryIdentifier, pushToken }];

  const upd = await supabase
    .from("passes")
    .update({ apple_devices: nextDevices })
    .eq("id", serialNumber);
  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });

  return new NextResponse(null, { status: existingIndex >= 0 ? 200 : 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
  const expectedPassType = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!expectedPassType || passTypeIdentifier !== expectedPassType) {
    return new NextResponse("not found", { status: 404 });
  }

  const { supabase, pass } = await getPass(serialNumber);
  if (!pass) return new NextResponse("not found", { status: 404 });
  if (!authorized(request, (pass.apple_auth_token as string | null) ?? null)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const devices = normalizeDevices(pass.apple_devices);
  const nextDevices = devices.filter(
    (d) => d.deviceLibraryIdentifier !== deviceLibraryIdentifier
  );

  const upd = await supabase
    .from("passes")
    .update({ apple_devices: nextDevices })
    .eq("id", serialNumber);
  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });

  return new NextResponse(null, { status: 200 });
}

