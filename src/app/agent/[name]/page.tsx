import AgentClient from "./AgentClient";

export default function AgentPage({
  params,
}: {
  params: { name: string };
}) {
  const name = decodeURIComponent(params.name);

  return <AgentClient name={name} />;
}