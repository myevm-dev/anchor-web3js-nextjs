// app/api/dexscreener/resolve/route.ts
import { NextResponse } from "next/server";

// Minimal types for just what we use
type DexPair = {
  chainId?: string;
  pairAddress?: string;
};

type DexScreenerSearchResponse = {
  pairs?: DexPair[];
};

function isDexScreenerSearchResponse(v: unknown): v is DexScreenerSearchResponse {
  if (typeof v !== "object" || v === null) return false;
  const maybePairs = (v as { pairs?: unknown }).pairs;
  if (maybePairs === undefined) return true;
  if (!Array.isArray(maybePairs)) return false;
  // We only validate the fields we actually read
  return maybePairs.every((p) => {
    if (typeof p !== "object" || p === null) return false;
    const o = p as Record<string, unknown>;
    const chainIdOk = o.chainId === undefined || typeof o.chainId === "string";
    const pairAddressOk = o.pairAddress === undefined || typeof o.pairAddress === "string";
    return chainIdOk && pairAddressOk;
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "missing q" }, { status: 400 });
  }

  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;

  let data: unknown;
  try {
    const res = await fetch(url, { next: { revalidate: 15 } });
    if (!res.ok) {
      return NextResponse.json({ error: "lookup failed" }, { status: 502 });
    }
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "network error" }, { status: 502 });
  }

  if (!isDexScreenerSearchResponse(data)) {
    return NextResponse.json({ error: "bad response" }, { status: 502 });
  }

  const pairs = data.pairs ?? [];
  const match = pairs.find(
    (p) => (p.chainId ?? "").toLowerCase() === "solana" && (p.pairAddress ?? "").length > 0
  );

  if (!match?.pairAddress) {
    return NextResponse.json({ error: "pair not found" }, { status: 404 });
  }

  return NextResponse.json({ pairAddress: match.pairAddress });
}
