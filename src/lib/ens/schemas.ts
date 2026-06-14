import { z } from "zod";

export const AgentContextSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  registry: z.object({
    standard: z.string(),
    chainId: z.number(),
    identityRegistry: z.string(),
    erc7930Registry: z.string(),
    agentId: z.string(),
  }),
  checkout: z.object({
    provider: z.string(),
    privateRotatingAddress: z.boolean(),
    stablecoinFunding: z.string(),
    preferredChainId: z.number(),
    preferredToken: z.string(),
  }),
});

export const PaymentPolicySchema = z.object({
  chains: z.array(z.number()),
  tokens: z.array(
    z.object({
      symbol: z.string(),
      chainId: z.number(),
      address: z.string(),
      decimals: z.number(),
    })
  ),
  minAmount: z.string(),
  maxDirectAmount: z.string(),
  depositProvider: z.string(),
  privateCheckoutRequired: z.boolean(),
  fallbackMode: z.string(),
});

export type AgentContext = z.infer<typeof AgentContextSchema>;
export type PaymentPolicy = z.infer<typeof PaymentPolicySchema>;