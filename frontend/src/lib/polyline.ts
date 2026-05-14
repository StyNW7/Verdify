export type LatLngPoint = { lat: number; lng: number };
export type EndpointCoord = { latitude: number; longitude: number } | null | undefined;

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isPolylinePathSane(
  points: LatLngPoint[],
  start: EndpointCoord,
  end: EndpointCoord,
  toleranceKm = 5,
): boolean {
  if (points.length < 2) return false;
  if (!start || !end) return true;

  const first = points[0];
  const last = points[points.length - 1];
  const startPt = { lat: start.latitude, lng: start.longitude };
  const endPt = { lat: end.latitude, lng: end.longitude };

  return (
    haversineKm(first, startPt) <= toleranceKm &&
    haversineKm(last, endPt) <= toleranceKm
  );
}
