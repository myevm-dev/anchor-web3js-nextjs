// app/(site)/retro/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";

/* ---------- constants ---------- */
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const FEE_BPS = 1000; // 10%
const RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ??
  "https://api.mainnet-beta.solana.com";
const FEE_TREASURY = new PublicKey(
  "PpokPuQ4zhMkTc8B376acPzAXiVZTaakWjqMaWKfJ9P"
);
const MAX_CLOSES_PER_TX = 8;

/* ---------- types ---------- */
type MaybeEndpoint = { rpcEndpoint?: string; _rpcEndpoint?: string };

type TokenMeta = { name?: string; symbol?: string; logoURI?: string };
type TokenMetaJson = { image?: string | null };

type ClosableAccount = {
  accountAddress: string;
  mint: string;
  lamports: number; // exact rent deposit in lamports
  reclaimable: number; // lamports / LAMPORTS_PER_SOL
  meta?: TokenMeta;
};

/* ---------- tiny utils ---------- */

// retry helper for 429 / provider throttles
async function withBackoff<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let a = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if ((!msg.includes("429") && !/rate/i.test(msg)) || a >= tries - 1) throw e;
      const wait = 400 * 2 ** a + Math.floor(Math.random() * 200);
      await new Promise((r) => setTimeout(r, wait));
      a++;
    }
  }
}

// SPL token account: amount u64 at offset 64 — check all 8 bytes zero
function isU64Zero(buf: Uint8Array, offset = 64): boolean {
  for (let i = 0; i < 8; i++) if (buf[offset + i] !== 0) return false;
  return true;
}

function fmtVal(v: number | null, empty = "—") {
  if (v === null || Number.isNaN(v)) return empty;
  return v % 1 ? v.toFixed(6) : String(v);
}
const short = (s: string, n = 4) =>
  (s.length <= 2 * n + 3 ? s : `${s.slice(0, n)}…${s.slice(-n)}`);

const toStringSafe = (v: unknown): string =>
  typeof v === "string" ? v : v instanceof Uint8Array ? new TextDecoder().decode(v) : "";

// fetch with timeout
async function fetchJsonWithTimeout(url: string, ms = 4500) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), ms);
  const r = await fetch(url, { signal: c.signal, cache: "default", mode: "cors" });
  clearTimeout(id);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ---------- metadata helpers ---------- */

// Jupiter list (fault tolerant)
let TOKEN_LIST_CACHE: Record<string, TokenMeta> | null = null;

async function loadTokenList(): Promise<Record<string, TokenMeta>> {
  if (TOKEN_LIST_CACHE) return TOKEN_LIST_CACHE;

  const sources = [
    "https://token.jup.ag/all",
    "https://cache.jup.ag/tokens",
    "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json",
  ];

  for (const url of sources) {
    try {
      const data: any = await fetchJsonWithTimeout(url, 4500);
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.tokens)
        ? data.tokens
        : [];
      const map: Record<string, TokenMeta> = {};
      for (const t of list) {
        const addr = t.address ?? t.mintAddress ?? t.mint ?? t.addresses?.solana;
        if (!addr) continue;
        map[addr] = { name: t.name, symbol: t.symbol, logoURI: t.logoURI ?? t.logo };
      }
      TOKEN_LIST_CACHE = map;
      return TOKEN_LIST_CACHE;
    } catch {
      // try next source
    }
  }
  TOKEN_LIST_CACHE = {};
  return TOKEN_LIST_CACHE;
}

async function enrichMeta(mints: string[]): Promise<Record<string, TokenMeta>> {
  const list = await loadTokenList().catch(() => ({} as Record<string, TokenMeta>));
  const out: Record<string, TokenMeta> = {};
  for (const m of mints) if (list[m]) out[m] = list[m];
  return out;
}

async function enrichWithOnchainMeta(
  umiInst: ReturnType<typeof createUmi>,
  mints: string[]
): Promise<Record<string, TokenMeta>> {
  const out: Record<string, TokenMeta> = {};
  await Promise.all(
    mints.map(async (mint) => {
      try {
        const md: any = await fetchMetadataFromSeeds(umiInst, { mint: umiPk(mint) });
        const container =
          md && typeof md === "object" ? (("data" in md && md.data) ? md.data : md) : null;
        const name = toStringSafe(container?.name).replace(/\0/g, "").trim();
        const symbol = toStringSafe(container?.symbol).replace(/\0/g, "").trim();
        const uri = toStringSafe(container?.uri).replace(/\0/g, "").trim();

        let logoURI: string | undefined;
        if (uri) {
          const j = (await fetchJsonWithTimeout(uri, 4500).catch(() => null)) as TokenMetaJson | null;
          if (j?.image) {
            logoURI = j.image.startsWith("ipfs://")
              ? `https://ipfs.io/ipfs/${j.image.replace("ipfs://", "")}`
              : j.image;
          }
        }
        if (name || symbol || logoURI) out[mint] = { name, symbol, logoURI };
      } catch {
        // ignore; fallback happens next
      }
    })
  );
  return out;
}

/* ---------- page ---------- */

export default function RetroPage() {
  const [open, setOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [scannedOwner, setScannedOwner] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [accountsToClose, setAccountsToClose] = useState<number | null>(null);
  const [claimableSol, setClaimableSol] = useState<number | null>(null);
  const [feeSol, setFeeSol] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metaWarn, setMetaWarn] = useState<string | null>(null);
  const [rows, setRows] = useState<ClosableAccount[]>([]);

  // fee-pay state
  const [feeLamportsRequired, setFeeLamportsRequired] = useState(0);
  const [feePaidAll, setFeePaidAll] = useState(false);
  const [payingAll, setPayingAll] = useState(false);
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>({});
  const [payingRow, setPayingRow] = useState<string | null>(null);

  const { connection: connectionFromAdapter } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const connectedAddress = publicKey?.toBase58() ?? "";

  // Umi based on the current RPC used by the wallet adapter (fallback to env)
  const umi = useMemo(() => {
    const ep = connectionFromAdapter as unknown as MaybeEndpoint;
    const endpoint = ep?.rpcEndpoint ?? ep?._rpcEndpoint ?? RPC;
    return createUmi(endpoint);
  }, [connectionFromAdapter]);

  const canClaim = useMemo(
    () => !!publicKey && scannedOwner && connectedAddress === scannedOwner,
    [publicKey, scannedOwner, connectedAddress]
  );

  const allRowsPaid = useMemo(
    () => rows.length > 0 && rows.every((r) => !!paidMap[r.accountAddress]),
    [rows, paidMap]
  );

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setMetaWarn(null);
    setLoading(true);
    setAccountsToClose(null);
    setClaimableSol(null);
    setFeeSol(null);
    setRows([]);

    try {
      const addr = query.trim();
      if (!addr) throw new Error("Enter a wallet address to scan.");
      const owner = new PublicKey(addr);
      setScannedOwner(owner.toBase58());

      const rpcConn = connectionFromAdapter ?? new Connection(RPC, { commitment: "processed" });

      // Low-CU (unparsed)
      const res = await withBackoff(() =>
        rpcConn.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID })
      );

      const closables: ClosableAccount[] = [];
      for (const it of res.value) {
        // raw SPL account data to check amount==0
        const raw =
          it.account.data instanceof Buffer
            ? new Uint8Array(it.account.data)
            : (it.account.data as unknown as Uint8Array);

        if (isU64Zero(raw, 64)) {
          const mint = new PublicKey(raw.slice(0, 32)).toBase58();
          const lamports = it.account.lamports ?? 0;
          const reclaimable = lamports / LAMPORTS_PER_SOL;

          closables.push({
            accountAddress: it.pubkey.toBase58(),
            mint,
            lamports,
            reclaimable,
          });
        }
      }

      const totalLamports = closables.reduce((s, c) => s + c.lamports, 0);
      const claimable = +(totalLamports / LAMPORTS_PER_SOL).toFixed(6);
      const feeLamports = Math.floor((totalLamports * FEE_BPS) / 10_000);

      // Show rows + stats immediately
      setAccountsToClose(closables.length);
      setClaimableSol(claimable);
      setFeeSol(+(feeLamports / LAMPORTS_PER_SOL).toFixed(6));
      setFeeLamportsRequired(feeLamports);

      // reset fee-pay state on every fresh scan
      setFeePaidAll(false);
      setPaidMap({});
      setPayingAll(false);
      setPayingRow(null);

      setRows(closables);

      // Enrich metadata in the background:
      (async () => {
        try {
          const mints = Array.from(new Set(closables.map((c) => c.mint)));
          const onchain = await enrichWithOnchainMeta(umi, mints);
          if (Object.keys(onchain).length) {
            setRows((prev) => prev.map((r) => ({ ...r, meta: onchain[r.mint] ?? r.meta })));
          }
          const missing = mints.filter((m) => !onchain[m]);
          if (missing.length) {
            const jup = await enrichMeta(missing);
            if (Object.keys(jup).length) {
              setRows((prev) => prev.map((r) => ({ ...r, meta: jup[r.mint] ?? r.meta })));
            }
          }
        } catch {
          setMetaWarn("Token logos/names unavailable right now.");
        }
      })();
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      setError(msg.includes("429") ? "Rate limited by RPC. Try again shortly (provider throttle)." : msg);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- fee payment ---------- */

  async function handlePayFeeAll() {
    try {
      if (!publicKey) throw new Error("Connect your wallet first.");
      if (!canClaim) throw new Error("Connect the scanned wallet to pay.");
      if (feeLamportsRequired <= 0) throw new Error("Nothing to close.");

      setPayingAll(true);
      const conn = connectionFromAdapter ?? new Connection(RPC, { commitment: "processed" });

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: FEE_TREASURY,
          lamports: feeLamportsRequired,
        })
      );

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, conn);
      await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      setFeePaidAll(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setPayingAll(false);
    }
  }

  async function handlePayFeeRow(r: ClosableAccount) {
    try {
      if (!publicKey) throw new Error("Connect your wallet first.");
      if (!canClaim) throw new Error("Connect the scanned wallet to pay.");
      const rowFeeLamports = Math.floor((r.lamports * FEE_BPS) / 10_000);
      if (rowFeeLamports <= 0) {
        setPaidMap((prev) => ({ ...prev, [r.accountAddress]: true }));
        return;
      }

      setPayingRow(r.accountAddress);
      const conn = connectionFromAdapter ?? new Connection(RPC, { commitment: "processed" });

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: FEE_TREASURY,
          lamports: rowFeeLamports,
        })
      );

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, conn);
      await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      setPaidMap((prev) => ({ ...prev, [r.accountAddress]: true }));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setPayingRow(null);
    }
  }

  /* ---------- recompute + claiming ---------- */

  function recomputeTotalsFrom(nextRows: ClosableAccount[]) {
    const totalLamports = nextRows.reduce((s, r) => s + (r.lamports | 0), 0);
    const claimable = +(totalLamports / LAMPORTS_PER_SOL).toFixed(6);
    const feeLamports = Math.floor((totalLamports * FEE_BPS) / 10_000);

    setAccountsToClose(nextRows.length);
    setClaimableSol(claimable);
    setFeeSol(+(feeLamports / LAMPORTS_PER_SOL).toFixed(6));
    setFeeLamportsRequired(feeLamports);

    // global-all fee becomes invalid if the set changes
    setFeePaidAll(false);

    // keep per-row paid flags only for rows that remain
    setPaidMap((prev) => {
      const alive = new Set(nextRows.map((r) => r.accountAddress));
      const next: Record<string, boolean> = {};
      for (const k in prev) if (alive.has(k)) next[k] = prev[k];
      return next;
    });
  }

  async function handleClaimOne(r: ClosableAccount) {
    try {
      if (!publicKey) throw new Error("Connect your wallet to claim.");
      if (!scannedOwner) throw new Error("Scan an address first.");
      if (connectedAddress !== scannedOwner) {
        throw new Error("Connected wallet must match the scanned address.");
      }
      if (!feePaidAll && !paidMap[r.accountAddress]) {
        throw new Error("Pay the 10% fee (all or this row) to unlock claim.");
      }

      const conn = connectionFromAdapter ?? new Connection(RPC, { commitment: "processed" });

      // Close-only tx
      const closeIx = createCloseAccountInstruction(
        new PublicKey(r.accountAddress),
        publicKey,
        publicKey
      );
      const tx = new Transaction().add(closeIx);

      const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const sig = await sendTransaction(tx, conn);
      await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

      // remove row + recompute totals
      setRows((prev) => {
        const next = prev.filter((x) => x.accountAddress !== r.accountAddress);
        recomputeTotalsFrom(next);
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  const handleClaimAll = async () => {
    try {
      if (!publicKey) throw new Error("Connect your wallet to claim.");
      if (!scannedOwner) throw new Error("Scan an address first.");
      if (connectedAddress !== scannedOwner) {
        throw new Error("Connected wallet must match the scanned address.");
      }
      if (!feePaidAll && !allRowsPaid) {
        throw new Error("Pay the 10% fee (all or per-row for all rows) to unlock Close All.");
      }

      const conn = connectionFromAdapter ?? new Connection(RPC, { commitment: "processed" });
      const snapshot = [...rows];

      for (let i = 0; i < snapshot.length; i += MAX_CLOSES_PER_TX) {
        const batch = snapshot.slice(i, i + MAX_CLOSES_PER_TX);

        const tx = new Transaction();
        for (const r of batch) {
          tx.add(
            createCloseAccountInstruction(
              new PublicKey(r.accountAddress),
              publicKey,
              publicKey
            )
          );
        }

        const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        const sig = await sendTransaction(tx, conn);
        await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

        // prune the ones we just closed
        setRows((prev) => {
          const next = prev.filter((r) => !batch.find((b) => b.accountAddress === r.accountAddress));
          recomputeTotalsFrom(next);
          return next;
        });
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  };

  /* ---------- render ---------- */

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-0 pb-16">
        {/* HERO */}
        <section className="mt-4">
          <Card className="px-6 pt-5 pb-4 sm:px-10 sm:pt-6 sm:pb-5">
            <Hero open={open} setOpen={setOpen} />
          </Card>
        </section>

        {/* STATS + FORM */}
        <section className="mt-6">
          <Card className="p-6 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-[1fr_0.6fr_1fr]">
              <Fact label="Total Claimable SOL" value={fmtVal(claimableSol, "—")} />
              <Fact label="Accounts to Close" value={fmtVal(accountsToClose, "—")} />
              <Fact label="Claim Fee (10%)" value={fmtVal(feeSol, "—")} />
            </div>

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
              {metaWarn && <p className="mt-2 text-xs text-gray-400">{metaWarn}</p>}
              {scannedOwner && (
                <p className="mt-2 text-xs text-gray-400">
                  Scanned: <span className="text-gray-300">{short(scannedOwner, 6)}</span>{" "}
                  {canClaim ? "— ready to pay & claim" : "— connect this wallet to proceed"}
                </p>
              )}
            </form>
          </Card>
        </section>

        {/* TABLE */}
        <section className="mt-8">
          <Card className="p-0 overflow-hidden">
            <div className="px-6 pt-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-cyan-300/90 font-semibold">Closable token accounts</h3>
                  <p className="mt-1 text-sm text-gray-300">
                    Zero-balance SPL token accounts detected for this address. Each refunds its rent deposit on close.
                  </p>
                </div>

                {/* Header actions: Pay All + Close All */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePayFeeAll}
                    disabled={!canClaim || rows.length === 0 || feePaidAll || payingAll}
                    className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-4 py-2.5 text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
                    title={canClaim ? "Pay 10% fee for all accounts" : "Connect the scanned wallet to pay"}
                  >
                    {feePaidAll
                      ? "Fee Paid ✓"
                      : payingAll
                      ? "Paying…"
                      : `Pay All ${(feeLamportsRequired / LAMPORTS_PER_SOL).toFixed(6)} SOL`}
                  </button>

                  <button
                    type="button"
                    onClick={handleClaimAll}
                    disabled={!canClaim || rows.length === 0 || (!feePaidAll && !allRowsPaid)}
                    className="rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-2.5 text-emerald-200 hover:bg-emerald-400/25 disabled:opacity-50"
                    title={canClaim ? "Close all empty token accounts" : "Connect the scanned wallet to claim"}
                  >
                    Close All{rows.length ? ` (${rows.length})` : ""}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-white/5 text-gray-300">
                  <tr>
                    <Th>Token</Th>
                    <Th>Account Address</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Reclaimable (SOL)</Th>
                    <Th className="text-right pr-6">Action</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-6 text-center text-gray-400">
                        {loading ? "Scanning…" : "No closable accounts yet. Enter an address and Scan."}
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => {
                      const rowFeeSol =
                        Math.floor((r.lamports * FEE_BPS) / 10_000) / LAMPORTS_PER_SOL;
                      const isRowPaid = !!paidMap[r.accountAddress] || feePaidAll;

                      return (
                        <Tr key={r.accountAddress}>
                          <Td title={r.mint}>
                            <div className="flex items-center gap-3">
                              <TokenLogo meta={r.meta} mint={r.mint} />
                              <div className="flex flex-col">
                                <span className="text-white">
                                  {r.meta?.name ?? short(r.mint, 5)}
                                  {r.meta?.symbol ? (
                                    <span className="text-gray-400"> · {r.meta.symbol}</span>
                                  ) : null}
                                </span>
                                <span className="text-[11px] text-gray-400">{short(r.mint)}</span>
                              </div>
                            </div>
                          </Td>
                          <Td title={r.accountAddress}>{short(r.accountAddress)}</Td>
                          <Td>Empty Token Account</Td>
                          <Td className="text-right">{r.reclaimable.toFixed(6)}</Td>
                          <Td className="text-right pr-6">
                            <div className="flex justify-end gap-2">
                              {/* Step 1: Pay (per row) */}
                              <button
                                onClick={() => handlePayFeeRow(r)}
                                disabled={
                                  !canClaim ||
                                  feePaidAll ||
                                  !!paidMap[r.accountAddress] ||
                                  payingRow === r.accountAddress
                                }
                                className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
                                title="Pay 10% fee for this account"
                              >
                                {feePaidAll
                                  ? "Paid ✓"
                                  : paidMap[r.accountAddress]
                                  ? "Paid ✓"
                                  : payingRow === r.accountAddress
                                  ? "Paying…"
                                  : `Pay ${rowFeeSol.toFixed(5)}`}
                              </button>

                              {/* Step 2: Claim */}
                              <button
                                onClick={() => handleClaimOne(r)}
                                disabled={!canClaim || !isRowPaid}
                                className="rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-3 py-1.5 text-sm text-emerald-200 hover:bg-emerald-400/25 disabled:opacity-60"
                                title="Close and reclaim rent"
                              >
                                Claim
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ---------- components ---------- */

function Hero({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <>
      <div className="text-center">
        <div className="text-3xl text-cyan-300/90 font-medium tracking-wide mt-0">RETRO</div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-semibold text-white">
          Scan & reclaim your locked SOL
        </h1>
        <p className="mx-auto mt-2 max-w-3xl text-[#DDA0DD]">
          We search your wallet for empty token accounts (ATAs) and other closeable accounts,
          <br /> then let you reclaim the rent deposits in one click.
        </p>

        <button
          type="button"
          onClick={() => setOpen(!open)}
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

      <div
        className={`mx-auto mt-1 w-full overflow-hidden transition-[max-height,opacity,margin-bottom] duration-300 ${
          open ? "max-h-[400px] opacity-100 mb-0" : "max-h-0 opacity-0 -mb-2"
        }`}
      >
        <div className="mx-auto max-w-2xl pt-2 pb-1">
          <ol className="space-y-4">
            <Step n={1} title="Scan" desc="Identify empty token accounts holding rent deposits." />
            <Step n={2} title="Preview" desc="See estimated SOL you can reclaim and our 10% fee before approving." />
            <Step n={3} title="Claim" desc="Close accounts in a single flow; SOL refunds to your wallet." />
          </ol>
        </div>
      </div>
    </>
  );
}

function TokenLogo({ meta, mint }: { meta?: TokenMeta; mint: string }) {
  if (meta?.logoURI) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={meta.logoURI}
        alt={meta.symbol ?? mint}
        className="h-7 w-7 rounded-full object-cover border border-white/10"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="h-7 w-7 rounded-full bg-white/10 border border-white/10 grid place-items-center text-[10px] text-gray-300">
      {meta?.symbol?.slice(0, 3) ?? "SPL"}
    </div>
  );
}

/* ---------- tiny UI bits ---------- */

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

/* table helpers (forward native props) */
type ThProps = React.ThHTMLAttributes<HTMLTableHeaderCellElement> & {
  className?: string;
  children: React.ReactNode;
};
function Th({ children, className = "", ...rest }: ThProps) {
  return (
    <th {...rest} className={`px-6 py-2 text-left font-semibold ${className}`}>
      {children}
    </th>
  );
}

type TdProps = React.TdHTMLAttributes<HTMLTableDataCellElement> & {
  className?: string;
  children: React.ReactNode;
};
function Td({ children, className = "", ...rest }: TdProps) {
  return (
    <td {...rest} className={`px-6 py-3 text-gray-200 ${className}`}>
      {children}
    </td>
  );
}

function Tr({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <tr className={`hover:bg-white/5 ${className}`}>{children}</tr>;
}
