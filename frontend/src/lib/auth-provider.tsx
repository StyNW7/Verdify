import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as fbSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { parseAuthRequired } from '@/lib/auth-guard';
import {
  createAuthStore,
  type AuthSeams,
  type AuthSeamUser,
  type AuthUser,
  type RedirectResult,
} from '@/lib/auth-store';

export type { AuthUser } from '@/lib/auth-store';

export type AuthState = {
  user: AuthUser | null;
  idToken: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Stub seams for dev-bypass mode (no Firebase web config present).
// Resolves the auth state to "signed out, done loading" immediately so the
// layout's redirect-or-render decision can proceed using VITE_DEV_USER_ID.
function stubSeams(): AuthSeams {
  return {
    subscribeAuthState: (cb) => {
      cb(null);
      return () => {};
    },
    subscribeIdToken: (cb) => {
      cb(null);
      return () => {};
    },
    signOut: async () => {},
    getRedirectResult: async () => null,
  };
}

// Production seams: thin adapters over firebase/auth so AuthProvider doesn't
// need to know about the SDK shape.
function firebaseSeams(auth: Auth): AuthSeams {
  const adapt = (cb: (user: AuthSeamUser | null) => void) => (u: FirebaseUser | null) => {
    cb(u as AuthSeamUser | null);
  };
  return {
    subscribeAuthState: (cb) => onAuthStateChanged(auth, adapt(cb)),
    subscribeIdToken: (cb) => onIdTokenChanged(auth, adapt(cb)),
    signOut: () => fbSignOut(auth),
    getRedirectResult: async (): Promise<RedirectResult | null> => {
      const result = await getRedirectResult(auth);
      if (!result) return null;
      const idToken = await result.user.getIdToken();
      return { user: result.user as AuthSeamUser, idToken };
    },
  };
}

type ProviderProps = {
  children: ReactNode;
  // Injectable for integration tests / Storybook; defaults to the
  // lazily-initialised browser instance.
  authInstance?: Auth;
  // Lower-level injection point: bypass the firebase adapters entirely.
  // Used by unit tests of the store wiring.
  seams?: AuthSeams;
};

export function AuthProvider({ children, authInstance, seams }: ProviderProps) {
  const store = useMemo(() => {
    if (seams) return createAuthStore(seams);
    if (authInstance) return createAuthStore(firebaseSeams(authInstance));
    // The env flag is authoritative about which mode we're in. Dev bypass
    // (VITE_AUTH_REQUIRED unset or "false") never touches the Firebase SDK,
    // even if VITE_FIREBASE_* happens to be filled in — identity comes
    // from VITE_DEV_USER_ID via auth-guard.ts.
    const authRequired = parseAuthRequired(import.meta.env.VITE_AUTH_REQUIRED);
    if (!authRequired) return createAuthStore(stubSeams());
    // Real-auth mode: if Firebase config is missing this is a misconfig.
    // Fall back to stub seams so the app still mounts; the login page
    // will surface the real error when the user tries to sign in.
    if (!isFirebaseConfigured()) {
      console.warn(
        '[auth] VITE_AUTH_REQUIRED=true but VITE_FIREBASE_API_KEY is empty — sign-in will fail.',
      );
      return createAuthStore(stubSeams());
    }
    return createAuthStore(firebaseSeams(getFirebaseAuth()));
  }, [authInstance, seams]);

  useEffect(() => store.dispose, [store]);

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const value = useMemo<AuthState>(
    () => ({
      user: snapshot.user,
      idToken: snapshot.idToken,
      loading: snapshot.loading,
      signOut: store.signOut,
    }),
    [snapshot, store],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
