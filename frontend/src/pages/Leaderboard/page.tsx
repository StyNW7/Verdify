import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Flame,
  MapPin,
  Minus,
  MoreHorizontal,
} from 'lucide-react';

type Player = {
  rank: number;
  name: string;
  handle: string;
  location: Location;
  points: number;
  streak: number;
  trend: 'up' | 'down' | 'flat';
  delta: number;
  emoji: string;
};

type Location = 'Global' | 'Johor Bahru' | 'Kuala Lumpur' | 'Penang' | 'Singapore';

const LOCATIONS: Location[] = ['Global', 'Johor Bahru', 'Kuala Lumpur', 'Penang', 'Singapore'];

const PLAYERS: Player[] = [
  { rank: 1, name: 'Ahmad R.', handle: 'ahmad.r', location: 'Kuala Lumpur', points: 12450, streak: 41, trend: 'up', delta: 210, emoji: '🌟' },
  { rank: 2, name: 'Siti N.', handle: 'siti.n', location: 'Singapore', points: 11200, streak: 33, trend: 'up', delta: 180, emoji: '🚀' },
  { rank: 3, name: 'Tan W.L.', handle: 'tan.wl', location: 'Penang', points: 10850, streak: 28, trend: 'down', delta: 40, emoji: '💪' },
  { rank: 4, name: 'Daniyal R.', handle: 'daniyal', location: 'Kuala Lumpur', points: 9210, streak: 21, trend: 'up', delta: 120, emoji: '🌿' },
  { rank: 5, name: 'Imani O.', handle: 'imani.o', location: 'Singapore', points: 8980, streak: 19, trend: 'flat', delta: 0, emoji: '🚲' },
  { rank: 6, name: 'Wei Ling C.', handle: 'weiling', location: 'Johor Bahru', points: 7412, streak: 24, trend: 'up', delta: 92, emoji: '🍃' },
  { rank: 7, name: 'Kasper L.', handle: 'kasper.l', location: 'Penang', points: 6980, streak: 14, trend: 'up', delta: 78, emoji: '⚡' },
  { rank: 8, name: 'Farah I.', handle: 'farah_i', location: 'Kuala Lumpur', points: 5702, streak: 17, trend: 'down', delta: 30, emoji: '🌱' },
  { rank: 9, name: 'Ravi S.', handle: 'ravi.s', location: 'Johor Bahru', points: 5440, streak: 12, trend: 'flat', delta: 0, emoji: '🛴' },
  { rank: 10, name: 'Hana I.', handle: 'hanai', location: 'Singapore', points: 4198, streak: 16, trend: 'up', delta: 55, emoji: '🌳' },
  { rank: 41, name: 'Eitan Cohen', handle: 'eitan.c', location: 'Singapore', points: 2488, streak: 7, trend: 'flat', delta: 0, emoji: '🌾' },
  { rank: 42, name: 'Sarah Rashid', handle: 'sarah.r', location: 'Johor Bahru', points: 2450, streak: 14, trend: 'up', delta: 180, emoji: '🟢' },
  { rank: 43, name: 'Theo Brandt', handle: 'theo', location: 'Kuala Lumpur', points: 2402, streak: 6, trend: 'down', delta: 12, emoji: '🌰' },
];

const CURRENT_USER_HANDLE = 'sarah.r';

const fmt = (n: number) => n.toLocaleString('en-US');

function initialsOf(name: string) {
  return name
    .replace(/[.·]/g, '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function hueFor(handle: string) {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) % 360;
  return h;
}

function Avatar({
  player,
  size = 40,
  ring,
}: {
  player: Player;
  size?: number;
  ring?: string;
}) {
  const hue = hueFor(player.handle);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(from 140deg, hsl(${hue} 60% 58%), hsl(${(hue + 60) % 360} 55% 48%), hsl(${(hue + 180) % 360} 70% 55%), hsl(${hue} 60% 58%))`,
        boxShadow: ring
          ? `0 0 0 2px ${ring}, 0 0 0 3px var(--theme-bg)`
          : 'inset 0 0 0 1px rgba(255,255,255,0.25)',
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--theme-bg) 35%, transparent)',
          backdropFilter: 'blur(4px)',
          color: 'white',
          fontWeight: 600,
          fontSize: size * 0.36,
          letterSpacing: '0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
      >
        {initialsOf(player.name)}
      </span>
    </span>
  );
}

function TrendPill({ trend, delta }: { trend: Player['trend']; delta: number }) {
  if (trend === 'flat')
    return (
      <span
        className="inline-flex items-center gap-1 text-[0.72rem]"
        style={{ color: 'var(--theme-fg-dim)' }}
      >
        <Minus className="h-3 w-3" /> —
      </span>
    );
  const isUp = trend === 'up';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[0.72rem] font-medium"
      style={{
        background: isUp
          ? 'var(--theme-accent-soft)'
          : 'color-mix(in srgb, var(--theme-accent-warm) 14%, transparent)',
        color: isUp ? 'var(--theme-accent)' : 'var(--theme-accent-warm)',
      }}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {delta}
    </span>
  );
}

function LocationFilter({
  value,
  onChange,
}: {
  value: Location;
  onChange: (l: Location) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {LOCATIONS.map((loc) => {
        const active = value === loc;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => onChange(loc)}
            className="group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] transition-all"
            style={{
              borderColor: active ? 'var(--theme-accent)' : 'var(--theme-border)',
              background: active ? 'var(--theme-accent-soft)' : 'var(--theme-surface-muted)',
              color: active ? 'var(--theme-accent)' : 'var(--theme-fg-muted)',
            }}
          >
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            {loc}
          </button>
        );
      })}
    </div>
  );
}

export default function LeaderboardPage() {
  const [location, setLocation] = useState<Location>('Global');

  const filtered = useMemo(() => {
    const list =
      location === 'Global'
        ? PLAYERS
        : PLAYERS.filter(
            (p) => p.location === location || p.handle === CURRENT_USER_HANDLE,
          );
    return [...list].sort((a, b) => a.rank - b.rank);
  }, [location]);

  const me = useMemo(() => PLAYERS.find((p) => p.handle === CURRENT_USER_HANDLE)!, []);
  const top3 = filtered.filter((p) => p.rank <= 3).slice(0, 3);

  return (
    <section className="relative w-full px-6 py-10 lg:px-12 lg:py-14">
      <div className="mx-auto flex max-w-[min(1280px,calc(100vw-var(--sidebar-w,0px)-5rem))] flex-col gap-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="theme-accent-dot" aria-hidden />
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.24em' }}
            >
              LEADERBOARD / SEASON 04
            </span>
          </div>

          <div className="max-w-2xl">
            <h1
              className="theme-display text-[clamp(2.4rem,5vw,3.8rem)] leading-[1.02] tracking-[-0.035em]"
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
              this week.
            </h1>
            <p
              className="mt-3 max-w-xl text-[0.98rem]"
              style={{ color: 'var(--theme-fg-muted)' }}
            >
              A living tally of the Verdify commuter community — points earned for cycling,
              transit, carpool, and every kilogram of CO₂ kept out of the air.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <LocationFilter value={location} onChange={setLocation} />
            <MeBadge me={me} />
          </div>
        </div>

        <Podium top3={top3} />
        <YouRow me={me} />
        <Ledger players={filtered} me={me} />
      </div>
    </section>
  );
}

function MeBadge({ me }: { me: Player }) {
  return (
    <div
      className="inline-flex items-center gap-3 rounded-full border px-3 py-2"
      style={{
        borderColor: 'var(--theme-border)',
        background: 'var(--theme-surface)',
        backdropFilter: 'blur(14px)',
      }}
    >
      <Avatar player={me} size={32} ring="var(--theme-accent)" />
      <div className="flex flex-col leading-tight">
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          YOU · #{me.rank}
        </span>
        <span className="text-[0.88rem] font-medium" style={{ color: 'var(--theme-fg)' }}>
          {fmt(me.points)} pts
        </span>
      </div>
      <TrendPill trend={me.trend} delta={me.delta} />
    </div>
  );
}

function Podium({ top3 }: { top3: Player[] }) {
  const [first, second, third] = [
    top3.find((p) => p.rank === 1) ?? top3[0],
    top3.find((p) => p.rank === 2) ?? top3[1],
    top3.find((p) => p.rank === 3) ?? top3[2],
  ];

  return (
    <div
      className="theme-card relative overflow-hidden rounded-[28px] px-6 pb-10 pt-8 lg:px-12"
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
          Champions of the month.
        </h2>
      </div>

      <div className="relative mt-10 grid grid-cols-3 items-end gap-4 sm:gap-8">
        {second && <PodiumPillar player={second} place={2} height="58%" />}
        {first && <PodiumPillar player={first} place={1} height="100%" crowned />}
        {third && <PodiumPillar player={third} place={3} height="42%" />}
      </div>
    </div>
  );
}

function PodiumPillar({
  player,
  place,
  height,
  crowned,
}: {
  player: Player;
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
        <Avatar player={player} size={place === 1 ? 84 : 64} ring={accent} />
        <p
          className="mt-3 text-center text-[0.95rem] font-medium leading-tight"
          style={{ color: 'var(--theme-fg)' }}
        >
          {player.name}
        </p>
        <p className="theme-mono-sm mt-0.5" style={{ color: 'var(--theme-fg-dim)' }}>
          @{player.handle}
        </p>
        <p
          className="theme-number mt-2 text-[clamp(1.2rem,2vw,1.6rem)] tracking-[-0.03em]"
          style={{ fontWeight: 500 }}
        >
          {fmt(player.points)}
        </p>
      </div>
      <div
        className="relative w-full overflow-hidden rounded-t-[14px] border border-b-0"
        style={{
          height: `calc(${height} * 1.6)`,
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

function YouRow({ me }: { me: Player }) {
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
      <div className="relative flex flex-col items-start justify-between gap-5 px-6 py-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Avatar player={me} size={56} ring="var(--theme-accent)" />
          <div>
            <span
              className="theme-mono-sm"
              style={{ color: 'var(--theme-accent)', letterSpacing: '0.22em' }}
            >
              YOUR STANDING
            </span>
            <p className="text-[1.1rem] font-medium" style={{ color: 'var(--theme-fg)' }}>
              Sarah Rashid{' '}
              <span style={{ color: 'var(--theme-fg-dim)' }}>· @{me.handle}</span>
            </p>
            <p className="mt-1 text-[0.85rem]" style={{ color: 'var(--theme-fg-muted)' }}>
              Climb <span style={{ color: 'var(--theme-accent)' }}>4 spots</span> this week to
              break the top 40.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              RANK
            </span>
            <p
              className="theme-number text-[2.2rem] tracking-[-0.03em]"
              style={{ fontWeight: 500 }}
            >
              #{me.rank}
            </p>
          </div>
          <div className="h-12 w-px" style={{ background: 'var(--theme-border)' }} />
          <div className="text-right">
            <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              POINTS
            </span>
            <p
              className="theme-number text-[2.2rem] tracking-[-0.03em]"
              style={{ fontWeight: 500 }}
            >
              {fmt(me.points)}
            </p>
          </div>
          <TrendPill trend={me.trend} delta={me.delta} />
        </div>
      </div>
    </div>
  );
}

function Ledger({ players, me }: { players: Player[]; me: Player }) {
  const top3 = players.filter((p) => p.rank <= 3).slice(0, 3);
  const above = players.find((p) => p.rank === me.rank - 1);
  const below = players.find((p) => p.rank === me.rank + 1);

  type Row =
    | { kind: 'player'; player: Player; crown?: boolean }
    | { kind: 'ellipsis'; key: string; label: string };

  const rows: Row[] = [];
  top3.forEach((p, i) => rows.push({ kind: 'player', player: p, crown: i === 0 }));
  rows.push({ kind: 'ellipsis', key: 'ell-1', label: `skipping to your neighborhood · rank 4 — ${me.rank - 2}` });
  if (above) rows.push({ kind: 'player', player: above });
  rows.push({ kind: 'player', player: me });
  if (below) rows.push({ kind: 'player', player: below });
  rows.push({ kind: 'ellipsis', key: 'ell-2', label: 'and many more below' });

  return (
    <div
      className="theme-card relative overflow-hidden rounded-[24px]"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <span
          className="theme-mono-sm"
          style={{ color: 'var(--theme-fg-dim)', letterSpacing: '0.2em' }}
        >
          THE LEDGER · TOP 3 + YOUR RANGE
        </span>
        <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
          POINTS / 7D
        </span>
      </div>
      <ul>
        {rows.map((row, idx) => {
          if (row.kind === 'ellipsis') {
            return <EllipsisRow key={row.key} label={row.label} index={idx} />;
          }
          return (
            <LedgerRow
              key={row.player.handle}
              player={row.player}
              index={idx}
              crown={row.crown}
              isMe={row.player.handle === CURRENT_USER_HANDLE}
            />
          );
        })}
      </ul>
    </div>
  );
}

function LedgerRow({
  player,
  index,
  crown,
  isMe,
}: {
  player: Player;
  index: number;
  crown?: boolean;
  isMe?: boolean;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
      className="relative flex items-center justify-between gap-4 border-b px-6 py-3 last:border-b-0 transition-colors hover:bg-[var(--theme-surface-muted)]"
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
      <div className="flex min-w-0 items-center gap-4">
        <span
          className="theme-mono-sm w-10 shrink-0"
          style={{
            color: isMe ? 'var(--theme-accent)' : 'var(--theme-fg-dim)',
            letterSpacing: '0.06em',
            fontWeight: isMe ? 600 : 400,
          }}
        >
          #{String(player.rank).padStart(2, '0')}
        </span>
        <Avatar
          player={player}
          size={34}
          ring={isMe ? 'var(--theme-accent)' : undefined}
        />
        <div className="min-w-0">
          <p
            className="flex items-center gap-1.5 truncate text-[0.92rem] font-medium"
            style={{ color: 'var(--theme-fg)' }}
          >
            {isMe ? 'You' : player.name}
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
          <p
            className="theme-mono-sm truncate"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            @{player.handle} · {player.location}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span
          className="hidden items-center gap-1 sm:inline-flex"
          style={{ color: 'var(--theme-accent-warm)' }}
        >
          <Flame className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="theme-mono-sm">{player.streak}d</span>
        </span>
        <TrendPill trend={player.trend} delta={player.delta} />
        <span
          className="shrink-0 text-right text-[1.05rem] tabular-nums"
          style={{
            minWidth: '6.5ch',
            fontFamily: 'var(--theme-font-display)',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--theme-fg)',
          }}
        >
          {fmt(player.points)}
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
