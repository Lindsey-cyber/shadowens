import { mainnetClient } from "./client";
import { ENS_TEXT_KEYS, agentRegistrationKey } from "./keys";
import { AgentContextSchema, PaymentPolicySchema } from "./schemas";

async function getText(name: string, key: string) {
  try {
    const value = await mainnetClient.getEnsText({
      name,
      key,
    });

    return value ?? "";
  } catch {
    return "";
  }
}

export async function resolveEnsAgent(name: string) {
  const [
    agentContextRaw,
    webEndpoint,
    mcpEndpoint,
    checkoutEndpoint,
    paymentPolicyRaw,
    status,
    lastHeartbeat,
    heartbeatTtlSeconds,
    keyEpoch,
    minScore,
    minClients,
    avatar,
    description,
    url,
  ] = await Promise.all([
    getText(name, ENS_TEXT_KEYS.AGENT_CONTEXT),
    getText(name, ENS_TEXT_KEYS.AGENT_ENDPOINT_WEB),
    getText(name, ENS_TEXT_KEYS.AGENT_ENDPOINT_MCP),
    getText(name, ENS_TEXT_KEYS.CHECKOUT),
    getText(name, ENS_TEXT_KEYS.PAYMENT_POLICY),
    getText(name, ENS_TEXT_KEYS.STATUS),
    getText(name, ENS_TEXT_KEYS.LAST_HEARTBEAT),
    getText(name, ENS_TEXT_KEYS.HEARTBEAT_TTL_SECONDS),
    getText(name, ENS_TEXT_KEYS.KEY_EPOCH),
    getText(name, ENS_TEXT_KEYS.REPUTATION_MIN_SCORE),
    getText(name, ENS_TEXT_KEYS.REPUTATION_MIN_CLIENTS),
    getText(name, ENS_TEXT_KEYS.AVATAR),
    getText(name, ENS_TEXT_KEYS.DESCRIPTION),
    getText(name, ENS_TEXT_KEYS.URL),
  ]);

  if (!agentContextRaw) {
    return {
      ok: false as const,
      error: "missing-agent-context",
      name,
    };
  }

  let agentContextJson: unknown;

  try {
    agentContextJson = JSON.parse(agentContextRaw);
  } catch {
    return {
      ok: false as const,
      error: "invalid-agent-context-json",
      name,
      agentContextRaw,
    };
  }

  const agentContextResult = AgentContextSchema.safeParse(agentContextJson);

  if (!agentContextResult.success) {
    return {
      ok: false as const,
      error: "invalid-agent-context-schema",
      name,
      issues: agentContextResult.error.issues,
    };
  }

  let paymentPolicy = null;

  if (paymentPolicyRaw) {
    try {
      const parsed = JSON.parse(paymentPolicyRaw);
      const result = PaymentPolicySchema.safeParse(parsed);
      if (result.success) paymentPolicy = result.data;
    } catch {
      paymentPolicy = null;
    }
  }

  const agentId = agentContextResult.data.registry.agentId;
  const registrationKey = agentRegistrationKey(agentId);
  const registrationValue = await getText(name, registrationKey);

  return {
    ok: true as const,
    name,
    records: {
      agentContext: agentContextResult.data,
      webEndpoint,
      mcpEndpoint,
      checkoutEndpoint,
      paymentPolicy,
      status,
      lastHeartbeat,
      heartbeatTtlSeconds: heartbeatTtlSeconds
        ? Number(heartbeatTtlSeconds)
        : null,
      keyEpoch: keyEpoch ? Number(keyEpoch) : null,
      minScore: minScore ? Number(minScore) : null,
      minClients: minClients ? Number(minClients) : null,
      avatar,
      description,
      url,
    },
    ensip25: {
      key: registrationKey,
      value: registrationValue,
      ensSideAttestationPresent: registrationValue.length > 0,
    },
  };
}