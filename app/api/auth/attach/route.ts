import { NextResponse } from "next/server";
import { getClientIdFromRequest } from "@/lib/clientId";
import { supabaseAnonServer, supabaseServiceServer } from "@/lib/supabase";

export async function POST(request: Request) {
  const clientId = await getClientIdFromRequest();
  if (!clientId) return new NextResponse("missing client_id", { status: 400 });

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer "))
    return new NextResponse("missing auth", { status: 401 });

  const token = auth.slice("Bearer ".length);
  const anon = supabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) return new NextResponse("bad auth", { status: 401 });

  const userId = data.user.id;
  const supabase = supabaseServiceServer();

  // Attach existing anonymous passes to the user.
  const upd = await supabase
    .from("passes")
    .update({ user_id: userId })
    .eq("client_id", clientId)
    .is("user_id", null);

  if (upd.error) return new NextResponse(upd.error.message, { status: 500 });
  return NextResponse.json({ ok: true });
}

