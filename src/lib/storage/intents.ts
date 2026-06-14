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
  checkoutName: string;
  paymentAddress: string;
  privateKeyDevOnly?: string;
  status: PaymentIntentStatus;
  createdAt: string;
  expiresAt: string;
  txHash?: string;
  paidAt?: string;
};

const memoryIntents = new Map<string, PaymentIntent>();
const memoryCheckoutIndex = new Map<string, string>();

const intentKey = (intentId: string) => `intent:${intentId}`;
const checkoutKey = (checkoutName: string) => `checkout:${checkoutName}`;

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function savePaymentIntent(intent: PaymentIntent) {
  if (hasKv()) {
    await kv.set(intentKey(intent.intentId), intent);
    await kv.set(checkoutKey(intent.checkoutName), intent.intentId);
    return intent;
  }

  memoryIntents.set(intent.intentId, intent);
  memoryCheckoutIndex.set(intent.checkoutName, intent.intentId);

  return intent;
}

export async function getPaymentIntent(intentId: string) {
  if (hasKv()) {
    return await kv.get<PaymentIntent>(intentKey(intentId));
  }

  return memoryIntents.get(intentId) ?? null;
}

export async function getPaymentIntentByCheckoutName(checkoutName: string) {
  if (hasKv()) {
    const intentId = await kv.get<string>(checkoutKey(checkoutName));
    if (!intentId) return null;
    return await getPaymentIntent(intentId);
  }

  const intentId = memoryCheckoutIndex.get(checkoutName);
  if (!intentId) return null;

  return memoryIntents.get(intentId) ?? null;
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

  if (hasKv()) {
    await kv.set(intentKey(intentId), updated);

    if (updated.checkoutName) {
      await kv.set(checkoutKey(updated.checkoutName), intentId);
    }

    return updated;
  }

  memoryIntents.set(intentId, updated);

  if (updated.checkoutName) {
    memoryCheckoutIndex.set(updated.checkoutName, intentId);
  }

  return updated;
}