// app/manage/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ManageVaultCard, { ManageVault } from "../../../components/ui/ManageVaultCard";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";

// --- CONFIG ---
// Replace this with your actual list of vault mints to manage (or fetch from your API)
const MINTS: string[] = [
  "J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump",
  "8Y5MwnUM19uqhnsrFnKijrmn33CmHBTUoedXtTGDpump",
  "ERpXkEafaKuKEARBCFsVnLZA1GARWUjBBbQCukXpbonk",
];

const TERM_SECS = 182 * 24 * 60 * 60;

// Demo numbers; replace with your real TVL/reward data for each managed vault
const DEMO_REWARDS = [1_000_000, 500_000, 750_000, 300_000];
const DEMO_STAKED = [250_000, 120_000, 80_000, 50_000];

// --- UTILS ---
function normalizeIpfs(u?: string) {
  if (!u) return "";
  const s = u.trim();
  if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.replace("ipfs://", "")}`;
  return s;
}

async function fetchMintDisplay(umi: any, mint: string) {
  let name = "Unnamed";
  let symbol = "";
  let image: string | undefined;

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
        if (j?.image) image = j.image as string;
      }
    }
  } catch {
    // swallow; leave defaults
  }

  return { name, symbol, image };
}

// --- PAGE ---
export default function ManagePage() {
  const { connection } = useConnection();
  const [items, setItems] = useState<ManageVault[]>([]);
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
            const display = await fetchMintDisplay(umi, mint);
            const rewardNet = DEMO_REWARDS[i % DEMO_REWARDS.length];
            const totalStaked = DEMO_STAKED[i % DEMO_STAKED.length];

            const v: ManageVault = {
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

            return v;
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
        </header>

        <section className="mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {items.length === 0 && (
              <div className="text-sm text-gray-300">{loading ? "Loading vaults…" : "No vaults found"}</div>
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