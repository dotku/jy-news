/**
 * Fetch news from cnBeta and save as MDX files in content/news/
 * Usage: npx tsx scripts/fetch-cnbeta.ts
 */
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://www.cnbeta.com.tw";
const OUTPUT_DIR = path.join(process.cwd(), "content/news");

interface Article {
  id: string;
  title: string;
  url: string;
  category: string;
  summary: string;
  content: string;
  date: string;
  image?: string;
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  return res.text();
}

async function fetchArticleList(): Promise<
  { title: string; url: string; category: string; image?: string }[]
> {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);
  const articles: {
    title: string;
    url: string;
    category: string;
    image?: string;
  }[] = [];

  // cnbeta article links follow /articles/{category}/{id}.htm pattern
  $("a[href*='/articles/']").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();
    if (!href || !title || title.length < 5) return;

    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const match = href.match(/\/articles\/(\w+)\/(\d+)\.htm/);
    if (!match) return;

    const category = match[1];

    // Avoid duplicates
    if (articles.some((a) => a.url === fullUrl)) return;

    // Try to find a nearby image
    const parent = $(el).closest("div, article, li, section");
    const img = parent.find("img").first();
    const image = img.attr("src") || img.attr("data-src") || undefined;

    articles.push({ title, url: fullUrl, category, image });
  });

  return articles;
}

async function fetchArticleDetail(url: string): Promise<{
  summary: string;
  content: string;
  date: string;
  image?: string;
}> {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Extract date
    const dateText =
      $("time").attr("datetime") ||
      $(".date, .time, [class*='date'], [class*='time']").first().text().trim();
    const date = dateText || new Date().toISOString().split("T")[0];

    // Extract summary
    const summary =
      $(".article-summary, .article-desc, .summary, meta[name='description']")
        .first()
        .text()
        .trim() ||
      $("meta[name='description']").attr("content") ||
      "";

    // Extract article body content
    const articleBody = $(
      ".article-content, .article-body, .article_content, #artibody, .content"
    ).first();

    // Convert content to markdown-like text
    let content = "";
    if (articleBody.length) {
      // Remove script, style, ads
      articleBody.find("script, style, .ad, .advertisement, iframe").remove();

      articleBody.find("p, h2, h3, h4").each((_, el) => {
        const tag = $(el).prop("tagName")?.toLowerCase();
        const text = $(el).text().trim();
        if (!text) return;

        if (tag === "h2") content += `## ${text}\n\n`;
        else if (tag === "h3") content += `### ${text}\n\n`;
        else if (tag === "h4") content += `#### ${text}\n\n`;
        else content += `${text}\n\n`;
      });
    }

    // Find article image
    const image =
      articleBody.find("img").first().attr("src") ||
      $('meta[property="og:image"]').attr("content") ||
      undefined;

    return {
      summary: summary.slice(0, 300),
      content: content || summary,
      date,
      image,
    };
  } catch (err) {
    console.error(`  Failed to fetch detail: ${url}`, err);
    return {
      summary: "",
      content: "",
      date: new Date().toISOString().split("T")[0],
    };
  }
}

function sanitizeForMdx(text: string): string {
  // Escape characters that might break MDX/YAML frontmatter
  return text.replace(/"/g, '\\"').replace(/\n/g, " ");
}

function slugify(title: string, id: string): string {
  return id;
}

async function main() {
  console.log("Fetching article list from cnBeta...");
  const articles = await fetchArticleList();
  console.log(`Found ${articles.length} articles`);

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const limit = Math.min(articles.length, 20); // Fetch up to 20 articles
  for (let i = 0; i < limit; i++) {
    const article = articles[i];
    const match = article.url.match(/\/(\d+)\.htm/);
    const id = match ? match[1] : `article-${i}`;
    const slug = slugify(article.title, id);
    const filePath = path.join(OUTPUT_DIR, `${slug}.mdx`);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      console.log(`  [skip] ${article.title} (already exists)`);
      continue;
    }

    console.log(`  [${i + 1}/${limit}] Fetching: ${article.title}`);
    const detail = await fetchArticleDetail(article.url);

    // Delay to be polite
    await new Promise((r) => setTimeout(r, 500));

    const image = detail.image || article.image || "";

    const mdxContent = `---
title: "${sanitizeForMdx(article.title)}"
date: "${detail.date}"
category: "${article.category}"
source: "${article.url}"
summary: "${sanitizeForMdx(detail.summary)}"
image: "${image}"
---

${detail.content || article.title}
`;

    fs.writeFileSync(filePath, mdxContent, "utf-8");
    console.log(`    Saved: ${filePath}`);
  }

  console.log("\nDone! MDX files saved to content/news/");
}

main().catch(console.error);
