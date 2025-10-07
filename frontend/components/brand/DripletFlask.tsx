// High-contrast nav icon (24–32px). Solid white outline + neon glow.
export default function DripletFlaskMini({
  size = 28,
  className = "",
}: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="driplet-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#01fcfc" />
          <stop offset="100%" stopColor="#fd01f5" />
        </linearGradient>
        <filter id="outer-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Neon silhouette glow (behind outline) */}
      <path
        d="M22 6h10v16l15 23c3 5-1 11-7 11H18c-6 0-10-6-7-11l15-23V6z"
        fill="none"
        stroke="#01fcfc"
        strokeWidth="4.5"
        opacity="0.55"
        filter="url(#outer-glow)"
      />

      {/* Flask outline (bright) */}
      <path
        d="M22 6h10v16l15 23c3 5-1 11-7 11H18c-6 0-10-6-7-11l15-23V6z"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Liquid (continuous, tilted) */}
      <path
        d="
          M13 43
          C 26 36, 43 37, 52 41
          L 52 50
          C 52 55, 48 58, 43 58
          L 19 58
          C 14 58, 10 55, 10 50
          Z"
        fill="url(#driplet-fill)"
      />

      {/* Meniscus highlight */}
      <path
        d="M13 43 C 26 36, 43 37, 52 41"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Bubbles */}
      <circle cx="41" cy="45" r="2.4" fill="#fff" />
      <circle cx="46" cy="48" r="1.6" fill="#fff" />

      {/* Drip */}
      <path
        d="M30 60a4 4 0 1 0 8 0a4 4 0 1 0-8 0"
        fill="url(#driplet-fill)"
        stroke="#fff"
        strokeWidth="1.6"
      />
    </svg>
  );
}
