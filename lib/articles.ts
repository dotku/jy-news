import fs from "fs";
import path from "path";
import matter from "gray-matter";

type Lang = "zh" | "en";

const CONTENT_DIRS: Record<Lang, string> = {
  zh: path.join(process.cwd(), "content/news"),
  en: path.join(process.cwd(), "content/news-en"),
};

export interface ArticleMeta {
  slug: string;
  id: string;
  title: string;
  titleEn: string;
  date: string;
  category: string;
  source: string;
  summary: string;
  summaryEn: string;
  image: string;
}

export interface Article extends ArticleMeta {
  content: string;
}

export function getAllArticles(lang: Lang = "zh"): ArticleMeta[] {
  const dir = CONTENT_DIRS[lang];
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  const articles = files.flatMap((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    let data;
    try {
      data = matter(raw).data;
    } catch (err) {
      console.warn(`Skipping unparsable article ${file}:`, (err as Error).message);
      return [];
    }
    const fileId = file.replace(/\.mdx$/, "");

    return [{
      slug: data.slug || fileId,
      id: data.id || fileId,
      title: data.title || "",
      titleEn: data.title_en || "",
      date: data.date || "",
      category: data.category || "",
      source: data.source || "",
      summary: data.summary || "",
      summaryEn: data.summary_en || "",
      image: data.image || "",
    }];
  });

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

// Home shows a hero (3) + trending (4) + the newest LIST_PAGE_SIZE items; older items go to /[lang]/page/[n].
// Rendering everything on one page produced a 30 MB page that Vercel refuses to deploy.
export const HOME_LEAD_COUNT = 7;
export const LIST_PAGE_SIZE = 30;

export function getListPage(articles: ArticleMeta[], page: number) {
  const start = HOME_LEAD_COUNT + (page - 1) * LIST_PAGE_SIZE;
  return articles.slice(start, start + LIST_PAGE_SIZE);
}

export function getListPageCount(total: number) {
  return Math.max(1, Math.ceil((total - HOME_LEAD_COUNT) / LIST_PAGE_SIZE));
}

export function getArticleBySlug(
  slug: string,
  lang: Lang = "zh"
): Article | null {
  const dir = CONTENT_DIRS[lang];
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    const fileId = file.replace(/\.mdx$/, "");
    const articleSlug = data.slug || fileId;

    if (articleSlug === slug) {
      return {
        slug: articleSlug,
        id: data.id || fileId,
        title: data.title || "",
        titleEn: data.title_en || "",
        date: data.date || "",
        category: data.category || "",
        source: data.source || "",
        summary: data.summary || "",
        summaryEn: data.summary_en || "",
        image: data.image || "",
        content,
      };
    }
  }

  return null;
}
