// app/page.tsx
"use client";

import VaultGrid from "@/components/ui/VaultGrid";
import type { VaultSummary } from "@/components/ui/VaultCard";

// TEMP demo data (replace with real fetch later)
const demoItems: VaultSummary[] = [
  {
    mint: "Fy3wL8rd6pLxmaBGyFvbHpYWJpPsGWVpV18Amgeppump",
    name: "Lisa Simpson",
    symbol: "MONALISA",
    image: "/images/example.webp", // place a file in /public/images or use a URL
    decimals: 6,
    startTime: Math.floor(Date.now() / 1000) - 3600,
    endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180, // +6 months
    rewardNet: 1_000_000,
    totalStaked: 250_000,
    emissionPerSec: 1_000_000 / 15_724_800,
    apr: 0.42,
  },
  {
    mint: "9QxLr5m1eXampLeMintAddre55forDemoi2j3",
    name: "Creator Token",
    symbol: "CRT",
    image: "",
    decimals: 6,
    startTime: Math.floor(Date.now() / 1000) - 7200,
    endTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 180,
    rewardNet: 500_000,
    totalStaked: 120_000,
    emissionPerSec: 500_000 / 15_724_800,
    apr: 0.27,
  },
];

export default function Home() {
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

        <VaultGrid items={demoItems} className="mt-4" />
      </main>
    </div>
  );
}
