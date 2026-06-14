export type DemoAgent = {
    name: string;
    label: string;
    capability: string;
    expectedMode: "direct-private-checkout" | "review-required" | "blocked";
    description: string;
  };
  
  export const demoAgents: DemoAgent[] = [
    {
      name: "audit.shadowens-demo.eth",
      label: "Audit Agent",
      capability: "audit",
      expectedMode: "direct-private-checkout",
      description:
        "High-reputation active audit agent. This is the only agent that can enter direct private checkout.",
    },
    {
      name: "debug.shadowens-demo.eth",
      label: "Debug Agent",
      capability: "audit",
      expectedMode: "review-required",
      description:
        "Similar technical agent, but its BigQuery reputation is not strong enough for direct checkout.",
    },
    {
      name: "stale.shadowens-demo.eth",
      label: "Stale Agent",
      capability: "audit",
      expectedMode: "blocked",
      description:
        "This agent may have an identity, but its heartbeat is stale, so payment is blocked.",
    },
  ];
  
  export function searchDemoAgents(query: string) {
    const q = query.trim().toLowerCase();
  
    if (!q) return demoAgents;
  
    return demoAgents.filter((agent) => {
      return (
        agent.name.toLowerCase().includes(q) ||
        agent.label.toLowerCase().includes(q) ||
        agent.capability.toLowerCase().includes(q) ||
        agent.description.toLowerCase().includes(q)
      );
    });
  }