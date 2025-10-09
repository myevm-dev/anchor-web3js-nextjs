export type LaunchpadInfo = {
  kind: "pump" | "bonk" | null;
  logoSrc?: string;     // public/ path
  link?: string;        // optional deep link
  isKnown: boolean;
  color: string;        // NEW: hex color for branding
};

const DEFAULT_COLOR = "#18bdfd";       // non-pump/bonk fallback
const PUMP_COLOR    = "#83efaa";
const BONK_COLOR    = "#fe5e1f";

/**
 * Detects the launchpad by address suffix and returns a small descriptor
 * so UI can show the right logo, (optional) link, and a themed color.
 */
export function detectLaunchpad(mintOrAddress?: string): LaunchpadInfo {
  const s = (mintOrAddress || "").trim().toLowerCase();

  if (s.endsWith("pump")) {
    return {
      kind: "pump",
      logoSrc: "/images/pumpfunlogo.webp",
      link: `https://pump.fun/advanced/coin/${mintOrAddress}`,
      isKnown: true,
      color: PUMP_COLOR,
    };
  }

  if (s.endsWith("bonk")) {
    return {
      kind: "bonk",
      logoSrc: "/images/bonkfunlogo.png",
      // link: `https://bonk.fun/coin/${mintOrAddress}`,
      isKnown: true,
      color: BONK_COLOR,
    };
  }

  return { kind: null, isKnown: false, color: DEFAULT_COLOR };
}
