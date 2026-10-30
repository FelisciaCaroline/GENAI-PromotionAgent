// Client-safe catalog for the prompt-driven (dynamic) poster engine.

export const LAYOUT_IDS = ["stack_center", "split_left", "split_right", "stack_bottom", "magazine", "bold_band", "frame_card"] as const;
export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_META: { id: LayoutId; label: string; fits: string }[] = [
  { id: "stack_center", label: "Tengah bertumpuk", fits: "Headline on top, subject large in the middle, CTA/details at the bottom. Safe, versatile, great for products and food." },
  { id: "split_left", label: "Teks kiri", fits: "Text column on the left, subject on the right. Clean and modern; good for tech, skincare, fashion, services." },
  { id: "split_right", label: "Teks kanan", fits: "Subject on the left, text column on the right. Same as split_left, mirrored." },
  { id: "stack_bottom", label: "Teks bawah", fits: "Subject/scene fills the top, all text grouped at the bottom. Cinematic, good for events, travel, lifestyle, food close-ups." },
  { id: "magazine", label: "Majalah", fits: "Giant headline behind the subject (subject overlaps the words) like a magazine cover. Bold, trendy, fashion, beauty, launches." },
  { id: "bold_band", label: "Pita warna", fits: "Thick colour band at the bottom holding the text, subject sits on top of the band. Loud, retail, flash sale, food promos." },
  { id: "frame_card", label: "Kartu bingkai", fits: "Inset card with a frame of background around it, editorial and tidy. Premium, handmade, cafes, invitations, announcements." },
];

export type FontRef = { family: string; weight: 400 | 600 | 700 | 800; style?: "normal" | "italic" };

export type TypePreset = {
  id: TypeId;
  label: string;
  fits: string;
  heading: FontRef & { lineHeight: number; tracking: number; forceUpper?: boolean };
  emphasis: FontRef | null; // font for the emphasised word (null = same as heading)
  emphasisStyle: "color" | "marker" | "underline";
  body: FontRef;
  accent: FontRef & { tracking: number; upper: boolean };
  cta: "pill" | "outline" | "underline";
};

export const TYPE_IDS = ["modern_bold", "editorial", "luxury", "impact", "condensed", "playful", "street", "script_mix"] as const;
export type TypeId = (typeof TYPE_IDS)[number];

export const TYPE_PRESETS: Record<TypeId, TypePreset> = {
  modern_bold: {
    id: "modern_bold", label: "Modern Bold (Poppins)", fits: "Friendly geometric sans. Default for most products, food, services, apps.",
    heading: { family: "Poppins", weight: 800, lineHeight: 1.05, tracking: -0.02 }, emphasis: null, emphasisStyle: "color",
    body: { family: "Poppins", weight: 400 }, accent: { family: "Poppins", weight: 600, tracking: 0.12, upper: true }, cta: "pill",
  },
  editorial: {
    id: "editorial", label: "Editorial Serif", fits: "DM Serif Display + mono labels. Cafes, bakeries, books, crafts, scrapbook vibe.",
    heading: { family: "DM Serif Display", weight: 400, lineHeight: 1.04, tracking: -0.01 }, emphasis: null, emphasisStyle: "marker",
    body: { family: "Inter", weight: 400 }, accent: { family: "Space Mono", weight: 700, tracking: 0.14, upper: true }, cta: "outline",
  },
  luxury: {
    id: "luxury", label: "Luxury (Playfair)", fits: "High-contrast serif with italic emphasis. Premium, skincare, perfume, jewellery, weddings, fine dining.",
    heading: { family: "Playfair Display", weight: 700, lineHeight: 1.06, tracking: -0.01 }, emphasis: { family: "Playfair Display", weight: 700, style: "italic" }, emphasisStyle: "color",
    body: { family: "Inter", weight: 400 }, accent: { family: "Inter", weight: 700, tracking: 0.3, upper: true }, cta: "underline",
  },
  impact: {
    id: "impact", label: "Impact (Anton)", fits: "Tall condensed all-caps. Flash sale, sport, gym, automotive, gaming, loud promos.",
    heading: { family: "Anton", weight: 400, lineHeight: 1.0, tracking: 0, forceUpper: true }, emphasis: null, emphasisStyle: "color",
    body: { family: "Inter", weight: 400 }, accent: { family: "Inter", weight: 800, tracking: 0.16, upper: true }, cta: "pill",
  },
  condensed: {
    id: "condensed", label: "Condensed (Bebas)", fits: "Clean condensed caps. Events, concerts, streetwear, coffee, minimal-bold.",
    heading: { family: "Bebas Neue", weight: 400, lineHeight: 0.95, tracking: 0.01, forceUpper: true }, emphasis: null, emphasisStyle: "marker",
    body: { family: "Poppins", weight: 400 }, accent: { family: "Space Mono", weight: 700, tracking: 0.14, upper: true }, cta: "pill",
  },
  playful: {
    id: "playful", label: "Playful (Lilita)", fits: "Chunky rounded display. Kids, snacks, desserts, drinks, toys, fun promos.",
    heading: { family: "Lilita One", weight: 400, lineHeight: 1.04, tracking: 0 }, emphasis: null, emphasisStyle: "color",
    body: { family: "Poppins", weight: 600 }, accent: { family: "Pacifico", weight: 400, tracking: 0, upper: false }, cta: "pill",
  },
  street: {
    id: "street", label: "Street (Archivo Black)", fits: "Heavy grotesk with marker emphasis. Streetwear, barbershop, music, youth, tech launches.",
    heading: { family: "Archivo Black", weight: 400, lineHeight: 1.0, tracking: -0.02 }, emphasis: null, emphasisStyle: "marker",
    body: { family: "Inter", weight: 400 }, accent: { family: "Space Mono", weight: 700, tracking: 0.14, upper: true }, cta: "outline",
  },
  script_mix: {
    id: "script_mix", label: "Script Mix", fits: "Bold sans with one handwritten script word. Beauty, florist, desserts, lifestyle, greetings.",
    heading: { family: "Poppins", weight: 800, lineHeight: 1.08, tracking: -0.02 }, emphasis: { family: "Pacifico", weight: 400 }, emphasisStyle: "color",
    body: { family: "Poppins", weight: 400 }, accent: { family: "Poppins", weight: 600, tracking: 0.12, upper: true }, cta: "pill",
  },
};

export const DECOR_IDS = ["disc", "rings", "rays", "sparkles", "blobs", "dots", "stripes", "grid", "confetti", "waves", "frame"] as const;
export type DecorId = (typeof DECOR_IDS)[number];

export const BADGE_IDS = ["circle", "burst", "stamp", "tag", "none"] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export const BG_IDS = ["ai_scene", "gradient", "solid"] as const;
export type BgId = (typeof BG_IDS)[number];

export type DesignColors = { bg: string; surface: string; text: string; primary: string; onPrimary: string; accent: string };

export type DesignText = {
  eyebrow: string;
  headline: string;
  emphasis: string;
  subheadline: string;
  highlight: string;
  highlightLabel: string;
  details: string[];
  cta: string;
  footer: string;
};

export type DesignSpec = {
  name: string;
  alasan: string;
  layout: LayoutId;
  align: "left" | "center";
  typography: TypeId;
  headingCase: "upper" | "lower" | "title" | "normal";
  colors: DesignColors;
  background: BgId;
  bgPrompt: string;
  decor: DecorId[];
  badgeShape: BadgeId;
  productSize: "small" | "medium" | "large";
  text: DesignText;
  seed: number;
};
