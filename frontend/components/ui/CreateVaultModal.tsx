"use client";

import { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { publicKey as umiPk } from "@metaplex-foundation/umi";
import { fetchMetadataFromSeeds } from "@metaplex-foundation/mpl-token-metadata";
import { detectLaunchpad } from "@/lib/launchpad";
type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit?: (data: { mint: string; rewardAmount: string }) => Promise<void> | void;
};

const TERM_SECS = 15_724_800; // 6 months (182d)
const FEE_BPS = 300;          // 3%
const CREATION_FEE_SOL = 0.1; // display only

export function CreateVaultModal({ open, onOpenChange, onSubmit }: Props) {
  const { connection } = useConnection();

  // form state
  const [mintStr, setMintStr] = useState("");
  const [rewardUi, setRewardUi] = useState("");

  // token meta state
  const [decimals, setDecimals] = useState<number | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenImage, setTokenImage] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);

  // helpers
  const rewardNum = useMemo(() => {
    const n = Number((rewardUi || "").replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [rewardUi]);

  const feeTokens   = useMemo(() => (rewardNum * FEE_BPS) / 10_000, [rewardNum]);
  const grossTokens = useMemo(() => rewardNum + feeTokens, [rewardNum, feeTokens]);
  const perSecond   = useMemo(() => (rewardNum > 0 ? rewardNum / TERM_SECS : 0), [rewardNum]);
  const perDay      = useMemo(() => perSecond * 86_400, [perSecond]); // per-day rate
  const disabled    = !mintStr.trim() || rewardNum <= 0 || loadingMeta;
// validate PK (move this ABOVE isPumpFun)
const validMintPk = useMemo(() => {
  try { return mintStr ? new PublicKey(mintStr) : null; } catch { return null; }
}, [mintStr]);
const launchpad = detectLaunchpad(validMintPk?.toBase58() || mintStr);
// pump.fun mint? (no PK needed)

  const format = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 6 });


  // Umi client with same RPC as wallet-adapter connection
  const umi = useMemo(() => {
    const endpoint =
      (connection as any)?.rpcEndpoint ||
      (connection as any)?._rpcEndpoint ||
      "https://api.mainnet-beta.solana.com";
    return createUmi(endpoint);
  }, [connection]);

  // reset form when the modal closes
  const resetForm = () => {
    setMintStr("");
    setRewardUi("");
    setDecimals(null);
    setTokenName("");
    setTokenSymbol("");
    setTokenImage("");
    setLoadingMeta(false);
  };
  useEffect(() => { if (!open) resetForm(); }, [open]);

  // fetch decimals + metadata when mint changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTokenName(""); setTokenSymbol(""); setTokenImage(""); setDecimals(null);
      if (!validMintPk) return;

      setLoadingMeta(true);
      try {
        // 1) SPL mint decimals
        const mintAcc = await getMint(connection, validMintPk);
        if (cancelled) return;
        setDecimals(mintAcc.decimals);

        // 2) Metaplex metadata via Umi (browser-safe)
        try {
          const md = await fetchMetadataFromSeeds(umi, { mint: umiPk(validMintPk.toBase58()) });
          if (cancelled || !md) return;

          const data: any = (md as any).data ?? md;
          const name   = (data?.name ?? "").toString().replace(/\0/g, "").trim();
          const symbol = (data?.symbol ?? "").toString().replace(/\0/g, "").trim();
          const uri    = (data?.uri ?? "").toString().replace(/\0/g, "").trim();

          setTokenName(name);
          setTokenSymbol(symbol);

          if (uri) {
            const j = await fetch(uri).then(r => r.json()).catch(() => null as any);
            if (!cancelled && j?.image) setTokenImage(j.image);
          }
        } catch {
          // no metadata available
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => { cancelled = true; };
  }, [validMintPk, connection, umi]);

  const handleSubmit = async () => {
    if (disabled) return;
    await onSubmit?.({ mint: mintStr.trim(), rewardAmount: rewardUi.trim() });
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* overlay */}
      <button
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      {/* modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 top-20 mx-auto w-[92%] max-w-xl rounded-xl border border-white/10 bg-zinc-950 p-4 shadow-2xl"
      >
        {/* header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Vault</h3>
          <button
            onClick={() => onOpenChange(false)}
            className="px-2 py-1 text-sm text-gray-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* mint + preview (wide row: image + details) */}
        <div className="mt-4 space-y-2">

          {(tokenImage || tokenName || tokenSymbol || decimals != null) && (
            <div className="w-full rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-4">
              {tokenImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tokenImage}
                  alt="token"
                  className="h-24 w-24 md:h-28 md:w-28 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-xl bg-white/10 border border-white/10 grid place-items-center text-sm text-gray-400">
                  {loadingMeta ? "…" : "No Img"}
                </div>
              )}

              <div className="min-w-0 flex-1">
  {/* Name */}
  <div className="text-base md:text-lg font-semibold text-white truncate">
    {tokenName || "Unnamed"}
  </div>

  {/* Symbol (line 2) with optional Pump.fun badge */}
{/* Symbol line (with optional launchpad badge) */}
{(tokenSymbol || launchpad.isKnown) && (
  <div className="text-sm text-gray-300 flex items-center gap-2">
    {launchpad.logoSrc && (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={launchpad.logoSrc}
        alt={launchpad.kind || "launchpad"}
        className="h-4 w-4 rounded-sm"
        aria-hidden="true"
      />
    )}
    <span>{tokenSymbol || (launchpad.kind === "pump" ? "Pump.fun token" : launchpad.kind === "bonk" ? "Bonk.fun token" : "Token")}</span>
  </div>
)}


  {/* Decimals (line 3) */}
  {decimals != null && (
    <div className="text-sm text-gray-300">{decimals} decimals</div>
  )}

  {/* Explorer link (Solana green) */}
{/* Explorer link — mainnet only, Solana green, no underline */}
{validMintPk && (
  <a
    href={`https://explorer.solana.com/address/${validMintPk.toBase58()}`}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-1 block text-xs break-all focus:outline-none focus:ring-1 focus:ring-[#14F195]/50"
    style={{ color: "#14F195", textDecoration: "none" }}
  >
    {validMintPk.toBase58()}
  </a>
)}

</div>

            </div>
          )}
          <label className="text-sm text-gray-300">Token Mint Address</label>

          <input
            value={mintStr}
            onChange={(e) => setMintStr(e.target.value)}
            placeholder="Paste SPL mint (pump.fun token)"
            className="h-10 w-full rounded-md bg-white/5 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
          />

          <div className="text-xs text-gray-400 h-4">
            {loadingMeta ? "Loading metadata…" : ""}
          </div>
        </div>

        {/* total rewards — tightened spacing (mt-2) to group with mint input */}
        <div className="mt-0">
          <label className="text-sm text-gray-300">
            Total Rewards to Distribute (over 6 months)
          </label>
          <input
            value={rewardUi}
            onChange={(e) => setRewardUi(e.target.value)}
            placeholder="e.g. 1,000,000"
            inputMode="decimal"
            className="mt-1 w-full h-10 rounded-md bg-white/5 text-sm text-white placeholder:text-gray-400 outline-none border border-white/15 px-3 focus:border-white/30"
          />
        </div>

        {/* summary — pushed lower (mt-6) to separate from inputs */}
        <div className="mt-10 grid grid-cols-2 gap-3 text-sm">
          {/* Protocol Fee */}
          <div className="rounded-md border border-white/10 p-3 bg-white/5">
            <div className="text-gray-400">Protocol Fee</div>
            <div className="mt-1 font-medium">
              {FEE_BPS / 100}% of rewards + {CREATION_FEE_SOL} SOL
            </div>
          </div>

          {/* You Must Provide */}
          <div className="rounded-md border border-white/10 p-3 bg-white/5">
            <div className="text-gray-400">You Must Provide</div>
            <div className="mt-1 font-medium">
              {rewardNum > 0 ? `${format(grossTokens)} tokens` : "—"}
            </div>
          </div>

          {/* Emission (two lines) */}
          <div className="rounded-md border border-white/10 p-3 bg-white/5 col-span-2">
            <div className="text-gray-400">Emission</div>
            <div className="mt-1 font-medium">
              {rewardNum > 0 ? (
                <>
                  <div>{format(perSecond)} tokens/s</div>
                  <div className="text-gray-300">{format(perDay)} tokens/day</div>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-md border border-white/15 bg-white/5 text-white text-sm hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={disabled}
            className="h-10 px-4 rounded-md border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 text-sm hover:bg-emerald-500/25 disabled:opacity-50"
          >
            Create Vault
          </button>
        </div>
      </div>
    </div>
  );
}
