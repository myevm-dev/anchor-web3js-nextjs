"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PairLookup() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const go = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/dexscreener/resolve?q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error("not found");
      const { pairAddress } = await r.json();
      router.push(`/trade/${pairAddress}`);
    } catch {
      alert("Pair not found on Solana");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={go} className="flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Token mint or symbol (Solana)"
        className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-gray-500"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
      >
        {busy ? "…" : "Open"}
      </button>
    </form>
  );
}
