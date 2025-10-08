// app/(site)/retro/page.tsx
"use client";

import { useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";

/* ---------- constants ---------- */
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const RENT_PER_ATA_SOL = 0.002; // display approximation
const FEE_BPS = 1000; // 10%
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.mainnet-beta.solana.com";

/* ---------- helpers ---------- */

// minimal retry with exponential backoff + jitter (for 429s)
async function withBackoff<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const is429 = msg.includes("429") || /rate/i.test(msg);
      if (!is429 || attempt >= tries - 1) throw e;
      const base = 400 * Math.pow(2, attempt); // 400ms, 800ms, 1600ms...
      const jitter = Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, base + jitter));
      attempt++;
    }
  }
}

/** Return true if the 8-byte u64 at `offset` is all zeros (no BigInt needed). */
function isU64Zero(buf: Uint8Array, offset: number): boolean {
  for (let i = 0; i < 8; i++) if (buf[offset + i] !== 0) return false;
  return true;
}

function fmtVal(v: number | null, empty = "—") {
  if (v === null || Number.isNaN(v)) return empty;
  return typeof v === "number" && v % 1 !== 0 ? v.toFixed(6) : String(v);
}

/* ---------- page ---------- */

export default function RetroPage() {
  const [open, setOpen] = useState(false);

  // scan state
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountsToClose, setAccountsToClose] = useState<number | null>(null);
  const [claimableSol, setClaimableSol] = useState<number | null>(null);
  const [feeSol, setFeeSol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);
    setAccountsToClose(null);
    setClaimableSol(null);
    setFeeSol(null);

    try {
      const addr = query.trim();
      if (!addr) throw new Error("Enter a wallet address to scan.");
      const owner = new PublicKey(addr);

      const connection = new Connection(RPC, { commitment: "processed" });

      // Low-CU (unparsed)
      const res = await withBackoff(() =>
        connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
      );

      // Count token accounts whose amount u64 == 0
      let zeroCount = 0;
      for (const { account } of res.value) {
        const raw =
          account.data instanceof Buffer
            ? new Uint8Array(account.data)
            : (account.data as unknown as Uint8Array);
        if (isU64Zero(raw, 64)) zeroCount++;
      }

      const claimable = +(zeroCount * RENT_PER_ATA_SOL).toFixed(6);
      const fee = +((claimable * FEE_BPS) / 10_000).toFixed(6);

      setAccountsToClose(zeroCount);
      setClaimableSol(claimable);
      setFeeSol(fee);
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      setError(
        msg.includes("429")
          ? "Rate limited by RPC. Please try again shortly (provider throttle)."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-0 pb-16">
        {/* TOP: Centered hero + collapsible steps */}
        <section className="mt-4">
          <Card className="px-6 pt-5 pb-4 sm:px-10 sm:pt-6 sm:pb-5">
            <div className="text-center">
              <div className="text-3xl text-cyan-300/90 font-medium tracking-wide mt-0">
                RETRO
              </div>
              <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-white">
                Scan & reclaim your locked SOL
              </h1>
              <p className="mx-auto mt-2 max-w-3xl text-[#DDA0DD]">
                We search your wallet for empty token accounts (ATAs) and other closeable accounts,
                <br /> then let you reclaim the rent deposits in one click.
              </p>

              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="mx-auto mt-3 flex w-fit flex-col items-center gap-1 rounded-md border border-[#7B4DFF]/40 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-300/90 hover:bg-white/10"
              >
                <span>What Retro Does</span>
                <span
                  className={`text-lg leading-none transition-transform ${
                    open ? "rotate-180" : "rotate-0"
                  }`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
            </div>

            {/* Collapsible content */}
            <div
              className={`mx-auto mt-1 w-full overflow-hidden transition-[max-height,opacity,margin-bottom] duration-300 ${
                open ? "max-h-[400px] opacity-100 mb-0" : "max-h-0 opacity-0 -mb-2"
              }`}
            >
              <div className="mx-auto max-w-2xl pt-2 pb-1">
                <ol className="space-y-4">
                  <Step
                    n={1}
                    title="Scan"
                    desc="Identify empty ATAs / closeable accounts holding rent deposits."
                  />
                  <Step
                    n={2}
                    title="Preview"
                    desc="See estimated SOL you can reclaim and our fee before approving."
                  />
                  <Step
                    n={3}
                    title="Claim"
                    desc="Close accounts in a single flow; SOL refunds to your wallet."
                  />
                </ol>
              </div>
            </div>
          </Card>
        </section>

        {/* SECOND: stats + search/scan */}
        <section className="mt-6">
          <Card className="p-6 sm:p-8">
            {/* narrow middle column */}
            <div className="grid gap-3 sm:grid-cols-[1fr_0.6fr_1fr]">
              <Fact label="Total Claimable SOL" value={fmtVal(claimableSol, "—")} />
              <Fact label="Accounts to Close" value={fmtVal(accountsToClose, "—")} />
              <Fact label="Claim Fee (10%)" value={fmtVal(feeSol, "—")} />
            </div>

            {/* Search + Scan aligned (button on the right) */}
            <form className="mt-6" onSubmit={handleScan}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  inputMode="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Connect your wallet or check an address"
                  className="flex-1 rounded-xl border border-[#7B4DFF]/40 bg-black/40 px-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7B4DFF]/40"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 rounded-xl border border-[#7B4DFF]/40 bg-white/10 px-4 py-2.5 text-white hover:bg-white/20 disabled:opacity-60"
                >
                  {loading ? "Scanning…" : "Scan Wallet"}
                </button>
              </div>
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </form>
          </Card>
        </section>

        {/* Table under it (placeholder) */}
        <section className="mt-8">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 pt-6">
              <h3 className="text-cyan-300/90 font-semibold">Scan results</h3>
              <p className="mt-1 text-sm text-gray-300">
                Connect and scan to populate. This table is a stub for now.
              </p>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-gray-300">
                  <tr>
                    <Th>Token</Th>
                    <Th>Account Address</Th>
                    <Th>Status</Th>
                    <Th className="text-right pr-6">Reclaimable</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <Tr>
                    <Td>USDC</Td>
                    <Td>...placeholder...</Td>
                    <Td>Empty ATA</Td>
                    <Td className="text-right pr-6">~0.002 SOL</Td>
                  </Tr>
                  <Tr>
                    <Td>PYTH</Td>
                    <Td>...placeholder...</Td>
                    <Td>Empty ATA</Td>
                    <Td className="text-right pr-6">~0.002 SOL</Td>
                  </Tr>
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ---------- lightweight UI bits ---------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white/5 border-[#7B4DFF]/40 shadow-[0_0_0_1px_rgba(123,77,255,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#7B4DFF]/40 bg-black/40 px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-gray-400">{label}</div>
        <div className="text-2xl sm:text-3xl font-semibold text-white tracking-tight text-right tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 grid h-7 w-7 place-items-center rounded-full bg-[#1DBAFC]/15 text-[#1DBAFC] border border-[#1DBAFC]/30 text-sm font-semibold">
        {n}
      </div>
      <div>
        <div className="text-[#DDA0DD] text-sm font-semibold">{title}</div>
        <div className="text-xs text-gray-300 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-6 py-2 text-left font-semibold ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-3 text-gray-200 ${className}`}>{children}</td>;
}
function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-white/5">{children}</tr>;
}
