import { NextResponse } from "next/server";
import { supabaseServiceServer } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = supabaseServiceServer();
  const { data, error } = await supabase
    .from("clubs")
    .select("slug,name,expiry_date")
    .eq("slug", slug)
    .single();

  if (error || !data) return new NextResponse("not found", { status: 404 });
  return NextResponse.json({ club: data });
}

