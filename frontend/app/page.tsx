// app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import VaultGrid from "@/components/ui/VaultGrid";
import type { VaultSummary } from "@/components/ui/VaultCard";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";

const TERM_SECS = 15_724_800; // 6 months

const MINTS = [
  "J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump",
  "8Y5MwnUM19uqhnsrFnKijrmn33CmHBTUoedXtTGDpump",
  "34AeqX5MQGyrey2VnZdkeZCfM4qinp4F3X7pGxtipump",
  "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
];

// simple demo numbers for rewards/TVL
const DEMO_REWARDS = [1_000_000, 500_000, 750_000, 300_000];
const DEMO_STAKED  = [250_000, 120_000, 80_000, 50_000];

export default function Home() {
  const { connection } = useConnection();
  const [items, setItems] = useState<VaultSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const umi = useMemo(() => {
    const endpoint =
      (connection as any)?.rpcEndpoint ||
      (connection as any)?._rpcEndpoint ||
      "https://api.mainnet-beta.solana.com";
    return createUmi(endpoint);
  }, [connection]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);

        const results = await Promise.all(
          MINTS.map(async (mint, i) => {
            // pull metadata (name/symbol/image/decimals)
            let name = "Unnamed";
            let symbol = "";
            let image: string | undefined = undefined;
            let decimals: number | undefined = undefined;

            try {
              const meta = await fetchMetadataFromSeeds(umi, {
                mint: umiPk(new PublicKey(mint).toBase58()),
              }).catch(() => null as any);

              if (meta) {
                const data: any = (meta as any).data ?? meta;
                name = (data?.name ?? "").toString().replace(/\0/g, "").trim() || name;
                symbol = (data?.symbol ?? "").toString().replace(/\0/g, "").trim();
                const uri = (data?.uri ?? "").toString().replace(/\0/g, "").trim();
                if (uri) {
                  const j = await fetch(uri).then((r) => r.json()).catch(() => null as any);
                  if (j?.image) image = j.image;
                }
              }
            } catch (_) {}

            // we don’t need on-chain decimals here for demo APR/emission math,
            // but try to fetch if available via Umi metadata; leave undefined otherwise.
            // (Your modal already fetches exact decimals when creating a vault.)

            const rewardNet = DEMO_REWARDS[i % DEMO_REWARDS.length];
            const totalStaked = DEMO_STAKED[i % DEMO_STAKED.length];
            const emissionPerSec = rewardNet / TERM_SECS;

            // very rough demo APR: (rewards/TVL) over 6 months, annualized
            const apr =
              totalStaked > 0 ? (rewardNet / totalStaked) * (365 / 182) : null;

            const v: VaultSummary = {
              mint,
              name,
              symbol,
              image,
              decimals,
              startTime: now - 3600,                     // already live
              endTime: now + TERM_SECS,                  // ends in 6 months
              rewardNet,
              totalStaked,
              emissionPerSec,
              apr,
            };
            return v;
          })
        );

        if (!cancelled) setItems(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [umi]);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      {/* content — no extra top padding here; layout already adds pt-[104px] */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-16">
        <header className="mb-4">
          <h1 className="text-3xl md:text-4xl font-semibold text-white">Discover Vaults</h1>
          <p className="mt-1 text-gray-300">
            Stake creator tokens and earn streaming rewards.
          </p>
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
