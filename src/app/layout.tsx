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
  title: "QCStats – Śledzenie statystyk Quake Champions",
  description:
    "Śledź swoje statystyki z pojedynków Quake Champions. Wrzuć screenshot z ekranu wyników, analizuj celność broni, obrażenia i dominuj na arenie.",
  keywords: ["quake champions", "statystyki", "tracker", "duel", "celność", "esports"],
  openGraph: {
    title: "QCStats – Śledzenie statystyk Quake Champions",
    description: "Wrzuć. Analizuj. Dominuj. Śledź swoje wyniki z Quake Champions.",
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
      lang="pl"
      className={`${rajdhani.variable} ${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable}`}
    >
      <body className="scanline-overlay">{children}</body>
    </html>
  );
}
