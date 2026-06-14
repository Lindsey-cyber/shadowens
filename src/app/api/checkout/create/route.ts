import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { computeCheckoutMode } from "@/lib/ens/checkoutMode";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";
import { createEphemeralAddress } from "@/lib/payments/createEphemeralAddress";
import { saveIntent } from "@/lib/payments/intentStore";
import { getMockReputation } from "@/lib/reputation/mock";
import { verifyCheckoutSignature } from "@/lib/auth/verifyCheckoutSignature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const ensName = String(body.ensName ?? "").trim();
  const amount = String(body.amount ?? "").trim();
  const token = String(body.token ?? "USDC").trim();
  const chainId = Number(body.chainId ?? 8453);

  const payer = body.payer as `0x${string}` | undefined;
  const nonce = String(body.nonce ?? "");
  const issuedAt = String(body.issuedAt ?? "");
  const signatureExpiresAt = String(body.expiresAt ?? "");
  const signature = body.signature as `0x${string}` | undefined;

  if (!ensName || !amount) {
    return NextResponse.json(
      { ok: false, error: "missing-ensName-or-amount" },
      { status: 400 }
    );
  }

  if (!payer || !nonce || !issuedAt || !signatureExpiresAt || !signature) {
    return NextResponse.json(
      { ok: false, error: "missing-checkout-signature-fields" },
      { status: 400 }
    );
  }

  if (!Number.isFinite(chainId)) {
    return NextResponse.json(
      { ok: false, error: "invalid-chainId" },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const sigCheck = await verifyCheckoutSignature({
    appUrl,
    ensName,
    amount,
    token,
    chainId,
    payer,
    nonce,
    issuedAt,
    expiresAt: signatureExpiresAt,
    signature,
  });

  if (!sigCheck.ok) {
    return NextResponse.json(
      { ok: false, error: sigCheck.error },
      { status: 401 }
    );
  }

  const resolved = await resolveEnsAgent(ensName);

  if (!resolved.ok) {
    return NextResponse.json(resolved, { status: 404 });
  }

  const heartbeat = computeHeartbeatStatus({
    status: resolved.records.status,
    lastHeartbeat: resolved.records.lastHeartbeat,
    ttlSeconds: resolved.records.heartbeatTtlSeconds,
  });

  const agentId = resolved.records.agentContext.registry.agentId;
  const reputation = getMockReputation(agentId);

  const checkoutMode = computeCheckoutMode({
    heartbeatAllowed: heartbeat.checkoutAllowed,
    heartbeatReason: heartbeat.reason,
    ensAttestationPresent: resolved.ensip25.ensSideAttestationPresent,
    reputation,
    minScore: resolved.records.minScore,
    minClients: resolved.records.minClients,
  });

  if (checkoutMode.mode !== "direct-private-checkout") {
    return NextResponse.json(
      {
        ok: false,
        error: "checkout-not-allowed",
        checkoutMode,
        heartbeat,
        reputation,
      },
      { status: 403 }
    );
  }

  const ephemeral = createEphemeralAddress();

  const now = new Date();
  const intentTtlSeconds = Number(
    process.env.CHECKOUT_INTENT_TTL_SECONDS ?? "600"
  );
  const intentExpiresAt = new Date(now.getTime() + intentTtlSeconds * 1000);

  const intent = saveIntent({
    intentId: `pay_${randomUUID()}`,
    ensName,
    agentId,
    amount,
    token,
    chainId,
    payer: sigCheck.payer,
    paymentAddress: ephemeral.address,
    privateKeyDevOnly: ephemeral.privateKey,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: intentExpiresAt.toISOString(),
  });

  return NextResponse.json({
    ok: true,
    intent: {
      intentId: intent.intentId,
      ensName: intent.ensName,
      agentId: intent.agentId,
      amount: intent.amount,
      token: intent.token,
      chainId: intent.chainId,
      payer: intent.payer,
      paymentAddress: intent.paymentAddress,
      status: intent.status,
      createdAt: intent.createdAt,
      expiresAt: intent.expiresAt,
    },
  });
}