import { NextResponse } from "next/server";
import crypto from "crypto";
import { saveCheckoutNonce } from "@/lib/auth/nonceStore";

export async function POST() {
  const ttlSeconds = Number(process.env.CHECKOUT_SIGNATURE_TTL_SECONDS ?? "300");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const nonce = crypto.randomUUID();

  saveCheckoutNonce({
    nonce,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false,
  });

  return NextResponse.json({
    ok: true,
    nonce,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });
}