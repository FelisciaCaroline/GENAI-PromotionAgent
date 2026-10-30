import { Marquee, TopBanner } from "@/components/brand";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { Faq, FeatureCarousel, FinalCta, Footer, HowItWorks, LanguageDemo, Members, Pricing, Problem, Showcase } from "@/components/landing/Sections";

export default function LandingPage() {
  return (
    <main>
      <TopBanner>✨ Gratis untuk 10 kampanye pertama! Coba sekarang</TopBanner>
      <div className="bg-grid"><Navbar /></div>
      <Hero />
      <Marquee text="PROMO JADI MUDAH" />
      <Problem />
      <FeatureCarousel />
      <HowItWorks />
      <Showcase />
      <LanguageDemo />
      <Members />
      <Pricing />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
