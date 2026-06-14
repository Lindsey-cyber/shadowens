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

1. 用户搜索 audit
2. 后端查 BigQuery，找到 tag=audit 的真实 feedback agents
3. 用户点 audit.shadowens-demo.eth
4. app 读取 audit 的 ENS text records
5. app 查 BigQuery reputation
6. app 判断 audit 可付款
7. buyer 签名创建 checkout
8. 后端创建 intentId 和 paymentAddress
9. 后端创建 checkoutName:
   pay-abc123.audit.shadowens-demo.eth
10. 用户或 app 用 CCIP Read resolver 解析 checkoutName
11. resolver 通过 gateway 返回 paymentAddress
12. buyer 给 paymentAddress 付 USDC
13. 后端验证 USDC Transfer