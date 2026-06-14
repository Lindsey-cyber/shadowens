import { NextRequest, NextResponse } from "next/server";
import { computeCheckoutMode } from "@/lib/ens/checkoutMode";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";
import { getMockReputation } from "@/lib/reputation/mock";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "missing-name" },
      { status: 400 }
    );
  }

  const resolved = await resolveEnsAgent(name);

  if (!resolved.ok) {
    return NextResponse.json(resolved, { status: 404 });
  }

  const heartbeat = computeHeartbeatStatus({
    status: resolved.records.status,
    lastHeartbeat: resolved.records.lastHeartbeat,
    ttlSeconds: resolved.records.heartbeatTtlSeconds,
  });

  const agentId = resolved.records.agentContext.registry.agentId;
  const reputation = getMockReputation(agentId);

  const checkoutMode = computeCheckoutMode({
    heartbeatAllowed: heartbeat.checkoutAllowed,
    heartbeatReason: heartbeat.reason,
    ensAttestationPresent: resolved.ensip25.ensSideAttestationPresent,
    reputation,
    minScore: resolved.records.minScore,
    minClients: resolved.records.minClients,
  });

  return NextResponse.json({
    ok: true,
    agent: resolved,
    heartbeat,
    reputation,
    checkoutMode,
  });
}