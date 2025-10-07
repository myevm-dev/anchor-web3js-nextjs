"use client";

import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-lg flex items-center border border-white/10 bg-[rgb(124,58,237)]/25"
        style={{ width: 173.47, height: 40, padding: "0 12px", gap: 8 }}
      >
        <div className="rounded-full" style={{ width: 24, height: 24, background: "linear-gradient(180deg, rgba(124,58,237,0.25) 0%, rgba(139,92,246,0.5) 100%)" }} />
        <div className="h-4 rounded-sm" style={{ width: 100, background: "rgba(255,255,255,0.15)" }} />
      </div>
    ),
  }
);

export function WalletButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Scope all wallet-adapter CSS variables inside this wrapper */}
          <div className="inline-block wallet-button-theme">
            {/* label + medium width (between your two extremes) */}
            <div className="inline-block wallet-button-theme">
              <WalletMultiButton className="!rounded-lg">Sign In</WalletMultiButton>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Connect your wallet</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
