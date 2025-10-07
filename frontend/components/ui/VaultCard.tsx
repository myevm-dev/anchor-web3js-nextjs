"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

export type VaultSummary = {
  // token / display
  mint: string;                 // SPL mint
  name: string;
  symbol?: string;
  image?: string;               // logo URL (may be ipfs:// or gateway)
  decimals?: number;

  // vault config/state
  admin?: string;               // creator
  startTime?: number;           // unix (sec)
  endTime?: number;             // unix (sec)
  rewardNet?: number;           // tokens to distribute (net of fee)
  totalStaked?: number;         // tokens currently staked
  emissionPerSec?: number;      // tokens/sec (net)
  apr?: number | null;          // e.g. 0.42 => 42%
};

/** Format helpers */
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

/** Normalize IPFS/Arweave/Shadow links to a browser-friendly URL */
function normalizeImageUrl(u?: string): string | undefined {
  if (!u) return undefined;

  // ipfs://CID[/path]
  if (u.startsWith("ipfs://")) {
    const path = u.replace("ipfs://", "");
    return `https://ipfs.io/ipfs/${path}`;
  }

  try {
    const url = new URL(u);

    // Cloudflare / Pinata -> ipfs.io (optional, just to keep consistent)
    if (
      url.hostname === "cloudflare-ipfs.com" ||
      url.hostname === "gateway.pinata.cloud"
    ) {
      return `https://ipfs.io${url.pathname}`;
    }

    // nftstorage.link often uses subdomain gateways like <cid>.ipfs.nftstorage.link/…
    if (url.hostname.endsWith(".nftstorage.link")) {
      // Convert https://<cid>.ipfs.nftstorage.link/<path> -> https://ipfs.io/ipfs/<cid>/<path>
      const cid = url.hostname.split(".")[0];
      const path = url.pathname.replace(/^\/+/, "");
      return `https://ipfs.io/ipfs/${cid}/${path}`;
    }

    // already arweave / shdw / ipfs.io: leave as-is
    return url.toString();
  } catch {
    // Not a valid URL, return as-is
    return u;
  }
}

export default function VaultCard({
  v,
  onClick,
}: {
  v: VaultSummary;
  onClick?: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const status =
    v.endTime && now >= v.endTime ? "ended" : v.startTime && now < v.startTime ? "upcoming" : "active";

  const isPumpFun = v.mint.toLowerCase().endsWith("pump");
  const perDay = (v.emissionPerSec ?? 0) * 86400;

  const imgSrc = useMemo(() => normalizeImageUrl(v.image), [v.image]);

  return (
    <div
      onClick={onClick}
      className="group rounded-xl border border-white/10 bg-zinc-950/70 hover:bg-zinc-900/70 transition shadow-sm overflow-hidden cursor-pointer"
    >
      {/* image */}
      <div className="relative aspect-[16/9] bg-white/5">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={v.symbol || v.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            unoptimized
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-400">
            No image
          </div>
        )}
        {/* status pill with black backdrop */}
{/* status pill with solid black backdrop */}
<div className="absolute left-2 top-2 z-10">
  <div className="rounded-md bg-black p-0.5 ring-1 ring-black/70">

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
          {isPumpFun && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/images/pumplogo.webp" alt="pump.fun" className="h-4 w-4 rounded-sm" />
          )}
          <div className="font-semibold text-white truncate">{v.name || "Unnamed"}</div>
        </div>
        {v.symbol && <div className="text-xs text-gray-300 mt-0.5">{v.symbol}</div>}
        {typeof v.decimals === "number" && (
          <div className="text-[11px] text-gray-400">{v.decimals} decimals</div>
        )}

        {/* mint link */}
        <Link
          href={`https://explorer.solana.com/address/${v.mint}`}
          target="_blank"
          className="mt-1 block text-xs break-all"
          style={{ color: "#14F195", textDecoration: "none" }}
        >
          {shortAddr(v.mint)}
        </Link>

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
            {v.startTime && v.endTime ? "6 months • fixed" : "Fixed term"}
          </div>
          <div className="text-xs font-medium">
            APR: <span className="text-white">{v.apr == null ? "—" : pct(v.apr)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
