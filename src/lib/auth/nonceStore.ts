type CheckoutNonce = {
    nonce: string;
    payer?: string;
    createdAt: string;
    expiresAt: string;
    used: boolean;
  };
  
  const nonces = new Map<string, CheckoutNonce>();
  
  export function saveCheckoutNonce(nonce: CheckoutNonce) {
    nonces.set(nonce.nonce, nonce);
    return nonce;
  }
  
  export function getCheckoutNonce(nonce: string) {
    return nonces.get(nonce);
  }
  
  export function markCheckoutNonceUsed(nonce: string) {
    const existing = nonces.get(nonce);
    if (!existing) return null;
  
    const updated = {
      ...existing,
      used: true,
    };
  
    nonces.set(nonce, updated);
    return updated;
  }