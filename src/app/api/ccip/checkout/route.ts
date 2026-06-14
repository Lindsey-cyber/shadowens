import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { getPaymentIntentByCheckoutName } from "@/lib/storage/intents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getGatewaySigner() {
  const privateKey = process.env.GATEWAY_SIGNER_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("missing-GATEWAY_SIGNER_PRIVATE_KEY");
  }

  return new ethers.Wallet(privateKey);
}

export async function GET(req: NextRequest) {
  const checkoutName = req.nextUrl.searchParams.get("name");

  if (!checkoutName) {
    return NextResponse.json(
      { ok: false, error: "missing-checkout-name" },
      { status: 400 }
    );
  }

  const intent = await getPaymentIntentByCheckoutName(checkoutName);

  if (!intent) {
    return NextResponse.json(
      { ok: false, error: "checkout-name-not-found" },
      { status: 404 }
    );
  }

  if (new Date(intent.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json(
      { ok: false, error: "checkout-intent-expired" },
      { status: 410 }
    );
  }

  if (intent.status !== "pending") {
    return NextResponse.json(
      { ok: false, error: "checkout-intent-not-pending", status: intent.status },
      { status: 409 }
    );
  }

  const signer = getGatewaySigner();

  const expiry = Math.floor(Date.now() / 1000) + 120;

  const digest = ethers.solidityPackedKeccak256(
    ["string", "string", "address", "uint256"],
    [
      "ShadowENS CCIP Checkout v0",
      intent.checkoutName,
      intent.paymentAddress,
      expiry,
    ]
  );

  const signature = await signer.signMessage(ethers.getBytes(digest));

  return NextResponse.json({
    ok: true,
    checkoutName: intent.checkoutName,
    paymentAddress: intent.paymentAddress,
    status: intent.status,
    expiresAt: intent.expiresAt,
    gatewayResponseExpiresAt: expiry,
    gatewaySigner: signer.address,
    signature,
  });
}