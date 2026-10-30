import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Tone = "pink" | "blue" | "green" | "cream" | "white";
export const toneBg: Record<Tone, string> = {
  pink: "bg-blush",
  blue: "bg-sky-soft",
  green: "bg-sage",
  cream: "bg-cream",
  white: "bg-white",
};

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-display text-3xl leading-none lowercase", className)} aria-label="promo. beranda">
      promo<span className="text-blush-deep">.</span>
    </Link>
  );
}

export function Highlight({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("highlight-pink", className)}>{children}</span>;
}

export function Sticker({ children, tone = "blue", rotate = -2, className }: { children: React.ReactNode; tone?: Tone; rotate?: number; className?: string }) {
  return (
    <span className={cn("sticker", toneBg[tone], className)} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </span>
  );
}

type PillProps = { children: React.ReactNode; href?: string; className?: string; variant?: "default" | "pink" | "outline" } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">;
export function PillButton({ children, href, className, variant = "default", ...rest }: PillProps) {
  const v = variant === "pink" ? "bg-blush" : variant === "outline" ? "bg-transparent" : "";
  const inner = (<><span className="dot" />{children}</>);
  if (href) return <Link href={href} className={cn("btn-pill", v, className)}>{inner}</Link>;
  return <button className={cn("btn-pill", v, className)} {...rest}>{inner}</button>;
}

export function BrandCard({ children, tone = "white", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  return <div className={cn("rounded-xl border border-ink/80 p-5", toneBg[tone], className)}>{children}</div>;
}

export function Marquee({ text, className }: { text: string; className?: string }) {
  const item = `${text} | `;
  const row = item.repeat(8);
  return (
    <div className={cn("marquee border-y border-ink/30 bg-sage py-2 font-mono text-[11px] uppercase tracking-[0.15em]", className)} aria-hidden>
      <div className="marquee-track"><span>{row}</span><span>{row}</span></div>
    </div>
  );
}

export function TopBanner({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-dashed border-ink/60 bg-sky-soft px-4 py-1.5 text-center font-mono text-[11px] uppercase tracking-wider">{children}</div>;
}

export function Disco({ className }: { className?: string }) {
  return <span className={cn("inline-block animate-floaty select-none text-4xl", className)} aria-hidden>🪩</span>;
}

export function PageTitle({ title, sub, sticker }: { title: React.ReactNode; sub?: string; sticker?: string }) {
  return (
    <header className="mb-6">
      {sticker && <Sticker tone="pink" className="mb-2">{sticker}</Sticker>}
      <h1 className="font-display text-4xl lowercase leading-tight md:text-5xl">{title}</h1>
      {sub && <p className="mt-2 max-w-2xl text-sm text-ink/70">{sub}</p>}
    </header>
  );
}
