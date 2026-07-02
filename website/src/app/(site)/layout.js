import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SiteLayout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 68px)", position: "relative", zIndex: 1 }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
