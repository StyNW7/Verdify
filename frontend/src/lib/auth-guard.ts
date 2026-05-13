export type AuthGuardInput = {
  authRequired: boolean;
  sessionUserId: string | null;
  devUserId: string;
  pathname: string;
};

export type AuthGuardResult =
  | { userId: string }
  | { redirectTo: string };

export function resolveAuthGuard(input: AuthGuardInput): AuthGuardResult {
  const { authRequired, sessionUserId, devUserId, pathname } = input;

  if (sessionUserId) {
    return { userId: sessionUserId };
  }

  if (authRequired) {
    return { redirectTo: `/auth/login?next=${encodeURIComponent(pathname)}` };
  }

  return { userId: devUserId };
}

export function parseAuthRequired(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw.toLowerCase() === 'true';
}
