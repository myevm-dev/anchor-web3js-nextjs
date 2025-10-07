export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-gray-200">
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-semibold text-white">How PumpVaults.Fun Works</h1>
        <p className="mt-3 text-sm text-gray-400">
          Not affiliated with pump.fun. This is a simple, immutable staking vault for creator tokens on Solana.
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-white">For Creators</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-gray-200">
              <li>Connect your wallet and enter your token <span className="text-gray-400">(SPL mint address from your pump.fun token page)</span>.</li>
              <li>Enter the total amount of tokens you want to distribute as rewards.</li>
              <li>Pay a creation fee of <strong>0.1 SOL</strong> + <strong>3%</strong> of the reward amount (plus network rent/fees).</li>
              <li>The vault goes live for a fixed <strong>6 months</strong> (182 days). Rewards stream per second from a prefunded pot.</li>
              <li>No edits, no pause, no top-ups. Want more rewards later? Create a new vault.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">For Stakers</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-gray-200">
              <li>Stake the same token as the vault’s mint. Unstake anytime.</li>
              <li>Rewards accrue every second and can be claimed anytime.</li>
              <li>APR updates dynamically based on <em>rewards per second ÷ total staked</em>.</li>
              <li>After 6 months, emissions stop; claim any remaining rewards.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">Fees</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-gray-200">
              <li>Creation: <strong>0.1 SOL</strong> to the dev treasury.</li>
              <li>Token fee: <strong>3%</strong> of the creator’s reward deposit (taken at creation).</li>
              <li>No ongoing protocol fees for staking/claiming. Standard Solana tx/rent costs apply.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">Key Rules (Immutable)</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-gray-200">
              <li>Fixed term: <strong>6 months</strong> from vault start.</li>
              <li>Rewards are fully prefunded and locked to the vault’s reward pool.</li>
              <li>No admin controls after creation (no pause, no parameter changes).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white">Tips</h2>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-gray-200">
              <li>Find your token mint on pump.fun → “Copy mint”.</li>
              <li>Higher total staked lowers APR (same rewards spread across more tokens).</li>
              <li>Claiming and re-staking compounds your share if others don’t.</li>
            </ul>
          </div>

          <div className="mt-10">
            <p className="text-xs text-gray-500">
              This site provides a standardized vault flow for creator tokens. Always verify the mint address you interact with.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
