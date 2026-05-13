type Preference = 'eco' | 'fast' | 'cheap';
type ModeKey = 'rts' | 'lrt' | 'bus' | 'walking' | 'biking' | 'evTaxi';

type BookingRoute = {
  name: string;
  label: string;
  modes: string[];
  durationText: string;
  co2: number;
  cost: number;
  points: number;
  steps: string[];
};

type BookingSummaryInput = {
  route: BookingRoute;
  origin: string;
  destination: string;
  passengers: number;
  preference: Preference;
  modes: Record<ModeKey, boolean>;
};

export type BookingSummary = ReturnType<typeof createBookingSummary>;

const MODE_LABELS: Record<ModeKey, string> = {
  rts: 'RTS Link',
  lrt: 'LRT',
  bus: 'Bus',
  walking: 'Walking',
  biking: 'Biking',
  evTaxi: 'EV Taxi',
};

const PREFERENCE_LABELS: Record<Preference, string> = {
  eco: 'Eco First',
  fast: 'Fastest',
  cheap: 'Cheapest',
};

export function createBookingSummary({
  route,
  origin,
  destination,
  passengers,
  preference,
  modes,
}: BookingSummaryInput) {
  const activeModes = (Object.keys(MODE_LABELS) as ModeKey[])
    .filter((key) => modes[key])
    .map((key) => MODE_LABELS[key]);

  return {
    routeName: route.name,
    routeLabel: route.label,
    corridor: `${origin || 'Origin'} → ${destination || 'Destination'}`,
    passengerLabel: `${passengers} ${passengers === 1 ? 'passenger' : 'passengers'}`,
    preferenceLabel: PREFERENCE_LABELS[preference],
    allowedModesLabel: activeModes.length > 0 ? activeModes.join(', ') : 'No modes selected',
    routeModesLabel: route.modes.join(' + '),
    perPassengerPrice: formatRinggit(route.cost),
    totalPrice: formatRinggit(route.cost),
    durationText: route.durationText,
    co2Label: `${route.co2.toFixed(1)} kg CO₂`,
    pointsLabel: `+${route.points} pts`,
    stopLabel: `${route.steps.length} ${route.steps.length === 1 ? 'stop' : 'stops'}`,
  };
}

function formatRinggit(value: number) {
  return `RM ${value.toFixed(2)}`;
}
