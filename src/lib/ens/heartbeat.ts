export function computeHeartbeatStatus(input: {
    status?: string | null;
    lastHeartbeat?: string | null;
    ttlSeconds?: number | null;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
  
    if (input.status === "paused") {
      return {
        status: "paused" as const,
        checkoutAllowed: false,
        reason: "agent-paused-by-ens-record",
      };
    }
  
    if (!input.lastHeartbeat || !input.ttlSeconds) {
      return {
        status: "unknown" as const,
        checkoutAllowed: false,
        reason: "missing-heartbeat-records",
      };
    }
  
    const last = new Date(input.lastHeartbeat);
    const expiresAt = new Date(last.getTime() + input.ttlSeconds * 1000);
  
    if (Number.isNaN(last.getTime())) {
      return {
        status: "invalid" as const,
        checkoutAllowed: false,
        reason: "invalid-last-heartbeat",
      };
    }
  
    if (now > expiresAt) {
      return {
        status: "stale" as const,
        checkoutAllowed: false,
        reason: "heartbeat-expired",
        lastHeartbeat: input.lastHeartbeat,
        expiresAt: expiresAt.toISOString(),
      };
    }
  
    return {
      status: "active" as const,
      checkoutAllowed: true,
      reason: "heartbeat-valid",
      lastHeartbeat: input.lastHeartbeat,
      expiresAt: expiresAt.toISOString(),
    };
  }