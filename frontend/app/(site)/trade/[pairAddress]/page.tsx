import DexScreenerChart from "@/components/DexScreenerChart";
import PairLookup from "@/components/PairLookup";

export const metadata = { title: "Trade | Driplet.Fun" };

export default function TradePage({ params }: { params: { pairAddress: string } }) {
  const { pairAddress } = params;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid (same as other pages) */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-20">
        {/* Title — match Vaults cyan with glow */}
        <h1 className="text-3xl sm:text-4xl font-semibold text-[#01fcfc] drop-shadow-[0_0_12px_rgba(1,252,252,0.45)]">
          Trade
        </h1>

        {/* Lookup above the chart */}
        <div className="mt-3 max-w-3xl">
          <PairLookup />
        </div>

        {/* Chart — same rounded/bordered aesthetic you use elsewhere */}
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-2">
          <DexScreenerChart pairAddress={pairAddress} showTrades={false} />
        </div>

        {/* Stats / placeholder */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Pair" value={`solana / ${pairAddress.slice(0, 6)}…${pairAddress.slice(-4)}`} />
            <Stat label="Price" value="—" />
            <Stat label="24h Vol" value="—" />
          </div>
          <div className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center">
            <div className="text-sm text-gray-400">Trading module placeholder</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="mt-1 break-all text-xl font-medium text-white">{value}</div>
    </div>
  );
}
