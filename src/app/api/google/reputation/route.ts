import { NextRequest, NextResponse } from "next/server";
import { getMockReputation } from "@/lib/reputation/mock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json(
      { ok: false, error: "missing-agentId" },
      { status: 400 }
    );
  }

  const reputation = getMockReputation(agentId);

  if (!reputation) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json(reputation);
}