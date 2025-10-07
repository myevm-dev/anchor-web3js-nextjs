// frontend/lib/launchpad.ts
export type LaunchpadInfo = {
  kind: "pump" | "bonk" | null;
  logoSrc?: string;     // public/ path
  link?: string;        // where the name should link (optional)
  isKnown: boolean;
};

/**
 * Detects the launchpad by address suffix and returns a small descriptor
 * so UI can show the right logo and (optionally) link.
 */
export function detectLaunchpad(mintOrAddress?: string): LaunchpadInfo {
  const s = (mintOrAddress || "").trim().toLowerCase();

  if (s.endsWith("pump")) {
    return {
      kind: "pump",
      logoSrc: "/images/pumplogo.webp",
      link: `https://pump.fun/advanced/coin/${mintOrAddress}`,
      isKnown: true,
    };
  }

  if (s.endsWith("bonk")) {
    return {
      kind: "bonk",
      logoSrc: "/images/bonkfunlogo.png",
      // If you want to link the name for BONK in the future, add the URL here:
      // link: `https://bonk.fun/coin/${mintOrAddress}`,
      isKnown: true,
    };
  }

  return { kind: null, isKnown: false };
}
