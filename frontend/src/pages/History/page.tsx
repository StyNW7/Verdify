import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Leaf,
  Navigation,
  Route as RouteIcon,
  Sparkles,
  TicketCheck,
} from 'lucide-react';

import {
  ApiError,
  listUserBookings,
  type BookingRecord,
} from '@/lib/api';
import { useBookingUserId } from '@/hooks/useBookingUserId';
import { BookingDialog } from '@/pages/Route/booking-dialog';
import type { Booking, ConfirmedBooking } from '@/lib/booking-draft';

const fmt = (n: number) => n.toLocaleString('en-US');

function bookingToConfirmed(record: BookingRecord): ConfirmedBooking {
  return {
    status: record.status as ConfirmedBooking['status'],
    bookingId: record.bookingId,
    bookingReference: record.bookingReference,
    routeId: record.routeId,
    routeSnapshot: record.routeSnapshot,
    passengers: record.passengers,
    estimatedPoints: record.estimatedPoints,
    actualPoints: record.actualPoints,
    paymentStatus: record.paymentStatus,
    createdAt: record.createdAt,
  };
}

function carbonSavedKg(record: BookingRecord): number {
  const grams = record.routeSnapshot?.carbonSavedGrams ?? 0;
  return grams / 1000;
}

function pointsFor(record: BookingRecord): number {
  if (record.actualPoints && record.actualPoints > 0) return record.actualPoints;
  return record.estimatedPoints ?? record.routeSnapshot?.greenPointsEstimate ?? 0;
}

function originFromSnapshot(record: BookingRecord): string {
  const first = record.routeSnapshot?.steps?.[0];
  return first?.departureStop?.trim() || 'Origin';
}

function destinationFromSnapshot(record: BookingRecord): string {
  const steps = record.routeSnapshot?.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    const end = s.arrivalStop?.trim() || s.headsign?.trim();
    if (end) return end;
  }
  return 'Destination';
}

function corridorLabel(record: BookingRecord): { from: string; to: string } {
  return { from: originFromSnapshot(record), to: destinationFromSnapshot(record) };
}

type Tone = 'green' | 'warm' | 'ink' | 'muted';

function statusBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case 'completed':
      return { label: 'Completed', tone: 'green' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'warm' };
    case 'confirmed':
      return { label: 'Confirmed', tone: 'ink' };
    default:
      return { label: status || 'Pending', tone: 'muted' };
  }
}

function toneColor(tone: Tone): string {
  if (tone === 'green') return 'var(--theme-accent)';
  if (tone === 'warm') return 'var(--theme-accent-warm)';
  if (tone === 'muted') return 'var(--theme-fg-dim)';
  return 'var(--theme-fg)';
}

function formatTripDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryPage() {
  const userId = useBookingUserId();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Booking | null>(null);

  useEffect(() => {
    if (!userId) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listUserBookings(userId, { limit: 100, offset: 0 })
      .then((res) => {
        if (cancelled) return;
        setBookings(res.bookings ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : 'Failed to load bookings';
        setError(message);
        setBookings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const sorted = useMemo(() => {
    return [...bookings].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    );
  }, [bookings]);

  const totals = useMemo(() => {
    let count = 0;
    let co2 = 0;
    let dist = 0;
    let pts = 0;
    for (const b of sorted) {
      if (b.status === 'cancelled') continue;
      count += 1;
      co2 += carbonSavedKg(b);
      dist += b.routeSnapshot?.totalDistance ?? 0;
      pts += pointsFor(b);
    }
    return { count, co2, dist, pts };
  }, [sorted]);

  const handleRowClick = (record: BookingRecord) => {
    setActive(bookingToConfirmed(record));
  };

  const handleDialogUpdate = (next: Booking) => {
    if (next.status === 'draft') return;
    const updated = next as ConfirmedBooking;
    setActive(updated);
    setBookings((prev) =>
      prev.map((b) =>
        b.bookingId === updated.bookingId
          ? {
              ...b,
              status: updated.status,
              paymentStatus: updated.paymentStatus,
              actualPoints: updated.actualPoints ?? b.actualPoints,
            }
          : b,
      ),
    );
  };

  return (
    <section
      className="relative mx-auto w-full px-5 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-10"
      style={{ maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <div className="flex flex-col gap-6 sm:gap-8">
        <Header totals={totals} />

        {error && (
          <div
            role="alert"
            className="rounded-[14px] border px-4 py-3 text-[0.92rem]"
            style={{
              borderColor: 'var(--theme-border-strong)',
              background: 'color-mix(in srgb, var(--theme-accent-warm) 14%, transparent)',
              color: 'var(--theme-fg)',
            }}
          >
            {error}
          </div>
        )}

        {loading && bookings.length === 0 ? (
          <LoadingTile />
        ) : sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <LedgerView bookings={sorted} onOpen={handleRowClick} />
        )}
      </div>

      <AnimatePresence>
        {active && (
          <BookingDialog
            booking={active}
            onClose={() => setActive(null)}
            onUpdate={handleDialogUpdate}
          />
        )}
      </AnimatePresence>
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
          className="theme-display text-[clamp(1.9rem,7vw,3.8rem)] leading-[1.02] tracking-[-0.035em]"
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
          A running archive of your lower-carbon commutes — open any trip to see the
          full route, QR codes, and lifecycle actions.
        </p>
      </div>

      <SummaryStrip totals={totals} />
    </div>
  );
}

function SummaryStrip({ totals }: { totals: { co2: number; pts: number; dist: number; count: number } }) {
  const items = [
    { label: 'TRIPS LOGGED', value: fmt(totals.count), tail: 'entries', icon: RouteIcon },
    { label: 'CO₂ SAVED', value: totals.co2.toFixed(2), tail: 'kg', icon: Leaf },
    { label: 'DISTANCE', value: totals.dist.toFixed(1), tail: 'km', icon: Navigation },
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
            className={[
              'flex flex-col gap-1.5 px-3.5 py-3.5 sm:gap-2 sm:px-5 sm:py-4',
              (i === 1 || i === 3) && 'border-l',
              i === 2 && 'border-t md:border-t-0 md:border-l',
              i === 0 ? '' : 'md:border-l',
            ].filter(Boolean).join(' ')}
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span
              className="theme-mono-sm inline-flex items-center gap-1.5 sm:gap-2"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.16em', fontSize: '0.62rem' }}
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
              {it.label}
            </span>
            <span
              className="theme-number text-[1.35rem] leading-none tracking-[-0.03em] sm:text-[1.9rem]"
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

function LedgerView({
  bookings,
  onOpen,
}: {
  bookings: BookingRecord[];
  onOpen: (b: BookingRecord) => void;
}) {
  return (
    <div
      className="theme-card relative overflow-hidden rounded-[24px]"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        className="hidden md:grid grid-cols-[128px_1fr_160px_220px] items-center gap-4 border-b px-6 py-3"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        {['DATE', 'ROUTE', 'STATUS', 'REWARD'].map((h, i) => (
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
        {bookings.map((b, i) => (
          <BookingRow key={b.bookingId} record={b} index={i} onOpen={() => onOpen(b)} />
        ))}
      </ul>
    </div>
  );
}

function BookingRow({
  record,
  index,
  onOpen,
}: {
  record: BookingRecord;
  index: number;
  onOpen: () => void;
}) {
  const corridor = corridorLabel(record);
  const badge = statusBadge(record.status);
  const isCompleted = record.status === 'completed';
  const isCancelled = record.status === 'cancelled';
  const points = pointsFor(record);
  const co2kg = carbonSavedKg(record);

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.03 * index, duration: 0.35 }}
      className="group relative cursor-pointer border-b px-4 py-4 last:border-b-0 transition-colors hover:bg-[var(--theme-surface-muted)] md:px-6"
      style={{ borderColor: 'var(--theme-border)' }}
      onClick={onOpen}
    >
      <span
        className="absolute left-0 top-0 h-full w-[2px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: toneColor(badge.tone) }}
      />

      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--theme-border-strong)',
              background: 'var(--theme-surface-muted)',
              color: toneColor(badge.tone),
            }}
          >
            <TicketCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[0.95rem]"
              style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
            >
              {corridor.from}{' '}
              <span
                className="italic"
                style={{ fontFamily: 'var(--theme-font-italic)', color: 'var(--theme-fg-dim)' }}
              >
                to
              </span>{' '}
              {corridor.to}
            </p>
            <p className="theme-mono-sm truncate" style={{ color: 'var(--theme-fg-dim)' }}>
              {formatTripDate(record.createdAt)} · {record.bookingReference}
            </p>
          </div>
        </div>
        <div
          className="flex items-center justify-between gap-3 border-t pt-3"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <StatusBadge label={badge.label} tone={badge.tone} />
          {isCompleted ? (
            <RewardPill points={points} co2kg={co2kg} />
          ) : isCancelled ? (
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              No points
            </span>
          ) : (
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
              +{fmt(points)} pts est.
            </span>
          )}
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[128px_minmax(0,1fr)_140px_auto] items-center gap-4">
        <div className="flex flex-col">
          <span
            className="text-[0.92rem]"
            style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
          >
            {formatTripDate(record.createdAt)}
          </span>
          <span className="theme-mono-sm truncate" style={{ color: 'var(--theme-fg-dim)' }}>
            {record.bookingReference}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
            style={{
              borderColor: 'var(--theme-border-strong)',
              background: 'var(--theme-surface-muted)',
              color: toneColor(badge.tone),
            }}
          >
            <TicketCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p
              className="truncate text-[0.95rem]"
              style={{ color: 'var(--theme-fg)', fontFamily: 'var(--theme-font-display)' }}
            >
              {corridor.from}{' '}
              <span
                className="italic"
                style={{ fontFamily: 'var(--theme-font-italic)', color: 'var(--theme-fg-dim)' }}
              >
                to
              </span>{' '}
              {corridor.to}
            </p>
            <p className="theme-mono-sm truncate" style={{ color: 'var(--theme-fg-dim)' }}>
              {(record.routeSnapshot?.steps?.length ?? 0)} stops · RM{' '}
              {(record.routeSnapshot?.estimatedCost ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
        <StatusBadge label={badge.label} tone={badge.tone} />
        {isCompleted ? (
          <RewardPill points={points} co2kg={co2kg} />
        ) : isCancelled ? (
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            No points awarded
          </span>
        ) : (
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
            +{fmt(points)} pts estimated
          </span>
        )}
      </div>
    </motion.li>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const color = toneColor(tone);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.18em]"
      style={{
        borderColor: color,
        color,
        background:
          tone === 'green'
            ? 'var(--theme-accent-soft)'
            : tone === 'warm'
              ? 'color-mix(in srgb, var(--theme-accent-warm) 14%, transparent)'
              : 'var(--theme-surface-muted)',
        fontFamily: 'var(--theme-font-mono)',
      }}
    >
      {label}
    </span>
  );
}

function RewardPill({ points, co2kg }: { points: number; co2kg: number }) {
  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-[0.85rem]"
      style={{
        borderColor: 'var(--theme-accent-muted)',
        background: 'var(--theme-accent-soft)',
        color: 'var(--theme-fg)',
        fontFamily: 'var(--theme-font-mono)',
      }}
    >
      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: 'var(--theme-accent)' }} />
      <span>+{fmt(points)} pts</span>
      <span style={{ color: 'var(--theme-fg-dim)' }}>·</span>
      <Leaf className="h-3.5 w-3.5" strokeWidth={1.8} style={{ color: 'var(--theme-accent)' }} />
      <span>{co2kg.toFixed(2)} kg CO₂</span>
    </span>
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
        NO TRIPS YET
      </span>
      <p
        className="mt-3 italic text-[1.6rem]"
        style={{
          fontFamily: 'var(--theme-font-italic)',
          color: 'var(--theme-fg)',
        }}
      >
        Plan and book a route to get started.
      </p>
      <p className="mt-1 text-[0.92rem]" style={{ color: 'var(--theme-fg-muted)' }}>
        Confirmed bookings, completed trips, and cancellations all land here.
      </p>
    </div>
  );
}

function LoadingTile() {
  return (
    <div
      className="theme-card flex items-center justify-center rounded-[24px] px-6 py-12"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        Loading bookings…
      </span>
    </div>
  );
}
