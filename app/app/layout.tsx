import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cense instrument -- check a claim",
  description: "Hand a claim to the agent. Pay $0.01 of USDC over x402, get a sourced verdict with a receipt.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
