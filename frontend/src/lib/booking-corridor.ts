import type { BackendRouteOption } from './api';

export function originFromSnapshot(snapshot: BackendRouteOption | undefined): string {
  const first = snapshot?.steps?.[0];
  return first?.departureStop?.trim() || first?.startLocation?.address?.trim() || 'Origin';
}

export function destinationFromSnapshot(snapshot: BackendRouteOption | undefined): string {
  const steps = snapshot?.steps ?? [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i];
    const end =
      s.arrivalStop?.trim() ||
      s.headsign?.trim() ||
      s.endLocation?.address?.trim();
    if (end) return end;
  }
  return 'Destination';
}
