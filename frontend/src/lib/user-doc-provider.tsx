import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { doc, onSnapshot, getFirestore, type Firestore } from 'firebase/firestore';

import { parseAuthRequired } from '@/lib/auth-guard';
import { useAuth } from '@/lib/auth-provider';

export type UserDoc = {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  greenPointsBalance: number;
  totalTripsCompleted: number;
  totalCarbonSaved: number;
  totalEarned: number;
  totalRedeemed: number;
  createdAt: string;
  presetAvatar?: string;
};

export type UserDocState = {
  doc: UserDoc | null;
  loading: boolean;
  error: Error | null;
};

const UserDocContext = createContext<UserDocState | null>(null);

type ProviderProps = {
  children: ReactNode;
  firestoreInstance?: Firestore;
};

export function UserDocProvider({ children, firestoreInstance }: ProviderProps) {
  const { user } = useAuth();
  const [state, setState] = useState<UserDocState>({ doc: null, loading: true, error: null });

  // Hold a ref to the latest unsubscribe so we can clean up before starting a
  // new subscription when the auth user changes.
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const authRequired = parseAuthRequired(import.meta.env.VITE_AUTH_REQUIRED);

    // Dev-bypass mode: no Firestore subscription. Components must tolerate
    // null doc and apply their own defaults.
    if (!authRequired) {
      setState({ doc: null, loading: false, error: null });
      return;
    }

    // No signed-in user yet: stay in loading state until auth settles.
    if (!user) {
      setState({ doc: null, loading: true, error: null });
      return;
    }

    // Tear down any previous subscription before starting a new one.
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    setState({ doc: null, loading: true, error: null });

    let db: Firestore;
    try {
      db = firestoreInstance ?? getFirestore();
    } catch (err) {
      setState({ doc: null, loading: false, error: err instanceof Error ? err : new Error(String(err)) });
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setState({ doc: snapshot.data() as UserDoc, loading: false, error: null });
        } else {
          setState({ doc: null, loading: false, error: null });
        }
      },
      (err) => {
        setState({ doc: null, loading: false, error: err });
      },
    );

    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [user, firestoreInstance]);

  return <UserDocContext.Provider value={state}>{children}</UserDocContext.Provider>;
}

export function useUserDoc(): UserDocState {
  const ctx = useContext(UserDocContext);
  if (!ctx) {
    throw new Error('useUserDoc must be used inside <UserDocProvider>');
  }
  return ctx;
}
