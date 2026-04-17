import { Link } from "react-router"

const eyebrowClass = "text-[0.72rem] uppercase tracking-[0.26em] text-muted-foreground"

export default function NotFoundPage() {
  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto flex min-h-[calc(100vh-13rem)] max-w-4xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl space-y-8">
          <p className={eyebrowClass}>404</p>
          <h1 className="text-4xl leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            This page has not been filed.
          </h1>
          <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            The route is missing, but the shell remains the same. Use the home page to
            re-enter the record.
          </p>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-transparent px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
