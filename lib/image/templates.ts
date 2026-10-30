import { el, fit, rgba, type Node } from "./satori";
import type { Box } from "./product";
import type { Palette, TemplateId } from "./catalog";

export type PosterText = { headline: string; subheadline: string; discount: string; cta: string; badge: string };
export type Ctx = { w: number; h: number; t: PosterText; p: Palette; box: Box; fg: string };
export type Layout = { box: Box; rotate?: number; border?: number; radius?: number };
export type TemplateDef = {
  layout: (w: number, h: number) => Layout;
  under: (c: Ctx) => Node | null;
  over: (c: Ctx) => Node;
};

const root = (w: number, h: number, ...kids: (Node | null)[]) => el("div", { width: w, height: h, position: "relative" }, ...kids);
const abs = (s: Record<string, string | number>) => ({ position: "absolute", ...s });
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);

function pill(text: string, p: Palette, s: Record<string, string | number>): Node {
  return el("div", abs({ flexDirection: "row", alignItems: "center", padding: "14px 30px", borderRadius: 999, backgroundColor: p.accent, color: p.ink, border: `3px solid ${p.ink}`, fontFamily: "Inter", fontWeight: 700, fontSize: 32, ...s }), text);
}

// ---------- 1. BOLD DISKON ----------
const boldDiskon: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.1, y: h * 0.3, w: w * 0.8, h: h * 0.5 } }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: 0, top: 0, width: w, height: h * 0.3, backgroundColor: p.primary })),
    el("div", abs({ left: 0, top: h * 0.83, width: w, height: h * 0.17, backgroundColor: p.ink }))),
  over: ({ w, h, t, p }) => {
    const d = Math.round(w * 0.27);
    return root(w, h,
      el("div", abs({ left: 48, top: 40, padding: "6px 16px", backgroundColor: p.ink, color: p.paper, fontFamily: "Space Mono", fontWeight: 700, fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }), t.badge),
      el("div", abs({ left: 48, top: 96, width: w - 96, height: h * 0.3 - 120, justifyContent: "center", color: p.onPrimary, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.headline, w - 96, 150, 0.62, 2), lineHeight: 1, letterSpacing: -2, textTransform: "uppercase" }), t.headline),
      el("div", abs({ left: w - d - 44, top: h * 0.3 - d * 0.28, width: d, height: d, borderRadius: 999, backgroundColor: p.ink, border: `6px solid ${p.accent}`, alignItems: "center", justifyContent: "center", color: p.accent, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.discount, d * 0.8, 100, 0.62), transform: "rotate(-10deg)" }), t.discount),
      el("div", abs({ left: 48, top: h * 0.83, width: w * 0.55, height: h * 0.17, justifyContent: "center", color: p.paper, fontFamily: "Inter", fontWeight: 400, fontSize: fit(t.subheadline, w * 0.55, 36, 0.52, 3), lineHeight: 1.25 }), t.subheadline),
      pill(t.cta, p, { left: w * 0.64, top: h * 0.83 + h * 0.085 - 32, fontSize: fit(t.cta, w * 0.3, 32, 0.6) }));
  },
};

// ---------- 2. EDITORIAL SCRAPBOOK ----------
const scrapbook: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.12, y: h * 0.33, w: w * 0.76, h: h * 0.44 }, rotate: -3, border: 14, radius: 14 }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: 0, top: h * 0.8, width: w, height: h * 0.2, backgroundColor: rgba(p.paper, 0.96) })),
    el("div", abs({ left: 0, top: 0, width: w, height: h * 0.36, backgroundImage: `linear-gradient(180deg, ${rgba(p.paper, 0.96)} 0%, ${rgba(p.paper, 0.96)} 55%, ${rgba(p.paper, 0)} 100%)` }))),
  over: ({ w, h, t, p }) => {
    const ws = words(t.headline);
    const size = fit(t.headline, w - 120, 118, 0.46, 2);
    const hl = Math.min(2, Math.ceil(ws.length / 2));
    const d = Math.round(w * 0.24);
    return root(w, h,
      el("div", abs({ left: 28, top: 28, width: w - 56, height: h - 56, border: `3px dashed ${rgba(p.ink, 0.55)}`, borderRadius: 12 })),
      el("div", abs({ left: 60, top: 62, padding: "6px 14px", backgroundColor: p.accent, color: p.ink, border: `1px solid ${rgba(p.ink, 0.4)}`, fontFamily: "Space Mono", fontWeight: 700, fontSize: 20, letterSpacing: 3, textTransform: "uppercase", transform: "rotate(-3deg)" }), t.badge),
      el("div", abs({ left: 60, top: 122, width: w - 120, flexDirection: "row", flexWrap: "wrap", fontFamily: "DM Serif Display", fontSize: size, lineHeight: 1.08, color: p.ink, textTransform: "lowercase" }),
        ...ws.map((x, i) => el("div", { marginRight: 18, padding: "0 10px", backgroundColor: i < hl ? p.primary : "transparent", color: i < hl ? p.onPrimary : p.ink }, x))),
      el("div", abs({ left: w - d - 50, top: h * 0.3 + 10, width: d, height: d, borderRadius: 999, backgroundColor: p.paper, border: `3px solid ${p.ink}`, alignItems: "center", justifyContent: "center", color: p.ink, fontFamily: "DM Serif Display", fontSize: fit(t.discount, d * 0.78, 84, 0.52), transform: "rotate(8deg)" }), t.discount),
      el("div", abs({ left: 60, top: h * 0.8 + 26, width: w * 0.5, height: h * 0.2 - 60, justifyContent: "center", color: p.ink, fontFamily: "Space Mono", fontWeight: 400, fontSize: fit(t.subheadline, w * 0.5, 28, 0.62, 3), lineHeight: 1.3, textTransform: "uppercase" }), t.subheadline),
      el("div", abs({ left: w * 0.62, top: h * 0.8 + (h * 0.2) / 2 - 30, flexDirection: "row", alignItems: "center", padding: "14px 30px", borderRadius: 999, backgroundColor: p.paper, border: `2px solid ${p.ink}`, color: p.ink, fontFamily: "Inter", fontWeight: 700, fontSize: fit(t.cta, w * 0.28, 30, 0.6) }),
        el("div", { width: 14, height: 14, borderRadius: 999, backgroundColor: p.primary, marginRight: 12, border: `1px solid ${p.ink}` }), t.cta));
  },
};

// ---------- 3. MINIMAL ELEGAN ----------
const minimal: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.14, y: h * 0.3, w: w * 0.72, h: h * 0.47 }, border: 12, radius: 8 }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: 0, top: 0, width: w, height: h * 0.34, backgroundImage: `linear-gradient(180deg, ${rgba(p.paper, 0.96)}, ${rgba(p.paper, 0)})` })),
    el("div", abs({ left: 0, top: h * 0.78, width: w, height: h * 0.22, backgroundImage: `linear-gradient(0deg, ${rgba(p.paper, 0.97)}, ${rgba(p.paper, 0)})` }))),
  over: ({ w, h, t, p }) => root(w, h,
    el("div", abs({ left: 0, top: 64, width: w, alignItems: "center", color: p.ink, fontFamily: "Space Mono", fontWeight: 700, fontSize: 22, letterSpacing: 8, textTransform: "uppercase" }), t.badge),
    el("div", abs({ left: 80, top: 118, width: w - 160, alignItems: "center", textAlign: "center", color: p.ink, fontFamily: "DM Serif Display", fontSize: fit(t.headline, w - 160, 112, 0.46, 2), lineHeight: 1.05 }), t.headline),
    el("div", abs({ left: w / 2 - 40, top: h * 0.78 + 10, width: 80, height: 3, backgroundColor: p.accent })),
    el("div", abs({ left: 0, top: h * 0.78 + 34, width: w, alignItems: "center", color: p.ink, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.discount, w * 0.7, 92, 0.62) }), t.discount),
    el("div", abs({ left: 120, top: h * 0.78 + 140, width: w - 240, alignItems: "center", textAlign: "center", color: rgba(p.ink, 0.75), fontFamily: "Inter", fontWeight: 400, fontSize: fit(t.subheadline, w - 240, 30, 0.52, 2) }), t.subheadline),
    el("div", abs({ left: 0, top: h - 74, width: w, alignItems: "center", color: p.ink, fontFamily: "Space Mono", fontWeight: 700, fontSize: 24, letterSpacing: 5, textTransform: "uppercase" }), `${t.cta}  >>`)),
};

// ---------- 4. DIAGONAL DINAMIS ----------
const diagonal: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.22, y: h * 0.34, w: w * 0.72, h: h * 0.42 }, rotate: 0 }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: -w * 0.3, top: -h * 0.26, width: w * 1.7, height: h * 0.62, backgroundColor: p.primary, transform: "rotate(-11deg)" })),
    el("div", abs({ left: -w * 0.3, top: -h * 0.26 + h * 0.62 - 16, width: w * 1.7, height: 16, backgroundColor: p.accent, transform: "rotate(-11deg)" })),
    el("div", abs({ left: 0, top: h * 0.86, width: w, height: h * 0.14, backgroundColor: p.ink }))),
  over: ({ w, h, t, p }) => {
    const d = Math.round(w * 0.25);
    return root(w, h,
      el("div", abs({ left: 56, top: 56, padding: "6px 16px", backgroundColor: p.accent, color: p.ink, fontFamily: "Space Mono", fontWeight: 700, fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }), t.badge),
      el("div", abs({ left: 56, top: 112, width: w * 0.68, height: h * 0.25, justifyContent: "flex-start", color: p.onPrimary, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.headline, w * 0.68, 120, 0.62, 3), lineHeight: 0.98, letterSpacing: -2, textTransform: "uppercase" }), t.headline),
      el("div", abs({ left: 50, top: h * 0.5, width: d, height: d, borderRadius: 999, backgroundColor: p.accent, border: `5px dashed ${p.ink}`, alignItems: "center", justifyContent: "center", color: p.ink, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.discount, d * 0.78, 88, 0.62), transform: "rotate(-8deg)" }), t.discount),
      el("div", abs({ left: 56, top: h * 0.86, width: w * 0.5, height: h * 0.14, justifyContent: "center", color: p.paper, fontFamily: "Inter", fontWeight: 400, fontSize: fit(t.subheadline, w * 0.5, 32, 0.52, 3), lineHeight: 1.25 }), t.subheadline),
      pill(t.cta, p, { left: w * 0.62, top: h * 0.86 + h * 0.07 - 32, fontSize: fit(t.cta, w * 0.3, 32, 0.6) }));
  },
};

// ---------- 5. POLAROID ----------
const polaroid: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.19, y: h * 0.255, w: w * 0.62, h: h * 0.35 }, border: 0, radius: 4 }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: w * 0.12, top: h * 0.225, width: w * 0.76, height: h * 0.53, backgroundColor: "#ffffff", boxShadow: "0 18px 40px rgba(0,0,0,0.28)", transform: "rotate(3deg)" })),
    el("div", abs({ left: 0, top: h * 0.86, width: w, height: h * 0.14, backgroundColor: rgba(p.paper, 0.96) }))),
  over: ({ w, h, t, p, fg }) => {
    const d = Math.round(w * 0.22);
    return root(w, h,
      el("div", abs({ left: 0, top: 50, width: w, alignItems: "center", textAlign: "center", color: fg, fontFamily: "DM Serif Display", fontSize: fit(t.headline, w - 120, 100, 0.46, 2), lineHeight: 1.05, padding: "0 60px", backgroundColor: "transparent" }), t.headline),
      el("div", abs({ left: w * 0.38, top: h * 0.2, width: w * 0.24, height: 52, backgroundColor: rgba(p.accent, 0.85), transform: "rotate(-4deg)" })),
      el("div", abs({ left: w * 0.2, top: h * 0.665, width: w * 0.58, alignItems: "center", textAlign: "center", color: p.ink, fontFamily: "Space Mono", fontWeight: 700, fontSize: fit(t.subheadline, w * 0.58, 28, 0.62, 2), transform: "rotate(3deg)" }), t.subheadline),
      el("div", abs({ left: w * 0.66, top: h * 0.2, width: d, height: d, borderRadius: 999, backgroundColor: p.primary, border: `4px solid ${p.paper}`, alignItems: "center", justifyContent: "center", color: p.onPrimary, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.discount, d * 0.78, 78, 0.62), transform: "rotate(10deg)" }), t.discount),
      el("div", abs({ left: 56, top: h * 0.86, width: w * 0.4, height: h * 0.14, justifyContent: "center", color: p.ink, fontFamily: "Space Mono", fontWeight: 700, fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }), t.badge),
      pill(t.cta, p, { left: w * 0.56, top: h * 0.86 + h * 0.07 - 32, fontSize: fit(t.cta, w * 0.34, 32, 0.6) }));
  },
};

// ---------- 6. KUPON TIKET ----------
const ticket: TemplateDef = {
  layout: (w, h) => ({ box: { x: w * 0.12, y: h * 0.2, w: w * 0.76, h: h * 0.46 }, border: 12, radius: 18 }),
  under: ({ w, h, p }) => root(w, h,
    el("div", abs({ left: 0, top: 0, width: w, height: h * 0.3, backgroundImage: `linear-gradient(180deg, ${rgba(p.ink, 0.88)}, ${rgba(p.ink, 0)})` }))),
  over: ({ w, h, t, p }) => {
    const tw = w * 0.88, th = h * 0.2, tx = w * 0.06, ty = h * 0.71;
    return root(w, h,
      el("div", abs({ left: 56, top: 48, color: p.accent, fontFamily: "Space Mono", fontWeight: 700, fontSize: 24, letterSpacing: 6, textTransform: "uppercase" }), t.badge),
      el("div", abs({ left: 56, top: 96, width: w - 112, color: p.paper, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.headline, w - 112, 108, 0.62, 2), lineHeight: 1, letterSpacing: -2, textTransform: "uppercase" }), t.headline),
      el("div", abs({ left: tx, top: ty, width: tw, height: th, flexDirection: "row", borderRadius: 22, backgroundColor: p.paper, border: `4px solid ${p.ink}` }),
        el("div", { width: tw * 0.4, height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: p.primary, color: p.onPrimary, fontFamily: "Inter", fontWeight: 800, fontSize: fit(t.discount, tw * 0.34, 96, 0.62) }, t.discount),
        el("div", { width: 0, height: "100%", borderLeft: `4px dashed ${p.ink}` }),
        el("div", { width: tw * 0.6 - 8, height: "100%", padding: "0 30px", justifyContent: "center" },
          el("div", { color: p.ink, fontFamily: "Inter", fontWeight: 700, fontSize: fit(t.subheadline, tw * 0.5, 34, 0.54, 2), lineHeight: 1.2 }, t.subheadline),
          el("div", { marginTop: 12, color: p.primary === p.ink ? p.accent : p.primary, fontFamily: "Space Mono", fontWeight: 700, fontSize: 26, letterSpacing: 3, textTransform: "uppercase" }, `${t.cta} >`))));
  },
};

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  bold_diskon: boldDiskon, scrapbook, minimal, diagonal, polaroid, ticket,
};
