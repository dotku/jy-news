import Link from "next/link";
import type { Post } from "@/lib/posts";
import type { Lang } from "@/lib/i18n";
import TimeAgo from "@/components/TimeAgo";
import ExpandableText from "@/components/ExpandableText";
import { getArticleBySlug } from "@/lib/articles";

// Quote posts link to our own article; the English page may not exist yet
// (not every article is translated), so fall back to the Chinese one.
function articleHref(slug: string, lang: Lang) {
  return `/${lang === "en" && !getArticleBySlug(slug, "en") ? "zh" : lang}/article/${slug}`;
}

// Chat-style 行业之声 feed for the home sidebar: each post is a message bubble
// from its author. Retweets and near-empty posts ("Video", a bare link) are
// skipped so the sidebar shows things worth reading.
const MIN_CHARS = 20;

/** The author's own words: the first paragraph, without links or a quoted post below it. */
export function ownText(content: string): string {
  return content.split(/\n\s*\n/)[0].replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
}

export function pickVoices(posts: Post[], count = 8): Post[] {
  return posts
    .filter((p) => !p.isRT && !/^RT\b/.test(p.content.trim()) && ownText(p.content).length >= MIN_CHARS)
    .slice(0, count);
}

export default function VoicesChat({ posts, lang }: { posts: Post[]; lang: Lang }) {
  const zh = lang === "zh";
  if (posts.length === 0) return null;

  return (
    <aside className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/60">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {zh ? "行业之声" : "Industry Voices"}
        </h2>
        <Link
          href={`/${lang}/voices`}
          className="text-sm font-medium text-green-700 hover:underline dark:text-green-400"
        >
          {zh ? "查看全部 →" : "See all →"}
        </Link>
      </div>

      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug} className="flex items-start gap-2.5">
            <div
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-300"
            >
              {post.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 text-xs">
                <span className="truncate font-semibold text-zinc-900 dark:text-zinc-100">{post.name}</span>
                <TimeAgo date={post.date} lang={lang} />
              </div>
              {post.authorTitle && (
                <div className="truncate text-xs text-zinc-400">{post.authorTitle}</div>
              )}
              <div className="mt-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm leading-relaxed text-zinc-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-300">
                <ExpandableText
                  text={!zh && post.quoteEn ? post.quoteEn : ownText(post.content)}
                  moreLabel={zh ? "展开" : "Show more"}
                  lessLabel={zh ? "收起" : "Show less"}
                />
                {post.sourceArticle ? (
                  <Link
                    href={articleHref(post.sourceArticle, lang)}
                    className="mt-1 block text-right text-xs text-zinc-400 hover:text-green-700 dark:hover:text-green-400"
                  >
                    {zh ? `据 ${post.sourceName} 报道 · 原文 →` : `Via ${post.sourceName} · Read →`}
                  </Link>
                ) : (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-right text-xs text-zinc-400 hover:text-green-700 dark:hover:text-green-400"
                  >
                    {zh ? "原帖 ↗" : "Original ↗"}
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
