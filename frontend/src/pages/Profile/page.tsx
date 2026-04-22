import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Bike,
  Camera,
  Car,
  Check,
  Coins,
  Eye,
  EyeOff,
  Footprints,
  Gauge,
  Globe,
  KeyRound,
  Leaf,
  Save,
  Shuffle,
  Train,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const PRESET_AVATARS = ['🌿', '🦊', '🌊', '🌙', '🐝', '🪴'];

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
          <PasswordCard />
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
          className="landing-display mt-2 text-[clamp(2rem,8vw,3.6rem)] leading-[0.95]"
          style={{ color: 'var(--landing-text)' }}
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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('Sarah Rashid');
  const [email, setEmail] = useState('sarah.rashid@verdify.io');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<string | null>('🌿');

  const initials = useMemo(() => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('');
  }, [name]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    const url = URL.createObjectURL(file);
    setAvatarUrl(url);
    setAvatarPreset(null);
  };

  const onSave = () => {
    toast.success('Profile saved.');
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
        <span
          className="theme-mono-sm rounded-full border px-2 py-1"
          style={{
            borderColor: 'var(--theme-border)',
            color: 'var(--theme-fg-dim)',
            fontSize: '0.56rem',
          }}
        >
          Verified
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
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : avatarPreset ? (
              <span className="text-[2.8rem] leading-none">{avatarPreset}</span>
            ) : (
              <span
                className="theme-display text-[1.8rem]"
                style={{ color: 'var(--theme-accent)' }}
              >
                {initials || 'VD'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 hover:scale-105"
            style={{
              background: 'var(--theme-accent)',
              color: 'var(--theme-accent-fg)',
              boxShadow: '0 8px 24px -8px rgba(31,122,61,0.55)',
            }}
            aria-label="Upload new avatar"
          >
            <Camera className="h-[14px] w-[14px]" strokeWidth={2} />
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <div className="flex-1">
          <p
            className="theme-mono-sm"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Or choose a preset
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESET_AVATARS.map((emoji) => {
              const active = avatarPreset === emoji && !avatarUrl;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setAvatarPreset(emoji);
                    setAvatarUrl(null);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[1.2rem] transition-all duration-300"
                  style={{
                    background: active
                      ? 'var(--theme-accent-soft)'
                      : 'var(--theme-surface-muted)',
                    border: active
                      ? '1px solid var(--theme-accent)'
                      : '1px solid var(--theme-border)',
                    transform: active ? 'scale(1.05)' : undefined,
                  }}
                  aria-label={`Preset ${emoji}`}
                  aria-pressed={active}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="theme-link-underline mt-4 text-[0.82rem]"
          >
            <Upload className="h-[13px] w-[13px]" strokeWidth={1.8} />
            Upload from device
          </button>
        </div>
      </div>

      <div
        className="mt-8 grid grid-cols-1 gap-5 border-t pt-6 sm:grid-cols-2"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <Field
          label="Display name"
          value={name}
          onChange={setName}
          placeholder="Sarah Rashid"
        />
        <Field
          label="Email address"
          value={email}
          onChange={setEmail}
          placeholder="you@verdify.io"
          type="email"
        />
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
            {initials || 'VD'}
          </span>{' '}
          if no avatar is set.
        </p>
        <button
          type="button"
          onClick={onSave}
          className="theme-btn-primary"
        >
          <Save size={14} strokeWidth={1.8} />
          Save changes
        </button>
      </div>
    </motion.section>
  );
}

function TripDefaultsCard() {
  const [mode, setMode] = useState<Mode>('Transit');
  const [priority, setPriority] = useState<Priority>('Greenest');

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
          Preferred mode
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MODES.map(({ id, label, hint, icon: Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className="group relative flex flex-col items-start gap-2 rounded-[14px] p-3 text-left transition-all duration-300"
                style={{
                  background: active
                    ? 'var(--theme-accent-soft)'
                    : 'var(--theme-surface-muted)',
                  border: active
                    ? '1px solid var(--theme-accent-muted)'
                    : '1px solid var(--theme-border)',
                }}
                aria-pressed={active}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[9px]"
                  style={{
                    background: active
                      ? 'var(--theme-accent)'
                      : 'var(--theme-surface)',
                    color: active
                      ? 'var(--theme-accent-fg)'
                      : 'var(--theme-fg-muted)',
                    border: active
                      ? 'none'
                      : '1px solid var(--theme-border)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div>
                  <p
                    className="text-[0.88rem]"
                    style={{
                      color: active
                        ? 'var(--theme-fg)'
                        : 'var(--theme-fg-muted)',
                    }}
                  >
                    {label}
                  </p>
                  <p
                    className="theme-mono-sm mt-0.5"
                    style={{ color: 'var(--theme-fg-dim)' }}
                  >
                    {hint}
                  </p>
                </div>
                {active && (
                  <span
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      background: 'var(--theme-accent)',
                      color: 'var(--theme-accent-fg)',
                    }}
                    aria-hidden
                  >
                    <Check className="h-[10px] w-[10px]" strokeWidth={2.6} />
                  </span>
                )}
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
          Routing priority
        </p>
        <div className="flex flex-col gap-2">
          {PRIORITIES.map(({ id, label, hint, icon: Icon }) => {
            const active = priority === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPriority(id)}
                className="flex items-center gap-3 rounded-[12px] p-3 text-left transition-colors duration-300"
                style={{
                  background: active
                    ? 'var(--theme-accent-soft)'
                    : 'transparent',
                  border: active
                    ? '1px solid var(--theme-accent-muted)'
                    : '1px solid var(--theme-border)',
                }}
                aria-pressed={active}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{
                    background: active
                      ? 'var(--theme-accent)'
                      : 'var(--theme-surface-muted)',
                    color: active
                      ? 'var(--theme-accent-fg)'
                      : 'var(--theme-fg-muted)',
                  }}
                >
                  <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
                </span>
                <div className="flex-1">
                  <p
                    className="text-[0.9rem]"
                    style={{
                      color: active
                        ? 'var(--theme-fg)'
                        : 'var(--theme-fg-muted)',
                    }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[0.78rem]"
                    style={{ color: 'var(--theme-fg-dim)' }}
                  >
                    {hint}
                  </p>
                </div>
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{
                    border: '1px solid var(--theme-border-strong)',
                    background: active ? 'var(--theme-accent)' : 'transparent',
                  }}
                  aria-hidden
                >
                  {active && (
                    <span
                      className="block h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--theme-accent-fg)' }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p
          className="text-[0.78rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Currently routing as{' '}
          <span
            className="theme-italic"
            style={{ color: 'var(--theme-accent)' }}
          >
            {mode.toLowerCase()}
          </span>{' '}
          ·{' '}
          <span
            className="theme-italic"
            style={{ color: 'var(--theme-accent)' }}
          >
            {priority.toLowerCase()}
          </span>
        </p>
        <button
          type="button"
          onClick={() => toast.success('Preferences updated.')}
          className="theme-btn-ghost"
        >
          Apply
          <ArrowUpRight size={12} strokeWidth={1.8} />
        </button>
      </div>
    </motion.section>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const strength = useMemo(() => scorePassword(next), [next]);

  const canSubmit =
    current.length > 0 &&
    next.length >= 8 &&
    next === confirm &&
    next !== current;

  const onSubmit = () => {
    if (!canSubmit) {
      toast.error('Check that fields match and new password is 8+ chars.');
      return;
    }
    toast.success('Password changed.');
    setCurrent('');
    setNext('');
    setConfirm('');
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
          Encrypted locally
        </span>
      </div>

      <h3
        className="theme-display mt-2 text-[1.5rem] leading-tight"
        style={{ color: 'var(--theme-fg)' }}
      >
        A{' '}
        <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
          new
        </span>{' '}
        password.
      </h3>

      <div className="mt-5 grid grid-cols-1 gap-4">
        <Field
          label="Current password"
          value={current}
          onChange={setCurrent}
          type={show ? 'text' : 'password'}
          placeholder="••••••••"
        />
        <Field
          label="New password"
          value={next}
          onChange={setNext}
          type={show ? 'text' : 'password'}
          placeholder="At least 8 characters"
          right={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300 hover:bg-[var(--theme-surface-muted)]"
              style={{ color: 'var(--theme-fg-muted)' }}
              aria-label={show ? 'Hide passwords' : 'Show passwords'}
            >
              {show ? (
                <EyeOff className="h-[13px] w-[13px]" strokeWidth={1.8} />
              ) : (
                <Eye className="h-[13px] w-[13px]" strokeWidth={1.8} />
              )}
            </button>
          }
        />
        <Field
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          type={show ? 'text' : 'password'}
          placeholder="Type it again"
        />
      </div>

      {next.length > 0 && (
        <div className="mt-4">
          <div
            className="flex h-1 w-full gap-1 overflow-hidden rounded-full"
            aria-hidden
          >
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="h-full flex-1 rounded-full transition-colors duration-300"
                style={{
                  background:
                    i < strength.score
                      ? strength.color
                      : 'var(--theme-border)',
                }}
              />
            ))}
          </div>
          <p
            className="theme-mono-sm mt-2"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Strength · {strength.label}
          </p>
        </div>
      )}

      <div
        className="mt-auto grid grid-cols-3 gap-3 border-t pt-5"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <SecurityFact label="Last changed" value="2 mo ago" />
        <SecurityFact label="Active sessions" value="2 devices" />
        <SecurityFact label="2-factor auth" value="Off" accent />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <p
          className="text-[0.78rem]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Use 8+ characters with letters, numbers, and a symbol.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="theme-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound size={14} strokeWidth={1.8} />
          Change password
        </button>
      </div>
    </motion.section>
  );
}

function SecurityFact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-[12px] p-3"
      style={{
        background: 'var(--theme-surface-muted)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <p
        className="theme-mono-sm"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {label}
      </p>
      <p
        className="theme-display mt-1 text-[1rem]"
        style={{
          color: accent ? 'var(--theme-accent-warm)' : 'var(--theme-fg)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function LanguageCard() {
  const [lang, setLang] = useState<Language>('en');

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
          const active = lang === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLang(l.id);
                toast.success(`Language set to ${l.label}.`);
              }}
              className="flex items-center justify-between gap-4 rounded-[12px] p-4 text-left transition-colors duration-300"
              style={{
                background: active
                  ? 'var(--theme-accent-soft)'
                  : 'var(--theme-surface-muted)',
                border: active
                  ? '1px solid var(--theme-accent-muted)'
                  : '1px solid var(--theme-border)',
              }}
              aria-pressed={active}
            >
              <div>
                <p
                  className="text-[0.92rem]"
                  style={{
                    color: active
                      ? 'var(--theme-fg)'
                      : 'var(--theme-fg-muted)',
                  }}
                >
                  {l.native}
                </p>
                <p
                  className="theme-mono-sm mt-0.5"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
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
                  style={{
                    color: 'var(--theme-fg-dim)',
                    letterSpacing: '0.16em',
                  }}
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
        Changes take effect across the dashboard, route planner, and
        notifications.
      </p>
    </motion.section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  right,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  right?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="theme-mono-sm block"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {label}
      </span>
      <div
        className="mt-2 flex items-center gap-2 rounded-[12px] px-3 py-2 transition-colors duration-300 focus-within:border-[var(--theme-accent-muted)]"
        style={{
          background: 'var(--theme-surface-muted)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-[0.95rem] outline-none placeholder:opacity-50"
          style={{ color: 'var(--theme-fg)' }}
        />
        {right}
      </div>
    </label>
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
        style={{
          ...base,
          top: 10,
          left: 10,
          borderTop: '1px solid',
          borderLeft: '1px solid',
        }}
      />
      <span
        aria-hidden
        style={{
          ...base,
          top: 10,
          right: 10,
          borderTop: '1px solid',
          borderRight: '1px solid',
        }}
      />
      <span
        aria-hidden
        style={{
          ...base,
          bottom: 10,
          left: 10,
          borderBottom: '1px solid',
          borderLeft: '1px solid',
        }}
      />
      <span
        aria-hidden
        style={{
          ...base,
          bottom: 10,
          right: 10,
          borderBottom: '1px solid',
          borderRight: '1px solid',
        }}
      />
    </>
  );
}

function scorePassword(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pw) return { score: 0, label: '—', color: 'var(--theme-border)' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  const labels = ['Weak', 'Okay', 'Good', 'Strong'];
  const colors = [
    'var(--theme-accent-warm)',
    'var(--theme-accent-warm)',
    'var(--theme-accent-muted)',
    'var(--theme-accent)',
  ];
  const idx = Math.max(0, score - 1);
  return { score, label: labels[idx] ?? 'Weak', color: colors[idx] ?? colors[0] };
}
