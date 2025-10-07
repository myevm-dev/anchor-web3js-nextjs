"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "../WalletButton";

export function NavBar() {
  // keep this in sync with your WalletButton height
  const BTN_H = "h-10"; // 40px

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className={`flex items-center gap-3 ${BTN_H}`}>
            <Link href="/" className="flex items-center gap-3 text-white font-semibold tracking-wide">
              <Image
                src="/images/dripletlogo.png"
                alt="Driplet.Fun"
                width={40}
                height={40}
                priority
                className="shrink-0 h-10 w-auto rounded-sm"
              />
              {/* Make the wordmark visually as tall as the button/logo */}
<span className="leading-none text-[22px] sm:text-[24px] md:text-[26px] pt-[1px]">
  Driplet.Fun
</span>
            </Link>
          </div>

          {/* Center: nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <Link href="/" className="hover:text-white">Vaults</Link>
            <Link href="/about" className="hover:text-white">About</Link>
          </div>

          {/* Right: wallet */}
          <div className={`flex items-center ${BTN_H}`}>
            <WalletButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
