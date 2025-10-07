export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-0 pb-16">
        {/* Hero */}
        <section className="mt-8 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="text-sm text-cyan-300/90 font-medium tracking-wide">HOW IT WORKS</div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">
              <span>6 month staking vaults for creator tokens</span>
            </h1>
            <p className="mt-3 text-gray-300">
              Create a vault, prefund rewards, and let emissions stream per second. No edits. No pause. No top-ups.
            </p>

            {/* 3 quick facts */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">

              <Fact label="Term length" value="182 days from creation" />
              <Fact label="Emissions" value="per-second stream" />
              <Fact label="Creation fee" value="0.1 SOL + 3% of rewards token" />
            </div>


          </div>

          {/* Timeline / Steps */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <h3 className="text-white font-semibold">Creator flow</h3>
            <ol className="mt-4 space-y-4">
<Step n={1} title="Click Create & Paste Token Mint Address" desc="This is the SPL mint address for your token." />
              <Step n={2} title="Enter Amount of Rewards" desc="Enter the total tokens to distribute over the term." />
              <Step n={3} title="Go Live by Clicking Create Vault" desc="0.1 SOL + 3% token fee. Vault starts streaming instantly." />
            </ol>
          </div>
        </section>

        {/* Two columns: Creators & Stakers */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <Card title="For Creators">
            <UL>
              <LI>Fixed, immutable term of <b>6 months</b>.</LI>
              <LI>Rewards are <b>prefunded</b> and streamed per second.</LI>
              <LI>No admin after launch: no pause, no edits, no top-ups.</LI>
              <LI>Create a new vault if you want more rewards later.</LI>
            </UL>
          </Card>

          <Card title="For Stakers">
            <UL>
              <LI>Stake the same token as the vault’s mint; unstake anytime.</LI>
              <LI>Rewards accrue continuously and can be claimed anytime.</LI>
              <LI>APR varies with <i>rewards per second ÷ total staked</i>.</LI>
              <LI>After 6 months, emissions stop; claim remaining rewards.</LI>
            </UL>
          </Card>
        </section>

        {/* Fees + Rules */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          <Card title="Fees">
            <UL>
                            <LI>Creation: <b>0.1 SOL</b> (one-time).</LI>
              <LI>Token fee: <b>3%</b> of the reward deposit (taken at creation).</LI>
              <LI>No ongoing protocol fees or rent to worry about.</LI>

            </UL>
          </Card>

          <Card title="Immutable Rules">
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>Fixed 182 days</Badge>
              <Badge>Prefunded rewards</Badge>
              <Badge>No admin knobs</Badge>
              <Badge>No top-ups</Badge>
            </div>
            <p className="mt-4 text-sm text-gray-300">
              The vault contract is designed to be predictable and trust-minimized: once launched, parameters
              can’t be changed.
            </p>
          </Card>
        </section>

        {/* Tips */}
        <section className="mt-6">
          <Card title="Tips">
            <UL>
              <LI>On pump.fun, click <b>Copy mint</b> to get the SPL mint.</LI>
              <LI>Claiming and re-staking may increase your share if others don’t.</LI>
            </UL>
            <p className="mt-6 text-xs text-gray-500">
              Always verify the mint address you interact with.
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}

/* ---------- small UI bits (no external deps) ---------- */

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-7">
      <h3 className="text-white font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 grid h-7 w-7 place-items-center rounded-full bg-[#1DBAFC]/15 text-[#1DBAFC] border border-[#1DBAFC]/30 text-sm font-semibold">
        {n}
      </div>
      <div>
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-xs text-gray-300 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-gray-200">
      {children}
    </span>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-1 space-y-2 text-gray-200 text-sm">{children}</ul>;
}

function LI({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#1DBAFC]" />
      <span className="[&>b]:text-white">{children}</span>
    </li>
  );
}
