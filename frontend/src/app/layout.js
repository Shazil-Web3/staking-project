import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import BackgroundOrbs from "../components/BackgroundOrbs";
import Footer from "../components/Footer";
import LenisProvider from "../components/LenisProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ETH Staker - Fixed-term ETH Staking",
  description: "Fixed-term ETH staking with simple, predictable bonuses. Stake your ETH and earn guaranteed returns.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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
      </body>
    </html>
  );
}
