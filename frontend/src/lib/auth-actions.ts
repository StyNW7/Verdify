import {
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithRedirect,
  type UserCredential,
} from 'firebase/auth';

import { getFirebaseAuth, getGoogleProvider } from './firebase';

const POPUP_BLOCKED = 'auth/popup-blocked';
const POPUP_CLOSED = 'auth/popup-closed-by-user';
const ACCOUNT_EXISTS = 'auth/account-exists-with-different-credential';

function isMobile(): boolean {
  return /Mobi|Android/i.test(navigator.userAgent);
}

function firebaseCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code: string }).code;
  }
  return null;
}

// Sends a Firebase password-reset email to `email`.
//
// Resolves silently for both registered and unregistered addresses —
// Firebase does not reveal whether an account exists on reset, and we
// follow the same privacy posture by treating auth/user-not-found as success.
//
// Rejects with a user-facing Error for auth/invalid-email and network
// failures so the caller can surface the message inline.
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  } catch (err: unknown) {
    const code = firebaseCode(err);

    if (code === 'auth/user-not-found') {
      if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.debug('[auth] requestPasswordReset: user-not-found, treating as success');
      }
      return;
    }

    if (code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }

    throw new Error('Unable to send reset email. Please check your connection and try again.');
  }
}

// Signs in with Google using popup on desktop, redirect on mobile.
// Falls back to redirect when the popup is blocked or dismissed.
//
// Throws a user-facing Error for auth/account-exists-with-different-credential
// so the login/register page can surface it inline.
//
// Returns the UserCredential on popup success so the caller can read the
// idToken directly (avoiding the onIdTokenChanged microtask race). Returns
// null when the redirect path is taken — the page will navigate away and
// getRedirectResult fires on the return leg.
export async function signInWithGoogle(): Promise<UserCredential | null> {
  const auth = getFirebaseAuth();
  const provider = getGoogleProvider();

  if (isMobile()) {
    await signInWithRedirect(auth, provider);
    return null;
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (err: unknown) {
    const code = firebaseCode(err);

    if (code === ACCOUNT_EXISTS) {
      throw new Error(
        'This email is already registered with a password — sign in with password to link Google to your account.',
      );
    }

    if (code === POPUP_BLOCKED || code === POPUP_CLOSED) {
      await signInWithRedirect(auth, provider);
      return null;
    }

    throw err;
  }
}
