import { NextRequest, NextResponse } from "next/server";
import { getBigQueryReputation } from "@/lib/reputation/bigquery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { ok: false, error: "missing-agentId" },
      { status: 400 }
    );
  }

  try {
    const reputation = await getBigQueryReputation(agentId);
    return NextResponse.json(reputation);
  } catch (error) {
    console.error("google reputation failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      },
      { status: 500 }
    );
  }
}