import { NextRequest, NextResponse } from "next/server";
import { computeCheckoutMode } from "@/lib/ens/checkoutMode";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";
import { createEphemeralAddress } from "@/lib/payments/createEphemeralAddress";
import { saveIntent } from "@/lib/payments/intentStore";
import { getMockReputation } from "@/lib/reputation/mock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const ensName = String(body.ensName ?? "");
  const amount = String(body.amount ?? "");
  const token = String(body.token ?? "USDC");
  const chainId = Number(body.chainId ?? 8453);

  if (!ensName || !amount) {
    return NextResponse.json(
      { ok: false, error: "missing-ensName-or-amount" },
      { status: 400 }
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
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  const intent = saveIntent({
    intentId: `pay_${crypto.randomUUID()}`,
    ensName,
    agentId,
    amount,
    token,
    chainId,
    paymentAddress: ephemeral.address,
    privateKeyDevOnly: ephemeral.privateKey,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
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
      paymentAddress: intent.paymentAddress,
      status: intent.status,
      createdAt: intent.createdAt,
      expiresAt: intent.expiresAt,
    },
  });
}