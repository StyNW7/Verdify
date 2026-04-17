import { motion } from "framer-motion"
import { Link } from "react-router"
import { ArrowUpRight } from "lucide-react"

const notes = [
  {
    label: "Position",
    value: "Verdify treats sustainable travel as an editorial decision, never a compliance dashboard.",
  },
  {
    label: "Primary use",
    value: "Guide travelers toward lower-impact routes while keeping the trade-offs legible.",
  },
  {
    label: "Tone",
    value: "Calm, factual, specific enough to trust without needing decoration.",
  },
]

const methodology = [
  "Read the corridor first — the page starts from place, timing, and friction rather than abstract efficiency.",
  "Keep the recommendation explainable — every choice should survive a quick review by a traveler, a lead, or an operator.",
  "Let the record remain reusable — the outcome works as booking cue, trip note, and reporting artifact.",
]

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] as [number, number, number, number] },
}

export default function AboutPage() {
  return (
    <main className="aged-paper text-foreground">
      <section className="mx-auto max-w-[1400px] px-4 pt-24 pb-16 sm:px-6 md:pt-32 md:pb-20 lg:px-10 lg:pt-36 lg:pb-28">
        <motion.div {...reveal} className="grid gap-14 lg:grid-cols-[0.4fr_0.6fr]">
          <div className="space-y-4">
            <p className="label-mono">Project context</p>
            <div className="landing-rule" />
          </div>

          <div className="space-y-10">
            <h1 className="display-xl text-[clamp(2.8rem,7.5vw,6.6rem)]">
              A field report on better <em>travel decisions.</em>
            </h1>

            <p className="max-w-3xl text-[1.1rem] leading-8 text-muted-foreground sm:text-[1.2rem]">
              The page is intentionally spare. It explains what Verdify does, why the
              product is framed as a corridor-level brief, and how the interface keeps
              environmental context attached to the decision itself.
            </p>

            <div className="grid gap-6 border-t border-border/60 pt-8 sm:grid-cols-3">
              {notes.map((note) => (
                <div key={note.label} className="space-y-3">
                  <p className="landing-note">{note.label}</p>
                  <p className="text-[0.95rem] leading-7 text-foreground/85">
                    {note.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.08 }}
          className="mt-24 grid gap-12 border-y border-border/60 py-16 lg:grid-cols-[0.4fr_0.6fr]"
        >
          <div className="space-y-4">
            <p className="label-mono">§ Method</p>
            <h2 className="max-w-sm text-[clamp(1.8rem,3.6vw,3rem)] leading-[1.04] tracking-[-0.025em]">
              The interface reads like an <em>annotated brief,</em> not a founder profile.
            </h2>
          </div>
          <div className="grid gap-8 text-[1rem] leading-8 text-muted-foreground sm:grid-cols-3">
            {methodology.map((item, index) => (
              <article key={item} className="space-y-4">
                <p className="numeral-huge text-[clamp(3rem,5vw,4rem)]">0{index + 1}</p>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </motion.div>

        <motion.section
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.12 }}
          className="mt-24 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <figure className="space-y-4">
            <div className="overflow-hidden rounded-sm border border-border/60">
              <img
                src="/Images/Johor-Singapore.jpg"
                alt="A corridor photograph used as visual anchor for Verdify's editorial framing."
                className="h-80 w-full object-cover object-center sm:h-[34rem]"
              />
            </div>
            <figcaption className="flex items-start justify-between gap-3 border-t border-border/60 pt-4">
              <p className="landing-note">Fig. 04 — Visual anchor</p>
              <p className="max-w-md text-right font-italic text-[0.95rem] leading-7 text-muted-foreground">
                place-specific imagery over generic SaaS language
              </p>
            </figcaption>
          </figure>

          <div className="space-y-8">
            <p className="label-mono">What this page leaves out</p>
            <div className="space-y-5 text-[1rem] leading-8 text-muted-foreground">
              <p>
                No creator biography. No template confession. No social links
                competing with the product story.
              </p>
              <p>
                The only claim here is that Verdify helps people choose the lower-impact
                option without making them work through a dashboard first.
              </p>
            </div>

            <div className="border border-border/70 bg-[hsl(var(--secondary))/0.6] p-8">
              <p className="landing-note">Use case</p>
              <p className="mt-4 font-italic text-[1.45rem] leading-[1.35] text-foreground">
                For travelers, teams, and reviewers who need the reason for a route
                to stay attached to the route itself.
              </p>
              <Link to="/" className="btn-ink mt-8">
                Return to the field report <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  )
}
