"use client";

import { useEffect } from "react";

const LS_KEY = "wallet_client_id";
const COOKIE_KEY = "cid";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`)
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string) {
  // Dead simple, long-lived, Lax.
  const maxAge = 60 * 60 * 24 * 365; // 1y
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function isUuidLike(v: string) {
  // Good enough.
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v
  );
}

export function getOrCreateClientId() {
  const fromLs = (() => {
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  })();
  if (fromLs && isUuidLike(fromLs)) return fromLs;

  const fromCookie = readCookie(COOKIE_KEY);
  if (fromCookie && isUuidLike(fromCookie)) {
    try {
      localStorage.setItem(LS_KEY, fromCookie);
    } catch {
      // ignore
    }
    return fromCookie;
  }

  const next = crypto.randomUUID();
  try {
    localStorage.setItem(LS_KEY, next);
  } catch {
    // ignore
  }
  writeCookie(COOKIE_KEY, next);
  return next;
}

export default function IdentityBootstrap() {
  useEffect(() => {
    // Ensure both cookie + localStorage exist early.
    getOrCreateClientId();
  }, []);

  return null;
}

