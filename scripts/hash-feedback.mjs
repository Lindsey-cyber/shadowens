import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keccak256 } from "viem";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage:");
  console.error("  node scripts/hash-feedback.mjs public/feedback/audit-wallet-c.json");
  process.exit(1);
}

const absolutePath = resolve(filePath);

// Important: hash the raw file bytes, not a parsed JSON object.
// If you edit spaces, newlines, or timestamps, the hash will change.
const fileBytes = readFileSync(absolutePath);

const hash = keccak256(fileBytes);

console.log("");
console.log("File:");
console.log(filePath);
console.log("");
console.log("feedbackHash:");
console.log(hash);
console.log("");