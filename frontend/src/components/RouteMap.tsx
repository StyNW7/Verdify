import { useMemo } from 'react';

type Palette = {
  bg: string;
  grid: string;
  land: string;
  water: string;
  roadDim: string;
  roadGlow: string;
  eco: string;
  ecoGlow: string;
  pinInk: string;
  pinRing: string;
  label: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  chipMuted: string;
  accent: string;
};

export const MAP_PALETTES: Record<'warm' | 'dark' | 'light', Palette> = {
  light: {
    bg: 'transparent',
    grid: 'rgba(10, 14, 12, 0.07)',
    land: 'rgba(10, 14, 12, 0.035)',
    water: 'rgba(31, 122, 61, 0.06)',
    roadDim: 'rgba(10, 14, 12, 0.22)',
    roadGlow: 'rgba(200, 90, 46, 0.65)',
    eco: '#1F7A3D',
    ecoGlow: 'rgba(31, 122, 61, 0.28)',
    pinInk: '#0A0E0C',
    pinRing: '#FFFFFF',
    label: 'rgba(10, 14, 12, 0.78)',
    chipBg: 'rgba(255, 255, 255, 0.92)',
    chipBorder: 'rgba(10, 14, 12, 0.10)',
    chipText: '#0A0E0C',
    chipMuted: 'rgba(10, 14, 12, 0.55)',
    accent: '#C85A2E',
  },
  warm: {
    bg: 'transparent',
    grid: 'rgba(64, 56, 44, 0.09)',
    land: 'rgba(151, 140, 112, 0.10)',
    water: 'rgba(100, 130, 118, 0.16)',
    roadDim: 'rgba(60, 50, 36, 0.28)',
    roadGlow: 'rgba(180, 78, 52, 0.75)',
    eco: '#2E5E3E',
    ecoGlow: 'rgba(46, 94, 62, 0.35)',
    pinInk: '#1C2A21',
    pinRing: '#F3ECDB',
    label: 'rgba(28, 42, 33, 0.85)',
    chipBg: 'rgba(248, 243, 229, 0.92)',
    chipBorder: 'rgba(44, 36, 28, 0.18)',
    chipText: '#1C2A21',
    chipMuted: 'rgba(28, 42, 33, 0.6)',
    accent: '#B44E34',
  },
  dark: {
    bg: 'transparent',
    grid: 'rgba(166, 247, 84, 0.06)',
    land: 'rgba(255, 255, 255, 0.025)',
    water: 'rgba(120, 200, 180, 0.05)',
    roadDim: 'rgba(255, 255, 255, 0.14)',
    roadGlow: 'rgba(255, 140, 90, 0.7)',
    eco: '#A6F754',
    ecoGlow: 'rgba(166, 247, 84, 0.55)',
    pinInk: '#ECEFE9',
    pinRing: 'rgba(166, 247, 84, 0.9)',
    label: 'rgba(236, 239, 233, 0.85)',
    chipBg: 'rgba(18, 23, 20, 0.78)',
    chipBorder: 'rgba(166, 247, 84, 0.22)',
    chipText: '#ECEFE9',
    chipMuted: 'rgba(236, 239, 233, 0.55)',
    accent: '#A6F754',
  },
};

const STANDARD_PATH =
  'M 120 360 C 180 340, 210 330, 245 315 S 310 270, 345 260 S 430 240, 465 210 S 540 145, 605 130 S 720 140, 780 120';
const ECO_PATH =
  'M 120 360 C 200 320, 270 260, 360 235 S 520 205, 620 180 S 740 150, 780 120';

export type RouteMapProps = {
  variant?: 'warm' | 'dark' | 'light';
  className?: string;
  showChips?: boolean;
};

export default function RouteMap({
  variant = 'warm',
  className = '',
  showChips = true,
}: RouteMapProps) {
  const p = MAP_PALETTES[variant];
  const id = useMemo(() => `rm-${Math.random().toString(36).slice(2, 8)}`, []);

  return (
    <div className={`route-map relative w-full h-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 900 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern id={`${id}-grid`} x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke={p.grid} strokeWidth="1" />
          </pattern>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.ecoGlow} />
            <stop offset="70%" stopColor="transparent" />
          </radialGradient>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={`${id}-landSoft`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <linearGradient id={`${id}-ecoGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={p.eco} stopOpacity="0.3" />
            <stop offset="50%" stopColor={p.eco} stopOpacity="1" />
            <stop offset="100%" stopColor={p.eco} stopOpacity="0.4" />
          </linearGradient>
          <mask id={`${id}-revealMask`}>
            <rect x="0" y="0" width="900" height="500" fill="black" />
            <rect x="0" y="0" width="900" height="500" fill="white">
              <animate attributeName="width" from="0" to="900" dur="2.4s" begin="0.2s" fill="freeze" />
            </rect>
          </mask>
        </defs>

        <rect width="900" height="500" fill={p.bg} />
        <rect width="900" height="500" fill={`url(#${id}-grid)`} />

        <g filter={`url(#${id}-landSoft)`}>
          <path
            d="M -80 430 Q 120 380 240 395 T 480 410 T 720 420 T 980 430 L 980 580 L -80 580 Z"
            fill={p.land}
          />
          <path
            d="M -80 90 Q 180 55 350 95 T 640 75 T 980 105 L 980 -80 L -80 -80 Z"
            fill={p.land}
          />
          <path
            d="M 160 210 Q 300 190 430 215 T 700 225 T 900 240 Q 920 265 900 290 Q 700 270 500 282 T 260 290 T 120 270 Q 130 240 160 210 Z"
            fill={p.water}
          />
        </g>

        <circle cx="420" cy="245" r="200" fill={`url(#${id}-glow)`} opacity="0.7" />

        <path
          d={STANDARD_PATH}
          fill="none"
          stroke={p.roadDim}
          strokeWidth="2.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
          mask={`url(#${id}-revealMask)`}
        />

        <path
          d={ECO_PATH}
          fill="none"
          stroke={p.eco}
          strokeWidth="10"
          strokeOpacity="0.25"
          strokeLinecap="round"
          filter={`url(#${id}-soft)`}
          mask={`url(#${id}-revealMask)`}
        />
        <path
          d={ECO_PATH}
          fill="none"
          stroke={`url(#${id}-ecoGrad)`}
          strokeWidth="3"
          strokeLinecap="round"
          mask={`url(#${id}-revealMask)`}
        />

        <circle r="5" fill={p.eco}>
          <animateMotion dur="4.2s" repeatCount="indefinite" path={ECO_PATH} rotate="auto" />
        </circle>
        <circle r="11" fill={p.eco} opacity="0.25">
          <animateMotion dur="4.2s" repeatCount="indefinite" path={ECO_PATH} rotate="auto" />
          <animate attributeName="r" values="8;18;8" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite" />
        </circle>

        <circle r="3" fill={p.accent} opacity="0.9">
          <animateMotion dur="6.5s" repeatCount="indefinite" path={STANDARD_PATH} />
        </circle>

        {[0.2, 0.45, 0.7].map((t, i) => (
          <g key={`tick-${i}`} opacity="0.8">
            <circle r="2.5" fill={p.eco}>
              <animateMotion
                dur="4.2s"
                begin={`${-t * 4.2}s`}
                repeatCount="indefinite"
                path={ECO_PATH}
              />
            </circle>
          </g>
        ))}

        <g transform="translate(120 360)">
          <circle r="18" fill={p.pinRing} opacity="0.35">
            <animate attributeName="r" values="12;22;12" dur="2.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <circle r="7" fill={p.pinInk} stroke={p.pinRing} strokeWidth="2.5" />
          <circle r="2" fill={p.pinRing} />
        </g>

        <g transform="translate(780 120)">
          <circle r="22" fill={p.eco} opacity="0.25">
            <animate attributeName="r" values="16;28;16" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle r="9" fill={p.eco} stroke={p.pinRing} strokeWidth="2.5" />
          <path d="M -4 0 L -1 3 L 4 -3" stroke={p.pinInk} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <g transform="translate(420 245)">
          <circle r="5" fill="none" stroke={p.eco} strokeWidth="2" />
          <circle r="1.6" fill={p.eco} />
        </g>

        <g fontFamily="var(--font-mono)" fontSize="10" fill={p.label} letterSpacing="2">
          <text x="140" y="395" opacity="0.9">BUKIT INDAH</text>
          <text x="140" y="408" opacity="0.5" fontSize="8.5">ORIGIN · A</text>

          <text x="730" y="100" textAnchor="end" opacity="0.9">WOODLANDS N</text>
          <text x="730" y="113" textAnchor="end" opacity="0.5" fontSize="8.5">DESTINATION · B</text>

          <text x="440" y="240" opacity="0.6" fontSize="8.5">RTS LINK · 04:12</text>
        </g>

        <g transform="translate(840 440)" fill={p.label} fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2">
          <circle r="18" fill="none" stroke={p.roadDim} strokeWidth="1" />
          <path d="M 0 -13 L 3 0 L 0 13 L -3 0 Z" fill={p.eco} />
          <text y="-22" textAnchor="middle" opacity="0.65">N</text>
        </g>

        <g transform="translate(40 460)" fontFamily="var(--font-mono)" fontSize="9" fill={p.label} letterSpacing="2">
          <line x1="0" y1="0" x2="80" y2="0" stroke={p.roadDim} strokeWidth="1" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke={p.roadDim} strokeWidth="1" />
          <line x1="40" y1="-3" x2="40" y2="3" stroke={p.roadDim} strokeWidth="1" />
          <line x1="80" y1="-3" x2="80" y2="3" stroke={p.roadDim} strokeWidth="1" />
          <text x="0" y="16" opacity="0.55">0</text>
          <text x="80" y="16" opacity="0.55">10 KM</text>
        </g>
      </svg>

      {showChips && (
        <>
          <div
            className="absolute left-[6%] top-[18%] flex items-start gap-3 rounded-[4px] border px-3 py-2.5 backdrop-blur-md"
            style={{
              background: p.chipBg,
              borderColor: p.chipBorder,
              color: p.chipText,
              animation: 'chip-float-a 7s ease-in-out infinite',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span className="mt-1 block h-2 w-2 rounded-full" style={{ background: p.eco, boxShadow: `0 0 10px ${p.eco}` }} />
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: p.chipMuted }}>Eco route</div>
              <div className="text-[13px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>RTS Link + LRT</div>
              <div className="text-[10px]" style={{ color: p.chipMuted }}>-68% CO₂ · 42 min</div>
            </div>
          </div>

          <div
            className="absolute right-[8%] bottom-[22%] flex items-start gap-3 rounded-[4px] border px-3 py-2.5 backdrop-blur-md"
            style={{
              background: p.chipBg,
              borderColor: p.chipBorder,
              color: p.chipText,
              animation: 'chip-float-b 8.5s ease-in-out infinite',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-[0.22em]" style={{ color: p.chipMuted }}>Carbon saved</div>
              <div className="text-[15px] font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                2.14 <span className="text-[11px]" style={{ color: p.chipMuted }}>kg CO₂e</span>
              </div>
              <div className="text-[10px]" style={{ color: p.accent }}>vs. solo drive</div>
            </div>
          </div>

          <div
            className="absolute right-[12%] top-[10%] flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md"
            style={{
              background: p.chipBg,
              borderColor: p.chipBorder,
              color: p.chipText,
              animation: 'chip-float-c 6s ease-in-out infinite',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.accent }} />
            <span className="text-[10px] uppercase tracking-[0.2em]">Live · Gemini</span>
          </div>
        </>
      )}

      <style>{`
        @keyframes chip-float-a {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(4px, -6px); }
        }
        @keyframes chip-float-b {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-5px, 4px); }
        }
        @keyframes chip-float-c {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(3px, 3px); }
        }
      `}</style>
    </div>
  );
}
