"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q") ?? "";

  const [q, setQ] = useState(qParam);
  useEffect(() => setQ(qParam), [qParam]);

  const doSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = q.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}` : "/");
  };

  const goCreate = () => router.push("/create");

  return (
    <div className="fixed top-14 inset-x-0 z-40 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <form onSubmit={doSearch} className="h-12 flex items-center gap-3">
          {/* Create */}
          <button
            type="button"
            onClick={goCreate}
            aria-label="Create"
            title="Create"
            className="w-28 md:w-32 h-9 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 active:scale-[0.98] transition grid place-items-center"
          >
            {/* Mobile: icon, Desktop: text */}
            <span className="md:hidden inline-flex items-center justify-center">
              {/* plus icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span className="hidden md:inline">Create</span>
          </button>

          {/* Search input */}
          <input
            type="search"
            name="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vaults by mint, creator, or keyword…"
            className="flex-1 h-9 rounded-md bg-white/5 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
          />

          {/* Search */}
          <button
            type="submit"
            aria-label="Search"
            title="Search"
            className="w-28 md:w-32 h-9 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10 active:scale-[0.98] transition grid place-items-center"
          >
            {/* Mobile: icon, Desktop: text */}
            <span className="md:hidden inline-flex items-center justify-center">
              {/* magnifier icon */}
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
              </svg>
            </span>
            <span className="hidden md:inline">Search</span>
          </button>
        </form>
      </div>
    </div>
  );
}
