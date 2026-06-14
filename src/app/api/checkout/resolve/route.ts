import { NextRequest, NextResponse } from "next/server";
import { getPaymentIntentByCheckoutName } from "@/lib/storage/intents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "missing-checkout-name" },
      { status: 400 }
    );
  }

  const intent = await getPaymentIntentByCheckoutName(name);

  if (!intent) {
    return NextResponse.json(
      { ok: false, error: "checkout-name-not-found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    checkoutName: intent.checkoutName,
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
  });
}