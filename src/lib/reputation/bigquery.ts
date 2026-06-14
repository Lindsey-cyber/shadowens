import { BigQuery } from "@google-cloud/bigquery";

export type ReputationSummary = {
  avgScore: number | null;
  uniqueClients: number;
  feedbackCount: number;
};

const DEFAULT_REPUTATION_REGISTRY =
  "0x8004baa17c55a88189ae136b182e5fda19de9b63";

const NEW_FEEDBACK_TOPIC =
  "0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc";

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

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;

  if (typeof value === "object" && value !== null && "value" in value) {
    return Number((value as { value: unknown }).value);
  }

  return Number(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "object" && value !== null && "value" in value) {
    const n = Number((value as { value: unknown }).value);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function getBigQueryReputation(
  agentId: string
): Promise<ReputationSummary> {
  if (!/^\d+$/.test(agentId)) {
    throw new Error("invalid-agentId");
  }

  const client = getBigQueryClient();

  const reputationRegistry = (
    process.env.ERC8004_REPUTATION_REGISTRY ?? DEFAULT_REPUTATION_REGISTRY
  ).toLowerCase();

  const query = `
    WITH feedback AS (
      SELECT
        SAFE_CAST(topics[SAFE_OFFSET(1)] AS INT64) AS agent_id,
        LOWER(CONCAT('0x', SUBSTR(topics[SAFE_OFFSET(2)], 27))) AS client,
        SAFE_CAST(CONCAT('0x', SUBSTR(data, 67, 64)) AS INT64) AS raw_value,
        SAFE_CAST(CONCAT('0x', SUBSTR(data, 131, 64)) AS INT64) AS value_decimals
      FROM \`bigquery-public-data.goog_blockchain_ethereum_mainnet_us.logs\`
      WHERE address = @reputationRegistry
        AND topics[SAFE_OFFSET(0)] = @newFeedbackTopic
        AND SAFE_CAST(topics[SAFE_OFFSET(1)] AS INT64) = @agentId
        AND SUBSTR(data, 67, 1) != 'f'
    )
    SELECT
      ROUND(AVG(raw_value / POW(10, value_decimals)), 2) AS avgScore,
      COUNT(DISTINCT client) AS uniqueClients,
      COUNT(*) AS feedbackCount
    FROM feedback
  `;

  const [rows] = await client.query({
    query,
    location: "US",
    params: {
      agentId: Number(agentId),
      reputationRegistry,
      newFeedbackTopic: NEW_FEEDBACK_TOPIC,
    },
  });

  const row = rows[0] as
    | {
        avgScore?: unknown;
        uniqueClients?: unknown;
        feedbackCount?: unknown;
      }
    | undefined;

  return {
    avgScore: toNullableNumber(row?.avgScore),
    uniqueClients: toNumber(row?.uniqueClients),
    feedbackCount: toNumber(row?.feedbackCount),
  };
}