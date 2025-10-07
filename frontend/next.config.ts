import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Quick allow-list (works for most token images)
    domains: [
      "ipfs.io",
      "cloudflare-ipfs.com",
      "gateway.pinata.cloud",
      "nftstorage.link",
      "arweave.net",
      "shdw-drive.genesysgo.net",
    ],
    // (Optional) tighter matching
    remotePatterns: [
      { protocol: "https", hostname: "ipfs.io", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "cloudflare-ipfs.com", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "gateway.pinata.cloud", pathname: "/ipfs/**" },
      { protocol: "https", hostname: "*.nftstorage.link", pathname: "/**" },
      { protocol: "https", hostname: "arweave.net", pathname: "/**" },
      { protocol: "https", hostname: "shdw-drive.genesysgo.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
