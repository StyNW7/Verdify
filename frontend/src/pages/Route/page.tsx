import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import {
  BookingActionBar,
  BookingDialog,
  buildDraftForPlanner,
} from './booking-dialog';
import type { Booking } from '@/lib/booking-draft';
import {
  DirectionsPanel,
  ImpactPanel,
  RouteResultsGrid,
  usePlannerState,
} from './shared';
import {
  PlannerForm,
  PlannerIdleDetailsPlaceholder,
  PlannerLoadingDetails,
  PlannerLoadingState,
  QuietEmptyState,
  RouteMapStage,
  useRoutePlannerScene,
} from './page-sections';
import { useUserDoc } from '@/lib/user-doc-provider';
import { initialPreferenceFromDoc } from './planner-phase';

export default function RoutePlannerPage() {
  const { doc: userDoc } = useUserDoc();
  // initialPreferenceFromDoc is called once at mount via useState's initializer
  // so subsequent doc snapshot changes never override a user's in-session choice.
  const [initialPref] = useState(() => initialPreferenceFromDoc(userDoc));
  const state = usePlannerState(initialPref);
  const { mapVariant, routes, selectedRoute } = useRoutePlannerScene(state);
  const formSectionRef = useRef<HTMLElement | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);

  const draftFromSelection = useMemo(
    () => buildDraftForPlanner(state, selectedRoute),
    [state, selectedRoute],
  );

  const openBookingDialog = useCallback(() => {
    if (draftFromSelection) setActiveBooking(draftFromSelection);
  }, [draftFromSelection]);
  const closeBookingDialog = useCallback(() => {
    if (activeBooking && activeBooking.status !== 'draft' && activeBooking.bookingId) {
      state.startJourney(activeBooking.bookingId);
    }
    setActiveBooking(null);
  }, [activeBooking, state]);

  useEffect(() => {
    if (state.phase === 'idle') return;
    const node = formSectionRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.top < 0 || rect.top > 140) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.phase]);

  return (
    <>
      <main
        className="relative mx-auto w-full px-5 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-28 lg:px-10 lg:pt-32"
        style={{ overflowAnchor: 'none', maxWidth: 'var(--page-max-w, 1280px)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="theme-accent-dot" aria-hidden />
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
            § Planner — 01
          </span>
          <span className="theme-rule" aria-hidden />
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            Route planner
          </span>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          className="theme-display mt-6 max-w-[22ch] sm:mt-8"
          style={{ fontSize: 'clamp(2.4rem, 9vw, 5.6rem)', color: 'var(--theme-fg)' }}
        >
          Plan a corridor crossing that keeps the map{' '}
          <span className="theme-italic" style={{ color: 'var(--theme-accent-warm)' }}>
            legible, not loud.
          </span>
        </motion.h1>

        <div className="mt-10 grid gap-10 sm:mt-14 sm:gap-12 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
          <section
            ref={formSectionRef}
            className="xl:sticky xl:top-28 xl:self-start"
            style={{ scrollMarginTop: '7rem' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
              className="theme-panel"
            >
              <div
                className="theme-mesh pointer-events-none absolute inset-0 opacity-60"
                aria-hidden
              />
              <div className="relative">
                <PlannerForm state={state} submitLabel="Find routes" />
              </div>
            </motion.div>
          </section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
            className="flex flex-col gap-7 lg:gap-8"
          >
            <RouteMapStage
              mapVariant={mapVariant}
              badge={
                state.phase === 'results'
                  ? `Rendering · ${selectedRoute.name}`
                  : state.phase === 'loading'
                    ? `Analyzing · ${selectedRoute.name}`
                    : 'Live corridor'
              }
              note="Johor ↔ Singapore corridor"
              className="aspect-[5/4] min-h-[320px] sm:aspect-[3/2] lg:min-h-[420px]"
              origin={state.submittedTrip?.origin}
              destination={state.submittedTrip?.destination}
              originCoords={state.submittedTrip?.originCoords ?? null}
              destCoords={state.submittedTrip?.destCoords ?? null}
              selectedRouteId={state.selectedRouteId}
              routes={routes}
            />

            <div className="min-h-[224px]">
              <AnimatePresence initial={false} mode="wait">
                {state.phase === 'idle' && (
                  <QuietEmptyState
                    key="idle"
                    title="Enter an origin and destination."
                    body="The map stays live while the route rankings wait below."
                  />
                )}

                {state.phase === 'loading' && (
                  <PlannerLoadingState
                    key="loading"
                    routeName={selectedRoute.name}
                    preference={state.preference}
                  />
                )}

                {state.phase === 'results' && (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
                  >
                    <RouteResultsGrid
                      routes={routes}
                      selectedId={state.selectedRouteId}
                      onSelect={state.setSelectedRouteId}
                    />
                    <BookingActionBar
                      state={state}
                      route={selectedRoute}
                      onBook={openBookingDialog}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </div>

        <AnimatePresence initial={false} mode="wait">
          {state.phase === 'idle' && <PlannerIdleDetailsPlaceholder key="idle-details" />}

          {state.phase === 'loading' && <PlannerLoadingDetails key="loading-details" />}

          {state.phase === 'results' && (
            <motion.section
              key="result-details"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.2, 0.7, 0.2, 1] }}
              className="mt-12 grid gap-7 sm:mt-20 xl:grid-cols-[1.35fr_0.95fr]"
            >
              <DirectionsPanel
                route={selectedRoute}
                journeyActive={state.journeyActive}
                rerouteInFlight={state.rerouteInFlight}
                rerouteCount={state.rerouteCount}
                onStartJourney={openBookingDialog}
                onMissedStop={() => state.triggerMissedStop(selectedRoute)}
              />
              <ImpactPanel route={selectedRoute} />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {activeBooking && (
          <BookingDialog
            booking={activeBooking}
            onClose={closeBookingDialog}
            onUpdate={setActiveBooking}
          />
        )}
      </AnimatePresence>
    </>
  );
}
