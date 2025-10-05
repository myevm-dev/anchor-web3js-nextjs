"use client";

import Link from "next/link";
import { WalletButton } from "../WalletButton";

export function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="text-white font-semibold tracking-wide">
              Solana dApp
            </Link>
          </div>

          {/* Center: (optional) nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            {/* <Link href="/about" className="hover:text-white">About</Link> */}
            {/* <Link href="/docs" className="hover:text-white">Docs</Link> */}
          </div>

          {/* Right: wallet */}
          <div className="flex items-center">
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
