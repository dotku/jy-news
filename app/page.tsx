import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { ArticleViews } from "@/components/ArticleStats";

const CATEGORY_LABELS: Record<string, string> = {
  tech: "科技",
  science: "科学",
  game: "游戏",
  movie: "影视",
  soft: "软件",
  comic: "动漫",
  music: "音乐",
  fun: "趣闻",
};

function formatDate(date: string) {
  if (!date || date.includes("加载")) return null;
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function Home() {
  const articles = getAllArticles();

  if (articles.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold">JY Tech News</h1>
        <p className="text-zinc-500">
          暂无文章，请稍后再来
        </p>
      </main>
    );
  }

  const heroArticle = articles.find((a) => a.image);
  const restArticles = articles.filter((a) => a !== heroArticle);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero */}
      {heroArticle && (
        <Link
          href={`/article/${heroArticle.slug}`}
          className="group mb-10 block"
        >
          {heroArticle.image && (
            <div className="aspect-[2/1] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <img
                src={heroArticle.image}
                alt={heroArticle.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                {CATEGORY_LABELS[heroArticle.category] || heroArticle.category}
              </span>
              {formatDate(heroArticle.date) && (
                <span className="text-xs text-zinc-400">
                  {formatDate(heroArticle.date)}
                </span>
              )}
              <ArticleViews slug={heroArticle.slug} />
            </div>
            <h2 className="mt-2 text-2xl font-bold leading-tight text-zinc-900 group-hover:text-green-700 sm:text-3xl dark:text-zinc-50 dark:group-hover:text-green-400">
              {heroArticle.title}
            </h2>
            {heroArticle.summary && (
              <p className="mt-3 line-clamp-2 text-base text-zinc-500 dark:text-zinc-400">
                {heroArticle.summary}
              </p>
            )}
          </div>
        </Link>
      )}

      {/* Article list */}
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {restArticles.map((article) => (
          <Link
            key={article.slug}
            href={`/article/${article.slug}`}
            className="group flex gap-5 py-5"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                  {CATEGORY_LABELS[article.category] || article.category}
                </span>
                {formatDate(article.date) && (
                  <span className="text-xs text-zinc-400">
                    {formatDate(article.date)}
                  </span>
                )}
                <ArticleViews slug={article.slug} />
              </div>
              <h3 className="mt-1.5 text-lg font-bold leading-snug text-zinc-900 group-hover:text-green-700 dark:text-zinc-100 dark:group-hover:text-green-400">
                {article.title}
              </h3>
              {article.summary && (
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {article.summary}
                </p>
              )}
            </div>

            {article.image && (
              <div className="hidden shrink-0 sm:block">
                <div className="h-24 w-36 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
