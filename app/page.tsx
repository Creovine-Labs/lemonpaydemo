import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-2xl flex-col items-center gap-10 text-center">
        <LemonLogo />

        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-semibold tracking-tight text-neutral-50 sm:text-6xl">
            Banking, with a <span className="text-yellow-300">fresh twist.</span>
          </h1>
          <p className="text-lg text-neutral-400 sm:text-xl">
            A mobile-first neobank built for Rwanda. Send, save, and spend with
            a card that fits your life.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-11 bg-yellow-300 px-6 text-neutral-950 hover:bg-yellow-200"
          >
            <Link href="/signup">Create an account</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 border-neutral-700 bg-transparent px-6 text-neutral-100 hover:bg-neutral-900 hover:text-neutral-50"
          >
            <Link href="/login">Sign in</Link>
          </Button>
        </div>

        <p className="text-xs uppercase tracking-widest text-neutral-600">
          Demo build · Phase 0
        </p>
      </div>
    </main>
  );
}

function LemonLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 40 40"
        className="h-10 w-10"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="18" fill="#FDE047" />
        <path
          d="M20 6 L20 34 M6 20 L34 20 M10 10 L30 30 M30 10 L10 30"
          stroke="#1F2937"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />
      </svg>
      <span className="text-xl font-semibold tracking-tight">Lemonpay</span>
    </div>
  );
}
