"use client";

import { useEffect, useState } from "react";

type ResolveResponse = {
  ok: boolean;
  agent?: {
    name: string;
    records: {
      agentContext: {
        name: string;
        description?: string;
        capabilities: string[];
        registry: {
          agentId: string;
        };
      };
      webEndpoint: string;
      mcpEndpoint: string;
      checkoutEndpoint: string;
      avatar: string;
    };
    ensip25: {
      key: string;
      value: string;
      ensSideAttestationPresent: boolean;
    };
  };
  heartbeat?: {
    status: string;
    checkoutAllowed: boolean;
    reason: string;
    expiresAt?: string;
  };
  reputation?: {
    avgScore: number | null;
    uniqueClients: number;
    feedbackCount: number;
  } | null;
  checkoutMode?: {
    mode: string;
    reason: string;
  };
  error?: string;
};

export default function AgentClient({ name }: { name: string }) {
  const [data, setData] = useState<ResolveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<unknown>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setCheckoutResult(null);

      try {
        const res = await fetch(`/api/ens/resolve?name=${encodeURIComponent(name)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } catch (error) {
        setData({
          ok: false,
          error: error instanceof Error ? error.message : "unknown-error",
        });
      } finally {
        setLoading(false);
      }
    }

    run();
  }, [name]);

  async function createCheckout() {
    setCheckoutLoading(true);
    setCheckoutResult(null);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ensName: name,
          amount: "5",
          token: "USDC",
          chainId: 8453,
        }),
      });

      const json = await res.json();
      setCheckoutResult(json);
    } catch (error) {
      setCheckoutResult({
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  }

  const mode = data?.checkoutMode?.mode;
  const modeClass =
    mode === "direct-private-checkout"
      ? "badge"
      : mode === "blocked"
        ? "badge blocked"
        : "badge warning";

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">ENS Agent Passport</div>
        <h1>{name}</h1>

        {loading && <p>Resolving ENS records...</p>}

        {!loading && !data?.ok && (
          <>
            <p className="badge blocked">Resolve failed</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}

        {!loading && data?.ok && data.agent && (
          <>
            <p>{data.agent.records.agentContext.description}</p>

            <div className="grid">
              <div className="card">
                <h2>Identity</h2>
                <p>Agent name: {data.agent.records.agentContext.name}</p>
                <p>Agent ID: {data.agent.records.agentContext.registry.agentId}</p>
                <p>
                  ENSIP-25:{" "}
                  {data.agent.ensip25.ensSideAttestationPresent
                    ? "present"
                    : "missing"}
                </p>
              </div>

              <div className="card">
                <h2>Status</h2>
                <p>Heartbeat: {data.heartbeat?.status}</p>
                <p>Reason: {data.heartbeat?.reason}</p>
                <p>Expires: {data.heartbeat?.expiresAt ?? "N/A"}</p>
              </div>

              <div className="card">
                <h2>Checkout</h2>
                <p className={modeClass}>{data.checkoutMode?.mode}</p>
                <p>Reason: {data.checkoutMode?.reason}</p>
              </div>
            </div>

            <div className="grid">
              <div className="card">
                <h2>Capabilities</h2>
                <p>{data.agent.records.agentContext.capabilities.join(", ")}</p>
              </div>

              <div className="card">
                <h2>Reputation</h2>
                <p>Average score: {data.reputation?.avgScore ?? "N/A"}</p>
                <p>Unique clients: {data.reputation?.uniqueClients ?? 0}</p>
                <p>Feedback count: {data.reputation?.feedbackCount ?? 0}</p>
              </div>

              <div className="card">
                <h2>Private Checkout</h2>
                <button
                  className="button"
                  disabled={
                    checkoutLoading ||
                    data.checkoutMode?.mode !== "direct-private-checkout"
                  }
                  onClick={createCheckout}
                >
                  {checkoutLoading ? "Creating..." : "Create Private Checkout"}
                </button>
              </div>
            </div>

            {checkoutResult ? (
              <>
                <h2 style={{ marginTop: 32 }}>Checkout result</h2>
                <pre>{JSON.stringify(checkoutResult, null, 2)}</pre>
              </>
            ) : null}

            <h2 style={{ marginTop: 32 }}>Raw resolution</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}
      </section>
    </main>
  );
}