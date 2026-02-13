import { NextResponse } from "next/server";
import { supabaseServiceServer } from "@/lib/supabase";
import { envOptional } from "@/lib/env";

function authorized(request: Request, authToken: string | null) {
  const h = request.headers.get("authorization");
  if (!h || !authToken) return false;
  return h === `ApplePass ${authToken}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }
) {
  const { passTypeIdentifier, serialNumber } = await params;
  const expectedPassType = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!expectedPassType || passTypeIdentifier !== expectedPassType) {
    return new NextResponse("not found", { status: 404 });
  }

  const supabase = supabaseServiceServer();
  const { data: pass } = await supabase
    .from("passes")
    .select("id,apple_auth_token")
    .eq("id", serialNumber)
    .single();
  if (!pass) return new NextResponse("not found", { status: 404 });
  if (!authorized(request, (pass.apple_auth_token as string | null) ?? null)) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  // Minimal: redirect to the generator endpoint.
  const url = new URL(request.url);
  url.pathname = `/p/${serialNumber}/apple.pkpass`;
  url.search = "";
  return NextResponse.redirect(url, 302);
}

