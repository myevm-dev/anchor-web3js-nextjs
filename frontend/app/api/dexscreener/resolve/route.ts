import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });

  const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) return NextResponse.json({ error: "lookup failed" }, { status: 502 });

  const data = await res.json();
  const pairs: any[] = data?.pairs ?? [];
  const match = pairs.find((p) => (p.chainId || "").toLowerCase() === "solana");
  if (!match) return NextResponse.json({ error: "pair not found" }, { status: 404 });

  return NextResponse.json({ pairAddress: match.pairAddress });
}
