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
import { createUserDocStore, type FirestoreSeams, type UserDocStore } from '@/lib/user-doc-store';

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
  preferredTransport?: string;
  preferredRouteMode?: string;
  language?: string;
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

function makeFirestoreSeams(firestoreInstance?: Firestore): FirestoreSeams {
  const db = firestoreInstance ?? getFirestore();
  return {
    makeDocRef: (uid: string) => doc(db, 'users', uid) as unknown as import('@/lib/user-doc-store').DocRef,
    onSnapshot: (ref, onNext, onError) =>
      onSnapshot(
        ref as unknown as Parameters<typeof onSnapshot>[0],
        onNext as Parameters<typeof onSnapshot>[1],
        onError,
      ),
  };
}

export function UserDocProvider({ children, firestoreInstance }: ProviderProps) {
  const { user } = useAuth();
  const authRequired = parseAuthRequired(import.meta.env.VITE_AUTH_REQUIRED);

  // Create the store once. We build the seams lazily so that getFirestore()
  // is only called when the component first renders (Firebase is initialized
  // by then via FirebaseApp in the tree above).
  const storeRef = useRef<UserDocStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createUserDocStore(makeFirestoreSeams(firestoreInstance));
  }
  const store = storeRef.current;

  const [state, setState] = useState<UserDocState>(() => store.getSnapshot());

  useEffect(() => {
    // Subscribe to store updates.
    const unsub = store.subscribe(() => {
      setState(store.getSnapshot());
    });

    // Wire the Firestore subscription for the current user.
    const teardown = store.start({ uid: user?.uid ?? null, authRequired });

    // Sync immediately in case start() changed the snapshot synchronously
    // before subscribe() had a chance to fire.
    setState(store.getSnapshot());

    return () => {
      unsub();
      teardown();
    };
  }, [user, authRequired, store]);

  return <UserDocContext.Provider value={state}>{children}</UserDocContext.Provider>;
}

export function useUserDoc(): UserDocState {
  const ctx = useContext(UserDocContext);
  if (!ctx) {
    throw new Error('useUserDoc must be used inside <UserDocProvider>');
  }
  return ctx;
}
