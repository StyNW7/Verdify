import { useCallback, useEffect, useState } from 'react';

import { ApiError, getUserGreenPoints } from '@/lib/api';
import { useBookingUserId } from '@/hooks/useBookingUserId';

export type GreenPointsState = {
  currentBalance: number | null;
  totalEarned: number | null;
  totalRedeemed: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useGreenPoints(): GreenPointsState {
  const userId = useBookingUserId();
  const [snapshot, setSnapshot] = useState<Omit<GreenPointsState, 'refresh'>>({
    currentBalance: null,
    totalEarned: null,
    totalRedeemed: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!userId) {
      setSnapshot({
        currentBalance: null,
        totalEarned: null,
        totalRedeemed: null,
        loading: false,
        error: null,
      });
      return;
    }
    setSnapshot((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getUserGreenPoints(userId);
      setSnapshot({
        currentBalance: data.currentBalance,
        totalEarned: data.totalEarned,
        totalRedeemed: data.totalRedeemed,
        loading: false,
        error: null,
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load points';
      setSnapshot((s) => ({ ...s, loading: false, error: message }));
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...snapshot, refresh };
}
