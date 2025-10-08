"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "../WalletButton";
import { Home, Settings2, Info, Radar } from "lucide-react"; // added Radar for Retro

function TopLink({
  href,
  children,
  exact = false,
}: { href: string; children: React.ReactNode; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`transition ${active ? "text-white" : "text-gray-300"} hover:text-white`}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  label,
  Icon,
  exact = false,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center h-[56px] rounded-md
                  ${active ? "text-white" : "text-gray-300"} hover:text-white`}
    >
      <Icon size={18} strokeWidth={2.2} />
      <span className="mt-1 text-[11px] leading-none">{label}</span>
    </Link>
  );
}

export function NavBar() {
  const BTN_H = "h-9";

  return (
    <>
      {/* TOP NAV (solid) */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#000]">
        <div className="mx-auto max-w-7xl px-4">
          <div className="h-14 flex items-center justify-between gap-4">
            {/* brand */}
            <div className={`flex items-center gap-3 ${BTN_H}`}>
              <Link href="/" className="flex items-center gap-2 text-white font-semibold tracking-wide">
                <Image src="/images/dripletlogo.png" alt="Driplet.Fun" width={40} height={40} className="h-10 w-auto" priority />
                <span className="leading-none text-[22px] sm:text-[24px] md:text-[26px]">
                  <span>Driplet</span>
                  <span className="ml-1 bg-[linear-gradient(90deg,#5DE6FF_0%,#A685FA_45%,#FF6DFD_100%)] bg-clip-text text-transparent">.Fun</span>
                </span>
              </Link>
            </div>

            {/* center links (desktop only) */}
            <div className="hidden md:flex items-center gap-6 text-lg">
              <TopLink href="/retro" exact>Retro</TopLink>
              <TopLink href="/" exact>Vaults</TopLink>
              {/* <TopLink href="/trade">Trade</TopLink>  // TEMP disabled */}
              <TopLink href="/manage">Manage</TopLink>
              <TopLink href="/about">About</TopLink>
            </div>

            {/* RIGHT: wallet */}
            <div className={`flex items-center ${BTN_H}`}>
              <div className="hidden sm:block wallet-button-theme">
                <WalletButton />
              </div>
              <div className="sm:hidden wallet-button-theme wallet-button-compact">
                <WalletButton />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* BOTTOM NAV (mobile only) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0b0f14]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-7xl px-2">
          <div className="grid grid-cols-4">
            <MobileLink href="/retro" label="Retro" Icon={Radar} exact />
            <MobileLink href="/" label="Vaults" Icon={Home} exact />
            {/* <MobileLink href="/trade" label="Trade" Icon={CandlestickChart} /> */}
            <MobileLink href="/manage" label="Manage" Icon={Settings2} />
            <MobileLink href="/about" label="About" Icon={Info} />
          </div>
        </div>
      </nav>
    </>
  );
}
