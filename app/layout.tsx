import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "agronaut",
  applicationName: "agronaut",
  description: "Design and operate a lunar agriculture outpost.",
  openGraph: {
    title: "agronaut",
    description: "Design and operate a lunar agriculture outpost.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
