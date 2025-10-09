// components/ui/VaultGrid.tsx
"use client";

import VaultCard, { type VaultSummary } from "./VaultCard";
export type { VaultSummary } from "./VaultCard"; // optional re-export

export default function VaultGrid({
  items,
  onSelect,
  className = "",
  emptyText = "No vaults found",
}: {
  items: VaultSummary[];
  onSelect?: (v: VaultSummary) => void;
  className?: string;
  emptyText?: string;
}) {
  if (!items?.length) {
    return (
      <div
        className={`rounded-lg border border-white/10 bg-white/5 p-6 text-center text-sm text-gray-400 ${className}`}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-4 ${className}
      grid-cols-1
      sm:grid-cols-2
      md:grid-cols-3
      lg:grid-cols-4`}
    >
    {items.map((v, i) => (
      <VaultCard key={`${v.mint}-${i}`} v={v} onClick={() => onSelect?.(v)} />
    ))}
    </div>
  );
}
