import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bike,
  Car,
  Check,
  Coins,
  Footprints,
  Gauge,
  Globe,
  KeyRound,
  Leaf,
  Shuffle,
  Train,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { useUserDoc } from '@/lib/user-doc-provider';
import { pickAvatar } from '@/lib/avatar-source';

type Mode = 'Transit' | 'Cycle' | 'Carpool' | 'Walk';
type Priority = 'Fastest' | 'Greenest' | 'Cheapest' | 'Balanced';
type Language = 'en' | 'ms' | 'zh' | 'ta';

const MODES: { id: Mode; label: string; hint: string; icon: LucideIcon }[] = [
  { id: 'Transit', label: 'Transit', hint: 'Bus, MRT, train', icon: Train },
  { id: 'Cycle', label: 'Cycle', hint: 'On two wheels', icon: Bike },
  { id: 'Carpool', label: 'Carpool', hint: 'Share the ride', icon: Car },
  { id: 'Walk', label: 'Walk', hint: 'Short legs only', icon: Footprints },
];

const PRIORITIES: { id: Priority; label: string; hint: string; icon: LucideIcon }[] = [
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
          Last synced · moments ago
        </span>
      </div>
    </motion.header>
  );
}

function IdentityCard() {
  const { user } = useAuth();
  const { doc: userDoc } = useUserDoc();

  const avatar = pickAvatar(user, userDoc);

  const displayName = user?.displayName?.trim()
    || user?.email?.split('@')[0]
    || 'Verdify member';
  const email = user?.email || '';
  const isVerified = user?.emailVerified ?? false;

  const initials = useMemo(() => {
    return (user?.displayName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || 'VD';
  }, [user?.displayName]);

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
        <span
          className="theme-mono-sm rounded-full border px-2 py-1"
          style={{
            borderColor: isVerified ? 'var(--theme-accent-muted)' : 'var(--theme-border)',
            color: isVerified ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
            fontSize: '0.56rem',
          }}
        >
          {isVerified ? 'Verified' : 'Unverified'}
        </span>
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
          <p
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Avatar — editing coming next slice
          </p>
          <p
            className="mt-2 text-[0.85rem]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            Google profile photo, preset emoji, or initials — in that order.
          </p>
        </div>
      </div>

      <div
        className="mt-8 grid grid-cols-1 gap-5 border-t pt-6 sm:grid-cols-2"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <ReadOnlyField label="Display name" value={displayName} />
        <ReadOnlyField label="Email address" value={email} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p
          className="text-[0.78rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Initials fall back to{' '}
          <span
            className="theme-italic"
            style={{ color: 'var(--theme-accent)' }}
          >
            {initials}
          </span>{' '}
          if no avatar is set.
        </p>
        <button
          type="button"
          disabled
          title="Editing coming next slice"
          className="theme-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save changes
        </button>
      </div>
    </motion.section>
  );
}

function TripDefaultsCard() {
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
            return (
              <div
                key={id}
                className="group relative flex flex-col items-start gap-2 rounded-[14px] p-3 text-left"
                style={{
                  background: 'var(--theme-surface-muted)',
                  border: '1px solid var(--theme-border)',
                  opacity: 0.7,
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                  style={{
                    background: 'var(--theme-surface)',
                    color: 'var(--theme-fg-muted)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="text-[0.88rem]" style={{ color: 'var(--theme-fg-muted)' }}>
                    {label}
                  </p>
                  <p className="theme-mono-sm mt-0.5" style={{ color: 'var(--theme-fg-dim)' }}>
                    {hint}
                  </p>
                </div>
              </div>
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
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-[12px] p-3 text-left"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--theme-border)',
                  opacity: 0.7,
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    background: 'var(--theme-surface-muted)',
                    color: 'var(--theme-fg-muted)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div className="flex-1">
                  <p className="text-[0.9rem]" style={{ color: 'var(--theme-fg-muted)' }}>
                    {label}
                  </p>
                  <p className="text-[0.78rem]" style={{ color: 'var(--theme-fg-dim)' }}>
                    {hint}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p
          className="text-[0.78rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Preference editing coming next slice.
        </p>
        <button
          type="button"
          disabled
          title="Editing coming next slice"
          className="theme-btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </motion.section>
  );
}

function SecurityCard() {
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

      <p
        className="mt-4 text-[0.9rem]"
        style={{ color: 'var(--theme-fg-muted)' }}
      >
        Password reset and Google sign-in management come in the next slice.
      </p>
    </motion.section>
  );
}

function LanguageCard() {
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
          const active = l.id === 'en';
          return (
            <button
              key={l.id}
              type="button"
              disabled
              title="Language preference editing coming next slice"
              className="flex items-center justify-between gap-4 rounded-[12px] p-4 text-left"
              style={{
                background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
                border: active ? '1px solid var(--theme-accent-muted)' : '1px solid var(--theme-border)',
                opacity: active ? 1 : 0.7,
                cursor: 'default',
              }}
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
        Language preference editing coming next slice.
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
