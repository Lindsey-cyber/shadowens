const DEFAULT_AGENT_TREASURY =
  "0x0000000000000000000000000000000000000000";

export function getAgentTreasuryAddress(ensName: string) {
  const key = ensName
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_");

  const envKey = `AGENT_TREASURY_${key}`;

  return process.env[envKey] ?? process.env.AGENT_TREASURY_DEFAULT ?? DEFAULT_AGENT_TREASURY;
}