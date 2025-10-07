"use client";

import Link from "next/link";
import ManageVaultCard, { ManageVault } from "../../../components/ui/ManageVaultCard";

export default function ManagePage() {
  const placeholder: ManageVault = {
    mint: "J2eaKn35rp82T6RFEsNK9CLRHEKV9BLXjedFM3q6pump",
    name: "Feed The People",
    symbol: "FTP",
    status: "active",
    startTime: Math.floor(Date.now() / 1000) - 3600,
    endTime: Math.floor(Date.now() / 1000) + 182 * 24 * 60 * 60,
    rewardNet: 1_000_000,
    totalStaked: 250_000,
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-16">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white">Manage Vaults</h1>
              <p className="mt-1 text-gray-300">View, filter, and manage your created vaults.</p>
            </div>

            <Link
              href="/create"
              className="h-9 px-3 rounded-md border border-white/15 bg-white/5 text-sm text-white hover:bg-white/10 grid place-items-center"
            >
              Create New
            </Link>
          </div>
        </header>

        {/* Filters (placeholder) */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <form className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Mint Address</label>
              <input
                placeholder="Search by mint…"
                className="h-10 rounded-md bg-black/30 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Admin (Creator)</label>
              <input
                placeholder="Search by admin…"
                className="h-10 rounded-md bg-black/30 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10"
              >
                Search
              </button>
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* Results */}
        <section className="mt-6">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <ManageVaultCard
              v={placeholder}
              onOpen={(mint: string) => console.log("open", mint)}
              onPause={(mint: string) => console.log("pause", mint)}
              onEnd={(mint: string) => console.log("end", mint)}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
