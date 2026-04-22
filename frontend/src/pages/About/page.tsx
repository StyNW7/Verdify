'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Flag,
  Leaf,
  Target,
  Users,
} from 'lucide-react';

const team = [
  { n: '01', name: 'Team Member 01', role: 'Product & strategy', meta: 'Corridor lead' },
  { n: '02', name: 'Team Member 02', role: 'AI · agentic flows', meta: 'Gemini · Genkit' },
  { n: '03', name: 'Team Member 03', role: 'Frontend · motion', meta: 'React · Framer' },
  { n: '04', name: 'Team Member 04', role: 'Backend · data', meta: 'Cloud Run · RAG' },
];

const pillars = [
  {
    i: Target,
    k: 'Track 4',
    t: 'Green Horizon',
    b: 'Built for the Green Horizon brief — a personal navigator that turns national climate intent into daily, actionable mobility.',
  },
  {
    i: Users,
    k: 'Audience',
    t: 'The corridor',
    b: 'Cross-border workers, Iskandar residents, JS-SEZ companies, and public agencies — everyone moving across the Johor–Singapore corridor.',
  },
  {
    i: Flag,
    k: 'Horizon',
    t: 'Net Zero 2050',
    b: 'A product that contributes, daily, to Net Zero Malaysia 2050 — not as a slogan, but as a measurable, cumulative line in every trip.',
  },
];

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
};

export default function AboutPage() {
  return (
    <div className="theme-root relative min-h-svh">
      <div className="theme-grain" aria-hidden />

      <section id="hero" className="relative overflow-hidden">
        <div className="theme-mesh" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 pt-32 pb-20 sm:px-6 lg:px-10 lg:pt-40 lg:pb-28">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="theme-accent-dot" />
              <span
                className="theme-mono-sm"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                The profile · manifesto · people
              </span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="theme-chip">Track 4 · Green Horizon</span>
              <span
                className="theme-chip"
                style={{
                  color: 'var(--theme-accent)',
                  borderColor: 'var(--theme-accent-muted)',
                }}
              >
                Johor ⇌ SG
              </span>
            </div>
          </div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
            className="theme-hero mt-14"
          >
            <span className="block">We are building for a</span>
            <span className="block">
              <span
                className="theme-italic"
                style={{ color: 'var(--theme-accent)' }}
              >
                corridor
              </span>{' '}
              that
            </span>
            <span className="block">must move better.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="mt-10 max-w-2xl text-[1.08rem] leading-[1.8]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            Verdify is a small, deliberate team building a personal green navigator for the
            Johor–Singapore corridor. This page is the profile behind the product — the
            brief, the audience, the people, the intent.
          </motion.p>
        </div>
      </section>

      <motion.section
        id="manifesto"
        {...reveal}
        className="relative overflow-hidden border-y scroll-mt-24"
        style={{
          borderColor: 'var(--theme-border)',
          background: 'var(--theme-bg-soft)',
        }}
      >
        <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <div className="grid gap-14 lg:grid-cols-[0.32fr_0.68fr]">
            <div className="space-y-4">
              <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                § Manifesto — 01
              </p>
              <div className="theme-rule" />
              <div className="flex items-center gap-3 pt-2">
                <Compass
                  className="h-5 w-5"
                  style={{ color: 'var(--theme-accent)' }}
                  strokeWidth={1.4}
                />
                <span className="theme-mono-sm" style={{ color: 'var(--theme-fg-muted)' }}>
                  what we believe
                </span>
              </div>
            </div>
            <div className="space-y-10">
              <h2 className="theme-display text-[clamp(2.2rem,5.4vw,4.6rem)] leading-[1] tracking-[-0.04em]">
                Mobility is the quiet,{' '}
                <span
                  className="theme-italic"
                  style={{ color: 'var(--theme-accent-warm)' }}
                >
                  daily
                </span>{' '}
                front of the climate problem.
              </h2>
              <div
                className="grid gap-8 text-[1.02rem] leading-[1.8] md:grid-cols-2"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                <p>
                  Climate policy moves in decades. People move in minutes. Verdify exists
                  to close that gap — to turn a national Net Zero commitment into a live,
                  usable recommendation at the moment someone is about to travel.
                </p>
                <p>
                  We think the product should be quiet. The model should do the reasoning,
                  the interface should do the restraint, and the user should just move — a
                  little greener, a little cheaper, and entirely on purpose.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <section id="brief" className="mx-auto max-w-[1440px] px-4 py-24 scroll-mt-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div
          {...reveal}
          className="mb-16 grid gap-8 lg:grid-cols-[0.32fr_0.68fr]"
        >
          <div className="space-y-4">
            <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
              § Brief — 02
            </p>
            <div className="theme-rule" />
          </div>
          <h2 className="theme-display max-w-3xl text-[clamp(2rem,4.8vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
            A product shaped by{' '}
            <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
              three
            </span>{' '}
            hard constraints.
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <motion.article
              key={p.k}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.8, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
              className="theme-card group flex flex-col gap-6 p-8"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--theme-accent-soft)',
                    border: '1px solid var(--theme-accent-muted)',
                    color: 'var(--theme-accent)',
                  }}
                >
                  <p.i className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span
                  className="theme-mono-sm"
                  style={{ color: 'var(--theme-fg-dim)' }}
                >
                  {p.k}
                </span>
              </div>
              <h3 className="theme-display text-[1.9rem] tracking-[-0.025em]">
                {p.t}
              </h3>
              <p
                className="text-[0.98rem] leading-[1.75]"
                style={{ color: 'var(--theme-fg-muted)' }}
              >
                {p.b}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <section
        id="team"
        className="relative overflow-hidden border-y scroll-mt-24"
        style={{
          borderColor: 'var(--theme-border)',
          background: 'var(--theme-bg-soft)',
        }}
      >
        <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <motion.div
            {...reveal}
            className="mb-16 grid gap-8 lg:grid-cols-[0.32fr_0.68fr]"
          >
            <div className="space-y-4">
              <p className="theme-mono-sm" style={{ color: 'var(--theme-fg-dim)' }}>
                § Team — 03
              </p>
              <div className="theme-rule" />
            </div>
            <h2 className="theme-display max-w-3xl text-[clamp(2rem,4.8vw,3.8rem)] leading-[1.04] tracking-[-0.035em]">
              A small team,{' '}
              <span className="theme-italic" style={{ color: 'var(--theme-accent)' }}>
                deliberately
              </span>{' '}
              shaped.
            </h2>
          </motion.div>

          <div className="grid gap-px overflow-hidden rounded-[14px] sm:grid-cols-2 lg:grid-cols-4"
            style={{
              background: 'var(--theme-border)',
              border: '1px solid var(--theme-border-strong)',
            }}
          >
            {team.map((m, i) => (
              <motion.div
                key={m.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.75, delay: i * 0.08 }}
                className="group relative flex aspect-[3/4] flex-col justify-between p-6 transition-colors"
                style={{ background: 'var(--theme-surface)' }}
              >
                <div
                  className="relative flex-1 overflow-hidden rounded-[10px]"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--theme-accent-soft) 0%, transparent 55%, var(--theme-bg-soft) 100%)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(60% 50% at 50% 35%, var(--theme-accent-soft), transparent 70%)',
                    }}
                  />
                  <span
                    className="absolute left-4 top-4 theme-mono-sm"
                    style={{ color: 'var(--theme-fg-dim)' }}
                  >
                    #{m.n}
                  </span>
                  <span
                    className="absolute bottom-4 right-4 theme-italic text-right"
                    style={{ color: 'var(--theme-accent)', fontSize: '0.95rem' }}
                  >
                    {m.meta}
                  </span>
                </div>
                <div className="mt-5 space-y-1">
                  <p className="theme-display text-[1.1rem] tracking-[-0.015em]">
                    {m.name}
                  </p>
                  <p
                    className="theme-mono-sm"
                    style={{ color: 'var(--theme-fg-muted)' }}
                  >
                    {m.role}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <p
            className="mt-10 max-w-xl text-[0.95rem] leading-[1.75]"
            style={{ color: 'var(--theme-fg-dim)' }}
          >
            Placeholders for now — real names and portraits land when the team is ready
            to be named.
          </p>
        </div>
      </section>

      <section id="closing" className="px-4 py-24 scroll-mt-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div
          {...reveal}
          className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[20px] px-8 py-16 sm:px-14 sm:py-20 lg:px-20 lg:py-28"
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
            className="pointer-events-none absolute -left-[20%] -top-[30%] h-[500px] w-[500px] rounded-full"
            style={{
              background:
                'radial-gradient(closest-side, var(--theme-accent-soft), transparent 70%)',
            }}
          />
          <p
            className="theme-mono-sm relative"
            style={{ color: 'var(--theme-accent)' }}
          >
            § Closing — Profile
          </p>
          <h2 className="theme-display relative mt-6 max-w-5xl text-[clamp(2.4rem,6.2vw,5.6rem)] leading-[0.96] tracking-[-0.045em]">
            A profile is a{' '}
            <Leaf
              className="inline-block -translate-y-2 rotate-[8deg]"
              style={{
                width: '0.9em',
                height: '0.9em',
                color: 'var(--theme-accent)',
              }}
              strokeWidth={1.2}
            />{' '}
            <span
              className="theme-italic"
              style={{ color: 'var(--theme-accent)' }}
            >
              promise
            </span>{' '}
            — we intend to keep it.
          </h2>
          <p
            className="relative mt-8 max-w-2xl text-[1.02rem] leading-[1.75]"
            style={{ color: 'var(--theme-fg-muted)' }}
          >
            If the product holds up, the profile held up first. If any part of this
            page stops being true, the product will change before the page does.
          </p>
          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="/" className="theme-btn-primary">
              Back to the product <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/technology" className="theme-btn-ghost">
              See the stack <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
