
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">


      {/* background grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10" />

      {/* page content */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-24 pb-16">
        <div className="text-center text-white">
          <h1 className="text-3xl md:text-4xl font-semibold">
            Mainnet-ready Solana dApp
          </h1>
          <p className="mt-3 text-gray-300">
            Connect your wallet from the top-right to get started.
          </p>
        </div>
      </main>
    </div>
  );
}
