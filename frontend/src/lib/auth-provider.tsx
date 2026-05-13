import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as fbSignOut,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase';
import { setAuthTokenGetter } from '@/lib/api';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type AuthState = {
  user: AuthUser | null;
  idToken: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function toAuthUser(u: FirebaseUser | null): AuthUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

type ProviderProps = {
  children: ReactNode;
  // Injectable for tests; defaults to the lazily-initialised browser instance.
  authInstance?: Auth;
};

export function AuthProvider({ children, authInstance }: ProviderProps) {
  const auth = useMemo(() => authInstance ?? getFirebaseAuth(), [authInstance]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (next) => {
      setUser(toAuthUser(next));
      setLoading(false);
    });
    const unsubToken = onIdTokenChanged(auth, async (next) => {
      if (!next) {
        setIdToken(null);
        return;
      }
      try {
        const token = await next.getIdToken();
        setIdToken(token);
      } catch {
        setIdToken(null);
      }
    });
    return () => {
      unsubAuth();
      unsubToken();
    };
  }, [auth]);

  // Keep the api.ts fetch wrapper supplied with the latest token.
  useEffect(() => {
    setAuthTokenGetter(() => idToken);
    return () => setAuthTokenGetter(() => null);
  }, [idToken]);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, [auth]);

  const value = useMemo<AuthState>(
    () => ({ user, idToken, loading, signOut }),
    [user, idToken, loading, signOut],
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
