import { motion } from "framer-motion"
import { Link } from "react-router"
import { ArrowUpRight } from "lucide-react"

const notes = [
  {
    label: "Problem fit",
    value: "Verdify is designed for severe mobility congestion, transport emissions, and the April 2026 energy crunch in the Johor-Singapore corridor.",
  },
  {
    label: "AI foundation",
    value: "The project is built on Gemini, Firebase Genkit, Vertex AI Search RAG, and Google Cloud Run as its core stack.",
  },
  {
    label: "Primary users",
    value: "Cross-border workers, Iskandar residents, JS-SEZ companies, and public-sector stakeholders who need greener mobility decisions.",
  },
]

const methodology = [
  "Start from the corridor problem first — congestion, carbon emissions, and everyday mobility pressure shape the product from the beginning.",
  "Move from chat to action — Verdify is not only advisory, it is designed to calculate, book, reward, and report through agentic flows.",
  "Keep the output usable for more than one audience — the same journey should make sense to commuters, teams, and official reviewers.",
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
              An agentic AI for greener <em>corridor mobility.</em>
            </h1>

            <p className="max-w-3xl text-[1.1rem] leading-8 text-muted-foreground sm:text-[1.2rem]">
              Verdify is an Agentic AI Personal Green Navigator built for the
              Johor-Singapore Innovation Corridor. It helps users plan, calculate,
              book, and report greener journeys while contributing to Net Zero
              Emissions Malaysia 2050.
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
              The product behaves like an <em>autonomous mobility brief,</em> not a static route finder.
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
              <p className="landing-note">Fig. 04 — Corridor anchor</p>
              <p className="max-w-md text-right font-italic text-[0.95rem] leading-7 text-muted-foreground">
                corridor specificity over generic smart-city positioning
              </p>
            </figcaption>
          </figure>

          <div className="space-y-8">
            <p className="label-mono">Why this matters</p>
            <div className="space-y-5 text-[1rem] leading-8 text-muted-foreground">
              <p>
                Verdify aligns directly with Track 4: Green Horizon by addressing
                mobility optimization, corridor infrastructure pressure, and lower-carbon
                transport behavior in a strategic Malaysian region.
              </p>
              <p>
                It also supports the handbook’s technical mandate by integrating the
                Google AI ecosystem stack and demonstrating a shift from conversational
                interface to autonomous execution.
              </p>
            </div>

            <div className="border border-border/70 bg-[hsl(var(--secondary))/0.6] p-8">
              <p className="landing-note">Project promise</p>
              <p className="mt-4 font-italic text-[1.45rem] leading-[1.35] text-foreground">
                A Malaysian-built personal green navigator that helps users become
                active contributors to cleaner mobility, lower emissions, and better
                corridor planning.
              </p>
              <Link to="/" className="btn-ink mt-8">
                Return to the landing page <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  )
}
