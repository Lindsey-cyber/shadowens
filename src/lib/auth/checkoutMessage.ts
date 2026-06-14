export type CheckoutMessageInput = {
    appUrl: string;
    ensName: string;
    amount: string;
    token: string;
    chainId: number;
    payer: string;
    nonce: string;
    issuedAt: string;
    expiresAt: string;
  };
  
  export function buildCheckoutMessage(input: CheckoutMessageInput) {
    return [
      "ShadowENS Checkout Authorization",
      "",
      `App: ${input.appUrl}`,
      `ENS Agent: ${input.ensName}`,
      `Amount: ${input.amount}`,
      `Token: ${input.token}`,
      `Chain ID: ${input.chainId}`,
      `Payer: ${input.payer}`,
      `Nonce: ${input.nonce}`,
      `Issued At: ${input.issuedAt}`,
      `Expires At: ${input.expiresAt}`,
      "",
      "I authorize ShadowENS to create a one-time private checkout address for this payment intent.",
    ].join("\n");
  }