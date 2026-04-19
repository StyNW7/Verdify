import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Flame,
  Leaf,
  MapPin,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';

type Stat = {
  label: string;
  value: string;
  unit?: string;
  delta: { value: string; direction: 'up' | 'down' | 'flat'; note: string };
  icon: LucideIcon;
};

type Trip = {
  when: string;
  from: string;
  to: string;
  mode: 'Transit' | 'Cycle' | 'Carpool' | 'Walk';
  co2Saved: string;
  points: number;
};

const USER_FIRST_NAME = 'Sarah';

const stats: Stat[] = [
  {
    label: 'Total CO₂ saved',
    value: '125.4',
    unit: 'kg',
    delta: { value: '+12.3', direction: 'up', note: 'vs last month' },
    icon: Leaf,
  },
  {
    label: 'Green points',
    value: '2,450',
    delta: { value: '+180', direction: 'up', note: 'this week' },
    icon: Star,
  },
  {
    label: 'Global rank',
    value: '#42',
    delta: { value: '+3', direction: 'up', note: 'climbed' },
    icon: Trophy,
  },
  {
    label: 'Streak',
    value: '14',
    unit: 'days',
    delta: { value: '+1', direction: 'up', note: 'keep going' },
    icon: Flame,
  },
];

const weeklyTrend: { day: string; kg: number }[] = [
  { day: 'Mon', kg: 3.2 },
  { day: 'Tue', kg: 5.8 },
  { day: 'Wed', kg: 4.1 },
  { day: 'Thu', kg: 6.9 },
  { day: 'Fri', kg: 8.4 },
  { day: 'Sat', kg: 2.1 },
  { day: 'Sun', kg: 3.7 },
];

const recentTrips: Trip[] = [
  {
    when: 'Today · 08:04',
    from: 'Bukit Indah',
    to: 'CIQ Johor',
    mode: 'Transit',
    co2Saved: '1.24',
    points: 80,
  },
  {
    when: 'Yesterday · 17:40',
    from: 'Home',
    to: 'Office Tower',
    mode: 'Carpool',
    co2Saved: '0.82',
    points: 50,
  },
  {
    when: 'Mon · 07:55',
    from: 'Taman Molek',
    to: 'Plaza Pelangi',
    mode: 'Cycle',
    co2Saved: '1.60',
    points: 120,
  },
];

export default function DashboardPage() {
  return (
    <div className="relative mx-auto w-full max-w-[1280px] px-6 pb-20 pt-10 lg:px-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            Wednesday · 19 April
          </p>
          <h1
            className="landing-display mt-2 text-[clamp(2.4rem,5.2vw,3.6rem)] leading-[0.95]"
            style={{ color: 'var(--landing-text)' }}
          >
            Welcome back,{' '}
            <span
              className="landing-italic"
              style={{ color: 'var(--landing-accent)' }}
            >
              {USER_FIRST_NAME}.
            </span>
          </h1>
          <p
            className="mt-3 max-w-xl text-[0.95rem] leading-relaxed"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            You're quietly outpacing 92% of commuters on the Johor–Singapore
            corridor. A slow week, but your streak is holding.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/route" className="landing-btn-ghost">
            View route planner
          </Link>
          <Link to="/route" className="landing-btn-primary">
            Plan a trip
            <ArrowUpRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr]">
        <WeeklyTrendCard />
        <AIRecommendationCard />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <RecentTripsCard trips={recentTrips} />
        <ImpactLedgerCard />
      </section>
    </div>
  );
}

function StatCard({ stat, index }: { stat: Stat; index: number }) {
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-card p-5"
    >
      <div className="flex items-center justify-between">
        <span
          className="landing-mono-sm"
          style={{ color: 'var(--landing-text-dim)' }}
        >
          {stat.label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{
            background: 'var(--landing-accent-soft)',
            color: 'var(--landing-accent)',
            border: '1px solid var(--landing-accent-muted)',
          }}
        >
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="landing-number">{stat.value}</span>
        {stat.unit && (
          <span
            className="landing-italic text-[1rem]"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            {stat.unit}
          </span>
        )}
      </div>

      <div
        className="mt-4 flex items-center gap-1.5 text-[0.78rem]"
        style={{ color: 'var(--landing-text-muted)' }}
      >
        <TrendingUp
          className="h-3 w-3"
          style={{ color: 'var(--landing-accent)' }}
          strokeWidth={2}
        />
        <span style={{ color: 'var(--landing-accent)' }}>{stat.delta.value}</span>
        <span>{stat.delta.note}</span>
      </div>
    </motion.div>
  );
}

function WeeklyTrendCard() {
  const W = 640;
  const H = 240;
  const padX = 28;
  const padTop = 24;
  const padBottom = 36;

  const max = Math.max(...weeklyTrend.map((d) => d.kg));
  const min = 0;

  const points = useMemo(() => {
    return weeklyTrend.map((d, i) => {
      const x = padX + (i / (weeklyTrend.length - 1)) * (W - padX * 2);
      const y =
        padTop + (1 - (d.kg - min) / (max - min || 1)) * (H - padTop - padBottom);
      return { x, y, kg: d.kg, day: d.day };
    });
  }, [max]);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - padBottom} L ${
    points[0].x
  } ${H - padBottom} Z`;

  const totalKg = weeklyTrend.reduce((acc, d) => acc + d.kg, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-card p-6 md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="landing-mono-sm"
            style={{ color: 'var(--landing-text-dim)' }}
          >
            Weekly carbon savings
          </p>
          <h3
            className="landing-display mt-2 text-[1.7rem] leading-tight"
            style={{ color: 'var(--landing-text)' }}
          >
            A{' '}
            <span
              className="landing-italic"
              style={{ color: 'var(--landing-accent)' }}
            >
              quiet
            </span>{' '}
            week of {totalKg.toFixed(1)} kg saved.
          </h3>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <Legend dot color="var(--landing-accent)" label="CO₂ saved" />
        </div>
      </div>

      <div className="mt-6 -mx-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Weekly carbon savings trend"
          className="block w-full"
          style={{ minWidth: 520 }}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--landing-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--landing-accent)" stopOpacity="0" />
            </linearGradient>
            <pattern
              id="trendGrain"
              x="0"
              y="0"
              width="3"
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.3" fill="var(--landing-text-dim)" />
            </pattern>
          </defs>

          {[0.25, 0.5, 0.75].map((t) => {
            const y = padTop + t * (H - padTop - padBottom);
            return (
              <line
                key={t}
                x1={padX}
                x2={W - padX}
                y1={y}
                y2={y}
                stroke="var(--landing-border)"
                strokeDasharray="2 6"
              />
            );
          })}

          <motion.path
            d={areaPath}
            fill="url(#trendFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.55 }}
          />

          <motion.path
            d={linePath}
            fill="none"
            stroke="var(--landing-accent)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          />

          {points.map((p, i) => (
            <g key={i}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={3}
                fill="var(--landing-bg)"
                stroke="var(--landing-accent)"
                strokeWidth="1.5"
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + i * 0.06 }}
              />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--landing-font-mono)"
                fill="var(--landing-text-muted)"
              >
                {p.kg.toFixed(1)}
              </text>
              <text
                x={p.x}
                y={H - 14}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--landing-font-mono)"
                fill="var(--landing-text-dim)"
                letterSpacing="2"
              >
                {p.day.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div
        className="mt-4 flex flex-wrap items-center gap-6 border-t pt-4 text-[0.78rem]"
        style={{
          borderColor: 'var(--landing-border)',
          color: 'var(--landing-text-muted)',
        }}
      >
        <span>
          Peak · <span style={{ color: 'var(--landing-text)' }}>Fri 8.4 kg</span>
        </span>
        <span>
          Avg ·{' '}
          <span style={{ color: 'var(--landing-text)' }}>
            {(totalKg / weeklyTrend.length).toFixed(1)} kg/day
          </span>
        </span>
        <span className="ml-auto landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          Week 16 · 2026
        </span>
      </div>
    </motion.div>
  );
}

function AIRecommendationCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.36, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-card relative overflow-hidden p-6 md:p-7"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, var(--landing-accent-soft), transparent 70%)',
        }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-[7px]"
            style={{
              background: 'var(--landing-accent)',
              color: 'var(--landing-button-foreground)',
            }}
          >
            <Sparkles className="h-[12px] w-[12px]" strokeWidth={2} />
          </span>
          <span
            className="landing-mono-sm"
            style={{ color: 'var(--landing-text-dim)' }}
          >
            AI recommendation
          </span>
        </div>
        <span
          className="landing-mono-sm rounded-full border px-2 py-1"
          style={{
            borderColor: 'var(--landing-border)',
            color: 'var(--landing-text-dim)',
            fontSize: '0.56rem',
          }}
        >
          Preview
        </span>
      </div>

      <blockquote
        className="landing-display relative mt-5 text-[1.35rem] leading-[1.25]"
        style={{ color: 'var(--landing-text)' }}
      >
        <span
          className="landing-italic absolute -left-3 -top-2 text-[2.5rem]"
          style={{ color: 'var(--landing-accent-muted)' }}
          aria-hidden
        >
          “
        </span>
        Leave at{' '}
        <span
          className="landing-italic"
          style={{ color: 'var(--landing-accent)' }}
        >
          08:32
        </span>{' '}
        tomorrow to slip past the causeway crush — save{' '}
        <span style={{ color: 'var(--landing-accent)' }}>18 min</span> and earn{' '}
        <span style={{ color: 'var(--landing-accent)' }}>2× points</span>.
      </blockquote>

      <div
        className="mt-6 flex items-center justify-between border-t pt-4 text-[0.78rem]"
        style={{
          borderColor: 'var(--landing-border)',
          color: 'var(--landing-text-muted)',
        }}
      >
        <span>Based on your last 14 days of patterns</span>
        <button
          type="button"
          disabled
          className="landing-link-underline opacity-60"
          title="LLM integration coming soon"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Ask Verdify AI
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </motion.div>
  );
}

function RecentTripsCard({ trips }: { trips: Trip[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.44, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-card p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="landing-mono-sm"
            style={{ color: 'var(--landing-text-dim)' }}
          >
            Recent journeys
          </p>
          <h3
            className="landing-display mt-2 text-[1.5rem]"
            style={{ color: 'var(--landing-text)' }}
          >
            Your last three{' '}
            <span
              className="landing-italic"
              style={{ color: 'var(--landing-accent)' }}
            >
              moves.
            </span>
          </h3>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {trips.map((trip, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
            className="group flex items-center gap-4 rounded-[14px] border p-4 transition-colors duration-300 hover:border-[var(--landing-accent-muted)]"
            style={{
              borderColor: 'var(--landing-border)',
              background: 'var(--landing-surface-alt)',
            }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'var(--landing-accent-soft)',
                color: 'var(--landing-accent)',
                border: '1px solid var(--landing-accent-muted)',
              }}
            >
              <MapPin className="h-[15px] w-[15px]" strokeWidth={1.8} />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="landing-mono-sm"
                  style={{ color: 'var(--landing-text-dim)' }}
                >
                  {trip.when}
                </span>
                <span
                  className="landing-mono-sm rounded-full border px-1.5 py-0.5"
                  style={{
                    borderColor: 'var(--landing-border)',
                    color: 'var(--landing-text-muted)',
                    fontSize: '0.52rem',
                  }}
                >
                  {trip.mode}
                </span>
              </div>
              <p
                className="mt-1 truncate text-[0.95rem]"
                style={{ color: 'var(--landing-text)' }}
              >
                {trip.from}{' '}
                <span
                  className="landing-italic mx-1"
                  style={{ color: 'var(--landing-text-dim)' }}
                >
                  to
                </span>{' '}
                {trip.to}
              </p>
            </div>

            <div className="text-right">
              <p
                className="text-[0.92rem]"
                style={{ color: 'var(--landing-accent)' }}
              >
                {trip.co2Saved} kg
              </p>
              <p
                className="landing-mono-sm"
                style={{ color: 'var(--landing-text-dim)' }}
              >
                +{trip.points} pts
              </p>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

function ImpactLedgerCard() {
  const rows = [
    { label: 'Trees equivalent', value: '6.2', unit: 'saplings / year' },
    { label: 'Fuel avoided', value: '54', unit: 'litres' },
    { label: 'Cost saved', value: 'RM 312', unit: 'est.' },
    { label: 'Next tier', value: '550', unit: 'pts to Forest' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-panel"
    >
      <div className="flex items-center justify-between">
        <p
          className="landing-mono-sm"
          style={{ color: 'var(--landing-text-dim)' }}
        >
          Impact ledger
        </p>
        <span
          className="landing-mono-sm"
          style={{ color: 'var(--landing-text-dim)' }}
        >
          Apr 2026
        </span>
      </div>

      <h3
        className="landing-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--landing-text)' }}
      >
        The{' '}
        <span
          className="landing-italic"
          style={{ color: 'var(--landing-accent)' }}
        >
          small
        </span>{' '}
        arithmetic of a greener commute.
      </h3>

      <ul className="mt-5 divide-y" style={{ borderColor: 'var(--landing-border)' }}>
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-3.5"
            style={{ borderColor: 'var(--landing-border)' }}
          >
            <span
              className="text-[0.9rem]"
              style={{ color: 'var(--landing-text-muted)' }}
            >
              {row.label}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span
                className="landing-display text-[1.3rem]"
                style={{ color: 'var(--landing-text)' }}
              >
                {row.value}
              </span>
              <span
                className="landing-mono-sm"
                style={{ color: 'var(--landing-text-dim)' }}
              >
                {row.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-between">
        <span
          className="text-[0.78rem]"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Next badge · Forest Guardian
        </span>
        <Link to="/route" className="landing-link-underline text-[0.82rem]">
          Earn points
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </Link>
      </div>
    </motion.div>
  );
}

function Legend({
  label,
  color,
  dot,
}: {
  label: string;
  color: string;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.75rem]"
      style={{ color: 'var(--landing-text-muted)' }}
    >
      {dot ? (
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      ) : null}
      {label}
    </span>
  );
}
