import type { BadgeImageId } from "./data/lessons";

const ICONS: Record<BadgeImageId, React.ReactNode> = {
  "voice-spark": (
    <g fill="oklch(0.3 0.09 150)">
      <path d="M20 28h6l12-8v24l-12-8h-6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z" />
      <path d="M27 37l2 8h-4l-3-8z" />
      <path d="M42 26q4 6 0 12" fill="none" stroke="oklch(0.3 0.09 150)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M45.5 22.5q7 9.5 0 19" fill="none" stroke="oklch(0.3 0.09 150)" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  ),
  "box-keeper": (
    <g fill="none" stroke="oklch(0.3 0.09 150)" strokeWidth="2.6" strokeLinejoin="round">
      <path d="M32 18l13 6v16l-13 6-13-6V24z" fill="oklch(0.3 0.09 150 / 0.18)" />
      <path d="M19 24l13 6 13-6M32 30v16" />
    </g>
  ),
  "lightning-count": (
    <path d="M35 15L21 35h9l-3 14 15-21h-9z" fill="oklch(0.3 0.09 150)" stroke="oklch(0.3 0.09 150)" strokeWidth="1.5" strokeLinejoin="round" />
  ),
  "scroll-reader": (
    <g fill="none" stroke="oklch(0.3 0.09 150)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 20h18a4 4 0 0 1 4 4v20H26a4 4 0 0 1-4-4z" fill="oklch(0.3 0.09 150 / 0.16)" />
      <path d="M22 20a4 4 0 0 0-4 4v2h4M44 44a4 4 0 0 0 4-4v-2h-4" />
      <path d="M28 28h10M28 33h10M28 38h6" />
    </g>
  ),
};

export function Badge({ id, size = 64, className }: { id: BadgeImageId; size?: number; className?: string }) {
  const shine = "pa-badge-shine-" + id;
  const rim = "pa-badge-rim-" + id;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label={id.replace("-", " ") + " badge"}>
      <defs>
        <radialGradient id={shine} cx="38%" cy="30%" r="70%">
          <stop offset="0%" stopColor="oklch(0.97 0.12 120)" />
          <stop offset="45%" stopColor="oklch(0.86 0.2 128)" />
          <stop offset="100%" stopColor="oklch(0.62 0.19 138)" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.19 145)" />
          <stop offset="100%" stopColor="oklch(0.36 0.12 150)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill={`url(#${rim})`} />
      <circle cx="32" cy="32" r="25.5" fill={`url(#${shine})`} />
      <circle cx="32" cy="32" r="23" fill="none" stroke="oklch(0.95 0.06 92)" strokeWidth="1.2" opacity="0.85" />
      {ICONS[id]}
      <ellipse cx="25" cy="17" rx="10" ry="4.5" fill="oklch(1 0 0 / 0.35)" transform="rotate(-20 25 17)" />
    </svg>
  );
}
