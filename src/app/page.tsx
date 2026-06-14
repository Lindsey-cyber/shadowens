"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const demoAgents = [
  {
    name: "audit.shadowens-demo.eth",
    label: "Audit Agent",
    description: "High-reputation active agent. Expected direct checkout.",
  },
  {
    name: "debug.shadowens-demo.eth",
    label: "Debug Agent",
    description: "Cautious agent. Expected review-required state.",
  },
  {
    name: "stale.shadowens-demo.eth",
    label: "Stale Agent",
    description: "Dead man switch demo. Expected blocked state.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("audit.shadowens-demo.eth");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    router.push(`/agent/${encodeURIComponent(trimmed)}`);
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">ShadowENS MVP</div>
        <h1>ENS-powered AI agent checkout</h1>
        <p>
          Resolve ENS agent records, check ERC-8004 binding, evaluate reputation,
          and create one-time private checkout addresses.
        </p>

        <form className="form" onSubmit={onSubmit}>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="audit.shadowens-demo.eth"
          />
          <button className="button" type="submit">
            Resolve Agent
          </button>
        </form>
      </section>

      <section className="grid">
        {demoAgents.map((agent) => (
          <a className="card" key={agent.name} href={`/agent/${agent.name}`}>
            <h2>{agent.label}</h2>
            <p>{agent.name}</p>
            <p>{agent.description}</p>
          </a>
        ))}
      </section>
    </main>
  );
}