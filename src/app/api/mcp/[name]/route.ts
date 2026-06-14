import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: { name: string } }
) {
  const name = decodeURIComponent(context.params.name);

  return NextResponse.json({
    ok: true,
    name,
    protocol: "mcp",
    message: "MCP endpoint placeholder for ShadowENS MVP.",
    capabilities: ["demo", "agent-discovery", "private-checkout"],
  });
}