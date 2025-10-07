// app/manage/page.tsx
import Link from "next/link";

export default function ManagePage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <main className="relative z-10 mx-auto max-w-7xl px-4 pt-0 pb-16">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-white">Manage Vaults</h1>
              <p className="mt-1 text-gray-300">
                View, filter, and manage your created vaults.
              </p>
            </div>

            <Link
              href="/create"
              className="h-9 px-3 rounded-md border border-white/15 bg-white/5 text-sm text-white hover:bg-white/10 grid place-items-center"
            >
              Create New
            </Link>
          </div>
        </header>

        {/* Filters (placeholder only) */}
        <section className="rounded-lg border border-white/10 bg-white/5 p-4">
          <form className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Mint Address</label>
              <input
                placeholder="Search by mint…"
                className="h-10 rounded-md bg-black/30 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Admin (Creator)</label>
              <input
                placeholder="Search by admin…"
                className="h-10 rounded-md bg-black/30 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10"
              >
                Search
              </button>
              <button
                type="button"
                className="h-10 px-3 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10"
              >
                Reset
              </button>
            </div>
          </form>
        </section>

        {/* Results placeholder */}
        <section className="mt-6">
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 p-8 text-center text-sm text-gray-400">
            No vaults yet. Use the filters above or{" "}
            <Link href="/create" className="underline underline-offset-4 hover:opacity-90">
              create a new vault
            </Link>
            .
          </div>
        </section>
      </main>
    </div>
  );
}
