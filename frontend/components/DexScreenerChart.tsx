"use client";

type Props = {
  pairAddress: string;
  height?: number | string;
  showTrades?: boolean;
};

export default function DexScreenerChart({
  pairAddress,
  height = 640,
  showTrades = false,
}: Props) {
  const src = `https://dexscreener.com/solana/${encodeURIComponent(
    pairAddress
  )}?embed=1&theme=dark&info=0&chart=1&trades=${showTrades ? 1 : 0}`;

  return (
    <div className="w-full" style={{ height }}>
      <iframe
        title={`Dexscreener solana:${pairAddress}`}
        src={src}
        className="h-full w-full rounded-2xl border border-white/10"
        allow="clipboard-read; clipboard-write; fullscreen"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
