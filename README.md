# ShadowENS MVP

ShadowENS turns ENS names into AI agent checkout identities.

This MVP resolves ENS text records for:

- agent-context
- agent-endpoint[web]
- agent-endpoint[mcp]
- agent-registration[registry][agentId]
- com.shadowens.payment-policy
- com.shadowens.last-heartbeat
- avatar

The app combines ENS-resolved policy with mock reputation data and decides whether checkout should be direct, review-required, or blocked.

## Demo agents

- audit.shadowens-demo.eth → agentId 34563
- debug.shadowens-demo.eth → agentId 34564
- stale.shadowens-demo.eth → agentId 34565
