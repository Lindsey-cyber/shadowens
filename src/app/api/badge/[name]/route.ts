import { NextRequest } from "next/server";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function svgEscape(input: string) {
  return input.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };

    return map[char] ?? char;
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  const ensName = decodeURIComponent(context.params.name.replace(/\.svg$/, ""));
  const resolved = await resolveEnsAgent(ensName);

  let label = ensName;
  let status = "unknown";
  let agentId = "N/A";

  if (resolved.ok) {
    label = resolved.records.agentContext.name;
    agentId = resolved.records.agentContext.registry.agentId;

    const heartbeat = computeHeartbeatStatus({
      status: resolved.records.status,
      lastHeartbeat: resolved.records.lastHeartbeat,
      ttlSeconds: resolved.records.heartbeatTtlSeconds,
    });

    status = heartbeat.status;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="240" viewBox="0 0 800 240">
  <rect width="800" height="240" rx="28" fill="#111827"/>
  <circle cx="90" cy="86" r="44" fill="#60a5fa"/>
  <text x="160" y="76" font-size="34" font-family="Arial" font-weight="700" fill="#ffffff">${svgEscape(label)}</text>
  <text x="160" y="118" font-size="22" font-family="Arial" fill="#d1d5db">ShadowENS Agent Passport</text>
  <text x="40" y="174" font-size="24" font-family="Arial" fill="#a7f3d0">Status: ${svgEscape(status)}</text>
  <text x="40" y="210" font-size="20" font-family="Arial" fill="#93c5fd">ERC-8004 Agent ID: ${svgEscape(agentId)}</text>
</svg>`.trim();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}