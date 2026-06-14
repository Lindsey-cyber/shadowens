export function buildCheckoutName(intentId: string, ensName: string) {
    const shortId = intentId
      .replace(/^pay_/, "")
      .replace(/-/g, "")
      .slice(0, 12)
      .toLowerCase();
  
    return `${shortId}.checkout.${ensName}`;
  }