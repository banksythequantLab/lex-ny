/**
 * Storyblok CMS integration for Lex.NY - powers the public blog and changelog.
 *
 * Why Storyblok?
 *   Lex.NY's marketing surface (blog, release notes, about page, FAQ)
 *   needs content updates without redeploys. A headless CMS with a
 *   visual editor lets the content team write copy directly, and the
 *   Next.js front-end fetches via API.
 *
 *   For the hackathon, Storyblok powers /blog. Each post is a Story
 *   in Storyblok with title, slug, body (rich text), publish_date,
 *   and tags.
 *
 * Hackathon angle:
 *   - Storyblok is a Proof of Usefulness sponsor (HackerNoon prize)
 *   - Hits PoU tags: #api-first-cms, #first-cms, #omnichannel-content
 *   - Growth+ free trial: 45 days, worth $540
 *
 * Deployment:
 *   - Sign up at https://www.storyblok.com (HackerNoon partner)
 *   - Create a space, find the Preview/Public access token in Settings
 *   - Set STORYBLOK_ACCESS_TOKEN in .env.local
 *
 *   When the token isn't set, /blog renders a graceful "configure CMS" notice
 *   instead of crashing.
 */

import StoryblokClient from "storyblok-js-client";

let cachedClient: StoryblokClient | null = null;

export function isStoryblokConfigured(): boolean {
  return Boolean(process.env.STORYBLOK_ACCESS_TOKEN);
}

export function getStoryblokClient(): StoryblokClient {
  if (cachedClient) return cachedClient;
  const token = process.env.STORYBLOK_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Storyblok not configured. Set STORYBLOK_ACCESS_TOKEN in .env.local"
    );
  }
  cachedClient = new StoryblokClient({
    accessToken: token,
    cache: {
      clear: "auto",
      type: "memory",
    },
  });
  return cachedClient;
}

/* ------------------------------------------------------------------ */
/*  Blog post fetching                                                  */
/* ------------------------------------------------------------------ */

export interface BlogPost {
  slug: string;
  title: string;
  intro?: string;
  body_html?: string;
  publish_date?: string;
  tags?: string[];
  author?: string;
}

/**
 * List published blog posts. Newest first.
 */
export async function listBlogPosts(opts: {
  perPage?: number;
  page?: number;
} = {}): Promise<{ posts: BlogPost[]; total: number }> {
  const client = getStoryblokClient();
  const res = await client.get("cdn/stories", {
    starts_with: "blog/",
    is_startpage: false,
    sort_by: "first_published_at:desc",
    per_page: opts.perPage ?? 10,
    page: opts.page ?? 1,
    version: process.env.STORYBLOK_VERSION === "draft" ? "draft" : "published",
  });

  const stories = (res.data?.stories || []) as Array<{
    slug: string;
    full_slug: string;
    name: string;
    first_published_at?: string;
    tag_list?: string[];
    content?: {
      title?: string;
      intro?: string;
      body?: unknown;
      author?: string;
    };
  }>;

  const posts: BlogPost[] = stories.map((s) => ({
    slug: s.slug,
    title: s.content?.title || s.name,
    intro: s.content?.intro,
    publish_date: s.first_published_at,
    tags: s.tag_list,
    author: s.content?.author,
  }));

  return {
    posts,
    total: (res.total as number) ?? posts.length,
  };
}

/**
 * Fetch one post by slug.
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  const client = getStoryblokClient();
  try {
    const res = await client.get(`cdn/stories/blog/${slug}`, {
      version: process.env.STORYBLOK_VERSION === "draft" ? "draft" : "published",
    });
    const story = res.data?.story as
      | {
          slug: string;
          name: string;
          first_published_at?: string;
          tag_list?: string[];
          content?: {
            title?: string;
            intro?: string;
            body?: unknown;
            author?: string;
          };
        }
      | undefined;
    if (!story) return null;

    // Render rich-text body to HTML using Storyblok's built-in helper
    let body_html: string | undefined;
    if (story.content?.body) {
      const resolver = (client as unknown as { richTextResolver: { render: (b: unknown) => string } }).richTextResolver;
      body_html = resolver.render(story.content.body);
    }

    return {
      slug: story.slug,
      title: story.content?.title || story.name,
      intro: story.content?.intro,
      body_html,
      publish_date: story.first_published_at,
      tags: story.tag_list,
      author: story.content?.author,
    };
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Stats / health                                                      */
/* ------------------------------------------------------------------ */

export interface StoryblokStats {
  configured: boolean;
  total_stories?: number;
  total_blog_posts?: number;
}

export async function getStoryblokStats(): Promise<StoryblokStats> {
  if (!isStoryblokConfigured()) {
    return { configured: false };
  }
  try {
    const client = getStoryblokClient();
    const all = await client.get("cdn/stories", { per_page: 1, version: "published" });
    const blog = await client.get("cdn/stories", {
      starts_with: "blog/",
      per_page: 1,
      version: "published",
    });
    return {
      configured: true,
      total_stories: (all.total as number) ?? 0,
      total_blog_posts: (blog.total as number) ?? 0,
    };
  } catch (e) {
    return { configured: true };
  }
}

export async function storyblokHealthCheck(): Promise<{ ok: boolean; details: string }> {
  if (!isStoryblokConfigured()) {
    return {
      ok: false,
      details: "STORYBLOK_ACCESS_TOKEN not set in .env.local",
    };
  }
  try {
    const client = getStoryblokClient();
    await client.get("cdn/spaces/me", {});
    return { ok: true, details: "Storyblok connected" };
  } catch (e) {
    return {
      ok: false,
      details: e instanceof Error ? e.message : String(e),
    };
  }
}
