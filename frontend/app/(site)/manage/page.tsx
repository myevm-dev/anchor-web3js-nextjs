"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ManageVaultCard, { ManageVault } from "@/components/ui/ManageVaultCard";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk, type Umi } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";
import { DemoBanner } from "@/components/ui/DemoBanner";

// --- CONFIG ---
const MINTS: string[] = [
 "4VwJLikGQ5N59BRzxyaZZjLiB38r6HF4mJ1mU8fjbonk",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
  "2T6vwSajccRRb4roAdqZqgZhtWdPqVQm8kjDUrSqMray",
];

const TERM_SECS = 182 * 24 * 60 * 60;
const DEMO_REWARDS = [1_000_000, 500_000, 750_000, 300_000];
const DEMO_STAKED = [250_000, 120_000, 80_000, 50_000];

// ---- helpers to avoid `any` ----
type MaybeEndpoint = { rpcEndpoint?: string; _rpcEndpoint?: string };
type UmiMeta =
  | { data?: { name?: unknown; symbol?: unknown; uri?: unknown } }
  | { name?: unknown; symbol?: unknown; uri?: unknown };
type TokenMetaJson = { image?: string | null };

const toStringSafe = (v: unknown): string =>
  typeof v === "string"
    ? v
    : v instanceof Uint8Array
    ? new TextDecoder().decode(v)
    : "";

function normalizeIpfs(u?: string) {
  if (!u) return "";
  const s = u.trim();
  return s.startsWith("ipfs://")
    ? `https://ipfs.io/ipfs/${s.replace("ipfs://", "")}`
    : s;
}

async function fetchMintDisplay(umi: Umi, mint: string): Promise<{
  name: string;
  symbol: string;
  image?: string;
}> {
  let name = "Unnamed";
  let symbol = "";
  let image: string | undefined;

  try {
    const meta = (await fetchMetadataFromSeeds(umi, {
      mint: umiPk(new PublicKey(mint).toBase58()),
    })) as unknown as UmiMeta | null;

    if (meta) {
      const container =
        "data" in meta && meta.data ? meta.data : (meta as Record<string, unknown>);

      const rawName = toStringSafe(
        (container as Record<string, unknown>)["name"]
      ).replace(/\0/g, "");
      const rawSymbol = toStringSafe(
        (container as Record<string, unknown>)["symbol"]
      ).replace(/\0/g, "");
      const uri = toStringSafe(
        (container as Record<string, unknown>)["uri"]
      ).replace(/\0/g, "");

      if (rawName.trim()) name = rawName.trim();
      symbol = rawSymbol.trim();

      if (uri) {
        const j = (await fetch(uri)
          .then((r) => r.json() as Promise<TokenMetaJson>)
          .catch(() => null)) as TokenMetaJson | null;
        if (j?.image) image = j.image;
      }
    }
  } catch {
    // ignore metadata failures; keep defaults
  }

  return { name, symbol, image };
}

// --- PAGE ---
export default function ManagePage() {
  const { connection } = useConnection();
  const [items, setItems] = useState<ManageVault[]>([]);
  const [loading, setLoading] = useState(false);

  const umi = useMemo(() => {
    const ep = connection as unknown as MaybeEndpoint;
    const endpoint = ep.rpcEndpoint ?? ep._rpcEndpoint ?? "https://api.mainnet-beta.solana.com";
    return createUmi(endpoint);
  }, [connection]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);

        const results = await Promise.all(
          MINTS.map(async (mint, i): Promise<ManageVault> => {
            const display = await fetchMintDisplay(umi, mint);
            const rewardNet = DEMO_REWARDS[i % DEMO_REWARDS.length];
            const totalStaked = DEMO_STAKED[i % DEMO_STAKED.length];

            return {
              mint,
              name: display.name,
              symbol: display.symbol || undefined,
              image: normalizeIpfs(display.image),
              status: "active",
              startTime: now - 3600,
              endTime: now + TERM_SECS,
              rewardNet,
              totalStaked,
            };
          })
        );

        if (!cancelled) setItems(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [umi]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-16">
        <header className="mb-2 mt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl md:text-4xl font-semibold text-[#1DBAFC]">Manage Vaults</h1>
            <Link
              href="/create"
              className="h-12 px-6 rounded-md border border-white/15 bg-white/5 text-sm text-white hover:bg-white/10 grid place-items-center whitespace-nowrap"
            >
              Create New
            </Link>
          </div>
               <DemoBanner />
        </header>

        <section className="mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 && (
              <div className="text-sm text-gray-300">
                {loading ? "Loading vaults…" : "No vaults found"}
              </div>
            )}

            {items.map((v) => (
              <ManageVaultCard
                key={v.mint}
                v={v}
                onClone={(mint: string) => console.log("clone", mint)}
                onBoost={(mint: string) => console.log("boost", mint)}
                onHide={(mint: string) => console.log("hide", mint)}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
