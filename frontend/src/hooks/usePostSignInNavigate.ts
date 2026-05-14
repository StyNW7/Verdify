import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@/lib/auth-provider';

// Wait until AuthProvider's snapshot reflects the just-signed-in uid before
// navigating. Without this, navigating immediately after
// signInWithEmailAndPassword causes AuthedLayout to evaluate with user=null
// (the onAuthStateChanged callback hasn't fired yet) and bounce the user
// back to /?openAuth=login.
//
// Safety net: if the auth state hasn't propagated within
// PROPAGATION_TIMEOUT_MS we navigate anyway. AuthedLayout will re-check on
// mount; in the worst case the user sees one more redirect cycle, which is
// still better than being trapped on the form.
const PROPAGATION_TIMEOUT_MS = 5000;

export type PostSignInNavigate = (uid: string) => void;

export function usePostSignInNavigate(onDone?: () => void): PostSignInNavigate {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pending, setPending] = useState<{ uid: string; target: string } | null>(null);

  useEffect(() => {
    if (!pending) return;
    if (user?.uid === pending.uid) {
      const target = pending.target;
      setPending(null);
      onDone?.();
      navigate(target);
    }
  }, [pending, user?.uid, onDone, navigate]);

  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => {
      setPending((current) => {
        if (!current) return null;
        onDone?.();
        navigate(current.target);
        return null;
      });
    }, PROPAGATION_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [pending, onDone, navigate]);

  return useCallback(
    (uid: string) => {
      const target = searchParams.get('next') || '/dashboard';
      setPending({ uid, target });
    },
    [searchParams],
  );
}
