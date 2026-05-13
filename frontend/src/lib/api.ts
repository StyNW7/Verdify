const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error: string | null;
  metadata: {
    timestamp: string;
    version: string;
  };
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  const errorMessage =
    body && !body.success && typeof body.error === 'string'
      ? body.error
      : `Request failed with status ${response.status}`;

  if (!response.ok || !body || !body.success) {
    throw new ApiError(errorMessage, response.status);
  }

  return body.data;
}

export type RegisterPayload = {
  email: string;
  password: string;
  phone: string;
};

export type RegisterResult = {
  userId: string;
  email: string;
  phone: string;
  token: string;
  createdAt: string;
};

export function registerUser(payload: RegisterPayload) {
  return apiRequest<RegisterResult>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResult = {
  userId: string;
  token: string;
  expiresIn: number;
};

export function loginUser(payload: LoginPayload) {
  return apiRequest<LoginResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type BackendLocation = {
  latitude: number;
  longitude: number;
  address?: string;
};

export type RouteMode = 'fast' | 'eco' | 'cheap';

export type CalculateRoutePayload = {
  origin: BackendLocation;
  destination: BackendLocation;
  mode?: RouteMode;
  passengers?: number;
};

export type BackendTransportSegment = {
  type: string;
  distance: number;
  duration: number;
  estimatedCost: number;
  transitLine?: string;
  departureStop?: string;
  arrivalStop?: string;
  headsign?: string;
  stopCount?: number;
  instruction?: string;
  startLocation?: BackendLocation;
  endLocation?: BackendLocation;
};

export type BackendRouteOption = {
  routeId: string;
  mode: RouteMode;
  totalDistance: number;
  totalDuration: number;
  carbonEstimate: number;
  carbonBaseline: number;
  carbonSavedGrams: number;
  carbonSavingsPercent: number;
  carbonEstimateKg: number;
  estimatedCost: number;
  greenPointsEstimate: number;
  steps: BackendTransportSegment[];
  polyline?: string;
  reasoning: string;
  recommendedFor: string[];
  recommended: boolean;
  dataSource: 'google_routes' | 'fallback_synthetic';
  createdAt: string;
};

export type CalculateRouteResponse = {
  options: BackendRouteOption[];
  rankerSource: 'gemini' | 'fallback_scorer' | 'user_mode';
  peak: boolean;
};

export function calculateRoute(payload: CalculateRoutePayload) {
  return apiRequest<CalculateRouteResponse>('/api/v1/routes/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Reroute ───────────────────────────────────────────────────────────────────

export type ReroutePayload = {
  currentLocation: { latitude: number; longitude: number };
  reason?: 'missed_stop' | 'missed_connection' | 'stuck';
};

export type RerouteResult = {
  action: 'reroute' | 'wait_and_continue' | 'abort';
  userMessage: string;
  newRoute: BackendRouteOption | null;
  reasoning: string;
  agentSource: 'gemini' | 'fallback' | 'cap';
};

export function rerouteBooking(bookingId: string, payload: ReroutePayload) {
  return apiRequest<RerouteResult>(`/api/v1/bookings/${encodeURIComponent(bookingId)}/reroute`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Geocode / Places ──────────────────────────────────────────────────────────

// Legacy geocode endpoint — still supported as a fallback for the autocomplete hook.
export type GeocodeSuggestion = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  placeId: string;
};

export function geocodeSearch(query: string) {
  return apiRequest<GeocodeSuggestion[]>(
    `/api/v1/geocode?q=${encodeURIComponent(query)}`,
    { method: 'GET' },
  );
}

export type PlacePrediction = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
};

export type PlacesAutocompleteResponse = {
  sessionToken: string;
  predictions: PlacePrediction[];
};

export function placesAutocomplete(q: string, sessionToken: string) {
  return apiRequest<PlacesAutocompleteResponse>(
    `/api/v1/places/autocomplete?q=${encodeURIComponent(q)}&sessionToken=${encodeURIComponent(sessionToken)}`,
    { method: 'GET' },
  );
}

export type PlaceDetailsResponse = {
  placeId: string;
  location: BackendLocation;
};

export function placeDetails(placeId: string, sessionToken: string) {
  return apiRequest<PlaceDetailsResponse>(
    `/api/v1/places/details?placeId=${encodeURIComponent(placeId)}&sessionToken=${encodeURIComponent(sessionToken)}`,
    { method: 'GET' },
  );
}

export type CreateBookingPayload = {
  userId: string;
  routeId: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
};

export type CreateBookingResponse = {
  bookingId: string;
  bookingReference: string;
  estimatedPoints: number;
  status: string;
  paymentStatus: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
  qrCode?: string;
  createdAt?: string;
  expiresAt?: string;
};

export function createBooking(payload: CreateBookingPayload) {
  return apiRequest<CreateBookingResponse>('/api/v1/bookings/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export type BookingRecord = {
  bookingId: string;
  userId: string;
  routeId: string;
  routeSnapshot: BackendRouteOption;
  passengers: number;
  status: string;
  qrCode: string;
  bookingReference: string;
  estimatedPoints: number;
  actualPoints: number;
  paymentStatus: string;
  createdAt: string;
  completedAt?: string;
};

export function markBookingPaid(bookingId: string) {
  return apiRequest<BookingRecord>(`/api/v1/bookings/${encodeURIComponent(bookingId)}/pay`, {
    method: 'POST',
  });
}

export type MarkCompletedResponse = {
  bookingId: string;
  status: string;
  paymentStatus: string;
  actualPoints: number;
  carbonSaved: number;
};

export function markBookingCompleted(bookingId: string) {
  return apiRequest<MarkCompletedResponse>(
    `/api/v1/bookings/${encodeURIComponent(bookingId)}/verify`,
    { method: 'POST' },
  );
}

export function cancelBooking(bookingId: string) {
  return apiRequest<BookingRecord>(`/api/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
  });
}

export type UserBookingsResponse = {
  bookings: BookingRecord[];
  pagination: { total: number; limit: number; offset: number };
};

export function listUserBookings(userId: string, opts: { limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  if (opts.offset !== undefined) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : '';
  return apiRequest<UserBookingsResponse>(
    `/api/v1/user/${encodeURIComponent(userId)}/bookings${suffix}`,
    { method: 'GET' },
  );
}
