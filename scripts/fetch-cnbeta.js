/**
 * Fetch news from cnBeta and save as MDX files.
 * Also captures view/like counts and seeds them into the database.
 * Usage: node scripts/fetch-cnbeta.js
 */
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { neon } = require("@neondatabase/serverless");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const BASE_URL = "https://www.cnbeta.com.tw";
const OUTPUT_DIR = path.join(process.cwd(), "content/news");

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
  });
  return res.text();
}

async function fetchArticleList() {
  const html = await fetchPage(BASE_URL);
  const $ = cheerio.load(html);
  const articles = [];
  const fullText = $.text();

  $('a[href*="/articles/"]').each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();
    if (!href || !title || title.length < 5) return;

    const fullUrl = href.startsWith("http") ? href : BASE_URL + href;
    const match = href.match(/\/articles\/(\w+)\/(\d+)\.htm/);
    if (!match) return;
    if (articles.some((a) => a.url === fullUrl)) return;

    const parent = $(el).closest("div, article, li, section");
    const img = parent.find("img").first();
    const image = img.attr("src") || img.attr("data-src") || "";

    // Extract view and like counts from surrounding text
    const parentText = parent.text();
    const viewMatch = parentText.match(/阅读\s*(\d+)/);
    const likeMatch = parentText.match(/点赞\s*(\d+)/);
    const views = viewMatch ? parseInt(viewMatch[1], 10) : 0;
    const likes = likeMatch ? parseInt(likeMatch[1], 10) : 0;

    articles.push({
      title,
      url: fullUrl,
      category: match[1],
      id: match[2],
      image,
      views,
      likes,
    });
  });

  return articles;
}

async function fetchArticleDetail(url) {
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Extract date - cnbeta renders dates like "2026年04月17日 05:48"
    const pageText = $.text();
    const cnDateMatch = pageText.match(/(\d{4})年(\d{2})月(\d{2})日\s*(\d{2}):(\d{2})/);
    const dateText = cnDateMatch
      ? `${cnDateMatch[1]}-${cnDateMatch[2]}-${cnDateMatch[3]}T${cnDateMatch[4]}:${cnDateMatch[5]}:00`
      : $("time").attr("datetime") ||
        $(".date, .time, [class*=date], [class*=time]").first().text().trim() ||
        new Date().toISOString().split("T")[0];

    const summary = $('meta[name=description]').attr("content") || "";

    const articleBody = $(
      ".article-content, .article-body, .article_content, #artibody, .content"
    ).first();
    articleBody.find("script, style, .ad, iframe").remove();

    let content = "";
    articleBody.find("p, h2, h3, h4").each((_, el) => {
      const tag = $(el).prop("tagName")?.toLowerCase();
      const text = decodeHtmlEntities($(el).text().trim());
      if (!text) return;
      if (tag === "h2") content += "## " + text + "\n\n";
      else if (tag === "h3") content += "### " + text + "\n\n";
      else content += text + "\n\n";
    });

    // Get view/like from detail page too
    const viewMatch = pageText.match(/阅读\s*\(?\s*(\d+)\s*\)?/);
    const likeMatch = pageText.match(/点赞\s*\(?\s*(\d+)\s*\)?/);

    let ogImage =
      $('meta[property="og:image"]').attr("content") || "";
    // Sanitize: only keep valid image URLs
    if (ogImage && (!ogImage.startsWith("http") || ogImage.includes("<") || ogImage.includes("iframe") || ogImage.includes('"'))) {
      ogImage = "";
    }

    return {
      summary: summary.slice(0, 300),
      content: content || "",
      date: dateText,
      image: ogImage,
      views: viewMatch ? parseInt(viewMatch[1], 10) : 0,
      likes: likeMatch ? parseInt(likeMatch[1], 10) : 0,
    };
  } catch (err) {
    console.error(`  Failed to fetch detail: ${url}`, err.message);
    return { summary: "", content: "", date: new Date().toISOString().split("T")[0], image: "", views: 0, likes: 0 };
  }
}

// ── R2 image upload ──────────────────────────────────────────────────────────

const R2_ENDPOINT = process.env.R2_S3_CLIENT_ENDPOINT;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_ACCESS_KEY_SECRET;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

function hasR2() {
  return !!(R2_ENDPOINT && R2_KEY && R2_SECRET && R2_BUCKET && R2_PUBLIC);
}

let _s3 = null;
function getS3() {
  if (!_s3) {
    _s3 = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
    });
  }
  return _s3;
}

const MIME_MAP = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp",
  ".gif": "image/gif",
};

async function uploadImageToR2(imageUrl, articleId) {
  if (!hasR2() || !imageUrl) return imageUrl;
  try {
    const ext = (path.extname(new URL(imageUrl).pathname) || ".jpg").toLowerCase();
    const key = `images/${articleId}${ext}`;

    const res = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": "https://www.cnbeta.com.tw/",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buf = Buffer.from(await res.arrayBuffer());
    await getS3().send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: MIME_MAP[ext] || "image/jpeg",
    }));

    const r2Url = `${R2_PUBLIC}/${key}`;
    console.log(`    R2: ${key} (${(buf.length / 1024).toFixed(0)} KB)`);
    return r2Url;
  } catch (err) {
    console.log(`    R2 upload failed: ${err.message}, using original`);
    return imageUrl;
  }
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;nbsp;/g, " ")
    .replace(/\u00a0/g, " ");
}

function sanitize(s) {
  return decodeHtmlEntities(s).replace(/"/g, '\\"').replace(/\n/g, " ");
}

function makeSlug(id, title) {
  const titleSlug = (title || "")
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return id + "-" + titleSlug;
}

async function seedStats(statsArray) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log("\n[skip] DATABASE_URL not set, skipping stats seeding");
    return;
  }

  const sql = neon(dbUrl);
  console.log(`\nSeeding ${statsArray.length} article stats to database...`);

  for (const { slug, views, likes } of statsArray) {
    if (views === 0 && likes === 0) continue;
    try {
      await sql`
        INSERT INTO article_stats (slug, views, likes, created_at, updated_at)
        VALUES (${slug}, ${views}, ${likes}, now(), now())
        ON CONFLICT (slug) DO UPDATE SET
          views = GREATEST(article_stats.views, ${views}),
          likes = GREATEST(article_stats.likes, ${likes}),
          updated_at = now()
      `;
      console.log(`  [db] ${slug}: ${views} views, ${likes} likes`);
    } catch (err) {
      console.error(`  [db error] ${slug}: ${err.message}`);
    }
  }
}

async function main() {
  console.log("Fetching article list...");
  const articles = await fetchArticleList();
  console.log(`Found ${articles.length} articles\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const limit = Math.min(articles.length, 50);
  const statsToSeed = [];

  for (let i = 0; i < limit; i++) {
    const a = articles[i];
    const slug = makeSlug(a.id, a.title);
    const filePath = path.join(OUTPUT_DIR, a.id + ".mdx");

    // Check if already exists — still collect stats
    if (fs.existsSync(filePath)) {
      // Read existing slug
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(raw);
      const existingSlug = data.slug || a.id;
      // Use higher of list-page vs existing stats
      const views = Math.max(a.views, 0);
      const likes = Math.max(a.likes, 0);
      if (views > 0 || likes > 0) {
        statsToSeed.push({ slug: existingSlug, views, likes });
      }
      console.log(`[skip] ${a.title} (exists) — ${views} views, ${likes} likes`);
      continue;
    }

    console.log(`[${i + 1}/${limit}] ${a.title}`);
    const detail = await fetchArticleDetail(a.url);
    await new Promise((r) => setTimeout(r, 500));

    let image = detail.image || a.image || "";
    // Upload image to R2
    if (image) {
      image = await uploadImageToR2(image, a.id);
    }
    // Use higher count from list page vs detail page
    const views = Math.max(a.views, detail.views);
    const likes = Math.max(a.likes, detail.likes);

    const mdx =
      "---\n" +
      `title: "${sanitize(a.title)}"\n` +
      `date: "${detail.date}"\n` +
      `category: "${a.category}"\n` +
      `source: "${a.url}"\n` +
      `summary: "${sanitize(detail.summary)}"\n` +
      `image: "${image}"\n` +
      `slug: "${slug}"\n` +
      `id: "${a.id}"\n` +
      "---\n\n" +
      (detail.content || a.title) +
      "\n";

    fs.writeFileSync(filePath, mdx, "utf-8");
    console.log(`  Saved: ${a.id}.mdx — ${views} views, ${likes} likes`);

    statsToSeed.push({ slug, views, likes });
  }

  // Seed stats to database
  await seedStats(statsToSeed);

  console.log("\nDone!");
}

main().catch(console.error);
