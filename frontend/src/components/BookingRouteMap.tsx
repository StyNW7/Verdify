import { useEffect, useMemo, useRef } from 'react';
import {
  Map,
  AdvancedMarker,
  Pin,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';

import { useIsDark } from '@/components/AnimatedThemeToggler';
import RouteMap from '@/components/RouteMap';
import { isPolylinePathSane } from '@/lib/polyline';

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

type LatLng = google.maps.LatLngLiteral;

const ROUTE_COLORS: Record<string, string> = {
  eco: '#1F7A3D',
  fast: '#C85A2E',
  cheap: '#2563EB',
};

export type BookingRouteMapProps = {
  polyline?: string;
  start?: { latitude: number; longitude: number } | null;
  end?: { latitude: number; longitude: number } | null;
  mode?: string;
  className?: string;
};

const DEFAULT_CENTER = { lat: 1.466, lng: 103.723 };

function useDecodedPath(polyline: string | undefined): LatLng[] {
  const geometryLib = useMapsLibrary('geometry');
  return useMemo(() => {
    if (!polyline || !geometryLib) return [];
    const encoding = (geometryLib as { encoding?: { decodePath: (s: string) => google.maps.LatLng[] } }).encoding;
    if (!encoding) return [];
    try {
      return encoding.decodePath(polyline).map((p) => ({ lat: p.lat(), lng: p.lng() }));
    } catch {
      return [];
    }
  }, [geometryLib, polyline]);
}

export default function BookingRouteMap({
  polyline,
  start,
  end,
  mode,
  className = '',
}: BookingRouteMapProps) {
  const isDark = useIsDark();
  const hasApiKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!hasApiKey) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <RouteMap variant={isDark ? 'dark' : 'warm'} showChips={false} />
        <div
          className="theme-mono-sm absolute right-2 top-2 rounded-md px-2 py-0.5"
          style={{
            color: 'var(--theme-fg-dim)',
            background: 'var(--theme-accent-soft)',
            border: '1px solid var(--theme-border)',
          }}
        >
          Map preview unavailable
        </div>
      </div>
    );
  }

  return (
    <GoogleBookingMap
      polyline={polyline}
      start={start}
      end={end}
      mode={mode}
      isDark={isDark}
      className={className}
    />
  );
}

function GoogleBookingMap({
  polyline,
  start,
  end,
  mode,
  isDark,
  className,
}: BookingRouteMapProps & { isDark: boolean }) {
  const startCoord = useMemo<LatLng | null>(
    () => (start ? { lat: start.latitude, lng: start.longitude } : null),
    [start],
  );
  const endCoord = useMemo<LatLng | null>(
    () => (end ? { lat: end.latitude, lng: end.longitude } : null),
    [end],
  );
  const rawDecoded = useDecodedPath(polyline);

  const decoded = useMemo<LatLng[]>(() => {
    if (rawDecoded.length === 0) return rawDecoded;
    if (isPolylinePathSane(rawDecoded, start, end)) return rawDecoded;
    if (import.meta.env.DEV) {
      console.warn(
        '[BookingRouteMap] Dropping polyline: decoded endpoints do not connect to booking start/end.',
        {
          bookingStart: start,
          bookingEnd: end,
          polylineFirst: rawDecoded[0],
          polylineLast: rawDecoded[rawDecoded.length - 1],
        },
      );
    }
    return [];
  }, [rawDecoded, start, end]);

  const path: LatLng[] = useMemo(() => {
    if (decoded.length > 0) return decoded;
    if (startCoord && endCoord) return [startCoord, endCoord];
    return [];
  }, [decoded, startCoord, endCoord]);

  const center = useMemo<LatLng>(() => {
    if (startCoord && endCoord) {
      return {
        lat: (startCoord.lat + endCoord.lat) / 2,
        lng: (startCoord.lng + endCoord.lng) / 2,
      };
    }
    return startCoord ?? endCoord ?? DEFAULT_CENTER;
  }, [startCoord, endCoord]);

  const accent = ROUTE_COLORS[mode ?? 'eco'] ?? ROUTE_COLORS.eco;
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
        <FitBoundsHelper path={path} startCoord={startCoord} endCoord={endCoord} />

        {path.length > 1 && (
          <>
            <Polyline
              path={path}
              strokeColor={accent}
              strokeOpacity={0.2}
              strokeWeight={10}
            />
            <Polyline
              path={path}
              strokeColor={accent}
              strokeOpacity={1}
              strokeWeight={4}
              geodesic={decoded.length === 0}
            />
          </>
        )}

        {startCoord && (
          <AdvancedMarker position={startCoord}>
            <Pin
              background={isDark ? '#ECEFE9' : '#0A0E0C'}
              borderColor={isDark ? '#A6F754' : '#FFFFFF'}
              glyphColor={isDark ? '#0A0E0C' : '#FFFFFF'}
            />
          </AdvancedMarker>
        )}

        {endCoord && (
          <AdvancedMarker position={endCoord}>
            <Pin
              background={accent}
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
  path,
  startCoord,
  endCoord,
}: {
  path: LatLng[];
  startCoord: LatLng | null;
  endCoord: LatLng | null;
}) {
  const map = useMap();
  const prevKey = useRef('');

  useEffect(() => {
    if (!map) return;
    const points: LatLng[] = path.length > 0 ? path : [startCoord, endCoord].filter(Boolean) as LatLng[];
    if (points.length === 0) return;
    const key = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
    if (key === prevKey.current) return;
    prevKey.current = key;

    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    if (bounds.isEmpty()) return;
    map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
  }, [map, path, startCoord, endCoord]);

  return null;
}
