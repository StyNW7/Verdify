'use client';

import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BookOpen,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router';

const heroStats = [
  { value: '2050', label: 'Net Zero Malaysia target translated into everyday mobility decisions' },
  { value: '3–4', label: 'green route options ranked by time, cost, and estimated CO2 output' },
  { value: '06', label: 'core product capabilities spanning routing, action, rewards, and reporting' },
];

const journeySteps = [
  {
    number: '01',
    title: 'Describe the trip in plain language.',
    body: 'The user starts with a simple prompt such as “Tomorrow morning from Bukit Indah to Woodlands North, eco mode,” and Verdify turns that request into an actionable journey brief.',
  },
  {
    number: '02',
    title: 'Ground the route with corridor context.',
    body: 'Gemini reasons through the request while Vertex AI Search RAG retrieves corridor-specific and national references such as RTS Link, JS-SEZ, and Net Zero 2050 materials.',
  },
  {
    number: '03',
    title: 'Recommend and act on the greener option.',
    body: 'Verdify compares RTS Link, LRT, e-hailing, carpool, and other combinations, then can autonomously trigger actions such as parking or EV charger booking.',
  },
  {
    number: '04',
    title: 'Return rewards and a professional report.',
    body: 'Each completed journey can end with carbon tracking, green reward points, and a PDF-ready summary of money saved, emissions reduced, and contribution toward Net Zero goals.',
  },
];

const capabilities = [
  {
    title: 'Smart Green Route Optimizer',
    detail:
      'Generates 3 to 4 recommended routes with a practical balance of travel time, commuter cost, and lower carbon emissions across the Johor-Singapore corridor.',
    note: 'Built for combinations such as RTS Link, LRT, e-hailing, carpool, and walk-transfer journeys.',
  },
  {
    title: 'Real-time Carbon Footprint Intelligence',
    detail:
      'Estimates CO2 impact per route and turns the calculation into clear, user-facing insight instead of leaving sustainability as a hidden backend number.',
    note: 'Designed to make personal carbon footprint tracking understandable in a few seconds.',
  },
  {
    title: 'Autonomous Action Engine',
    detail:
      'Moves beyond chat by handling downstream actions such as smart parking reservation, EV charger booking, and report generation through agentic flows.',
    note: 'Matches the handbook mandate to transition from chat to action.',
  },
  {
    title: 'Energy Crunch Mode',
    detail:
      'Adjusts recommendations for April 2026 conditions by preferring lower-energy and lower-cost options when fuel prices or electricity constraints make travel decisions more fragile.',
    note: 'Framed specifically for the current corridor pressure on daily mobility and energy use.',
  },
  {
    title: 'Green Reward System',
    detail:
      'Issues green points after each lower-impact journey to encourage repeat behavior and make sustainable mobility feel cumulative, visible, and rewarding.',
    note: 'Intended as a gamified incentive layer for commuters and corridor communities.',
  },
  {
    title: 'Professional Trip Report',
    detail:
      'Auto-generates a formal trip summary with journey details, carbon saved, money saved, and contribution toward Malaysia’s Net Zero 2050 agenda.',
    note: 'Useful for personal records, employer reporting, and public-sector review.',
  },
];

const proofRows = [
  {
    metric: 'Gemini',
    icon: Sparkles,
    title: 'Multi-step reasoning as the planning brain',
    body: 'Verdify uses Gemini 2.0 Flash or Pro to interpret traveler intent, compare route logic, and orchestrate explainable recommendations rather than static route lookup.',
  },
  {
    metric: 'RAG',
    icon: BookOpen,
    title: 'Grounded on corridor and national knowledge',
    body: 'Vertex AI Search RAG pulls from official mobility and policy references such as Low Carbon Mobility Blueprint, RTS Link, JS-SEZ, and Net Zero 2050 documents.',
  },
  {
    metric: 'Cloud',
    icon: Zap,
    title: 'Deployed with the Google AI ecosystem stack',
    body: 'The frontend runs on React, Vite, Tailwind, and shadcn/ui while Firebase Genkit orchestrates agentic flows and Google Cloud Run handles backend execution.',
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
};

function SplitReveal({
  text,
  className = '',
  delayBase = 0,
  stagger = 28,
  italicFrom,
}: {
  text: string;
  className?: string;
  delayBase?: number;
  stagger?: number;
  italicFrom?: number;
}) {
  const words = text.split(' ');
  let index = 0;
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => {
        const wordStart = index;
        const chars = Array.from(word);
        const node = (
          <span
            key={`w-${wi}`}
            className="inline-block whitespace-nowrap"
            style={{ marginRight: wi < words.length - 1 ? '0.28em' : 0 }}
          >
            {chars.map((c, ci) => {
              const globalIdx = wordStart + ci;
              const italic = italicFrom !== undefined && globalIdx >= italicFrom;
              return (
                <span
                  key={`${c}-${ci}`}
                  aria-hidden
                  className={`char${italic ? ' font-italic' : ''}`}
                  style={{ animationDelay: `${delayBase + globalIdx * stagger}ms` }}
                >
                  {c}
                </span>
              );
            })}
          </span>
        );
        index += word.length + 1;
        return node;
      })}
    </span>
  );
}

export default function Home() {
  return (
    <main className="aged-paper text-foreground">
      <section className="relative overflow-hidden border-b border-border/60 pt-8">
        <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-12 sm:px-6 lg:px-10 lg:pb-14">
          <div className="mb-10 flex items-start justify-between gap-6">
            <div className="max-w-xs space-y-3">
              <p className="label-mono">Agentic AI green mobility</p>
              <div className="landing-rule" />
              <p className="text-sm leading-6 text-muted-foreground">
                Verdify is a personal green navigator for the Johor-Singapore Innovation
                Corridor, designed to turn everyday trips into lower-emission action.
              </p>
            </div>
            <p className="hidden font-mono-tight text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              (scroll)
            </p>
          </div>

          <h1 className="display-xl break-words text-[clamp(3rem,9.4vw,9rem)] text-foreground">
            <span className="block">
              <SplitReveal text="Green mobility," delayBase={60} stagger={30} />
            </span>
            <span className="block pl-[4vw] text-[hsl(var(--primary))]">
              <SplitReveal
                text="planned into action."
                delayBase={460}
                stagger={26}
                italicFrom={12}
              />
            </span>
          </h1>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <figure className="relative">
              <div className="overflow-hidden rounded-sm border border-border/60">
                <img
                  src="/Images/Johor-Singapore.jpg"
                  alt="View across the Johor–Singapore corridor used as the landing field reference."
                  className="image-drift h-[22rem] w-full object-cover object-center sm:h-[30rem] lg:h-[38rem]"
                  style={{ animationDelay: '200ms' }}
                />
              </div>
              <figcaption className="mt-4 flex flex-wrap items-start justify-between gap-3 text-sm leading-6 text-muted-foreground">
                <span className="max-w-md">
                  The corridor is the real operating context for Verdify, where congestion,
                  emissions, and energy pressure need <em>practical mobility decisions</em>.
                </span>
                <span className="landing-note whitespace-nowrap">Fig. 01 — Corridor anchor</span>
              </figcaption>
            </figure>

            <motion.div {...reveal} className="flex flex-col gap-8">
              <p className="font-italic text-2xl leading-relaxed text-foreground sm:text-[1.65rem]">
                Verdify uses the Google AI ecosystem stack to <em>autonomously plan</em>,
                calculate, book, and report greener journeys for travelers in the
                Johor-Singapore corridor.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/#how-it-works" className="btn-ink">
                  See how it works <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link to="/about" className="btn-ghost">Read the summary</Link>
              </div>

              <div className="grid gap-5 border-t border-border/60 pt-6 sm:grid-cols-3">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <p className="font-display text-[2.6rem] leading-[0.9] tracking-[-0.035em] text-primary">
                      {stat.value}
                    </p>
                    <p className="text-[0.82rem] leading-6 text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="overflow-hidden border-t border-border/60 bg-[hsl(var(--secondary))/0.6] py-3">
          <div className="ticker flex whitespace-nowrap">
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0 items-center gap-14 pr-14">
                {[
                  'Johor · Singapore Innovation Corridor',
                  'Track 4 · Green Horizon',
                  'Gemini · Genkit · RAG',
                  'Chat to Action',
                  'Energy Crunch Mode',
                  'Net Zero Malaysia 2050',
                ].map((t, i) => (
                  <span key={`${k}-${i}`} className="flex items-center gap-6">
                    <span className="font-italic text-[1.35rem] tracking-tight text-foreground/85">
                      {t}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-[hsl(var(--accent))]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        {...reveal}
        id="premise"
        className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28"
      >
        <div className="grid gap-14 lg:grid-cols-[0.4fr_0.6fr]">
          <div className="space-y-4">
            <p className="label-mono">§ Premise — 01</p>
            <div className="landing-rule" />
          </div>
          <div className="space-y-10">
            <h2 className="max-w-3xl text-[clamp(2.2rem,5vw,4.2rem)] leading-[1.02] tracking-[-0.03em]">
              Johor-Singapore mobility is under pressure from congestion, emissions,
              and the April 2026 <em>energy crunch.</em>
            </h2>

            <div className="grid gap-10 text-[1.02rem] leading-8 text-muted-foreground md:grid-cols-2">
              <p>
                Causeway traffic, RTS Link pressure, and everyday movement across
                Iskandar Puteri make the corridor one of Malaysia’s most urgent
                mobility environments. Transport emissions remain high while users still
                lack simple tools for understanding their personal footprint.
              </p>
              <p>
                Verdify answers that gap with an autonomous and personal system that
                combines route planning, carbon intelligence, booking actions, rewards,
                and reporting in direct alignment with Track 4: Green Horizon.
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      <section
        id="how-it-works"
        className="border-y border-border/60 bg-[hsl(var(--secondary))/0.5]"
      >
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <motion.div {...reveal} className="mb-14 grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
            <div className="space-y-4">
              <p className="label-mono">§ Sequence — 02</p>
              <div className="landing-rule" />
            </div>
            <div className="space-y-6">
              <h2 className="max-w-2xl text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.04] tracking-[-0.028em]">
                From a short prompt to autonomous green trip <em>execution.</em>
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Verdify begins with natural user input, reasons through the trip with
                Gemini, grounds the output with Vertex AI Search RAG, and can continue
                through booking, rewards, and reporting without breaking the flow.
              </p>
            </div>
          </motion.div>

          <div className="border-t border-border/60">
            {journeySteps.map((step, index) => (
              <motion.article
                key={step.number}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.06 }}
                className="group grid gap-6 border-b border-border/60 py-10 md:grid-cols-[160px_1fr_1fr] md:gap-10"
              >
                <p className="numeral-huge self-start">{step.number}</p>
                <h3 className="self-start text-[1.8rem] leading-[1.08] tracking-[-0.02em] text-foreground">
                  {step.title}
                </h3>
                <p className="self-start text-[0.98rem] leading-8 text-muted-foreground">
                  {step.body}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="capabilities" className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <motion.div {...reveal} className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <figure className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-sm border border-border/60">
              <img
                src="/Images/Johor-Singapore.jpg"
                alt="Condensed corridor view used to support the selected capabilities section."
                className="h-80 w-full object-cover object-[center_62%] sm:h-96 lg:h-[34rem]"
              />
            </div>
            <figcaption className="flex items-start justify-between gap-3">
              <p className="landing-note">Fig. 02 — Product frame</p>
              <p className="font-italic text-sm text-muted-foreground">
                corridor-specific reasoning over generic trip planning
              </p>
            </figcaption>
          </figure>

          <div className="space-y-14">
            <div className="space-y-4">
              <p className="label-mono">§ Capabilities — 03</p>
              <div className="landing-rule" />
              <h2 className="max-w-xl text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.04] tracking-[-0.028em]">
                Six working lines for an <em>agentic green navigator.</em>
              </h2>
            </div>

            <div className="space-y-0 border-t border-border/60">
              {capabilities.map((capability, index) => (
                <motion.div
                  key={capability.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.05 }}
                  className="grid gap-5 border-b border-border/60 py-8 md:grid-cols-[130px_1fr] md:gap-8"
                >
                  <p className="landing-number self-start pt-1">
                    Line 0{index + 1}
                  </p>
                  <div className="space-y-4">
                    <h3 className="text-[1.5rem] leading-[1.18] tracking-[-0.02em] text-foreground">
                      {capability.title}
                    </h3>
                    <p className="text-[0.98rem] leading-8 text-muted-foreground">
                      {capability.detail}
                    </p>
                    <p className="font-italic text-[1rem] leading-7 text-[hsl(var(--accent))]">
                      — {capability.note}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section id="proof" className="border-y border-border/60 bg-[hsl(var(--secondary))/0.5]">
        <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <motion.div {...reveal} className="mb-14 grid gap-8 lg:grid-cols-[0.4fr_0.6fr]">
            <div className="space-y-4">
              <p className="label-mono">§ Evidence — 04</p>
              <div className="landing-rule" />
            </div>
            <div className="space-y-6">
              <h2 className="max-w-2xl text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.04] tracking-[-0.028em]">
                The stack is grounded, deployable, and matched to the <em>brief.</em>
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Verdify is built around the Google AI ecosystem stack specified by the
                handbook and explicitly addresses the technical requirement to move from
                chat toward autonomous execution.
              </p>
            </div>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.figure {...reveal} className="space-y-5">
              <div className="overflow-hidden rounded-sm border border-border/60">
                <img
                  src="/Images/Johor-Singapore.jpg"
                  alt="Field reference for the impact section, the Johor–Singapore corridor."
                  className="h-80 w-full object-cover object-[center_68%] sm:h-[26rem] lg:h-[34rem]"
                />
              </div>
              <figcaption className="flex items-start justify-between gap-3 border-t border-border/60 pt-4">
                <p className="landing-note">Fig. 03 — Corridor evidence</p>
                <p className="max-w-md text-right font-italic text-[0.98rem] leading-7 text-muted-foreground">
                  the project stays tied to a real Malaysian corridor, not an abstract demo
                </p>
              </figcaption>
            </motion.figure>

            <div className="border-t border-border/60">
              {proofRows.map((row, index) => (
                <motion.div
                  key={row.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.05 }}
                  className="grid items-start gap-6 border-b border-border/60 py-10 md:grid-cols-[2fr_3fr] md:gap-10"
                >
                  <p
                    className="display-xl overflow-hidden text-[clamp(3rem,5.5vw,5.5rem)] text-[hsl(var(--primary))]"
                  >
                    {row.metric}
                  </p>
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2.5 text-[1.3rem] leading-[1.2] tracking-[-0.02em] text-foreground">
                      <row.icon className="h-[1rem] w-[1rem] shrink-0 text-[hsl(var(--accent))]" strokeWidth={1.5} />
                      {row.title}
                    </h3>
                    <p className="text-[0.95rem] leading-7 text-muted-foreground">
                      {row.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
        <motion.div {...reveal} className="relative">
          <p className="label-mono">§ Closing</p>
          <div className="mt-4 landing-rule" />

          <h2 className="mt-10 max-w-5xl text-[clamp(2.4rem,6vw,5.5rem)] leading-[0.98] tracking-[-0.035em]">
            Built for commuters, institutions, and reviewers who need green mobility
            to end in <em>action.</em>
          </h2>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-2xl text-[1.05rem] leading-8 text-muted-foreground">
              Verdify is aimed at cross-border workers, Iskandar Malaysia residents,
              JS-SEZ companies, and public agencies that need lower congestion, lower
              emissions, stronger carbon awareness, and usable green mobility data for
              Net Zero Malaysia 2050.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/#capabilities" className="btn-ink">
                Review capabilities <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-ghost">View project context</Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
