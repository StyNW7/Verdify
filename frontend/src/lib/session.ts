const SESSION_KEYS = {
  isLoggedIn: 'isLoggedIn',
  userId: 'verdify:userId',
  token: 'verdify:token',
  userEmail: 'userEmail',
  userName: 'userName',
} as const;

export type AuthSession = {
  userId: string;
  token: string;
  email: string;
  name?: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

export function saveAuthSession(session: AuthSession) {
  if (!isBrowser()) return;
  localStorage.setItem(SESSION_KEYS.isLoggedIn, 'true');
  localStorage.setItem(SESSION_KEYS.userId, session.userId);
  localStorage.setItem(SESSION_KEYS.token, session.token);
  localStorage.setItem(SESSION_KEYS.userEmail, session.email);
  if (session.name) {
    localStorage.setItem(SESSION_KEYS.userName, session.name);
  }
}

export function getUserIdFromSession() {
  if (!isBrowser()) return null;
  return localStorage.getItem(SESSION_KEYS.userId);
}

export function clearAuthSession() {
  if (!isBrowser()) return;
  localStorage.removeItem(SESSION_KEYS.isLoggedIn);
  localStorage.removeItem(SESSION_KEYS.userId);
  localStorage.removeItem(SESSION_KEYS.token);
  localStorage.removeItem(SESSION_KEYS.userEmail);
  localStorage.removeItem(SESSION_KEYS.userName);
}
