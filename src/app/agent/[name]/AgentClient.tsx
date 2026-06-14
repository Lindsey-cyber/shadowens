"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { parseUnits } from "viem";

import { buildCheckoutMessage } from "@/lib/auth/checkoutMessage";
import { erc20Abi } from "@/lib/payments/erc20Abi";
import {
  DEFAULT_PAYMENT_AMOUNT,
  DEFAULT_PAYMENT_TOKEN,
  MAINNET_USDC_ADDRESS,
  MAINNET_USDC_DECIMALS,
} from "@/lib/payments/constants";

type ResolveResponse = {
  ok: boolean;
  agent?: {
    name: string;
    records: {
      agentContext: {
        name: string;
        description?: string;
        capabilities: string[];
        registry: {
          agentId: string;
        };
      };
      webEndpoint: string;
      mcpEndpoint: string;
      checkoutEndpoint: string;
      avatar: string;
    };
    ensip25: {
      key: string;
      value: string;
      ensSideAttestationPresent: boolean;
    };
  };
  heartbeat?: {
    status: string;
    checkoutAllowed: boolean;
    reason: string;
    expiresAt?: string;
  };
  reputation?: {
    avgScore: number | null;
    uniqueClients: number;
    feedbackCount: number;
  } | null;
  checkoutMode?: {
    mode: string;
    reason: string;
  };
  error?: string;
};

type PaymentIntent = {
  intentId: string;
  ensName: string;
  agentId: string;
  amount: string;
  token: string;
  chainId: number;
  payer: string;
  checkoutName: string;
  paymentAddress: string;
  privateKeyDevOnly?: string;
  status: "pending" | "paid" | "expired" | "failed";
  createdAt: string;
  expiresAt: string;
  txHash?: string;
  paidAt?: string;
};

type CheckoutCreateResponse = {
  ok: boolean;
  intent?: PaymentIntent;
  error?: string;
  [key: string]: unknown;
};

type CheckoutConfirmResponse = {
  ok: boolean;
  intent?: PaymentIntent;
  error?: string;
  [key: string]: unknown;
};

const BUYER_WALLET =
  process.env.NEXT_PUBLIC_ALLOWED_PAYER_ADDRESS ??
  "0x056ff64607a69d46a44da451B7e79DA246048a8A";
const PAYMENT_AMOUNT = DEFAULT_PAYMENT_AMOUNT;
const PAYMENT_TOKEN = DEFAULT_PAYMENT_TOKEN;

export default function AgentClient({ name }: { name: string }) {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switchPending } = useSwitchChain();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const { writeContractAsync, isPending: isPaymentPending } = useWriteContract();

  const connectedToBuyerWallet =
    address?.toLowerCase() === BUYER_WALLET.toLowerCase();

  const [data, setData] = useState<ResolveResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const [checkoutResult, setCheckoutResult] = useState<unknown>(null);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  async function loadAgent() {
    setLoading(true);
    setCheckoutResult(null);
    setPaymentIntent(null);
    setPaymentTxHash(null);

    try {
      const res = await fetch(
        `/api/ens/resolve?name=${encodeURIComponent(name)}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();
      setData(json);
    } catch (error) {
      setData({
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  async function createCheckout() {
    setCheckoutLoading(true);
    setCheckoutResult(null);
    setPaymentIntent(null);
    setPaymentTxHash(null);

    try {
      if (!isConnected || !address) {
        setCheckoutResult({
          ok: false,
          error: "wallet-not-connected",
          expectedWallet: BUYER_WALLET,
        });
        return;
      }

      if (!connectedToBuyerWallet) {
        setCheckoutResult({
          ok: false,
          error: "wrong-wallet-connected",
          connectedAddress: address,
          expectedWallet: BUYER_WALLET,
        });
        return;
      }

      if (chainId !== mainnet.id) {
        setCheckoutResult({
          ok: false,
          error: "wrong-chain",
          connectedChainId: chainId,
          expectedChainId: mainnet.id,
        });
        return;
      }

      const nonceRes = await fetch("/api/auth/checkout-nonce", {
        method: "POST",
      });

      const nonceJson = await nonceRes.json();

      if (!nonceJson.ok) {
        setCheckoutResult({
          ok: false,
          error: nonceJson.error ?? "failed-to-create-nonce",
          details: nonceJson,
        });
        return;
      }

      const message = buildCheckoutMessage({
        appUrl: window.location.origin,
        ensName: name,
        amount: PAYMENT_AMOUNT,
        token: PAYMENT_TOKEN,
        chainId: mainnet.id,
        payer: address,
        nonce: nonceJson.nonce,
        issuedAt: nonceJson.issuedAt,
        expiresAt: nonceJson.expiresAt,
      });

      const signature = await signMessageAsync({
        message,
      });

      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ensName: name,
          amount: PAYMENT_AMOUNT,
          token: PAYMENT_TOKEN,
          chainId: mainnet.id,
          payer: address,
          nonce: nonceJson.nonce,
          issuedAt: nonceJson.issuedAt,
          expiresAt: nonceJson.expiresAt,
          signature,
        }),
      });

      const json = (await res.json()) as CheckoutCreateResponse;

      setCheckoutResult(json);

      if (json.ok && json.intent) {
        setPaymentIntent(json.intent);
      }
    } catch (error) {
      setCheckoutResult({
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      });
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function payIntent() {
    setPaymentLoading(true);
    setCheckoutResult(null);

    try {
      if (!paymentIntent) {
        setCheckoutResult({
          ok: false,
          error: "no-payment-intent",
        });
        return;
      }

      if (!isConnected || !address) {
        setCheckoutResult({
          ok: false,
          error: "wallet-not-connected",
        });
        return;
      }

      if (!connectedToBuyerWallet) {
        setCheckoutResult({
          ok: false,
          error: "wrong-wallet-connected",
          connectedAddress: address,
          expectedWallet: BUYER_WALLET,
        });
        return;
      }

      if (chainId !== mainnet.id) {
        setCheckoutResult({
          ok: false,
          error: "wrong-chain",
          connectedChainId: chainId,
          expectedChainId: mainnet.id,
        });
        return;
      }

      if (paymentIntent.status !== "pending") {
        setCheckoutResult({
          ok: false,
          error: "intent-not-pending",
          currentStatus: paymentIntent.status,
        });
        return;
      }

      const txHash = await writeContractAsync({
        address: MAINNET_USDC_ADDRESS,
        abi: erc20Abi,
        functionName: "transfer",
        args: [
          paymentIntent.paymentAddress as `0x${string}`,
          parseUnits(paymentIntent.amount, MAINNET_USDC_DECIMALS),
        ],
      });

      setPaymentTxHash(txHash);

      const confirmRes = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intentId: paymentIntent.intentId,
          txHash,
          payer: address,
        }),
      });

      const confirmJson = (await confirmRes.json()) as CheckoutConfirmResponse;

      setCheckoutResult(confirmJson);

      if (confirmJson.ok && confirmJson.intent) {
        setPaymentIntent(confirmJson.intent);
      }
    } catch (error) {
      setCheckoutResult({
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      });
    } finally {
      setPaymentLoading(false);
    }
  }

  async function refreshPaymentStatus() {
    if (!paymentIntent) return;

    setStatusLoading(true);

    try {
      const res = await fetch(
        `/api/checkout/status?intentId=${encodeURIComponent(
          paymentIntent.intentId
        )}`,
        {
          cache: "no-store",
        }
      );

      const json = await res.json();

      setCheckoutResult(json);

      if (json.ok && json.intent) {
        setPaymentIntent(json.intent);
      }
    } catch (error) {
      setCheckoutResult({
        ok: false,
        error: error instanceof Error ? error.message : "unknown-error",
      });
    } finally {
      setStatusLoading(false);
    }
  }

  const mode = data?.checkoutMode?.mode;

  const modeClass =
    mode === "direct-private-checkout"
      ? "badge"
      : mode === "blocked"
        ? "badge blocked"
        : "badge warning";

  const canCreateCheckout =
    !checkoutLoading &&
    isConnected &&
    connectedToBuyerWallet &&
    chainId === mainnet.id &&
    data?.checkoutMode?.mode === "direct-private-checkout";

  const canPay =
    !paymentLoading &&
    !!paymentIntent &&
    paymentIntent.status === "pending" &&
    isConnected &&
    connectedToBuyerWallet &&
    chainId === mainnet.id;

  return (
    <main className="page">
      <section className="hero">
        <div className="kicker">ENS Agent Passport</div>
        <h1>{name}</h1>

        <div className="card" style={{ marginTop: 24 }}>
          <h2>Buyer Wallet</h2>

          {!isConnected ? (
            <>
              <p>Expected buyer wallet: {BUYER_WALLET}</p>
              <button
                className="button"
                disabled={connectPending || connectors.length === 0}
                onClick={() => connect({ connector: connectors[0] })}
              >
                {connectPending ? "Connecting..." : "Connect Buyer Wallet"}
              </button>
            </>
          ) : (
            <>
              <p>Connected wallet: {address}</p>
              <p>
                Buyer wallet match:{" "}
                <span
                  className={connectedToBuyerWallet ? "badge" : "badge warning"}
                >
                  {connectedToBuyerWallet ? "yes" : "no"}
                </span>
              </p>

              <p>Connected chainId: {chainId ?? "unknown"}</p>

              {chainId !== mainnet.id ? (
                <button
                  className="button"
                  disabled={switchPending}
                  onClick={() => switchChain({ chainId: mainnet.id })}
                >
                  {switchPending
                    ? "Switching..."
                    : "Switch to Ethereum Mainnet"}
                </button>
              ) : null}

              <button
                className="button"
                style={{ marginLeft: 12 }}
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {loading && <p>Resolving ENS records...</p>}

        {!loading && !data?.ok && (
          <>
            <p className="badge blocked">Resolve failed</p>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}

        {!loading && data?.ok && data.agent && (
          <>
            <p>{data.agent.records.agentContext.description}</p>

            <button
              className="button"
              style={{ marginTop: 16 }}
              disabled={loading}
              onClick={loadAgent}
            >
              Refresh agent reputation / heartbeat
            </button>

            <div className="grid">
              <div className="card">
                <h2>Identity</h2>
                <p>Agent name: {data.agent.records.agentContext.name}</p>
                <p>
                  Agent ID:{" "}
                  {data.agent.records.agentContext.registry.agentId}
                </p>
                <p>
                  ENSIP-25:{" "}
                  {data.agent.ensip25.ensSideAttestationPresent
                    ? "present"
                    : "missing"}
                </p>
              </div>

              <div className="card">
                <h2>Status</h2>
                <p>Heartbeat: {data.heartbeat?.status}</p>
                <p>Reason: {data.heartbeat?.reason}</p>
                <p>Expires: {data.heartbeat?.expiresAt ?? "N/A"}</p>
              </div>

              <div className="card">
                <h2>Checkout</h2>
                <p className={modeClass}>{data.checkoutMode?.mode}</p>
                <p>Reason: {data.checkoutMode?.reason}</p>
              </div>
            </div>

            <div className="grid">
              <div className="card">
                <h2>Capabilities</h2>
                <p>
                  {data.agent.records.agentContext.capabilities.join(", ")}
                </p>
              </div>

              <div className="card">
                <h2>BigQuery Reputation</h2>
                <p>Average score: {data.reputation?.avgScore ?? "N/A"}</p>
                <p>Unique clients: {data.reputation?.uniqueClients ?? 0}</p>
                <p>Feedback count: {data.reputation?.feedbackCount ?? 0}</p>
              </div>

              <div className="card">
                <h2>Private Checkout</h2>

                <p>
                  Amount: {PAYMENT_AMOUNT} {PAYMENT_TOKEN}
                </p>
                <p>Network: Ethereum Mainnet</p>
                <p>Token contract: {MAINNET_USDC_ADDRESS}</p>

                <button
                  className="button"
                  disabled={!canCreateCheckout}
                  onClick={createCheckout}
                >
                  {checkoutLoading
                    ? "Signing / Creating..."
                    : "Create Private Checkout"}
                </button>

                {!isConnected ? (
                  <p>Connect buyer wallet first.</p>
                ) : !connectedToBuyerWallet ? (
                  <p>Wrong wallet. Please connect the buyer wallet.</p>
                ) : chainId !== mainnet.id ? (
                  <p>Switch to Ethereum Mainnet before checkout.</p>
                ) : data.checkoutMode?.mode !== "direct-private-checkout" ? (
                  <p>Checkout is not available for this agent.</p>
                ) : null}
              </div>
            </div>

            {paymentIntent ? (
              <div className="card" style={{ marginTop: 24 }}>
                <h2>Payment Intent</h2>

                <p>Intent ID: {paymentIntent.intentId}</p>
                <p>Status: {paymentIntent.status}</p>
                <p>
                  Amount: {paymentIntent.amount} {paymentIntent.token}
                </p>

                <div style={{ marginTop: 16 }}>
                  <p>
                    <strong>ENS-style checkout name:</strong>
                  </p>
                  <p style={{ wordBreak: "break-all" }}>
                    {paymentIntent.checkoutName}
                  </p>
                </div>

                <div style={{ marginTop: 16 }}>
                  <p>
                    <strong>Resolved one-time payment address:</strong>
                  </p>
                  <p style={{ wordBreak: "break-all" }}>
                    {paymentIntent.paymentAddress}
                  </p>
                </div>

                <p style={{ marginTop: 16 }}>
                  This checkout name is created per payment intent and resolves
                  to a fresh payment address. The buyer does not pay the
                  agent&apos;s permanent treasury wallet directly.
                </p>

                <p>Expires at: {paymentIntent.expiresAt}</p>

                {paymentIntent.status === "pending" ? (
                  <>
                    <button
                      className="button"
                      disabled={!canPay || isPaymentPending}
                      onClick={payIntent}
                    >
                      {paymentLoading || isPaymentPending
                        ? "Confirming Ethereum Mainnet USDC payment..."
                        : `Pay ${paymentIntent.amount} USDC to ENS checkout address`}
                    </button>

                    <button
                      className="button"
                      style={{ marginLeft: 12 }}
                      disabled={statusLoading}
                      onClick={refreshPaymentStatus}
                    >
                      {statusLoading ? "Refreshing..." : "Refresh Status"}
                    </button>
                  </>
                ) : null}

                {paymentIntent.status === "paid" ? (
                  <p className="badge">
                    Payment received. Agent session unlocked.
                  </p>
                ) : null}

                {paymentIntent.status === "expired" ? (
                  <p className="badge blocked">
                    Checkout expired. Create a new private checkout address.
                  </p>
                ) : null}

                {paymentTxHash ? (
                  <p style={{ wordBreak: "break-all" }}>
                    Payment txHash: {paymentTxHash}
                  </p>
                ) : null}

                {paymentIntent.txHash ? (
                  <p style={{ wordBreak: "break-all" }}>
                    Verified txHash: {paymentIntent.txHash}
                  </p>
                ) : null}
              </div>
            ) : null}

            {checkoutResult ? (
              <>
                <h2 style={{ marginTop: 32 }}>Checkout / Payment result</h2>
                <pre>{JSON.stringify(checkoutResult, null, 2)}</pre>
              </>
            ) : null}

            <h2 style={{ marginTop: 32 }}>Raw resolution</h2>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </>
        )}
      </section>
    </main>
  );
}