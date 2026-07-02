import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata = {
  metadataBase: new URL("https://kickhat.net"),
  title: {
    default: "Kickhat — Kick Yayıncıları için AI Moderasyon & İstatistik",
    template: "%s | Kickhat",
  },
  description:
    "Kick yayınların için yapay zeka moderasyonu, XP & seviye sistemi, chat komutları ve canlı istatistikler. Beta'da tamamen ücretsiz.",
  keywords: ["kick", "kick bot", "kick moderasyon", "kick istatistik", "yayıncı botu", "kickhat"],
  openGraph: {
    title: "Kickhat — Kick sohbetin için tam kontrol",
    description:
      "AI moderasyon, XP sistemi, chat komutları ve canlı istatistikler. Kick yayıncıları için tek pakette.",
    url: "https://kickhat.net",
    siteName: "Kickhat",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Kickhat" }],
  },
  twitter: {
    card: "summary",
    title: "Kickhat — Kick sohbetin için tam kontrol",
    description: "AI moderasyon, XP sistemi ve canlı istatistikler — Kick yayıncıları için.",
    images: ["/logo.png"],
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
