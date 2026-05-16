'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
  Leaf,
  X,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { useSearchParams } from 'react-router';

import { signInWithGoogle } from '@/lib/auth-actions'; // Disabled for demo
import { syncAuthProfile } from '@/lib/api';
import { getFirebaseAuth } from '@/lib/firebase';
import { usePostSignInNavigate } from '@/hooks/usePostSignInNavigate';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register';

type AuthModalContextValue = {
  open: (mode?: AuthMode) => void;
  close: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}

const AUTO_OPEN_DELAY_MS = 5;

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [searchParams, setSearchParams] = useSearchParams();

  const open = useCallback((next: AuthMode = 'login') => {
    setMode(next);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  // Open the modal automatically when an auth-gated page redirects here
  // with ?openAuth=login (see auth-guard.ts). A short delay lets the
  // landing page paint behind the modal so the transition reads as
  // "here's where you are, now sign in" instead of a bare modal.
  const requested = searchParams.get('openAuth');
  useEffect(() => {
    if (requested !== 'login' && requested !== 'register') return;
    const id = window.setTimeout(() => {
      setMode(requested);
      setIsOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('openAuth');
      setSearchParams(nextParams, { replace: true });
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
    // setSearchParams is stable; searchParams identity changes each render
    // but `requested` captures the meaningful trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isOpen ? (
          <AuthModal
            key="auth-modal"
            mode={mode}
            setMode={setMode}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
    </AuthModalContext.Provider>
  );
}

const EASE = [0.2, 0.7, 0.2, 1] as const;

function AuthModal({
  mode,
  setMode,
  onClose,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Sign in' : 'Create account'}
      className="theme-root fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute inset-0 cursor-default"
        style={{
          background: 'color-mix(in srgb, var(--theme-bg) 55%, transparent)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 120, scale: 0.98, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: 120, scale: 0.98, filter: 'blur(6px)' }}
        transition={{ duration: 0.55, ease: EASE }}
        className="auth-modal-shell relative z-[1] flex h-[100dvh] w-full max-w-[1120px] flex-col overflow-hidden md:h-auto md:mx-4 md:flex-row md:rounded-[20px]"
        style={{
          border: '1px solid var(--theme-border-strong)',
          background: 'var(--theme-bg)',
          boxShadow:
            '0 60px 120px -48px rgba(10,14,12,0.42), 0 0 0 1px var(--theme-border)',
        }}
      >
        <span
          aria-hidden
          className="mx-auto my-2.5 block h-1 w-10 rounded-full md:hidden"
          style={{ background: 'var(--theme-border-strong)' }}
        />
        <div
          aria-hidden
          className="theme-grain pointer-events-none absolute inset-0"
          style={{ position: 'absolute', zIndex: 1 }}
        />

        <BrandPane mode={mode} />

        <div
          className="relative z-[2] flex w-full flex-1 flex-col overflow-y-auto md:w-[56%] md:flex-initial md:overflow-visible"
          style={{ background: 'var(--theme-bg)' }}
        >
          <div className="flex items-center justify-between px-7 pt-6 md:px-10 md:pt-8">
            <ModeTabs mode={mode} setMode={setMode} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
              style={{
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-fg-muted)',
              }}
            >
              <X size={16} strokeWidth={1.6} />
            </button>
          </div>

          <div className="relative flex-1 px-7 pb-8 pt-6 md:px-10 md:pb-10 md:pt-8">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <LoginForm onDone={onClose} onSwitch={() => setMode('register')} />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <RegisterForm onDone={onClose} onSwitch={() => setMode('login')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BrandPane({ mode }: { mode: AuthMode }) {
  const headline =
    mode === 'login' ? (
      <>
        Welcome <span className="theme-italic">back</span> to the
        <br />
        quiet <span className="theme-italic">corridor</span>.
      </>
    ) : (
      <>
        Begin a <span className="theme-italic">lighter</span>
        <br />
        way to <span className="theme-italic">move</span>.
      </>
    );

  return (
    <div
      className="relative z-[2] hidden overflow-hidden md:flex md:w-[44%] md:flex-col"
      style={{
        background: 'var(--theme-bg-soft)',
        borderRight: '1px solid var(--theme-border)',
      }}
    >
      <div aria-hidden className="theme-mesh absolute inset-[-10%]" style={{ opacity: 0.55 }} />

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -left-2 select-none theme-display"
        style={{
          fontSize: 'clamp(6rem, 11vw, 10.5rem)',
          letterSpacing: '-0.06em',
          lineHeight: 0.82,
          color: 'var(--theme-fg)',
          opacity: 0.06,
        }}
      >
        Verdify.
      </div>

      <div className="relative flex flex-1 flex-col justify-between p-9 lg:p-11">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-[7px]"
              style={{ background: 'var(--theme-accent)' }}
            >
              <Leaf
                className="h-3.5 w-3.5"
                style={{ color: 'var(--theme-accent-fg)' }}
                strokeWidth={2.4}
              />
            </span>
            <span
              className="theme-display tracking-[-0.03em]"
              style={{ color: 'var(--theme-fg)', fontSize: '1.2rem' }}
            >
              Verdify
            </span>
          </div>

          <span
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            {mode === 'login' ? '§ Access — 01' : '§ Access — 02'}
          </span>
        </div>

        <div className="mt-10 space-y-6">
          <div className="flex items-center gap-3">
            <span className="theme-rule block" />
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-fg-dim)' }}
            >
              {mode === 'login' ? 'Return to session' : 'Open a new session'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.h2
              key={mode}
              initial={{ opacity: 0, y: 8, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 0.5, ease: EASE }}
              className="theme-display"
              style={{
                color: 'var(--theme-fg)',
                fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.96,
              }}
            >
              {headline}
            </motion.h2>
          </AnimatePresence>

          <p
            className="max-w-[34ch] text-[0.92rem] leading-[1.55]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            {mode === 'login'
              ? 'Sign in to pick up routes, carbon ledgers, and reports where you left off.'
              : 'Plan sustainable journeys, track your footprint, and receive weekly reports on your impact.'}
          </p>
        </div>

        <div className="relative mt-10 space-y-5">
          <div className="flex items-center gap-3">
            <span className="theme-accent-dot" />
            <span
              className="theme-mono"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              Corridor live · JB → SG
            </span>
          </div>

          <div
            className="grid grid-cols-3 gap-4 border-t pt-5"
            style={{ borderColor: 'var(--theme-border)' }}
          >
            <StatCell label="Routes indexed" value="1,284" />
            <StatCell label="Live corridors" value="06" />
            <StatCell label="CO₂ saved" value="4.2t" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="theme-number" style={{ fontSize: 'clamp(1.4rem, 2vw, 1.85rem)' }}>
        {value}
      </span>
      <span
        className="theme-mono-sm"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {label}
      </span>
    </div>
  );
}

function ModeTabs({
  mode,
  setMode,
}: {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
}) {
  const tabs: { id: AuthMode; num: string; label: string }[] = [
    { id: 'login', num: '01', label: 'Sign in' },
    { id: 'register', num: '02', label: 'Create account' },
  ];

  return (
    <div className="flex items-center gap-1">
      {tabs.map((t) => {
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setMode(t.id)}
            className="relative inline-flex items-baseline gap-2 px-3 py-2 transition-colors"
            style={{
              color: active ? 'var(--theme-fg)' : 'var(--theme-fg-dim)',
            }}
          >
            <span className="theme-mono-sm" style={{ opacity: 0.7 }}>
              §{t.num}
            </span>
            <span
              className="text-[0.9rem]"
              style={{ letterSpacing: '-0.01em' }}
            >
              {t.label}
            </span>
            {active ? (
              <motion.span
                layoutId="auth-tab-underline"
                className="absolute inset-x-2 -bottom-0.5 h-px"
                style={{ background: 'var(--theme-accent)' }}
                transition={{ duration: 0.4, ease: EASE }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  rightSlot,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  rightSlot?: ReactNode;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.length > 0;
  const borderColor = error
    ? 'var(--theme-accent-warm)'
    : focused
    ? 'var(--theme-accent)'
    : 'var(--theme-border-strong)';

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="theme-mono-sm flex items-center justify-between"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        <span>{label}</span>
        {error ? (
          <span style={{ color: 'var(--theme-accent-warm)' }}>{error}</span>
        ) : null}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-2.5 pr-10 text-[0.98rem] outline-none transition-colors"
          style={{
            color: 'var(--theme-fg)',
            fontFamily: 'var(--theme-font-body)',
            letterSpacing: '-0.005em',
          }}
        />
        {rightSlot ? (
          <div
            className="absolute right-0 flex items-center"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            {rightSlot}
          </div>
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{ background: 'var(--theme-border)' }}
        />
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left"
          initial={false}
          animate={{ scaleX: focused || hasValue ? 1 : 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ background: borderColor }}
        />
      </div>
    </div>
  );
}

// Google sign-in disabled for demo
/*
function SocialRow({
  onGoogle,
  disabled,
}: {
  onGoogle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <SocialButton
        label="Google"
        glyph={<GoogleGlyph />}
        onClick={onGoogle}
        disabled={disabled}
      />
    </div>
  );
}

function SocialButton({
  label,
  glyph,
  onClick,
  disabled,
}: {
  label: string;
  glyph: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Continue with ${label}`}
      className="group inline-flex h-11 min-w-0 items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap rounded-full px-3 transition-all disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        border: '1px solid var(--theme-border-strong)',
        color: 'var(--theme-fg)',
        fontFamily: 'var(--theme-font-body)',
        fontSize: '0.82rem',
        letterSpacing: '0.01em',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'var(--theme-accent-soft)';
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--theme-accent-muted)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'var(--theme-border-strong)';
      }}
    >
      <span
        className="flex h-4 w-4 items-center justify-center"
        style={{ color: 'var(--theme-fg)' }}
      >
        {glyph}
      </span>
      <span className="theme-action-label">{label}</span>
    </button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 18 18" width="14" height="14" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A9 9 0 0 0 .957 4.958l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
*/


function useSubmittable() {
  const [loading, setLoading] = useState(false);
  return { loading, setLoading };
}

function LoginForm({
  onDone,
  onSwitch,
}: {
  onDone: () => void;
  onSwitch: () => void;
}) {
  const navigateAfterSignIn = usePostSignInNavigate(onDone);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  const { loading, setLoading } = useSubmittable();

  useEffect(() => {
    requestAnimationFrame(() => firstFieldRef.current?.focus());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errs = {};
    if (!email) next.email = 'required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'invalid';
    if (!password) next.password = 'required';
    else if (password.length < 6) next.password = 'min 6';
    setErrs(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      const idToken = await cred.user.getIdToken();
      await syncAuthProfile(idToken);
      // Leave loading=true so the form stays disabled until the
      // AuthProvider settles and usePostSignInNavigate fires.
      navigateAfterSignIn(cred.user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      toast.error(message);
      setLoading(false);
    }
  };

  // Google sign-in disabled for demo
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      if (!cred) return; // redirect flow; the page will reload
      const idToken = await cred.user.getIdToken();
      await syncAuthProfile(idToken);
      navigateAfterSignIn(cred.user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <div ref={(el) => { firstFieldRef.current = el?.querySelector('input') ?? null; }}>
          <Field
            id="email"
            label="Email or username"
            type="email"
            autoComplete="email"
            placeholder="you@domain.com"
            value={email}
            onChange={setEmail}
            error={errs.email}
            required
          />
        </div>
        <Field
          id="password"
          label="Password"
          type={show ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          error={errs.password}
          required
          rightSlot={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="p-1 transition-colors hover:text-[var(--theme-fg)]"
            >
              {show ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
            </button>
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <label
          className="flex cursor-pointer items-center gap-2 text-[0.8rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--theme-accent)]"
          />
          Keep me signed in
        </label>
        <button
          type="button"
          className="theme-link-underline text-[0.8rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Forgot password?
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={loading}
          className="theme-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" strokeWidth={1.8} />
          ) : (
            <>
              <span className="theme-action-label">Sign in</span>
              <ArrowUpRight size={15} strokeWidth={1.8} />
            </>
          )}
        </button>

        <Divider label="or" />

        <SocialRow onGoogle={handleGoogle} disabled={loading} />
        
      </div>

      <p
        className="text-center text-[0.82rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        New to Verdify?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="theme-link-underline font-medium"
          style={{ color: 'var(--theme-fg)' }}
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

function RegisterForm({
  onDone,
  onSwitch,
}: {
  onDone: () => void;
  onSwitch: () => void;
}) {
  const navigateAfterSignIn = usePostSignInNavigate(onDone);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errs, setErrs] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    agreed?: string;
  }>({});
  const { loading, setLoading } = useSubmittable();

  const strength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  }, [password]);

  const strengthLabel = ['—', 'weak', 'fair', 'good', 'strong'][strength];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errs = {};
    if (!fullName.trim()) next.fullName = 'required';
    else if (fullName.trim().length < 3) next.fullName = 'min 3';
    if (!email) next.email = 'required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'invalid';
    if (!password) next.password = 'required';
    else if (password.length < 6) next.password = 'min 6';
    if (!agreed) next.agreed = 'required';
    setErrs(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      if (fullName.trim()) {
        await updateProfile(cred.user, { displayName: fullName.trim() });
      }
      const idToken = await cred.user.getIdToken();
      await syncAuthProfile(idToken);
      navigateAfterSignIn(cred.user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account.';
      toast.error(message);
      setLoading(false);
    }
  };

  // Google sign-in disabled for demo
  const handleGoogle = async () => {
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      if (!cred) return;
      const idToken = await cred.user.getIdToken();
    await syncAuthProfile(idToken);
      navigateAfterSignIn(cred.user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-5">
        <Field
          id="fullName"
          label="Full name"
          autoComplete="name"
          placeholder="Ada Lovelace"
          value={fullName}
          onChange={setFullName}
          error={errs.fullName}
          required
        />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          value={email}
          onChange={setEmail}
          error={errs.email}
          required
        />
        <div className="flex flex-col gap-2">
          <Field
            id="password"
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={setPassword}
            error={errs.password}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="p-1 transition-colors hover:text-[var(--theme-fg)]"
              >
                {show ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
              </button>
            }
          />
          {password ? (
            <div className="mt-1 flex items-center gap-3">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((lvl) => (
                  <span
                    key={lvl}
                    className="h-0.5 flex-1 rounded-full transition-colors"
                    style={{
                      background:
                        lvl <= strength
                          ? strength >= 3
                            ? 'var(--theme-accent)'
                            : 'var(--theme-accent-warm)'
                          : 'var(--theme-border)',
                    }}
                  />
                ))}
              </div>
              <span
                className="theme-mono-sm"
                style={{ color: 'var(--theme-fg-dim)' }}
              >
                {strengthLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <label
        className="flex cursor-pointer items-start gap-3 text-[0.8rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 accent-[var(--theme-accent)]"
        />
        <span style={{ lineHeight: 1.5 }}>
          I agree to the{' '}
          <a
            href="#"
            className="theme-link-underline"
            style={{ color: 'var(--theme-fg)' }}
          >
            Terms
          </a>{' '}
          &amp;{' '}
          <a
            href="#"
            className="theme-link-underline"
            style={{ color: 'var(--theme-fg)' }}
          >
            Privacy
          </a>
          .
          {errs.agreed ? (
            <span
              className="theme-mono-sm ml-2"
              style={{ color: 'var(--theme-accent-warm)' }}
            >
              required
            </span>
          ) : null}
        </span>
      </label>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={loading}
          className="theme-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" strokeWidth={1.8} />
          ) : (
            <>
              <span className="theme-action-label">
                <span className="sm:hidden">Create</span>
                <span className="hidden sm:inline">Create account</span>
              </span>
              <ArrowUpRight size={15} strokeWidth={1.8} />
            </>
          )}
        </button>

        <Divider label="or" />

        <SocialRow onGoogle={handleGoogle} disabled={loading} />
        
      </div>

      <p
        className="text-center text-[0.82rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="theme-link-underline font-medium"
          style={{ color: 'var(--theme-fg)' }}
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// Divider only used by the now-disabled Google sign-in block
/*
function Divider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-1">
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 h-px"
        style={{ background: 'var(--theme-border)' }}
      />
      <span
        className="theme-mono-sm relative px-3"
        style={{
          color: 'var(--theme-fg-dim)',
          background: 'var(--theme-bg)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
*/
