import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticleBySlug, getAllArticles } from "@/lib/articles";
import { getDictionary, isValidLang, locales, type Lang } from "@/lib/i18n";
import {
  ArticleLikeButton,
  ArticleViews,
  ViewTracker,
} from "@/components/ArticleStats";
import TimeAgo from "@/components/TimeAgo";

export const dynamicParams = true;

export async function generateStaticParams() {
  const params: { lang: string; slug: string }[] = [];
  for (const lang of locales) {
    const articles = getAllArticles(lang);
    for (const article of articles) {
      params.push({ lang, slug: article.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug: rawSlug } = await params;
  if (!isValidLang(lang)) return {};
  const slug = decodeURIComponent(rawSlug);
  const article = getArticleBySlug(slug, lang);
  if (!article) return { title: "Not Found - JY Tech News" };

  return {
    title: `${article.title} - JY Tech News`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      images: article.image ? [article.image] : [],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug: rawSlug } = await params;
  if (!isValidLang(lang)) notFound();

  const slug = decodeURIComponent(rawSlug);
  const t = getDictionary(lang);
  const article = getArticleBySlug(slug, lang);

  if (!article) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <ViewTracker slug={article.slug} />

      <Link
        href={`/${lang}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-green-700 dark:text-zinc-400"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        {t.backToList}
      </Link>

      {lang === "en" && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
          </svg>
          <span>This article was auto-translated.</span>
          <Link href={`/zh/article/${slug}`} className="font-medium underline hover:text-blue-900 dark:hover:text-blue-200">
            View original (中文)
          </Link>
        </div>
      )}

      <article>
        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {t.categories[article.category] || article.category}
            </span>
            <TimeAgo date={article.date} lang={lang as Lang} />
            <ArticleViews slug={article.slug} />
          </div>
          <h1 className="text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-4 text-lg text-zinc-500 dark:text-zinc-400">
              {article.summary}
            </p>
          )}
        </header>

        {article.image && (
          <div className="mb-8 overflow-hidden rounded-xl">
            <img
              src={article.image}
              alt={article.title}
              className="w-full object-cover"
            />
          </div>
        )}

        <div className="prose prose-zinc max-w-none dark:prose-invert">
          {article.content.split("\n\n").map((paragraph, i) => {
            const trimmed = paragraph.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith("## "))
              return (
                <h2 key={i} className="mt-8 mb-4 text-xl font-semibold">
                  {trimmed.slice(3)}
                </h2>
              );
            if (trimmed.startsWith("### "))
              return (
                <h3 key={i} className="mt-6 mb-3 text-lg font-semibold">
                  {trimmed.slice(4)}
                </h3>
              );
            if (trimmed.startsWith("http"))
              return (
                <p key={i}>
                  <a
                    href={trimmed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 underline hover:text-green-900 dark:text-green-400"
                  >
                    {trimmed}
                  </a>
                </p>
              );
            return (
              <p key={i} className="mb-4 leading-relaxed">
                {trimmed}
              </p>
            );
          })}
        </div>

        <footer className="mt-12 flex items-center justify-end border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <ArticleLikeButton slug={article.slug} />
        </footer>
      </article>
    </main>
  );
}
