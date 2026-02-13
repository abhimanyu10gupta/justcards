import { NextResponse } from "next/server";

export async function POST() {
  // PassKit can POST logs here. We ignore. Deadpan.
  return new NextResponse(null, { status: 200 });
}

