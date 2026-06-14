import { NextRequest, NextResponse } from "next/server";
import { getPaymentIntent, updatePaymentIntent } from "@/lib/storage/intents";

export async function GET(req: NextRequest) {
  const intentId = req.nextUrl.searchParams.get("intentId");

  if (!intentId) {
    return NextResponse.json(
      { ok: false, error: "missing-intentId" },
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

  if (intent.status === "pending" && new Date() > new Date(intent.expiresAt)) {
    const expired = await updatePaymentIntent(intent.intentId, {
      status: "expired",
    });

    return NextResponse.json({
      ok: true,
      intent: expired,
    });
  }

  return NextResponse.json({
    ok: true,
    intent,
  });
}