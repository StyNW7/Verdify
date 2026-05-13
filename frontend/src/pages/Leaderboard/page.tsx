import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, MoreHorizontal } from 'lucide-react';

import { getLeaderboard, type LeaderboardEntry } from '@/lib/api';
import { pickAvatar } from '@/lib/avatar-source';

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── Avatar ───────────────────────────────────────────────────────────────────

function EntryAvatar({
  entry,
  size = 40,
  ring,
}: {
  entry: LeaderboardEntry;
  size?: number;
  ring?: string;
}) {
  // The leaderboard endpoint returns photoURL and displayName but no
  // presetAvatar (server-mediated; we only have what the public endpoint
  // provides). We map to the pickAvatar signature with a synthetic authUser.
  const src = pickAvatar(
    { photoURL: entry.photoURL || null, displayName: entry.displayName || null },
    null,
  );

  const frameStyle: React.CSSProperties = {
    width: size,
    height: size,
    boxShadow: ring
      ? `0 0 0 2px ${ring}, 0 0 0 3px var(--theme-bg)`
      : 'inset 0 0 0 1px rgba(255,255,255,0.25)',
  };

  if (src.kind === 'photo') {
    return (
      <span
        className="relative inline-flex shrink-0 overflow-hidden rounded-full"
        style={frameStyle}
      >
        <img
          src={src.value}
          alt={entry.displayName}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  const innerStyle: React.CSSProperties =
    src.kind === 'preset'
      ? { fontSize: size * 0.5 }
      : {
          color: 'var(--theme-fg)',
          fontWeight: 600,
          fontSize: size * 0.38,
          letterSpacing: '0.02em',
        };

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        ...frameStyle,
        background: 'color-mix(in srgb, var(--theme-accent) 25%, var(--theme-surface-muted))',
      }}
    >
      <span style={innerStyle}>{src.value}</span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(() => {
    setLoading(true);
    setError(null);
    getLeaderboard()
      .then((data) => {
        setEntries(data.entries);
        setMe(data.me);
        setTotalUsers(data.totalUsers);
        setLoading(false);
      })
      .catch(() => {
        setError('Leaderboard unavailable');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const top3 = entries.slice(0, 3);

  return (
    <section
      className="relative mx-auto w-full px-5 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-10 lg:px-10"
      style={{ maxWidth: 'var(--page-max-w, 1280px)' }}
    >
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="theme-accent-dot" aria-hidden />
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.24em' }}
            >
              LEADERBOARD / ALL-TIME
            </span>
          </div>

          <div className="max-w-2xl">
            <h1
              className="theme-display text-[clamp(1.9rem,7vw,3.8rem)] leading-[1.02] tracking-[-0.035em]"
              style={{ color: 'var(--theme-fg)' }}
            >
              Who's moving{' '}
              <em
                style={{
                  fontFamily: 'var(--theme-font-italic)',
                  fontStyle: 'italic',
                  color: 'var(--theme-accent)',
                }}
              >
                greener
              </em>{' '}
              since launch.
            </h1>
            <p
              className="mt-3 max-w-xl text-[0.98rem]"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              A living tally of the Verdify commuter community — points earned for cycling,
              transit, carpool, and every kilogram of CO₂ kept out of the air.
            </p>
          </div>
        </div>

        {loading && <LoadingSkeleton />}

        {!loading && error && (
          <ErrorState message={error} onRetry={fetchLeaderboard} />
        )}

        {!loading && !error && (
          <>
            <Podium top3={top3} />
            {me && <YouRow me={me} totalUsers={totalUsers} />}
            {me && <Ledger entries={entries} me={me} />}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Loading / Error states ───────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div
        className="rounded-[28px] h-64"
        style={{ background: 'var(--theme-surface-muted)' }}
      />
      <div
        className="rounded-[20px] h-24"
        style={{ background: 'var(--theme-surface-muted)' }}
      />
      <div
        className="rounded-[24px] h-48"
        style={{ background: 'var(--theme-surface-muted)' }}
      />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-[24px] border px-6 py-12 text-center"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-[1rem]" style={{ color: 'var(--theme-fg-muted)' }}>
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border px-4 py-2 text-[0.88rem] transition-colors"
        style={{
          borderColor: 'var(--theme-accent)',
          color: 'var(--theme-accent)',
          background: 'var(--theme-accent-soft)',
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────

function Podium({ top3 }: { top3: LeaderboardEntry[] }) {
  if (top3.length === 0) return null;

  const first = top3.find((e) => e.rank === 1) ?? top3[0];
  const second = top3.find((e) => e.rank === 2) ?? top3[1];
  const third = top3.find((e) => e.rank === 3) ?? top3[2];

  return (
    <div
      className="theme-card relative overflow-hidden rounded-[28px] px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-12"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, var(--theme-accent) 18%, transparent), transparent 70%)',
        }}
      />
      <div className="relative flex flex-col items-center">
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.28em' }}
        >
          THE TOP THREE
        </span>
        <h2
          className="mt-1 text-[clamp(1.8rem,3.6vw,2.6rem)] tracking-[-0.03em]"
          style={{
            fontFamily: 'var(--theme-font-italic)',
            fontStyle: 'italic',
            color: 'var(--theme-fg)',
          }}
        >
          Champions of all time.
        </h2>
      </div>

      <div className="relative mt-10 grid grid-cols-3 items-end gap-4 sm:gap-8">
        {second && <PodiumPillar entry={second} place={2} height="132px" />}
        {first && <PodiumPillar entry={first} place={1} height="176px" crowned />}
        {third && <PodiumPillar entry={third} place={3} height="96px" />}
      </div>
    </div>
  );
}

function PodiumPillar({
  entry,
  place,
  height,
  crowned,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  height: string;
  crowned?: boolean;
}) {
  const accent =
    place === 1
      ? 'var(--theme-accent)'
      : place === 2
        ? 'var(--theme-accent-warm)'
        : 'var(--theme-fg)';
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 * place, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center"
    >
      <div className="relative mb-4 flex flex-col items-center">
        {crowned && (
          <Crown
            className="absolute -top-7 h-6 w-6"
            style={{ color: 'var(--theme-accent-warm)' }}
            strokeWidth={1.8}
          />
        )}
        <EntryAvatar entry={entry} size={place === 1 ? 84 : 64} ring={accent} />
        <p
          className="mt-3 text-center text-[0.95rem] font-medium leading-tight"
          style={{ color: 'var(--theme-fg)' }}
        >
          {entry.displayName || 'Verdify User'}
        </p>
        <p
          className="theme-number mt-2 text-[clamp(1.2rem,2vw,1.6rem)] tracking-[-0.03em]"
          style={{ fontWeight: 500 }}
        >
          {fmt(entry.greenPointsBalance)}
        </p>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-t-[14px] border border-b-0"
        style={{
          height,
          minHeight: 80,
          borderColor: 'var(--theme-border)',
          background:
            place === 1
              ? 'linear-gradient(180deg, color-mix(in srgb, var(--theme-accent) 28%, transparent) 0%, color-mix(in srgb, var(--theme-accent) 6%, transparent) 100%)'
              : place === 2
                ? 'linear-gradient(180deg, color-mix(in srgb, var(--theme-accent-warm) 18%, transparent) 0%, color-mix(in srgb, var(--theme-accent-warm) 4%, transparent) 100%)'
                : 'linear-gradient(180deg, color-mix(in srgb, var(--theme-fg) 10%, transparent) 0%, transparent 100%)',
        }}
      >
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-center py-3 text-[1.4rem]"
          style={{
            fontFamily: 'var(--theme-font-italic)',
            fontStyle: 'italic',
            color: accent,
            fontWeight: 500,
          }}
        >
          {place === 1 ? 'i.' : place === 2 ? 'ii.' : 'iii.'}
        </div>
      </div>
    </motion.div>
  );
}

// ─── YouRow ───────────────────────────────────────────────────────────────────

function YouRow({ me, totalUsers }: { me: LeaderboardEntry; totalUsers: number }) {
  const hasRank = me.rank > 0;

  // Compute the next round-number bracket below current rank.
  const nextBracketThreshold = hasRank
    ? Math.floor((me.rank - 1) / 10) * 10
    : 0;
  const spotsToClimb = hasRank && nextBracketThreshold > 0 ? me.rank - nextBracketThreshold : 0;

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border"
      style={{
        borderColor: 'var(--theme-accent-muted)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--theme-accent) 16%, transparent) 0%, var(--theme-surface) 70%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full"
        style={{ background: 'var(--theme-accent-soft)', filter: 'blur(50px)' }}
      />
      <div className="relative flex flex-col items-start justify-between gap-4 px-4 py-4 sm:gap-5 sm:flex-row sm:items-center sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <EntryAvatar entry={me} size={48} ring="var(--theme-accent)" />
          <div>
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-accent)', letterSpacing: '0.22em' }}
            >
              YOUR STANDING
            </span>
            <p className="text-[1rem] font-medium sm:text-[1.1rem]" style={{ color: 'var(--theme-fg)' }}>
              {me.displayName || 'You'}
            </p>
            {!hasRank ? (
              <p className="mt-1 text-[0.82rem] sm:text-[0.85rem]" style={{ color: 'var(--theme-fg-muted)' }}>
                Complete your first trip to land on the board.
              </p>
            ) : spotsToClimb > 0 ? (
              <p className="mt-1 text-[0.82rem] sm:text-[0.85rem]" style={{ color: 'var(--theme-fg-muted)' }}>
                Climb{' '}
                <span style={{ color: 'var(--theme-accent)' }}>{spotsToClimb} spots</span> to
                break the top {nextBracketThreshold}.
              </p>
            ) : (
              <p className="mt-1 text-[0.82rem] sm:text-[0.85rem]" style={{ color: 'var(--theme-fg-muted)' }}>
                You're in the top {me.rank} of {totalUsers.toLocaleString('en-US')} users.
              </p>
            )}
          </div>
        </div>
        {hasRank && (
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:gap-6">
            <div className="text-right">
              <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                RANK
              </span>
              <p
                className="theme-number text-[1.6rem] tracking-[-0.03em] sm:text-[2.2rem]"
                style={{ fontWeight: 500 }}
              >
                #{me.rank}
              </p>
            </div>
            <div className="h-10 w-px sm:h-12" style={{ background: 'var(--theme-border)' }} />
            <div className="text-right">
              <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                POINTS / ALL-TIME
              </span>
              <p
                className="theme-number text-[1.6rem] tracking-[-0.03em] sm:text-[2.2rem]"
                style={{ fontWeight: 500 }}
              >
                {fmt(me.greenPointsBalance)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ledger ───────────────────────────────────────────────────────────────────

function Ledger({ entries, me }: { entries: LeaderboardEntry[]; me: LeaderboardEntry }) {
  const top3 = entries.filter((e) => e.rank <= 3);
  const meRank = me.rank;
  const above = meRank > 0 ? entries.find((e) => e.rank === meRank - 1) : undefined;
  const meEntry = meRank > 0 ? entries.find((e) => e.rank === meRank) : undefined;
  const below = meRank > 0 ? entries.find((e) => e.rank === meRank + 1) : undefined;

  type Row =
    | { kind: 'entry'; entry: LeaderboardEntry; crown?: boolean; isMe?: boolean }
    | { kind: 'ellipsis'; key: string; label: string };

  const rows: Row[] = [];
  top3.forEach((e, i) => rows.push({ kind: 'entry', entry: e, crown: i === 0 }));

  // Only add the neighbourhood section if the caller has a rank and isn't
  // already visible in the top 3.
  if (meRank > 3) {
    const gapStart = 4;
    const gapEnd = meRank - 2;
    if (gapEnd >= gapStart) {
      rows.push({
        kind: 'ellipsis',
        key: 'ell-1',
        label: `skipping to your neighborhood · rank ${gapStart} — ${gapEnd}`,
      });
    }
    if (above) rows.push({ kind: 'entry', entry: above });
    if (meEntry) rows.push({ kind: 'entry', entry: meEntry, isMe: true });
    else rows.push({ kind: 'entry', entry: me, isMe: true });
    if (below) rows.push({ kind: 'entry', entry: below });
    rows.push({ kind: 'ellipsis', key: 'ell-2', label: 'and many more below' });
  } else if (meRank > 0 && meRank <= 3) {
    // Already in top 3 — mark the row as "you".
    for (const row of rows) {
      if (row.kind === 'entry' && row.entry.rank === meRank) {
        row.isMe = true;
      }
    }
  }

  return (
    <div
      className="theme-card relative overflow-hidden rounded-[24px]"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
        >
          THE LEDGER · TOP 3 + YOUR RANGE
        </span>
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          POINTS / ALL-TIME
        </span>
      </div>
      <ul>
        {rows.map((row, idx) => {
          if (row.kind === 'ellipsis') {
            return <EllipsisRow key={row.key} label={row.label} index={idx} />;
          }
          return (
            <LedgerRow
              key={row.entry.uid}
              entry={row.entry}
              index={idx}
              crown={row.crown}
              isMe={row.isMe}
            />
          );
        })}
      </ul>
    </div>
  );
}

function LedgerRow({
  entry,
  index,
  crown,
  isMe,
}: {
  entry: LeaderboardEntry;
  index: number;
  crown?: boolean;
  isMe?: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="relative flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-[var(--theme-surface-muted)] sm:gap-4 sm:px-6"
      style={{
        borderColor: 'var(--theme-border)',
        background: isMe
          ? 'linear-gradient(90deg, color-mix(in srgb, var(--theme-accent) 10%, transparent) 0%, transparent 70%)'
          : undefined,
      }}
    >
      {isMe && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ background: 'var(--theme-accent)' }}
        />
      )}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span
          className="theme-mono-sm w-8 shrink-0 sm:w-10"
          style={{
            color: isMe ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
            letterSpacing: '0.06em',
            fontWeight: isMe ? 600 : 400,
          }}
        >
          #{String(entry.rank).padStart(2, '0')}
        </span>
        <EntryAvatar
          entry={entry}
          size={34}
          ring={isMe ? 'var(--theme-accent)' : undefined}
        />
        <div className="min-w-0">
          <p
            className="flex items-center gap-1.5 truncate text-[0.92rem] font-medium"
            style={{ color: 'var(--theme-fg)' }}
          >
            {isMe ? 'You' : (entry.displayName || 'Verdify User')}
            {crown && <span aria-hidden>👑</span>}
            {isMe && (
              <span
                className="theme-mono-sm rounded-full border px-1.5 py-[1px]"
                style={{
                  background: 'var(--theme-accent-soft)',
                  color: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent-muted)',
                  letterSpacing: '0.16em',
                  fontSize: '0.58rem',
                }}
              >
                YOU
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <span
          className="shrink-0 text-right text-[0.95rem] tabular-nums sm:text-[1.05rem]"
          style={{
            minWidth: '5.5ch',
            fontFamily: 'var(--theme-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--theme-fg)',
          }}
        >
          {fmt(entry.greenPointsBalance)}
        </span>
      </div>
    </motion.li>
  );
}

function EllipsisRow({ label, index }: { label: string; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="flex items-center justify-center gap-3 border-b px-6 py-2.5 last:border-b-0"
      style={{
        borderColor: 'var(--theme-border)',
        background:
          'repeating-linear-gradient(90deg, transparent 0 8px, color-mix(in srgb, var(--theme-fg) 4%, transparent) 8px 9px)',
      }}
    >
      <MoreHorizontal
        className="h-4 w-4"
        style={{ color: 'var(--theme-fg-dim)' }}
        strokeWidth={1.6}
      />
      <span
        className="theme-mono-sm"
        style={{
          color: 'var(--theme-fg-dim)',
          letterSpacing: '0.16em',
        }}
      >
        {label.toUpperCase()}
      </span>
      <MoreHorizontal
        className="h-4 w-4"
        style={{ color: 'var(--theme-fg-dim)' }}
        strokeWidth={1.6}
      />
    </motion.li>
  );
}
