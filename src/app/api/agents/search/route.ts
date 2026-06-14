import { NextRequest, NextResponse } from "next/server";
import { computeCheckoutMode } from "@/lib/ens/checkoutMode";
import { computeHeartbeatStatus } from "@/lib/ens/heartbeat";
import { resolveEnsAgent } from "@/lib/ens/resolveAgent";
import { searchDemoAgents } from "@/lib/agents/registry";
import {
  ReputationSummary,
  searchBigQueryAgents,
} from "@/lib/reputation/bigquery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "audit";

  try {
    const candidates = await searchBigQueryAgents(q);

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        query: q,
        source: "fallback-local-registry",
        warning:
          "No BigQuery NewFeedback logs matched yet. Google public dataset may not have synced.",
        agents: searchDemoAgents(q),
      });
    }

    const agents = await Promise.all(
      candidates.map(async (candidate) => {
        try {
          const resolved = await resolveEnsAgent(candidate.name);

          if (!resolved.ok) {
            return {
              ...candidate,
              expectedMode: "blocked" as const,
              checkoutReason: resolved.error,
              heartbeatStatus: "unknown",
            };
          }

          const heartbeat = computeHeartbeatStatus({
            status: resolved.records.status,
            lastHeartbeat: resolved.records.lastHeartbeat,
            ttlSeconds: resolved.records.heartbeatTtlSeconds,
          });

          const reputation: ReputationSummary = {
            avgScore: candidate.avgScore,
            uniqueClients: candidate.uniqueClients,
            feedbackCount: candidate.feedbackCount,
          };

          const checkoutMode = computeCheckoutMode({
            heartbeatAllowed: heartbeat.checkoutAllowed,
            heartbeatReason: heartbeat.reason,
            ensAttestationPresent: resolved.ensip25.ensSideAttestationPresent,
            reputation,
            minScore: resolved.records.minScore,
            minClients: resolved.records.minClients,
          });

          return {
            ...candidate,
            expectedMode: checkoutMode.mode,
            checkoutReason: checkoutMode.reason,
            heartbeatStatus: heartbeat.status,
          };
        } catch (error) {
          return {
            ...candidate,
            expectedMode: "review-required" as const,
            checkoutReason:
              error instanceof Error ? error.message : "resolve-failed",
            heartbeatStatus: "unknown",
          };
        }
      })
    );

    return NextResponse.json({
      ok: true,
      query: q,
      source: "google-bigquery-mainnet",
      agents,
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      query: q,
      source: "fallback-local-registry",
      warning: error instanceof Error ? error.message : "BigQuery search failed",
      agents: searchDemoAgents(q),
    });
  }
}