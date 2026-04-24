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
};

export type CalculateRoutePayload = {
  origin: BackendLocation;
  destination: BackendLocation;
  mode: 'fast' | 'ecoboost' | 'flowing' | 'smart';
};

export type BackendTransportSegment = {
  type: string;
  distance: number;
  duration: number;
};

export type BackendRoute = {
  routeId: string;
  mode: string;
  totalDistance: number;
  totalDuration: number;
  carbonEstimate: number;
  greenPointsEstimate: number;
  steps: BackendTransportSegment[];
};

export function calculateRoute(payload: CalculateRoutePayload) {
  return apiRequest<BackendRoute>('/api/v1/routes/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
