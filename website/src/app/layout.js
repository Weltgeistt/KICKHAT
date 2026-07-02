import "./globals.css";

export const metadata = {
  title: "Kickhat | Yapay Zeka Destekli Yayıncı Asistanı",
  description: "Kick yayınlarınızı akıllı moderasyon, chat oyunları ve gelişmiş XP sistemleriyle bir sonraki seviyeye taşıyan hepsi bir arada yayıncı aracı.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
