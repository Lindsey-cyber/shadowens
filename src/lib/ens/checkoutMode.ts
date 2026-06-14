export type ReputationSummary = {
    avgScore: number | null;
    uniqueClients: number;
    feedbackCount: number;
  };
  
  export function computeCheckoutMode(input: {
    heartbeatAllowed: boolean;
    heartbeatReason: string;
    ensAttestationPresent: boolean;
    reputation: ReputationSummary | null;
    minScore: number | null;
    minClients: number | null;
  }) {
    if (!input.heartbeatAllowed) {
      return {
        mode: "blocked" as const,
        reason: input.heartbeatReason,
      };
    }
  
    if (!input.ensAttestationPresent) {
      return {
        mode: "blocked" as const,
        reason: "missing-ensip25-attestation",
      };
    }
  
    if (!input.reputation) {
      return {
        mode: "review-required" as const,
        reason: "missing-google-reputation",
      };
    }
  
    const minScore = input.minScore ?? 80;
    const minClients = input.minClients ?? 3;
  
    if (
      input.reputation.avgScore !== null &&
      input.reputation.avgScore >= minScore &&
      input.reputation.uniqueClients >= minClients
    ) {
      return {
        mode: "direct-private-checkout" as const,
        reason: "reputation-meets-ens-policy",
      };
    }
  
    if (input.reputation.uniqueClients < minClients) {
      return {
        mode: "review-required" as const,
        reason: "insufficient-unique-clients",
      };
    }
  
    return {
      mode: "review-required" as const,
      reason: "score-below-ens-policy",
    };
  }