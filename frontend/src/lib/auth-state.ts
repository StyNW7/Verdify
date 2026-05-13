// Pure state-machine that mirrors AuthProvider's reducer logic without React
// or the firebase SDK. Lets us test loading transitions, sign-in/out, and
// token-change events in isolation.

export type AuthUserSnapshot = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

export type AuthMachineState = {
  user: AuthUserSnapshot | null;
  idToken: string | null;
  loading: boolean;
};

export const initialAuthState: AuthMachineState = {
  user: null,
  idToken: null,
  loading: true,
};

export type AuthEvent =
  | { kind: 'auth_state'; user: AuthUserSnapshot | null }
  | { kind: 'id_token'; token: string | null }
  | { kind: 'sign_out' };

export function reduceAuth(state: AuthMachineState, event: AuthEvent): AuthMachineState {
  switch (event.kind) {
    case 'auth_state':
      return { ...state, user: event.user, loading: false };
    case 'id_token':
      return { ...state, idToken: event.token };
    case 'sign_out':
      return { ...state, user: null, idToken: null };
    default:
      return state;
  }
}
