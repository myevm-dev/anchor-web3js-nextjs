// components/ui/ManageVaultCard.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { detectLaunchpad } from "@/lib/launchpad";

export type ManageVault = {
  mint: string;
  name?: string;
  symbol?: string;
  image?: string;
  status?: "active" | "upcoming" | "ended";
  startTime?: number;
  endTime?: number;
  totalStaked?: number;
  rewardNet?: number;
};

function format(n?: number, maxFrac = 6) {
  if (n == null || !isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}
function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}
function normalizeImageUrl(url?: string) {
  if (!url) return "";
  let u = url.trim();
  if (u.startsWith("ipfs://")) u = `https://ipfs.io/ipfs/${u.replace("ipfs://", "")}`;
  return u;
}

export default function ManageVaultCard({
  v,
  onClone,
  onBoost,
  onHide,
}: {
  v: ManageVault;
  onClone?: (mint: string) => void;
  onBoost?: (mint: string) => void;
  onHide?: (mint: string) => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const status: "active" | "upcoming" | "ended" =
    v.status ??
    (v.endTime && now >= v.endTime
      ? "ended"
      : v.startTime && now < v.startTime
      ? "upcoming"
      : "active");

  const launchpad = detectLaunchpad(v.mint);
  const lpColor = launchpad.color;


  const perSec = v.rewardNet != null ? v.rewardNet / (182 * 24 * 60 * 60) : undefined;
  const perDay = perSec != null ? perSec * 86400 : undefined;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      onClick={() => {}}
      className="group rounded-xl border-2 bg-zinc-950/70 hover:bg-zinc-900/70 transition shadow-sm overflow-hidden cursor-pointer"
      style={{
        borderColor: lpColor,
        boxShadow: `0 0 0 1px ${lpColor}22`,
      }}
    >
      {/* media */}
      <div className="relative aspect-[16/9] bg-white/5">
        {v.image ? (
          <Image
            src={normalizeImageUrl(v.image)}
            alt={v.symbol || v.name || "token"}
            fill
            className="object-cover"
            unoptimized
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
            No image
          </div>
        )}

        {/* status pill */}
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
          <div className="font-semibold text-white truncate">{v.name || "Unnamed"}</div>
        </div>

        {/* symbol • short address */}
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          <div className="text-gray-300">
            {v.symbol ||
              (launchpad.kind === "pump"
                ? "Pump.fun token"
                : launchpad.kind === "bonk"
                ? "Bonk.fun token"
                : "—")}
          </div>
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

        {/* metrics */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border p-2 bg-[#0f131a] border-[#7B4DFF]/30">
            <div className="text-gray-400">Rewards (net)</div>
            <div className="font-medium">{format(v.rewardNet)}</div>
          </div>
          <div className="rounded border p-2 bg-[#0f131a] border-[#7B4DFF]/30">
            <div className="text-gray-400">TVL (staked)</div>
            <div className="font-medium">{format(v.totalStaked)}</div>
          </div>
          <div className="rounded border p-2 col-span-2 bg-[#0f131a] border-[#7B4DFF]/30">
            <div className="text-gray-400">Emission</div>
            <div className="font-medium">
              {perSec != null ? (
                <>
                  {format(perSec)} /s
                  <span className="text-gray-300"> • {format(perDay)} /day</span>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            {v.startTime && v.endTime ? "180 days left • fixed" : "Fixed term"}
          </div>
          <div className="text-xs text-gray-400" />
        </div>

        {/* actions */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            onClick={(e) => {
              stop(e);
              onClone?.(v.mint);
            }}
            className="h-9 rounded-md border border-violet-500/40 bg-violet-500/15 text-violet-200 text-sm hover:bg-violet-500/25"
            title="Clone vault config"
          >
            Clone
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBoost?.(v.mint);
            }}
            disabled
            className="h-9 rounded-md border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 text-sm hover:bg-cyan-500/25 cursor-not-allowed"
            title="Boost not implemented"
          >
            Boost
          </button>

          <button
            onClick={(e) => {
              stop(e);
              onHide?.(v.mint);
            }}
            className="h-9 rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-200 text-sm hover:bg-rose-500/25"
            title="Hide vault"
          >
            Hide4You
          </button>
        </div>
      </div>
    </div>
  );
}
