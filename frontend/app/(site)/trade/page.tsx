// app/trade/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Trade | Driplet.Fun",
};

export default function TradePage() {
  return (
    <main className="min-h-[100vh] bg-[#000] pt-20 pb-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-end justify-between">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Trade</h1>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← Back to Vaults</Link>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-gray-300">
            Placeholder trading screen. Drop your swap widget / chart here.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Pair</div>
              <div className="mt-1 text-xl font-medium text-white">— / —</div>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">Price</div>
              <div className="mt-1 text-xl font-medium text-white">—</div>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <div className="text-xs uppercase tracking-wide text-gray-400">24h Vol</div>
              <div className="mt-1 text-xl font-medium text-white">—</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-white/15 p-8 text-center">
            <div className="text-sm text-gray-400">Trading module placeholder</div>
          </div>
        </div>
      </div>
    </main>
  );
}
