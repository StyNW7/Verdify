import type { BackendTransportSegment } from './api';

export type ItineraryIconKey =
  | 'walk'
  | 'train'
  | 'bus'
  | 'evTaxi'
  | 'unknown';

export type ItineraryRow = {
  index: number;
  iconKey: ItineraryIconKey;
  primary: string;
  secondary: string;
  detail: string;
  instruction: string | null;
};

const TRAIN_TYPES = new Set(['train', 'lrt', 'mrt', 'rts', 'rapid_rail']);
const BUS_TYPES = new Set(['bus', 'shuttle']);
const WALK_TYPES = new Set(['walk', 'walking']);
const EV_TYPES = new Set(['ev_taxi', 'evtaxi', 'taxi']);

function normalizeType(type: string): string {
  if (type === 'evTaxi') return 'ev_taxi';
  return type.toLowerCase();
}

export function iconKeyForStep(type: string): ItineraryIconKey {
  const t = normalizeType(type);
  if (WALK_TYPES.has(t)) return 'walk';
  if (TRAIN_TYPES.has(t)) return 'train';
  if (BUS_TYPES.has(t)) return 'bus';
  if (EV_TYPES.has(t)) return 'evTaxi';
  return 'unknown';
}

function trim(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function stepEndpoints(
  steps: BackendTransportSegment[],
  index: number,
): { from: string; to: string } {
  const step = steps[index];
  const t = normalizeType(step.type);
  if (WALK_TYPES.has(t)) {
    // A walk's inner endpoint is anchored by the neighbouring transit leg
    // (e.g. "Walk to Wawasan Plaza Bus Stop"). The walk itself rarely
    // carries a stop name or a `departureStop`/`arrivalStop`, so when the
    // address is missing we borrow the adjacent step's stop label.
    const prev = steps[index - 1];
    const next = steps[index + 1];
    const from =
      trim(step.startLocation?.address) ||
      trim(prev?.arrivalStop) ||
      trim(prev?.endLocation?.address) ||
      '—';
    const to =
      trim(step.endLocation?.address) ||
      trim(next?.departureStop) ||
      trim(next?.startLocation?.address) ||
      '—';
    return { from, to };
  }
  const from =
    trim(step.departureStop) ||
    trim(step.startLocation?.address) ||
    '—';
  const to =
    trim(step.arrivalStop) ||
    trim(step.headsign) ||
    trim(step.endLocation?.address) ||
    '—';
  return { from, to };
}

function primaryLabel(step: BackendTransportSegment, iconKey: ItineraryIconKey): string {
  if (iconKey === 'walk') return 'Walk';
  if (iconKey === 'evTaxi') {
    const line = trim(step.transitLine);
    return line ? `EV Taxi · ${line}` : 'EV Taxi';
  }
  const line = trim(step.transitLine);
  const headsign = trim(step.headsign);
  if (line && headsign) return `${line} · ${headsign}`;
  if (line) return line;
  if (headsign) return headsign;
  if (iconKey === 'train') return 'Train';
  if (iconKey === 'bus') return 'Bus';
  return 'Segment';
}

function detailLabel(step: BackendTransportSegment): string {
  const parts: string[] = [];
  if (Number.isFinite(step.distance) && step.distance > 0) {
    parts.push(`${step.distance.toFixed(1)} km`);
  }
  if (Number.isFinite(step.duration) && step.duration > 0) {
    parts.push(`${step.duration} min`);
  }
  const cost = step.estimatedCost ?? 0;
  if (cost > 0) parts.push(`RM ${cost.toFixed(2)}`);
  return parts.join(' · ');
}

function cleanInstruction(raw: string | undefined): string | null {
  const text = trim(raw).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
  return text.length > 0 ? text : null;
}

export type MapPoint = { latitude: number; longitude: number };

export function bookingMapEndpoints(
  steps: BackendTransportSegment[],
): { start: MapPoint | null; end: MapPoint | null } {
  let start: MapPoint | null = null;
  for (const step of steps) {
    const loc = step.startLocation;
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      start = { latitude: loc.latitude, longitude: loc.longitude };
      break;
    }
  }
  let end: MapPoint | null = null;
  for (let i = steps.length - 1; i >= 0; i--) {
    const loc = steps[i].endLocation;
    if (loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
      end = { latitude: loc.latitude, longitude: loc.longitude };
      break;
    }
  }
  return { start, end };
}

// Used as a map fallback when the route polyline is missing or fails the
// sanity check — stitches the per-step coordinates into an approximate
// piecewise path. The map renders this dashed to signal "approximate, not
// a routed line."
export function bookingFallbackPath(
  steps: BackendTransportSegment[],
): MapPoint[] {
  const out: MapPoint[] = [];
  const push = (loc: BackendTransportSegment['startLocation']) => {
    if (!loc) return;
    if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude)) return;
    const last = out[out.length - 1];
    if (last && last.latitude === loc.latitude && last.longitude === loc.longitude) return;
    out.push({ latitude: loc.latitude, longitude: loc.longitude });
  };
  for (const s of steps) {
    push(s.startLocation);
    push(s.endLocation);
  }
  return out;
}

export function buildItineraryRows(
  steps: BackendTransportSegment[],
): ItineraryRow[] {
  return steps.map((step, index) => {
    const iconKey = iconKeyForStep(step.type);
    const { from, to } = stepEndpoints(steps, index);
    return {
      index,
      iconKey,
      primary: primaryLabel(step, iconKey),
      secondary: `${from} → ${to}`,
      detail: detailLabel(step),
      instruction: cleanInstruction(step.instruction),
    };
  });
}
