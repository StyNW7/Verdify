import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Leaf } from 'lucide-react';

type Variant = 'intro' | 'handoff';

const EASE = [0.2, 0.7, 0.2, 1] as const;
const EXIT_EASE = [0.77, 0, 0.175, 1] as const;
const EXIT_DURATION = 1.05;

const WORDS = ['The', 'quiet', 'commute,', 'measured.'];

export function LoadingScreen({
  variant,
  onDone,
}: {
  variant: Variant;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);

  const duration = reduce ? 400 : variant === 'intro' ? 3100 : 1250;

  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          key="loading-screen"
          className="landing-theme fixed inset-0 z-[100] overflow-hidden"
          style={{
            background: 'var(--landing-bg)',
            color: 'var(--landing-text)',
          }}
          initial={{ y: 0 }}
          exit={{ y: '-101%' }}
          transition={{ duration: EXIT_DURATION, ease: EXIT_EASE }}
          aria-hidden
        >
          <Atmosphere />
          <Corners variant={variant} />

          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            exit={{ y: '-24%' }}
            transition={{ duration: EXIT_DURATION, ease: EXIT_EASE }}
          >
            {variant === 'intro' ? (
              <IntroContent reduce={!!reduce} />
            ) : (
              <HandoffContent reduce={!!reduce} />
            )}
          </motion.div>

          <ProgressBar duration={duration} />

          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
            style={{ background: 'var(--landing-accent)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 1 }}
            transition={{ duration: EXIT_DURATION * 0.4, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Atmosphere() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(48% 34% at 12% 18%, var(--landing-accent-soft), transparent 70%), radial-gradient(38% 30% at 88% 82%, rgba(200, 90, 46, 0.14), transparent 70%)',
          filter: 'blur(70px)',
          opacity: 0.9,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </>
  );
}

function Corners({ variant }: { variant: Variant }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
        className="absolute left-5 top-5 flex items-center gap-2 md:left-8 md:top-8"
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-[7px]"
          style={{ background: 'var(--landing-accent)' }}
        >
          <Leaf
            className="h-3 w-3"
            strokeWidth={2.2}
            style={{ color: 'var(--landing-button-foreground)' }}
          />
        </span>
        <span
          className="landing-display text-[0.92rem] tracking-[-0.02em]"
          style={{ color: 'var(--landing-text)' }}
        >
          Verdify
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
        className="absolute right-5 top-5 md:right-8 md:top-8"
        style={{
          fontFamily: 'var(--landing-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--landing-text-dim)',
        }}
      >
        {variant === 'intro' ? '01 / Boarding' : '02 / Entering'}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
        className="absolute bottom-5 left-5 md:bottom-8 md:left-8"
        style={{
          fontFamily: 'var(--landing-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--landing-text-dim)',
        }}
      >
        {variant === 'intro'
          ? 'Calibrating · Carbon · Cadence'
          : 'Syncing telemetry'}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        className="absolute bottom-5 right-5 md:bottom-8 md:right-8"
        style={{
          fontFamily: 'var(--landing-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--landing-text-dim)',
        }}
      >
        v0.1 · MMXXVI
      </motion.div>
    </>
  );
}

function IntroContent({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: reduce ? 0.2 : 1.1, ease: EASE, delay: 0.1 }}
        className="mb-10 flex items-center gap-3"
      >
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: 'var(--landing-accent)' }}
        />
        <span
          style={{
            fontFamily: 'var(--landing-font-mono)',
            fontSize: '0.66rem',
            letterSpacing: '0.34em',
            textTransform: 'uppercase',
            color: 'var(--landing-text-muted)',
          }}
        >
          Every trip, accounted for
        </span>
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{ background: 'var(--landing-accent-warm)' }}
        />
      </motion.div>

      <h1
        className="select-none leading-[0.9]"
        style={{
          fontFamily: 'var(--landing-font-display)',
          fontWeight: 340,
          letterSpacing: '-0.04em',
          fontSize: 'clamp(3.2rem, 11vw, 8.4rem)',
          color: 'var(--landing-text)',
        }}
      >
        <div className="flex flex-wrap justify-center gap-x-[0.25em] gap-y-2">
          {WORDS.map((word, wi) => (
            <span key={wi} className="inline-flex overflow-hidden py-[0.05em]">
              {word.split('').map((ch, ci) => (
                <motion.span
                  key={ci}
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: '0%', opacity: 1 }}
                  transition={{
                    duration: reduce ? 0.25 : 0.85,
                    ease: EASE,
                    delay: reduce ? 0 : 0.35 + wi * 0.12 + ci * 0.025,
                  }}
                  className="inline-block"
                  style={{
                    fontFamily:
                      word === 'measured.'
                        ? 'var(--landing-font-italic)'
                        : undefined,
                    fontStyle: word === 'measured.' ? 'italic' : undefined,
                    color:
                      word === 'measured.'
                        ? 'var(--landing-accent)'
                        : undefined,
                  }}
                >
                  {ch}
                </motion.span>
              ))}
            </span>
          ))}
        </div>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduce ? 0.25 : 0.8,
          ease: EASE,
          delay: reduce ? 0.1 : 1.4,
        }}
        className="mt-10 max-w-sm text-balance"
        style={{
          fontFamily: 'var(--landing-font-body)',
          fontSize: '0.9rem',
          lineHeight: 1.5,
          color: 'var(--landing-text-muted)',
        }}
      >
        A ledger for the way you move — one kilometer,
        one kilogram, at a time.
      </motion.p>
    </div>
  );
}

function HandoffContent({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE }}
        className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: 'var(--landing-accent-soft)',
          border: '1px solid var(--landing-accent-muted)',
        }}
      >
        <Leaf
          className="h-5 w-5"
          strokeWidth={1.8}
          style={{ color: 'var(--landing-accent)' }}
        />
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ border: '1px solid var(--landing-accent)' }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut', repeat: Infinity }}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
        className="overflow-hidden"
      >
        <p
          style={{
            fontFamily: 'var(--landing-font-display)',
            fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
            letterSpacing: '-0.02em',
            color: 'var(--landing-text)',
          }}
        >
          Entering your{' '}
          <span
            style={{
              fontFamily: 'var(--landing-font-italic)',
              fontStyle: 'italic',
              color: 'var(--landing-accent)',
            }}
          >
            ledger
          </span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.25 }}
        className="mt-3"
        style={{
          fontFamily: 'var(--landing-font-mono)',
          fontSize: '0.62rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: 'var(--landing-text-dim)',
        }}
      >
        Authenticated · Warming up
      </motion.div>
    </div>
  );
}

function ProgressBar({ duration }: { duration: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[2px]"
      style={{ background: 'var(--landing-border)' }}
    >
      <motion.div
        className="h-full origin-left"
        style={{ background: 'var(--landing-accent)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: duration / 1000, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}
