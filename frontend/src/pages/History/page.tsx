import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Bike,
  Bus,
  Car,
  CircleDot,
  Clock,
  Filter,
  Flag,
  Footprints,
  Leaf,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  Train,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

type Mode = 'bike' | 'walk' | 'transit' | 'train' | 'carpool' | 'ev';

type Trip = {
  id: string;
  date: string;
  durationMin: number;
  origin: string;
  destination: string;
  mode: Mode;
  distanceKm: number;
  co2SavedKg: number;
  points: number;
  note?: string;
  waypoints?: string[];
};

const TRIPS: Trip[] = [
  { id: 't-001', date: '2026-04-22T07:42:00', durationMin: 24, origin: 'Bangsar South', destination: 'KLCC Tower',
    mode: 'bike', distanceKm: 6.8, co2SavedKg: 1.42, points: 184, note: 'Morning commute via the park loop.',
    waypoints: ['Kerinchi LRT', 'Midvalley Underpass', 'KL Eco City', 'Persiaran Hampshire'] },
  { id: 't-002', date: '2026-04-21T18:05:00', durationMin: 36, origin: 'KLCC Tower', destination: 'Bangsar South',
    mode: 'transit', distanceKm: 7.1, co2SavedKg: 1.12, points: 140, waypoints: ['KLCC → Masjid Jamek', 'Transfer at Pasar Seni', 'Kerinchi LRT'] },
  { id: 't-003', date: '2026-04-21T08:14:00', durationMin: 21, origin: 'Bangsar South', destination: 'KL Sentral',
    mode: 'train', distanceKm: 3.4, co2SavedKg: 0.52, points: 72, waypoints: ['Platform 4', 'KTM Komuter northbound'] },
  { id: 't-004', date: '2026-04-20T12:40:00', durationMin: 14, origin: 'Pavilion KL', destination: 'Bukit Bintang',
    mode: 'walk', distanceKm: 1.2, co2SavedKg: 0.28, points: 42, note: 'Lunch stroll with Daniyal.' },
  { id: 't-005', date: '2026-04-19T09:02:00', durationMin: 48, origin: 'TTDI', destination: 'Sunway Pyramid',
    mode: 'carpool', distanceKm: 18.4, co2SavedKg: 2.80, points: 210, note: 'Shared with 3 riders.' },
  { id: 't-006', date: '2026-04-17T07:58:00', durationMin: 27, origin: 'Mont Kiara', destination: 'Menara Maxis',
    mode: 'ev', distanceKm: 9.2, co2SavedKg: 1.88, points: 154 },
  { id: 't-007', date: '2026-04-14T17:22:00', durationMin: 32, origin: 'Cheras', destination: 'Bangsar',
    mode: 'bike', distanceKm: 11.4, co2SavedKg: 2.24, points: 242, note: 'Golden-hour ride. Tail-wind.' },
  { id: 't-008', date: '2026-04-11T08:30:00', durationMin: 19, origin: 'Subang Jaya', destination: 'KL Sentral',
    mode: 'train', distanceKm: 14.8, co2SavedKg: 2.05, points: 190 },
  { id: 't-009', date: '2026-03-28T11:10:00', durationMin: 52, origin: 'Shah Alam', destination: 'Damansara',
    mode: 'carpool', distanceKm: 24.6, co2SavedKg: 3.40, points: 260 },
  { id: 't-010', date: '2026-03-18T15:45:00', durationMin: 11, origin: 'Office', destination: 'Coffee Shop',
    mode: 'walk', distanceKm: 0.9, co2SavedKg: 0.22, points: 28 },
  { id: 't-011', date: '2026-02-09T09:12:00', durationMin: 38, origin: 'Petaling Jaya', destination: 'Cyberjaya',
    mode: 'transit', distanceKm: 22.4, co2SavedKg: 3.15, points: 295 },
];

const MODE_META: Record<
  Mode,
  { label: string; icon: typeof Bike; tone: 'green' | 'warm' | 'ink' }
> = {
  bike:    { label: 'Bike',      icon: Bike,       tone: 'green' },
  walk:    { label: 'Walk',      icon: Footprints, tone: 'green' },
  transit: { label: 'Bus',       icon: Bus,        tone: 'ink'   },
  train:   { label: 'Rail',      icon: Train,      tone: 'ink'   },
  carpool: { label: 'Carpool',   icon: Car,        tone: 'warm'  },
  ev:      { label: 'EV',        icon: Zap,        tone: 'warm'  },
};

type TimeKey = 'all' | 'week' | 'month' | 'quarter';
const TIME_OPTIONS: { key: TimeKey; label: string }[] = [
  { key: 'week',    label: 'This week' },
  { key: 'month',   label: 'This month' },
  { key: 'quarter', label: 'Last 90 days' },
  { key: 'all',     label: 'All time' },
];

const ALL_MODES: Mode[] = ['bike', 'walk', 'transit', 'train', 'carpool', 'ev'];

const NOW = new Date('2026-04-22T23:59:00');

const fmt = (n: number) => n.toLocaleString('en-US');
const kg  = (n: number) => `${n.toFixed(2)} kg`;
const km  = (n: number) => `${n.toFixed(1)} km`;

function withinTime(dateStr: string, key: TimeKey) {
  if (key === 'all') return true;
  const d = new Date(dateStr).getTime();
  const now = NOW.getTime();
  const days = key === 'week' ? 7 : key === 'month' ? 31 : 90;
  return now - d <= days * 86_400_000;
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-GB', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function toneColor(t: 'green' | 'warm' | 'ink') {
  return t === 'green' ? 'var(--theme-accent)'
    : t === 'warm'   ? 'var(--theme-accent-warm)'
    : 'var(--theme-fg)';
}

export default function HistoryPage() {
  const [timeKey, setTimeKey] = useState<TimeKey>('month');
  const [modes, setModes] = useState<Set<Mode>>(new Set(ALL_MODES));
  const [active, setActive] = useState<Trip | null>(null);

  const trips = useMemo(() => {
    return TRIPS
      .filter((t) => withinTime(t.date, timeKey))
      .filter((t) => modes.has(t.mode))
      .sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [timeKey, modes]);

  const totals = useMemo(() => {
    const co2 = trips.reduce((s, t) => s + t.co2SavedKg, 0);
    const pts = trips.reduce((s, t) => s + t.points, 0);
    const dist = trips.reduce((s, t) => s + t.distanceKm, 0);
    return { co2, pts, dist, count: trips.length };
  }, [trips]);

  const toggleMode = (m: Mode) => {
    setModes((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      if (next.size === 0) return new Set(ALL_MODES);
      return next;
    });
  };

  return (
    <section className="relative w-full px-6 py-10 lg:px-12 lg:py-14">
      <div className="mx-auto flex max-w-[min(1280px,calc(100vw-var(--sidebar-w,0px)-5rem))] flex-col gap-8">
        <Header totals={totals} />
        <Filters
          timeKey={timeKey}
          onTime={setTimeKey}
          modes={modes}
          onToggleMode={toggleMode}
        />

        <LedgerView trips={trips} onOpen={setActive} />

        {trips.length === 0 && <EmptyState />}
      </div>

      <TripDialog trip={active} onClose={() => setActive(null)} />
    </section>
  );
}

function Header({ totals }: { totals: { co2: number; pts: number; dist: number; count: number } }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="theme-accent-dot" aria-hidden />
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.24em' }}
        >
          HISTORY / YOUR LEDGER
        </span>
      </div>

      <div className="max-w-2xl">
        <h1
          className="theme-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.02] tracking-[-0.035em]"
          style={{ color: 'var(--theme-fg)' }}
        >
          Every trip you{' '}
          <em
            style={{
              fontFamily: 'var(--theme-font-italic)',
              fontStyle: 'italic',
              color: 'var(--theme-accent)',
            }}
          >
            didn't drive alone.
          </em>
        </h1>
        <p className="mt-3 max-w-xl text-[0.98rem]" style={{ color: 'var(--theme-fg-muted)' }}>
          A running archive of your lower-carbon commutes — filter by time or
          transport, open any trip to see the full route.
        </p>
      </div>

      <SummaryStrip totals={totals} />
    </div>
  );
}

function SummaryStrip({ totals }: { totals: { co2: number; pts: number; dist: number; count: number } }) {
  const items = [
    { label: 'TRIPS LOGGED', value: fmt(totals.count), tail: 'entries', icon: Route },
    { label: 'CO₂ SAVED',     value: totals.co2.toFixed(2), tail: 'kg', icon: Leaf },
    { label: 'DISTANCE',      value: totals.dist.toFixed(1), tail: 'km', icon: Navigation },
    { label: 'POINTS EARNED', value: fmt(totals.pts), tail: 'pts', icon: Sparkles },
  ];
  return (
    <div
      className="grid grid-cols-2 gap-0 overflow-hidden rounded-[18px] border md:grid-cols-4"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="flex flex-col gap-2 px-5 py-4"
            style={{
              borderLeft: i === 0 ? 'none' : '1px solid var(--theme-border)',
            }}
          >
            <span
              className="theme-mono-sm inline-flex items-center gap-2"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {it.label}
            </span>
            <span
              className="theme-number text-[1.9rem] leading-none tracking-[-0.03em]"
              style={{ fontWeight: 500 }}
            >
              {it.value}
              <span
                className="ml-1.5 text-[0.72rem] uppercase tracking-[0.18em]"
                style={{ color: 'var(--theme-fg-dim)', fontFamily: 'var(--theme-font-mono)' }}
              >
                {it.tail}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Filters({
  timeKey,
  onTime,
  modes,
  onToggleMode,
}: {
  timeKey: TimeKey;
  onTime: (k: TimeKey) => void;
  modes: Set<Mode>;
  onToggleMode: (m: Mode) => void;
}) {
  return (
    <div
      className="flex flex-col gap-5 rounded-[20px] border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <div className="flex flex-col gap-2">
        <span
          className="theme-mono-sm inline-flex items-center gap-2"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
        >
          <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
          WINDOW
        </span>
        <div className="flex flex-wrap gap-2">
          {TIME_OPTIONS.map((o) => {
            const active = timeKey === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => onTime(o.key)}
                className="rounded-full border px-3 py-1.5 text-[0.8rem] transition-all"
                style={{
                  borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                  background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                  color: active ? 'var(--theme-accent)' : 'var(--theme-fg-muted)',
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="hidden h-12 w-px sm:block"
        style={{ background: 'var(--theme-border)' }}
      />

      <div className="flex flex-col gap-2">
        <span
          className="theme-mono-sm inline-flex items-center gap-2"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
        >
          <Filter className="h-3.5 w-3.5" strokeWidth={1.8} />
          TRANSPORT
        </span>
        <div className="flex flex-wrap gap-2">
          {ALL_MODES.map((m) => {
            const meta = MODE_META[m];
            const Icon = meta.icon;
            const active = modes.has(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => onToggleMode(m)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] transition-all"
                style={{
                  borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                  background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                  color: active ? 'var(--theme-accent)' : 'var(--theme-fg-muted)',
                  opacity: active ? 1 : 0.65,
                }}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LedgerView({ trips, onOpen }: { trips: Trip[]; onOpen: (t: Trip) => void }) {
  return (
    <div
      className="theme-card relative overflow-hidden rounded-[24px]"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        className="grid grid-cols-[96px_72px_1fr_120px_120px_72px] items-center gap-4 border-b px-6 py-3"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        {['DATE', 'TIME', 'ROUTE', 'CO₂ SAVED', 'POINTS', ''].map((h, i) => (
          <span
            key={i}
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
          >
            {h}
          </span>
        ))}
      </div>
      <ul>
        {trips.map((t, i) => {
          const meta = MODE_META[t.mode];
          const Icon = meta.icon;
          return (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.03 * i, duration: 0.35 }}
              className="group relative grid cursor-pointer grid-cols-[96px_72px_1fr_120px_120px_72px] items-center gap-4 border-b px-6 py-4 last:border-b-0 transition-colors hover:bg-[var(--theme-surface-muted)]"
              style={{ borderColor: 'var(--theme-border)' }}
              onClick={() => onOpen(t)}
            >
              <span
                className="absolute left-0 top-0 h-full w-[2px] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ background: toneColor(meta.tone) }}
              />
              <div className="flex flex-col">
                <span
                  className="text-[0.92rem]"
                  style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
                >
                  {new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                </span>
                <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                  {new Date(t.date).getFullYear()}
                </span>
              </div>
              <span className="theme-mono-sm" style={{ color: 'var(--theme-fg)' }}>
                {formatTime(t.date)}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: 'var(--theme-border-strong)',
                    background: 'var(--theme-surface-muted)',
                    color: toneColor(meta.tone),
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-[0.95rem]"
                    style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
                  >
                    {t.origin}{' '}
                    <span
                      className="italic"
                      style={{
                        fontFamily: 'var(--theme-font-italic)',
                        color: 'var(--theme-fg-dim)',
                      }}
                    >
                      to
                    </span>{' '}
                    {t.destination}
                  </p>
                  <p className="theme-mono-sm truncate" style={{ color: 'var(--theme-fg-dim)' }}>
                    {meta.label.toUpperCase()} · {km(t.distanceKm)} · {t.durationMin} MIN
                  </p>
                </div>
              </div>
              <span
                className="text-right text-[1.02rem] tabular-nums"
                style={{
                  fontFamily: 'var(--theme-font-display)',
                  color: 'var(--theme-accent)',
                  fontWeight: 500,
                }}
              >
                −{kg(t.co2SavedKg)}
              </span>
              <span
                className="text-right text-[1.02rem] tabular-nums"
                style={{
                  fontFamily: 'var(--theme-font-display)',
                  color: 'var(--theme-fg)',
                  fontWeight: 500,
                }}
              >
                +{fmt(t.points)}
              </span>
              <span
                className="justify-self-end text-[0.75rem] italic opacity-0 transition-opacity group-hover:opacity-100"
                style={{
                  fontFamily: 'var(--theme-font-italic)',
                  color: 'var(--theme-accent)',
                }}
              >
                open →
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="theme-card flex flex-col items-center justify-center rounded-[24px] px-6 py-16 text-center"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <span
        className="theme-mono-sm"
        style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.24em' }}
      >
        NOTHING IN WINDOW
      </span>
      <p
        className="mt-3 italic text-[1.6rem]"
        style={{
          fontFamily: 'var(--theme-font-italic)',
          color: 'var(--theme-fg)',
        }}
      >
        No trips match these filters.
      </p>
      <p className="mt-1 text-[0.92rem]" style={{ color: 'var(--theme-fg-muted)' }}>
        Widen the window or turn a few transport chips back on.
      </p>
    </div>
  );
}

function TripDialog({ trip, onClose }: { trip: Trip | null; onClose: () => void }) {
  const open = !!trip;
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <AnimatePresence>
        {open && trip && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-[90]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: 'color-mix(in srgb, var(--theme-bg) 60%, rgba(0,0,0,0.55))',
                  backdropFilter: 'blur(6px)',
                }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  className="w-[min(720px,92vw)] max-h-[92vh] overflow-auto"
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TripDetailCard trip={trip} onClose={onClose} />
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function TripDetailCard({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const meta = MODE_META[trip.mode];
  const Icon = meta.icon;
  const tone = toneColor(meta.tone);

  const avgSpeed = trip.distanceKm > 0 ? (trip.distanceKm / (trip.durationMin / 60)).toFixed(1) : '0';

  return (
    <div
      className="relative overflow-hidden rounded-[26px] border"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-bg-soft)',
        boxShadow: '0 40px 100px -40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full"
        style={{ background: `radial-gradient(closest-side, ${tone}33, transparent 70%)`, filter: 'blur(10px)' }}
      />

      <div className="relative flex items-start justify-between gap-6 border-b px-7 py-6" style={{ borderColor: 'var(--theme-border)' }}>
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'var(--theme-surface)', color: tone, border: '1px solid var(--theme-border-strong)' }}
            >
              <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
            </span>
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.22em' }}
            >
              TRIP · {trip.id.toUpperCase()}
            </span>
          </div>
          <h2
            className="mt-3 text-[1.85rem] leading-[1.05] tracking-[-0.025em]"
            style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
          >
            {trip.origin}{' '}
            <em
              style={{
                fontFamily: 'var(--theme-font-italic)',
                fontStyle: 'italic',
                color: 'var(--theme-fg-dim)',
              }}
            >
              to
            </em>{' '}
            {trip.destination}
          </h2>
          <p className="mt-1 text-[0.88rem]" style={{ color: 'var(--theme-fg-muted)' }}>
            {formatDate(trip.date, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {formatTime(trip.date)}
          </p>
        </div>

        <Dialog.Close asChild>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-[var(--theme-surface-muted)]"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-fg-muted)' }}
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </Dialog.Close>
      </div>

      <div className="relative grid grid-cols-2 gap-0 border-b md:grid-cols-4" style={{ borderColor: 'var(--theme-border)' }}>
        {[
          { label: 'CO₂ SAVED',  value: `−${trip.co2SavedKg.toFixed(2)}`, tail: 'KG', accent: tone },
          { label: 'POINTS',     value: `+${fmt(trip.points)}`,            tail: 'PTS' },
          { label: 'DISTANCE',   value: trip.distanceKm.toFixed(1),        tail: 'KM' },
          { label: 'AVG SPEED',  value: avgSpeed,                          tail: 'KM/H' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="px-5 py-4"
            style={{ borderLeft: i === 0 ? 'none' : '1px solid var(--theme-border)' }}
          >
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.18em' }}
            >
              {s.label}
            </span>
            <p
              className="theme-number mt-1 text-[1.55rem] leading-none tracking-[-0.03em]"
              style={{ fontWeight: 500, color: s.accent ?? 'var(--theme-fg)' }}
            >
              {s.value}
              <span
                className="ml-1 text-[0.7rem]"
                style={{ fontFamily: 'var(--theme-font-mono)', color: 'var(--theme-fg-dim)' }}
              >
                {s.tail}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="relative grid grid-cols-1 gap-6 px-7 py-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <span
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
          >
            ROUTE
          </span>
          <ol className="mt-3 flex flex-col">
            <RouteNode icon={<CircleDot className="h-3.5 w-3.5" strokeWidth={2} />} label="Origin" value={trip.origin} tone="var(--theme-accent)" />
            {(trip.waypoints ?? []).map((w, i) => (
              <RouteNode key={i} icon={<MapPin className="h-3.5 w-3.5" strokeWidth={2} />} label={`Waypoint ${String(i + 1).padStart(2, '0')}`} value={w} />
            ))}
            <RouteNode icon={<Flag className="h-3.5 w-3.5" strokeWidth={2} />} label="Destination" value={trip.destination} tone="var(--theme-accent-warm)" last />
          </ol>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-[16px] border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
          >
            <span
              className="theme-mono-sm inline-flex items-center gap-2"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
            >
              <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} /> IMPACT
            </span>
            <p
              className="mt-2 text-[0.95rem] leading-snug"
              style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
            >
              Equivalent to{' '}
              <em
                style={{
                  fontFamily: 'var(--theme-font-italic)',
                  fontStyle: 'italic',
                  color: 'var(--theme-accent)',
                }}
              >
                {Math.round(trip.co2SavedKg * 5.5)} smartphone charges
              </em>{' '}
              of electricity, or a tree absorbing for{' '}
              {Math.max(1, Math.round(trip.co2SavedKg * 12))} days.
            </p>
          </div>

          {trip.note && (
            <div
              className="rounded-[16px] border p-4"
              style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-muted)' }}
            >
              <span
                className="theme-mono-sm"
                style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
              >
                NOTE
              </span>
              <p
                className="mt-2 italic text-[1.05rem] leading-snug"
                style={{ fontFamily: 'var(--theme-font-italic)', color: 'var(--theme-fg)' }}
              >
                “{trip.note}”
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RouteNode({
  icon,
  label,
  value,
  tone,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
  last?: boolean;
}) {
  const color = tone ?? 'var(--theme-fg)';
  return (
    <li className="relative flex items-start gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className="absolute left-[11px] top-7 h-[calc(100%-1.5rem)] w-px"
          style={{
            background:
              'repeating-linear-gradient(180deg, var(--theme-border-strong) 0 3px, transparent 3px 7px)',
          }}
        />
      )}
      <span
        className="relative z-[1] mt-[2px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border"
        style={{
          background: 'var(--theme-bg-soft)',
          color,
          borderColor: color === 'var(--theme-fg)' ? 'var(--theme-border-strong)' : color,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.16em' }}
        >
          {label.toUpperCase()}
        </span>
        <p
          className="truncate text-[0.98rem]"
          style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
        >
          {value}
        </p>
      </div>
    </li>
  );
}
