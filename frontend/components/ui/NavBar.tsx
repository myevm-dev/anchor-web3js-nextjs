"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "../WalletButton";

function NavItem({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`hover:text-white transition ${
        isActive ? "text-white" : "text-gray-300"
      }`}
    >
      {children}
    </Link>
  );
}

export function NavBar() {
  // keep this in sync with your WalletButton height
  const BTN_H = "h-10"; // 40px

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur supports-[backdrop-filter]:bg-black/30">
      <div className="mx-auto max-w-7xl px-4">
        <div className="h-14 flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className={`flex items-center gap-3 ${BTN_H}`}>
            <Link href="/" className="flex items-center gap-2 text-white font-semibold tracking-wide">
              <Image
                src="/images/dripletlogo.png"
                alt="Driplet.Fun"
                width={40}
                height={40}
                className="h-10 w-auto"
                priority
              />
              <span className="leading-none text-[22px] sm:text-[24px] md:text-[26px]">
                <span>Driplet</span>
                <span className="ml-1 bg-[linear-gradient(90deg,#5DE6FF_0%,#A685FA_45%,#FF6DFD_100%)] bg-clip-text text-transparent">
                  .Fun
                </span>
              </span>
            </Link>
          </div>

          {/* Center: nav links */}
          <div className="hidden md:flex items-center gap-6 text-lg">
            <NavItem href="/" exact>Vaults</NavItem>
            <NavItem href="/manage">Manage</NavItem>
            <NavItem href="/about">About</NavItem>
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
