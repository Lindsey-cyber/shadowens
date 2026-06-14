import { Wallet } from "ethers";

const wallet = Wallet.createRandom();

console.log("GATEWAY_SIGNER_ADDRESS=", wallet.address);
console.log("GATEWAY_SIGNER_PRIVATE_KEY=", wallet.privateKey);