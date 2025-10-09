// components/ui/DemoBanner.tsx
export function DemoBanner() {
  return (
    <div className="border-y border-yellow-500/30 bg-yellow-500/10">
      <div className="mx-auto max-w-7xl px-2">
        <div className="py-1.5 flex items-center justify-center gap-2 text-[13px] md:text-sm text-yellow-300 text-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M12 8v5m0 3h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
          <span className="font-semibold">Vault Demo Only</span>
          <span className="opacity-90"> Vaults not live yet</span>
        </div>
      </div>
    </div>
  );
}
