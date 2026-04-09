import type { Metadata } from "next";
import { Rajdhani, Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "QCStats – Quake Champions Stats Tracker",
  description:
    "Track your Quake Champions duel statistics. Upload your post-match screenshot, analyze weapon accuracy, damage, and dominate the arena.",
  keywords: ["quake champions", "stats", "tracker", "duel", "accuracy", "esports"],
  openGraph: {
    title: "QCStats – Quake Champions Stats Tracker",
    description: "Upload. Analyze. Dominate. Track your Quake Champions duel performance.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rajdhani.variable} ${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}
    >
      <body className="scanline-overlay">{children}</body>
    </html>
  );
}
