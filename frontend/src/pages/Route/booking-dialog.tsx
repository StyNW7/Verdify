import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
<<<<<<< HEAD
  Bus,
  Car,
=======
  ChevronDown,
>>>>>>> cf1b885 (feat: Now shows gemini reasoning in Raw JSON to 'missed my stop' feature)
  CircleCheck,
  Footprints,
  Leaf,
  Loader2,
  Navigation,
  RefreshCw,
  Sparkles,
  TicketCheck,
  TrainFront,
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
  updateBookingProgress,
  type BackendLocation,
  type BackendRouteOption,
  type BackendTransportSegment,
  type RerouteResult,
} from '@/lib/api';
import { nextStep, isFinalStep, createProgressFlusher } from '@/lib/journey-progress';
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
import {
  bookingMapEndpoints,
  bookingFallbackPath,
  buildItineraryRows,
  type ItineraryIconKey,
  type ItineraryRow,
  type MapPoint,
} from '@/lib/booking-itinerary';
import { useBookingUserId } from '@/hooks/useBookingUserId';
import BookingRouteMap from '@/components/BookingRouteMap';

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
  // Live route shown in the planner — preferred source for human-readable
  // step strings, and reflects post-reroute swaps. Optional; History page
  // opens the dialog without a planner route.
  liveRoute?: RouteOption | null;
  rerouteInFlight?: boolean;
  rerouteCount?: number;
  onMissedStop?: (currentLocation: BackendLocation) => void;
  // Latest reroute agent response — rendered as a chat bubble in JourneyPane.
  lastRerouteResult?: RerouteResult | null;
  onDismissRerouteResult?: () => void;
};

export function BookingDialog({
  booking,
  onClose,
  onUpdate,
  liveRoute = null,
  rerouteInFlight = false,
  rerouteCount = 0,
  onMissedStop,
  lastRerouteResult = null,
  onDismissRerouteResult,
}: BookingDialogProps) {
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
                        journeyProgress: result.journeyProgress,
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
                  liveRoute={liveRoute}
                  rerouteInFlight={rerouteInFlight}
                  rerouteCount={rerouteCount}
                  onMissedStop={onMissedStop}
                  lastRerouteResult={lastRerouteResult}
                  onDismissRerouteResult={onDismissRerouteResult}
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
  liveRoute,
  rerouteInFlight,
  rerouteCount,
  onMissedStop,
  lastRerouteResult,
  onDismissRerouteResult,
}: {
  booking: ConfirmedBooking;
  onClose: () => void;
  onUpdate: (next: ConfirmedBooking) => void;
  liveRoute: RouteOption | null;
  rerouteInFlight: boolean;
  rerouteCount: number;
  onMissedStop?: (currentLocation: BackendLocation) => void;
  lastRerouteResult: RerouteResult | null;
  onDismissRerouteResult?: () => void;
}) {
  const steps = booking.routeSnapshot.steps;
  const breakdown = buildBookingCostBreakdown(steps);
  const hasBookable = breakdown.reserved.length > 0;

  const status = booking.status as BookingLifecycleStatus;
  const paymentStatus = (
    booking.paymentStatus === 'completed' ? 'completed' : 'pending'
  ) as BookingLifecyclePaymentStatus;
  const lifecycle = bookingLifecycle({ status, paymentStatus });
  // Paid + still confirmed = the user is mid-trip. Swap the QR/cost pane
  // for a step-by-step journey view that gates "Mark trip as completed"
  // behind reaching the final step, and exposes the "I missed this stop"
  // affordance per-step. Spec: backend/docs/frontend-integration.md.
  const inJourney = status === 'confirmed' && paymentStatus === 'completed';

  const itinerary = buildItineraryRows(steps);
  const mapEndpoints = bookingMapEndpoints(steps);
  const mapFallbackPath = bookingFallbackPath(steps);

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

      {(booking.routeSnapshot.polyline || mapEndpoints.start || mapEndpoints.end) && (
        <BookingRouteMapPanel
          polyline={booking.routeSnapshot.polyline}
          start={mapEndpoints.start}
          end={mapEndpoints.end}
          fallbackPath={mapFallbackPath}
          mode={booking.routeSnapshot.mode}
        />
      )}

      {itinerary.length > 0 && <ItineraryPanel rows={itinerary} />}

      {lifecycle.content === 'qr' && !inJourney && hasBookable && (
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

      {lifecycle.content === 'qr' && !inJourney && breakdown.tapIn.length > 0 && (
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

      {inJourney && (
        <JourneyPane
          booking={booking}
          liveRoute={liveRoute}
          rerouteInFlight={rerouteInFlight}
          rerouteCount={rerouteCount}
          onMissedStop={onMissedStop}
          onMarkCompleted={handleMarkCompleted}
          markCompletedBusy={busy === 'markCompleted'}
          actionsDisabled={busy !== null}
          lastRerouteResult={lastRerouteResult}
          onDismissRerouteResult={onDismissRerouteResult}
        />
      )}

      {lifecycle.content === 'tripDone' && <TripDoneTile booking={booking} />}

      {lifecycle.content === 'cancelled' && <CancelledReceipt booking={booking} />}

      {lifecycle.content === 'qr' && !inJourney && (
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
          {lifecycle.showMarkCompleted && !inJourney && (
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

function describeSnapshotStep(step: BackendTransportSegment): string {
  const dur = Math.max(1, Math.round(step.duration));
  if (step.transitLine) {
    const dest = step.headsign?.trim() || step.arrivalStop?.trim();
    return dest
      ? `${step.transitLine} → ${dest} · ${dur} min`
      : `${step.transitLine} · ${dur} min`;
  }
  if (step.type === 'walking') {
    if (step.instruction) return `${step.instruction} · ${dur} min`;
    if (step.arrivalStop) return `Walk to ${step.arrivalStop} · ${dur} min`;
    return `Walk · ${dur} min`;
  }
  if (step.type === 'ev_taxi' || step.type === 'evTaxi') {
    return `EV Taxi · ${dur} min`;
  }
  if (step.type === 'bus') return `Bus · ${dur} min`;
  return `${step.type} · ${dur} min`;
}

function JourneyPane({
  booking,
  liveRoute,
  rerouteInFlight,
  rerouteCount,
  onMissedStop,
  onMarkCompleted,
  markCompletedBusy,
  actionsDisabled,
  lastRerouteResult,
  onDismissRerouteResult,
}: {
  booking: ConfirmedBooking;
  liveRoute: RouteOption | null;
  rerouteInFlight: boolean;
  rerouteCount: number;
  onMissedStop?: (currentLocation: BackendLocation) => void;
  onMarkCompleted: () => void;
  markCompletedBusy: boolean;
  actionsDisabled: boolean;
  lastRerouteResult: RerouteResult | null;
  onDismissRerouteResult?: () => void;
}) {
  // Prefer the planner's already-formatted strings (post-reroute aware).
  // Fall back to the booking snapshot when the dialog is opened from a
  // surface that has no live planner state (e.g. History page).
  const stepLines = useMemo<string[]>(() => {
    if (liveRoute?.steps && liveRoute.steps.length > 0) return liveRoute.steps;
    return booking.routeSnapshot.steps.map(describeSnapshotStep);
  }, [liveRoute, booking.routeSnapshot.steps]);

  const total = stepLines.length;

  // Seed from the persisted field; fall back to 0 for bookings that
  // pre-date the migration or are mid-PATCH when the dialog opens.
  const persistedStep = booking.journeyProgress?.currentStepIndex ?? 0;
  const [currentStep, setCurrentStep] = useState(() =>
    total === 0 ? 0 : Math.min(persistedStep, total - 1),
  );

  // Re-sync the optimistic mirror whenever the server-persisted value changes
  // (e.g. after a reroute resets the booking prop with a new routeSnapshot and
  // journeyProgress.currentStepIndex = 0). JourneyPane does not unmount on
  // reroute, so the useState initialiser is not re-run.
  const serverStep = booking.journeyProgress?.currentStepIndex ?? 0;
  useEffect(() => {
    flusher.cancel();
    setCurrentStep(total === 0 ? 0 : Math.min(serverStep, total - 1));
  }, [serverStep, total, flusher]);

  const [flusher] = useState(() =>
    createProgressFlusher({
      patch: (idx, keepalive) => { updateBookingProgress(booking.bookingId, idx, { keepalive }).catch(() => {}); },
    }),
  );

  useEffect(() => {
    const beforeUnload = () => flusher.flush(true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      flusher.flush();
      window.removeEventListener('beforeunload', beforeUnload);
    };
  // flusher is stable (useState initialiser); booking.bookingId does not
  // change within a single JourneyPane mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeIndex = total === 0 ? 0 : Math.min(currentStep, total - 1);
  const atFinalStep = total > 0 && safeIndex === total - 1;
  const remainingReroutes = Math.max(0, 3 - rerouteCount);
  // The location handed to the reroute agent is the current step's start
  // coordinate by default ("I missed this stop") — but the user can flip to
  // device GPS ("I'm somewhere else"). Step coords are exposed on
  // routeSnapshot.steps[i].startLocation.
  // Reroute agent must receive the last server-confirmed step, not the
  // optimistic mirror that may have advanced before the debounced PATCH lands.
  const persistedStepIndex = total === 0 ? 0 : Math.min(
    booking.journeyProgress?.currentStepIndex ?? 0,
    total - 1,
  );
  const currentStepLocation: BackendLocation | null =
    booking.routeSnapshot.steps[persistedStepIndex]?.startLocation ?? null;
  const [locationSource, setLocationSource] = useState<'stop' | 'gps'>('stop');
  const [gpsFetching, setGpsFetching] = useState(false);
  const canMissStop =
    !!onMissedStop &&
    !rerouteInFlight &&
    !gpsFetching &&
    !actionsDisabled &&
    remainingReroutes > 0 &&
    (locationSource === 'gps' || !!currentStepLocation);

  const handleMissedStop = async () => {
    if (!onMissedStop) return;
    if (locationSource === 'stop') {
      if (!currentStepLocation) return;
      onMissedStop(currentStepLocation);
      return;
    }
    setGpsFetching(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
        }),
      );
      onMissedStop({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      // Geolocation errors fall through silently; the parent already toasts
      // transport errors. Most browsers also surface a permission prompt.
    } finally {
      setGpsFetching(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          § Journey — Step {String(safeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
        <span
          className="theme-mono-sm flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: 'color-mix(in srgb, var(--theme-accent) 14%, transparent)',
            color: 'var(--theme-accent)',
            border: '1px solid var(--theme-accent-muted)',
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ background: 'var(--theme-accent)' }}
          />
          Live
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {stepLines.map((line, i) => {
          const isPast = i < safeIndex;
          const isCurrent = i === safeIndex;
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-[14px] px-3 py-3 transition-colors"
              style={{
                background: isCurrent ? 'var(--theme-accent-soft)' : 'transparent',
                border: `1px solid ${isCurrent ? 'var(--theme-accent-muted)' : 'var(--theme-border)'}`,
              }}
            >
              <span
                className="theme-mono-sm flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: isCurrent
                    ? 'var(--theme-accent)'
                    : isPast
                      ? 'var(--theme-surface-muted)'
                      : 'var(--theme-surface)',
                  color: isCurrent
                    ? 'var(--theme-accent-fg)'
                    : isPast
                      ? 'var(--theme-fg-muted)'
                      : 'var(--theme-fg-dim)',
                  border: `1px solid ${isCurrent ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
                }}
              >
                {isPast ? <CircleCheck size={13} /> : String(i + 1).padStart(2, '0')}
              </span>
              <p
                className="flex-1 pt-0.5 text-[0.95rem] leading-snug"
                style={{
                  color: isCurrent
                    ? 'var(--theme-fg)'
                    : isPast
                      ? 'var(--theme-fg-dim)'
                      : 'var(--theme-fg-muted)',
                  textDecoration: isPast ? 'line-through' : 'none',
                }}
              >
                {line}
              </p>
            </li>
          );
        })}
      </ol>

      <p
        className="theme-italic text-[0.8rem] leading-snug"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        Prototype mode — tap Next to simulate moving through the route. Ask
        Gemini for a reroute only when you actually miss the current stop.
      </p>

      {(rerouteInFlight || lastRerouteResult) && (
        <RerouteChat
          inFlight={rerouteInFlight}
          result={lastRerouteResult}
          onDismiss={onDismissRerouteResult}
        />
      )}

      {/* Location source picker — only shown when the missed-stop button is
          available. Defaults to "this stop" because demos / prototypes are
          typically off-route and device GPS produces nonsense distances. */}
      {!atFinalStep && onMissedStop && (
        <div className="flex flex-col gap-2 rounded-[12px] p-3 sm:flex-row sm:items-center sm:justify-between"
          style={{
            border: '1px solid var(--theme-border)',
            background: 'var(--theme-surface-muted)',
          }}
        >
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            Location for the reroute
          </div>
          <div
            className="grid grid-cols-2 overflow-hidden rounded-full"
            style={{ border: '1px solid var(--theme-border)' }}
          >
            {(['stop', 'gps'] as const).map((opt) => {
              const active = locationSource === opt;
              const label = opt === 'stop' ? 'This stop' : 'My GPS';
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLocationSource(opt)}
                  disabled={rerouteInFlight || gpsFetching}
                  className="theme-mono-sm whitespace-nowrap px-3 py-1.5 transition-colors disabled:opacity-50"
                  style={{
                    background: active ? 'var(--theme-accent)' : 'transparent',
                    color: active
                      ? 'var(--theme-accent-fg)'
                      : 'var(--theme-fg-muted)',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action row: Next + "I missed this stop" on non-final steps;
          replaces Next with "Mark trip as completed" on the final step. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        {atFinalStep ? (
          <button
            type="button"
            onClick={onMarkCompleted}
            disabled={actionsDisabled || markCompletedBusy}
            aria-busy={markCompletedBusy || undefined}
            className="theme-btn-primary h-12 flex-1 justify-center disabled:opacity-70"
          >
            {markCompletedBusy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CircleCheck size={14} />
            )}
            <span className="theme-action-label">Mark trip as completed</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                const next = nextStep(safeIndex, total);
                setCurrentStep(next);
                flusher.schedule(next);
              }}
              disabled={actionsDisabled || isFinalStep(safeIndex, total)}
              className="theme-btn-primary h-12 flex-1 justify-center disabled:opacity-70"
            >
              <Navigation size={14} />
              <span className="theme-action-label">Next stop</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={handleMissedStop}
              disabled={!canMissStop}
              aria-busy={rerouteInFlight || gpsFetching || undefined}
              aria-label="I missed this stop"
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] px-5 text-[0.95rem] font-medium transition-all disabled:opacity-50"
              style={{
                background: rerouteInFlight
                  ? 'var(--theme-surface-muted)'
                  : 'color-mix(in srgb, #f59e0b 12%, var(--theme-bg))',
                color: rerouteInFlight ? 'var(--theme-fg-muted)' : '#d97706',
                border: `1px solid ${
                  rerouteInFlight
                    ? 'var(--theme-border)'
                    : 'color-mix(in srgb, #f59e0b 35%, transparent)'
                }`,
              }}
            >
              {gpsFetching ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Locating you…</span>
                </>
              ) : rerouteInFlight ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Asking Gemini…</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} />
                  <span>I missed this stop</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {!atFinalStep && onMissedStop && (
        <p className="text-[0.75rem]" style={{ color: 'var(--theme-fg-dim)' }}>
          {remainingReroutes > 0
            ? `${remainingReroutes} reroute${remainingReroutes !== 1 ? 's' : ''} remaining`
            : 'Reroute limit reached — contact support if needed.'}
        </p>
      )}
    </div>
  );
}

function RerouteChat({
  inFlight,
  result,
  onDismiss,
}: {
  inFlight: boolean;
  result: RerouteResult | null;
  onDismiss?: () => void;
}) {
  // Color + heading per action. The original brief was to hide `reasoning`
  // and only show `userMessage`; for the competition demo we surface
  // Gemini's reasoning behind a collapsible disclosure so judges can
  // verify real AI thinking is happening behind the decision.
  const [showReasoning, setShowReasoning] = useState(false);
  useEffect(() => {
    // Collapse the disclosure whenever a fresh result lands so the user
    // sees the headline first.
    setShowReasoning(false);
  }, [result]);
  const palette = (() => {
    if (inFlight || !result) {
      return {
        ring: 'var(--theme-border)',
        bg: 'var(--theme-surface-muted)',
        text: 'var(--theme-fg-muted)',
        dot: 'var(--theme-fg-dim)',
      };
    }
    if (result.action === 'reroute') {
      return {
        ring: 'var(--theme-accent-muted)',
        bg: 'var(--theme-accent-soft)',
        text: 'var(--theme-fg)',
        dot: 'var(--theme-accent)',
      };
    }
    if (result.action === 'wait_and_continue') {
      return {
        ring: 'color-mix(in srgb, #f59e0b 35%, transparent)',
        bg: 'color-mix(in srgb, #f59e0b 12%, var(--theme-bg))',
        text: 'var(--theme-fg)',
        dot: '#d97706',
      };
    }
    return {
      ring: 'color-mix(in srgb, #dc2626 35%, transparent)',
      bg: 'color-mix(in srgb, #dc2626 10%, var(--theme-bg))',
      text: 'var(--theme-fg)',
      dot: '#dc2626',
    };
  })();

  const heading = inFlight
    ? 'Gemini is thinking…'
    : result?.action === 'reroute'
      ? 'New route ready'
      : result?.action === 'wait_and_continue'
        ? 'Stay at this stop'
        : 'Trip cannot continue';

  return (
    <div
      className="rounded-[16px] p-4 sm:p-5"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.ring}`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
            border: `1px solid ${palette.ring}`,
            color: palette.dot,
          }}
        >
          {inFlight ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Leaf size={13} />
          )}
        </span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              Gemini · {heading}
            </div>
            {!inFlight && result && onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss agent message"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full transition-colors"
                style={{
                  border: '1px solid var(--theme-border)',
                  color: 'var(--theme-fg-muted)',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <p
            className="mt-1.5 text-[0.95rem] leading-snug"
            style={{ color: palette.text }}
          >
            {inFlight
              ? 'Locating you and checking what the next vehicle is doing…'
              : result?.userMessage}
          </p>
          {!inFlight && result && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {result.agentSource === 'gemini' ? (
                <span
                  className="theme-mono-sm inline-flex items-center gap-1.5 rounded-full px-2 py-1"
                  style={{
                    background:
                      'color-mix(in srgb, var(--theme-accent) 14%, transparent)',
                    color: 'var(--theme-accent)',
                    border: '1px solid var(--theme-accent-muted)',
                    fontSize: '0.7rem',
                  }}
                >
                  <Sparkles size={11} />
                  Decided by Gemini 2.5
                </span>
              ) : result.agentSource === 'fallback' ? (
                <span
                  className="theme-italic text-[0.75rem]"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  Routed without AI assistance (Vertex unavailable).
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setShowReasoning((prev) => !prev)}
                aria-expanded={showReasoning}
                className="theme-mono-sm inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors"
                style={{
                  color: 'var(--theme-fg-muted)',
                  border: '1px solid var(--theme-border)',
                  fontSize: '0.7rem',
                }}
              >
                {showReasoning ? 'Hide AI response' : 'Show AI response'}
                <ChevronDown
                  size={11}
                  style={{
                    transform: showReasoning ? 'rotate(180deg)' : undefined,
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
            </div>
          )}
          {!inFlight && result && showReasoning && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {result.reasoning && result.reasoning.trim().length > 0 && (
                <div
                  className="rounded-[10px] p-3"
                  style={{
                    background:
                      'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <div
                    className="theme-mono-sm"
                    style={{ color: 'var(--theme-fg-dim)', fontSize: '0.7rem' }}
                  >
                    Gemini's reasoning (summary)
                  </div>
                  <p
                    className="mt-1 text-[0.85rem] leading-snug"
                    style={{ color: 'var(--theme-fg-muted)' }}
                  >
                    {result.reasoning}
                  </p>
                </div>
              )}
              <div
                className="rounded-[10px] p-3"
                style={{
                  background:
                    'color-mix(in srgb, var(--theme-bg) 70%, transparent)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                <div
                  className="theme-mono-sm"
                  style={{ color: 'var(--theme-fg-dim)', fontSize: '0.7rem' }}
                >
                  Raw model response (JSON)
                </div>
                <pre
                  className="mt-1 overflow-x-auto text-[0.75rem] leading-snug"
                  style={{
                    color: 'var(--theme-fg-muted)',
                    fontFamily:
                      'var(--theme-font-mono, ui-monospace, monospace)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(
                    {
                      action: result.action,
                      userMessage: result.userMessage,
                      reasoning: result.reasoning,
                      agentSource: result.agentSource,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
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

function BookingRouteMapPanel({
  polyline,
  start,
  end,
  fallbackPath,
  mode,
}: {
  polyline?: string;
  start: MapPoint | null;
  end: MapPoint | null;
  fallbackPath?: MapPoint[];
  mode?: string;
}) {
  return (
    <div
      className="relative h-[200px] overflow-hidden rounded-[16px] sm:h-[260px] sm:rounded-[18px]"
      style={{
        background: 'var(--theme-map-surface, var(--theme-surface-muted))',
        border: '1px solid var(--theme-border)',
      }}
    >
      <BookingRouteMap
        polyline={polyline}
        start={start}
        end={end}
        fallbackPath={fallbackPath}
        mode={mode}
      />
    </div>
  );
}

function ItineraryStepIcon({ iconKey }: { iconKey: ItineraryIconKey }) {
  const Icon =
    iconKey === 'walk'
      ? Footprints
      : iconKey === 'train'
        ? TrainFront
        : iconKey === 'bus'
          ? Bus
          : iconKey === 'evTaxi'
            ? Car
            : Navigation;
  return <Icon size={14} style={{ color: 'var(--theme-accent)' }} />;
}

function ItineraryPanel({ rows }: { rows: ItineraryRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        § Itinerary
      </div>
      <ol
        className="flex flex-col overflow-hidden rounded-[16px] sm:rounded-[18px]"
        style={{
          background: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
        }}
      >
        {rows.map((row, idx) => (
          <li
            key={`itin-${row.index}`}
            className={`flex items-start gap-3 p-3 sm:gap-4 sm:p-4 ${idx > 0 ? 'border-t' : ''}`}
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
              style={{
                background: 'var(--theme-accent-soft)',
                border: '1px solid var(--theme-accent-muted)',
              }}
            >
              <ItineraryStepIcon iconKey={row.iconKey} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className="theme-mono-sm shrink-0"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  {String(row.index + 1).padStart(2, '0')}
                </span>
                <span
                  className="truncate text-[0.95rem] leading-snug"
                  style={{ color: 'var(--theme-fg)' }}
                >
                  {row.primary}
                </span>
              </div>
              {row.secondary && (
                <div
                  className="mt-1 truncate text-[0.88rem] leading-snug"
                  style={{ color: 'var(--theme-fg-muted)' }}
                >
                  {row.secondary}
                </div>
              )}
              {(row.detail || row.instruction) && (
                <div
                  className="theme-mono-sm mt-1 line-clamp-2"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  {row.detail}
                  {row.detail && row.instruction ? ' · ' : ''}
                  {row.instruction}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
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
