import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BackendLocation,
  geocodeSearch,
  placesAutocomplete,
  placeDetails,
  type PlacePrediction,
} from '@/lib/api';
import { newPlacesSessionToken } from '@/lib/places-session';

export function usePlacesAutocomplete(query: string, enabled: boolean) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<string>(newPlacesSessionToken());
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastQuery = useRef('');

  const fetchPredictions = useCallback((q: string) => {
    if (q.length < 3) {
      setPredictions([]);
      return;
    }
    if (q === lastQuery.current) return;
    lastQuery.current = q;
    setLoading(true);
    placesAutocomplete(q, sessionTokenRef.current)
      .then((resp) => setPredictions(resp.predictions))
      .catch(async () => {
        // Fallback to legacy geocode endpoint so suggestions still work
        try {
          const fallback = await geocodeSearch(q);
          setPredictions(
            fallback.map((s) => ({
              placeId: s.placeId,
              primaryText: s.formattedAddress.split(',')[0],
              secondaryText: s.formattedAddress.split(',').slice(1).join(',').trim(),
              fullText: s.formattedAddress,
            })),
          );
        } catch {
          setPredictions([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(query), 150);
    return () => clearTimeout(timerRef.current);
  }, [query, enabled, fetchPredictions]);

  const resolvePlace = useCallback(async (placeId: string): Promise<BackendLocation | null> => {
    try {
      const d = await placeDetails(placeId, sessionTokenRef.current);
      // Rotate session token after a successful Details (closes Google's billing session).
      sessionTokenRef.current = newPlacesSessionToken();
      return d.location;
    } catch {
      return null;
    }
  }, []);

  return { predictions, loading, resolvePlace };
}
