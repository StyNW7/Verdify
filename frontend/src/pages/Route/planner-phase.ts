export type PlannerPhase = 'idle' | 'loading' | 'results';
export type PlannerPreference = 'eco' | 'fast' | 'cheap';
export type PlannerRouteId = 'eco' | 'fast' | 'cheap';

/**
 * Maps a `preferredRouteMode` value (from the user doc / PATCH API) to the
 * planner's internal `PlannerPreference`. Returns null for unknown/empty values
 * so callers can distinguish "no preference" from "eco".
 */
export function routeModeToPreference(routeMode: string): PlannerPreference | null {
  switch (routeMode) {
    case 'Fastest': return 'fast';
    case 'Greenest': return 'eco';
    case 'Cheapest': return 'cheap';
    case 'Balanced': return 'eco';
    default: return null;
  }
}

/**
 * Returns the initial planner preference to use on first render.
 * Reads `preferredRouteMode` from the user doc if available; falls back to
 * the default `'eco'`. This is called once at component mount — subsequent
 * user-doc snapshot changes do NOT re-apply the preference.
 */
export function initialPreferenceFromDoc(
  doc: { preferredRouteMode?: string } | null | undefined,
): PlannerPreference {
  const mode = doc?.preferredRouteMode;
  if (!mode) return 'eco';
  return routeModeToPreference(mode) ?? 'eco';
}

export function deriveSelectedRouteId(preference: PlannerPreference): PlannerRouteId {
  return preference === 'fast' ? 'fast' : preference === 'cheap' ? 'cheap' : 'eco';
}

export function startPlannerSubmission({
  preference,
}: {
  phase: PlannerPhase;
  preference: PlannerPreference;
  selectedRouteId: PlannerRouteId;
}) {
  return {
    phase: 'loading' as const,
    selectedRouteId: deriveSelectedRouteId(preference),
  };
}

export function finishPlannerSubmission({
  selectedRouteId,
}: {
  phase: PlannerPhase;
  selectedRouteId: PlannerRouteId;
}) {
  return {
    phase: 'results' as const,
    selectedRouteId,
  };
}
