import { decodeEventLog, getAddress, parseAbiItem, parseUnits } from "viem";
import { baseClient } from "./baseClient";
import { BASE_USDC_ADDRESS, BASE_USDC_DECIMALS } from "./constants";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

export async function verifyUsdcTransfer(input: {
  txHash: `0x${string}`;
  expectedFrom: `0x${string}`;
  expectedTo: `0x${string}`;
  expectedAmount: string;
}) {
  const receipt = await baseClient.getTransactionReceipt({
    hash: input.txHash,
  });

  if (receipt.status !== "success") {
    return {
      ok: false as const,
      error: "tx-not-successful",
      receiptStatus: receipt.status,
    };
  }

  const expectedFrom = getAddress(input.expectedFrom);
  const expectedTo = getAddress(input.expectedTo);
  const expectedValue = parseUnits(input.expectedAmount, BASE_USDC_DECIMALS);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== getAddress(BASE_USDC_ADDRESS)) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });

      const from = getAddress(decoded.args.from as `0x${string}`);
      const to = getAddress(decoded.args.to as `0x${string}`);
      const value = decoded.args.value as bigint;

      if (from === expectedFrom && to === expectedTo && value >= expectedValue) {
        return {
          ok: true as const,
          txHash: input.txHash,
          from,
          to,
          value: value.toString(),
          blockNumber: receipt.blockNumber.toString(),
        };
      }
    } catch {
      continue;
    }
  }

  return {
    ok: false as const,
    error: "matching-transfer-not-found",
  };
}