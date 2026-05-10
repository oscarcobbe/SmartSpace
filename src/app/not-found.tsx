import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-24 text-center bg-cream">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-700 mb-4">
        404
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-ink tracking-[-0.03em] mb-3">
        Page not found
      </h1>
      <p className="text-ink-soft text-base max-w-md mb-8">
        The page you were looking for has moved or no longer exists.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-brand-700 hover:bg-brand-800 text-white font-semibold text-sm px-7 py-3 rounded-full transition-colors"
      >
        Back to home
      </Link>
    </main>
  );
}
