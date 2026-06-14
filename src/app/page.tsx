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

  const modeClass = (mode: AgentSearchResult["expectedMode"]) =>
    mode === "direct-private-checkout"
      ? "badge"
      : mode === "blocked"
        ? "badge blocked"
        : "badge warning";

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">ShadowENS Demo</div>

        <h1>Find a trusted ENS-registered AI agent</h1>

        <p>
          Search for an AI agent by capability. ShadowENS queries real Ethereum
          Mainnet ERC-8004 reputation feedback through Google BigQuery, then
          checks ENS identity, reputation, and heartbeat before allowing payment.
        </p>

        <div className="form">
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchAgents()}
            placeholder="search capability... (e.g. audit)"
          />
          <button className="button" onClick={searchAgents} disabled={loading}>
            {loading ? "searching..." : "search"}
          </button>
        </div>

        {source && (
          <div className="card" style={{ marginTop: 20 }}>
            <p>
              Search source: <strong>{source}</strong>
            </p>
            {warning && <p className="muted">warning: {warning}</p>}
          </div>
        )}

        {!searched && (
          <p className="muted" style={{ marginTop: 16 }}>
            Try searching <strong>audit</strong>. You should see audit, debug,
            and stale agents.
          </p>
        )}

        {searched && agents.length === 0 && (
          <p style={{ marginTop: 16 }}>No matching agents found.</p>
        )}

        <div className="grid">
          {agents.map((agent) => (
            <Link
              key={agent.name}
              href={`/agent/${agent.name}`}
              className="card link stack"
            >
              <p className="kicker">{agent.capability} agent</p>

              <h2>{agent.label}</h2>

              <p className="mono" style={{ color: "var(--green)" }}>
                {agent.name}
              </p>

              {agent.agentId && (
                <p className="mono muted">agentId: {agent.agentId}</p>
              )}

              <p className="muted">{agent.description}</p>

              {(agent.tag1 || agent.tag2) && (
                <div className="tags">
                  {agent.tag1 && <span className="tag">tag1: {agent.tag1}</span>}
                  {agent.tag2 && <span className="tag">tag2: {agent.tag2}</span>}
                </div>
              )}

              {typeof agent.avgScore !== "undefined" && (
                <div className="stack" style={{ gap: 2, fontSize: 13 }}>
                  <p>Average score: {agent.avgScore ?? "No score yet"}</p>
                  <p>Unique clients: {agent.uniqueClients ?? 0}</p>
                  <p>Feedback count: {agent.feedbackCount ?? 0}</p>
                  {agent.heartbeatStatus && (
                    <p>Heartbeat: {agent.heartbeatStatus}</p>
                  )}
                </div>
              )}

              <p className={modeClass(agent.expectedMode)}>
                {agent.expectedMode}
              </p>

              {agent.checkoutReason && (
                <p className="muted" style={{ fontSize: 12 }}>
                  reason: {agent.checkoutReason}
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}