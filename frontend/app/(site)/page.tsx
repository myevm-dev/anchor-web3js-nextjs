"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import VaultGrid from "@/components/ui/VaultGrid";
import type { VaultSummary } from "@/components/ui/VaultCard";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";
import { DemoBanner } from "@/components/ui/DemoBanner";

const TERM_SECS = 15_724_800; // 6 months


const MINTS = [
  "J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump",
  "8Y5MwnUM19uqhnsrFnKijrmn33CmHBTUoedXtTGDpump",
    "FQrNCk7HkXFEThzbtpdxqX5KaifLXAnPzseWXvksbonk",
  "34AeqX5MQGyrey2VnZdkeZCfM4qinp4F3X7pGxtipump",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",


];

// demo numbers for rewards/TVL
const DEMO_REWARDS = [1_000_000, 500_000, 750_000, 300_000];
const DEMO_STAKED = [250_000, 120_000, 80_000, 50_000];

// ---------- helpers to avoid `any` ----------
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

// -------------------------------------------

export default function Home() {
  const { connection } = useConnection();
  const [items, setItems] = useState<VaultSummary[]>([]);
  const [loading, setLoading] = useState(false);

  // Umi with same RPC (typed)
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
          MINTS.map(async (mint, i): Promise<VaultSummary> => {
            // defaults
            let name = "Unnamed";
            let symbol = "";
            let image: string | undefined = undefined;
            const decimals: number | undefined = undefined; // demo list doesn't need decimals

            // try to fetch name/symbol/image from Token Metadata
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
              // ignore demo metadata failures
            }

            const rewardNet = DEMO_REWARDS[i % DEMO_REWARDS.length];
            const totalStaked = DEMO_STAKED[i % DEMO_STAKED.length];
            const emissionPerSec = rewardNet / TERM_SECS;

            const apr =
              totalStaked > 0 ? (rewardNet / totalStaked) * (365 / 182) : null;

            return {
              mint,
              name,
              symbol,
              image,
              decimals,
              startTime: now - 3600,
              endTime: now + TERM_SECS,
              rewardNet,
              totalStaked,
              emissionPerSec,
              apr,
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
        <header className="mt-4 md:mt-6 mb-4">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#1DBAFC]">
            Discover Vaults
          </h1>
          <p className="mt-1 text-gray-300">
            Stake tokens and earn rewards by the second.
          </p>
          <DemoBanner />
        </header>

        <VaultGrid
          items={items}
          className="mt-4"
          emptyText={loading ? "Loading vaults…" : "No vaults found"}
        />
      </main>
    </div>
  );
}
