import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_URL),
});