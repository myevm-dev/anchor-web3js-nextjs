// frontend/lib/launchpad.ts
export type LaunchpadInfo = {
  kind: "pump" | "bonk" | "raydium" | "daoszn" | null;
  logoSrc?: string;     // public/ path
  link?: string;        // optional deep link
  isKnown: boolean;
  color: string;        // NEW: hex color for branding
};

const DEFAULT_COLOR = "#18bdfd"; // fallback
const PUMP_COLOR    = "#83efaa";
const BONK_COLOR    = "#fe5e1f";
const RAYDIUM_COLOR = "#7819c3";
const DAOSZN_COLOR  = "#76e21c";

/**
 * Detects the launchpad by address suffix and returns descriptor
 * for logo, optional link, and color theme.
 */
export function detectLaunchpad(mintOrAddress?: string): LaunchpadInfo {
  const s = (mintOrAddress || "").trim();

  // === PUMP ===
  if (s.toLowerCase().endsWith("pump")) {
    return {
      kind: "pump",
      logoSrc: "/images/pumpfunlogo.webp",
      link: `https://pump.fun/advanced/coin/${mintOrAddress}`,
      isKnown: true,
      color: PUMP_COLOR,
    };
  }

  // === BONK ===
  if (s.toLowerCase().endsWith("bonk")) {
    return {
      kind: "bonk",
      logoSrc: "/images/bonkfunlogo.png",
      // link: `https://bonk.fun/coin/${mintOrAddress}`,
      isKnown: true,
      color: BONK_COLOR,
    };
  }

  // === RAYDIUM ===
  if (s.toLowerCase().endsWith("ray")) {
    return {
      kind: "raydium",
      logoSrc: "/images/raydiumlogo.webp",
      link: `https://raydium.io/launchpad/token/?mint=${mintOrAddress}`,
      isKnown: true,
      color: RAYDIUM_COLOR,
    };
  }

  // === DAO SZN ===
  // note: case-insensitive "DAO" ending (any combination of D/A/O)
  if (s.match(/dao$/i)) {
    return {
      kind: "daoszn",
      logoSrc: "/images/daosnzlogo.webp",
      link: `https://www.daoszn.fun/launchpad/token/?mint=${mintOrAddress}`,
      isKnown: true,
      color: DAOSZN_COLOR,
    };
  }

  // === default ===
  return { kind: null, isKnown: false, color: DEFAULT_COLOR };
}
