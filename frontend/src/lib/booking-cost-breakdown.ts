import type { BackendTransportSegment } from './api';

export const BOOKABLE_STEP_TYPES = ['ev_taxi', 'rts'] as const;
export const TAP_IN_STEP_TYPES = ['bus', 'lrt', 'ferry'] as const;

function normalizeType(type: string): string {
  if (type === 'evTaxi') return 'ev_taxi';
  return type;
}

export function isBookableStep(type: string): boolean {
  const normalized = normalizeType(type);
  return (BOOKABLE_STEP_TYPES as readonly string[]).includes(normalized);
}

export function isTapInStep(type: string): boolean {
  return (TAP_IN_STEP_TYPES as readonly string[]).includes(type);
}

const DEFAULT_LABELS: Record<string, string> = {
  ev_taxi: 'EV Taxi',
  rts: 'RTS Link',
  bus: 'Bus',
  lrt: 'LRT',
  ferry: 'Ferry',
};

function defaultLabel(type: string): string {
  return DEFAULT_LABELS[normalizeType(type)] ?? type;
}

export type BreakdownEntry = {
  leg: number;
  label: string;
  cost: number;
};

export type BookingCostBreakdown = {
  reserved: BreakdownEntry[];
  tapIn: BreakdownEntry[];
  reservedTotal: number;
  tapInTotal: number;
  grandTotal: number;
};

export function buildBookingCostBreakdown(
  steps: BackendTransportSegment[],
): BookingCostBreakdown {
  const reserved: BreakdownEntry[] = [];
  const tapIn: BreakdownEntry[] = [];

  steps.forEach((step, index) => {
    const label = step.transitLine?.trim() || defaultLabel(step.type);
    const cost = step.estimatedCost ?? 0;
    if (isBookableStep(step.type)) {
      reserved.push({ leg: index, label, cost });
      return;
    }
    if (isTapInStep(step.type)) {
      tapIn.push({ leg: index, label, cost });
    }
  });

  const reservedTotal = reserved.reduce((sum, entry) => sum + entry.cost, 0);
  const tapInTotal = tapIn.reduce((sum, entry) => sum + entry.cost, 0);

  return {
    reserved,
    tapIn,
    reservedTotal,
    tapInTotal,
    grandTotal: reservedTotal + tapInTotal,
  };
}
