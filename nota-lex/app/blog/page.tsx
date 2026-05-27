import { isStoryblokConfigured, listBlogPosts } from "@nota-lawyer/shared";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  if (!isStoryblokConfigured()) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-stone-800">
        <h1 className="text-4xl font-serif mb-4">The Lex.NY Blog</h1>
        <p className="text-stone-500 mb-8">
          Coming soon. The blog is powered by{" "}
          <a
            href="https://www.storyblok.com"
            className="underline decoration-stone-400 hover:text-red-800"
          >
            Storyblok
          </a>
          , which isn&apos;t configured for this environment yet.
        </p>
        <div className="border border-stone-300 bg-stone-50 rounded p-6 text-sm">
          <p className="font-mono text-stone-600">
            To enable: set <code>STORYBLOK_ACCESS_TOKEN</code> in{" "}
            <code>.env.local</code>.
          </p>
        </div>
        <p className="mt-8">
          <Link href="/" className="underline">
            ← Back to Lex.NY
          </Link>
        </p>
      </main>
    );
  }

  let posts: Awaited<ReturnType<typeof listBlogPosts>>["posts"] = [];
  let error: string | null = null;
  try {
    const res = await listBlogPosts({ perPage: 20 });
    posts = res.posts;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-stone-800">
      <h1 className="text-4xl font-serif mb-2">The Lex.NY Blog</h1>
      <p className="text-stone-500 mb-12">
        Notes on building an attorney-supervised legal research engine.
      </p>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-900 rounded p-4 mb-6 text-sm">
          Could not fetch posts: {error}
        </div>
      )}

      {posts.length === 0 && !error && (
        <p className="text-stone-500">No posts yet. Check back soon.</p>
      )}

      <ul className="space-y-8">
        {posts.map((p) => (
          <li key={p.slug} className="border-b border-stone-200 pb-6">
            <Link
              href={`/blog/${p.slug}`}
              className="text-2xl font-serif hover:text-red-800 transition-colors"
            >
              {p.title}
            </Link>
            {p.intro && <p className="mt-2 text-stone-600">{p.intro}</p>}
            <div className="mt-3 text-xs text-stone-400">
              {p.publish_date && (
                <span>{new Date(p.publish_date).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
              )}
              {p.author && <span> · {p.author}</span>}
              {p.tags && p.tags.length > 0 && (
                <span>
                  {" "}
                  · {p.tags.map((t) => `#${t}`).join(" ")}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-xs text-stone-400">
        Powered by{" "}
        <a href="https://www.storyblok.com" className="underline hover:text-red-800">
          Storyblok
        </a>
        , a HackerNoon Proof of Usefulness partner.
      </p>
    </main>
  );
}
