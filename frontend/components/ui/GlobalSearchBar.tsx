"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { CreateVaultModal } from "./CreateVaultModal";

export function GlobalSearchBar() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  function extractPair(input: string): string {
    let s = input.trim();
    if (!s) return "";

    // If they pasted a URL (e.g. dexscreener)
    try {
      const u = new URL(s);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length) s = parts[parts.length - 1];
    } catch {
      // not a URL, keep as-is
    }
    // strip query/fragment just in case
    return s.split("?")[0].split("#")[0];
  }

  const doSearch = () => {
    const pair = extractPair(q);
    if (!pair) {
      router.push("/"); // keep current behavior when empty
      return;
    }
    router.push(`/trade/${encodeURIComponent(pair)}`);
  };

  // Allow Enter to trigger the same navigation without form submit
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch();
    }
  };

  const wrapperClass = useMemo(
    () => "fixed top-14 inset-x-0 z-40 border-b border-white/10 bg-black shadow-lg",
    []
  );

  return (
    <>
      <div className={wrapperClass}>
        <div className="mx-auto max-w-7xl px-4">
          {/* Use a plain div instead of <form> to avoid default navigation */}
          <div className="h-12 flex items-center gap-3">
            {/* Create (opens modal) */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Create"
              title="Create"
              className="w-28 md:w-32 h-9 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 active:scale-[0.98] transition grid place-items-center"
            >
              <span className="md:hidden inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <span className="hidden md:inline">Create</span>
            </button>

            {/* Search input (no name attr; Enter handled manually) */}
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Paste DexScreener link or pair/mint…"
              className="flex-1 h-9 rounded-md bg-white/5 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
              suppressHydrationWarning
              readOnly={!mounted}
            />

            {/* Search button triggers router.push directly */}
            <button
              type="button"
              onClick={doSearch}
              aria-label="Search"
              title="Search"
              className="w-28 md:w-32 h-9 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 active:scale-[0.98] transition grid place-items-center"
            >
              <span className="md:hidden inline-flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
                </svg>
              </span>
              <span className="hidden md:inline">Search</span>
            </button>
          </div>
        </div>
      </div>

      <CreateVaultModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={(data) => {
          console.log("create form:", data);
        }}
      />
    </>
  );
}
