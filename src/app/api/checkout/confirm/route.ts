import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "viem";
import { getPaymentIntent, updatePaymentIntent } from "@/lib/storage/intents";
import { verifyUsdcTransfer } from "@/lib/payments/verifyUsdcTransfer";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const intentId = body.intentId;
  const txHash = body.txHash as `0x${string}`;
  const payer = body.payer as `0x${string}`;

  if (!intentId || !txHash || !payer) {
    return NextResponse.json(
      { ok: false, error: "missing-intentId-txHash-or-payer" },
      { status: 400 }
    );
  }

  const intent = await getPaymentIntent(intentId);

  if (!intent) {
    return NextResponse.json(
      { ok: false, error: "intent-not-found" },
      { status: 404 }
    );
  }

  if (intent.status === "paid") {
    return NextResponse.json({
      ok: true,
      status: "paid",
      intent,
    });
  }

  if (new Date() > new Date(intent.expiresAt)) {
    const updated = await updatePaymentIntent(intentId, {
      status: "expired",
    });

    return NextResponse.json(
      { ok: false, error: "intent-expired", intent: updated },
      { status: 400 }
    );
  }

  if (getAddress(payer) !== getAddress(intent.payer as `0x${string}`)) {
    return NextResponse.json(
      { ok: false, error: "payer-mismatch" },
      { status: 403 }
    );
  }

  const verified = await verifyUsdcTransfer({
    txHash,
    expectedFrom: intent.payer as `0x${string}`,
    expectedTo: intent.paymentAddress as `0x${string}`,
    expectedAmount: intent.amount,
  });

  if (!verified.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "payment-not-verified",
        details: verified,
      },
      { status: 400 }
    );
  }

  const updated = await updatePaymentIntent(intentId, {
    status: "paid",
    txHash,
    paidAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    status: "paid",
    verification: verified,
    intent: updated,
  });
}