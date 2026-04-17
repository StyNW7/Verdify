'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';

const heroStats = [
  { value: '85%', label: 'lower trip emissions on the illustrated corridor' },
  { value: '04', label: 'calm planning steps, prompt through reporting' },
  { value: '01', label: 'shared record — travelers, teams, operators' },
];

const journeySteps = [
  {
    number: '01',
    title: 'Name the trip, not the transport.',
    body: 'A traveler begins with timing, purpose, and comfort. Verdify translates intent into a working brief — never asking them to compare tabs.',
  },
  {
    number: '02',
    title: 'Read the corridor in context.',
    body: 'Routing weighs transfers, energy mix, likely delays, and walkability together so the recommendation feels practical, not virtuous.',
  },
  {
    number: '03',
    title: 'Book the quieter option.',
    body: 'Once a route is chosen, the service handles the handoff to booking and preserves the decision trail for later review.',
  },
  {
    number: '04',
    title: 'Report what changed.',
    body: 'Every journey ends with a plain-language account of time, mode choice, and avoided emissions — ready for personal logs or team reporting.',
  },
];

const capabilities = [
  {
    title: 'Route editing with environmental context',
    detail:
      'Alternatives are compared as an editor compares drafts — what improves, what it costs, what becomes more resilient if conditions shift.',
    note: 'Best when the trip has more than one acceptable pace or budget.',
  },
  {
    title: 'Booking without losing the rationale',
    detail:
      'The platform keeps the reason behind a choice attached to the booking flow, so sustainability reporting is not reconstructed after the fact.',
    note: 'Useful for travel teams that need an audit trail, not just a receipt.',
  },
  {
    title: 'Readable proof for individuals and institutions',
    detail:
      'Impact summaries stay concise enough for a traveler to understand and structured enough for a manager to reuse in broader reporting.',
    note: 'Designed for campaign pages, ops reviews, and monthly sustainability recaps.',
  },
];

const proofRows = [
  {
    metric: '62%',
    title: 'projected emissions reduction',
    body: 'when travelers choose the calmer mixed-mode route over default car-first patterns on the corridor shown above.',
  },
  {
    metric: '03',
    title: 'one trip, three readable records',
    body: 'a traveler summary, a booking rationale, and a reporting layer that stays usable beyond the moment of purchase.',
  },
  {
    metric: '01',
    title: 'corridor, kept specific on purpose',
    body: 'the story stays anchored in a concrete geography so the page demonstrates judgment, not generic sustainability language.',
  },
];

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
};

// Character-by-character blur reveal — words stay intact, lines break cleanly
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
              <p className="label-mono">A quieter way to move</p>
              <div className="landing-rule" />
              <p className="text-sm leading-6 text-muted-foreground">
                A field-report on travel, composed like an editorial decision —
                anchored in one legible corridor.
              </p>
            </div>
            <p className="hidden font-mono-tight text-[0.7rem] uppercase tracking-[0.24em] text-muted-foreground sm:block">
              (scroll)
            </p>
          </div>

          <h1 className="display-xl break-words text-[clamp(3rem,9.4vw,9rem)] text-foreground">
            <span className="block">
              <SplitReveal text="Slow travel," delayBase={60} stagger={30} />
            </span>
            <span className="block pl-[4vw] text-[hsl(var(--primary))]">
              <SplitReveal
                text="composed with care."
                delayBase={460}
                stagger={26}
                italicFrom={10}
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
                  A single photograph carries the main claim — better routing should stay
                  tied to <em>lived geography</em>, never abstract dashboards.
                </span>
                <span className="landing-note whitespace-nowrap">Fig. 01 — Deliberate crop</span>
              </figcaption>
            </figure>

            <motion.div {...reveal} className="flex flex-col gap-8">
              <p className="font-italic text-2xl leading-relaxed text-foreground sm:text-[1.65rem]">
                Verdify reframes trip planning as a <em>calm sequence</em>: read the route,
                weigh the footprint, book the better option, and leave with proof the choice
                mattered.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/#how-it-works" className="btn-ink">
                  Read the sequence <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link to="/about" className="btn-ghost">Review the premise</Link>
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
                  'Johor · Singapore corridor',
                  'Rail before road',
                  'Reporting that reads',
                  'A calmer cadence',
                  'Verdified routes',
                  'June 2026 · pilot journey',
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
              Most sustainable travel tools still ask people to{' '}
              <em>behave like analysts.</em>
            </h2>

            <div className="grid gap-10 text-[1.02rem] leading-8 text-muted-foreground md:grid-cols-2">
              <p>
                Verdify moves in the opposite direction. The traveler describes the
                journey, and the system reads transport options, transfer risk, and
                carbon implications as a single editorial brief.
              </p>
              <p>
                That shift matters because sustainable travel fails when the greener
                option feels harder to understand. The page now says less, shows more,
                and lets the sequence do the persuasion.
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
                A measured sequence, built to keep the traveler <em>oriented.</em>
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                Each row handles one decision — state the trip, compare the route,
                confirm the booking, keep the evidence. No icon wall, no parallel
                claims competing for attention.
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
              <p className="landing-note">Fig. 02 — Decision frame</p>
              <p className="font-italic text-sm text-muted-foreground">
                tighter crop, shifting from place to intent
              </p>
            </figcaption>
          </figure>

          <div className="space-y-14">
            <div className="space-y-4">
              <p className="label-mono">§ Capabilities — 03</p>
              <div className="landing-rule" />
              <h2 className="max-w-xl text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.04] tracking-[-0.028em]">
                Shown as <em>working lines,</em> not a gallery of features.
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
                Evidence should feel <em>human-scale</em> before it feels institutional.
              </h2>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                A few grounded figures. Plain notes about what the corridor
                demonstrates, and why the product is believable in this setting.
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
                <p className="landing-note">Fig. 03 — Proof image</p>
                <p className="max-w-md text-right font-italic text-[0.98rem] leading-7 text-muted-foreground">
                  trust begins with place, not with a system diagram
                </p>
              </figcaption>
            </motion.figure>

            <div className="border-t border-border/60">
              {proofRows.map((row, index) => (
                <motion.div
                  key={row.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: index * 0.05 }}
                  className="grid gap-4 border-b border-border/60 py-8 md:grid-cols-[220px_1fr] md:gap-10"
                >
                  <p className="numeral-huge self-start whitespace-nowrap text-[clamp(3rem,6vw,5rem)]">
                    {row.metric}
                  </p>
                  <div className="space-y-3">
                    <h3 className="text-[1.3rem] leading-[1.2] tracking-[-0.02em] text-foreground">
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
            Begin with one corridor, one <em>real</em> trip, and one proof trail
            worth keeping.
          </h2>

          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-2xl text-[1.05rem] leading-8 text-muted-foreground">
              Verdify is strongest when the route is specific and the reporting
              needs to stay readable. Begin with a pilot journey, then decide how
              far the system should scale across teams or recurring travel.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/#capabilities" className="btn-ink">
                Review capabilities <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-ghost">Read more</Link>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
