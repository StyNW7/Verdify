import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeCheck,
  Bike,
  CalendarCheck,
  Coins,
  Gift,
  History,
  LayoutGrid,
  Leaf,
  Lock,
  Sparkles,
  Ticket,
  Trophy,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';

import { useUserDoc } from '@/lib/user-doc-provider';

type Reward = {
  title: string;
  partner: string;
  cost: number;
  availability: 'Ready' | 'Locked';
  note: string;
  icon: LucideIcon;
};

type Challenge = {
  title: string;
  status: 'Active' | 'To do';
  progress: number;
  target: number;
  reward: number;
  due: string;
  icon: LucideIcon;
};

type LedgerEntry = {
  date: string;
  label: string;
  source: string;
  points: number;
  kind: 'gain' | 'use';
};

const NEXT_TIER_POINTS = 3000;

const rewards: Reward[] = [
  {
    title: 'RM10 transit credit',
    partner: 'RapidKL Wallet',
    cost: 900,
    availability: 'Ready',
    note: 'Instant code for rail and bus top-ups.',
    icon: Ticket,
  },
  {
    title: 'Bike tune-up voucher',
    partner: 'Urban Pedals',
    cost: 1200,
    availability: 'Ready',
    note: 'Basic brake, chain, and tyre service.',
    icon: Bike,
  },
  {
    title: 'Reusable cup credit',
    partner: 'Refill Market',
    cost: 450,
    availability: 'Ready',
    note: 'Redeemable at participating cafes.',
    icon: WalletCards,
  },
  {
    title: 'Forest Guardian badge',
    partner: 'Verdify Impact',
    cost: 3000,
    availability: 'Locked',
    note: 'Unlocks with the next points tier.',
    icon: Trophy,
  },
];

const challenges: Challenge[] = [
  {
    title: 'Transit three commutes',
    status: 'Active',
    progress: 2,
    target: 3,
    reward: 180,
    due: '2 days left',
    icon: CalendarCheck,
  },
  {
    title: 'Walk for lunch breaks',
    status: 'Active',
    progress: 3,
    target: 5,
    reward: 150,
    due: 'Ends Sunday',
    icon: Leaf,
  },
  {
    title: 'Plan tomorrow early',
    status: 'To do',
    progress: 0,
    target: 1,
    reward: 80,
    due: 'Before 9 PM',
    icon: Sparkles,
  },
  {
    title: 'Carpool Friday',
    status: 'To do',
    progress: 0,
    target: 1,
    reward: 120,
    due: 'This Friday',
    icon: BadgeCheck,
  },
];

const ledger: LedgerEntry[] = [
  {
    date: '22 Apr',
    label: 'Bike commute to KLCC Tower',
    source: 'Journey reward',
    points: 184,
    kind: 'gain',
  },
  {
    date: '21 Apr',
    label: 'RM10 transit credit',
    source: 'Reward redemption',
    points: -900,
    kind: 'use',
  },
  {
    date: '21 Apr',
    label: 'Bus route home',
    source: 'Journey reward',
    points: 140,
    kind: 'gain',
  },
  {
    date: '20 Apr',
    label: 'Lunch walk streak',
    source: 'Challenge bonus',
    points: 75,
    kind: 'gain',
  },
  {
    date: '19 Apr',
    label: 'Reusable cup credit',
    source: 'Reward redemption',
    points: -450,
    kind: 'use',
  },
];

const SERIF_ITALIC = {
  fontFamily: 'var(--theme-font-italic)',
  fontStyle: 'italic' as const,
  fontWeight: 400,
};

const fmt = (value: number) => Math.abs(value).toLocaleString('en-US');

export default function RewardsPage() {
  const { doc: userDoc, loading } = useUserDoc();
  const totalPoints = userDoc?.greenPointsBalance ?? 0;
  const tierProgress = Math.min(100, Math.round((totalPoints / NEXT_TIER_POINTS) * 100));
  const readyRewards = rewards.filter((reward) => reward.availability === 'Ready').length;
  const activeChallenges = challenges.filter((challenge) => challenge.status === 'Active').length;
  const pointsToNext = Math.max(0, NEXT_TIER_POINTS - totalPoints);

  const summary = {
    totalPoints,
    tierProgress,
    readyRewards,
    activeChallenges,
    pointsToNext,
    loading,
  };

  return (
    <section
      className="relative mx-auto w-full px-6 pb-24 pt-10 lg:px-10"
      style={{ maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <RewardsHeader summary={summary} />
      <MarketDesign />
    </section>
  );
}

function RewardsHeader({
  summary,
}: {
  summary: {
    totalPoints: number;
    tierProgress: number;
    readyRewards: number;
    activeChallenges: number;
    pointsToNext: number;
    loading: boolean;
  };
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px] lg:items-end"
    >
      <div>
        <p
          className="theme-mono-sm inline-flex items-center gap-2"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          <span className="theme-accent-dot" /> Rewards · Green points
        </p>
        <h1
          className="theme-display mt-4 max-w-3xl text-[clamp(2.6rem,5.8vw,4.6rem)]"
          style={{ color: 'var(--theme-fg)' }}
        >
          Spend the points your commute{' '}
          <span style={{ ...SERIF_ITALIC, color: 'var(--theme-accent)' }}>earned.</span>
        </h1>
        <p
          className="mt-5 max-w-2xl text-[0.98rem] leading-[1.65]"
          style={{ color: 'var(--theme-fg-muted)' }}
        >
          Redeem practical rewards, keep active challenges in view, and audit every gained or used
          green point from one <span style={SERIF_ITALIC}>market surface.</span>
        </p>
      </div>

      <BalancePanel summary={summary} />
    </motion.header>
  );
}

function MarketDesign() {
  const featured = rewards[0];
  const FeaturedIcon = featured.icon;

  return (
    <div className="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="theme-panel h-full">
        <SectionTitle
          icon={LayoutGrid}
          eyebrow="Market"
          title="Redeemable rewards"
          action={
            <Link to="/route" className="theme-link-underline text-[0.82rem]">
              Earn more
              <ArrowUpRight size={12} strokeWidth={1.8} />
            </Link>
          }
        />

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="relative mt-6 overflow-hidden rounded-[20px] border"
          style={{
            borderColor: 'var(--theme-accent-muted)',
            background:
              'linear-gradient(135deg, var(--theme-accent-soft) 0%, var(--theme-surface-muted) 100%)',
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: 'var(--theme-accent-soft)', opacity: 0.8 }}
          />
          <div className="relative grid gap-5 p-5 md:grid-cols-[1fr_180px] md:p-6">
            <div>
              <p className="theme-mono-sm" style={{ color: 'var(--theme-accent)' }}>
                Featured redemption
              </p>
              <h2
                className="theme-display mt-3 text-[clamp(1.8rem,3.2vw,2.7rem)]"
                style={{ color: 'var(--theme-fg)' }}
              >
                {featured.title}
              </h2>
              <p
                className="mt-3 max-w-xl text-[0.9rem] leading-[1.65]"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                {featured.note} The fastest value you can claim from your current balance.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="theme-btn-primary"
                  style={{ height: '2.6rem', padding: '0 1.25rem', fontSize: '0.78rem' }}
                >
                  <Gift size={14} strokeWidth={1.9} />
                  <span className="theme-action-label">
                    <span className="sm:hidden">Redeem</span>
                    <span className="hidden sm:inline">Redeem now</span>
                  </span>
                </button>
                <span
                  className="theme-mono-sm"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  {featured.partner}
                </span>
              </div>
            </div>
            <div
              className="flex flex-col justify-between gap-4 rounded-[16px] border p-4"
              style={{
                borderColor: 'var(--theme-border)',
                background: 'var(--theme-bg)',
              }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-[12px]"
                style={{
                  background: 'var(--theme-accent)',
                  color: 'var(--theme-accent-fg)',
                }}
              >
                <FeaturedIcon className="h-[19px] w-[19px]" strokeWidth={1.8} />
              </span>
              <div>
                <p
                  className="theme-display text-[2.2rem] leading-none"
                  style={{ color: 'var(--theme-fg)' }}
                >
                  {featured.cost.toLocaleString('en-US')}
                </p>
                <p
                  className="mt-1 theme-mono-sm"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  points
                </p>
              </div>
            </div>
          </div>
        </motion.article>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rewards.map((reward, index) => (
            <RewardTile key={reward.title} reward={reward} index={index} />
          ))}
        </div>
      </section>

      <aside className="flex h-full flex-col gap-6">
        <CompactHistory />
        <CompactChallenges />
      </aside>
    </div>
  );
}

function BalancePanel({
  summary,
}: {
  summary: {
    totalPoints: number;
    tierProgress: number;
    readyRewards: number;
    activeChallenges: number;
    pointsToNext: number;
    loading: boolean;
  };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
      className="theme-card p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            Total balance
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className="theme-display leading-none"
              style={{
                color: 'var(--theme-fg)',
                fontSize: 'clamp(2.8rem, 6vw, 3.6rem)',
              }}
            >
              {summary.loading && summary.totalPoints === 0
                ? '—'
                : summary.totalPoints.toLocaleString('en-US')}
            </span>
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              pts
            </span>
          </div>
        </div>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]"
          style={{
            background: 'var(--theme-accent)',
            color: 'var(--theme-accent-fg)',
          }}
        >
          <Coins className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-[0.8rem]">
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            Canopy tier
          </span>
          <span style={{ color: 'var(--theme-fg)' }}>
            {summary.pointsToNext} pts to Forest
          </span>
        </div>
        <ProgressBar value={summary.tierProgress} delay={0.2} />
      </div>

      <div
        className="mt-6 grid grid-cols-2 gap-4 border-t pt-5"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <Metric label="Ready rewards" value={summary.readyRewards} />
        <Metric label="Active challenges" value={summary.activeChallenges} />
      </div>
    </motion.div>
  );
}

function RewardTile({
  reward,
  index,
}: {
  reward: Reward;
  index: number;
}) {
  const Icon = reward.icon;
  const locked = reward.availability === 'Locked';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.12 + index * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
      className="group flex flex-col rounded-[18px] border p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        borderColor: 'var(--theme-border)',
        background: locked ? 'transparent' : 'var(--theme-surface-muted)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border"
          style={{
            borderColor: 'var(--theme-border)',
            background: locked ? 'var(--theme-surface-muted)' : 'var(--theme-accent-soft)',
            color: locked ? 'var(--theme-fg-dim)' : 'var(--theme-accent)',
          }}
        >
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
        </span>
        <StatusPill active={!locked}>{reward.availability}</StatusPill>
      </div>

      <h3
        className="theme-display mt-5 text-[1.3rem] leading-[1.08]"
        style={{ color: 'var(--theme-fg)' }}
      >
        {reward.title}
      </h3>
      <p
        className="mt-1.5 theme-mono-sm"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {reward.partner}
      </p>

      <div
        className="mt-5 flex items-end justify-between gap-3 border-t pt-4"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span className="flex items-baseline gap-1.5">
          <span
            className="theme-display text-[1.55rem] leading-none"
            style={{ color: 'var(--theme-fg)' }}
          >
            {reward.cost.toLocaleString('en-US')}
          </span>
          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
            pts
          </span>
        </span>
        <button
          type="button"
          disabled={locked}
          className="inline-flex h-9 min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full px-3.5 text-[0.78rem] transition-all duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
          style={{
            background: locked ? 'var(--theme-surface-muted)' : 'var(--theme-accent)',
            color: locked ? 'var(--theme-fg-muted)' : 'var(--theme-accent-fg)',
            fontFamily: 'var(--theme-font-body)',
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          {locked ? <Lock size={13} strokeWidth={1.8} /> : <Gift size={13} strokeWidth={1.8} />}
          <span className="theme-action-label">{locked ? 'Locked' : 'Redeem'}</span>
        </button>
      </div>
    </motion.article>
  );
}

function CompactChallenges() {
  return (
    <section className="theme-card flex flex-1 flex-col p-6">
      <SectionTitle icon={CalendarCheck} eyebrow="Next" title="Challenge queue" />
      <div className="mt-5 flex flex-1 flex-col gap-2.5">
        {challenges.slice(0, 3).map((challenge, index) => (
          <ChallengeRow key={challenge.title} challenge={challenge} index={index} />
        ))}
      </div>
    </section>
  );
}

function ChallengeRow({
  challenge,
  index,
}: {
  challenge: Challenge;
  index: number;
}) {
  const Icon = challenge.icon;
  const percent = Math.round((challenge.progress / challenge.target) * 100);
  const active = challenge.status === 'Active';

  return (
    <motion.article
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, delay: 0.18 + index * 0.05 }}
      className="flex-1 rounded-[16px] border p-3.5"
      style={{
        borderColor: active ? 'var(--theme-accent-muted)' : 'var(--theme-border)',
        background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] border"
          style={{
            borderColor: 'var(--theme-border)',
            background: active ? 'var(--theme-accent)' : 'var(--theme-bg-soft)',
            color: active ? 'var(--theme-accent-fg)' : 'var(--theme-fg-muted)',
          }}
        >
          <Icon className="h-[16px] w-[16px]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="theme-display translate-y-0.5 text-[1rem] leading-tight"
            style={{ color: 'var(--theme-fg)' }}
          >
            {challenge.title}
          </h3>
          <div className="mt-1.5 flex items-baseline justify-between gap-3">
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              {challenge.progress}/{challenge.target}
            </span>
            <span
              className="text-[0.78rem]"
              style={{ ...SERIF_ITALIC, color: 'var(--theme-fg-muted)' }}
            >
              {challenge.due}
            </span>
          </div>
          <ProgressBar value={percent} delay={0.26 + index * 0.06} muted={!active} />
          <div className="mt-2.5 flex items-center justify-between">
            <span className="theme-mono-sm" style={{ color: 'var(--theme-accent)' }}>
              +{challenge.reward} pts
            </span>
            <button
              type="button"
              className="theme-link-underline whitespace-nowrap text-[0.8rem]"
              style={{ color: 'var(--theme-fg)' }}
            >
              {active ? 'Continue' : 'Start'}
              <ArrowUpRight size={12} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function CompactHistory() {
  return (
    <section className="theme-card p-6">
      <SectionTitle icon={History} eyebrow="Recent" title="Point history" />
      <ul className="mt-6 flex flex-col">
        {ledger.slice(0, 3).map((entry, index) => (
          <LedgerRow
            key={`${entry.date}-${entry.label}`}
            entry={entry}
            index={index}
            last={index === 2}
          />
        ))}
      </ul>
    </section>
  );
}

function LedgerRow({
  entry,
  index,
  last,
}: {
  entry: LedgerEntry;
  index: number;
  last?: boolean;
}) {
  const gain = entry.kind === 'gain';
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, delay: 0.12 + index * 0.04 }}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3"
      style={{
        borderBottom: last ? 'none' : '1px dashed var(--theme-border)',
      }}
    >
      <span
        className="theme-mono-sm tabular-nums"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        {entry.date}
      </span>
      <span className="min-w-0">
        <span
          className="block truncate text-[0.94rem]"
          style={{ color: 'var(--theme-fg)' }}
        >
          {entry.label}
        </span>
        <span
          className="mt-0.5 block text-[0.78rem]"
          style={{ ...SERIF_ITALIC, color: 'var(--theme-fg-dim)' }}
        >
          {entry.source}
        </span>
      </span>
      <span
        className="theme-display text-right text-[1.2rem] leading-none tabular-nums"
        style={{
          color: gain ? 'var(--theme-accent)' : 'var(--theme-accent-warm)',
        }}
      >
        {gain ? '+' : '−'}
        {fmt(entry.points)}
      </span>
    </motion.li>
  );
}

function ProgressBar({
  value,
  delay,
  muted,
}: {
  value: number;
  delay: number;
  muted?: boolean;
}) {
  return (
    <div
      className="mt-2.5 h-[6px] overflow-hidden rounded-full"
      style={{ background: 'var(--theme-bg-soft)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          background: muted
            ? 'var(--theme-fg-dim)'
            : 'linear-gradient(90deg, var(--theme-accent) 0%, var(--theme-accent-muted) 100%)',
        }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, delay, ease: [0.2, 0.7, 0.2, 1] }}
      />
    </div>
  );
}

function StatusPill({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className="theme-mono-sm inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
      style={{
        borderColor: active ? 'var(--theme-accent-muted)' : 'var(--theme-border)',
        color: active ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
        background: active ? 'var(--theme-accent-soft)' : 'transparent',
        fontSize: '0.56rem',
      }}
    >
      <span
        className="inline-block h-[5px] w-[5px] rounded-full"
        style={{
          background: active ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
          boxShadow: active ? '0 0 8px var(--theme-accent)' : 'none',
        }}
      />
      {children}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
        {label}
      </p>
      <p
        className="theme-display mt-1.5 text-[1.75rem] leading-none"
        style={{ color: 'var(--theme-fg)' }}
      >
        {value.toString().padStart(2, '0')}
      </p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
  action,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p
          className="theme-mono-sm inline-flex items-center gap-2"
          style={{ color: 'var(--theme-fg-dim)' }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
          {eyebrow}
        </p>
        <h2
          className="theme-display mt-2 text-[1.65rem] leading-tight"
          style={{ color: 'var(--theme-fg)' }}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
