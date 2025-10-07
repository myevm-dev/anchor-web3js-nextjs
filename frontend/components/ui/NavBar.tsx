"use client";

import Link from "next/link";
import { WalletButton } from "../WalletButton";
import DripletFlaskMini from "../brand/DripletFlask";

export function NavBar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 text-white font-semibold tracking-wide">
              <DripletFlaskMini size={30} className="shrink-0" />
              <span>Driplet.Fun</span>
            </Link>
          </div>

          {/* Center: nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <Link href="/" className="hover:text-white">Vaults</Link>
            <Link href="/about" className="hover:text-white">About</Link>
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
