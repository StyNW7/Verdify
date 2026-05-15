import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bike,
  Car,
  Check,
  Coins,
  ExternalLink,
  Footprints,
  Gauge,
  Globe,
  KeyRound,
  Leaf,
  Shuffle,
  Train,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';

import { useAuth } from '@/lib/auth-provider';
import { useUserDoc } from '@/lib/user-doc-provider';
import { pickAvatar } from '@/lib/avatar-source';
import { patchUser, type UserPatch } from '@/lib/api';
import { getFirebaseAuth } from '@/lib/firebase';
import { getSecurityCardState } from './security-card-state';
import { getInitialTripDefaults } from './trip-defaults-state';
import { TRANSPORTS, ROUTE_MODES, LANGUAGES as LANGUAGE_IDS, type Transport, type RouteMode, type Language } from '@/lib/preferences';

// Exported so the backend validator and frontend stay in sync.
export const PRESET_AVATARS = ['🌿', '🦊', '🌊', '🌙', '🐝', '🪴'] as const;
export type PresetAvatar = (typeof PRESET_AVATARS)[number];

const MODES: { id: Transport; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'Transit', label: 'Transit', hint: 'Bus, MRT, train', icon: Train },
  { id: 'Cycle', label: 'Cycle', hint: 'On two wheels', icon: Bike },
  { id: 'Carpool', label: 'Carpool', hint: 'Share the ride', icon: Car },
  { id: 'Walk', label: 'Walk', hint: 'Short legs only', icon: Footprints },
];

const PRIORITIES: { id: RouteMode; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'Fastest', label: 'Fastest', hint: 'Shave the minutes', icon: Gauge },
  { id: 'Greenest', label: 'Greenest', hint: 'Lowest CO₂ first', icon: Leaf },
  { id: 'Cheapest', label: 'Cheapest', hint: 'Spend less, ride smart', icon: Coins },
  { id: 'Balanced', label: 'Balanced', hint: 'A little of each', icon: Shuffle },
];

const LANGUAGES: { id: Language; label: string; native: string; note: string }[] = [
  { id: 'en', label: 'English', native: 'English', note: 'Default' },
  { id: 'ms', label: 'Malay', native: 'Bahasa Malaysia', note: 'Regional' },
  { id: 'zh', label: 'Chinese', native: '简体中文', note: 'Beta' },
  { id: 'ta', label: 'Tamil', native: 'தமிழ்', note: 'Beta' },
];

// Validate that local MODES/PRIORITIES arrays stay in sync with preferences.ts
const _transportCheck: readonly Transport[] = TRANSPORTS;
const _routeModeCheck: readonly RouteMode[] = ROUTE_MODES;
const _languageCheck: readonly Language[] = LANGUAGE_IDS;
void _transportCheck; void _routeModeCheck; void _languageCheck;

export default function ProfilePage() {
  return (
    <div
      className="relative mx-auto w-full px-5 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-10"
      style={{ maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <ProfileHeader />

      <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 lg:grid-cols-2 lg:items-stretch">
        <div className="flex h-full flex-col gap-5 [&>section:last-child]:flex-1">
          <IdentityCard />
          <SecurityCard />
        </div>
        <div className="flex h-full flex-col gap-5 [&>section:last-child]:flex-1">
          <TripDefaultsCard />
          <LanguageCard />
        </div>
      </div>
    </div>
  );
}

function ProfileHeader() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
      className="flex flex-wrap items-end justify-between gap-6"
    >
      <div>
        <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Account / Preferences
        </p>
        <h1
          className="theme-display mt-2 text-[clamp(2rem,8vw,3.6rem)] leading-[0.95]"
          style={{ color: 'var(--theme-fg)' }}
        >
          Your{' '}
          <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
            account,
          </span>{' '}
          tuned.
        </h1>
        <p
          className="mt-3 max-w-xl text-[0.95rem] leading-relaxed"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          A quiet place to adjust how Verdify reads the road for you — your
          defaults, your voice, your keys.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="theme-mono-sm rounded-full border px-3 py-1.5"
          style={{
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-fg-dim)',
          }}
        >
          Live snapshot
        </span>
      </div>
    </motion.header>
  );
}

function IdentityCard() {
  const { user } = useAuth();
  const { doc: userDoc } = useUserDoc();

  const savedDisplayName = userDoc?.displayName ?? user?.displayName ?? '';
  const savedPresetAvatar = userDoc?.presetAvatar ?? '';

  const [displayName, setDisplayName] = useState(savedDisplayName);
  const [presetAvatar, setPresetAvatar] = useState(savedPresetAvatar);
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [verificationSending, setVerificationSending] = useState(false);
  const [verificationCooldown, setVerificationCooldown] = useState(0);

  // Sync local state when snapshot arrives (after first load or external change).
  useEffect(() => {
    setDisplayName(userDoc?.displayName ?? user?.displayName ?? '');
  }, [userDoc?.displayName, user?.displayName]);
  useEffect(() => {
    setPresetAvatar(userDoc?.presetAvatar ?? '');
  }, [userDoc?.presetAvatar]);

  // Verification cooldown timer.
  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = setTimeout(() => setVerificationCooldown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [verificationCooldown]);

  const avatar = pickAvatar(
    user,
    presetAvatar ? { presetAvatar } : userDoc,
  );
  const isVerified = user?.emailVerified ?? false;
  const email = user?.email ?? '';

  const handleSave = async () => {
    if (!user) return;
    setNameError('');
    setIsSaving(true);

    try {
      const trimmedName = displayName.trim();
      const nameChanged = trimmedName !== (user.displayName ?? '');
      const avatarChanged = presetAvatar !== savedPresetAvatar;

      if (nameChanged) {
        try {
          const currentUser = getFirebaseAuth().currentUser;
          if (currentUser) {
            await updateProfile(currentUser, { displayName: trimmedName });
          }
        } catch (err: unknown) {
          const code = (err as { code?: string }).code;
          if (code === 'auth/requires-recent-login') {
            setNameError('Sign in again to change your name');
            setIsSaving(false);
            return;
          }
          throw err;
        }
      }

      // Build patch with only changed fields.
      const patch: UserPatch = {};
      if (nameChanged) patch.displayName = trimmedName;
      if (avatarChanged && presetAvatar) patch.presetAvatar = presetAvatar as PresetAvatar;

      if (Object.keys(patch).length > 0) {
        await patchUser(user.uid, patch);
      }

      toast.success('Profile saved.');
      // Post-save state comes from the onSnapshot subscription.
    } catch (err: unknown) {
      // Surface per-field 400 errors.
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 400) {
        toast.error(apiErr.message ?? 'Validation failed.');
      } else {
        toast.error('Could not save profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendVerification = async () => {
    const currentUser = getFirebaseAuth().currentUser;
    if (!currentUser || verificationCooldown > 0) return;
    setVerificationSending(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success('Verification email sent — check your inbox.');
      setVerificationCooldown(60);
    } catch {
      toast.error('Could not send verification email. Please try again.');
    } finally {
      setVerificationSending(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card relative overflow-hidden p-6 md:p-8"
    >
      <CornerTicks />

      <div className="flex items-center justify-between">
        <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Identity · #01
        </p>
        {isVerified ? (
          <span
            className="theme-mono-sm rounded-full border px-2 py-1"
            style={{
              borderColor: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)',
              fontSize: '0.56rem',
            }}
          >
            Verified
          </span>
        ) : (
          <button
            type="button"
            disabled={verificationSending || verificationCooldown > 0}
            onClick={handleSendVerification}
            className="theme-mono-sm rounded-full border px-2 py-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-fg-dim)',
              fontSize: '0.56rem',
            }}
          >
            {verificationCooldown > 0
              ? `Resend in ${verificationCooldown}s`
              : verificationSending
                ? 'Sending…'
                : 'Send verification email'}
          </button>
        )}
      </div>

      <h3
        className="theme-display mt-2 text-[1.6rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        Your{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
          face
        </span>{' '}
        on the road.
      </h3>

      <div className="mt-7 flex flex-col items-center gap-5 md:flex-row md:items-start">
        <div className="relative shrink-0">
          <div
            className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full"
            style={{
              background: 'var(--theme-accent-soft)',
              border: '1px solid var(--theme-accent-muted)',
              boxShadow: '0 20px 40px -20px rgba(10,14,12,0.35)',
            }}
          >
            {avatar.kind === 'photo' ? (
              <img
                src={avatar.value}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : avatar.kind === 'preset' ? (
              <span className="text-[2.8rem] leading-none">{avatar.value}</span>
            ) : (
              <span
                className="theme-display text-[1.8rem]"
                style={{ color: 'var(--theme-accent)' }}
              >
                {avatar.value}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1">
          <p className="theme-mono-sm mb-3" style={{ color: 'var(--theme-fg-dim)' }}>
            Pick an avatar
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESET_AVATARS.map((emoji) => {
              const active = presetAvatar === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setPresetAvatar(active ? '' : emoji)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[1.4rem] leading-none transition-all"
                  style={{
                    background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                    border: active ? '2px solid var(--theme-accent-muted)' : '1px solid var(--theme-border)',
                  }}
                  aria-pressed={active}
                  title={emoji}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="mt-8 grid grid-cols-1 gap-5 border-t pt-6 sm:grid-cols-2"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        {/* Editable display name */}
        <div>
          <span className="theme-mono-sm block" style={{ color: 'var(--theme-fg-dim)' }}>
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setNameError('');
            }}
            maxLength={60}
            className="mt-2 w-full rounded-[12px] px-3 py-2 text-[0.95rem] outline-none focus:ring-1"
            style={{
              background: 'var(--theme-surface-muted)',
              border: nameError ? '1px solid var(--theme-danger, #e74c3c)' : '1px solid var(--theme-border)',
              color: 'var(--theme-fg)',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              '--tw-ring-color': 'var(--theme-accent-muted)',
            } as React.CSSProperties}
          />
          {nameError && (
            <p className="mt-1 text-[0.78rem]" style={{ color: 'var(--theme-danger, #e74c3c)' }}>
              {nameError}
            </p>
          )}
        </div>

        {/* Read-only email */}
        <ReadOnlyField label="Email address" value={email} />
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="theme-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </motion.section>
  );
}

function SecurityCard() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent'>('idle');

  const fbUser = getFirebaseAuth().currentUser;
  const providers = fbUser?.providerData?.map((p) => p.providerId) ?? [];
  const email = user?.email ?? '';
  const state = getSecurityCardState({ providers, email });

  const handleResetPassword = async () => {
    if (!email || phase === 'sending') return;
    setPhase('sending');
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setPhase('sent');
    } catch {
      toast.error('Could not send reset email. Please try again.');
      setPhase('idle');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card flex flex-col p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Security · #03
        </p>
        <span
          className="flex items-center gap-1.5 theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          <KeyRound className="h-[11px] w-[11px]" strokeWidth={1.8} />
          Firebase Auth
        </span>
      </div>

      <h3
        className="theme-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        Your{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
          sign-in
        </span>{' '}
        method.
      </h3>

      <div className="mt-5 flex-1">
        {state.panel === 'reset-password' && phase !== 'sent' && (
          <div className="flex flex-col gap-4">
            <p className="text-[0.9rem]" style={{ color: 'var(--theme-fg-muted)' }}>
              Reset your password via a secure link sent to your email.
            </p>
            <button
              type="button"
              disabled={phase === 'sending'}
              onClick={handleResetPassword}
              className="theme-btn-primary self-start disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === 'sending' ? 'Sending…' : 'Email me a reset link'}
            </button>
          </div>
        )}

        {state.panel === 'reset-password' && phase === 'sent' && (
          <div className="flex flex-col gap-3">
            <p className="text-[0.9rem]" style={{ color: 'var(--theme-fg-muted)' }}>
              Check your email for a link to reset your password — it may take a few minutes to arrive. The link works for 1 hour.
            </p>
          </div>
        )}

        {state.panel === 'google-only' && (
          <div className="flex flex-col gap-4">
            <p className="text-[0.9rem]" style={{ color: 'var(--theme-fg-muted)' }}>
              You're signed in with Google. Your password is managed by Google.
            </p>
            <a
              href="https://myaccount.google.com/security"
              target="_blank"
              rel="noopener noreferrer"
              className="theme-btn-ghost self-start"
            >
              Manage at Google
              <ExternalLink className="ml-1.5 h-[12px] w-[12px]" strokeWidth={1.8} />
            </a>
          </div>
        )}
      </div>

      <p
        className="mt-6 border-t pt-4 text-[0.78rem]"
        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-fg-dim)' }}
      >
        Signed in as {state.email} via {state.providerLabel}.
      </p>
    </motion.section>
  );
}

function TripDefaultsCard() {
  const { user } = useAuth();
  const { doc: userDoc } = useUserDoc();

  // Seed transport/routeMode once from the first non-null doc snapshot.
  // After the user interacts with any button, snapshot updates are ignored
  // so an in-progress selection cannot be silently reverted before Apply.
  const seededRef = useRef(false);
  const [transport, setTransport] = useState<Transport>(
    () => getInitialTripDefaults(userDoc).transport,
  );
  const [routeMode, setRouteMode] = useState<RouteMode>(
    () => getInitialTripDefaults(userDoc).routeMode,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Persisted values used for the dirty check in handleApply.
  const savedTransport = (userDoc?.preferredTransport as Transport | undefined) ?? 'Transit';
  const savedRouteMode = (userDoc?.preferredRouteMode as RouteMode | undefined) ?? 'Greenest';

  // One-shot seed: apply the first non-null doc snapshot if the user hasn't
  // interacted yet and the component mounted before the doc was ready.
  useEffect(() => {
    if (userHasInteracted || seededRef.current || !userDoc) return;
    seededRef.current = true;
    setTransport((userDoc.preferredTransport as Transport | undefined) ?? 'Transit');
    setRouteMode((userDoc.preferredRouteMode as RouteMode | undefined) ?? 'Greenest');
  }, [userDoc, userHasInteracted]);

  const handleApply = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const patch: UserPatch = {};
      if (transport !== savedTransport) patch.preferredTransport = transport;
      if (routeMode !== savedRouteMode) patch.preferredRouteMode = routeMode;
      if (Object.keys(patch).length > 0) {
        await patchUser(user.uid, patch);
      }
      toast.success('Preferences updated.');
    } catch {
      toast.error('Could not save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Trip defaults · #02
        </p>
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          Applied to every new plan
        </span>
      </div>

      <h3
        className="theme-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        How you{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
          prefer
        </span>{' '}
        to move.
      </h3>

      <div className="mt-5">
        <p
          className="theme-mono-sm mb-3"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          Preferred transport
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map(({ id, label, hint, icon: Icon }) => {
            const active = transport === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setUserHasInteracted(true); setTransport(id); }}
                className="group relative flex flex-col items-start gap-2 rounded-[14px] p-3 text-left transition-all"
                style={{
                  background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                  border: active ? '1px solid var(--theme-accent-muted)' : '1px solid var(--theme-border)',
                }}
                aria-pressed={active}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                  style={{
                    background: active ? 'var(--theme-accent)' : 'var(--theme-surface)',
                    color: active ? 'var(--theme-accent-fg)' : 'var(--theme-fg-muted)',
                    border: active ? 'none' : '1px solid var(--theme-border)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[0.88rem]" style={{ color: active ? 'var(--theme-fg)' : 'var(--theme-fg-muted)' }}>
                    {label}
                  </p>
                  <p className="theme-mono-sm mt-0.5" style={{ color: 'var(--theme-fg-dim)' }}>
                    {hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="mt-6 border-t pt-6"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <p
          className="theme-mono-sm mb-3"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          Routing preference
        </p>
        <div className="flex flex-col gap-2">
          {PRIORITIES.map(({ id, label, hint, icon: Icon }) => {
            const active = routeMode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setUserHasInteracted(true); setRouteMode(id); }}
                className="flex items-center gap-3 rounded-[12px] p-3 text-left transition-all"
                style={{
                  background: active ? 'var(--theme-accent-soft)' : 'transparent',
                  border: active ? '1px solid var(--theme-accent-muted)' : '1px solid var(--theme-border)',
                }}
                aria-pressed={active}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    background: active ? 'var(--theme-accent)' : 'var(--theme-surface-muted)',
                    color: active ? 'var(--theme-accent-fg)' : 'var(--theme-fg-muted)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div className="flex-1">
                  <p className="text-[0.9rem]" style={{ color: active ? 'var(--theme-fg)' : 'var(--theme-fg-muted)' }}>
                    {label}
                  </p>
                  <p className="text-[0.78rem]" style={{ color: 'var(--theme-fg-dim)' }}>
                    {hint}
                  </p>
                </div>
                {active && (
                  <Check className="ml-auto shrink-0 h-4 w-4" style={{ color: 'var(--theme-accent)' }} strokeWidth={2.2} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={handleApply}
          className="theme-btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : 'Apply'}
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </motion.section>
  );
}

function LanguageCard() {
  const { user } = useAuth();
  const { doc: userDoc } = useUserDoc();

  const savedLanguage = (userDoc?.language as Language | undefined) ?? 'en';
  const [language, setLanguage] = useState<Language>(savedLanguage);

  // Sync initial state when snapshot arrives.
  useEffect(() => {
    if (userDoc?.language) {
      setLanguage(userDoc.language as Language);
    }
  }, [userDoc?.language]);

  const handleSelect = async (id: Language) => {
    if (!user || id === language) return;
    setLanguage(id);
    try {
      await patchUser(user.uid, { language: id });
      toast.success('Preference saved.');
    } catch {
      setLanguage(language);
      toast.error('Could not save language preference. Please try again.');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          Language · #04
        </p>
        <span
          className="flex items-center gap-1.5 theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          <Globe className="h-[11px] w-[11px]" strokeWidth={1.8} />
          4 locales
        </span>
      </div>

      <h3
        className="theme-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        In what{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
          voice
        </span>
        ?
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {LANGUAGES.map((l) => {
          const active = language === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => handleSelect(l.id)}
              className="flex items-center justify-between gap-4 rounded-[12px] p-4 text-left transition-all"
              style={{
                background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                border: active ? '1px solid var(--theme-accent-muted)' : '1px solid var(--theme-border)',
              }}
              aria-pressed={active}
            >
              <div>
                <p
                  className="text-[0.92rem]"
                  style={{ color: active ? 'var(--theme-fg)' : 'var(--theme-fg-muted)' }}
                >
                  {l.native}
                </p>
                <p className="theme-mono-sm mt-0.5" style={{ color: 'var(--theme-fg-dim)' }}>
                  {l.label} · {l.note}
                </p>
              </div>
              {active ? (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--theme-accent)',
                    color: 'var(--theme-accent-fg)',
                  }}
                  aria-hidden
                >
                  <Check className="h-[11px] w-[11px]" strokeWidth={2.6} />
                </span>
              ) : (
                <span
                  className="theme-mono-sm uppercase"
                  style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.16em' }}
                >
                  {l.id}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p
        className="mt-5 text-[0.78rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        Language changes apply on next session once i18n is enabled.
      </p>
    </motion.section>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <span
        className="theme-mono-sm block"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {label}
      </span>
      <div
        className="mt-2 flex items-center rounded-[12px] px-3 py-2"
        style={{
          background: 'var(--theme-surface-muted)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <span
          className="w-full text-[0.95rem]"
          style={{ color: 'var(--theme-fg)' }}
        >
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

function CornerTicks() {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: 'var(--theme-accent-muted)',
    pointerEvents: 'none',
  };
  return (
    <>
      <span
        aria-hidden
        style={{ ...base, top: 10, left: 10, borderTop: '1px solid', borderLeft: '1px solid' }}
      />
      <span
        aria-hidden
        style={{ ...base, top: 10, right: 10, borderTop: '1px solid', borderRight: '1px solid' }}
      />
      <span
        aria-hidden
        style={{ ...base, bottom: 10, left: 10, borderBottom: '1px solid', borderLeft: '1px solid' }}
      />
      <span
        aria-hidden
        style={{ ...base, bottom: 10, right: 10, borderBottom: '1px solid', borderRight: '1px solid' }}
      />
    </>
  );
}

