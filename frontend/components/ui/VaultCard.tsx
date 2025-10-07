"use client";

import Image from "next/image";
import Link from "next/link";
import { detectLaunchpad } from "@/lib/launchpad";

export type VaultSummary = {
  mint: string;
  name: string;
  symbol?: string;
  image?: string;
  decimals?: number;

  admin?: string;
  startTime?: number;
  endTime?: number;
  rewardNet?: number;
  totalStaked?: number;
  emissionPerSec?: number;
  apr?: number | null;
};

type Actions = {
  onDeposit?: (mint: string) => void;
  onClaim?: (mint: string) => void;
  onWithdraw?: (mint: string) => void;
};

function format(n?: number, maxFrac = 6) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}
function pct(n?: number) {
  if (n == null || !isFinite(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}
function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
function normalizeImageUrl(url?: string) {
  if (!url) return "";
  let u = url.trim();
  if (u.startsWith("ipfs://")) {
    const cid = u.replace("ipfs://", "");
    u = `https://ipfs.io/ipfs/${cid}`;
  }
  return u;
}

export default function VaultCard({
  v,
  onClick,
  onDeposit,
  onClaim,
  onWithdraw,
}: {
  v: VaultSummary;
  onClick?: () => void;
} & Actions) {
  const now = Math.floor(Date.now() / 1000);
  const status =
    v.endTime && now >= v.endTime ? "ended" : v.startTime && now < v.startTime ? "upcoming" : "active";

  const launchpad = detectLaunchpad(v.mint);
  const perDay = (v.emissionPerSec ?? 0) * 86400;

  const nameNode =
    launchpad.kind === "pump" && launchpad.link ? (
      <Link href={launchpad.link} target="_blank" className="text-white hover:opacity-90 transition" title="Open on pump.fun">
        {v.name || "Unnamed"}
      </Link>
    ) : (
      <span className="text-white">{v.name || "Unnamed"}</span>
    );

  // Stop the card's onClick when pressing an action button
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border border-white/10 bg-zinc-950/70 hover:bg-zinc-900/70 transition shadow-sm overflow-hidden cursor-pointer"
    >
      {/* media */}
      <div className="relative aspect-[16/9] bg-white/5">
        {v.image ? (
          <Image
            src={normalizeImageUrl(v.image)}
            alt={v.symbol || v.name}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">No image</div>
        )}

        {/* status pill with solid black backing */}
        <div className="absolute left-2 top-2 z-10">
          <div className="rounded-md bg-black p-0.5">
            <div
              className={`px-2 py-0.5 rounded text-[11px] font-medium border
              ${
                status === "active"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : status === "upcoming"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-gray-500/15 text-gray-300 border-gray-500/30"
              }`}
            >
              {status}
            </div>
          </div>
        </div>
      </div>

      {/* body */}
      <div className="p-3">
        {/* title row */}
        <div className="flex items-center gap-2">
          {launchpad.logoSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={launchpad.logoSrc} alt={launchpad.kind || "launchpad"} className="h-4 w-4 rounded-sm" />
          )}
          <div className="font-semibold truncate">{nameNode}</div>
        </div>

        {/* symbol • short address */}
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <div className="text-gray-300">{v.symbol || "—"}</div>
          <div className="text-gray-500">•</div>
          <Link
            href={`https://explorer.solana.com/address/${v.mint}`}
            target="_blank"
            className="break-all"
            style={{ color: "#14F195", textDecoration: "none" }}
            title="View on Solana Explorer"
          >
            {shortAddr(v.mint)}
          </Link>
        </div>

        {typeof v.decimals === "number" && (
          <div className="text-[11px] text-gray-400 mt-0.5">{v.decimals} decimals</div>
        )}

        {/* metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-white/10 bg-white/5 p-2">
            <div className="text-gray-400">Rewards (net)</div>
            <div className="font-medium">{format(v.rewardNet)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2">
            <div className="text-gray-400">TVL (staked)</div>
            <div className="font-medium">{format(v.totalStaked)}</div>
          </div>
          <div className="rounded border border-white/10 bg-white/5 p-2 col-span-2">
            <div className="text-gray-400">Emission</div>
            <div className="font-medium">
              {format(v.emissionPerSec)} /s
              <span className="text-gray-300"> • {format(perDay)} /day</span>
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {v.startTime && v.endTime ? "180 days left • fixed" : "Fixed term"}
          </div>
          <div className="text-xs font-medium">
            APR: <span className="text-white">{v.apr == null ? "—" : pct(v.apr)}</span>
          </div>
        </div>

        {/* actions */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={(e) => {
              stop(e);
              onDeposit?.(v.mint);
            }}
            className="h-9 rounded-md border border-violet-500/40 bg-violet-500/15 text-violet-200 text-sm hover:bg-violet-500/25"
          >
            Deposit
          </button>
          <button
            onClick={(e) => {
              stop(e);
              onClaim?.(v.mint);
            }}
            className="h-9 rounded-md border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 text-sm hover:bg-cyan-500/25"
          >
            Claim
          </button>
          <button
            onClick={(e) => {
              stop(e);
              onWithdraw?.(v.mint);
            }}
            className="h-9 rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-200 text-sm hover:bg-rose-500/25"
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
