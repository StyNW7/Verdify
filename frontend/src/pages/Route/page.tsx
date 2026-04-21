import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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

export default function RoutePlannerPage() {
  const state = usePlannerState();
  const { mapVariant, routes, selectedRoute } = useRoutePlannerScene(state);
  const formSectionRef = useRef<HTMLElement | null>(null);

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
    <main
      className="relative mx-auto w-full px-6 pb-28 pt-28 lg:px-10 lg:pt-32"
      style={{ overflowAnchor: 'none', maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="landing-accent-dot" aria-hidden />
        <span className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
          § Planner — 01
        </span>
        <span className="landing-rule" aria-hidden />
        <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          Route planner
        </span>
      </div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
        className="landing-display mt-8 max-w-[22ch]"
        style={{ fontSize: 'clamp(2.8rem, 6vw, 5.6rem)', color: 'var(--landing-text)' }}
      >
        Plan a corridor crossing that keeps the map{' '}
        <span className="landing-italic" style={{ color: 'var(--landing-accent-warm)' }}>
          legible, not loud.
        </span>
      </motion.h1>

      <div className="mt-14 grid gap-12 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <section
          ref={formSectionRef}
          className="xl:sticky xl:top-28 xl:self-start"
          style={{ scrollMarginTop: '7rem' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
            className="landing-panel"
          >
            <div
              className="landing-mesh pointer-events-none absolute inset-0 opacity-60"
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
            className="mt-20 grid gap-7 xl:grid-cols-[1.35fr_0.95fr]"
          >
            <DirectionsPanel route={selectedRoute} />
            <ImpactPanel route={selectedRoute} />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
