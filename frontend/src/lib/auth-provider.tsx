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

import { getFirebaseAuth } from '@/lib/firebase';
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
    const resolved = seams ?? firebaseSeams(authInstance ?? getFirebaseAuth());
    return createAuthStore(resolved);
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
