import { type Transport, type RouteMode } from '../../lib/preferences.ts';

export type TripDefaultsSnapshot = {
  preferredTransport?: string;
  preferredRouteMode?: string;
};

export type TripDefaultsValues = {
  transport: Transport;
  routeMode: RouteMode;
};

const DEFAULT_TRANSPORT: Transport = 'Transit';
const DEFAULT_ROUTE_MODE: RouteMode = 'Greenest';

/** Returns the transport/routeMode to seed from a doc at mount time. */
export function getInitialTripDefaults(
  doc: TripDefaultsSnapshot | null | undefined,
): TripDefaultsValues {
  return {
    transport: (doc?.preferredTransport as Transport | undefined) ?? DEFAULT_TRANSPORT,
    routeMode: (doc?.preferredRouteMode as RouteMode | undefined) ?? DEFAULT_ROUTE_MODE,
  };
}

/**
 * Merges an incoming doc snapshot into the current state.
 * When the user has already interacted (clicked a button in the card),
 * the snapshot is silently ignored to prevent overwriting an unsaved selection.
 */
export function applyDocSnapshot(
  current: TripDefaultsValues & { userHasInteracted: boolean },
  doc: TripDefaultsSnapshot | null | undefined,
): TripDefaultsValues {
  if (current.userHasInteracted) {
    return { transport: current.transport, routeMode: current.routeMode };
  }
  return getInitialTripDefaults(doc);
}
