// DripletFlask.tsx — continuous fill, no diagonal gap
export default function DripletFlask({
  size = 200,
  tintA = "#01fcfc",   // cyan
  tintB = "#fd01f5",   // magenta
  stroke = "#0a0a0a",
}: { size?: number; tintA?: string; tintB?: string; stroke?: string }) {
  const id = "dripletGrad";
  const hid = "highlightGrad";
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" role="img" aria-label="Driplet Flask">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={tintA}/>
          <stop offset="100%" stopColor={tintB}/>
        </linearGradient>
        {/* subtle highlight, translucent (won't look like empty space) */}
        <linearGradient id={hid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Flask outline */}
      <path
        d="M82 18h28c3 0 6 3 6 6v44l62 98c13 21-2 48-26 48H66c-24 0-39-27-26-48l62-98V24c0-3 3-6 6-6z"
        fill="#0a0a0a00"
        stroke={stroke}
        strokeWidth="10"
        strokeLinejoin="round"
      />

      {/* Liquid (continuous area) — adjust 'tilt' by editing meniscus control points */}
      <path
        d="
          M58 160
          C 100 138, 162 142, 196 156   /* meniscus curve (tilted) */
          L 196 194
          C 196 214, 182 228, 162 228
          L 62 228
          C 42 228, 28 214, 28 194
          Z"
        fill={`url(#${id})`}
        filter="url(#glow)"
      />

      {/* Meniscus highlight */}
      <path
        d="M58 160 C 100 138, 162 142, 196 156"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Inner glass highlight strip (semi-transparent overlay, NOT a gap) */}
      <path
        d="M94 52 L94 96 L42 178"
        stroke={`url(#${hid})`}
        strokeWidth="14"
        strokeLinecap="round"
        fill="none"
      />

      {/* Bubbles */}
      <circle cx="160" cy="176" r="8" fill="#fff" opacity="0.9"/>
      <circle cx="178" cy="188" r="5" fill="#fff" opacity="0.8"/>

      {/* Drip */}
      <path
        d="M122 236c0-10 8-18 18-18s18 8 18 18-8 18-18 18-18-8-18-18z"
        fill={`url(#${id})`}
        stroke={stroke}
        strokeWidth="6"
      />
    </svg>
  );
}
