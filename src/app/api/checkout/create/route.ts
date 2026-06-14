import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAddress } from "viem";
import { getAgentTreasuryAddress } from "@/lib/agents/treasury";
import { computeCheckoutMode } from "@/lib/ens/checkoutMode";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";
import { createEphemeralAddress } from "@/lib/payments/createEphemeralAddress";
import { buildCheckoutName } from "@/lib/payments/checkoutName";
import { savePaymentIntent } from "@/lib/storage/intents";
import { getBigQueryReputation } from "@/lib/reputation/bigquery";
import { verifyCheckoutSignature } from "@/lib/auth/verifyCheckoutSignature";
import {
  CHECKOUT_CHAIN_ID,
  DEFAULT_PAYMENT_AMOUNT,
  DEFAULT_PAYMENT_TOKEN,
} from "@/lib/payments/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_BUYER_WALLET =
  "0x056ff64607a69d46a44da451B7e79DA246048a8A";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const ensName = String(body.ensName ?? "").trim();
  const amount = String(body.amount ?? DEFAULT_PAYMENT_AMOUNT).trim();
  const token = String(body.token ?? DEFAULT_PAYMENT_TOKEN).trim();
  const chainId = Number(body.chainId ?? CHECKOUT_CHAIN_ID);

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

  if (chainId !== CHECKOUT_CHAIN_ID) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid-chainId",
        expectedChainId: CHECKOUT_CHAIN_ID,
        receivedChainId: chainId,
      },
      { status: 400 }
    );
  }

  if (amount !== DEFAULT_PAYMENT_AMOUNT) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid-amount",
        expectedAmount: DEFAULT_PAYMENT_AMOUNT,
        receivedAmount: amount,
      },
      { status: 400 }
    );
  }

  if (token !== DEFAULT_PAYMENT_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid-token",
        expectedToken: DEFAULT_PAYMENT_TOKEN,
        receivedToken: token,
      },
      { status: 400 }
    );
  }

  const allowedPayer =
    process.env.NEXT_PUBLIC_ALLOWED_PAYER_ADDRESS ?? DEFAULT_BUYER_WALLET;

  try {
    if (getAddress(payer) !== getAddress(allowedPayer as `0x${string}`)) {
      return NextResponse.json(
        {
          ok: false,
          error: "payer-not-allowed",
          expectedPayer: allowedPayer,
          receivedPayer: payer,
        },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid-payer-address" },
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

  const reputation = await getBigQueryReputation(agentId);

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
  const agentTreasury = getAgentTreasuryAddress(ensName);

  const now = new Date();
  const intentTtlSeconds = Number(
    process.env.CHECKOUT_INTENT_TTL_SECONDS ?? "600"
  );
  const intentExpiresAt = new Date(now.getTime() + intentTtlSeconds * 1000);

  const intentId = `pay_${randomUUID()}`;
  const checkoutName = buildCheckoutName(intentId, ensName);

  const intent = await savePaymentIntent({
    intentId,
    ensName,
    agentId,
    amount,
    token,
    chainId,
    payer: sigCheck.payer,
    checkoutName,
    paymentAddress: ephemeral.address,
    agentTreasury,
    privateKeyDevOnly: ephemeral.privateKey,
    settlementStatus: "not-started",
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
      checkoutName: intent.checkoutName,
      paymentAddress: intent.paymentAddress,
      status: intent.status,
      createdAt: intent.createdAt,
      expiresAt: intent.expiresAt,
    },
    checkoutMode,
    reputation,
    heartbeat,
  });
}