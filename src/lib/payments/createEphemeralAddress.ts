import { Wallet } from "ethers";

export function createEphemeralAddress() {
  const wallet = Wallet.createRandom();

  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}