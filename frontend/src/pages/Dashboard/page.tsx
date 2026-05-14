import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Flame,
  Leaf,
  MapPin,
  Star,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';

import { useAuth } from '@/lib/auth-provider';
import { useUserDoc } from '@/lib/user-doc-provider';
import { useBookingUserId } from '@/hooks/useBookingUserId';
import {
  getUserCarbonTrend,
  listUserBookings,
  type BookingRecord,
  type CarbonTrendDay,
} from '@/lib/api';
import { formatTodayInKL } from '@/lib/format-today-kl';
import { computeImpactLedger } from '@/lib/impact-ledger';
import { originFromSnapshot, destinationFromSnapshot } from '@/lib/booking-corridor';

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

function buildStats(
  greenPoints: number,
  totalTrips: number,
  totalCarbonSaved: number,
  totalEarned: number,
): Stat[] {
  return [
    {
      label: 'Total CO₂ saved',
      value: totalCarbonSaved > 0 ? (totalCarbonSaved / 1000).toFixed(1) : '0',
      unit: 'kg',
      delta: { value: '+0', direction: 'flat', note: 'all time' },
      icon: Leaf,
    },
    {
      label: 'Green points',
      value: greenPoints.toLocaleString('en-US'),
      delta: { value: `+${totalEarned}`, direction: 'up', note: 'total earned' },
      icon: Star,
    },
    {
      label: 'Global rank',
      value: '#—',
      delta: { value: '—', direction: 'flat', note: '' },
      icon: Trophy,
    },
    {
      label: 'Trips completed',
      value: String(totalTrips),
      unit: '',
      delta: { value: '+0', direction: 'flat', note: 'keep going' },
      icon: Flame,
    },
  ];
}

// placeholderTrendDays returns 7 zero-filled buckets ending today, in the
// browser's local timezone. Used as the loading/error fallback so the SVG
// path math has a stable, non-empty input even before the real data lands.
function placeholderTrendDays(): CarbonTrendDay[] {
  const out: CarbonTrendDay[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push({
      date: d.toISOString().slice(0, 10),
      dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }),
      kg: 0,
    });
  }
  return out;
}

function bookingToTrip(b: BookingRecord): Trip {
  const snap = b.routeSnapshot;
  const createdAt = new Date(b.createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  let whenPrefix: string;
  if (diffDays === 0) whenPrefix = 'Today';
  else if (diffDays === 1) whenPrefix = 'Yesterday';
  else {
    whenPrefix = createdAt.toLocaleDateString('en-US', { weekday: 'short' });
  }
  const timeStr = createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const when = `${whenPrefix} · ${timeStr}`;

  const from = originFromSnapshot(snap);
  const to = destinationFromSnapshot(snap);

  const modeMap: Record<string, Trip['mode']> = {
    fast: 'Transit',
    eco: 'Transit',
    cheap: 'Transit',
    transit: 'Transit',
    cycle: 'Cycle',
    carpool: 'Carpool',
    walk: 'Walk',
  };
  const mode = modeMap[snap.mode?.toLowerCase() ?? ''] ?? 'Transit';

  const carbonSavedGrams = snap.carbonSavedGrams ?? 0;
  const co2Saved = carbonSavedGrams > 0 ? (carbonSavedGrams / 1000).toFixed(2) : '0.00';
  const points = b.actualPoints > 0 ? b.actualPoints : b.estimatedPoints;

  return { when, from, to, mode, co2Saved, points };
}

type MobileTab = 'overview' | 'trends' | 'trips' | 'impact';

const mobileTabs: { id: MobileTab; num: string; label: string }[] = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'trends', num: '02', label: 'Trends' },
  { id: 'trips', num: '03', label: 'Trips' },
  { id: 'impact', num: '04', label: 'Impact' },
];

export default function DashboardPage() {
  const [tab, setTab] = useState<MobileTab>('overview');
  const { user } = useAuth();
  const { doc: userDoc } = useUserDoc();
  const userId = useBookingUserId();

  const firstName = (user?.displayName?.trim().split(/\s+/)[0]) ?? 'there';

  const greenPoints = userDoc?.greenPointsBalance ?? 0;
  const totalTrips = userDoc?.totalTripsCompleted ?? 0;
  const totalCarbonSaved = userDoc?.totalCarbonSaved ?? 0;
  const totalEarned = userDoc?.totalEarned ?? 0;

  const stats = buildStats(greenPoints, totalTrips, totalCarbonSaved, totalEarned);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState(false);

  const [trendDays, setTrendDays] = useState<CarbonTrendDay[]>(() => placeholderTrendDays());
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setTrips([]);
      setTripsLoading(false);
      setTripsError(false);
      return;
    }
    setTripsLoading(true);
    setTripsError(false);
    listUserBookings(userId, { limit: 3 })
      .then(({ bookings }) => {
        setTrips(bookings.map(bookingToTrip));
        setTripsLoading(false);
      })
      .catch(() => {
        setTrips([]);
        setTripsLoading(false);
        setTripsError(true);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTrendDays(placeholderTrendDays());
      setTrendLoading(false);
      setTrendError(false);
      return;
    }
    setTrendLoading(true);
    setTrendError(false);
    getUserCarbonTrend(userId)
      .then(({ days }) => {
        setTrendDays(days);
        setTrendLoading(false);
      })
      .catch(() => {
        setTrendDays(placeholderTrendDays());
        setTrendLoading(false);
        setTrendError(true);
      });
  }, [userId]);

  return (
    <div
      className="relative mx-auto w-full px-5 pb-20 pt-8 sm:px-6 sm:pt-10 lg:px-10"
      style={{ maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <header className="mb-8 flex flex-col items-start gap-5 sm:mb-10 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-6">
        <div>
          <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            {formatTodayInKL()}
          </p>
          <h1
            className="theme-display mt-2 text-[clamp(2rem,8vw,3.6rem)] leading-[0.95]"
            style={{ color: 'var(--theme-fg)' }}
          >
            Welcome back,{' '}
            <span
              className="theme-italic"
              style={{ color: 'var(--theme-accent)' }}
            >
              {firstName}.
            </span>
          </h1>
          <p
            className="mt-3 max-w-xl text-[0.92rem] leading-relaxed sm:text-[0.95rem]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            You're quietly outpacing 92% of commuters on the Johor–Singapore
            corridor. A slow week, but your streak is holding.
          </p>
        </div>

        <div className="theme-action-bar lg:w-auto">
          <Link to="/route" className="theme-btn-ghost hidden sm:inline-flex">
            <span className="theme-action-label">Planner</span>
          </Link>
          <Link to="/route" className="theme-btn-primary theme-action-bar-primary lg:w-auto">
            <span className="theme-action-label">
              <span className="sm:hidden">Plan</span>
              <span className="hidden sm:inline">Plan trip</span>
            </span>
            <ArrowUpRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </header>

      <div
        className="relative mb-6 -mx-5 overflow-x-auto border-y px-5 py-1 lg:hidden"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-1">
          {mobileTabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="relative inline-flex shrink-0 items-baseline gap-2 px-3 py-3 transition-colors"
                style={{
                  color: active ? 'var(--theme-fg)' : 'var(--theme-fg-dim)',
                }}
              >
                <span className="theme-mono-sm" style={{ opacity: 0.7 }}>
                  §{t.num}
                </span>
                <span className="text-[0.88rem]" style={{ letterSpacing: '-0.01em' }}>
                  {t.label}
                </span>
                {active ? (
                  <motion.span
                    layoutId="dash-tab-underline"
                    className="absolute inset-x-2 -bottom-[1px] h-[2px]"
                    style={{ background: 'var(--theme-accent)' }}
                    transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <section
        className={`${tab === 'overview' ? '' : 'hidden'} grid grid-cols-1 gap-4 sm:grid-cols-2 lg:!grid lg:grid-cols-4`}
      >
        {stats.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </section>

      <section
        className={`${tab === 'trends' ? '' : 'hidden'} mt-0 grid grid-cols-1 gap-5 lg:!grid lg:mt-8`}
      >
        <WeeklyTrendCard days={trendDays} loading={trendLoading} error={trendError} />
      </section>

      <section className="mt-0 grid grid-cols-1 gap-5 lg:mt-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`${tab === 'trips' ? '' : 'hidden'} lg:!block`}>
          <RecentTripsCard trips={trips} loading={tripsLoading} error={tripsError} />
        </div>
        <div className={`${tab === 'impact' ? '' : 'hidden'} lg:!block`}>
          <ImpactLedgerCard totalCarbonKg={totalCarbonSaved / 1000} />
        </div>
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
      className="theme-card p-5"
    >
      <div className="flex items-center justify-between">
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          {stat.label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{
            background: 'var(--theme-accent-soft)',
            color: 'var(--theme-accent)',
            border: '1px solid var(--theme-accent-muted)',
          }}
        >
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
        </span>
      </div>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="theme-number">{stat.value}</span>
        {stat.unit && (
          <span
            className="theme-italic text-[1rem]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            {stat.unit}
          </span>
        )}
      </div>

      <div
        className="mt-4 flex items-center gap-1.5 text-[0.78rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        <TrendingUp
          className="h-3 w-3"
          style={{ color: 'var(--theme-accent)' }}
          strokeWidth={2}
        />
        <span style={{ color: 'var(--theme-accent)' }}>{stat.delta.value}</span>
        <span>{stat.delta.note}</span>
      </div>
    </motion.div>
  );
}

function WeeklyTrendCard({
  days,
  loading,
  error,
}: {
  days: CarbonTrendDay[];
  loading: boolean;
  error: boolean;
}) {
  const W = 640;
  const H = 240;
  const padX = 28;
  const padTop = 24;
  const padBottom = 36;

  // Defensive: if a caller ever hands us an empty array, fall back to a
  // zero-filled placeholder so the SVG math (which divides by length-1)
  // does not produce NaN.
  const safeDays = days.length === 7 ? days : placeholderTrendDays();

  const max = Math.max(...safeDays.map((d) => d.kg));
  const min = 0;

  const points = useMemo(() => {
    return safeDays.map((d, i) => {
      const x = padX + (i / (safeDays.length - 1)) * (W - padX * 2);
      const y =
        padTop + (1 - (d.kg - min) / (max - min || 1)) * (H - padTop - padBottom);
      return { x, y, kg: d.kg, day: d.dayLabel };
    });
  }, [safeDays, max]);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${H - padBottom} L ${points[0].x
    } ${H - padBottom} Z`;

  const totalKg = safeDays.reduce((acc, d) => acc + d.kg, 0);
  const peak = safeDays.reduce(
    (best, d) => (d.kg > best.kg ? d : best),
    safeDays[0],
  );
  const avgKg = totalKg / safeDays.length;
  const weekLabel = (() => {
    const last = safeDays[safeDays.length - 1];
    if (!last) return '';
    const d = new Date(`${last.date}T00:00:00`);
    if (Number.isNaN(d.getTime())) return '';
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const diffDays = Math.floor((d.getTime() - yearStart.getTime()) / 86_400_000);
    const weekNum = Math.ceil((diffDays + yearStart.getDay() + 1) / 7);
    return `Week ${weekNum} · ${d.getFullYear()}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card p-6 md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Weekly carbon savings
          </p>
          <h3
            className="theme-display mt-2 text-[1.7rem] leading-tight"
            style={{ color: 'var(--theme-fg)' }}
          >
            A{' '}
            <span
              className="theme-italic"
              style={{ color: 'var(--theme-accent)' }}
            >
              quiet
            </span>{' '}
            week of {totalKg.toFixed(1)} kg saved.
          </h3>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <Legend dot color="var(--theme-accent)" label="CO₂ saved" />
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
              <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity="0" />
            </linearGradient>
            <pattern
              id="trendGrain"
              x="0"
              y="0"
              width="3"
              height="3"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.3" fill="var(--theme-fg-dim)" />
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
                stroke="var(--theme-border)"
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
            stroke="var(--theme-accent)"
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
                fill="var(--theme-bg)"
                stroke="var(--theme-accent)"
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
                fontFamily="var(--theme-font-mono)"
                fill="var(--theme-fg-muted)"
              >
                {p.kg.toFixed(1)}
              </text>
              <text
                x={p.x}
                y={H - 14}
                textAnchor="middle"
                fontSize="10"
                fontFamily="var(--theme-font-mono)"
                fill="var(--theme-fg-dim)"
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
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-fg-muted)',
        }}
      >
        {error ? (
          <span style={{ color: 'var(--theme-fg-muted)' }}>Trend unavailable</span>
        ) : (
          <>
            <span>
              Peak ·{' '}
              <span style={{ color: 'var(--theme-fg)' }}>
                {loading ? '—' : `${peak.dayLabel} ${peak.kg.toFixed(1)} kg`}
              </span>
            </span>
            <span>
              Avg ·{' '}
              <span style={{ color: 'var(--theme-fg)' }}>
                {loading ? '—' : `${avgKg.toFixed(1)} kg/day`}
              </span>
            </span>
          </>
        )}
        <span className="ml-auto theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          {weekLabel}
        </span>
      </div>
    </motion.div>
  );
}

function RecentTripsCard({ trips, loading, error }: { trips: Trip[]; loading: boolean; error: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.44, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Recent journeys
          </p>
          <h3
            className="theme-display mt-2 text-[1.5rem]"
            style={{ color: 'var(--theme-fg)' }}
          >
            Your last three{' '}
            <span
              className="theme-italic"
              style={{ color: 'var(--theme-accent)' }}
            >
              moves.
            </span>
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 flex items-center justify-center py-8">
          <div
            className="h-5 w-5 animate-spin rounded-full"
            style={{ border: '2px solid var(--theme-border-strong)', borderTopColor: 'var(--theme-accent)' }}
          />
        </div>
      ) : error ? (
        <p
          className="mt-5 py-8 text-center text-[0.9rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Couldn't load recent trips
        </p>
      ) : trips.length === 0 ? (
        <p
          className="mt-5 py-8 text-center text-[0.9rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          No trips yet — plan one
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {trips.map((trip, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.08 }}
              className="group flex items-center gap-4 rounded-[14px] border p-4 transition-colors duration-300 hover:border-[var(--theme-accent-muted)]"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'var(--theme-surface-muted)',
              }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: 'var(--theme-accent-soft)',
                  color: 'var(--theme-accent)',
                  border: '1px solid var(--theme-accent-muted)',
                }}
              >
                <MapPin className="h-[15px] w-[15px]" strokeWidth={1.8} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="theme-mono-sm"
                    style={{ color: 'var(--theme-fg-dim)' }}
                  >
                    {trip.when}
                  </span>
                  <span
                    className="theme-mono-sm rounded-full border px-1.5 py-0.5"
                    style={{
                      borderColor: 'var(--theme-border)',
                      color: 'var(--theme-fg-muted)',
                      fontSize: '0.52rem',
                    }}
                  >
                    {trip.mode}
                  </span>
                </div>
                <p
                  className="mt-1 truncate text-[0.95rem]"
                  style={{ color: 'var(--theme-fg)' }}
                >
                  {trip.from}{' '}
                  <span
                    className="theme-italic mx-1"
                    style={{ color: 'var(--theme-fg-dim)' }}
                  >
                    to
                  </span>{' '}
                  {trip.to}
                </p>
              </div>

              <div className="text-right">
                <p
                  className="text-[0.92rem]"
                  style={{ color: 'var(--theme-accent)' }}
                >
                  {trip.co2Saved} kg
                </p>
                <p
                  className="theme-mono-sm"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  +{trip.points} pts
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

function currentMonthYearKL(): string {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
}

function ImpactLedgerCard({ totalCarbonKg }: { totalCarbonKg: number }) {
  const { treesEquivalent, fuelAvoidedLitres, costSavedRM } = computeImpactLedger(totalCarbonKg);

  const rows = [
    { label: 'Trees equivalent', value: treesEquivalent.toFixed(1), unit: 'saplings / year' },
    { label: 'Fuel avoided', value: fuelAvoidedLitres.toFixed(0), unit: 'litres' },
    { label: 'Cost saved', value: `RM ${costSavedRM.toFixed(0)}`, unit: 'est.' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-panel"
    >
      <div className="flex items-center justify-between">
        <p
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          Impact ledger
        </p>
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          {currentMonthYearKL()}
        </span>
      </div>

      <h3
        className="theme-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        The{' '}
        <span
          className="theme-italic"
          style={{ color: 'var(--theme-accent)' }}
        >
          small
        </span>{' '}
        arithmetic of a greener commute.
      </h3>

      <ul className="mt-5 divide-y" style={{ borderColor: 'var(--theme-border)' }}>
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-baseline justify-between gap-4 py-3.5"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span
              className="text-[0.9rem]"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              {row.label}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span
                className="theme-display text-[1.3rem]"
                style={{ color: 'var(--theme-fg)' }}
              >
                {row.value}
              </span>
              <span
                className="theme-mono-sm"
                style={{ color: 'var(--theme-fg-dim)' }}
              >
                {row.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-center justify-end">
        <Link to="/route" className="theme-link-underline text-[0.82rem]">
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
      style={{ color: 'var(--theme-fg-muted)' }}
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
