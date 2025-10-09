// components/ui/TradeDemoBanner.tsx
export function DemoBanner() {
  return (
    <div className="w-full px-4">
      <div className="w-full rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-center text-sm text-yellow-300 shadow-[inset_0_0_0_1px_rgba(234,179,8,0.15)]">
        <span className="inline-flex w-full items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-300" />
          <span className="font-semibold">Demo Only</span>
          <span className="opacity-80">· Not live yet</span>
        </span>
      </div>
    </div>
  );
}
