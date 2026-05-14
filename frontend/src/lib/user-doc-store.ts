import type { UserDoc, UserDocState } from './user-doc-provider.tsx';

// Minimal Firestore document reference shape the store passes back to the seam.
export type DocRef = { _path: string };

// Minimal Firestore snapshot shape the seam delivers to the store.
export type DocSnapshot = {
  exists(): boolean;
  data(): UserDoc;
};

// The Firestore surface the store depends on. Tests inject a fake; production
// wires the real firebase/firestore functions via UserDocProvider.
export type FirestoreSeams = {
  makeDocRef: (uid: string) => DocRef;
  onSnapshot: (
    ref: DocRef,
    onNext: (snap: DocSnapshot) => void,
    onError: (err: Error) => void,
  ) => () => void;
};

export type UserDocStore = {
  getSnapshot: () => UserDocState;
  subscribe: (listener: () => void) => () => void;
  // start() wires the Firestore subscription. Returns a teardown.
  // Calling start() while already started tears down the previous subscription
  // first (mirrors the auth-user-change case handled by UserDocProvider).
  start: (opts: { uid: string | null; authRequired: boolean }) => () => void;
};

export function createUserDocStore(seams: FirestoreSeams): UserDocStore {
  let snapshot: UserDocState = { doc: null, loading: true, error: null };
  const listeners = new Set<() => void>();
  let currentUnsub: (() => void) | null = null;

  const emit = () => {
    for (const l of listeners) l();
  };

  const setSnapshot = (next: UserDocState) => {
    snapshot = next;
    emit();
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start: ({ uid, authRequired }) => {
      // Tear down any previous subscription before starting a new one.
      if (currentUnsub) {
        currentUnsub();
        currentUnsub = null;
      }

      if (!authRequired) {
        setSnapshot({ doc: null, loading: false, error: null });
        return () => {};
      }

      if (!uid) {
        setSnapshot({ doc: null, loading: true, error: null });
        return () => {};
      }

      setSnapshot({ doc: null, loading: true, error: null });

      const unsub = seams.onSnapshot(
        seams.makeDocRef(uid),
        (snap) => {
          if (snap.exists()) {
            setSnapshot({ doc: snap.data(), loading: false, error: null });
          } else {
            setSnapshot({ doc: null, loading: false, error: null });
          }
        },
        (err) => {
          setSnapshot({ doc: null, loading: false, error: err });
        },
      );

      currentUnsub = unsub;

      return () => {
        if (currentUnsub === unsub) {
          unsub();
          currentUnsub = null;
        }
      };
    },
  };
}
