// app/layout.tsx
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Metadata } from "next";
import { Suspense } from "react";                    // ⬅️ add
import { Geist, Geist_Mono } from "next/font/google";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { NavBar } from "@/components/ui/NavBar";
import { GlobalSearchBar } from "@/components/ui/GlobalSearchBar";
import { Toaster } from "sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Driplet.Fun",
  description: "Immutable 6-month SPL staking vaults",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark overscroll-none">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}>
        <SolanaProvider>
          <NavBar />
          {/* ⬇️ useSearchParams lives here — wrap it */}
          <Suspense fallback={null}>
            <GlobalSearchBar />
          </Suspense>

          <div className="pt-[110px] pb-20 md:pb-0">
       

            <Suspense fallback={null}>{children}</Suspense>

            <Toaster
              position="bottom-right"
              theme="dark"
              closeButton
              richColors={false}
              toastOptions={{
                style: {
                  background: "#171717",
                  color: "white",
                  border: "1px solid rgba(75, 85, 99, 0.3)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                },
                className: "toast-container",
              }}
            />
          </div>
        </SolanaProvider>
      </body>
    </html>
  );
}