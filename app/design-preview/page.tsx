import { BrandCard, Highlight, Marquee, PillButton, Sticker, TopBanner } from "@/components/brand";

export default function DesignPreview() {
  return (
    <main className="bg-grid min-h-screen space-y-6 p-6">
      <TopBanner>Pratinjau komponen brand</TopBanner>
      <h1 className="font-display text-5xl lowercase"><Highlight>design</Highlight> preview</h1>
      <div className="flex gap-3"><PillButton>Default</PillButton><PillButton variant="pink">Pink</PillButton><PillButton variant="outline">Outline</PillButton></div>
      <div className="flex gap-3"><Sticker tone="blue">Blue</Sticker><Sticker tone="pink">Pink</Sticker><Sticker tone="green">Green</Sticker></div>
      <div className="grid gap-3 md:grid-cols-3"><BrandCard tone="pink">Pink</BrandCard><BrandCard tone="blue">Biru</BrandCard><BrandCard tone="green">Hijau</BrandCard></div>
      <Marquee text="MAKING PROMO MADE SIMPLE" />
    </main>
  );
}
