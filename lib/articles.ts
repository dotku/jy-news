import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content/news");

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

export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  const articles = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
    const { data } = matter(raw);
    const fileId = file.replace(/\.mdx$/, "");

    return {
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
    };
  });

  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getArticleBySlug(slug: string): Article | null {
  if (!fs.existsSync(CONTENT_DIR)) return null;

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
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

export function getCategories(): string[] {
  const articles = getAllArticles();
  const cats = new Set(articles.map((a) => a.category).filter(Boolean));
  return Array.from(cats);
}
