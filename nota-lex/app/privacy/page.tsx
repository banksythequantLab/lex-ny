import Link from "next/link";

export const metadata = {
  title: "Privacy - Lex.NY",
  description:
    "Privacy notice for Lex.NY. What the site logs, what it doesn't, and which third parties see your queries. Last updated May 2026.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)]">
      <div className="editorial-caption">
        <div className="max-w-[1180px] mx-auto flex justify-between items-center px-7 py-2.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-seal)] inline-block" />
            Privacy - Lex.NY
          </span>
          <span>Last updated: May 30, 2026</span>
        </div>
      </div>
        <article className="max-w-[760px] mx-auto px-7 py-14">
        <div className="font-[family-name:var(--font-mono)] text-[10.5px] tracking-[0.18em] uppercase text-[var(--color-ink-2)] mb-2">
          Privacy
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-5xl mb-4 leading-tight">
          Privacy notice
        </h1>
        <p className="text-lg text-[var(--color-ink-2)] leading-relaxed mb-10">
          Lex.NY is a public research tool. This page explains what the
          site logs, what it doesn’t, and which third parties see your
          queries.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          What we log
        </h2>
        <p className="leading-relaxed mb-4">
          On every request to{" "}
          <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">
            /api/ask
          </code>{" "}
          and related endpoints, the server records:
        </p>
        <ul className="leading-relaxed mb-4 list-disc pl-6 space-y-1">
          <li>The IP address of the requester, for rate limiting (10 req/min on /api/ask, 5 req/min on /api/ask/stream).</li>
          <li>The question text and the answer text, in standard application logs.</li>
          <li>Timing and token-count metrics for each LLM call (see <Link href="/stats" className="text-[var(--color-seal-deep)] underline">/stats</Link> and <code className="font-[family-name:var(--font-mono)] bg-[var(--color-rule)]/15 px-1 rounded">/api/llm-stats</code>).</li>
        </ul>
        <p className="leading-relaxed mb-4">
          These logs are kept on the workstation hosting Lex.NY for
          operational purposes (debugging, abuse mitigation, performance
          analysis). They are not sold, shared, or used for advertising.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          What we don’t collect
        </h2>
        <ul className="leading-relaxed mb-4 list-disc pl-6 space-y-1">
          <li>No user accounts. There is no signup, no login, no password.</li>
          <li>No cookies for tracking. The site does not set any non-essential cookies.</li>
          <li>No advertising network integrations. No Google Analytics, no Facebook pixel, no third-party trackers.</li>
          <li>No personal information beyond IP + queries. The site does not request your name, email, or any other identifying field.</li>
        </ul>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Third parties that see your queries
        </h2>
        <p className="leading-relaxed mb-4">
          Producing an answer involves calls to a few external services.
          Each of these third parties may receive part of your query as
          part of normal operation:
        </p>
        <div className="border border-[var(--color-rule)]/30 rounded-sm bg-[var(--color-paper-2)] p-6 mb-4">
          <ul className="leading-relaxed space-y-3 text-sm">
            <li>
              <strong>AWS (Aurora PostgreSQL)</strong> - stores and queries the NY corpus. Receives the IDs of retrieved opinions and statutes for pgvector semantic search, Postgres full-text search, and the citation graph (recursive CTEs over CITES / APPLIES edges). Retrieval is corpus-only.
            </li>
            <li>
              <strong>The embedding model (mxbai-embed-large, 1024-d)</strong> - receives your question text to compute the query vector used for semantic retrieval.
            </li>
            <li>
              <strong>The hosted drafting model</strong> - a fast hosted model that receives the embedded question plus the retrieval context block as the prompt, under a strict-citation system prompt. Used to draft the answer.
            </li>
            <li>
              <strong>Voice input</strong> - if you use the microphone button on /ask, transcription runs in your browser using its native speech-recognition. No audio is sent to Lex.NY.
            </li>
            <li>
              <strong>Vercel</strong> - hosts the Next.js app (us-east-1). Sees request metadata (IP, user-agent, URL) at the edge. Their privacy policy applies to that layer.
            </li>
          </ul>
        </div>
        <p className="leading-relaxed mb-4">
          The full list of third-party services is also documented in the
          open source repository under{" "}
          <a
            href="https://github.com/banksythequantLab/lex-ny"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            the project README
          </a>
          .
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Retention
        </h2>
        <p className="leading-relaxed mb-4">
          Application logs are rotated daily and the on-disk usage tracker
          files keep the most recent ~5,000 entries per endpoint. There is
          no long-term archival of queries. The system was built to answer
          questions, not to build a corpus of what people ask.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Confidentiality - don’t share what you can’t share
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is a public tool. Anything you type into{" "}
          <Link href="/ask" className="text-[var(--color-seal-deep)] underline">
            /ask
          </Link>{" "}
          is sent to several third-party services as listed above. Do not
          paste client-confidential information, attorney work product,
          privileged communications, or anything else you would not want
          a third-party API to see. If you need an air-gapped or fully
          self-hosted setup, fork the repository and run it on your own
          infrastructure - the entire stack (Postgres with pgvector for the
          corpus, citation graph, and full-text search) can run on your own
          hardware without any outbound API calls.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Children
        </h2>
        <p className="leading-relaxed mb-4">
          Lex.NY is not directed at children under 13. The site does not
          knowingly collect information from minors. If you are under 13,
          do not use this site.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Changes
        </h2>
        <p className="leading-relaxed mb-4">
          This privacy notice may be updated. The “last updated”
          date at the top of this page reflects the most recent revision.
          Version history is in the public repository.
        </p>

        <h2 className="font-[family-name:var(--font-display)] text-2xl mt-12 mb-3">
          Contact
        </h2>
        <p className="leading-relaxed mb-4">
          Questions about this notice or about how Lex.NY handles your
          data can be directed via the contact methods listed at{" "}
          <a
            href="https://nota.lawyer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-seal-deep)] underline"
          >
            nota.lawyer
          </a>{" "}
          or by opening an issue on the public repository.
        </p>

        <p className="mt-12 font-[family-name:var(--font-mono)] text-[10.5px] tracking-wider uppercase text-[var(--color-ink-2)]">
          See also:{" "}
          <Link href="/terms" className="underline hover:text-[var(--color-ink)]">
            Terms
          </Link>
          {" · "}
          <Link href="/about" className="underline hover:text-[var(--color-ink)]">
            About
          </Link>
        </p>
      </article>
    </main>
  );
}
