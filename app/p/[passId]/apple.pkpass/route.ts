import { NextResponse } from "next/server";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { envOptional } from "@/lib/env";
import { supabaseServiceServer } from "@/lib/supabase";

function b64pem(name: string) {
  const v = envOptional(name);
  if (!v) return null;
  return Buffer.from(v, "base64");
}

function daysSince(startDate: string) {
  // startDate is YYYY-MM-DD
  const [y, m, d] = startDate.split("-").map((x) => Number(x));
  const start = Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diff = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
  return diff + 1; // Day 1 on start date
}

async function svgToPng(svg: string, width: number, height: number) {
  return sharp(Buffer.from(svg))
    .resize(width, height, { fit: "cover" })
    .png()
    .toBuffer();
}

function baseSvg(label: string) {
  const safe = label.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
    <filter id="n">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 .08 0"/>
    </filter>
  </defs>
  <rect width="800" height="400" fill="url(#g)"/>
  <rect width="800" height="400" filter="url(#n)"/>
  <text x="40" y="110" fill="#ffffff" font-family="ui-sans-serif, system-ui" font-size="54" font-weight="700" opacity="0.92">${safe}</text>
  <text x="40" y="160" fill="#ffffff" font-family="ui-sans-serif, system-ui" font-size="20" opacity="0.55">wallet is the product</text>
</svg>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  const { passId } = await params;

  const wwdr = b64pem("APPLE_WWDR_PEM_BASE64");
  const signerCert = b64pem("APPLE_SIGNER_CERT_PEM_BASE64");
  const signerKey = b64pem("APPLE_SIGNER_KEY_PEM_BASE64");

  if (!wwdr || !signerCert || !signerKey) {
    return new NextResponse("Apple Wallet not configured", { status: 501 });
  }

  const supabase = supabaseServiceServer();
  const { data: pass, error } = await supabase
    .from("passes")
    .select("*")
    .eq("id", passId)
    .single();

  if (error || !pass) return new NextResponse("not found", { status: 404 });

  const org = envOptional("APPLE_ORGANIZATION_NAME") ?? "cardlol";
  const teamIdentifier = envOptional("APPLE_TEAM_IDENTIFIER");
  const passTypeIdentifier = envOptional("APPLE_PASS_TYPE_IDENTIFIER");
  if (!teamIdentifier || !passTypeIdentifier) {
    return new NextResponse("Apple Wallet missing identifiers", { status: 501 });
  }

  const title = (pass.title as string) || "cardlol";
  const subtitle = (pass.subtitle as string) || "";

  const isStreak = pass.type === "streak";
  const isClub = pass.type === "club";
  const day =
    isStreak && pass.start_date ? daysSince(String(pass.start_date)) : null;

  if (isStreak && typeof day === "number" && pass.streak_last_day !== day) {
    await supabase
      .from("passes")
      .update({ streak_last_day: day })
      .eq("id", pass.id);
  }

  let status = isClub ? (pass.status as string | null) : null;
  if (isClub && pass.club_slug) {
    const { data: club } = await supabase
      .from("clubs")
      .select("expiry_date")
      .eq("slug", String(pass.club_slug))
      .single();
    if (club?.expiry_date) {
      const expiry = new Date(String(club.expiry_date) + "T00:00:00Z").getTime();
      if (Date.now() > expiry) status = "expired";
    }
    if (status === "expired" && pass.status !== "expired") {
      // Keep it in sync with reality.
      await supabase.from("passes").update({ status: "expired" }).eq("id", pass.id);
    }
  }

  const passJson: Record<string, unknown> = {
    formatVersion: 1,
    passTypeIdentifier,
    teamIdentifier,
    organizationName: org,
    description: "A pass that should not exist.",
    serialNumber: pass.id,
    backgroundColor: "#000000",
    foregroundColor: "#ffffff",
    labelColor: "#a1a1aa",
    generic: {
      primaryFields: [
        {
          key: "primary",
          label: isStreak ? "DAY" : "TITLE",
          value: isStreak ? `Day ${day ?? 1}` : title,
        },
      ],
      secondaryFields: subtitle
        ? [{ key: "sub", label: "SUB", value: subtitle }]
        : [],
      auxiliaryFields: isClub
        ? [
            {
              key: "status",
              label: "STATUS",
              value: status ?? "pending",
            },
          ]
        : [],
      backFields: [
        { key: "id", label: "ID", value: pass.id },
        {
          key: "note",
          label: "NOTE",
          value: "wallet is the artifact. backend is glue.",
        },
      ],
    },
    barcodes: [
      {
        message: String(pass.id),
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
        altText: "cardlol",
      },
    ],
  };

  // Optional: enable Apple Wallet web service updates (device registration + pass fetch).
  // Needs PUBLIC_BASE_URL and our v1 endpoints.
  const baseUrl = envOptional("PUBLIC_BASE_URL");
  if (baseUrl && pass.apple_auth_token) {
    passJson["webServiceURL"] = `${baseUrl.replace(/\/$/, "")}/api/apple`;
    passJson["authenticationToken"] = String(pass.apple_auth_token);
  }

  // Required static images. We generate them at runtime from SVG.
  const iconSvg = baseSvg("c");
  const logoSvg = baseSvg("cardlol");

  const icon1 = await svgToPng(iconSvg, 29, 29);
  const icon2 = await svgToPng(iconSvg, 58, 58);
  const icon3 = await svgToPng(iconSvg, 87, 87);

  const logo1 = await svgToPng(logoSvg, 160, 50);
  const logo2 = await svgToPng(logoSvg, 320, 100);

  // Optional strip image: use upload if present (it will be embedded into the pass).
  let strip1: Buffer | null = null;
  let strip2: Buffer | null = null;
  if (pass.upload_path) {
    const dl = await supabase.storage.from("uploads").download(pass.upload_path);
    if (!dl.error && dl.data) {
      const arr = await dl.data.arrayBuffer();
      const buf = Buffer.from(arr);
      strip1 = await sharp(buf)
        .rotate()
        .resize(375, 144, { fit: "cover" })
        .png()
        .toBuffer();
      strip2 = await sharp(buf)
        .rotate()
        .resize(750, 288, { fit: "cover" })
        .png()
        .toBuffer();
    }
  }
  if (!strip1 || !strip2) {
    const stripSvg = baseSvg(title);
    strip1 = await svgToPng(stripSvg, 375, 144);
    strip2 = await svgToPng(stripSvg, 750, 288);
  }

  const buffers: Record<string, Buffer> = {
    "pass.json": Buffer.from(JSON.stringify(passJson, null, 2)),
    "icon.png": icon1,
    "icon@2x.png": icon2,
    "icon@3x.png": icon3,
    "logo.png": logo1,
    "logo@2x.png": logo2,
    "strip.png": strip1,
    "strip@2x.png": strip2,
  };

  const pkpass = new PKPass(buffers, {
    wwdr,
    signerCert,
    signerKey,
    signerKeyPassphrase: envOptional("APPLE_SIGNER_KEY_PASSPHRASE") ?? undefined,
  });

  const out = pkpass.getAsBuffer();
  const body = new Uint8Array(out);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${pass.id}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}

