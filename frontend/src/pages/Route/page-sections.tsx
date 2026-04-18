import { motion } from 'framer-motion';
import { Orbit, Sparkles } from 'lucide-react';

import RouteMap from '@/components/RouteMap';
import { useIsDark } from '@/components/AnimatedThemeToggler';

import {
  type PlannerState,
  LOCATION_SUGGESTIONS,
  MOCK_ROUTES,
  AdvancedOptions,
  DateTimeField,
  PreferenceSelector,
  SubmitButton,
  SwapButton,
  UnderlineInput,
  getMapVariantForRoute,
} from './shared';

export function useRoutePlannerScene(state: PlannerState) {
  const isDark = useIsDark();
  const selectedRoute =
    MOCK_ROUTES.find((route) => route.id === state.selectedRouteId) ?? MOCK_ROUTES[0];

  return {
    isDark,
    mapVariant: getMapVariantForRoute(state.selectedRouteId, isDark),
    routes: MOCK_ROUTES,
    selectedRoute,
  };
}

export function PlannerForm({
  state,
  submitLabel,
  label = '§ Inputs — 02',
}: {
  state: PlannerState;
  submitLabel?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        {label}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex flex-1 flex-col gap-6">
          <UnderlineInput
            value={state.origin}
            onChange={state.setOrigin}
            placeholder="Bukit Indah, Johor"
            label="From"
            suggestions={LOCATION_SUGGESTIONS}
          />
          <UnderlineInput
            value={state.destination}
            onChange={state.setDestination}
            placeholder="Woodlands North, Singapore"
            label="To"
            suggestions={LOCATION_SUGGESTIONS}
          />
        </div>
        <div className="flex justify-end lg:mb-1 lg:h-full lg:items-center">
          <SwapButton onClick={state.swap} />
        </div>
      </div>

      <DateTimeField
        dateSlot={state.dateSlot}
        setDateSlot={state.setDateSlot}
        pickedDate={state.pickedDate}
        setPickedDate={state.setPickedDate}
        time={state.time}
        setTime={state.setTime}
      />

      <PreferenceSelector
        preference={state.preference}
        setPreference={state.setPreference}
      />

      <AdvancedOptions state={state} />

      <SubmitButton onClick={state.submit} loading={state.loading} label={submitLabel} />
    </div>
  );
}

export function RouteMapStage({
  mapVariant,
  badge,
  note,
  className = '',
  showChips = true,
}: {
  mapVariant: 'light' | 'warm' | 'dark';
  badge: string;
  note: string;
  className?: string;
  showChips?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] ${className}`}
      style={{
        background: 'var(--landing-map-surface)',
        border: '1px solid var(--landing-border)',
        boxShadow: 'var(--landing-map-shadow)',
        backdropFilter: 'blur(24px) saturate(170%)',
        WebkitBackdropFilter: 'blur(24px) saturate(170%)',
      }}
    >
      <RouteMap variant={mapVariant} showChips={showChips} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="landing-accent-dot" aria-hidden />
          <span className="landing-mono-sm" style={{ color: 'var(--landing-text)' }}>
            {badge}
          </span>
        </div>
        <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          {note}
        </span>
      </div>
    </div>
  );
}

export function QuietEmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="rounded-[18px] p-6 md:p-8"
      style={{
        border: '1px solid var(--landing-border)',
        background: 'var(--landing-bg-soft)',
      }}
    >
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        § Awaiting inputs
      </div>
      <p
        className="landing-display mt-3 max-w-[32ch]"
        style={{
          fontSize: 'clamp(1.3rem, 2vw, 1.6rem)',
          color: 'var(--landing-text)',
        }}
      >
        {title}{' '}
        <span className="landing-italic" style={{ color: 'var(--landing-text-muted)' }}>
          {body}
        </span>
      </p>
    </motion.div>
  );
}

export function PlannerLoadingState({
  routeName,
  preference,
}: {
  routeName: string;
  preference: PlannerState['preference'];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="rounded-[18px] p-6 md:p-8"
      style={{
        border: '1px solid var(--landing-border)',
        background: 'var(--landing-surface)',
        backdropFilter: 'blur(22px) saturate(170%)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          § Mapping corridor
        </div>
        <span className="landing-mono-sm flex items-center gap-2" style={{ color: 'var(--landing-accent)' }}>
          <Orbit size={12} />
          {preference.toUpperCase()} priority
        </span>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <span
          className="landing-display"
          style={{ fontSize: 'clamp(2.2rem, 4vw, 3.1rem)', color: 'var(--landing-text)' }}
        >
          {routeName}
        </span>
        <span className="landing-italic pb-2" style={{ color: 'var(--landing-text-muted)' }}>
          is being prepared
        </span>
      </div>

      <p className="mt-4 max-w-[42ch] text-[0.95rem] leading-relaxed" style={{ color: 'var(--landing-text-muted)' }}>
        Comparing time, carbon, and cost across the corridor now so the results can expand in place instead of replacing the page.
      </p>

      <div className="mt-6 h-[3px] w-full overflow-hidden rounded-full" style={{ background: 'var(--landing-border)' }}>
        <motion.div
          initial={{ x: '-35%' }}
          animate={{ x: '115%' }}
          transition={{ duration: 1.15, repeat: Infinity, ease: 'easeInOut' }}
          className="h-full w-[35%] rounded-full"
          style={{ background: 'var(--landing-accent)', boxShadow: 'var(--landing-accent-glow)' }}
        />
      </div>
    </motion.div>
  );
}

export function PlannerLoadingDetails() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="mt-20 grid gap-7 xl:grid-cols-[1.35fr_0.95fr]"
    >
      <div className="landing-card p-6 md:p-8 lg:p-10">
        <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          § Preparing directions
        </div>
        <p
          className="landing-display mt-4 max-w-[20ch]"
          style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--landing-text)' }}
        >
          Sequencing stops, transfers, and handoff points.
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-[20px] p-6 md:p-8 lg:p-10"
        style={{
          background: 'var(--landing-cta-bg)',
          boxShadow: 'var(--landing-cta-shadow)',
          border: '1px solid var(--landing-border)',
        }}
      >
        <div className="landing-mesh" aria-hidden />
        <div className="relative">
          <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            § Preparing impact
          </div>
          <p
            className="landing-display mt-4 max-w-[16ch]"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--landing-text)' }}
          >
            Carbon, savings, and points are being composed.
          </p>
          <p className="mt-4 flex items-center gap-2 text-[0.9rem]" style={{ color: 'var(--landing-text-muted)' }}>
            <Sparkles size={14} style={{ color: 'var(--landing-accent)' }} />
            Holding the page structure steady while results settle in.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

export function PlannerIdleDetailsPlaceholder() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="mt-20 grid gap-7 xl:grid-cols-[1.35fr_0.95fr]"
    >
      <div
        className="rounded-[20px] p-6 md:p-8 lg:p-10"
        style={{
          minHeight: '21rem',
          border: '1px solid var(--landing-border)',
          background: 'var(--landing-bg-soft)',
        }}
      >
        <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          § Directions preview
        </div>
        <p
          className="landing-display mt-4 max-w-[18ch]"
          style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--landing-text)' }}
        >
          The chosen route will unfold here, step by step.
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-[20px] p-6 md:p-8 lg:p-10"
        style={{
          minHeight: '21rem',
          background: 'var(--landing-cta-bg)',
          boxShadow: 'var(--landing-cta-shadow)',
          border: '1px solid var(--landing-border)',
        }}
      >
        <div className="landing-mesh" aria-hidden />
        <div className="relative">
          <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            § Impact preview
          </div>
          <p
            className="landing-display mt-4 max-w-[15ch]"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: 'var(--landing-text)' }}
          >
            Carbon, savings, and reward impact will settle here.
          </p>
        </div>
      </div>
    </motion.section>
  );
}
