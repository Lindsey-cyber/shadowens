import { NextRequest, NextResponse } from "next/server";
import { searchDemoAgents } from "@/lib/agents/registry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";

  return NextResponse.json({
    ok: true,
    query: q,
    agents: searchDemoAgents(q),
  });
}