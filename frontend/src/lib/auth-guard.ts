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
    // Redirect to the landing page; the AuthModalProvider watches for
    // ?openAuth=login and pops the modal after a short delay so the user
    // sees the landing context behind it instead of a bare login page.
    return {
      redirectTo: `/?openAuth=login&next=${encodeURIComponent(pathname)}`,
    };
  }

  return { userId: devUserId };
}

export function parseAuthRequired(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw.toLowerCase() === 'true';
}
