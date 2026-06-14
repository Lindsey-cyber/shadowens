export const ERC8004_IDENTITY_REGISTRY =
  process.env.ERC8004_IDENTITY_REGISTRY ??
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

export const ERC8004_REGISTRY_ERC7930 =
  process.env.ERC8004_REGISTRY_ERC7930 ??
  "0x000100000101148004a169fb4a3325136eb29fa0ceb6d2e539a432";

export function agentRegistrationKey(agentId: string) {
  return `agent-registration[${ERC8004_REGISTRY_ERC7930}][${agentId}]`;
}

export const ENS_TEXT_KEYS = {
  AGENT_CONTEXT: "agent-context",
  AGENT_ENDPOINT_WEB: "agent-endpoint[web]",
  AGENT_ENDPOINT_MCP: "agent-endpoint[mcp]",
  CHECKOUT: "com.shadowens.checkout",
  PAYMENT_POLICY: "com.shadowens.payment-policy",
  STATUS: "com.shadowens.status",
  LAST_HEARTBEAT: "com.shadowens.last-heartbeat",
  HEARTBEAT_TTL_SECONDS: "com.shadowens.heartbeat-ttl-seconds",
  KEY_EPOCH: "com.shadowens.key-epoch",
  REPUTATION_MIN_SCORE: "com.shadowens.reputation-min-score",
  REPUTATION_MIN_CLIENTS: "com.shadowens.reputation-min-clients",
  AVATAR: "avatar",
  DESCRIPTION: "description",
  URL: "url",
} as const;