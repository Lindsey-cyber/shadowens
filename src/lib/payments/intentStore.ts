export type PaymentIntent = {
    intentId: string;
    ensName: string;
    agentId: string;
    amount: string;
    token: string;
    chainId: number;
    paymentAddress: string;
    privateKeyDevOnly: string;
    status: "pending" | "paid" | "expired";
    createdAt: string;
    expiresAt: string;
  };
  
  const intents = new Map<string, PaymentIntent>();
  
  export function saveIntent(intent: PaymentIntent) {
    intents.set(intent.intentId, intent);
    return intent;
  }
  
  export function getIntent(id: string) {
    return intents.get(id);
  }