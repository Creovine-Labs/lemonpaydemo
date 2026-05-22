import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LemonLogo } from "@/components/LemonLogo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-200 px-8 py-5">
        <Link href="/" className="flex items-center gap-2">
          <LemonLogo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight text-neutral-900">
            Lemonpay
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="h-10 px-4 text-neutral-700 hover:bg-neutral-100"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button className="h-10 bg-neutral-900 px-4 text-white hover:bg-neutral-800">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-8 py-24">
        <div className="flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Lemonpay · Demo build
          </p>

          <h1 className="text-5xl font-semibold tracking-tight text-neutral-900 sm:text-6xl md:text-7xl">
            Banking, <span className="text-neutral-500">simplified.</span>
          </h1>

          <p className="max-w-xl text-lg text-neutral-600 sm:text-xl">
            A clean, fast neobank for Rwanda. Send, save, and spend with a card
            that fits your life — no clutter, no surprises.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 bg-neutral-900 px-6 text-white hover:bg-neutral-800"
            >
              <Link href="/signup">Create an account</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-neutral-300 bg-white px-6 text-neutral-800 hover:bg-neutral-50"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-8 py-6 text-xs text-neutral-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© Lemonpay — demo build for the Lira platform.</span>
          <span>Built in Kigali · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
