import { cookies, headers } from "next/headers";

export async function getClientIdFromRequest() {
  // Prefer cookie, fallback to header.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieCid = cookieStore.get("cid")?.value;
  if (cookieCid) return cookieCid;
  const headerCid = headerStore.get("x-client-id");
  if (headerCid) return headerCid;
  return null;
}

