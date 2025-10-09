// app/(site)/trade/[pairAddress]/page.tsx
import DexScreenerChart from "@/components/DexScreenerChart";
import { CustomTokenButton } from "@/components/ui/CustomTokenButton"; // ⬅️ NEW

export const metadata = { title: "Trade | Driplet.Fun" };

export default function TradePage({ params }: { params: { pairAddress: string } }) {
  const { pairAddress } = params;

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      {/* MAIN */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-20 md:pb-[100px] md:pl-[120px] md:pr-[120px]">
        <div className="mt-2 mx-auto max-w-8xl">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
            <DexScreenerChart pairAddress={pairAddress} showTrades={false} />
          </div>
        </div>

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

      {/* DESKTOP-ONLY SIDEBARS — FLUSH TO EDGES, WIDE ENOUGH FOR 96px BUTTONS */}
      <aside className="hidden md:flex fixed left-0 top-[56px] bottom-[100px] z-40 w-[120px] rounded-r-xl border border-l-0 border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto my-4 flex flex-col items-center gap-3 overflow-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <CustomTokenButton key={`lsb-${i}`} title={`Add custom token ${i + 1}`} />
          ))}
        </div>
      </aside>

      <aside className="hidden md:flex fixed right-0 top-[56px] bottom-[100px] z-40 w-[120px] rounded-l-xl border border-r-0 border-white/10 bg-black/80 backdrop-blur-sm">
        <div className="mx-auto my-4 flex flex-col items-center gap-3 overflow-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <CustomTokenButton key={`rsb-${i}`} title={`Add custom token ${i + 1}`} />
          ))}
        </div>
      </aside>

      {/* DESKTOP-ONLY FOOTER — FLUSH TO EDGES */}
      <footer className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-[100px] items-center justify-between border-t border-white/10 bg-black/85 px-4 backdrop-blur-sm">
        
      </footer>
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
