// Small original illustrations drawn in code (SVG), so there are no image files to download
// and they stay sharp at any size. They are decoration only, so screen readers skip them.

type Art = { className?: string };

const INK = "#0d0d0d";

export function BulbArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 8c-22 0-38 16-38 36 0 14 7 22 14 30 4 5 6 9 6 14h36c0-5 2-9 6-14 7-8 14-16 14-30C98 24 82 8 60 8Z" fill="#ffc700" />
        <path d="M44 100h32M48 110h24" fill="none" />
        <path d="M48 70l12-20 12 20" fill="none" />
        <path d="M60 50V38" fill="none" />
      </g>
      <g stroke={INK} strokeWidth="5" strokeLinecap="round">
        <path d="M10 44H2M118 44h-8M20 12l-6-6M100 12l6-6" />
      </g>
    </svg>
  );
}

export function RocketArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M44 84 30 98l-4-18 14-12Z" fill="#e8001d" />
        <path d="M76 84l14 14 4-18-14-12Z" fill="#e8001d" />
        <path d="M60 6c18 12 26 34 22 62H38C34 40 42 18 60 6Z" fill="#f6f2ea" />
        <circle cx="60" cy="38" r="9" fill="#1537c8" />
        <path d="M44 68h32l-4 14H48Z" fill="#ffc700" />
        <path d="M52 90c0 10 3 18 8 24 5-6 8-14 8-24Z" fill="#f25c05" />
      </g>
    </svg>
  );
}

function Gear({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g stroke={INK} strokeWidth="4" strokeLinejoin="round">
      {teeth.map((angle) => (
        <rect
          key={angle}
          x={cx - r * 0.2}
          y={cy - r * 1.28}
          width={r * 0.4}
          height={r * 0.5}
          rx="2"
          fill={fill}
          transform={`rotate(${angle} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r * 0.4} fill="#f6f2ea" />
    </g>
  );
}

export function GearsArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <Gear cx={46} cy={50} r={26} fill="#ff4fa3" />
      <Gear cx={88} cy={88} r={16} fill="#ffc700" />
    </svg>
  );
}

export function TeamArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 112c0-20 10-32 24-32s24 12 24 32Z" fill="#1537c8" />
        <circle cx="30" cy="58" r="14" fill="#f6f2ea" />
        <path d="M66 112c0-20 10-32 24-32s24 12 24 32Z" fill="#e8001d" />
        <circle cx="90" cy="58" r="14" fill="#f6f2ea" />
        <path d="M36 112c0-24 10-40 24-40s24 16 24 40Z" fill="#ffc700" />
        <circle cx="60" cy="42" r="15" fill="#f6f2ea" />
        <path d="M60 10v8M46 14l4 7M74 14l-4 7" fill="none" />
      </g>
    </svg>
  );
}

export function TrendArt({ className }: Art) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="70" width="22" height="40" fill="#ffc700" />
        <rect x="42" y="50" width="22" height="60" fill="#ff4fa3" />
        <rect x="74" y="28" width="22" height="82" fill="#f25c05" />
        <path d="M14 42 48 22l22 8 30-22" fill="none" />
        <path d="M86 6h16v16" fill="none" />
      </g>
    </svg>
  );
}

// A round "sticker" badge with text running around the edge and a star in the middle.
// "id" must be unique on the page because the text follows a named circle.
export function Sticker({
  id,
  text,
  bg,
  ring,
  className,
}: {
  id: string;
  text: string;
  bg: string;
  ring: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={text}>
      <circle cx="50" cy="50" r="47" fill="#f6f2ea" stroke={INK} strokeWidth="3" />
      <circle cx="50" cy="50" r="30" fill={bg} stroke={INK} strokeWidth="3" />
      <path
        d="m50 34 4.7 9.5 10.5 1.5-7.6 7.4 1.8 10.4L50 57.8l-9.4 4.9 1.8-10.4-7.6-7.4 10.5-1.5Z"
        fill={ring}
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <defs>
        <path id={id} d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" />
      </defs>
      <text fontSize="9.5" fontWeight="800" letterSpacing="1" fill={INK} fontFamily="Arial Black, Arial, sans-serif">
        <textPath href={`#${id}`} startOffset="0" textLength="232" lengthAdjust="spacing">
          {text}
        </textPath>
      </text>
    </svg>
  );
}
