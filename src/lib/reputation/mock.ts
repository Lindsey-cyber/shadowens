import type { ReputationSummary } from "@/lib/ens/checkoutMode";

const mockReputation: Record<string, ReputationSummary> = {
  "34563": {
    avgScore: 95,
    uniqueClients: 8,
    feedbackCount: 21,
  },
  "34564": {
    avgScore: 62,
    uniqueClients: 1,
    feedbackCount: 2,
  },
  "34565": {
    avgScore: 99,
    uniqueClients: 12,
    feedbackCount: 36,
  },
};

export function getMockReputation(agentId: string) {
  return mockReputation[agentId] ?? null;
}