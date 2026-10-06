import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getAllArticles, getListPage, getListPageCount } from "@/lib/articles";
import { isValidLang, locales, type Lang } from "@/lib/i18n";
import ArticleList, { Pager } from "@/components/ArticleList";

export async function generateStaticParams() {
  return locales.flatMap((lang) => {
    const pages = getListPageCount(getAllArticles(lang).length);
    return Array.from({ length: pages - 1 }, (_, i) => ({ lang, page: String(i + 2) }));
  });
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ lang: string; page: string }> }): Promise<Metadata> {
  const { lang, page } = await params;
  return { title: lang === "zh" ? `最新资讯 第 ${page} 页` : `Latest News, page ${page}` };
}

export default async function ListPage({ params }: { params: Promise<{ lang: string; page: string }> }) {
  const { lang, page: raw } = await params;
  if (!isValidLang(lang)) notFound();
  const page = Number(raw);
  if (page === 1) redirect(`/${lang}`);

  const articles = getAllArticles(lang);
  const totalPages = getListPageCount(articles.length);
  if (!Number.isInteger(page) || page < 2 || page > totalPages) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
        {lang === "zh" ? `最新资讯 · 第 ${page} 页` : `Latest News · Page ${page}`}
      </h1>
      <ArticleList articles={getListPage(articles, page)} lang={lang as Lang} />
      <Pager lang={lang as Lang} page={page} totalPages={totalPages} />
    </main>
  );
}
