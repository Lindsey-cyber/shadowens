# ShadowENS

**ENS-native AI agent discovery, reputation, risk gating, and private checkout.**

ShadowENS turns ENS names into AI agent checkout identities. It helps users search for AI agents, evaluate their onchain reputation, check whether they are still active, and only pay agents that pass safety and policy checks.

Live demo: https://shadowens.vercel.app
Repository: https://github.com/Lindsey-cyber/shadowens

---

## Why ShadowENS

As AI agents become more common, users will need a trusted way to find and pay them.

There may be drawing agents, music agents, coding agents, smart contract audit agents, and many more. But not every agent is equally reliable. Just like people check restaurant ratings before spending money, users should be able to check an AI agent’s reputation before paying it.

ShadowENS is built for that flow:

1. Search for an agent by need, such as `audit`
2. Find agents from real onchain reputation feedback
3. Open an ENS Agent Passport
4. Check identity, reputation, heartbeat, and payment policy
5. Only allow checkout when the agent passes the safety checks
6. Create a one-time private payment address for each checkout

---

## What it does

ShadowENS uses ENS as the identity and policy layer for AI agents.

Each agent is represented by an ENS name, such as:

* `audit.shadowens-demo.eth`
* `debug.shadowens-demo.eth`
* `stale.shadowens-demo.eth`

The app resolves ENS text records for:

* `agent-context`
* `agent-endpoint[web]`
* `agent-endpoint[mcp]`
* `agent-registration[registry][agentId]`
* `com.shadowens.payment-policy`
* `com.shadowens.status`
* `com.shadowens.last-heartbeat`
* `com.shadowens.heartbeat-ttl-seconds`
* `com.shadowens.key-epoch`
* `avatar`

ShadowENS combines these ENS records with ERC-8004 reputation data from Google BigQuery and decides whether checkout should be:

* `direct-private-checkout`
* `review-required`
* `blocked`

---

## Demo agents

| ENS Agent                  | ERC-8004 Agent ID | Demo Purpose                          | Expected Result         |
| -------------------------- | ----------------: | ------------------------------------- | ----------------------- |
| `audit.shadowens-demo.eth` |           `34563` | Trusted audit agent                   | Direct private checkout |
| `debug.shadowens-demo.eth` |           `34564` | Active but lower reputation           | Review required         |
| `stale.shadowens-demo.eth` |           `34565` | High reputation but expired heartbeat | Blocked                 |

The three demo agents show three different risk outcomes:

* **Audit agent** passes ENS registration, reputation, and heartbeat checks.
* **Debug agent** is active but does not have enough reputation for direct checkout.
* **Stale agent** has reputation but fails the heartbeat check, so payment is blocked.

---

## How the flow works

Example: a user needs a smart contract audit agent.

1. The user searches `audit`
2. The backend queries Google BigQuery for real ERC-8004 feedback logs
3. ShadowENS finds agents with tags such as `audit`, `security`, or `safety`
4. The user opens `audit.shadowens-demo.eth`
5. The app reads the agent’s ENS text records
6. The app checks the ERC-8004 `agentId`
7. The app verifies the ENSIP-25 `agent-registration` record
8. The app checks heartbeat status
9. The app loads BigQuery-backed reputation data
10. The app computes the checkout mode
11. If checkout is allowed, the buyer signs a checkout authorization message
12. The backend verifies the signature and creates a payment intent
13. ShadowENS generates a fresh one-time payment address
14. ShadowENS creates an ENS-style checkout name, such as:

```txt
<shortId>.checkout.audit.shadowens-demo.eth
```

15. The buyer pays the one-time payment address
16. The backend verifies the USDC transfer

---

## Key features

### ENS Agent Passport

Each ENS name acts as an agent passport. It stores the agent’s metadata, endpoints, heartbeat, payment policy, avatar, and ERC-8004 binding.

### ERC-8004 reputation search

ShadowENS uses Google BigQuery to query Ethereum Mainnet ERC-8004 ReputationRegistry logs. The app aggregates feedback score, unique clients, feedback count, tags, endpoints, and feedback metadata.

### ENSIP-25 registration check

The app checks the ENS-side `agent-registration[registry][agentId]` record to verify that the ENS name is bound to the expected ERC-8004 agent.

### Heartbeat / dead man switch

Agents must stay active. If an agent’s heartbeat is expired, paused, or missing, checkout is blocked even if the agent has good historical reputation.

### Risk-gated checkout

Checkout is only allowed when the agent passes identity, registration, reputation, heartbeat, and policy checks.

### One-time private payment address

Every checkout gets a fresh payment address. The buyer pays the one-time address instead of seeing the agent provider’s permanent treasury wallet.

### Payment verification

The backend verifies the buyer’s USDC transfer to the one-time payment address before marking the checkout as paid.

---

## Tech stack

* Next.js App Router
* TypeScript
* ENS
* Ethereum Mainnet
* ERC-8004
* ENSIP-25 / ERC-7930
* Google Cloud BigQuery
* wagmi
* viem
* ethers
* TanStack Query
* Vercel

---

## Main APIs

### Resolve an ENS agent

```txt
GET /api/ens/resolve?name=audit.shadowens-demo.eth
```

This resolves ENS records, checks ERC-8004 binding, verifies ENSIP-25 registration, checks heartbeat, loads reputation, and returns the checkout mode.

### Search agents

```txt
GET /api/agents/search?q=audit
```

This searches agents using BigQuery-backed ERC-8004 reputation feedback.

### Get reputation

```txt
GET /api/google/reputation?agentId=34563
```

This returns reputation data for an ERC-8004 agent.

### Create checkout

```txt
POST /api/checkout/create
```

This creates a signed, one-time checkout intent when the agent is allowed to receive payment.

### Confirm checkout payment

```txt
POST /api/checkout/confirm
```

This verifies the USDC transfer to the one-time payment address.

---

## Example demo path

1. Open the live app
2. Search for `audit`
3. Open `audit.shadowens-demo.eth`
4. See that it is active, registered, and reputable
5. Create a private checkout
6. Sign the checkout authorization
7. Get a one-time payment address and checkout name

Then compare with:

* `debug.shadowens-demo.eth` → review required
* `stale.shadowens-demo.eth` → blocked because heartbeat expired

---

## Current prototype vs future work

The current prototype supports:

* ENS-based agent identity
* ENS text record resolution
* ERC-8004 agent binding
* ENSIP-25 registration checks
* BigQuery-backed reputation search
* Heartbeat-based safety gating
* Wallet signature authorization
* One-time payment address generation
* USDC payment verification

Future work:

* Upgrade ENS-style checkout names into real CCIP Read resolution
* Replace one-time EOAs with smart accounts or escrow accounts
* Add automatic settlement to the agent treasury
* Add richer payment status tracking
* Support more payment networks and tokens

---

## One-line summary

ShadowENS is Google Maps-style reputation and risk-gated private checkout for AI agents, powered by ENS identity and BigQuery-indexed onchain feedback.
