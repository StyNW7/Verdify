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
  mode?: RouteMode; // omit to let the Gemini ranker pick
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

// Places Autocomplete (typing-as-you-go path).
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
