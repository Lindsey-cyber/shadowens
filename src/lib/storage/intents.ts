import { kv } from "@vercel/kv";

export type PaymentIntentStatus = "pending" | "paid" | "expired" | "failed";

export type PaymentIntent = {
  intentId: string;
  ensName: string;
  agentId: string;
  amount: string;
  token: string;
  chainId: number;
  payer: string;
  paymentAddress: string;
  privateKeyDevOnly?: string;
  status: PaymentIntentStatus;
  createdAt: string;
  expiresAt: string;
  txHash?: string;
  paidAt?: string;
};

const key = (intentId: string) => `intent:${intentId}`;

export async function savePaymentIntent(intent: PaymentIntent) {
  await kv.set(key(intent.intentId), intent);
  return intent;
}

export async function getPaymentIntent(intentId: string) {
  return await kv.get<PaymentIntent>(key(intentId));
}

export async function updatePaymentIntent(
  intentId: string,
  patch: Partial<PaymentIntent>
) {
  const existing = await getPaymentIntent(intentId);

  if (!existing) return null;

  const updated = {
    ...existing,
    ...patch,
  };

  await kv.set(key(intentId), updated);
  return updated;
}