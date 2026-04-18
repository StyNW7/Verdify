import { useEffect, useMemo, useRef, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ArrowUpDown,
  Clock,
  Leaf,
  Zap,
  Wallet,
  Train,
  Bus,
  Bike,
  Car,
  Footprints,
  Minus,
  Plus,
  ChevronDown,
  Sparkles,
  ArrowRight,
  TreePine,
  Star,
  RefreshCw,
  CircleCheck,
} from 'lucide-react';
import {
  type PlannerPhase,
  type PlannerPreference,
  type PlannerRouteId,
  deriveSelectedRouteId,
  finishPlannerSubmission,
  startPlannerSubmission,
} from './planner-phase';

export type Preference = PlannerPreference;
export type ModeKey = 'rts' | 'lrt' | 'bus' | 'walking' | 'biking' | 'evTaxi';
export type DateSlot = 'now' | 'today' | 'tomorrow' | 'pick';

export type RouteOption = {
  id: PlannerRouteId;
  name: string;
  type: Preference;
  label: string;
  modes: string[];
  durationText: string;
  duration: number;
  co2: number;
  co2Saved: number;
  cost: number;
  points: number;
  steps: string[];
  hero: { primary: string; unit: string; caption: string };
  recommended?: boolean;
};

export const LOCATION_SUGGESTIONS = [
  'Bukit Indah, Johor',
  'Johor Bahru Sentral',
  'Skudai, Johor',
  'Danga Bay, Johor',
  'CIQ Bangunan Sultan Iskandar',
  'Woodlands North, Singapore',
  'Orchard, Singapore',
  'Raffles Place, Singapore',
  'Jurong East, Singapore',
  'Changi Airport, Singapore',
];

export const MOCK_ROUTES: RouteOption[] = [
  {
    id: 'eco',
    name: 'Green Corridor',
    type: 'eco',
    label: 'Recommended · Eco',
    modes: ['RTS Link', 'Walk', 'Bus 170'],
    durationText: '45m',
    duration: 45,
    co2: 0.8,
    co2Saved: 85,
    cost: 12.5,
    points: 150,
    recommended: true,
    hero: { primary: '0.8', unit: 'kg CO₂', caption: '85% less than driving' },
    steps: [
      'Walk 5 min to Bukit Indah RTS Station (300m)',
      'Take RTS Link to Woodlands North (20 min · 8 stops)',
      'Walk 10 min to Bus 170 stop (800m)',
      'Bus 170 to final stop (10 min)',
      'Walk 2 min to arrival',
    ],
  },
  {
    id: 'fast',
    name: 'Express',
    type: 'fast',
    label: 'Fastest',
    modes: ['GrabEV', 'RTS Link'],
    durationText: '30m',
    duration: 30,
    co2: 1.2,
    co2Saved: 70,
    cost: 18.0,
    points: 80,
    hero: { primary: '30', unit: 'minutes', caption: 'Door to door' },
    steps: [
      'Book GrabEV · 3 min wait',
      'Ride GrabEV to RTS Station (10 min)',
      'Take RTS Link to Woodlands North (15 min)',
      'Walk 2 min to arrival',
    ],
  },
  {
    id: 'cheap',
    name: 'Budget',
    type: 'cheap',
    label: 'Cheapest',
    modes: ['Public Bus'],
    durationText: '75m',
    duration: 75,
    co2: 0.5,
    co2Saved: 90,
    cost: 4.5,
    points: 200,
    hero: { primary: 'RM 4.50', unit: 'total', caption: '76% cheaper than EV taxi' },
    steps: [
      'Walk to bus stop (5 min)',
      'Bus CW1 to CIQ (25 min)',
      'Transfer to Bus 170 · 5 min wait',
      'Bus 170 to destination (35 min)',
      'Walk 5 min to arrival',
    ],
  },
];

export const MOCK_IMPACT = {
  totalSaved: 2.5,
  treesEquivalent: 0.1,
  moneySaved: 8.0,
  percentage: 85,
};

export const MODE_META: Record<ModeKey, { label: string; icon: typeof Train }> = {
  rts: { label: 'RTS Link', icon: Train },
  lrt: { label: 'LRT', icon: Train },
  bus: { label: 'Bus', icon: Bus },
  walking: { label: 'Walking', icon: Footprints },
  biking: { label: 'Biking', icon: Bike },
  evTaxi: { label: 'EV Taxi', icon: Car },
};

export type PlannerState = ReturnType<typeof usePlannerState>;

export function usePlannerState() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dateSlot, setDateSlot] = useState<DateSlot>('now');
  const [pickedDate, setPickedDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [preference, setPreference] = useState<Preference>('eco');
  const [passengers, setPassengers] = useState(1);
  const [modes, setModes] = useState<Record<ModeKey, boolean>>({
    rts: true, lrt: true, bus: true, walking: true, biking: true, evTaxi: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [phase, setPhase] = useState<PlannerPhase>('idle');
  const [selectedRouteId, setSelectedRouteId] = useState<PlannerRouteId>('eco');
  const submitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) {
        window.clearTimeout(submitTimerRef.current);
      }
    };
  }, []);

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const submit = () => {
    if (!origin.trim() || !destination.trim()) return;

    if (submitTimerRef.current) {
      window.clearTimeout(submitTimerRef.current);
    }

    const loadingState = startPlannerSubmission({
      phase,
      preference,
      selectedRouteId,
    });

    setSelectedRouteId(loadingState.selectedRouteId);
    setPhase(loadingState.phase);

    submitTimerRef.current = window.setTimeout(() => {
      const resultState = finishPlannerSubmission({
        phase: 'loading',
        selectedRouteId: loadingState.selectedRouteId,
      });

      setSelectedRouteId(resultState.selectedRouteId);
      setPhase(resultState.phase);
      submitTimerRef.current = null;
    }, 1400);
  };

  const reset = () => {
    if (submitTimerRef.current) {
      window.clearTimeout(submitTimerRef.current);
      submitTimerRef.current = null;
    }

    setPhase('idle');
    setOrigin('');
    setDestination('');
    setSelectedRouteId(deriveSelectedRouteId('eco'));
  };

  const toggleMode = (k: ModeKey) =>
    setModes(prev => ({ ...prev, [k]: !prev[k] }));

  const loading = phase === 'loading';
  const submitted = phase === 'results';

  return {
    origin, setOrigin, destination, setDestination,
    dateSlot, setDateSlot, pickedDate, setPickedDate, time, setTime,
    preference, setPreference, passengers, setPassengers,
    modes, toggleMode, showAdvanced, setShowAdvanced,
    phase, loading, submitted, selectedRouteId, setSelectedRouteId,
    swap, submit, reset,
  };
}

type UnderlineInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  suggestions?: string[];
  disabled?: boolean;
  ariaLabel?: string;
};

export const UnderlineInput = forwardRef<HTMLInputElement, UnderlineInputProps>(
  function UnderlineInput({ value, onChange, placeholder, label, suggestions, disabled, ariaLabel }, ref) {
    const [focused, setFocused] = useState(false);
    const filtered = useMemo(() => {
      if (!suggestions || !value || !focused) return [];
      return suggestions
        .filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
        .slice(0, 5);
    }, [suggestions, value, focused]);

    return (
      <div className="relative w-full">
        <label className="landing-mono-sm block" style={{ color: 'var(--landing-text-dim)' }}>
          {label}
        </label>
        <div className="relative mt-2 flex items-center gap-3">
          <MapPin size={16} style={{ color: 'var(--landing-accent)' }} className="flex-shrink-0" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel || label}
            className="w-full bg-transparent py-3 text-[1.05rem] outline-none"
            style={{
              color: 'var(--landing-text)',
              fontFamily: 'var(--landing-font-body)',
            }}
          />
        </div>
        <div
          className="relative h-px w-full overflow-hidden"
          style={{ background: 'var(--landing-border)' }}
        >
          <motion.div
            initial={false}
            animate={{ scaleX: focused || value ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-0 origin-left"
            style={{ background: 'var(--landing-accent)' }}
          />
        </div>
        <AnimatePresence>
          {filtered.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[10px]"
              style={{
                background: 'var(--landing-surface)',
                border: '1px solid var(--landing-border)',
                backdropFilter: 'blur(22px) saturate(180%)',
                boxShadow: '0 30px 60px -30px rgba(10,14,12,0.25)',
              }}
            >
              {filtered.map(s => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={() => onChange(s)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{ color: 'var(--landing-text)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--landing-accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MapPin size={12} style={{ color: 'var(--landing-text-dim)' }} />
                    {s}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

export function SwapButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileHover={{ rotate: 180 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
      style={{
        background: 'var(--landing-surface)',
        border: '1px solid var(--landing-border-strong)',
        color: 'var(--landing-text)',
        backdropFilter: 'blur(18px)',
      }}
      aria-label="Swap origin and destination"
    >
      <ArrowUpDown size={16} />
    </motion.button>
  );
}

export function DateTimeField({
  dateSlot, setDateSlot, pickedDate, setPickedDate, time, setTime,
}: Pick<PlannerState, 'dateSlot' | 'setDateSlot' | 'pickedDate' | 'setPickedDate' | 'time' | 'setTime'>) {
  const chips: { key: DateSlot; label: string }[] = [
    { key: 'now', label: 'Now' },
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'pick', label: 'Pick date' },
  ];
  return (
    <div className="w-full">
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        Departure
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.map(c => {
          const active = dateSlot === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setDateSlot(c.key)}
              className="landing-mono-sm relative rounded-full px-4 py-2 transition-colors"
              style={{
                background: active ? 'var(--landing-accent)' : 'transparent',
                color: active ? 'var(--landing-button-foreground)' : 'var(--landing-text-muted)',
                border: `1px solid ${active ? 'var(--landing-accent)' : 'var(--landing-border)'}`,
              }}
            >
              {c.label}
            </button>
          );
        })}
        {dateSlot === 'pick' && (
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            className="landing-mono-sm bg-transparent px-3 py-2 outline-none"
            style={{
              color: 'var(--landing-text)',
              border: '1px solid var(--landing-border)',
              borderRadius: 999,
            }}
          />
        )}
        {dateSlot !== 'now' && (
          <div
            className="flex items-center gap-2 rounded-full px-3.5 py-2"
            style={{ border: '1px solid var(--landing-border)' }}
          >
            <Clock size={12} style={{ color: 'var(--landing-text-dim)' }} />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="landing-mono-sm bg-transparent outline-none"
              style={{ color: 'var(--landing-text)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const PREF_META: Record<Preference, { label: string; tagline: string; icon: typeof Leaf }> = {
  eco: { label: 'Eco First', tagline: 'Lowest emissions, highest points.', icon: Leaf },
  fast: { label: 'Fastest', tagline: 'Minutes over everything.', icon: Zap },
  cheap: { label: 'Cheapest', tagline: 'Ringgit before anything else.', icon: Wallet },
};

export function PreferenceSelector({
  preference, setPreference,
}: Pick<PlannerState, 'preference' | 'setPreference'>) {
  const order: Preference[] = ['eco', 'fast', 'cheap'];
  return (
    <div className="w-full">
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        § Preference — 02
      </div>
      <div
        className="mt-3 grid grid-cols-3 overflow-hidden rounded-full sm:hidden"
        style={{ border: '1px solid var(--landing-border)' }}
      >
        {order.map(p => {
          const m = PREF_META[p];
          const Icon = m.icon;
          const active = preference === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPreference(p)}
              className="landing-mono-sm flex items-center justify-center gap-1.5 py-2.5 transition-colors"
              style={{
                background: active ? 'var(--landing-accent)' : 'transparent',
                color: active ? 'var(--landing-button-foreground)' : 'var(--landing-text-muted)',
              }}
            >
              <Icon size={13} />
              {m.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4 hidden gap-4 sm:grid sm:grid-cols-3">
        {order.map(p => {
          const m = PREF_META[p];
          const Icon = m.icon;
          const active = preference === p;
          return (
            <motion.button
              key={p}
              type="button"
              onClick={() => setPreference(p)}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="landing-card group relative flex flex-col items-start gap-3 p-5 text-left"
              style={{
                borderColor: active ? 'var(--landing-accent)' : 'var(--landing-border)',
                boxShadow: active
                  ? '0 0 0 1px var(--landing-accent), 0 18px 45px -22px var(--landing-accent)'
                  : undefined,
              }}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: active ? 'var(--landing-accent)' : 'var(--landing-accent-soft)',
                    color: active ? 'var(--landing-button-foreground)' : 'var(--landing-accent)',
                  }}
                >
                  <Icon size={15} />
                </span>
                {active && <span className="landing-accent-dot" aria-hidden />}
              </div>
              <div className="landing-display text-[1.15rem]" style={{ color: 'var(--landing-text)' }}>
                {m.label}
              </div>
              <div className="text-[0.78rem] leading-snug" style={{ color: 'var(--landing-text-muted)' }}>
                {m.tagline}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export function PassengerStepper({
  passengers, setPassengers,
}: Pick<PlannerState, 'passengers' | 'setPassengers'>) {
  const min = 1, max = 8;
  return (
    <div>
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        Passengers
      </div>
      <div
        className="mt-3 inline-flex items-center gap-4 rounded-full px-2 py-2"
        style={{ border: '1px solid var(--landing-border)' }}
      >
        <button
          type="button"
          onClick={() => setPassengers(Math.max(min, passengers - 1))}
          disabled={passengers <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: 'var(--landing-text)' }}
          aria-label="Decrease passengers"
        >
          <Minus size={14} />
        </button>
        <span
          className="min-w-[2ch] text-center tabular-nums"
          style={{
            fontFamily: 'var(--landing-font-display)',
            fontSize: '1.2rem',
            color: 'var(--landing-text)',
          }}
        >
          {passengers}
        </span>
        <button
          type="button"
          onClick={() => setPassengers(Math.min(max, passengers + 1))}
          disabled={passengers >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: 'var(--landing-text)' }}
          aria-label="Increase passengers"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export function ModeChips({
  modes, toggleMode,
}: Pick<PlannerState, 'modes' | 'toggleMode'>) {
  const keys = Object.keys(MODE_META) as ModeKey[];
  return (
    <div>
      <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        Allowed modes
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {keys.map(k => {
          const m = MODE_META[k];
          const Icon = m.icon;
          const on = modes[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleMode(k)}
              className="landing-mono-sm flex items-center gap-1.5 rounded-full px-3.5 py-2 transition-all"
              style={{
                background: on ? 'var(--landing-accent-soft)' : 'transparent',
                color: on ? 'var(--landing-accent)' : 'var(--landing-text-dim)',
                border: `1px solid ${on ? 'var(--landing-accent-muted)' : 'var(--landing-border)'}`,
                opacity: on ? 1 : 0.7,
              }}
            >
              <Icon size={12} />
              {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdvancedOptions({ state }: { state: PlannerState }) {
  return (
    <div>
      <button
        type="button"
        onClick={() => state.setShowAdvanced(!state.showAdvanced)}
        className="landing-mono-sm flex items-center gap-2 transition-colors"
        style={{ color: 'var(--landing-text-muted)' }}
      >
        <span>§ Advanced — 03</span>
        <motion.span
          animate={{ rotate: state.showAdvanced ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown size={12} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {state.showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 flex flex-col gap-6 rounded-[18px] p-6"
              style={{
                background: 'var(--landing-surface-alt)',
                border: '1px solid var(--landing-border)',
                backdropFilter: 'blur(18px) saturate(160%)',
              }}
            >
              <PassengerStepper passengers={state.passengers} setPassengers={state.setPassengers} />
              <ModeChips modes={state.modes} toggleMode={state.toggleMode} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubmitButton({
  onClick, loading, label = 'Find routes',
}: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.currentTarget.blur();
        onClick();
      }}
      disabled={loading}
      className="landing-btn-primary h-14 w-full justify-center disabled:opacity-70"
    >
      {loading ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          Mapping corridor…
        </>
      ) : (
        <>
          <Sparkles size={14} />
          {label}
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

export function getMapVariantForRoute(id: string, isDark: boolean): 'light' | 'warm' | 'dark' {
  if (isDark) return 'dark';
  if (id === 'fast') return 'warm';
  return 'light';
}

export function RouteCard({
  route, selected, onSelect, emphasized,
}: {
  route: RouteOption;
  selected: boolean;
  onSelect: () => void;
  emphasized?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      className="landing-card group relative flex h-full flex-col items-start gap-5 p-6 md:p-7 text-left"
      style={{
        borderColor: selected ? 'var(--landing-accent)' : 'var(--landing-border)',
        boxShadow: selected
          ? '0 0 0 1px var(--landing-accent), 0 30px 60px -30px var(--landing-accent)'
          : undefined,
      }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {route.recommended && <span className="landing-accent-dot" aria-hidden />}
          <span className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
            § {route.label}
          </span>
        </div>
        {selected && (
          <CircleCheck size={16} style={{ color: 'var(--landing-accent)' }} />
        )}
      </div>

      <div className="flex w-full flex-col">
        <div
          className="landing-display leading-none"
          style={{
            fontSize: emphasized ? 'clamp(3.2rem, 5.5vw, 4.6rem)' : 'clamp(2.4rem, 4vw, 3.3rem)',
            color: 'var(--landing-text)',
          }}
        >
          {route.hero.primary}
        </div>
        <div
          className="landing-italic mt-1"
          style={{
            color: 'var(--landing-text-muted)',
            fontSize: emphasized ? '1.15rem' : '1rem',
          }}
        >
          {route.hero.unit}
        </div>
        <p className="mt-2 text-[0.82rem]" style={{ color: 'var(--landing-text-muted)' }}>
          {route.hero.caption}
        </p>
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--landing-border)' }}
      />

      <div className="grid w-full grid-cols-3 gap-4">
        <MiniStat label="Time" value={route.durationText} />
        <MiniStat label="CO₂" value={`${route.co2}kg`} accent />
        <MiniStat label="Cost" value={`RM ${route.cost.toFixed(1)}`} />
      </div>

      <div className="flex flex-wrap gap-2">
        {route.modes.map((m, i) => (
          <span
            key={i}
            className="landing-mono-sm rounded-full px-2.5 py-1.5"
            style={{
              background: 'var(--landing-accent-soft)',
              color: 'var(--landing-accent)',
              border: '1px solid var(--landing-accent-muted)',
            }}
          >
            {m}
          </span>
        ))}
      </div>

      <div
        className="mt-auto flex w-full items-center justify-between pt-1"
        style={{ color: 'var(--landing-text-muted)' }}
      >
        <span className="landing-mono-sm flex items-center gap-1.5">
          <Star size={11} style={{ color: 'var(--landing-accent-warm)' }} />
          +{route.points} pts
        </span>
        <span
          className="landing-mono-sm flex items-center gap-1 transition-colors"
          style={{ color: selected ? 'var(--landing-accent)' : 'var(--landing-text-muted)' }}
        >
          {selected ? 'Selected' : 'Select'}
          <ArrowRight size={11} />
        </span>
      </div>
    </motion.button>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--landing-font-display)',
          fontSize: '1.05rem',
          color: accent ? 'var(--landing-accent)' : 'var(--landing-text)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function DirectionsPanel({ route }: { route: RouteOption }) {
  return (
    <div className="landing-card p-6 md:p-8 lg:p-10">
      <div className="flex items-center justify-between">
        <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
          § Step-by-Step — Directions
        </div>
        <div className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
          {route.steps.length} stops
        </div>
      </div>

      <h3
        className="landing-display mt-3"
        style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', color: 'var(--landing-text)' }}
      >
        {route.name}{' '}
        <span className="landing-italic" style={{ color: 'var(--landing-text-muted)' }}>
          — {route.durationText}
        </span>
      </h3>

      <ol className="mt-8 flex flex-col gap-5">
        {route.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-4">
            <div className="relative flex flex-col items-center">
              <span
                className="landing-mono-sm flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: 'var(--landing-accent-soft)',
                  color: 'var(--landing-accent)',
                  border: '1px solid var(--landing-accent-muted)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {i < route.steps.length - 1 && (
                <span
                  className="mt-1 h-full min-h-[1.25rem] w-px flex-1"
                  style={{ background: 'var(--landing-border)' }}
                />
              )}
            </div>
            <p
              className="flex-1 pt-1 text-[0.95rem] leading-relaxed"
              style={{ color: 'var(--landing-text)' }}
            >
              {s}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="landing-btn-primary">
          Start journey
          <ArrowRight size={14} />
        </button>
        <button className="landing-btn-ghost">Save route</button>
      </div>
    </div>
  );
}

export function ImpactPanel({ route }: { route: RouteOption }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 md:p-8 lg:p-10"
      style={{
        background: 'var(--landing-cta-bg)',
        boxShadow: 'var(--landing-cta-shadow)',
        border: '1px solid var(--landing-border)',
      }}
    >
      <div className="landing-mesh" aria-hidden />
      <div className="relative flex flex-col gap-7">
        <div className="flex items-center justify-between">
          <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            § Impact — Your Trip
          </div>
          <Leaf size={14} style={{ color: 'var(--landing-accent)' }} />
        </div>

        <div>
          <div className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
            CO₂ saved
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="landing-display"
              style={{
                fontSize: 'clamp(2.6rem, 4.4vw, 3.8rem)',
                color: 'var(--landing-accent)',
                letterSpacing: '-0.04em',
              }}
            >
              {MOCK_IMPACT.totalSaved}
            </span>
            <span className="landing-italic" style={{ color: 'var(--landing-text-muted)' }}>
              kg
            </span>
          </div>
          <div
            className="mt-3 h-[3px] w-full overflow-hidden rounded-full"
            style={{ background: 'var(--landing-border)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${MOCK_IMPACT.percentage}%` }}
              transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
              className="h-full rounded-full"
              style={{ background: 'var(--landing-accent)', boxShadow: 'var(--landing-accent-glow)' }}
            />
          </div>
          <div className="landing-mono-sm mt-2" style={{ color: 'var(--landing-text-dim)' }}>
            {MOCK_IMPACT.percentage}% below solo-drive baseline
          </div>
        </div>

        <div
          className="flex items-center gap-3 border-y py-4"
          style={{ borderColor: 'var(--landing-border)' }}
        >
          <TreePine size={22} style={{ color: 'var(--landing-accent)' }} />
          <div className="flex-1">
            <div className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
              Equivalent to
            </div>
            <div
              className="landing-display"
              style={{ fontSize: '1.4rem', color: 'var(--landing-text)' }}
            >
              {MOCK_IMPACT.treesEquivalent}{' '}
              <span className="landing-italic" style={{ color: 'var(--landing-text-muted)' }}>
                trees planted
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
              Green points
            </div>
            <div
              className="landing-display mt-1"
              style={{ fontSize: '1.6rem', color: 'var(--landing-text)' }}
            >
              +{route.points}
            </div>
          </div>
          <div>
            <div className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
              You save
            </div>
            <div
              className="landing-display mt-1"
              style={{ fontSize: '1.6rem', color: 'var(--landing-text)' }}
            >
              RM {MOCK_IMPACT.moneySaved.toFixed(2)}
            </div>
          </div>
        </div>

        <p
          className="landing-italic text-[0.92rem] leading-snug"
          style={{ color: 'var(--landing-text-muted)' }}
        >
          Five days a week on this corridor saves roughly 500 kg of CO₂ annually.
        </p>
      </div>
    </div>
  );
}

export function RouteResultsGrid({
  routes, selectedId, onSelect,
}: {
  routes: RouteOption[];
  selectedId: PlannerRouteId;
  onSelect: (id: PlannerRouteId) => void;
}) {
  const recommended = routes.find(r => r.recommended) ?? routes[0];
  const others = routes.filter(r => r.id !== recommended.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.24fr_0.76fr]">
      <RouteCard
        route={recommended}
        selected={selectedId === recommended.id}
        onSelect={() => onSelect(recommended.id)}
        emphasized
      />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
        {others.map(r => (
          <RouteCard
            key={r.id}
            route={r}
            selected={selectedId === r.id}
            onSelect={() => onSelect(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function TripSummaryStrip({ state, compact }: { state: PlannerState; compact?: boolean }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] px-5 py-4 md:px-6"
      style={{
        background: 'var(--landing-surface)',
        border: '1px solid var(--landing-border)',
        backdropFilter: 'blur(22px) saturate(170%)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="landing-accent-dot" aria-hidden />
        <span
          className="landing-display"
          style={{ fontSize: compact ? '1.05rem' : '1.15rem', color: 'var(--landing-text)' }}
        >
          {state.origin || 'Origin'}
        </span>
        <ArrowRight size={14} style={{ color: 'var(--landing-text-dim)' }} />
        <span
          className="landing-display"
          style={{ fontSize: compact ? '1.05rem' : '1.15rem', color: 'var(--landing-text)' }}
        >
          {state.destination || 'Destination'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
          {state.passengers} pax · {state.preference.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={state.reset}
          className="landing-mono-sm landing-link-underline"
          style={{ color: 'var(--landing-accent)' }}
        >
          <RefreshCw size={11} /> New search
        </button>
      </div>
    </div>
  );
}
