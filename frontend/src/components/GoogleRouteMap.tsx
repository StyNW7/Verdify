import { useEffect, useMemo, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { RouteOption } from '@/pages/Route/shared';

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f1c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f1c' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7c72' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3530' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5a6b62' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#141a17' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222b26' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#222b26' }] },
];

const LIGHT_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f0' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a5a50' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e8e0' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4e4dc' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eaeae2' }] },
];

const ROUTE_COLORS: Record<string, string> = {
  eco: '#1F7A3D',
  fast: '#C85A2E',
  cheap: '#2563EB',
};

const LOCATION_COORDS: Record<string, google.maps.LatLngLiteral> = {
  'bukit indah, johor': { lat: 1.4838, lng: 103.6604 },
  'johor bahru sentral': { lat: 1.4624, lng: 103.7643 },
  'skudai, johor': { lat: 1.5378, lng: 103.6564 },
  'danga bay, johor': { lat: 1.4708, lng: 103.7245 },
  'ciq bangunan sultan iskandar': { lat: 1.4626, lng: 103.7638 },
  'woodlands north, singapore': { lat: 1.4482, lng: 103.7857 },
  'orchard, singapore': { lat: 1.3048, lng: 103.8318 },
  'raffles place, singapore': { lat: 1.2831, lng: 103.8515 },
  'jurong east, singapore': { lat: 1.3332, lng: 103.7423 },
  'changi airport, singapore': { lat: 1.3644, lng: 103.9915 },
};

function resolveCoord(input: string): google.maps.LatLngLiteral | null {
  const key = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (LOCATION_COORDS[key]) return LOCATION_COORDS[key];
  for (const [name, coords] of Object.entries(LOCATION_COORDS)) {
    if (key.includes(name) || name.includes(key)) return coords;
  }
  const match = input.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (match) return { lat: Number(match[1]), lng: Number(match[3]) };
  return null;
}

function interpolateFallback(
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  routeId: string,
): google.maps.LatLngLiteral[] {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;
  const offset =
    routeId === 'eco'
      ? { lat: 0.008, lng: -0.012 }
      : routeId === 'fast'
        ? { lat: -0.005, lng: 0.01 }
        : { lat: 0.012, lng: 0.005 };

  return [
    from,
    { lat: from.lat + (midLat - from.lat) * 0.35 + offset.lat, lng: from.lng + (midLng - from.lng) * 0.35 + offset.lng },
    { lat: midLat + offset.lat * 0.5, lng: midLng + offset.lng * 0.5 },
    { lat: to.lat - (to.lat - midLat) * 0.35 - offset.lat * 0.3, lng: to.lng - (to.lng - midLng) * 0.35 - offset.lng * 0.3 },
    to,
  ];
}

type DecodedPaths = Record<string, google.maps.LatLngLiteral[]>;

function useDecodedPolylines(routes: RouteOption[]): DecodedPaths {
  const geometryLib = useMapsLibrary('geometry');

  return useMemo(() => {
    if (!geometryLib) return {};
    const encoding = (geometryLib as { encoding?: { decodePath: (s: string) => google.maps.LatLng[] } }).encoding;
    if (!encoding) return {};
    const decoded: DecodedPaths = {};
    for (const route of routes) {
      if (route.polyline) {
        try {
          const path = encoding.decodePath(route.polyline);
          decoded[route.id] = path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
        } catch {
          continue;
        }
      }
    }
    return decoded;
  }, [geometryLib, routes]);
}

export type GoogleRouteMapProps = {
  origin: string;
  destination: string;
  /** Explicit coords from Places Details; preferred over resolving from `origin` string. */
  originCoords?: { latitude: number; longitude: number } | null;
  destCoords?: { latitude: number; longitude: number } | null;
  selectedRouteId: string;
  routes: RouteOption[];
  isDark: boolean;
  className?: string;
};

const DEFAULT_CENTER = { lat: 1.466, lng: 103.723 };

export default function GoogleRouteMap({
  origin,
  destination,
  originCoords,
  destCoords,
  selectedRouteId,
  routes,
  isDark,
  className = '',
}: GoogleRouteMapProps) {
  const originCoord = useMemo(
    () =>
      originCoords
        ? { lat: originCoords.latitude, lng: originCoords.longitude }
        : resolveCoord(origin),
    [originCoords, origin],
  );
  const destCoord = useMemo(
    () =>
      destCoords
        ? { lat: destCoords.latitude, lng: destCoords.longitude }
        : resolveCoord(destination),
    [destCoords, destination],
  );
  const decodedPolylines = useDecodedPolylines(routes);

  const center = useMemo(() => {
    if (originCoord && destCoord) {
      return { lat: (originCoord.lat + destCoord.lat) / 2, lng: (originCoord.lng + destCoord.lng) / 2 };
    }
    return originCoord ?? destCoord ?? DEFAULT_CENTER;
  }, [originCoord, destCoord]);

  const routePaths = useMemo(() => {
    return routes.map((route) => {
      const decodedPath = decodedPolylines[route.id];
      const path =
        decodedPath ??
        (originCoord && destCoord ? interpolateFallback(originCoord, destCoord, route.id) : []);

      return {
        id: route.id,
        path,
        color: ROUTE_COLORS[route.id] ?? ROUTE_COLORS.eco,
        selected: route.id === selectedRouteId,
        isReal: !!decodedPath,
      };
    });
  }, [routes, decodedPolylines, originCoord, destCoord, selectedRouteId]);

  const styles = isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE;

  return (
    <div className={`relative h-full w-full ${className}`}>
      <Map
        defaultCenter={center}
        defaultZoom={12}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID'}
        styles={styles}
        style={{ width: '100%', height: '100%' }}
      >
        <FitBoundsHelper originCoord={originCoord} destCoord={destCoord} />

        {routePaths.map((route) =>
          route.path.length > 0 ? (
            <Polyline
              key={`bg-${route.id}`}
              path={route.path}
              strokeColor={route.color}
              strokeOpacity={route.selected ? 0.2 : 0.08}
              strokeWeight={route.selected ? 10 : 5}
            />
          ) : null,
        )}

        {routePaths.map((route) =>
          route.path.length > 0 ? (
            <Polyline
              key={route.id}
              path={route.path}
              strokeColor={route.color}
              strokeOpacity={route.selected ? 1 : 0.35}
              strokeWeight={route.selected ? 4 : 2}
              geodesic={!route.isReal}
            />
          ) : null,
        )}

        {originCoord && (
          <AdvancedMarker position={originCoord}>
            <Pin
              background={isDark ? '#ECEFE9' : '#0A0E0C'}
              borderColor={isDark ? '#A6F754' : '#FFFFFF'}
              glyphColor={isDark ? '#0A0E0C' : '#FFFFFF'}
            />
          </AdvancedMarker>
        )}

        {destCoord && (
          <AdvancedMarker position={destCoord}>
            <Pin
              background={ROUTE_COLORS[selectedRouteId] ?? '#1F7A3D'}
              borderColor={isDark ? '#A6F754' : '#FFFFFF'}
              glyphColor="#FFFFFF"
            />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}

function FitBoundsHelper({
  originCoord,
  destCoord,
}: {
  originCoord: google.maps.LatLngLiteral | null;
  destCoord: google.maps.LatLngLiteral | null;
}) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    if (!map || !originCoord || !destCoord) return;
    const key = `${originCoord.lat},${originCoord.lng}-${destCoord.lat},${destCoord.lng}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(originCoord);
    bounds.extend(destCoord);
    map.fitBounds(bounds, { top: 60, bottom: 40, left: 40, right: 40 });
  }, [map, originCoord, destCoord]);

  return null;
}
