import Image from "next/image";
export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black">
      {/* subtle background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10 [mask-image:linear-gradient(180deg,white,transparent)]" />

      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-0 pb-16">
        {/* Hero */}
        <section className="mt-8 grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
          <Card className="p-6 sm:p-8">
            <div className="text-sm text-cyan-300/90 font-medium tracking-wide">HOW IT WORKS</div>
            <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white">
              6 month staking vaults for creator tokens
            </h1>
            <p className="mt-3 text-[#DDA0DD]">
              Create a vault, prefund rewards, and let emissions stream per second. No edits. No pause. No top-ups.
            </p>

            {/* 3 quick facts */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Fact label="Term length" value="182 days from creation" />
              <Fact label="Emissions" value="per-second stream" />
              <Fact label="Creation fee" value="0.1 SOL + 3% of rewards token" />
            </div>
          </Card>

          {/* Timeline / Steps */}
<Card className="p-6 sm:p-7">
  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
    {/* Image (ZymoThrow) */}
    <div className="order-1 md:order-none flex justify-center md:justify-end md:basis-[44%] md:pl-2 lg:pl-4">
      <Image
        src="/images/zymothrow.png"
        alt="ZymoThrow mascot"
        width={420}
        height={420}
        className="w-full max-w-[380px] md:max-w-[420px] h-auto object-contain"
        priority
      />
    </div>

    {/* Text + Steps */}
    <div className="flex-1 md:basis-[50%] md:pl-10 lg:pl-14">
      <h3 className="text-cyan-300/90 font-semibold">Creator flow</h3>
      <ol className="mt-4 space-y-4">
        <Step n={1} title="Click Create & Paste Mint Address" desc="This is the SPL mint address for your token." />
        <Step n={2} title="Enter Amount of Rewards" desc="Enter the total tokens to distribute over the term." />
        <Step n={3} title="Go Live by Clicking Create Vault" desc="0.1 SOL + 3% token fee. Vault starts streaming instantly." />
      </ol>
    </div>
  </div>
</Card>


        </section>

        {/* Two columns: Creators & Stakers */}
        <section className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <h3 className="text-cyan-300/90 font-semibold">For Creators</h3>
            <div className="mt-3">
              <UL>
                <LI>Fixed, immutable term of <b>6 months</b>.</LI>
                <LI>Rewards are <b>prefunded</b> and streamed per second.</LI>
                <LI>No admin after launch: no pause, no edits, no top-ups.</LI>
                <LI>Create a new vault if you want more rewards later.</LI>
              </UL>
            </div>
          </Card>

          <Card>
            <h3 className="text-cyan-300/90 font-semibold">For Stakers</h3>
            <div className="mt-3">
              <UL>
                <LI>Stake the same token as the vault’s mint; unstake anytime.</LI>
                <LI>Rewards accrue continuously and can be claimed anytime.</LI>
                <LI>APR varies with <i>rewards per second ÷ total staked</i>.</LI>
                <LI>After 6 months, emissions stop; claim remaining rewards.</LI>
              </UL>
            </div>
          </Card>
        </section>
        <section className="mt-6">
          <Card>
            <div className="flex flex-col md:flex-row items-center gap-5 md:gap-4">
          {/* Text (left) */}
          <div className="flex-1 md:basis-[60%] md:pr-3">
            <h3 className="text-cyan-300/90 font-semibold">Tips</h3>
            <div className="mt-3">
              <UL>
                <LI>Claiming and re-staking may increase your share if others don’t.</LI>
                <LI>Keep a little <b>SOL</b> in your wallet for tx fees when creating/claiming/unstaking.</LI>
                <LI>APR will change as TVL moves; <b>more stakers → lower APR</b>, fewer stakers → higher APR.</LI>
                <LI>Claiming rewards doesn’t unstake; you can <b>claim and stay staked</b> to keep earning.</LI>
              </UL>
              <p className="mt-6 text-xs text-gray-500">
                Always verify the mint address you interact with.
              </p>
            </div>
          </div>

          {/* Image (right; tucked closer) */}
          <div className="order-1 md:order-none flex justify-center md:justify-start md:basis-[35%] md:-ml-2">
            <Image
              src="/images/zymoflask.png"
              alt="ZymoFlask"
              width={220}
              height={220}
              className="w-full max-w-[200px] md:max-w-[220px] h-auto object-contain"
            />
          </div>
        </div>
          </Card>
        </section>



        {/* Fees + Rules (side-by-side, same style) */}
      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="text-cyan-300/90 font-semibold">Fees</h3>
          <div className="mt-3">
            <UL>
              <LI>Creation: <b>0.1 SOL</b> (one-time).</LI>
              <LI>Token fee: <b>3%</b> of the reward deposit (taken at creation).</LI>
              <LI>No ongoing protocol fees or rent to worry about.</LI>
            </UL>
          </div>
        </Card>

        <Card>
          <h3 className="text-cyan-300/90 font-semibold">Immutable Rules</h3>
          <div className="mt-3">
            <UL>
              <LI>Fixed term of <b>182 days</b> from creation.</LI>
              <LI>Rewards are <b>prefunded</b> and streamed per second.</LI>
              <LI><b>No admin knobs</b>: no pause, no edits, no top-ups.</LI>
            </UL>
          </div>
        </Card>
      </section>

              
      </main>
    </div>
  );
}

/* ---------- small UI bits (no external deps) ---------- */

function Card({
  children,
  className = "",
}: {
  title?: string; // not used directly now; we pass titles inside children so we can color them per section
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white/5 p-6 sm:p-7
      border-[#7B4DFF]/40 shadow-[0_0_0_1px_rgba(123,77,255,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#7B4DFF]/40 bg-black/40 px-4 py-3">
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
        {/* purple title */}
        <div className="text-[#DDA0DD] text-sm font-semibold">{title}</div>
        <div className="text-xs text-gray-300 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}


function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[#7B4DFF]/40 bg-white/5 px-2 py-1 text-[11px] text-gray-200">
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
      {/* Purple bullet */}
      <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-[#7B4DFF]" />
      <span className="[&>b]:text-white">{children}</span>
    </li>
  );
}
