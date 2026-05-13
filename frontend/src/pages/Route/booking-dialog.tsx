import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CircleCheck,
  Leaf,
  Loader2,
  RefreshCw,
  TicketCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import { createBookingSummary } from './booking-summary';
import { QrCard } from './qr-card';
import type { PlannerState, RouteOption } from './shared';
import {
  createBookingDraft,
  type Booking,
  type BookingDraft,
  type ConfirmedBooking,
} from '@/lib/booking-draft';
import {
  createBooking,
  ApiError,
  markBookingPaid,
  markBookingCompleted,
  cancelBooking,
  type BackendRouteOption,
  type BackendTransportSegment,
} from '@/lib/api';
import {
  buildBookingCostBreakdown,
  isBookableStep,
  type BookingCostBreakdown,
} from '@/lib/booking-cost-breakdown';
import {
  bookingLifecycle,
  type BookingLifecyclePaymentStatus,
  type BookingLifecycleStatus,
} from '@/lib/booking-lifecycle';
import { useBookingUserId } from '@/hooks/useBookingUserId';

const EASE = [0.2, 0.7, 0.2, 1] as const;

type BookingActionBarProps = {
  state: PlannerState;
  route: RouteOption;
  onBook: () => void;
};

export function BookingActionBar({ state, route, onBook }: BookingActionBarProps) {
  const summary = createBookingSummary({
    route,
    origin: state.origin,
    destination: state.destination,
    passengers: state.passengers,
    preference: state.preference,
    modes: state.modes,
  });
  const bookable = countBookableLegs(route.backendOption);
  const primaryLabel = bookable > 0 ? 'Book route' : 'Save trip';
  const primaryLabelShort = bookable > 0 ? 'Book' : 'Save';
  const primaryDisabled = !route.backendOption;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08, ease: EASE }}
      className="theme-card mt-6 flex flex-col gap-5 p-5 sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-4">
        <span
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'var(--theme-accent-soft)',
            color: 'var(--theme-accent)',
            border: '1px solid var(--theme-accent-muted)',
          }}
        >
          <TicketCheck size={17} />
        </span>
        <div className="min-w-0">
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            § Selected booking
          </div>
          <div
            className="theme-display mt-1 truncate"
            style={{ color: 'var(--theme-fg)', fontSize: '1.35rem' }}
          >
            {summary.routeName}{' '}
            <span className="theme-italic" style={{ color: 'var(--theme-fg-muted)' }}>
              · {summary.totalPrice}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[summary.passengerLabel, summary.routeModesLabel].map((item) => (
              <span key={item} className="theme-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="theme-action-bar">
        <span className="theme-mono-sm hidden min-w-0 truncate sm:inline" style={{ color: 'var(--theme-fg-dim)' }}>
          Confirm the selected corridor booking
        </span>
        <button
          type="button"
          onClick={onBook}
          disabled={primaryDisabled}
          aria-disabled={primaryDisabled || undefined}
          className="theme-btn-primary theme-action-bar-primary sm:w-auto disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="theme-action-label">
            <span className="sm:hidden">{primaryLabelShort}</span>
            <span className="hidden sm:inline">{primaryLabel}</span>
          </span>
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export function buildDraftForPlanner(
  state: PlannerState,
  route: RouteOption,
): BookingDraft | null {
  if (!route.backendOption) return null;
  const summary = createBookingSummary({
    route,
    origin: state.origin,
    destination: state.destination,
    passengers: state.passengers,
    preference: state.preference,
    modes: state.modes,
  });
  return createBookingDraft(route.backendOption, state.passengers, {
    routeName: summary.routeName,
    routeLabel: summary.routeLabel,
    origin: state.origin,
    destination: state.destination,
    routeModesLabel: summary.routeModesLabel,
    allowedModesLabel: summary.allowedModesLabel,
    durationText: summary.durationText,
    stopLabel: summary.stopLabel,
  });
}

type DialogPhase = 'idle' | 'pending' | 'error';

type BookingDialogProps = {
  booking: Booking;
  onClose: () => void;
  onUpdate?: (next: Booking) => void;
};

export function BookingDialog({ booking, onClose, onUpdate }: BookingDialogProps) {
  const userId = useBookingUserId();
  const [current, setCurrent] = useState<Booking>(booking);
  const [phase, setPhase] = useState<DialogPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(booking);
    setPhase('idle');
    setErrorMessage(null);
  }, [booking]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const applyUpdate = (next: Booking) => {
    setCurrent(next);
    onUpdate?.(next);
  };

  const lifecycle = bookingLifecycle({
    status: current.status as BookingLifecycleStatus,
    paymentStatus:
      'paymentStatus' in current && current.paymentStatus === 'completed'
        ? 'completed'
        : 'pending',
  });

  const headlineRouteName =
    current.status === 'draft'
      ? current.display?.routeName ?? 'Your trip'
      : routeNameFromSnapshot(current.routeSnapshot);

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Booking details"
      className="theme-root fixed inset-0 z-[100] overflow-y-auto p-3 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <motion.button
        type="button"
        aria-label="Close booking dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: 'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      />

      <div className="relative z-[1] flex min-h-full items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 120, scale: 0.98, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 120, scale: 0.98, filter: 'blur(6px)' }}
          transition={{ duration: 0.55, ease: EASE }}
          className="auth-modal-shell relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[18px] sm:max-h-[calc(100dvh-2rem)] sm:rounded-[20px] lg:flex-row"
          style={{
            border: '1px solid var(--theme-border-strong)',
            background: 'var(--theme-bg)',
            boxShadow:
              '0 60px 120px -48px rgba(10,14,12,0.42), 0 0 0 1px var(--theme-border)',
          }}
        >
          <span
            aria-hidden
            className="mx-auto my-2 block h-1 w-10 shrink-0 rounded-full sm:my-2.5 lg:hidden"
            style={{ background: 'var(--theme-border-strong)' }}
          />
          <div
            aria-hidden
            className="theme-grain pointer-events-none absolute inset-0"
            style={{ position: 'absolute', zIndex: 1 }}
          />

          <DialogAside
            booking={current}
            routeName={headlineRouteName}
          />

          <section
            className="relative z-[2] flex min-h-0 flex-1 flex-col overflow-y-auto"
            style={{ background: 'var(--theme-bg)' }}
          >
            <div className="flex items-center justify-between px-4 pt-4 sm:px-7 sm:pt-6 md:px-10 md:pt-8">
              <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                § {lifecycle.content === 'draft' ? 'Confirm — 02' : 'Booking — 02'}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                style={{
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-fg-muted)',
                }}
              >
                <X size={16} strokeWidth={1.6} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-4 pb-0 pt-4 sm:gap-7 sm:px-7 sm:pb-8 sm:pt-6 md:px-10 md:pb-10 md:pt-8">
              {lifecycle.content === 'draft' && current.status === 'draft' && (
                <DraftReviewPane
                  draft={current}
                  userId={userId}
                  phase={phase}
                  errorMessage={errorMessage}
                  onCancel={onClose}
                  onConfirm={async () => {
                    if (!userId) {
                      setErrorMessage('Sign in to confirm this booking.');
                      setPhase('error');
                      return;
                    }
                    setErrorMessage(null);
                    setPhase('pending');
                    try {
                      const result = await createBooking({
                        userId,
                        routeId: current.routeId,
                        routeSnapshot: current.routeSnapshot,
                        passengers: current.passengers,
                      });
                      const confirmed: ConfirmedBooking = {
                        status: 'confirmed',
                        bookingId: result.bookingId,
                        bookingReference: result.bookingReference,
                        routeId: current.routeId,
                        routeSnapshot: result.routeSnapshot ?? current.routeSnapshot,
                        passengers: result.passengers ?? current.passengers,
                        estimatedPoints: result.estimatedPoints,
                        paymentStatus: result.paymentStatus ?? 'pending',
                        createdAt: result.createdAt,
                      };
                      applyUpdate(confirmed);
                      setPhase('idle');
                    } catch (error) {
                      const message =
                        error instanceof ApiError || error instanceof Error
                          ? error.message
                          : 'Booking failed. Please try again.';
                      setErrorMessage(message);
                      setPhase('error');
                    }
                  }}
                />
              )}

              {lifecycle.content !== 'draft' && current.status !== 'draft' && (
                <PersistedBookingPane
                  booking={current}
                  onClose={onClose}
                  onUpdate={applyUpdate}
                />
              )}
            </div>
          </section>
        </motion.div>
      </div>
    </motion.div>,
    document.body,
  );
}

function DialogAside({
  booking,
  routeName,
}: {
  booking: Booking;
  routeName: string;
}) {
  const totalLabel =
    booking.status === 'draft'
      ? `RM ${booking.routeSnapshot.estimatedCost.toFixed(2)}`
      : `RM ${booking.routeSnapshot.estimatedCost.toFixed(2)}`;
  const co2Label = `${booking.routeSnapshot.carbonEstimateKg.toFixed(2)} kg CO₂`;
  const pointsLabel =
    booking.status === 'draft'
      ? `+${booking.routeSnapshot.greenPointsEstimate} pts`
      : booking.status === 'completed'
        ? `+${booking.actualPoints} pts`
        : `+${booking.estimatedPoints} pts`;
  const eyebrow =
    booking.status === 'draft'
      ? 'Confirmation'
      : booking.status === 'completed'
        ? 'Trip done'
        : booking.status === 'cancelled'
          ? 'Cancelled'
          : 'Booking';
  return (
    <aside
      className="relative z-[2] overflow-hidden border-b p-4 sm:p-8 lg:w-[40%] lg:border-b-0 lg:border-r lg:p-10"
      style={{
        background: 'var(--theme-bg-soft)',
        borderColor: 'var(--theme-border)',
      }}
    >
      <div aria-hidden className="theme-mesh absolute inset-[-10%]" style={{ opacity: 0.55 }} />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -left-2 hidden select-none theme-display sm:block"
        style={{
          fontSize: 'clamp(5rem, 10vw, 9rem)',
          letterSpacing: '-0.06em',
          lineHeight: 0.82,
          color: 'var(--theme-fg)',
          opacity: 0.06,
        }}
      >
        {booking.status === 'draft' ? 'Book.' : 'Trip.'}
      </div>

      <div className="relative flex h-full flex-col justify-between gap-4 sm:gap-10">
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-[7px]"
                style={{ background: 'var(--theme-accent)' }}
              >
                <Leaf size={14} style={{ color: 'var(--theme-accent-fg)' }} />
              </span>
              <span
                className="theme-display"
                style={{ color: 'var(--theme-fg)', fontSize: '1.2rem' }}
              >
                Verdify
              </span>
            </div>
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              § Booking — 01
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 sm:mt-10">
            <span className="theme-rule block" />
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              {eyebrow}
            </span>
          </div>

          <h2
            className="theme-display mt-3 max-w-[18ch] sm:mt-5 sm:max-w-[10ch]"
            style={{
              color: 'var(--theme-fg)',
              fontSize: 'clamp(1.75rem, 8vw, 3.5rem)',
              lineHeight: 0.9,
            }}
          >
            {routeName}{' '}
            <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
              {booking.status === 'draft' ? 'booking.' : 'trip.'}
            </span>
          </h2>

          {booking.status === 'draft' && (
            <p
              className="mt-3 hidden max-w-[34ch] text-[0.92rem] leading-[1.55] sm:block"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              Review passenger count, corridor options, and price before confirming
              this route.
            </p>
          )}
        </div>

        <div className="hidden grid-cols-3 gap-4 border-t pt-5 sm:grid" style={{ borderColor: 'var(--theme-border)' }}>
          <SummaryStat label="Total" value={totalLabel} />
          <SummaryStat label="Carbon" value={co2Label} />
          <SummaryStat label="Reward" value={pointsLabel} />
        </div>
      </div>
    </aside>
  );
}

function DraftReviewPane({
  draft,
  userId,
  phase,
  errorMessage,
  onConfirm,
  onCancel,
}: {
  draft: BookingDraft;
  userId: string | null;
  phase: DialogPhase;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const snapshot = draft.routeSnapshot;
  const display = draft.display;
  const passengers = draft.passengers;
  const passengerLabel = `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'}`;
  const corridor = display
    ? `${display.origin || 'Origin'} → ${display.destination || 'Destination'}`
    : 'Selected corridor';
  const totalPrice = `RM ${snapshot.estimatedCost.toFixed(2)}`;
  const co2Label = `${snapshot.carbonEstimateKg.toFixed(2)} kg CO₂`;
  const pointsLabel = `+${snapshot.greenPointsEstimate} pts`;
  const stopLabel = display?.stopLabel ?? `${snapshot.steps.length} ${snapshot.steps.length === 1 ? 'stop' : 'stops'}`;
  const durationText = display?.durationText ?? `${snapshot.totalDuration}m`;
  const routeModesLabel = display?.routeModesLabel ?? routeNameFromSnapshot(snapshot);
  const allowedModesLabel = display?.allowedModesLabel ?? routeModesLabel;
  const routeLabel = display?.routeLabel ?? `${snapshot.mode} route`;
  const bookable = countBookableLegs(snapshot);
  const confirmLabel = bookable > 0 ? 'Confirm booking' : 'Save trip';
  const confirmLabelShort = bookable > 0 ? 'Confirm' : 'Save';

  return (
    <>
      <div>
        <h3
          className="theme-display"
          style={{ color: 'var(--theme-fg)', fontSize: 'clamp(1.45rem, 6vw, 2.25rem)' }}
        >
          Confirm your trip
        </h3>
        <p className="mt-2 text-[0.94rem] leading-relaxed" style={{ color: 'var(--theme-fg-muted)' }}>
          {corridor}
        </p>
        <div
          className="mt-3 grid grid-cols-3 gap-2 rounded-[14px] p-3 sm:hidden"
          style={{
            background: 'var(--theme-surface-muted)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <SummaryStat label="Total" value={totalPrice} compact />
          <SummaryStat label="Carbon" value={co2Label} compact />
          <SummaryStat label="Reward" value={pointsLabel} compact />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
        <DetailTile icon={Users} label="Passenger info" value={passengerLabel} />
        <DetailTile icon={TicketCheck} label="Booking option" value={routeLabel} />
        <DetailTile icon={Leaf} label="Route modes" value={routeModesLabel} />
      </div>

      <div
        className="rounded-[16px] p-4 sm:rounded-[18px] sm:p-5"
        style={{
          background: 'var(--theme-surface-muted)',
          border: '1px solid var(--theme-border)',
          backdropFilter: 'blur(18px) saturate(160%)',
        }}
      >
        <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Booking options
        </div>
        <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-3 sm:gap-4">
          <PlainDetail label="Allowed modes" value={allowedModesLabel} />
          <PlainDetail label="Duration" value={durationText} />
          <PlainDetail label="Stops" value={stopLabel} />
        </div>
      </div>

      <div
        className="flex flex-col gap-3 border-y py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-5"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <div className="flex items-center gap-3">
          <Wallet size={22} style={{ color: 'var(--theme-accent)' }} />
          <div>
            <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              Price
            </div>
            <div className="text-[0.9rem]" style={{ color: 'var(--theme-fg-muted)' }}>
              {totalPrice} for {passengers} {passengers === 1 ? 'passenger' : 'passengers'}
            </div>
          </div>
        </div>
        <div
          className="theme-display"
          style={{ color: 'var(--theme-fg)', fontSize: 'clamp(2rem, 4vw, 3rem)' }}
        >
          {totalPrice}
        </div>
      </div>

      {phase === 'error' && errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] p-3 sm:p-4"
          style={{
            background: 'color-mix(in srgb, var(--theme-accent-warm) 14%, transparent)',
            border: '1px solid var(--theme-border-strong)',
            color: 'var(--theme-fg)',
          }}
        >
          <AlertCircle size={16} style={{ color: 'var(--theme-accent-warm)' }} />
          <div className="flex-1 text-[0.9rem] leading-snug">{errorMessage}</div>
        </div>
      )}

      <div
        className="theme-action-bar sticky bottom-0 -mx-4 mt-auto px-4 py-4 sm:static sm:mx-0 sm:p-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--theme-bg) 82%, transparent) 0%, var(--theme-bg) 38%)',
        }}
      >
        <button
          type="button"
          onClick={onConfirm}
          disabled={phase === 'pending' || !userId}
          aria-label={phase === 'error' ? 'Retry booking' : 'Confirm booking'}
          aria-busy={phase === 'pending' || undefined}
          className="theme-btn-primary theme-action-bar-primary h-12 disabled:opacity-70"
        >
          {phase === 'pending' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span className="theme-action-label">
                <span className="sm:hidden">Confirming</span>
                <span className="hidden sm:inline">Confirming booking</span>
              </span>
            </>
          ) : phase === 'error' ? (
            <>
              <span className="theme-action-label">
                <span className="sm:hidden">Retry</span>
                <span className="hidden sm:inline">Retry booking</span>
              </span>
              <RefreshCw size={14} />
            </>
          ) : (
            <>
              <span className="theme-action-label">
                <span className="sm:hidden">{confirmLabelShort}</span>
                <span className="hidden sm:inline">{confirmLabel}</span>
              </span>
              <CircleCheck size={14} />
            </>
          )}
        </button>
        <div className="theme-action-bar-icons">
          <button
            type="button"
            onClick={onCancel}
            disabled={phase === 'pending'}
            aria-label="Cancel booking"
            className="theme-btn-ghost h-12 w-12 shrink-0 justify-center px-0 disabled:opacity-50 sm:w-auto sm:px-6"
          >
            <X size={15} />
            <span className="theme-action-label hidden sm:inline">Cancel</span>
          </button>
        </div>
      </div>
    </>
  );
}

type LifecycleAction = 'markPaid' | 'markCompleted' | 'cancel';

function PersistedBookingPane({
  booking,
  onClose,
  onUpdate,
}: {
  booking: ConfirmedBooking;
  onClose: () => void;
  onUpdate: (next: ConfirmedBooking) => void;
}) {
  const steps = booking.routeSnapshot.steps;
  const breakdown = buildBookingCostBreakdown(steps);
  const hasBookable = breakdown.reserved.length > 0;

  const status = booking.status as BookingLifecycleStatus;
  const paymentStatus = (
    booking.paymentStatus === 'completed' ? 'completed' : 'pending'
  ) as BookingLifecyclePaymentStatus;
  const lifecycle = bookingLifecycle({ status, paymentStatus });

  const [busy, setBusy] = useState<LifecycleAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const runAction = async (
    action: LifecycleAction,
    runner: () => Promise<ConfirmedBooking>,
  ) => {
    setActionError(null);
    setBusy(action);
    try {
      const next = await runner();
      onUpdate(next);
      setConfirmingCancel(false);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'Action failed. Please try again.';
      setActionError(message);
    } finally {
      setBusy(null);
    }
  };

  const handleMarkPaid = () =>
    runAction('markPaid', async () => {
      const record = await markBookingPaid(booking.bookingId);
      return {
        ...booking,
        status: record.status as ConfirmedBooking['status'],
        paymentStatus: record.paymentStatus,
        actualPoints: record.actualPoints ?? booking.actualPoints,
      };
    });

  const handleMarkCompleted = () =>
    runAction('markCompleted', async () => {
      const result = await markBookingCompleted(booking.bookingId);
      return {
        ...booking,
        status: result.status as ConfirmedBooking['status'],
        paymentStatus: result.paymentStatus || booking.paymentStatus,
        actualPoints: result.actualPoints,
      };
    });

  const handleCancel = () =>
    runAction('cancel', async () => {
      const record = await cancelBooking(booking.bookingId);
      return {
        ...booking,
        status: record.status as ConfirmedBooking['status'],
        paymentStatus: record.paymentStatus,
      };
    });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background:
              lifecycle.content === 'cancelled'
                ? 'color-mix(in srgb, var(--theme-accent-warm) 22%, transparent)'
                : 'var(--theme-accent-soft)',
            color:
              lifecycle.content === 'cancelled'
                ? 'var(--theme-accent-warm)'
                : 'var(--theme-accent)',
            border: '1px solid var(--theme-accent-muted)',
          }}
        >
          {lifecycle.content === 'cancelled' ? (
            <X size={18} />
          ) : lifecycle.content === 'tripDone' ? (
            <Trophy size={18} />
          ) : (
            <CircleCheck size={18} />
          )}
        </span>
        <div>
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            {lifecycle.content === 'cancelled'
              ? 'Cancelled booking'
              : lifecycle.content === 'tripDone'
                ? 'Trip completed'
                : 'Booking reference'}
          </div>
          <div
            className="theme-display mt-1"
            style={{ color: 'var(--theme-fg)', fontSize: 'clamp(1.4rem, 5vw, 2rem)' }}
          >
            {booking.bookingReference}
          </div>
        </div>
      </div>

      {lifecycle.content === 'qr' && hasBookable && (
        <div className="flex flex-col gap-3">
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            § Bookable legs — show at boarding
          </div>
          {breakdown.reserved.map((entry) => (
            <QrCard
              key={`qr-${entry.leg}`}
              legLabel={buildLegLabel(steps[entry.leg], entry.label)}
              cost={entry.cost}
              bookingReference={booking.bookingReference}
            />
          ))}
        </div>
      )}

      {lifecycle.content === 'qr' && breakdown.tapIn.length > 0 && (
        <div
          className="rounded-[16px] p-4 sm:rounded-[18px] sm:p-5"
          style={{
            background: 'var(--theme-surface-muted)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            Tap-in fares · pay on boarding
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {breakdown.tapIn.map((entry) => (
              <li
                key={`tap-${entry.leg}`}
                className="flex items-center justify-between gap-3 text-[0.95rem]"
                style={{ color: 'var(--theme-fg)' }}
              >
                <span className="truncate">{entry.label}</span>
                <span className="theme-mono-sm shrink-0" style={{ color: 'var(--theme-fg-muted)' }}>
                  RM {entry.cost.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lifecycle.content === 'tripDone' && <TripDoneTile booking={booking} />}

      {lifecycle.content === 'cancelled' && <CancelledReceipt booking={booking} />}

      {lifecycle.content === 'qr' && (
        <CostSummary breakdown={breakdown} grandTotal={booking.routeSnapshot.estimatedCost} />
      )}

      {actionError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-[14px] p-3 sm:p-4"
          style={{
            background: 'color-mix(in srgb, var(--theme-accent-warm) 14%, transparent)',
            border: '1px solid var(--theme-border-strong)',
            color: 'var(--theme-fg)',
          }}
        >
          <AlertCircle size={16} style={{ color: 'var(--theme-accent-warm)' }} />
          <div className="flex-1 text-[0.9rem] leading-snug">{actionError}</div>
        </div>
      )}

      {(lifecycle.showMarkPaid ||
        lifecycle.showMarkCompleted ||
        lifecycle.showCancel ||
        lifecycle.content !== 'qr') && (
        <div
          className="theme-action-bar sticky bottom-0 -mx-4 mt-auto flex-col items-stretch gap-3 px-4 py-4 sm:static sm:mx-0 sm:flex-row sm:items-center sm:gap-3 sm:p-0"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--theme-bg) 82%, transparent) 0%, var(--theme-bg) 38%)',
          }}
        >
          {lifecycle.showMarkPaid && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={busy !== null}
              aria-busy={busy === 'markPaid' || undefined}
              className="theme-btn-primary theme-action-bar-primary h-12 disabled:opacity-70"
            >
              {busy === 'markPaid' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Wallet size={14} />
              )}
              <span className="theme-action-label">Mark as Paid</span>
            </button>
          )}
          {lifecycle.showMarkCompleted && (
            <button
              type="button"
              onClick={handleMarkCompleted}
              disabled={busy !== null}
              aria-busy={busy === 'markCompleted' || undefined}
              className="theme-btn-primary theme-action-bar-primary h-12 disabled:opacity-70"
            >
              {busy === 'markCompleted' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CircleCheck size={14} />
              )}
              <span className="theme-action-label">Mark trip as completed</span>
            </button>
          )}
          {lifecycle.showCancel &&
            (confirmingCancel ? (
              <div
                className="flex w-full flex-col gap-3 rounded-[14px] p-3 sm:flex-row sm:items-center sm:p-4"
                style={{
                  border: '1px solid var(--theme-border-strong)',
                  background: 'var(--theme-surface-muted)',
                }}
              >
                <p
                  className="text-[0.88rem] leading-snug sm:flex-1"
                  style={{ color: 'var(--theme-fg)' }}
                >
                  Cancel this booking? Points won't be awarded. Operator payments
                  are non-refundable through Verdify.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    disabled={busy !== null}
                    className="theme-btn-ghost h-10 px-3 disabled:opacity-50"
                  >
                    <span className="theme-action-label">Keep</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={busy !== null}
                    aria-busy={busy === 'cancel' || undefined}
                    className="theme-btn-primary h-10 px-3 disabled:opacity-70"
                  >
                    {busy === 'cancel' ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <X size={14} />
                    )}
                    <span className="theme-action-label">Cancel booking</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                disabled={busy !== null}
                aria-label="Cancel booking"
                className="theme-btn-ghost h-12 shrink-0 justify-center px-3 disabled:opacity-50 sm:w-auto sm:px-6"
              >
                <X size={15} />
                <span className="theme-action-label">Cancel booking</span>
              </button>
            ))}
          {lifecycle.content !== 'qr' && !lifecycle.showCancel && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="theme-btn-primary theme-action-bar-primary h-12"
            >
              <span className="theme-action-label">Close</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TripDoneTile({ booking }: { booking: ConfirmedBooking }) {
  const points = booking.actualPoints || booking.estimatedPoints;
  const carbonKg = (booking.routeSnapshot.carbonSavedGrams ?? 0) / 1000;
  return (
    <div
      className="rounded-[18px] p-5 sm:p-6"
      style={{
        background: 'var(--theme-accent-soft)',
        border: '1px solid var(--theme-accent-muted)',
      }}
    >
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        Trip done
      </div>
      <div
        className="theme-display mt-2"
        style={{ color: 'var(--theme-fg)', fontSize: 'clamp(1.6rem, 5vw, 2.4rem)' }}
      >
        +{points} pts · {carbonKg.toFixed(1)} kg CO₂ saved
      </div>
      <p className="mt-2 text-[0.92rem]" style={{ color: 'var(--theme-fg-muted)' }}>
        Your green points balance has been updated. Thanks for travelling lower-carbon.
      </p>
    </div>
  );
}

function CancelledReceipt({ booking }: { booking: ConfirmedBooking }) {
  const paidOperator = booking.paymentStatus === 'completed';
  return (
    <div
      className="rounded-[18px] p-5 sm:p-6"
      style={{
        background: 'var(--theme-surface-muted)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        Booking cancelled
      </div>
      <p className="mt-2 text-[0.95rem] leading-snug" style={{ color: 'var(--theme-fg)' }}>
        This reservation has been cancelled. No green points will be awarded.
      </p>
      {paidOperator && (
        <p className="mt-2 text-[0.88rem] leading-snug" style={{ color: 'var(--theme-fg-muted)' }}>
          You marked the operator as paid before cancelling. Verdify does not
          process operator payments — refunds, if any, are handled directly by
          the operator.
        </p>
      )}
    </div>
  );
}

function CostSummary({
  breakdown,
  grandTotal,
}: {
  breakdown: BookingCostBreakdown;
  grandTotal: number;
}) {
  return (
    <div
      className="flex flex-col gap-2 border-y py-4 sm:py-5"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div className="flex items-center justify-between text-[0.95rem]" style={{ color: 'var(--theme-fg)' }}>
        <span style={{ color: 'var(--theme-fg-muted)' }}>Reserved fares</span>
        <span className="theme-mono-sm">RM {breakdown.reservedTotal.toFixed(2)}</span>
      </div>
      <div className="flex items-center justify-between text-[0.95rem]" style={{ color: 'var(--theme-fg)' }}>
        <span style={{ color: 'var(--theme-fg-muted)' }}>Tap-in fares</span>
        <span className="theme-mono-sm">RM {breakdown.tapInTotal.toFixed(2)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Total
        </span>
        <span
          className="theme-display"
          style={{ color: 'var(--theme-fg)', fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)' }}
        >
          RM {grandTotal.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
      <span
        className="theme-display leading-none"
        style={{
          color: 'var(--theme-fg)',
          fontSize: compact ? 'clamp(0.92rem, 4.5vw, 1.12rem)' : 'clamp(1.1rem, 2vw, 1.45rem)',
        }}
      >
        {value}
      </span>
      <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        {label}
      </span>
    </div>
  );
}

function DetailTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-[14px] p-3 sm:rounded-[16px] sm:p-4"
      style={{
        border: '1px solid var(--theme-border)',
        background: 'var(--theme-surface)',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: 'var(--theme-accent)' }} />
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          {label}
        </span>
      </div>
      <div
        className="mt-2 text-[0.96rem] leading-snug"
        style={{ color: 'var(--theme-fg)' }}
      >
        {value}
      </div>
    </div>
  );
}

function PlainDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        {label}
      </div>
      <div className="mt-1 text-[0.94rem] leading-snug" style={{ color: 'var(--theme-fg)' }}>
        {value}
      </div>
    </div>
  );
}

function buildLegLabel(step: BackendTransportSegment | undefined, fallback: string): string {
  if (!step) return fallback;
  const prefix =
    step.type === 'ev_taxi' || step.type === 'evTaxi'
      ? 'EV Taxi'
      : step.transitLine?.trim() || fallback;
  const from = step.departureStop?.trim();
  const to = step.arrivalStop?.trim() || step.headsign?.trim();
  if (from && to) return `${prefix} · ${from} → ${to}`;
  if (to) return `${prefix} → ${to}`;
  return prefix;
}

function countBookableLegs(option: BackendRouteOption | undefined): number {
  if (!option) return 0;
  return option.steps.reduce((acc, step) => (isBookableStep(step.type) ? acc + 1 : acc), 0);
}

function routeNameFromSnapshot(snapshot: BackendRouteOption): string {
  if (snapshot.mode === 'eco') return 'Green corridor';
  if (snapshot.mode === 'cheap') return 'Cheap corridor';
  if (snapshot.mode === 'fast') return 'Fast corridor';
  return 'Your trip';
}
