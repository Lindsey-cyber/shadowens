"use client";

import { useState } from "react";
import Link from "next/link";

type AgentSearchResult = {
  name: string;
  label: string;
  capability: string;
  expectedMode: "direct-private-checkout" | "review-required" | "blocked";
  description: string;
};

export default function HomePage() {
  const [query, setQuery] = useState("audit");
  const [agents, setAgents] = useState<AgentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function searchAgents() {
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/agents/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();

      if (json.ok) {
        setAgents(json.agents);
      } else {
        setAgents([]);
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
          Search for an AI agent by capability. ShadowENS checks ENS identity,
          ERC-8004 agent binding, BigQuery reputation, and heartbeat status
          before allowing payment.
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

        {!searched && (
          <p className="opacity-70">
            Try searching <strong>audit</strong>. You should see audit, debug,
            and stale agents.
          </p>
        )}

        {searched && agents.length === 0 && (
          <p>No matching agents found.</p>
        )}

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

                <p className="text-sm opacity-80">{agent.description}</p>

                <p className="text-xs rounded-full border inline-block px-3 py-1">
                  Expected: {agent.expectedMode}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}