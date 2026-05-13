import { useLocation } from 'react-router';
import { resolveAuthGuard, parseAuthRequired } from '@/lib/auth-guard';
import { useAuth } from '@/lib/auth-provider';

export function useBookingUserId(): string | null {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const authRequired = parseAuthRequired(import.meta.env.VITE_AUTH_REQUIRED);
  const devUserId = import.meta.env.VITE_DEV_USER_ID ?? '';
  const sessionUserId = user?.uid ?? null;

  const result = resolveAuthGuard({
    authRequired,
    sessionUserId,
    devUserId,
    pathname: pathname + search,
  });

  if ('userId' in result) {
    return result.userId || null;
  }
  return null;
}
