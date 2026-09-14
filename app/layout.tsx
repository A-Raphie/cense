import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/topbar";
import { Footer } from "@/components/footer";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cense-lake.vercel.app"),
  title: "Cense -- pay a cent, know if it's true",
  description:
    "A verification agent on Celo mainnet. Hand it a claim, pay $0.01 of USDC over x402, get a sourced verdict: VERIFIED, REFUTED, or UNVERIFIABLE. Every check leaves a receipt.",
  openGraph: {
    title: "Cense -- pay a cent, know if it's true",
    description:
      "A verification agent on Celo mainnet. Pay $0.01 of USDC over x402, get a sourced verdict with a receipt.",
    url: "https://cense-lake.vercel.app",
    siteName: "Cense",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cense -- pay a cent, know if it's true",
    description:
      "A verification agent on Celo mainnet. Pay $0.01 of USDC over x402, get a sourced verdict with a receipt.",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  // must be a literal (metadata API cannot read CSS vars); mirrors --bg-base in globals.css
  themeColor: "#fcf6f1",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TopBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
