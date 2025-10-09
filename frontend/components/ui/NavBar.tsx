// app/(site)/_components/NavBar.tsx (or wherever this file lives)
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "../WalletButton";
import { Home, Settings2, Info, Radar } from "lucide-react";

type Badge = { label: string; color: "green" | "red" | "purple" };

function badgeClass(color: Badge["color"]) {
  // ultra-small, uppercase, tight line-height, strong glow
  const base =
    "mt-0.5 inline-block text-[8px] leading-[8px] font-semibold uppercase tracking-[0.22em]";
  const green =
    "text-emerald-400 [filter:drop-shadow(0_0_3px_rgba(16,185,129,0.95))_drop-shadow(0_0_6px_rgba(16,185,129,0.65))]";
  const red =
    "text-rose-400 [filter:drop-shadow(0_0_3px_rgba(244,63,94,0.95))_drop-shadow(0_0_6px_rgba(244,63,94,0.65))]";
  const purple =
    "text-violet-300 [filter:drop-shadow(0_0_3px_rgba(167,139,250,0.95))_drop-shadow(0_0_6px_rgba(167,139,250,0.65))]";
  return `${base} ${
    color === "green" ? green : color === "red" ? red : purple
  }`;
}

function TopLink({
  href,
  children,
  exact = false,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  badge?: Badge;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`transition ${active ? "text-white" : "text-gray-300"} hover:text-white inline-block`}
    >
      <span className="relative flex flex-col items-center leading-none">
        <span>{children}</span>
        {badge ? <span className={badgeClass(badge.color)}>{badge.label}</span> : null}
      </span>
    </Link>
  );
}

function MobileLink({
  href,
  label,
  Icon,
  exact = false,
  badge,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
  badge?: Badge;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center h-[56px] rounded-md ${
        active ? "text-white" : "text-gray-300"
      } hover:text-white`}
    >
      <Icon size={18} strokeWidth={2.2} />
      <span className="mt-1 text-[11px] leading-none">{label}</span>
      {badge ? <span className={badgeClass(badge.color)}>{badge.label}</span> : null}
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

            {/* center links (desktop only) */}
            <div className="hidden md:flex items-center gap-6 text-lg">
              <TopLink href="/retro" exact badge={{ label: "LIVE", color: "green" }}>
                Retro
              </TopLink>
              <TopLink href="/" exact badge={{ label: "SOON", color: "red" }}>
                Vaults
              </TopLink>
              {/* <TopLink href="/trade">Trade</TopLink>  // TEMP disabled */}
              <TopLink href="/manage" badge={{ label: "SOON", color: "red" }}>
                Manage
              </TopLink>
              <TopLink href="/about" badge={{ label: "DRIPLET", color: "purple" }}>
                About
              </TopLink>
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
            <MobileLink
              href="/retro"
              label="Retro"
              Icon={Radar}
              exact
              badge={{ label: "LIVE", color: "green" }}
            />
            <MobileLink
              href="/"
              label="Vaults"
              Icon={Home}
              exact
              badge={{ label: "SOON", color: "red" }}
            />
            {/* <MobileLink href="/trade" label="Trade" Icon={CandlestickChart} /> */}
            <MobileLink
              href="/manage"
              label="Manage"
              Icon={Settings2}
              badge={{ label: "SOON", color: "red" }}
            />
            <MobileLink
              href="/about"
              label="About"
              Icon={Info}
              badge={{ label: "DRIPLET", color: "purple" }}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
