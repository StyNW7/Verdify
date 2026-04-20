'use client';

import { motion, useScroll, useSpring, useTransform, useMotionValueEvent } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Database,
  Workflow,
  Cloud,
  LayoutDashboard,
  Network,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';

type Chapter = {
  n: string;
  label: string;
  title: string;
  italic: string;
  after: string;
  body: string;
  meta: Array<{ k: string; v: string }>;
  tag: string;
  i: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  img: string;
  brand: string;
  partnerCopy: string;
};

const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&auto=format&fit=crop&q=80`;

const chapters: Chapter[] = [
  {
    n: '01',
    label: 'Reasoning',
    title: 'Gemini 2.0 is the',
    italic: 'planning brain',
    after: 'of Verdify.',
    body: 'Intent parsing, multi-step comparison, and explainable recommendations — Gemini 2.0 Flash and Pro interpret a short prompt and orchestrate a ranked set of corridor routes in seconds.',
    meta: [
      { k: 'Model', v: 'Gemini 2.0 · Flash · Pro' },
      { k: 'Role', v: 'Orchestrator' },
      { k: 'Latency', v: '~1.2s first token' },
    ],
    tag: 'model · orchestrator',
    i: Sparkles,
    img: UNSPLASH('photo-1677442136019-21780ecad995'),
    brand: 'Gemini 2.0',
    partnerCopy:
      'We plan on Google\u2019s most capable multimodal models — reasoning over a corridor prompt in under a second, returning ranked routes with their rationale intact.',
  },
  {
    n: '02',
    label: 'Grounding',
    title: 'Vertex AI Search,',
    italic: 'grounded',
    after: 'on the corridor.',
    body: 'Retrieval over the Low Carbon Mobility Blueprint, RTS Link references, JS-SEZ documents, and Net Zero Malaysia 2050 sources — every recommendation cites its evidence.',
    meta: [
      { k: 'Index', v: 'Vertex AI Search' },
      { k: 'Corpus', v: 'LCMB · RTS · JS-SEZ · NZ2050' },
      { k: 'Pattern', v: 'RAG · citation-first' },
    ],
    tag: 'rag · grounded',
    i: Database,
    img: UNSPLASH('photo-1507842217343-583bb7270b66'),
    brand: 'Vertex AI Search',
    partnerCopy:
      'Every answer is grounded in Vertex AI Search across official corridor sources — so guidance cites its evidence instead of leaning on a guess.',
  },
  {
    n: '03',
    label: 'Agentic',
    title: 'Firebase Genkit runs the',
    italic: 'agentic flows',
    after: 'end to end.',
    body: 'Parking, EV charging, report generation, and booking are dispatched as first-class tool calls inside a Genkit agent graph — tracable, retryable, and observable.',
    meta: [
      { k: 'Runtime', v: 'Firebase Genkit' },
      { k: 'Shape', v: 'Tool-calling graph' },
      { k: 'Ops', v: 'Tracing · retries · eval' },
    ],
    tag: 'agent · tool-calls',
    i: Workflow,
    img: UNSPLASH('photo-1451187580459-43490279c0fa'),
    brand: 'Firebase Genkit',
    partnerCopy:
      'Firebase Genkit orchestrates parking, charging, reporting, and booking as first-class tool calls — traceable end-to-end, retryable by design.',
  },
  {
    n: '04',
    label: 'Execution',
    title: 'Cloud Run handles the',
    italic: 'backend',
    after: 'at corridor scale.',
    body: 'Containerised services for route planning, carbon accounting, and report rendering — autoscaled, regionally close to the corridor, and priced to the request.',
    meta: [
      { k: 'Compute', v: 'Cloud Run · asia-southeast' },
      { k: 'Pattern', v: 'HTTP · autoscale' },
      { k: 'Adjacent', v: 'Firestore · Storage' },
    ],
    tag: 'backend · cloud run',
    i: Cloud,
    img: UNSPLASH('photo-1544197150-b99a580bb7a8'),
    brand: 'Cloud Run',
    partnerCopy:
      'Cloud Run keeps the backend regional to the corridor, autoscaled to load, and priced to the request — so peak-hour planning stays honest on latency.',
  },
  {
    n: '05',
    label: 'Surface',
    title: 'A frontend built with',
    italic: 'React · Vite · shadcn',
    after: '— tuned for restraint.',
    body: 'React with Vite for build speed, Tailwind for the design system, and shadcn/ui for primitives — a quiet, deliberate surface that keeps the reasoning visible.',
    meta: [
      { k: 'Framework', v: 'React · Vite' },
      { k: 'Style', v: 'Tailwind · shadcn/ui' },
      { k: 'Motion', v: 'Framer Motion' },
    ],
    tag: 'frontend · surface',
    i: LayoutDashboard,
    img: UNSPLASH('photo-1517180102446-f3ece451e9d8'),
    brand: 'React · Vite · shadcn',
    partnerCopy:
      'React, Vite, Tailwind, and shadcn/ui form a quiet surface tuned for reasoning — less interface, more evidence, motion held in reserve.',
  },
  {
    n: '06',
    label: 'Infrastructure',
    title: 'Supporting',
    italic: 'infrastructure',
    after: 'keeps the corridor live.',
    body: 'Google Maps Platform for routing primitives, live emissions and energy feeds for carbon accounting, and Firebase Auth for a frictionless session — quietly holding the experience together.',
    meta: [
      { k: 'Maps', v: 'Google Maps Platform' },
      { k: 'Data', v: 'Emissions · energy feeds' },
      { k: 'Auth', v: 'Firebase Auth' },
    ],
    tag: 'infra · foundations',
    i: Network,
    img: UNSPLASH('photo-1496568816309-51d7c20e3b21'),
    brand: 'Google Maps Platform',
    partnerCopy:
      'Google Maps Platform for routing primitives, live emissions and energy feeds for carbon accounting, Firebase Auth for a frictionless session — quietly holding the corridor together.',
  },
];

function SplitHeading({ text, italic, after }: { text: string; italic: string; after: string }) {
  return (
    <h2 className="landing-display text-[clamp(2.4rem,6vw,5.6rem)] leading-[0.98] tracking-[-0.045em]">
      <span className="tech-words">
        {text.split(' ').map((w, i, arr) => (
          <span key={`a-${i}`} className="tech-word">
            <span>{w}</span>
            {i < arr.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>{' '}
      <span className="tech-words">
        <span className="tech-word">
          <span className="landing-italic" style={{ color: 'var(--landing-accent)' }}>{italic}</span>
        </span>
      </span>{' '}
      <span className="tech-words">
        {after.split(' ').map((w, i, arr) => (
          <span key={`b-${i}`} className="tech-word">
            <span>{w}</span>
            {i < arr.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </h2>
  );
}

export default function TechnologyPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.3 });
  const progressWidth = useTransform(progress, (v) => `${v * 100}%`);

  const [active, setActive] = useState(0);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  const partnersRef = useRef<HTMLDivElement>(null);
  const [activePartner, setActivePartner] = useState(0);
  const { scrollYProgress: partnersProgress } = useScroll({
    target: partnersRef,
    offset: ['start start', 'end end'],
  });
  useMotionValueEvent(partnersProgress, 'change', (v) => {
    const clamped = Math.max(0, Math.min(0.9999, v));
    const idx = Math.min(chapters.length - 1, Math.floor(clamped * chapters.length));
    setActivePartner(idx);
  });

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sectionRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="landing-theme landing-root relative min-h-svh">
      <div className="landing-grain" aria-hidden />

      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-40 h-[2px] origin-left"
        style={{ background: 'var(--landing-accent)', scaleX: progress, transformOrigin: '0 0' }}
      />

      <section className="relative overflow-hidden">
        <div className="landing-mesh" aria-hidden />
        <div className="relative mx-auto max-w-[1440px] px-4 pt-32 pb-20 sm:px-6 lg:px-10 lg:pt-40 lg:pb-28">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="landing-accent-dot" />
              <span className="landing-mono-sm" style={{ color: 'var(--landing-text-muted)' }}>
                The stack · six chapters
              </span>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="landing-chip">Google AI ecosystem</span>
              <span
                className="landing-chip"
                style={{ color: 'var(--landing-accent)', borderColor: 'var(--landing-accent-muted)' }}
              >
                Production-grade
              </span>
            </div>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[0.62fr_0.38fr] lg:items-end">
            <h1 className="landing-hero">
              <span className="block">Grounded.</span>
              <span className="block">
                <span className="landing-italic" style={{ color: 'var(--landing-accent)' }}>Deployable.</span>
              </span>
              <span className="block">Matched to the brief.</span>
            </h1>
            <div className="space-y-6">
              <p className="text-[1.02rem] leading-[1.75]" style={{ color: 'var(--landing-text-muted)' }}>
                Every layer of Verdify is a deliberate pick from the Google AI stack — assembled to reason, ground, act, and report on the Johor–Singapore corridor.
              </p>
              <div className="landing-rule" />
              <div className="grid grid-cols-3 gap-6">
                {[
                  { k: '06', v: 'chapters' },
                  { k: 'RAG', v: 'grounded' },
                  { k: 'SEA', v: 'deployed' },
                ].map((s) => (
                  <div key={s.v}>
                    <p className="landing-display text-[1.6rem] tracking-[-0.03em]">{s.k}</p>
                    <p className="mt-1 landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
                      {s.v}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div
        className="sticky top-[4.5rem] z-20 border-y backdrop-blur"
        style={{
          borderColor: 'var(--landing-border)',
          background: 'var(--landing-ticker-bg)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        }}
      >
        <div className="relative mx-auto flex max-w-[1440px] items-center gap-6 overflow-x-auto px-4 py-3 sm:px-6 lg:px-10">
          <span className="shrink-0 landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
            § Chapter {chapters[active].n}
          </span>
          <div
            aria-hidden
            className="h-[10px] w-px shrink-0"
            style={{ background: 'var(--landing-border-strong)' }}
          />
          <div className="flex items-center gap-5 whitespace-nowrap">
            {chapters.map((c, i) => (
              <a
                key={c.n}
                href={`#chap-${c.n}`}
                className="landing-mono-sm transition-colors"
                style={{
                  color: i === active ? 'var(--landing-accent)' : 'var(--landing-text-dim)',
                }}
              >
                {c.n} · {c.label}
              </a>
            ))}
          </div>
          <motion.div
            aria-hidden
            className="ml-auto h-[3px] min-w-[80px] max-w-[160px] shrink-0 rounded-full"
            style={{ background: 'var(--landing-border-strong)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--landing-accent)', width: progressWidth }}
            />
          </motion.div>
        </div>
      </div>

      {chapters.map((c, idx) => (
        <section
          key={c.n}
          id={`chap-${c.n}`}
          ref={(el) => {
            sectionRefs.current[idx] = el;
          }}
          data-idx={idx}
          className="relative overflow-hidden border-b"
          style={{
            borderColor: 'var(--landing-border)',
            background: idx % 2 === 1 ? 'var(--landing-bg-soft)' : 'transparent',
          }}
        >
          <div className="relative mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-10 lg:py-40">
            <div className="grid gap-14 lg:grid-cols-[0.28fr_0.72fr]">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{
                      background: 'var(--landing-accent-soft)',
                      border: '1px solid var(--landing-accent-muted)',
                      color: 'var(--landing-accent)',
                    }}
                  >
                    <c.i className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
                    § {c.n} — {c.label}
                  </span>
                </div>

                <div>
                  <p
                    className="landing-display leading-[0.9] tracking-[-0.05em]"
                    style={{ fontSize: 'clamp(6rem, 12vw, 14rem)', color: 'var(--landing-text)' }}
                  >
                    {c.n}
                  </p>
                  <p
                    className="mt-1 landing-italic"
                    style={{
                      fontSize: 'clamp(1rem, 1.2vw, 1.15rem)',
                      color: 'var(--landing-accent)',
                    }}
                  >
                    {c.tag}
                  </p>
                </div>

                <div className="landing-rule" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.95, ease: [0.2, 0.7, 0.2, 1] }}
                className="space-y-12"
              >
                <SplitHeading text={c.title} italic={c.italic} after={c.after} />

                <p
                  className="max-w-2xl text-[1.05rem] leading-[1.8]"
                  style={{ color: 'var(--landing-text-muted)' }}
                >
                  {c.body}
                </p>

                <div
                  className="grid gap-px overflow-hidden rounded-[14px] sm:grid-cols-3"
                  style={{
                    background: 'var(--landing-border)',
                    border: '1px solid var(--landing-border-strong)',
                  }}
                >
                  {c.meta.map((m) => (
                    <div
                      key={m.k}
                      className="p-5"
                      style={{ background: 'var(--landing-surface)' }}
                    >
                      <p className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
                        {m.k}
                      </p>
                      <p
                        className="mt-2 landing-display text-[1.1rem] tracking-[-0.01em]"
                        style={{ color: 'var(--landing-text)' }}
                      >
                        {m.v}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
                    {idx < chapters.length - 1
                      ? `Next · ${chapters[idx + 1].label}`
                      : 'End of chapters'}
                  </span>
                  <ArrowRight
                    className="h-4 w-4"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      <section className="relative">
        <div className="mx-auto max-w-[1440px] px-4 pt-28 pb-14 sm:px-6 lg:px-10 lg:pt-44 lg:pb-20">
          <div className="mb-10 flex items-center gap-3">
            <span className="landing-accent-dot" />
            <span className="landing-mono-sm" style={{ color: 'var(--landing-text-dim)' }}>
              § Ecosystem — partners
            </span>
          </div>
          <h2 className="landing-display max-w-[22ch] text-[clamp(2.4rem,6.2vw,6rem)] leading-[0.98] tracking-[-0.045em]">
            With a stack like this, there&rsquo;s{' '}
            <span className="landing-italic" style={{ color: 'var(--landing-accent)' }}>
              nowhere
            </span>{' '}
            to go but forward.
          </h2>
        </div>

        <div
          ref={partnersRef}
          className="relative"
          style={{ height: `${chapters.length * 100}vh` }}
        >
          <div className="sticky top-0 flex h-screen items-center">
            <div className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.22fr_0.46fr_0.32fr] lg:gap-14 lg:px-10">
              <div className="order-2 lg:order-1">
                <div className="mb-6 flex items-baseline gap-2">
                  <span
                    className="landing-display text-[1.35rem] tracking-[-0.02em]"
                    style={{ color: 'var(--landing-accent)' }}
                  >
                    {chapters[activePartner].n}
                  </span>
                  <span
                    className="landing-mono-sm"
                    style={{ color: 'var(--landing-text-dim)' }}
                  >
                    / {String(chapters.length).padStart(2, '0')}
                  </span>
                </div>
                <div className="relative flex gap-5">
                  <div
                    aria-hidden
                    className="relative w-px shrink-0"
                    style={{ background: 'var(--landing-border)' }}
                  >
                    <motion.div
                      className="absolute left-0 top-0 w-px origin-top"
                      style={{
                        background: 'var(--landing-accent)',
                        height: '100%',
                        scaleY: partnersProgress,
                        boxShadow: '0 0 10px var(--landing-accent-muted)',
                      }}
                    />
                  </div>
                  <ul className="flex flex-1 flex-col gap-5 lg:gap-7">
                    {chapters.map((c, i) => {
                      const on = i === activePartner;
                      return (
                        <li key={c.n} className="flex items-center gap-4">
                          <motion.span
                            animate={{ scale: on ? 1 : 0, opacity: on ? 1 : 0 }}
                            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
                            className="h-[7px] w-[7px] shrink-0 rounded-full"
                            style={{
                              background: 'var(--landing-accent)',
                              boxShadow: '0 0 0 4px var(--landing-accent-soft)',
                            }}
                          />
                          <motion.span
                            animate={{
                              x: on ? 0 : -14,
                              opacity: on ? 1 : 0.42,
                            }}
                            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                            className="landing-display text-[1.4rem] tracking-[-0.02em] sm:text-[1.55rem]"
                            style={{ color: on ? 'var(--landing-text)' : 'var(--landing-text-dim)' }}
                          >
                            {c.label}
                          </motion.span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              <div
                className="relative order-1 aspect-[4/5] w-full max-w-[520px] justify-self-center overflow-hidden rounded-[20px] lg:order-2"
                style={{ border: '1px solid var(--landing-border-strong)' }}
              >
                {chapters.map((c, i) => (
                  <motion.img
                    key={c.n}
                    src={c.img}
                    alt={c.label}
                    loading="lazy"
                    initial={false}
                    animate={{
                      opacity: i === activePartner ? 1 : 0,
                      scale: i === activePartner ? 1 : 1.06,
                    }}
                    transition={{ duration: 0.85, ease: [0.2, 0.7, 0.2, 1] }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ))}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, transparent 55%, rgba(10,14,12,0.22))',
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full px-3 py-1.5"
                  style={{
                    background: 'rgba(10, 14, 12, 0.55)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid var(--landing-accent-muted)',
                  }}
                >
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{
                      background: 'var(--landing-accent)',
                      boxShadow: '0 0 8px var(--landing-accent)',
                    }}
                  />
                  <span
                    className="landing-mono-sm"
                    style={{ color: '#ECEFE9' }}
                  >
                    § {chapters[activePartner].n} — {chapters[activePartner].label}
                  </span>
                </div>
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-5 bottom-4 flex items-center justify-between"
                >
                  <span
                    className="landing-italic text-[0.95rem]"
                    style={{ color: 'var(--landing-accent)', textShadow: '0 1px 10px rgba(10,14,12,0.55)' }}
                  >
                    {chapters[activePartner].tag}
                  </span>
                  <span
                    className="landing-mono-sm"
                    style={{ color: '#ECEFE9', opacity: 0.8 }}
                  >
                    {chapters[activePartner].n} / {String(chapters.length).padStart(2, '0')}
                  </span>
                </div>
              </div>

              <div className="relative order-3 min-h-[220px] lg:min-h-[280px]">
                {chapters.map((c, i) => (
                  <motion.div
                    key={c.n}
                    initial={false}
                    animate={{
                      opacity: i === activePartner ? 1 : 0,
                      y: i === activePartner ? 0 : 14,
                    }}
                    transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
                    className="absolute inset-0"
                    style={{ pointerEvents: i === activePartner ? 'auto' : 'none' }}
                  >
                    <p
                      className="max-w-[38ch] text-[1.02rem] leading-[1.75]"
                      style={{ color: 'var(--landing-text-muted)' }}
                    >
                      {c.partnerCopy}
                    </p>
                    <button
                      type="button"
                      className="landing-display group mt-10 inline-flex items-center gap-3 rounded-full px-6 py-3 text-[1rem] tracking-[-0.01em] transition-colors hover:bg-[var(--landing-accent-soft)]"
                      style={{
                        border: '1px solid var(--landing-accent-muted)',
                        color: 'var(--landing-text)',
                        background: 'transparent',
                      }}
                    >
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{
                          background: 'var(--landing-accent)',
                          boxShadow: '0 0 0 3px var(--landing-accent-soft)',
                        }}
                      />
                      {c.brand}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }}
          className="relative mx-auto max-w-[1440px] overflow-hidden rounded-[20px] px-8 py-16 sm:px-14 sm:py-20 lg:px-20 lg:py-28"
          style={{
            background: 'var(--landing-cta-bg)',
            border: '1px solid var(--landing-border-strong)',
            boxShadow: 'var(--landing-cta-shadow)',
            backdropFilter: 'blur(26px) saturate(170%)',
            WebkitBackdropFilter: 'blur(26px) saturate(170%)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-[20%] -top-[30%] h-[500px] w-[500px] rounded-full"
            style={{ background: 'radial-gradient(closest-side, var(--landing-accent-soft), transparent 70%)' }}
          />
          <p className="landing-mono-sm relative" style={{ color: 'var(--landing-accent)' }}>
            § Closing — Stack
          </p>
          <h2 className="landing-display relative mt-6 max-w-4xl text-[clamp(2.2rem,5.4vw,5rem)] leading-[0.98] tracking-[-0.045em]">
            A stack built to be{' '}
            <span className="landing-italic" style={{ color: 'var(--landing-accent)' }}>shipped,</span>{' '}
            not to be rehearsed.
          </h2>
          <p
            className="relative mt-8 max-w-2xl text-[1.02rem] leading-[1.75]"
            style={{ color: 'var(--landing-text-muted)' }}
          >
            Each layer has been picked for how it behaves in production — latency, cost, observability, and its ability to keep a corridor-grade experience honest.
          </p>
          <div className="relative mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="/" className="landing-btn-primary">
              Back to the product <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/about" className="landing-btn-ghost">
              Read the profile <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
