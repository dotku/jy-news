import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { getDictionary, isValidLang, locales, type Lang } from "@/lib/i18n";
import TimeAgo from "@/components/TimeAgo";
import { ArticleViews } from "@/components/ArticleStats";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isValidLang(lang)) notFound();

  const t = getDictionary(lang);
  const articles = getAllArticles(lang);

  if (articles.length === 0) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-6 text-3xl font-bold">{t.siteName}</h1>
        <p className="text-zinc-500">{t.noArticles}</p>
      </main>
    );
  }

  const trendingLabel = lang === "zh" ? "热门文章" : "Trending";
  const latestLabel = lang === "zh" ? "最新资讯" : "Latest News";

  // Hero: 1 large + 2 small
  const hero = articles[0];
  const sideArticles = articles.slice(1, 3);
  const restArticles = articles.slice(3);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero: 1 large left + 2 small right */}
      <div className="mb-10 grid gap-6 sm:grid-cols-5">
        {/* Main hero */}
        <Link
          href={`/${lang}/article/${hero.slug}`}
          className="group sm:col-span-3"
        >
          {hero.image && (
            <div className="aspect-[16/10] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <img
                src={hero.image}
                alt={hero.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                {t.categories[hero.category] || hero.category}
              </span>
              <TimeAgo date={hero.date} lang={lang as Lang} />
            </div>
            <h2 className="mt-2 text-xl font-bold leading-tight text-zinc-900 group-hover:text-green-700 sm:text-2xl dark:text-zinc-50 dark:group-hover:text-green-400">
              {hero.title}
            </h2>
            {hero.summary && (
              <p className="mt-2 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                {hero.summary}
              </p>
            )}
          </div>
        </Link>

        {/* 2 smaller cards */}
        <div className="flex flex-col gap-6 sm:col-span-2">
          {sideArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/${lang}/article/${article.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
            >
              {article.image && (
                <div className="aspect-video overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                    {t.categories[article.category] || article.category}
                  </span>
                  <TimeAgo date={article.date} lang={lang as Lang} />
                </div>
                <h3 className="mt-1.5 text-sm font-bold leading-snug text-zinc-900 group-hover:text-green-700 dark:text-zinc-100 dark:group-hover:text-green-400">
                  {article.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Trending section */}
      {restArticles.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {trendingLabel}
          </h2>
          <div className="grid gap-4 sm:grid-cols-4">
            {restArticles.slice(0, 4).map((article, idx) => (
              <Link
                key={article.slug}
                href={`/${lang}/article/${article.slug}`}
                className="group flex gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-2xl font-black text-zinc-200 dark:text-zinc-700">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                      {t.categories[article.category] || article.category}
                    </span>
                    <TimeAgo date={article.date} lang={lang as Lang} />
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 group-hover:text-green-700 dark:text-zinc-100 dark:group-hover:text-green-400">
                    {article.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Latest news list */}
      {restArticles.length > 4 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {latestLabel}
          </h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {restArticles.slice(4).map((article) => (
              <Link
                key={article.slug}
                href={`/${lang}/article/${article.slug}`}
                className="group flex gap-5 py-5"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                      {t.categories[article.category] || article.category}
                    </span>
                    <TimeAgo date={article.date} lang={lang as Lang} />
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
                  <div className="shrink-0">
                    <div className="h-20 w-28 overflow-hidden rounded-lg bg-zinc-100 sm:h-24 sm:w-36 dark:bg-zinc-800">
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
        </section>
      )}
    </main>
  );
}
