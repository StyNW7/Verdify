export type PlannerPhase = 'idle' | 'loading' | 'results';
export type PlannerPreference = 'eco' | 'fast' | 'cheap';
export type PlannerRouteId = 'eco' | 'fast' | 'cheap';

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
