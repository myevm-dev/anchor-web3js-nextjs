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

// Theme
const ACCENT_PURPLE = "#7B4DFF"; // borders like AboutPage cards
const SOFT_PURPLE   = "#b685d5"; // section titles on page
const BG_DARK       = "#0b0f14"; // solid dark panel
const CYAN_TXT      = "text-cyan-300/90";

// ---- local helper types (remove `any`) ----
type MaybeEndpoint = { rpcEndpoint?: string; _rpcEndpoint?: string };
type CssTouch = CSSStyleDeclaration & { touchAction?: string };
type UmiMetaDataShape =
  | { data?: { name?: unknown; symbol?: unknown; uri?: unknown } }
  | { name?: unknown; symbol?: unknown; uri?: unknown };
type TokenMetaJson = { image?: string | null };

const toStringSafe = (v: unknown): string =>
  typeof v === "string"
    ? v
    : v instanceof Uint8Array
    ? new TextDecoder().decode(v)
    : "";

export function CreateVaultModal({ open, onOpenChange, onSubmit }: Props) {
  const { connection } = useConnection();

  const [mintStr, setMintStr] = useState("");
  const [rewardUi, setRewardUi] = useState("");
  const [decimals, setDecimals] = useState<number | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenImage, setTokenImage] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(false);

  const rewardNum = useMemo(() => {
    const n = Number((rewardUi || "").replace(/,/g, ""));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [rewardUi]);

  const feeTokens   = useMemo(() => (rewardNum * FEE_BPS) / 10_000, [rewardNum]);
  const grossTokens = useMemo(() => rewardNum + feeTokens, [rewardNum, feeTokens]);
  const perSecond   = useMemo(() => (rewardNum > 0 ? rewardNum / TERM_SECS : 0), [rewardNum]);
  const perDay      = useMemo(() => perSecond * 86_400, [perSecond]);
  const disabled    = !mintStr.trim() || rewardNum <= 0 || loadingMeta;

  const validMintPk = useMemo(() => {
    try { return mintStr ? new PublicKey(mintStr) : null; } catch { return null; }
  }, [mintStr]);

  const launchpad = detectLaunchpad(validMintPk?.toBase58() || mintStr);

  const format = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 6 });

  // Umi with same RPC (typed, no `any`)
  const umi = useMemo(() => {
    const epHolder = connection as unknown as { rpcEndpoint?: string; _rpcEndpoint?: string };
    const endpoint = epHolder.rpcEndpoint ?? epHolder._rpcEndpoint ?? "https://api.mainnet-beta.solana.com";
    return createUmi(endpoint);
  }, [connection]);

  // reset on close
  const resetForm = () => {
    setMintStr(""); setRewardUi(""); setDecimals(null);
    setTokenName(""); setTokenSymbol(""); setTokenImage("");
    setLoadingMeta(false);
  };
  useEffect(() => { if (!open) resetForm(); }, [open]);

  // HARD-LOCK background scroll when open + compensate scrollbar width (typed)
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;

    const y = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPos: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyPr: body.style.paddingRight,
      touch: (body.style as CssTouch).touchAction,
    };

    const sbw = window.innerWidth - html.clientWidth; // 0 on mobile

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    (body.style as CssTouch).touchAction = "none";

    if (sbw > 0) body.style.paddingRight = `${sbw}px`;

    return () => {
      body.style.position = prev.bodyPos;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      (body.style as CssTouch).touchAction = prev.touch || "";
      body.style.paddingRight = prev.bodyPr;
      window.scrollTo(0, y);
    };
  }, [open]);

  // metadata (no `any`, include connection dep)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setTokenName(""); setTokenSymbol(""); setTokenImage(""); setDecimals(null);
      if (!validMintPk) return;

      setLoadingMeta(true);
      try {
        const mintAcc = await getMint(connection, validMintPk);
        if (cancelled) return;
        setDecimals(mintAcc.decimals);

        try {
          const md = (await fetchMetadataFromSeeds(umi, {
            mint: umiPk(validMintPk.toBase58()),
          })) as unknown as UmiMetaDataShape;

          if (cancelled || !md) return;

          // cover both shapes
          const container = "data" in md && md.data ? md.data : (md as Record<string, unknown>);
          const name  = toStringSafe((container as Record<string, unknown>)?.["name"])
            .replace(/\0/g, "").trim();
          const symbol = toStringSafe((container as Record<string, unknown>)?.["symbol"])
            .replace(/\0/g, "").trim();
          const uri   = toStringSafe((container as Record<string, unknown>)?.["uri"])
            .replace(/\0/g, "").trim();

          setTokenName(name);
          setTokenSymbol(symbol);

          if (uri) {
            const j: TokenMetaJson | null = await fetch(uri)
              .then((r) => r.json() as Promise<TokenMetaJson>)
              .catch(() => null);
            if (!cancelled && j?.image) setTokenImage(j.image);
          }
        } catch {
          /* ignore secondary metadata failures */
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
    <div className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain">
      {/* solid dark overlay */}
      <button
        aria-label="Close"
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-black/85"
      />

      {/* centered container */}
      <div role="dialog" aria-modal="true" className="relative mx-auto w-[92%] max-w-xl py-8 sm:py-12">
        {/* AboutPage card styling: solid dark bg + purple border */}
        <div
          className="rounded-2xl border shadow-[0_0_0_1px_rgba(123,77,255,0.08)]"
          style={{ backgroundColor: BG_DARK, borderColor: `${ACCENT_PURPLE}66` }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
            <h3 className={`text-lg font-semibold ${CYAN_TXT}`}>Create Vault</h3>
            <button
              onClick={() => onOpenChange(false)}
              className="px-2 py-1 text-sm text-gray-300 hover:text-white rounded-md hover:bg-white/5"
            >
              ✕
            </button>
          </div>
          <div className="h-px w-full bg-white/5" />

          {/* scrollable content */}
          <div
            className="p-4 sm:p-6"
            style={{
              maxHeight: "calc(100dvh - 7rem)",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
            {/* token preview card */}
            {(tokenImage || tokenName || tokenSymbol || decimals != null) && (
              <div
                className="w-full rounded-xl p-3 flex items-center gap-4 border"
                style={{ backgroundColor: "#0f131a", borderColor: `${ACCENT_PURPLE}66` }}
              >
                {tokenImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tokenImage}
                    alt="token"
                    className="h-20 w-20 md:h-24 md:w-24 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="h-20 w-20 md:h-24 md:w-24 rounded-xl bg-white/10 border border-white/10 grid place-items-center text-sm text-gray-400">
                    {loadingMeta ? "…" : "No Img"}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-base md:text-lg font-semibold text-white truncate">
                    {tokenName || "Unnamed"}
                  </div>

                  {(tokenSymbol || launchpad.isKnown) && (
                    <div className="mt-0.5 text-sm text-gray-300 flex items-center gap-2">
                      {launchpad.logoSrc && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={launchpad.logoSrc} alt={launchpad.kind || "launchpad"} className="h-4 w-4 rounded-sm" />
                      )}
                      <span className="rounded-sm px-1.5 py-0.5 text-[11px] border border-white/15 bg-white/[0.04]">
                        {tokenSymbol ||
                          (launchpad.kind === "pump"
                            ? "Pump.fun token"
                            : launchpad.kind === "bonk"
                            ? "Bonk.fun token"
                            : "Token")}
                      </span>
                    </div>
                  )}

                  {decimals != null && (
                    <div className="text-xs text-gray-400 mt-0.5">{decimals} decimals</div>
                  )}

                  {validMintPk && (
                    <a
                      href={`https://explorer.solana.com/address/${validMintPk.toBase58()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-xs break-all"
                      style={{ color: "#14F195", textDecoration: "none" }}
                    >
                      {validMintPk.toBase58()}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* form */}
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className={`text-sm ${CYAN_TXT}`}>Token Mint Address</label>
                <input
                  value={mintStr}
                  onChange={(e) => setMintStr(e.target.value)}
                  placeholder="Paste SPL mint (e.g. Pump.fun token)"
                  className="h-11 w-full rounded-lg text-sm text-white placeholder:text-gray-400 outline-none border px-3 bg-[#0f131a] focus:bg-[#111722]"
                  style={{ borderColor: `${ACCENT_PURPLE}66` }}
                />
                <div className="text-xs text-gray-400 h-4">
                  {loadingMeta ? "Loading metadata…" : ""}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-sm ${CYAN_TXT}`}>Total Rewards to Distribute (over 6 months)</label>
                <input
                  value={rewardUi}
                  onChange={(e) => setRewardUi(e.target.value)}
                  placeholder="e.g. 1,000,000"
                  inputMode="decimal"
                  className="h-11 w-full rounded-lg text-sm text-white placeholder:text-gray-400 outline-none border px-3 bg-[#0f131a] focus:bg-[#111722]"
                  style={{ borderColor: `${ACCENT_PURPLE}66` }}
                />
              </div>
            </div>

            {/* summary cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border p-3" style={{ borderColor: `${ACCENT_PURPLE}66`, backgroundColor: "#0f131a" }}>
                <div className="text-gray-300">Protocol Fee</div>
                <div className="mt-1 font-medium" style={{ color: SOFT_PURPLE }}>
                  {FEE_BPS / 100}% of rewards + {CREATION_FEE_SOL} SOL
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: `${ACCENT_PURPLE}66`, backgroundColor: "#0f131a" }}>
                <div className="text-gray-300">You Must Provide</div>
                <div className="mt-1 font-medium text-[#01fcfc]">
                  {rewardNum > 0 ? `${format(grossTokens)} tokens` : "—"}
                </div>
              </div>

              <div className="col-span-2 rounded-xl border p-3" style={{ borderColor: `${ACCENT_PURPLE}66`, backgroundColor: "#0f131a" }}>
                <div className="text-gray-300">Emission</div>
                {rewardNum > 0 ? (
                  <>
                    <div className="mt-1 font-medium text-[#01fcfc]">{format(perSecond)} tokens/s</div>
                    <div className="text-sm" style={{ color: SOFT_PURPLE }}>{format(perDay)} tokens/day</div>
                  </>
                ) : (
                  <div className="mt-1 text-gray-400">—</div>
                )}
              </div>
            </div>

            {/* footer */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[11px] tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT_PURPLE }} />
                <span className="text-gray-300">Immutable 182-day stream</span>
              </span>

              <div className="flex gap-3">
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-10 px-4 rounded-md border text-white text-sm hover:bg-white/10"
                  style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.05)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={disabled}
                  className="h-10 px-4 rounded-md text-sm text-white hover:brightness-110 disabled:opacity-50"
                  style={{ backgroundColor: ACCENT_PURPLE }}
                >
                  Create Vault
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
