'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  ArrowRight,
  Route,
  Leaf,
  Zap,
  Timer,
  Trophy,
  FileText,
  Sparkles,
  MapPin,
  CornerDownRight,
  Navigation,
} from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import { useIsDark } from '@/components/AnimatedThemeToggler';

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
};

const stats = [
  { k: '−68%', v: 'median CO₂ reduction on recommended routes' },
  { k: '3–4', v: 'ranked options per prompt, live' },
  { k: '2050', v: 'Net Zero Malaysia, translated daily' },
];

const steps = [
  { n: '01', t: 'Prompt.', b: '“Bukit Indah to Woodlands, eco mode.” Natural language in.', i: Sparkles },
  { n: '02', t: 'Ground.', b: 'Gemini reasons. Vertex RAG pulls corridor references.', i: MapPin },
  { n: '03', t: 'Act.', b: 'Routes compared. Parking, EV, booking — triggered in flow.', i: Route },
  { n: '04', t: 'Report.', b: 'Points issued. PDF summary with CO₂ + cost saved.', i: FileText },
];

const caps = [
  { t: 'Smart Green Route Optimizer', d: 'Three to four routes ranked live on time, cost, and carbon across the corridor.', i: Route },
  { t: 'Real-time Carbon Intelligence', d: 'Per-route CO₂e exposed in seconds — not buried in the backend.', i: Leaf },
  { t: 'Autonomous Action Engine', d: 'Parking, EV charging, reports — dispatched via agentic flows.', i: Zap },
  { t: 'Energy Crunch Mode', d: 'Tuned for April 2026: prefers low-energy and low-cost options when fuel tightens.', i: Timer },
  { t: 'Green Reward System', d: 'Points accrue on every lower-impact trip. Visible, cumulative, gamified.', i: Trophy },
  { t: 'Professional Trip Report', d: 'Auto-summary: money saved, emissions reduced, Net Zero 2050 contribution.', i: FileText },
];

const faqs = [
  {
    q: 'What makes Verdify different from Google Maps or Waze?',
    a: 'Maps optimise for time. Verdify optimises for time, cost, and carbon — together. It understands the Johor–Singapore corridor specifically, books downstream actions, and reports CO₂e back to you in a format you can actually use.',
    tag: 'Positioning',
  },
  {
    q: 'How does routing actually stay “green” during the April 2026 crunch?',
    a: 'Energy Crunch Mode re-weights the ranker toward low-energy and low-cost corridors — RTS Link, park-and-ride, EV-first options — using live signals grounded through Vertex AI Search.',
    tag: 'Routing',
  },
  {
    q: 'Where does the carbon data come from?',
    a: 'Per-segment CO₂e is computed from mode, distance, and occupancy, cross-referenced with the corridor RAG dataset and Malaysia Net Zero 2050 baselines. Every number on a route card is traceable.',
    tag: 'Carbon',
  },
  {
    q: 'What can the autonomous action engine actually trigger?',
    a: 'Parking reservations, EV charging windows, RTS Link holds, and trip reports — dispatched as agentic flows. You confirm; Verdify executes. Nothing is sent without an explicit signal.',
    tag: 'Agents',
  },
  {
    q: 'Are green reward points redeemable?',
    a: 'Points accumulate per lower-impact trip and map to partner rewards in the Iskandar and JS-SEZ network. The ledger is visible, cumulative, and exportable into your monthly trip report.',
    tag: 'Rewards',
  },
  {
    q: 'Is my trip data private?',
    a: 'Trips are stored against your account only. Aggregated, de-identified corridor signals may inform public-agency dashboards — never personal routes. You can purge your history at any time.',
    tag: 'Privacy',
  },
];

function SplitType({ text, delay = 0, stagger = 24 }: { text: string; delay?: number; stagger?: number }) {
  const words = text.split(' ');
  let idx = 0;
  return (
    <span aria-label={text}>
      {words.map((w, wi) => {
        const start = idx;
        const chars = Array.from(w);
        const node = (
          <span key={wi} className="inline-block whitespace-nowrap" style={{ marginRight: wi < words.length - 1 ? '0.3em' : 0 }}>
            {chars.map((c, ci) => (
              <span
                key={ci}
                aria-hidden
                className="theme-char"
                style={{ animationDelay: `${delay + (start + ci) * stagger}ms` }}
              >
                {c}
              </span>
            ))}
          </span>
        );
        idx += w.length + 1;
        return node;
      })}
    </span>
  );
}

function AccordionCorridor({ openIdx, setOpenIdx }: { openIdx: number | null; setOpenIdx: (i: number | null) => void }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[23px] top-0 w-px"
        style={{
          background:
            'linear-gradient(to bottom, transparent, var(--theme-border-strong) 8%, var(--theme-border-strong) 92%, transparent)',
        }}
      />
      <div className="flex flex-col gap-4">
        {faqs.map((f, i) => {
          const open = openIdx === i;
          return (
            <div key={i} className="relative pl-[62px]">
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                aria-label={`Toggle ${f.q}`}
                className="absolute left-0 top-1 flex h-[48px] w-[48px] items-center justify-center rounded-full transition-all duration-500"
                style={{
                  background: open ? 'var(--theme-accent)' : 'var(--theme-surface)',
                  color: open ? 'var(--theme-accent-fg)' : 'var(--theme-fg-muted)',
                  border: '1px solid var(--theme-border-strong)',
                  boxShadow: open ? 'var(--theme-accent-glow)' : 'none',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {open ? <Navigation className="h-4 w-4" strokeWidth={1.8} /> : <MapPin className="h-4 w-4" strokeWidth={1.6} />}
              </button>

              <div
                className="theme-card overflow-hidden transition-colors"
                style={{
                  padding: 0,
                  borderColor: open ? 'var(--theme-accent-muted)' : undefined,
                }}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex w-full items-center justify-between gap-5 px-6 py-5 text-left"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="theme-italic text-[1.35rem] leading-none" style={{ color: 'var(--theme-accent)' }}>
                      0{i + 1}
                    </span>
                    <span className="text-[1.02rem] tracking-[-0.01em]" style={{ fontFamily: 'var(--theme-font-display)', color: 'var(--theme-fg)' }}>
                      {f.q}
                    </span>
                  </div>
                  <span
                    className="hidden shrink-0 theme-mono-sm md:inline"
                    style={{ color: open ? 'var(--theme-accent)' : 'var(--theme-fg-dim)' }}
                  >
                    {open ? '↓ open' : 'tap to expand'}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div
                        className="px-6 pb-7"
                        style={{ borderTop: '1px dashed var(--theme-border)' }}
                      >
                        <div className="flex items-start gap-3 pt-5">
                          <CornerDownRight className="mt-[5px] h-4 w-4 shrink-0" style={{ color: 'var(--theme-accent)' }} strokeWidth={1.6} />
                          <p className="text-[0.98rem] leading-[1.8]" style={{ color: 'var(--theme-fg-muted)' }}>
                            {f.a}
                          </p>
                        </div>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-3 py-1 theme-mono-sm"
                            style={{
                              background: 'var(--theme-accent-soft)',
                              border: '1px solid var(--theme-accent-muted)',
                              color: 'var(--theme-accent)',
                            }}
                          >
                            · {f.tag}
                          </span>
                          <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                            jhr → sg · corridor ref
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <motion.section
      id="faq"
      {...reveal}
      className="mx-auto max-w-[1440px] px-5 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-32"
    >
      <div className="mb-10 grid gap-6 sm:mb-14 sm:gap-8 lg:grid-cols-[0.32fr_0.68fr]">
        <div className="space-y-4">
          <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>§ Questions — 04</p>
          <div className="theme-rule" />
        </div>
        <h2 className="theme-display text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
          What people actually ask before they{' '}
          <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
            switch lanes.
          </span>
        </h2>
      </div>

      <AccordionCorridor openIdx={openIdx} setOpenIdx={setOpenIdx} />
    </motion.section>
  );
}

export default function LandingPage() {
  const isDark = useIsDark();
  return (
    <div className="theme-root relative min-h-svh">
      <div className="theme-grain" aria-hidden />

      <section className="relative overflow-hidden">
        <div className="theme-mesh" aria-hidden />

        <div className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-10 sm:px-6 sm:pb-16 sm:pt-12 lg:px-10 lg:pb-24 lg:pt-16 mt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="theme-accent-dot" />
              <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
                Live · Personal green navigator
              </span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="theme-chip">Johor ⇌ SG corridor</span>
              <span className="theme-chip" style={{ color: 'var(--theme-accent)', borderColor: 'var(--theme-accent-muted)' }}>
                April 2026
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-10 sm:mt-10 sm:gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <h1 className="theme-hero">
                <span className="block">
                  <SplitType text="Green mobility," delay={80} />
                </span>
                <span className="block">
                  <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
                    <SplitType text="planned" delay={420} />
                  </span>
                </span>
                <span className="block">
                  <SplitType text="into action." delay={760} />
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.3, ease: [0.2, 0.7, 0.2, 1] }}
                className="mt-9 max-w-xl text-[1.05rem] leading-[1.7]"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                A personal navigator for the Johor–Singapore corridor — built on the Google AI stack to{' '}
                <span className="theme-italic" style={{ color: 'var(--theme-fg)' }}>autonomously plan, calculate, book, and report</span>{' '}
                greener journeys.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.5 }}
                className="mt-10 flex flex-col gap-3 sm:flex-row"
              >
                <a href="#how" className="theme-btn-primary">
                  See how it works <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#caps" className="theme-btn-ghost">Capabilities</a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.7 }}
                className="mt-14 grid gap-x-8 gap-y-6 border-t pt-8 sm:grid-cols-3"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                {stats.map((s) => (
                  <div key={s.v} className="min-w-0">
                    <p className="theme-number">{s.k}</p>
                    <p className="mt-2 text-[0.78rem] leading-6" style={{ color: 'var(--theme-fg-muted)' }}>
                      {s.v}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              className="relative"
            >
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-[18px] lg:aspect-[5/5]"
                style={{
                  background: 'var(--theme-map-surface)',
                  border: '1px solid var(--theme-border-strong)',
                  boxShadow: 'var(--theme-map-shadow)',
                  backdropFilter: 'blur(24px) saturate(170%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(170%)',
                }}
              >
                <RouteMap variant={isDark ? 'dark' : 'light'} />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-5">
                  <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
                    corridor · jhr→sg
                  </span>
                  <span className="flex items-center gap-2 theme-mono-sm" style={{ color: 'var(--theme-accent)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--theme-accent)', boxShadow: '0 0 10px var(--theme-accent)' }} />
                    routing · live
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div
          className="relative overflow-hidden border-y py-4"
          style={{
            borderColor: 'var(--theme-border)',
            background: 'var(--theme-ticker-bg)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          }}
        >
          <div className="theme-ticker flex whitespace-nowrap">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-12 pr-12">
                {['Gemini 2.0', 'Vertex AI Search', 'Firebase Genkit', 'Cloud Run', 'React + Vite', 'Shadcn/UI', 'RTS Link', 'JS-SEZ', 'Net Zero 2050'].map(
                  (t, i) => (
                    <span key={`${k}-${i}`} className="flex items-center gap-5">
                      <span className="theme-italic text-[1.35rem] tracking-tight" style={{ color: 'var(--theme-fg)' }}>
                        {t}
                      </span>
                      <span className="h-1 w-1 rounded-full" style={{ background: 'var(--theme-accent)' }} />
                    </span>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <motion.section id="premise" {...reveal} className="mx-auto max-w-[1440px] px-5 py-16 scroll-mt-20 sm:px-6 sm:py-20 lg:px-10 lg:py-32">
        <div className="grid gap-8 sm:gap-14 lg:grid-cols-[0.32fr_0.68fr]">
          <div className="space-y-4">
            <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>§ Premise — 01</p>
            <div className="theme-rule" />
          </div>
          <div className="space-y-8">
            <h2 className="theme-display text-[clamp(2.2rem,5.2vw,4.4rem)] leading-[1.02] tracking-[-0.04em]">
              Johor–Singapore mobility is under pressure from congestion, emissions, and the April 2026{' '}
              <span className="theme-italic" style={{ color: 'var(--theme-accent-warm)' }}>energy crunch.</span>
            </h2>
            <div className="grid gap-8 text-[1rem] leading-[1.75] md:grid-cols-2" style={{ color: 'var(--theme-fg-muted)' }}>
              <p>
                Causeway traffic, RTS Link load, and daily movement across Iskandar Puteri make the corridor one of Malaysia's most urgent mobility environments.
              </p>
              <p>
                Verdify closes the gap with one autonomous system — routing, carbon intelligence, booking, rewards, reporting — aligned to Track 4: Green Horizon.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section
        id="how"
        className="relative overflow-hidden border-y scroll-mt-24"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-bg-soft)' }}
      >
        <div className="landing-mesh" aria-hidden style={{ opacity: 0.6 }} />
        <div className="relative mx-auto max-w-[1440px] px-5 py-16 sm:px-6 sm:py-20 lg:px-10 lg:py-32">
          <motion.div {...reveal} className="mb-10 grid gap-6 sm:mb-16 sm:gap-8 lg:grid-cols-[0.32fr_0.68fr]">
            <div className="space-y-4">
              <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>§ Sequence — 02</p>
              <div className="theme-rule" />
            </div>
            <h2 className="theme-display max-w-2xl text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
              From a short prompt to autonomous{' '}
              <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>execution.</span>
            </h2>
          </motion.div>

          <div className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-[64px] hidden h-px lg:block"
              style={{ background: 'linear-gradient(to right, transparent, var(--theme-border-strong) 15%, var(--theme-border-strong) 85%, transparent)' }}
            />
            {steps.map((s, idx) => (
              <motion.article
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.75, delay: idx * 0.1, ease: [0.2, 0.7, 0.2, 1] }}
                className="theme-card group flex flex-col gap-5 p-7"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: 'var(--theme-accent-soft)',
                      border: '1px solid var(--theme-accent-muted)',
                      color: 'var(--theme-accent)',
                    }}
                  >
                    <s.i className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>Step {s.n}</span>
                </div>
                <h3 className="theme-display text-[1.7rem] tracking-[-0.02em]">{s.t}</h3>
                <p className="text-[0.95rem] leading-7" style={{ color: 'var(--theme-fg-muted)' }}>
                  {s.b}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="caps" className="mx-auto max-w-[1440px] px-5 py-16 scroll-mt-20 sm:px-6 sm:py-20 lg:px-10 lg:py-32">
        <motion.div {...reveal} className="mb-10 grid gap-6 sm:mb-16 sm:gap-8 lg:grid-cols-[0.32fr_0.68fr]">
          <div className="space-y-4">
            <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>§ Capabilities — 03</p>
            <div className="theme-rule" />
          </div>
          <h2 className="theme-display max-w-xl text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.04] tracking-[-0.035em]">
            Six working lines for an{' '}
            <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>agentic green navigator.</span>
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {caps.map((c, i) => (
            <motion.div
              key={c.t}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
              className="theme-card group flex flex-col gap-5 p-7"
            >
              <div className="flex items-center justify-between">
                <span className="theme-mono-sm" style={{ color: 'var(--theme-accent)' }}>Line 0{i + 1}</span>
                <c.i className="h-5 w-5 transition-colors" style={{ color: 'var(--theme-fg-dim)' }} strokeWidth={1.4} />
              </div>
              <h3 className="theme-display text-[1.45rem] leading-[1.18] tracking-[-0.02em]">{c.t}</h3>
              <p className="text-[0.95rem] leading-7" style={{ color: 'var(--theme-fg-muted)' }}>
                {c.d}
              </p>
              <div
                className="mt-auto flex items-center gap-2 pt-2 theme-mono-sm opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ color: 'var(--theme-accent)' }}
              >
                learn more <ArrowUpRight className="h-3 w-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <FaqSection />

      <section id="closing" className="px-5 py-16 scroll-mt-20 sm:px-6 sm:py-20 lg:px-10 lg:py-32">
        <motion.div
          {...reveal}
          className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[20px] px-6 py-12 sm:px-14 sm:py-20 lg:px-20 lg:py-28"
          style={{
            background: 'var(--theme-cta-bg)',
            border: '1px solid var(--theme-border-strong)',
            boxShadow: 'var(--theme-cta-shadow)',
            backdropFilter: 'blur(26px) saturate(170%)',
            WebkitBackdropFilter: 'blur(26px) saturate(170%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[20%] -top-[30%] h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(closest-side, var(--theme-accent-soft), transparent 70%)' }}
          />
          <p className="theme-mono-sm relative" style={{ color: 'var(--theme-accent)' }}>§ Closing</p>
          <h2 className="theme-display relative mt-6 max-w-5xl text-[clamp(2.4rem,6.5vw,6rem)] leading-[0.96] tracking-[-0.045em]">
            Built for the people who need green mobility to end in{' '}
            <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>action.</span>
          </h2>
          <p className="relative mt-8 max-w-2xl text-[1.02rem] leading-[1.75]" style={{ color: 'var(--theme-fg-muted)' }}>
            Cross-border workers, Iskandar Malaysia residents, JS-SEZ companies, and public agencies — all get lower congestion, lower emissions, stronger carbon awareness, and usable green mobility data for Net Zero Malaysia 2050.
          </p>
          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#caps" className="theme-btn-primary">Review capabilities <ArrowRight className="h-4 w-4" /></a>
            <a href="/technology" className="theme-btn-ghost">See the stack</a>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
