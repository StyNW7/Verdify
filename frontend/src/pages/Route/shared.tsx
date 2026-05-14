import { useMemo, useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  MapPin,
  ArrowUpDown,
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
  Loader2,
} from 'lucide-react';
import {
  type PlannerPhase,
  type PlannerPreference,
  type PlannerRouteId,
  deriveSelectedRouteId,
  finishPlannerSubmission,
  startPlannerSubmission,
} from './planner-phase';
import {
  calculateRoute,
  rerouteBooking,
  type BackendLocation,
  type BackendRouteOption,
  type RerouteResult,
  type RouteMode,
} from '@/lib/api';
import type { ConfirmedBooking } from '@/lib/booking-draft';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';

export type Preference = PlannerPreference;
export type ModeKey = 'rts' | 'lrt' | 'bus' | 'walking' | 'biking' | 'evTaxi';

export type RouteOption = {
  id: PlannerRouteId;
  backendRouteId: string; // the actual route_{uuid} stored by the backend
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
  polyline?: string;
  recommended?: boolean;
  reasoning: string;
  recommendedFor: string[];
  dataSource?: 'google_routes' | 'fallback_synthetic';
  // When another route is effectively the same (e.g. eco & cheap both walk),
  // the leader card lists the IDs it absorbed. Absorbed cards are filtered
  // out of the grid by groupConvergent().
  convergesWith?: PlannerRouteId[];
  // The original backend payload, kept verbatim so booking confirmation can
  // POST the route snapshot without round-tripping through the volatile
  // server-side routes map. Absent for mock routes.
  backendOption?: BackendRouteOption;
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
    backendRouteId: '',
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
    reasoning: 'Lowest CO₂; the rail leg saves emissions even with a longer total time.',
    recommendedFor: ['carbon-conscious'],
  },
  {
    id: 'fast',
    backendRouteId: '',
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
    reasoning: 'Direct EV taxi keeps door-to-door under 35 min, at higher fare and emissions.',
    recommendedFor: ['time-critical trips'],
  },
  {
    id: 'cheap',
    backendRouteId: '',
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
    reasoning: 'Public buses with one transfer — slowest but cheapest by a wide margin.',
    recommendedFor: ['tight budget'],
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

const ROUTE_NAME_BY_ID: Record<PlannerRouteId, string> = {
  eco: 'Green Corridor',
  fast: 'Express',
  cheap: 'Budget',
};

const ROUTE_LABEL_BY_ID: Record<PlannerRouteId, string> = {
  eco: 'Recommended · Eco',
  fast: 'Fastest',
  cheap: 'Cheapest',
};

export const ROUTE_SHORT_LABEL: Record<PlannerRouteId, string> = {
  eco: 'Eco',
  fast: 'Fast',
  cheap: 'Cheap',
};

const TRANSPORT_LABELS: Record<string, string> = {
  walking: 'Walk',
  bus: 'Bus',
  rts: 'RTS Link',
  lrt: 'LRT',
  ev_taxi: 'EV Taxi',
  evTaxi: 'EV Taxi',
};

const LOCATION_COORDINATES: Record<string, BackendLocation> = {
  'bukit indah, johor': { latitude: 1.4838, longitude: 103.6604 },
  'johor bahru sentral': { latitude: 1.4624, longitude: 103.7643 },
  'skudai, johor': { latitude: 1.5378, longitude: 103.6564 },
  'danga bay, johor': { latitude: 1.4708, longitude: 103.7245 },
  'ciq bangunan sultan iskandar': { latitude: 1.4626, longitude: 103.7638 },
  'woodlands north, singapore': { latitude: 1.4482, longitude: 103.7857 },
  'orchard, singapore': { latitude: 1.3048, longitude: 103.8318 },
  'raffles place, singapore': { latitude: 1.2831, longitude: 103.8515 },
  'jurong east, singapore': { latitude: 1.3332, longitude: 103.7423 },
  'changi airport, singapore': { latitude: 1.3644, longitude: 103.9915 },
};

function normalizeLocationKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseCoordinateInput(value: string): BackendLocation | null {
  const match = value.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  const latitude = Number(match[1]);
  const longitude = Number(match[3]);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}

function resolveLocationInput(value: string): BackendLocation | null {
  const directCoords = parseCoordinateInput(value);
  if (directCoords) return directCoords;

  const key = normalizeLocationKey(value);
  if (LOCATION_COORDINATES[key]) return LOCATION_COORDINATES[key];

  for (const [name, coords] of Object.entries(LOCATION_COORDINATES)) {
    if (key.includes(name) || name.includes(key)) {
      return coords;
    }
  }
  return null;
}

function getTransportLabel(type: string) {
  return TRANSPORT_LABELS[type] ?? type.replace(/_/g, ' ');
}

function shortenLabel(s: string | undefined): string | undefined {
  if (!s) return s;
  const first = s.split(',')[0]?.trim();
  return first || s;
}

function renderStep(
  step: BackendRouteOption['steps'][number],
  index: number,
  all: BackendRouteOption['steps'],
  destinationLabel?: string,
): string {
  const dur = Math.max(1, Math.round(step.duration));
  const distKm = step.distance.toFixed(1);
  const isLast = index === all.length - 1;
  const next = all[index + 1];
  const dest = shortenLabel(destinationLabel?.trim());

  if (step.type === 'walking') {
    // Highest priority on the final walk: name the actual destination.
    if (isLast) {
      const label = dest ? `Walk to ${dest}` : 'Walk to destination';
      return `${label} · ${dur} min (${distKm} km)`;
    }
    // If a transit ride follows, the station name is the most useful label.
    if (next && next.type !== 'walking' && next.departureStop) {
      return `Walk to ${next.departureStop} · ${dur} min (${distKm} km)`;
    }
    // Otherwise prefer Google's turn-by-turn instruction text.
    if (step.instruction) {
      return `${step.instruction} · ${dur} min (${distKm} km)`;
    }
    return `Walk · ${dur} min (${distKm} km)`;
  }

  if (step.transitLine) {
    const toward = step.headsign
      ? ` toward ${step.headsign}`
      : step.arrivalStop
        ? ` to ${step.arrivalStop}`
        : '';
    const stops = step.stopCount ? ` · ${step.stopCount} stop${step.stopCount === 1 ? '' : 's'}` : '';
    return `${step.transitLine}${toward}${stops} · ${dur} min (${distKm} km)`;
  }

  // EV taxi / synthetic bus — name the trip destination if we can.
  if (step.type === 'ev_taxi' || step.type === 'evTaxi') {
    const label = dest ? `EV Taxi to ${dest}` : 'EV Taxi';
    return `${label} · ${dur} min (${distKm} km)`;
  }
  if (step.type === 'bus' && dest) {
    return `Bus toward ${dest} · ${dur} min (${distKm} km)`;
  }
  return `${getTransportLabel(step.type)} · ${dur} min (${distKm} km)`;
}

function toRouteOption(option: BackendRouteOption, destinationLabel?: string): RouteOption {
  const id: PlannerRouteId = option.mode;
  const totalDuration = Math.max(1, Math.round(option.totalDuration));
  const distinctModes = Array.from(new Set(option.steps.map((step) => getTransportLabel(step.type))));
  const steps = option.steps.map((step, i, all) => renderStep(step, i, all, destinationLabel));
  if (steps.length === 0) steps.push('No detailed segments available from planner.');

  const hero =
    id === 'eco'
      ? {
          primary: option.carbonEstimateKg.toFixed(2),
          unit: 'kg CO2',
          caption: `${option.carbonSavingsPercent}% less than driving baseline`,
        }
      : id === 'fast'
        ? {
            primary: String(totalDuration),
            unit: 'minutes',
            caption: 'Estimated door-to-door',
          }
        : {
            primary: `RM ${option.estimatedCost.toFixed(2)}`,
            unit: 'total',
            caption: 'Estimated fare total',
          };

  return {
    id,
    backendRouteId: option.routeId,
    name: ROUTE_NAME_BY_ID[id],
    type: id,
    label: ROUTE_LABEL_BY_ID[id],
    modes: distinctModes,
    durationText: `${totalDuration}m`,
    duration: totalDuration,
    co2: option.carbonEstimateKg,
    co2Saved: option.carbonSavingsPercent,
    cost: option.estimatedCost,
    points: option.greenPointsEstimate,
    steps,
    hero,
    polyline: option.polyline,
    recommended: option.recommended,
    reasoning: option.reasoning,
    recommendedFor: option.recommendedFor,
    dataSource: option.dataSource,
    backendOption: option,
  };
}

// optionsConverge tests whether two route options are effectively
// identical from a user's perspective. Used to merge eco/cheap cards
// for short trips where they collapse to the same walking-only route.
function optionsConverge(a: RouteOption, b: RouteOption): boolean {
  const durDelta = Math.abs(a.duration - b.duration) / Math.max(a.duration, b.duration, 1);
  const co2Delta = Math.abs(a.co2 - b.co2) / Math.max(a.co2, b.co2, 0.1);
  const costDelta = Math.abs(a.cost - b.cost);
  const aTypes = a.modes.join('|');
  const bTypes = b.modes.join('|');
  return durDelta < 0.1 && (co2Delta < 0.1 || (a.co2 < 0.5 && b.co2 < 0.5)) && costDelta < 1 && aTypes === bTypes;
}

// groupConvergent merges visually-identical routes. The leader keeps full
// rendering; absorbed ones are dropped from the slice. Leader preference:
// recommended option first, then fixed order (fast, eco, cheap).
function groupConvergent(routes: RouteOption[]): RouteOption[] {
  const groups: RouteOption[][] = [];
  for (const r of routes) {
    const existing = groups.find((g) => optionsConverge(g[0], r));
    if (existing) existing.push(r);
    else groups.push([r]);
  }
  return groups.map((g) => {
    if (g.length === 1) return g[0];
    const leaderIdx = Math.max(0, g.findIndex((o) => o.recommended));
    const leader = g[leaderIdx];
    const others = g.filter((_, i) => i !== leaderIdx);
    return { ...leader, convergesWith: others.map((o) => o.id) };
  });
}

export type PlannerState = ReturnType<typeof usePlannerState>;

export type ResolvedCoords = { latitude: number; longitude: number } | null;

// Snapshot of the inputs at the moment the last successful submit happened.
// The map renders from this, not from the live `origin`/`destination` typing
// state, so the map only refreshes on Find routes.
export type SubmittedTrip = {
  origin: string;
  destination: string;
  originCoords: ResolvedCoords;
  destCoords: ResolvedCoords;
} | null;

export function usePlannerState(initialPreference: Preference = 'eco') {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState<ResolvedCoords>(null);
  const [destCoords, setDestCoords] = useState<ResolvedCoords>(null);
  const [preference, setPreference] = useState<Preference>(initialPreference);
  const [passengers, setPassengers] = useState(1);
  const [modes, setModes] = useState<Record<ModeKey, boolean>>({
    rts: true, lrt: true, bus: true, walking: true, biking: true, evTaxi: true,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [phase, setPhase] = useState<PlannerPhase>('idle');
  const [selectedRouteId, setSelectedRouteId] = useState<PlannerRouteId>('eco');
  const [routes, setRoutes] = useState<RouteOption[]>(MOCK_ROUTES);
  const [submittedTrip, setSubmittedTrip] = useState<SubmittedTrip>(null);

  const handleSetOrigin = (v: string) => {
    setOrigin(v);
    setOriginCoords(null);
  };
  const handleSetDestination = (v: string) => {
    setDestination(v);
    setDestCoords(null);
  };

  const swap = () => {
    setOrigin(destination);
    setDestination(origin);
    setOriginCoords(destCoords);
    setDestCoords(originCoords);
  };

  const submit = async () => {
    if (!origin.trim() || !destination.trim()) {
      toast.error('Please provide both origin and destination.');
      return;
    }
    const resolvedOrigin = originCoords ?? resolveLocationInput(origin);
    const resolvedDestination = destCoords ?? resolveLocationInput(destination);
    if (!resolvedOrigin || !resolvedDestination) {
      toast.error('Use a suggested location or input coordinates as "lat,lng".');
      return;
    }
    const loadingState = startPlannerSubmission({
      phase, preference, selectedRouteId,
    });
    setSelectedRouteId(loadingState.selectedRouteId);
    setPhase(loadingState.phase);

    // Map the user's preference -> mode hint, OR omit to let Gemini pick.
    // For now we always omit to exercise the batched ranker; the
    // PreferenceSelector value still drives the default-selected card.
    const userMode: RouteMode | undefined = undefined;

    try {
      const response = await calculateRoute({
        origin: resolvedOrigin,
        destination: resolvedDestination,
        mode: userMode,
        passengers,
      });
      // Build a short, human-friendly destination label for step rendering.
      // Prefer the user's typed value (which Places autocomplete fills with
      // the picked place's full text); fall back to the address from the
      // resolved Place Details payload if available.
      const destinationLabel =
        destination.trim() ||
        (resolvedDestination as { address?: string }).address ||
        '';
      const mappedRoutes = groupConvergent(
        response.options.map((opt) => toRouteOption(opt, destinationLabel)),
      );
      setRoutes(mappedRoutes);
      // Snapshot the inputs that produced these routes so the map renders
      // from a stable submission, not the live typing state.
      setSubmittedTrip({
        origin,
        destination,
        originCoords: resolvedOrigin,
        destCoords: resolvedDestination,
      });
      // Pick the selected route: prefer recommended, else the preference-derived id.
      // If the preference-derived id was absorbed by convergence, fall back to the
      // first leader so we always select an actually-rendered card.
      const rec = mappedRoutes.find((r) => r.recommended);
      const preferredStillVisible = mappedRoutes.some((r) => r.id === loadingState.selectedRouteId);
      const nextSelected = rec
        ? rec.id
        : preferredStillVisible
          ? loadingState.selectedRouteId
          : mappedRoutes[0]?.id ?? loadingState.selectedRouteId;
      const resultState = finishPlannerSubmission({
        phase: 'loading',
        selectedRouteId: nextSelected,
      });
      setSelectedRouteId(resultState.selectedRouteId);
      setPhase(resultState.phase);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to calculate routes. Please try again.';
      toast.error(message);
      setPhase('idle');
    }
  };

  const reset = () => {
    setPhase('idle');
    setOrigin('');
    setDestination('');
    setOriginCoords(null);
    setDestCoords(null);
    setSelectedRouteId(deriveSelectedRouteId('eco'));
    setRoutes(MOCK_ROUTES);
    setSubmittedTrip(null);
  };

  const toggleMode = (k: ModeKey) =>
    setModes(prev => ({ ...prev, [k]: !prev[k] }));

  const loading = phase === 'loading';
  const submitted = phase === 'results';

  // Journey + reroute state ─────────────────────────────────────────────────
  // The latest agent response is surfaced in-dialog as a chat bubble
  // (booking-dialog.tsx::JourneyPane). We no longer toast successes; only
  // transport/permission failures keep their toast.
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [rerouteInFlight, setRerouteInFlight] = useState(false);
  const [rerouteCount, setRerouteCount] = useState(0);
  const [lastRerouteResult, setLastRerouteResult] =
    useState<RerouteResult | null>(null);

  const startJourney = (id: string) => {
    setBookingId(id);
    setRerouteCount(0);
    setLastRerouteResult(null);
  };

  const clearRerouteResult = () => setLastRerouteResult(null);

  // The reroute payload's currentLocation is the missed step's startLocation,
  // not the user's device GPS. For a prototype tested off-route, GPS produces
  // synthetic distances in the hundreds of km; the booked step's coordinates
  // keep the recompute meaningful. Production may want to swap this for real
  // GPS — keep the signature so callers control which location to send.
  const triggerMissedStop = async (
    route: RouteOption,
    currentLocation: BackendLocation,
    onBookingUpdate?: (patch: Partial<ConfirmedBooking>) => void,
  ) => {
    if (!bookingId || rerouteInFlight) return;
    setRerouteInFlight(true);
    try {
      const result = await rerouteBooking(bookingId, {
        currentLocation,
        reason: 'missed_stop',
      });

      setRerouteCount((prev) => prev + 1);
      setLastRerouteResult(result);

      if (result.action === 'reroute' && result.newRoute) {
        // Use the user's typed destination as the step-label hint, not
        // `route.name` (which is "Budget"/"Express"/"Green Corridor" and
        // leaks into final-walk labels like "Walk to Budget").
        const label = destination.trim() || route.name;
        const newOpt = toRouteOption(result.newRoute, label);
        setRoutes((prev) => prev.map((r) => (r.id === route.id ? newOpt : r)));
        // Propagate the server-authoritative reset so the dialog re-renders
        // with the new snapshot and step 0 from the same write.
        if (result.journeyProgress) {
          onBookingUpdate?.({
            routeSnapshot: result.newRoute,
            journeyProgress: result.journeyProgress,
          });
        }
      }
    } catch {
      toast.error('Could not reach the server. Please try again.');
    } finally {
      setRerouteInFlight(false);
    }
  };

  return {
    origin, setOrigin: handleSetOrigin, destination, setDestination: handleSetDestination,
    originCoords, setOriginCoords, destCoords, setDestCoords,
    preference, setPreference, passengers, setPassengers,
    modes, toggleMode, showAdvanced, setShowAdvanced,
    phase, loading, submitted, selectedRouteId, setSelectedRouteId,
    routes, setRoutes, submittedTrip,
    bookingId, setBookingId, startJourney,
    rerouteInFlight, rerouteCount,
    lastRerouteResult, clearRerouteResult,
    triggerMissedStop,
    swap, submit, reset,
  };
}

type UnderlineInputProps = {
  value: string;
  onChange: (v: string) => void;
  onCoordSelect?: (lat: number, lng: number) => void;
  placeholder: string;
  label: string;
  suggestions?: string[];
  disabled?: boolean;
  ariaLabel?: string;
};

export const UnderlineInput = forwardRef<HTMLInputElement, UnderlineInputProps>(
  function UnderlineInput({ value, onChange, onCoordSelect, placeholder, label, suggestions, disabled, ariaLabel }, ref) {
    const [focused, setFocused] = useState(false);

    const { predictions, loading: geocodeLoading, resolvePlace } = usePlacesAutocomplete(value, focused);
    const showGeocode = focused && predictions.length > 0;

    const staticFiltered = useMemo(() => {
      if (!suggestions || !value || !focused) return [];
      return suggestions
        .filter(s => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
        .slice(0, 5);
    }, [suggestions, value, focused]);

    const showStatic = focused && staticFiltered.length > 0 && !showGeocode;

    return (
      <div className="relative w-full">
        <label className="theme-mono-sm block" style={{ color: 'var(--theme-fg-dim)' }}>
          {label}
        </label>
        <div className="relative mt-2 flex items-center gap-3">
          <MapPin size={16} style={{ color: 'var(--theme-accent)' }} className="flex-shrink-0" />
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={ariaLabel || label}
            className="w-full bg-transparent py-3 text-[1.05rem] outline-none"
            style={{
              color: 'var(--theme-fg)',
              fontFamily: 'var(--theme-font-body)',
            }}
          />
          {geocodeLoading && focused && (
            <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: 'var(--theme-fg-dim)' }} />
          )}
        </div>
        <div
          className="relative h-px w-full overflow-hidden"
          style={{ background: 'var(--theme-border)' }}
        >
          <motion.div
            initial={false}
            animate={{ scaleX: focused || value ? 1 : 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
            className="absolute inset-0 origin-left"
            style={{ background: 'var(--theme-accent)' }}
          />
        </div>
        <AnimatePresence>
          {showGeocode && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[10px]"
              style={{
                background: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                backdropFilter: 'blur(22px) saturate(180%)',
                boxShadow: '0 30px 60px -30px rgba(10,14,12,0.25)',
              }}
            >
              {predictions.map((p) => (
                <li key={p.placeId}>
                  <button
                    type="button"
                    onMouseDown={async () => {
                      onChange(p.fullText);
                      const loc = await resolvePlace(p.placeId);
                      if (loc) onCoordSelect?.(loc.latitude, loc.longitude);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{ color: 'var(--theme-fg)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={12} style={{ color: 'var(--theme-fg-dim)' }} />
                      {p.primaryText}
                    </span>
                    {p.secondaryText && (
                      <span className="pl-5 text-xs" style={{ color: 'var(--theme-fg-dim)' }}>
                        {p.secondaryText}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
          {showStatic && !showGeocode && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-[10px]"
              style={{
                background: 'var(--theme-surface)',
                border: '1px solid var(--theme-border)',
                backdropFilter: 'blur(22px) saturate(180%)',
                boxShadow: '0 30px 60px -30px rgba(10,14,12,0.25)',
              }}
            >
              {staticFiltered.map(s => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={() => onChange(s)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                    style={{ color: 'var(--theme-fg)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-accent-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MapPin size={12} style={{ color: 'var(--theme-fg-dim)' }} />
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
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border-strong)',
        color: 'var(--theme-fg)',
        backdropFilter: 'blur(18px)',
      }}
      aria-label="Swap origin and destination"
    >
      <ArrowUpDown size={16} />
    </motion.button>
  );
}

const PREF_META: Record<Preference, { label: string; shortLabel: string; tagline: string; icon: typeof Leaf }> = {
  eco: { label: 'Eco First', shortLabel: 'Eco', tagline: 'Low carbon, big points.', icon: Leaf },
  fast: { label: 'Fastest', shortLabel: 'Fast', tagline: 'Minutes above all.', icon: Zap },
  cheap: { label: 'Cheapest', shortLabel: 'Cost', tagline: 'Ringgit first.', icon: Wallet },
};

export function PreferenceSelector({
  preference, setPreference,
}: Pick<PlannerState, 'preference' | 'setPreference'>) {
  const order: Preference[] = ['eco', 'fast', 'cheap'];
  return (
    <div className="w-full">
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        § Preference — 02
      </div>
      <div
        className="mt-3 grid grid-cols-3 overflow-hidden rounded-full sm:hidden"
        style={{ border: '1px solid var(--theme-border)' }}
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
              aria-label={m.label}
              className="theme-mono-sm flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap py-2.5 transition-colors"
              style={{
                background: active ? 'var(--theme-accent)' : 'transparent',
                color: active ? 'var(--theme-accent-fg)' : 'var(--theme-fg-muted)',
              }}
            >
              <Icon size={13} />
              <span className="theme-action-label">{m.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 hidden flex-col gap-2.5 sm:flex">
        {order.map(p => {
          const m = PREF_META[p];
          const Icon = m.icon;
          const active = preference === p;
          return (
            <motion.button
              key={p}
              type="button"
              onClick={() => setPreference(p)}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="theme-card group relative flex min-w-0 items-center gap-4 px-4 py-3.5 text-left"
              style={{
                borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
                boxShadow: active
                  ? '0 0 0 1px var(--theme-accent), 0 18px 45px -22px var(--theme-accent)'
                  : undefined,
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: active ? 'var(--theme-accent)' : 'var(--theme-accent-soft)',
                  color: active ? 'var(--theme-accent-fg)' : 'var(--theme-accent)',
                }}
              >
                <Icon size={15} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span
                  className="theme-display text-[1.05rem] leading-tight"
                  style={{ color: 'var(--theme-fg)' }}
                >
                  {m.label}
                </span>
                <span
                  className="mt-0.5 text-[0.78rem] leading-snug"
                  style={{ color: 'var(--theme-fg-muted)' }}
                >
                  {m.tagline}
                </span>
              </div>
              {active && <span className="theme-accent-dot shrink-0" aria-hidden />}
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
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        Passengers
      </div>
      <div
        className="mt-3 inline-flex items-center gap-4 rounded-full px-2 py-2"
        style={{ border: '1px solid var(--theme-border)' }}
      >
        <button
          type="button"
          onClick={() => setPassengers(Math.max(min, passengers - 1))}
          disabled={passengers <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: 'var(--theme-fg)' }}
          aria-label="Decrease passengers"
        >
          <Minus size={14} />
        </button>
        <span
          className="min-w-[2ch] text-center tabular-nums"
          style={{
            fontFamily: 'var(--theme-font-display)',
            fontSize: '1.2rem',
            color: 'var(--theme-fg)',
          }}
        >
          {passengers}
        </span>
        <button
          type="button"
          onClick={() => setPassengers(Math.min(max, passengers + 1))}
          disabled={passengers >= max}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors disabled:opacity-30"
          style={{ color: 'var(--theme-fg)' }}
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
      <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
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
              className="theme-mono-sm flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 transition-all"
              style={{
                background: on ? 'var(--theme-accent-soft)' : 'transparent',
                color: on ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
                border: `1px solid ${on ? 'var(--theme-accent-muted)' : 'var(--theme-border)'}`,
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
        className="theme-mono-sm flex items-center gap-2 transition-colors"
        style={{ color: 'var(--theme-fg-muted)' }}
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
                background: 'var(--theme-surface-muted)',
                border: '1px solid var(--theme-border)',
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
      className="theme-btn-primary h-14 w-full justify-center disabled:opacity-70"
    >
      {loading ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span className="theme-action-label">
            <span className="sm:hidden">Mapping</span>
            <span className="hidden sm:inline">Mapping corridor</span>
          </span>
        </>
      ) : (
        <>
          <Sparkles size={14} />
          <span className="theme-action-label">{label}</span>
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
      className="theme-card group relative flex h-full flex-col items-start gap-5 p-6 md:p-7 text-left"
      style={{
        borderColor: selected ? 'var(--theme-accent)' : 'var(--theme-border)',
        boxShadow: selected
          ? '0 0 0 1px var(--theme-accent), 0 30px 60px -30px var(--theme-accent)'
          : undefined,
      }}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          {route.recommended && <span className="theme-accent-dot" aria-hidden />}
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
            {route.convergesWith && route.convergesWith.length > 0
              ? `§ ${[route.id, ...route.convergesWith].map((id) => ROUTE_SHORT_LABEL[id]).join(' · ')} · same route`
              : `§ ${route.label}`}
          </span>
        </div>
        {selected && (
          <CircleCheck size={16} style={{ color: 'var(--theme-accent)' }} />
        )}
      </div>

      <div className="flex w-full flex-col">
        <div
          className="theme-display leading-none"
          style={{
            fontSize: emphasized ? 'clamp(3.2rem, 5.5vw, 4.6rem)' : 'clamp(2.4rem, 4vw, 3.3rem)',
            color: 'var(--theme-fg)',
          }}
        >
          {route.hero.primary}
        </div>
        <div
          className="theme-italic mt-1"
          style={{
            color: 'var(--theme-fg-muted)',
            fontSize: emphasized ? '1.15rem' : '1rem',
          }}
        >
          {route.hero.unit}
        </div>
        <p className="mt-2 text-[0.82rem]" style={{ color: 'var(--theme-fg-muted)' }}>
          {route.hero.caption}
        </p>
      </div>

      <div
        className="h-px w-full"
        style={{ background: 'var(--theme-border)' }}
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
            className="theme-mono-sm rounded-full px-2.5 py-1.5"
            style={{
              background: 'var(--theme-accent-soft)',
              color: 'var(--theme-accent)',
              border: '1px solid var(--theme-accent-muted)',
            }}
          >
            {m}
          </span>
        ))}
      </div>

      {route.reasoning && (
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          {route.reasoning}
        </p>
      )}

      {route.recommendedFor.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {route.recommendedFor.map((tag) => (
            <span
              key={tag}
              className="theme-mono-sm rounded-full px-2 py-1"
              style={{
                background: 'var(--theme-surface)',
                color: 'var(--theme-fg-muted)',
                border: '1px solid var(--theme-border)',
                fontSize: '0.7rem',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {route.dataSource === 'fallback_synthetic' && (
        <span
          className="theme-italic text-[0.72rem]"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          estimated
        </span>
      )}

      <div
        className="mt-auto flex w-full items-center justify-between pt-1"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        <span className="theme-mono-sm flex items-center gap-1.5">
          <Star size={11} style={{ color: 'var(--theme-accent-warm)' }} />
          +{route.points} pts
        </span>
        <span
          className="theme-mono-sm flex items-center gap-1 transition-colors"
          style={{ color: selected ? 'var(--theme-accent)' : 'var(--theme-fg-muted)' }}
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
      <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--theme-font-display)',
          fontSize: '1.05rem',
          color: accent ? 'var(--theme-accent)' : 'var(--theme-fg)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

type DirectionsPanelProps = {
  route: RouteOption;
  onStartJourney?: () => void;
};

export function DirectionsPanel({ route, onStartJourney }: DirectionsPanelProps) {
  return (
    <div className="theme-card p-6 md:p-8 lg:p-10">
      <div className="flex items-center justify-between">
        <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          § Step-by-Step — Directions
        </div>
        <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
          {route.steps.length} stops
        </div>
      </div>

      <h3
        className="theme-display mt-3"
        style={{ fontSize: 'clamp(1.6rem, 2.6vw, 2.2rem)', color: 'var(--theme-fg)' }}
      >
        {route.name}{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-fg-muted)' }}>
          — {route.durationText}
        </span>
      </h3>

      <ol className="mt-8 flex flex-col gap-5">
        {route.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-4">
            <div className="relative flex flex-col items-center">
              <span
                className="theme-mono-sm flex h-7 w-7 items-center justify-center rounded-full"
                style={{
                  background: 'var(--theme-accent-soft)',
                  color: 'var(--theme-accent)',
                  border: '1px solid var(--theme-accent-muted)',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              {i < route.steps.length - 1 && (
                <span
                  className="mt-1 h-full min-h-[1.25rem] w-px flex-1"
                  style={{ background: 'var(--theme-border)' }}
                />
              )}
            </div>
            <p
              className="flex-1 pt-1 text-[0.95rem] leading-relaxed"
              style={{ color: 'var(--theme-fg)' }}
            >
              {s}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-8 theme-action-bar">
        <button
          type="button"
          onClick={onStartJourney}
          disabled={!onStartJourney}
          className="theme-btn-primary theme-action-bar-primary disabled:opacity-50"
        >
          <span className="theme-action-label">
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Start journey</span>
          </span>
          <ArrowRight size={14} />
        </button>
        <div className="theme-action-bar-icons">
          <button
            type="button"
            className="theme-btn-ghost h-12 w-12 px-0 sm:w-auto sm:px-6"
            aria-label="Save route"
          >
            <span className="theme-action-label hidden sm:inline">Save route</span>
            <Star className="sm:hidden" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ImpactPanel({ route }: { route: RouteOption }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 md:p-8 lg:p-10"
      style={{
        background: 'var(--theme-cta-bg)',
        boxShadow: 'var(--theme-cta-shadow)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div className="theme-mesh" aria-hidden />
      <div className="relative flex flex-col gap-7">
        <div className="flex items-center justify-between">
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            § Impact — Your Trip
          </div>
          <Leaf size={14} style={{ color: 'var(--theme-accent)' }} />
        </div>

        <div>
          <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
            CO₂ saved
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="theme-display"
              style={{
                fontSize: 'clamp(2.6rem, 4.4vw, 3.8rem)',
                color: 'var(--theme-accent)',
                letterSpacing: '-0.04em',
              }}
            >
              {MOCK_IMPACT.totalSaved}
            </span>
            <span className="theme-italic" style={{ color: 'var(--theme-fg-muted)' }}>
              kg
            </span>
          </div>
          <div
            className="mt-3 h-[3px] w-full overflow-hidden rounded-full"
            style={{ background: 'var(--theme-border)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${MOCK_IMPACT.percentage}%` }}
              transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
              className="h-full rounded-full"
              style={{ background: 'var(--theme-accent)', boxShadow: 'var(--theme-accent-glow)' }}
            />
          </div>
          <div className="theme-mono-sm mt-2" style={{ color: 'var(--theme-fg-dim)' }}>
            {MOCK_IMPACT.percentage}% below solo-drive baseline
          </div>
        </div>

        <div
          className="flex items-center gap-3 border-y py-4"
          style={{ borderColor: 'var(--theme-border)' }}
        >
          <TreePine size={22} style={{ color: 'var(--theme-accent)' }} />
          <div className="flex-1">
            <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
              Equivalent to
            </div>
            <div
              className="theme-display"
              style={{ fontSize: '1.4rem', color: 'var(--theme-fg)' }}
            >
              {MOCK_IMPACT.treesEquivalent}{' '}
              <span className="theme-italic" style={{ color: 'var(--theme-fg-muted)' }}>
                trees planted
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              Green points
            </div>
            <div
              className="theme-display mt-1"
              style={{ fontSize: '1.6rem', color: 'var(--theme-fg)' }}
            >
              +{route.points}
            </div>
          </div>
          <div>
            <div className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              You save
            </div>
            <div
              className="theme-display mt-1"
              style={{ fontSize: '1.6rem', color: 'var(--theme-fg)' }}
            >
              RM {MOCK_IMPACT.moneySaved.toFixed(2)}
            </div>
          </div>
        </div>

        <p
          className="theme-italic text-[0.92rem] leading-snug"
          style={{ color: 'var(--theme-fg-muted)' }}
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
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
        backdropFilter: 'blur(22px) saturate(170%)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="theme-accent-dot" aria-hidden />
        <span
          className="theme-display"
          style={{ fontSize: compact ? '1.05rem' : '1.15rem', color: 'var(--theme-fg)' }}
        >
          {state.origin || 'Origin'}
        </span>
        <ArrowRight size={14} style={{ color: 'var(--theme-fg-dim)' }} />
        <span
          className="theme-display"
          style={{ fontSize: compact ? '1.05rem' : '1.15rem', color: 'var(--theme-fg)' }}
        >
          {state.destination || 'Destination'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
          {state.passengers} pax · {state.preference.toUpperCase()}
        </span>
        <button
          type="button"
          onClick={state.reset}
          className="theme-mono-sm theme-link-underline"
          style={{ color: 'var(--theme-accent)' }}
        >
          <RefreshCw size={11} /> New search
        </button>
      </div>
    </div>
  );
}
