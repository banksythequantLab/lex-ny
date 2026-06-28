/**
 * Route-segment loading UI for /case/[cl_id]. Next.js renders this as the
 * Suspense fallback while the server component awaits the opinion + cited-by
 * data from the corpus, so the user sees the on-brand Spinner instead of a
 * blank screen during the wait.
 */
import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block animate-pulse" />
            Source · Lex.NY
          </span>
          <span>Opinion text served from the local corpus</span>
        </div>
      </div>

      <div className="max-w-[1180px] mx-auto px-7 py-10">
        <div className="py-10 flex justify-center"><Spinner size={24} label="Loading opinion&hellip;" /></div>
      </div>
    </main>
  );
}
