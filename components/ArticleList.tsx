import Link from "next/link";
import type { ArticleMeta } from "@/lib/articles";
import { getDictionary, type Lang } from "@/lib/i18n";
import TimeAgo from "@/components/TimeAgo";
import { ArticleViews } from "@/components/ArticleStats";

export default function ArticleList({ articles, lang }: { articles: ArticleMeta[]; lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {articles.map((article) => (
        <Link key={article.slug} href={`/${lang}/article/${article.slug}`} className="group flex gap-5 py-5">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                {t.categories[article.category] || article.category}
              </span>
              <TimeAgo date={article.date} lang={lang} />
              <ArticleViews slug={article.slug} />
            </div>
            <h3 className="mt-1.5 text-lg font-bold leading-snug text-zinc-900 group-hover:text-green-700 dark:text-zinc-100 dark:group-hover:text-green-400">
              {article.title}
            </h3>
            {article.summary && (
              <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{article.summary}</p>
            )}
          </div>

          {article.image && (
            <div className="shrink-0">
              <div className="h-20 w-28 overflow-hidden rounded-lg bg-zinc-100 sm:h-24 sm:w-36 dark:bg-zinc-800">
                <img
                  src={article.image}
                  alt={article.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ lang, page, totalPages }: { lang: Lang; page: number; totalPages: number }) {
  const zh = lang === "zh";
  const href = (n: number) => (n <= 1 ? `/${lang}` : `/${lang}/page/${n}`);
  const btn =
    "rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label={zh ? "分页" : "Pagination"}>
      {page > 1 ? (
        <Link href={href(page - 1)} className={btn}>
          {zh ? "← 较新" : "← Newer"}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-zinc-500">
        {zh ? `第 ${page} / ${totalPages} 页` : `Page ${page} of ${totalPages}`}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className={btn}>
          {zh ? "更早的新闻 →" : "Older →"}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
