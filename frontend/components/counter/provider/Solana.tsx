"use client";

import React, { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

interface SolanaProviderProps {
  children: ReactNode;
}

export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_KEY!;
  const httpEndpoint = useMemo(() => `https://solana-mainnet.g.alchemy.com/v2/${key}`, [key]);
  const wsEndpoint = useMemo(() => `wss://solana-mainnet.g.alchemy.com/v2/${key}`, [key]);

  return (
    <ConnectionProvider
      endpoint={httpEndpoint}
      config={{
        wsEndpoint,
        commitment: "confirmed",
        disableRetryOnRateLimit: false,
      }}
    >
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
