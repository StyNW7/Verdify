import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

let lastPath: string | null = null;

export function getLastPath() {
  return lastPath;
}

export function NavHistoryTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    lastPath = pathname;
  }, [pathname]);
  return null;
}
