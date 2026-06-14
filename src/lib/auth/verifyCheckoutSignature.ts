import { getAddress, verifyMessage } from "viem";
import { getCheckoutNonce, markCheckoutNonceUsed } from "./nonceStore";
import { buildCheckoutMessage } from "./checkoutMessage";

export async function verifyCheckoutSignature(input: {
  appUrl: string;
  ensName: string;
  amount: string;
  token: string;
  chainId: number;
  payer: `0x${string}`;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  signature: `0x${string}`;
}) {
  const nonceRecord = getCheckoutNonce(input.nonce);

  if (!nonceRecord) {
    return { ok: false as const, error: "nonce-not-found" };
  }

  if (nonceRecord.used) {
    return { ok: false as const, error: "nonce-already-used" };
  }

  if (new Date() > new Date(nonceRecord.expiresAt)) {
    return { ok: false as const, error: "nonce-expired" };
  }

  /**
   * checkout-nonce route 里保存的是 createdAt，
   * 但返回给前端的是 issuedAt。
   * 所以后端验证时要比较：
   * nonceRecord.createdAt === input.issuedAt
   */
  if (
    nonceRecord.createdAt !== input.issuedAt ||
    nonceRecord.expiresAt !== input.expiresAt
  ) {
    return { ok: false as const, error: "nonce-timestamp-mismatch" };
  }

  const expectedChainId = Number(process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? "8453");

  if (input.chainId !== expectedChainId) {
    return { ok: false as const, error: "invalid-chainId" };
  }

  let normalizedPayer: `0x${string}`;
  let normalizedAllowed: `0x${string}` | undefined;

  try {
    normalizedPayer = getAddress(input.payer) as `0x${string}`;

    const allowed = process.env.NEXT_PUBLIC_ALLOWED_PAYER_ADDRESS;

    if (allowed) {
      normalizedAllowed = getAddress(allowed as `0x${string}`) as `0x${string}`;
    }
  } catch {
    return { ok: false as const, error: "invalid-payer-address" };
  }

  if (normalizedAllowed && normalizedPayer !== normalizedAllowed) {
    return { ok: false as const, error: "payer-not-allowed" };
  }

  const message = buildCheckoutMessage({
    appUrl: input.appUrl,
    ensName: input.ensName,
    amount: input.amount,
    token: input.token,
    chainId: input.chainId,
    payer: normalizedPayer,
    nonce: input.nonce,
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  });

  const valid = await verifyMessage({
    address: normalizedPayer,
    message,
    signature: input.signature,
  });

  if (!valid) {
    return { ok: false as const, error: "invalid-signature" };
  }

  markCheckoutNonceUsed(input.nonce);

  return {
    ok: true as const,
    message,
    payer: normalizedPayer,
  };
}