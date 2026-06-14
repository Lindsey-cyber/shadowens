import { BigQuery } from "@google-cloud/bigquery";
import {
  decodeEventLog,
  getAddress,
  keccak256,
  parseAbiItem,
  toBytes,
  toHex,
} from "viem";

export type ReputationSummary = {
  avgScore: number | null;
  uniqueClients: number;
  feedbackCount: number;
};

export type BigQueryAgentSearchResult = {
  name: string;
  label: string;
  capability: string;
  expectedMode: "direct-private-checkout" | "review-required" | "blocked";
  description: string;
  agentId: string;
  avgScore: number | null;
  uniqueClients: number;
  feedbackCount: number;
  tag1: string;
  tag2: string;
  tags: string[];
  endpoint: string;
  feedbackURI: string;
  latestTxHash: string;
};

type BigQueryLogRow = {
  block_timestamp?: unknown;
  transaction_hash?: string;
  topics?: string[];
  data?: string;
};

type DecodedFeedback = {
  agentId: string;
  clientAddress: string;
  feedbackIndex: number;
  value: number;
  valueDecimals: number;
  score: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  feedbackURI: string;
  feedbackHash: string;
  txHash: string;
};

const DEFAULT_REPUTATION_REGISTRY =
  "0x8004baa17c55a88189ae136b182e5fda19de9b63";

const NEW_FEEDBACK_TOPIC =
  "0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc";

const NEW_FEEDBACK_EVENT = parseAbiItem(
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)"
);

let cachedClient: BigQuery | null = null;

function getBigQueryClient() {
  if (cachedClient) return cachedClient;

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("missing-google-bigquery-env");
  }

  cachedClient = new BigQuery({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });

  return cachedClient;
}

function getReputationRegistryAddress() {
  return (
    process.env.ERC8004_REPUTATION_REGISTRY ?? DEFAULT_REPUTATION_REGISTRY
  ).toLowerCase();
}

function agentIdToTopic(agentId: string) {
  return toHex(BigInt(agentId), { size: 32 }).toLowerCase();
}

function tagToIndexedTopic(tag: string) {
  return keccak256(toBytes(tag)).toLowerCase();
}

function roundScore(score: number) {
  return Math.round(score * 100) / 100;
}

function extractEnsNameFromEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    const match = url.pathname.match(/^\/agent\/([^/]+)$/);

    if (!match?.[1]) return null;

    return decodeURIComponent(match[1]);
  } catch {
    const marker = "/agent/";
    const idx = endpoint.indexOf(marker);

    if (idx === -1) return null;

    return endpoint.slice(idx + marker.length).split(/[?#]/)[0];
  }
}

function labelFromEnsName(name: string) {
  const first = name.split(".")[0] || "Agent";
  return `${first.charAt(0).toUpperCase()}${first.slice(1)} Agent`;
}

function descriptionFromTag2(tag2: string) {
  if (tag2 === "security") {
    return "High-reputation security audit agent eligible for direct private checkout.";
  }

  if (tag2 === "safety") {
    return "Audit-category candidate with safety feedback, but it still needs review before payment.";
  }

  if (tag2 === "agent-evaluation") {
    return "Historically well-rated audit candidate, but checkout depends on heartbeat status.";
  }

  return `Audit-category agent tagged as ${tag2}.`;
}

function decodeFeedbackRow(row: BigQueryLogRow): DecodedFeedback | null {
  if (!row.data || !Array.isArray(row.topics) || row.topics.length < 4) {
    return null;
  }

  try {
    const decoded = decodeEventLog({
      abi: [NEW_FEEDBACK_EVENT],
      topics: row.topics as [`0x${string}`, ...`0x${string}`[]],
      data: row.data as `0x${string}`,
    });

    const args = decoded.args as unknown as {
      agentId: bigint;
      clientAddress: `0x${string}`;
      feedbackIndex: bigint;
      value: bigint;
      valueDecimals: number;
      indexedTag1: `0x${string}`;
      tag1: string;
      tag2: string;
      endpoint: string;
      feedbackURI: string;
      feedbackHash: `0x${string}`;
    };

    const value = Number(args.value);
    const valueDecimals = Number(args.valueDecimals);
    const score = value / 10 ** valueDecimals;

    return {
      agentId: args.agentId.toString(),
      clientAddress: getAddress(args.clientAddress),
      feedbackIndex: Number(args.feedbackIndex),
      value,
      valueDecimals,
      score,
      tag1: args.tag1,
      tag2: args.tag2,
      endpoint: args.endpoint,
      feedbackURI: args.feedbackURI,
      feedbackHash: args.feedbackHash,
      txHash: row.transaction_hash ?? "",
    };
  } catch {
    return null;
  }
}

async function queryNewFeedbackRows(input?: {
  agentId?: string;
  indexedTag1?: string;
  limit?: number;
}) {
  const client = getBigQueryClient();
  const reputationRegistry = getReputationRegistryAddress();

  const limit = input?.limit ?? 1000;

  const where: string[] = [
    "block_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)",
    "address = @reputationRegistry",
    "topics[SAFE_OFFSET(0)] = @newFeedbackTopic",
  ];

  const params: Record<string, unknown> = {
    reputationRegistry,
    newFeedbackTopic: NEW_FEEDBACK_TOPIC,
    limit,
  };

  if (input?.agentId) {
    where.push("topics[SAFE_OFFSET(1)] = @agentIdTopic");
    params.agentIdTopic = agentIdToTopic(input.agentId);
  }

  if (input?.indexedTag1) {
    where.push("topics[SAFE_OFFSET(3)] = @indexedTag1Topic");
    params.indexedTag1Topic = tagToIndexedTopic(input.indexedTag1);
  }

  const query = `
    SELECT
      block_timestamp,
      transaction_hash,
      topics,
      data
    FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.logs\`
    WHERE ${where.join("\n      AND ")}
    ORDER BY block_timestamp DESC
    LIMIT @limit
  `;

  const [rows] = await client.query({
    query,
    location: "US",
    params,
  });

  return rows as BigQueryLogRow[];
}

export async function getBigQueryReputation(
  agentId: string
): Promise<ReputationSummary> {
  if (!/^\d+$/.test(agentId)) {
    throw new Error("invalid-agentId");
  }

  const rows = await queryNewFeedbackRows({
    agentId,
    limit: 1000,
  });

  const feedbacks = rows
    .map(decodeFeedbackRow)
    .filter((item): item is DecodedFeedback => Boolean(item))
    .filter((item) => item.agentId === agentId)
    .filter((item) => item.score >= 0);

  if (feedbacks.length === 0) {
    return {
      avgScore: null,
      uniqueClients: 0,
      feedbackCount: 0,
    };
  }

  const total = feedbacks.reduce((sum, item) => sum + item.score, 0);
  const clients = new Set(
    feedbacks.map((item) => item.clientAddress.toLowerCase())
  );

  return {
    avgScore: roundScore(total / feedbacks.length),
    uniqueClients: clients.size,
    feedbackCount: feedbacks.length,
  };
}

export async function searchBigQueryAgents(query: string) {
  const q = query.trim().toLowerCase();

  const rows = await queryNewFeedbackRows({
    limit: 1000,
  });

  const feedbacks = rows
    .map(decodeFeedbackRow)
    .filter((item): item is DecodedFeedback => Boolean(item))
    .filter((item) => item.score >= 0)
    .filter((item) => {
      if (!q) return true;

      const haystack = [
        item.agentId,
        item.tag1,
        item.tag2,
        item.endpoint,
        item.feedbackURI,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

  const byAgent = new Map<
    string,
    {
      agentId: string;
      tag1: string;
      tag2: string;
      endpoint: string;
      feedbackURI: string;
      latestTxHash: string;
      scores: number[];
      clients: Set<string>;
      tags: Set<string>;
    }
  >();

  for (const feedback of feedbacks) {
    const existing = byAgent.get(feedback.agentId);

    if (existing) {
      existing.scores.push(feedback.score);
      existing.clients.add(feedback.clientAddress.toLowerCase());
      existing.tags.add(feedback.tag1);
      existing.tags.add(feedback.tag2);

      if (!existing.endpoint && feedback.endpoint) {
        existing.endpoint = feedback.endpoint;
      }

      if (!existing.feedbackURI && feedback.feedbackURI) {
        existing.feedbackURI = feedback.feedbackURI;
      }
    } else {
      byAgent.set(feedback.agentId, {
        agentId: feedback.agentId,
        tag1: feedback.tag1,
        tag2: feedback.tag2,
        endpoint: feedback.endpoint,
        feedbackURI: feedback.feedbackURI,
        latestTxHash: feedback.txHash,
        scores: [feedback.score],
        clients: new Set([feedback.clientAddress.toLowerCase()]),
        tags: new Set([feedback.tag1, feedback.tag2]),
      });
    }
  }

  const agents: BigQueryAgentSearchResult[] = [];

  for (const item of byAgent.values()) {
    const name = extractEnsNameFromEndpoint(item.endpoint);

    if (!name) continue;

    const avgScore = roundScore(
      item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length
    );

    agents.push({
      name,
      label: labelFromEnsName(name),
      capability: item.tag1,
      expectedMode: "review-required",
      description: descriptionFromTag2(item.tag2),
      agentId: item.agentId,
      avgScore,
      uniqueClients: item.clients.size,
      feedbackCount: item.scores.length,
      tag1: item.tag1,
      tag2: item.tag2,
      tags: Array.from(item.tags),
      endpoint: item.endpoint,
      feedbackURI: item.feedbackURI,
      latestTxHash: item.latestTxHash,
    });
  }

  return agents.sort((a, b) => {
    if (b.uniqueClients !== a.uniqueClients) {
      return b.uniqueClients - a.uniqueClients;
    }

    return (b.avgScore ?? 0) - (a.avgScore ?? 0);
  });
}