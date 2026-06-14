export type VerificationResult = {
    fullBidirectionalVerified: boolean;
    ensSideAttestationPresent: boolean;
    reason: string;
  };
  
  export function verifyEnsSideAttestation(input: {
    ensSideAttestationPresent: boolean;
  }): VerificationResult {
    if (!input.ensSideAttestationPresent) {
      return {
        fullBidirectionalVerified: false,
        ensSideAttestationPresent: false,
        reason: "missing-ensip25-attestation",
      };
    }
  
    return {
      fullBidirectionalVerified: false,
      ensSideAttestationPresent: true,
      reason:
        "ens-side-attestation-present; agentURI reverse check can be added later",
    };
  }