"use client";

import Navbar from "./Navbar";
import BackgroundOrbs from "./BackgroundOrbs";
import Footer from "./Footer";
import LenisProvider from "./LenisProvider";
import { WalletProvider } from "./WalletProvider";

export default function ClientProviders({ children }) {
  return (
    <WalletProvider>
      <LenisProvider>
        <div className="min-h-screen bg-background relative flex flex-col">
          <BackgroundOrbs />
          <Navbar />
          <main className="pt-24 flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </LenisProvider>
    </WalletProvider>
  );
}
