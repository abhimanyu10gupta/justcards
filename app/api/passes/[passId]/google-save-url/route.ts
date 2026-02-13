import { NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";
import { envOptional } from "@/lib/env";
import { supabaseServiceServer } from "@/lib/supabase";

type LocalizedString = { defaultValue: { language: string; value: string } };
type Image = { sourceUri: { uri: string }; contentDescription?: LocalizedString };

function ls(value: string) {
  return { defaultValue: { language: "en-US", value } } satisfies LocalizedString;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  const { passId } = await params;

  const issuerId = envOptional("GOOGLE_WALLET_ISSUER_ID");
  const classId = envOptional("GOOGLE_WALLET_CLASS_ID");
  const email = envOptional("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL");
  const pk = envOptional("GOOGLE_WALLET_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!issuerId || !classId || !email || !pk) {
    return new NextResponse("Google Wallet not configured", { status: 501 });
  }

  const supabase = supabaseServiceServer();
  const { data: pass, error } = await supabase
    .from("passes")
    .select("*")
    .eq("id", passId)
    .single();
  if (error || !pass) return new NextResponse("not found", { status: 404 });

  const objectId = `${issuerId}.${String(pass.id).replace(/[^A-Za-z0-9._-]/g, "_")}`;

  // Keep Google image template-only unless the upload is permanent.
  // (Google fetches remote images; if your backend deletes them, the image can break.)
  const includeUploadImage = !pass.upload_ephemeral && Boolean(pass.upload_path);

  let heroImage: Image | undefined = undefined;
  if (includeUploadImage) {
    const signed = await supabase.storage
      .from("uploads")
      .createSignedUrl(String(pass.upload_path), 60 * 60 * 24 * 7);
    if (!signed.error && signed.data?.signedUrl) {
      heroImage = {
        sourceUri: { uri: signed.data.signedUrl },
        contentDescription: ls("background"),
      };
    }
  }

  const title = (pass.title as string) || "cardlol";
  const subtitle = (pass.subtitle as string) || "";

  const newObject: Record<string, unknown> = {
    id: objectId,
    classId,
    genericType: "GENERIC_OTHER",
    state: "ACTIVE",
    cardTitle: ls("cardlol"),
    header: ls(title),
    subheader: subtitle ? ls(subtitle) : undefined,
    hexBackgroundColor: "#000000",
    barcode: { type: "QR_CODE", value: String(pass.id) },
    heroImage,
    textModulesData: [
      { id: "type", header: "TYPE", body: String(pass.type) },
      ...(pass.type === "club"
        ? [{ id: "status", header: "STATUS", body: String(pass.status ?? "pending") }]
        : []),
    ],
  };

  // jose needs PKCS8 for importPKCS8. Most Google keys are PKCS8.
  const privateKey = await importPKCS8(
    pk.includes("\\n") ? pk.replace(/\\n/g, "\n") : pk,
    "RS256"
  );

  const iat = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: email,
    aud: "google",
    typ: "savetowallet",
    iat,
    origins: [],
    payload: { genericObjects: [newObject] },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const url = `https://pay.google.com/gp/v/save/${jwt}`;
  return NextResponse.json({ url });
}

