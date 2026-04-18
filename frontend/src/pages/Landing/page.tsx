'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router';
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
} from 'lucide-react';
import RouteMap from '@/components/RouteMap';
import AnimatedThemeToggler, { useIsDark } from '@/components/AnimatedThemeToggler';

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
                className="v2-char"
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

function V2Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', f);
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-all duration-500"
      style={{
        backgroundColor: scrolled ? 'color-mix(in srgb, var(--v2-bg) 78%, transparent)' : 'color-mix(in srgb, var(--v2-bg) 30%, transparent)',
        borderBottom: `1px solid ${scrolled ? 'var(--v2-border)' : 'transparent'}`,
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px]" style={{ background: 'var(--v2-eco)' }}>
            <Leaf className="h-3.5 w-3.5" style={{ color: 'var(--v2-btn-fg)' }} strokeWidth={2.4} />
          </span>
          <span className="v2-display text-[1.35rem] tracking-[-0.03em]">Verdify</span>
        </Link>
        <div className="hidden items-center gap-9 lg:flex">
          {[
            { t: 'How', h: '#how' },
            { t: 'Capabilities', h: '#caps' },
            { t: 'Stack', h: '#stack' },
          ].map((l) => (
            <a key={l.t} href={l.h} className="v2-link-underline text-[0.82rem]" style={{ color: 'var(--v2-text-muted)' }}>
              {l.t}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="v2-theme-toggle" />
          <a href="#how" className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[0.78rem] font-medium" style={{ background: 'var(--v2-eco)', color: 'var(--v2-btn-fg)' }}>
            Plan a trip <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </nav>
  );
}

function V2Foot() {
  return (
    <footer className="relative border-t px-4 pt-24 pb-10 sm:px-6 lg:px-10" style={{ borderColor: 'var(--v2-border)' }}>
      <div className="mx-auto max-w-[1440px]">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>§ Project brief</p>
            <h3 className="v2-display mt-5 max-w-3xl text-[clamp(2.4rem,5.5vw,4.8rem)] leading-[0.96]">
              One corridor.{' '}
              <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>Johor to Singapore</span>, every day.
            </h3>
            <p className="mt-6 max-w-lg text-[0.98rem] leading-7" style={{ color: 'var(--v2-text-muted)' }}>
              Agentic green navigation for commuters, companies, and reviewers who need mobility to end in measurable action.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#how" className="v2-btn-primary">Plan a trip <ArrowRight className="h-4 w-4" /></a>
              <a href="#caps" className="v2-btn-ghost">Capabilities</a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-10">
            <div className="grid grid-cols-2 gap-y-3 v2-mono-sm" style={{ color: 'var(--v2-text-muted)' }}>
              <span>Track 4 · Green Horizon</span>
              <span>Gemini · Genkit · RAG</span>
              <span>Vertex AI Search</span>
              <span>Cloud Run</span>
            </div>
            <p className="v2-italic text-2xl" style={{ color: 'var(--v2-text)' }}>Built for Net Zero 2050.</p>
          </div>
        </div>
        <div className="mt-20 flex items-end justify-between border-t pt-7" style={{ borderColor: 'var(--v2-border)' }}>
          <p className="v2-display text-[clamp(3rem,10vw,9rem)] leading-[0.88] tracking-[-0.055em]">
            Verdify<span style={{ color: 'var(--v2-eco)' }}>.</span>
          </p>
          <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>© 2026 · Verdify</p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const isDark = useIsDark();
  return (
    <div className="verdify-v2 v2-host relative min-h-svh">
      <div className="v2-grain" aria-hidden />
      <V2Nav />

      <section className="relative overflow-hidden pt-[72px]">
        <div className="v2-mesh" aria-hidden />

        <div className="relative mx-auto max-w-[1440px] px-4 pb-16 pt-12 sm:px-6 lg:px-10 lg:pb-24 lg:pt-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="v2-eco-dot" />
              <span className="v2-mono-sm" style={{ color: 'var(--v2-text-muted)' }}>
                Live · Personal green navigator
              </span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="v2-chip">Johor ⇌ SG corridor</span>
              <span className="v2-chip" style={{ color: 'var(--v2-eco)', borderColor: 'var(--v2-eco-mid)' }}>
                April 2026
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <h1 className="v2-huge">
                <span className="block">
                  <SplitType text="Green mobility," delay={80} />
                </span>
                <span className="block">
                  <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>
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
                style={{ color: 'var(--v2-text-muted)' }}
              >
                A personal navigator for the Johor–Singapore corridor — built on the Google AI stack to{' '}
                <span className="v2-italic" style={{ color: 'var(--v2-text)' }}>autonomously plan, calculate, book, and report</span>{' '}
                greener journeys.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.5 }}
                className="mt-10 flex flex-col gap-3 sm:flex-row"
              >
                <a href="#how" className="v2-btn-primary">
                  See how it works <ArrowRight className="h-4 w-4" />
                </a>
                <a href="#caps" className="v2-btn-ghost">Capabilities</a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1.7 }}
                className="mt-14 grid gap-x-8 gap-y-6 border-t pt-8 sm:grid-cols-3"
                style={{ borderColor: 'var(--v2-border)' }}
              >
                {stats.map((s) => (
                  <div key={s.v} className="min-w-0">
                    <p className="v2-number">{s.k}</p>
                    <p className="mt-2 text-[0.78rem] leading-6" style={{ color: 'var(--v2-text-muted)' }}>
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
                  background: 'var(--v2-map-surface)',
                  border: '1px solid var(--v2-border-strong)',
                  boxShadow: 'var(--v2-map-shadow)',
                  backdropFilter: 'blur(24px) saturate(170%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(170%)',
                }}
              >
                <RouteMap variant={isDark ? 'dark' : 'light'} />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-5">
                  <span className="v2-mono-sm" style={{ color: 'var(--v2-text-muted)' }}>
                    corridor · jhr→sg
                  </span>
                  <span className="flex items-center gap-2 v2-mono-sm" style={{ color: 'var(--v2-eco)' }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--v2-eco)', boxShadow: '0 0 10px var(--v2-eco)' }} />
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
            borderColor: 'var(--v2-border)',
            background: 'var(--v2-ticker-bg)',
            backdropFilter: 'blur(18px) saturate(160%)',
            WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          }}
        >
          <div className="v2-ticker flex whitespace-nowrap">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-12 pr-12">
                {['Gemini 2.0', 'Vertex AI Search', 'Firebase Genkit', 'Cloud Run', 'React + Vite', 'Shadcn/UI', 'RTS Link', 'JS-SEZ', 'Net Zero 2050'].map(
                  (t, i) => (
                    <span key={`${k}-${i}`} className="flex items-center gap-5">
                      <span className="v2-italic text-[1.35rem] tracking-tight" style={{ color: 'var(--v2-text)' }}>
                        {t}
                      </span>
                      <span className="h-1 w-1 rounded-full" style={{ background: 'var(--v2-eco)' }} />
                    </span>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <motion.section {...reveal} className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.32fr_0.68fr]">
          <div className="space-y-4">
            <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>§ Premise — 01</p>
            <div className="v2-rule" />
          </div>
          <div className="space-y-8">
            <h2 className="v2-display text-[clamp(2.2rem,5.2vw,4.4rem)] leading-[1.02] tracking-[-0.04em]">
              Johor–Singapore mobility is under pressure from congestion, emissions, and the April 2026{' '}
              <span className="v2-italic" style={{ color: 'var(--v2-warm)' }}>energy crunch.</span>
            </h2>
            <div className="grid gap-8 text-[1rem] leading-[1.75] md:grid-cols-2" style={{ color: 'var(--v2-text-muted)' }}>
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
        className="relative overflow-hidden border-y"
        style={{ borderColor: 'var(--v2-border)', background: 'var(--v2-bg-soft)' }}
      >
        <div className="v2-mesh" aria-hidden style={{ opacity: 0.6 }} />
        <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <motion.div {...reveal} className="mb-16 grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
            <div className="space-y-4">
              <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>§ Sequence — 02</p>
              <div className="v2-rule" />
            </div>
            <h2 className="v2-display max-w-2xl text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
              From a short prompt to autonomous{' '}
              <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>execution.</span>
            </h2>
          </motion.div>

          <div className="relative grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <div
              aria-hidden
              className="pointer-events-none absolute left-0 right-0 top-[64px] hidden h-px lg:block"
              style={{ background: 'linear-gradient(to right, transparent, var(--v2-border-strong) 15%, var(--v2-border-strong) 85%, transparent)' }}
            />
            {steps.map((s, idx) => (
              <motion.article
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.75, delay: idx * 0.1, ease: [0.2, 0.7, 0.2, 1] }}
                className="v2-card group flex flex-col gap-5 p-7"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{
                      background: 'var(--v2-eco-soft)',
                      border: '1px solid var(--v2-eco-mid)',
                      color: 'var(--v2-eco)',
                    }}
                  >
                    <s.i className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>Step {s.n}</span>
                </div>
                <h3 className="v2-display text-[1.7rem] tracking-[-0.02em]">{s.t}</h3>
                <p className="text-[0.95rem] leading-7" style={{ color: 'var(--v2-text-muted)' }}>
                  {s.b}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="caps" className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div {...reveal} className="mb-16 grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
          <div className="space-y-4">
            <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>§ Capabilities — 03</p>
            <div className="v2-rule" />
          </div>
          <h2 className="v2-display max-w-xl text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.04] tracking-[-0.035em]">
            Six working lines for an{' '}
            <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>agentic green navigator.</span>
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
              className="v2-card group flex flex-col gap-5 p-7"
            >
              <div className="flex items-center justify-between">
                <span className="v2-mono-sm" style={{ color: 'var(--v2-eco)' }}>Line 0{i + 1}</span>
                <c.i className="h-5 w-5 transition-colors" style={{ color: 'var(--v2-text-dim)' }} strokeWidth={1.4} />
              </div>
              <h3 className="v2-display text-[1.45rem] leading-[1.18] tracking-[-0.02em]">{c.t}</h3>
              <p className="text-[0.95rem] leading-7" style={{ color: 'var(--v2-text-muted)' }}>
                {c.d}
              </p>
              <div
                className="mt-auto flex items-center gap-2 pt-2 v2-mono-sm opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{ color: 'var(--v2-eco)' }}
              >
                learn more <ArrowUpRight className="h-3 w-3" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section
        id="stack"
        className="relative overflow-hidden border-y"
        style={{ borderColor: 'var(--v2-border)', background: 'var(--v2-bg-soft)' }}
      >
        <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <motion.div {...reveal} className="mb-16 grid gap-8 lg:grid-cols-[0.32fr_0.68fr]">
            <div className="space-y-4">
              <p className="v2-mono-sm" style={{ color: 'var(--v2-text-dim)' }}>§ Evidence — 04</p>
              <div className="v2-rule" />
            </div>
            <h2 className="v2-display max-w-2xl text-[clamp(2rem,4.6vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
              The stack is grounded, deployable, and matched to the{' '}
              <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>brief.</span>
            </h2>
          </motion.div>

          <div className="space-y-0">
            {[
              { m: 'Gemini', t: 'Multi-step reasoning as the planning brain', b: 'Gemini 2.0 Flash/Pro interprets intent, compares routes, and orchestrates explainable recommendations.', i: Sparkles },
              { m: 'RAG', t: 'Grounded on corridor and national knowledge', b: 'Vertex AI Search RAG pulls Low Carbon Mobility Blueprint, RTS Link, JS-SEZ, and Net Zero 2050 references.', i: MapPin },
              { m: 'Cloud', t: 'Deployed with the Google AI ecosystem stack', b: 'React + Vite + Tailwind + shadcn/ui frontend. Firebase Genkit for agentic flows. Cloud Run for backend execution.', i: Zap },
            ].map((r, i) => (
              <motion.div
                key={r.m}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="group grid items-center gap-8 border-b py-10 md:grid-cols-[1fr_2fr_0.3fr]"
                style={{ borderColor: 'var(--v2-border)' }}
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-[10px] transition-all duration-500 group-hover:scale-110"
                    style={{ background: 'var(--v2-eco-soft)', border: '1px solid var(--v2-eco-mid)', color: 'var(--v2-eco)' }}
                  >
                    <r.i className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <p className="v2-display text-[clamp(2rem,3.8vw,3.2rem)] tracking-[-0.04em]">{r.m}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="v2-display text-[1.2rem] tracking-[-0.015em]">{r.t}</h3>
                  <p className="text-[0.95rem] leading-7" style={{ color: 'var(--v2-text-muted)' }}>
                    {r.b}
                  </p>
                </div>
                <div className="justify-self-end">
                  <ArrowUpRight
                    className="h-5 w-5 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1"
                    style={{ color: 'var(--v2-text-dim)' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div
          {...reveal}
          className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[20px] px-8 py-16 sm:px-14 sm:py-20 lg:px-20 lg:py-28"
          style={{
            background: 'var(--v2-cta-bg)',
            border: '1px solid var(--v2-border-strong)',
            boxShadow: 'var(--v2-cta-shadow)',
            backdropFilter: 'blur(26px) saturate(170%)',
            WebkitBackdropFilter: 'blur(26px) saturate(170%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[20%] -top-[30%] h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(closest-side, var(--v2-eco-soft), transparent 70%)' }}
          />
          <p className="v2-mono-sm relative" style={{ color: 'var(--v2-eco)' }}>§ Closing</p>
          <h2 className="v2-display relative mt-6 max-w-5xl text-[clamp(2.4rem,6.5vw,6rem)] leading-[0.96] tracking-[-0.045em]">
            Built for the people who need green mobility to end in{' '}
            <span className="v2-italic" style={{ color: 'var(--v2-eco)' }}>action.</span>
          </h2>
          <p className="relative mt-8 max-w-2xl text-[1.02rem] leading-[1.75]" style={{ color: 'var(--v2-text-muted)' }}>
            Cross-border workers, Iskandar Malaysia residents, JS-SEZ companies, and public agencies — all get lower congestion, lower emissions, stronger carbon awareness, and usable green mobility data for Net Zero Malaysia 2050.
          </p>
          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#caps" className="v2-btn-primary">Review capabilities <ArrowRight className="h-4 w-4" /></a>
            <a href="#stack" className="v2-btn-ghost">See the stack</a>
          </div>
        </motion.div>
      </section>

      <V2Foot />
    </div>
  );
}
