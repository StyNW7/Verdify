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

export type RedirectResult = {
  user: AuthSeamUser;
  idToken: string;
};

export type AuthSeams = {
  subscribeAuthState: (cb: (user: AuthSeamUser | null) => void) => () => void;
  subscribeIdToken: (cb: (user: AuthSeamUser | null) => void) => () => void;
  signOut: () => Promise<void>;
  // Called once on store construction to handle the return leg of
  // signInWithRedirect. Resolves to { user, idToken } if a redirect just
  // completed, null otherwise.
  getRedirectResult?: () => Promise<RedirectResult | null>;
  // Optional override of the api.ts token-getter installer. Tests inject a
  // spy; production leaves this undefined and uses lib/api's module-level
  // setter.
  setTokenGetter?: (getter: () => string | null) => void;
};

export type AuthStore = {
  getSnapshot: () => AuthSnapshot;
  subscribe: (listener: () => void) => () => void;
  signOut: () => Promise<void>;
  // start() wires up the seam subscriptions and installs the api.ts token
  // getter. Safe to call multiple times; subsequent calls are no-ops while
  // the store is already started. Returns the matching teardown function so
  // the caller can pair it with useEffect cleanup.
  start: () => () => void;
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
//
// IMPORTANT: subscriptions are NOT registered at construction time. The
// React layer (or tests) must call start() to wire them up, and call the
// returned teardown function to clean them up. This pattern survives
// React 18 Strict Mode's mount → cleanup → remount cycle, where a store
// constructed inside useMemo could otherwise be disposed without ever
// being re-subscribed (useMemo returns the cached, dead store).
export function createAuthStore(seams: AuthSeams): AuthStore {
  let snapshot: AuthSnapshot = { user: null, idToken: null, loading: true };
  const listeners = new Set<() => void>();
  let started = false;

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

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    signOut: () => seams.signOut(),
    start: () => {
      if (started) {
        // Already started; return a no-op teardown so the caller can still
        // pair it with useEffect cleanup without double-unsubscribing.
        return () => {};
      }
      started = true;

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

      // Handle the return leg of signInWithRedirect. Fires once per start();
      // if a redirect just completed, populate user + idToken immediately so
      // the caller can call syncAuthProfile with the explicit token before
      // onAuthStateChanged fires.
      if (seams.getRedirectResult) {
        void seams
          .getRedirectResult()
          .then((result) => {
            if (!result) return;
            setSnapshot({
              user: toAuthUser(result.user),
              idToken: result.idToken,
              loading: false,
            });
          })
          .catch(() => {
            // Redirect result errors (e.g. auth/popup-closed) are non-fatal;
            // onAuthStateChanged will still fire and settle the loading state.
          });
      }

      return () => {
        started = false;
        unsubAuth();
        unsubToken();
        installTokenGetter(() => null);
      };
    },
  };
}
