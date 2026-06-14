"use client";

import { useState } from "react";
import Link from "next/link";

type AgentSearchResult = {
  name: string;
  label: string;
  capability: string;
  expectedMode: "direct-private-checkout" | "review-required" | "blocked";
  description: string;
  agentId?: string;
  avgScore?: number | null;
  uniqueClients?: number;
  feedbackCount?: number;
  tag1?: string;
  tag2?: string;
  tags?: string[];
  endpoint?: string;
  feedbackURI?: string;
  checkoutReason?: string;
  heartbeatStatus?: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("audit");
  const [agents, setAgents] = useState<AgentSearchResult[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function searchAgents() {
    setLoading(true);
    setSearched(true);
    setWarning(null);

    try {
      const res = await fetch(`/api/agents/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.ok) {
        setAgents(json.agents);
        setSource(json.source ?? null);
        setWarning(json.warning ?? null);
      } else {
        setAgents([]);
        setSource(null);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <section className="space-y-6">
        <p className="text-sm uppercase tracking-wide opacity-70">
          ShadowENS Demo
        </p>

        <h1 className="text-4xl font-bold">
          Find a trusted ENS-registered AI agent
        </h1>

        <p className="text-lg opacity-80 max-w-3xl">
          Search for an AI agent by capability. ShadowENS queries real Ethereum
          Mainnet ERC-8004 reputation feedback through Google BigQuery, then
          checks ENS identity, reputation, and heartbeat before allowing payment.
        </p>

        <div className="flex gap-3 max-w-2xl">
          <input
            className="flex-1 rounded border px-4 py-3 bg-transparent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try: audit"
          />
          <button
            className="rounded bg-black text-white px-5 py-3 disabled:opacity-50"
            onClick={searchAgents}
            disabled={loading}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {source && (
          <div className="rounded border p-4 text-sm space-y-1">
            <p>
              Search source: <strong>{source}</strong>
            </p>
            {warning && <p className="opacity-70">Warning: {warning}</p>}
          </div>
        )}

        {!searched && (
          <p className="opacity-70">
            Try searching <strong>audit</strong>. You should see audit, debug,
            and stale agents.
          </p>
        )}

        {searched && agents.length === 0 && <p>No matching agents found.</p>}

        <div className="grid gap-4 md:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.name}
              href={`/agent/${agent.name}`}
              className="rounded-xl border p-5 hover:shadow-lg transition block"
            >
              <div className="space-y-3">
                <p className="text-sm uppercase opacity-60">
                  {agent.capability} agent
                </p>

                <h2 className="text-xl font-semibold">{agent.label}</h2>

                <p className="font-mono text-sm break-all">{agent.name}</p>

                {agent.agentId && (
                  <p className="text-sm font-mono">agentId: {agent.agentId}</p>
                )}

                <p className="text-sm opacity-80">{agent.description}</p>

                {(agent.tag1 || agent.tag2) && (
                  <div className="flex flex-wrap gap-2">
                    {agent.tag1 && (
                      <span className="text-xs rounded-full border px-3 py-1">
                        tag1: {agent.tag1}
                      </span>
                    )}
                    {agent.tag2 && (
                      <span className="text-xs rounded-full border px-3 py-1">
                        tag2: {agent.tag2}
                      </span>
                    )}
                  </div>
                )}

                {typeof agent.avgScore !== "undefined" && (
                  <div className="text-sm space-y-1">
                    <p>Average score: {agent.avgScore ?? "No score yet"}</p>
                    <p>Unique clients: {agent.uniqueClients ?? 0}</p>
                    <p>Feedback count: {agent.feedbackCount ?? 0}</p>
                    {agent.heartbeatStatus && (
                      <p>Heartbeat: {agent.heartbeatStatus}</p>
                    )}
                  </div>
                )}

                <p className="text-xs rounded-full border inline-block px-3 py-1">
                  Mode: {agent.expectedMode}
                </p>

                {agent.checkoutReason && (
                  <p className="text-xs opacity-70">
                    Reason: {agent.checkoutReason}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}