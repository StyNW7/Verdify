// Shared allow-lists that mirror the backend validator's AllowedTransports and
// AllowedRouteModes. Import from here on the frontend so Profile cards and the
// planner form can't diverge from what the PATCH API accepts.

export const TRANSPORTS = ['Transit', 'Cycle', 'Carpool', 'Walk'] as const;
export type Transport = (typeof TRANSPORTS)[number];

export const ROUTE_MODES = ['Fastest', 'Greenest', 'Cheapest', 'Balanced'] as const;
export type RouteMode = (typeof ROUTE_MODES)[number];

export const LANGUAGES = ['en', 'ms', 'zh', 'ta'] as const;
export type Language = (typeof LANGUAGES)[number];
