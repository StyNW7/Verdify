import { useEffect, useState } from 'react';

// Treat the auth-loading state as resolved after this much time so a stalled
// Firebase init (network issue, blocked SDK, etc.) never traps the user on a
// blank screen. The guard then evaluates with whatever `user` value the
// snapshot currently holds — null in the common case, which routes to the
// login modal as it should.
const DEFAULT_FALLBACK_MS = 1500;

export function useAuthLoadingFallback(loading: boolean, ms = DEFAULT_FALLBACK_MS): boolean {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const id = window.setTimeout(() => setTimedOut(true), ms);
    return () => window.clearTimeout(id);
  }, [loading, ms]);
  return loading && !timedOut;
}
