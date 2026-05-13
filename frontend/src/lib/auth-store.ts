import { setAuthTokenGetter } from './api.ts';

export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type AuthSnapshot = {
  user: AuthUser | null;
  idToken: string | null;
  loading: boolean;
};

// Minimal user shape the seam needs. Production callbacks (firebase/auth's
// User) satisfy this structurally, so no adapter required at the call sites.
export type AuthSeamUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
};

export type AuthSeams = {
  subscribeAuthState: (cb: (user: AuthSeamUser | null) => void) => () => void;
  subscribeIdToken: (cb: (user: AuthSeamUser | null) => void) => () => void;
  signOut: () => Promise<void>;
  // Optional override of the api.ts token-getter installer. Tests inject a
  // spy; production leaves this undefined and uses lib/api's module-level
  // setter.
  setTokenGetter?: (getter: () => string | null) => void;
};

export type AuthStore = {
  getSnapshot: () => AuthSnapshot;
  subscribe: (listener: () => void) => () => void;
  signOut: () => Promise<void>;
  dispose: () => void;
};

function toAuthUser(u: AuthSeamUser | null): AuthUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

// Pure factory — no React. AuthProvider wraps this via useSyncExternalStore;
// tests drive it directly with fake seams to verify the wiring (auth-state
// callbacks → snapshot, token callbacks → setTokenGetter, signOut).
export function createAuthStore(seams: AuthSeams): AuthStore {
  let snapshot: AuthSnapshot = { user: null, idToken: null, loading: true };
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const l of listeners) l();
  };

  const setSnapshot = (next: AuthSnapshot) => {
    snapshot = next;
    emit();
  };

  const installTokenGetter = seams.setTokenGetter ?? setAuthTokenGetter;
  // Read the *current* token via closure so refreshes land on the next
  // request without any re-subscription.
  installTokenGetter(() => snapshot.idToken);

  const unsubAuth = seams.subscribeAuthState((u) => {
    setSnapshot({ ...snapshot, user: toAuthUser(u), loading: false });
  });

  const unsubToken = seams.subscribeIdToken((u) => {
    if (!u) {
      setSnapshot({ ...snapshot, idToken: null });
      return;
    }
    void u
      .getIdToken()
      .then((token) => {
        setSnapshot({ ...snapshot, idToken: token });
      })
      .catch(() => {
        setSnapshot({ ...snapshot, idToken: null });
      });
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    signOut: () => seams.signOut(),
    dispose: () => {
      unsubAuth();
      unsubToken();
      listeners.clear();
      installTokenGetter(() => null);
    },
  };
}
