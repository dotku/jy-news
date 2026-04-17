/**
 * Translate MDX articles from Chinese to English using OpenRouter free models.
 * Writes English articles to content/news-en/ as separate files.
 * Usage: node scripts/translate-articles.js
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const ZH_DIR = path.join(process.cwd(), "content/news");
const EN_DIR = path.join(process.cwd(), "content/news-en");
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemma-3-27b-it:free";
const MAX_RETRIES = 3;
const DELAY_MS = 10000;

if (!API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in environment");
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translate(text) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: `Translate the following Chinese text to English. Output ONLY the translated text, no explanations.\n\n${text}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (res.status === 429) {
      const wait = attempt * 15000;
      console.log(
        `    Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`
      );
      await sleep(wait);
      continue;
    }

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.choices[0].message.content.trim();
  }
  throw new Error("Max retries exceeded due to rate limiting");
}

async function translateArticle(title, summary, content) {
  const prompt = [
    "Translate the following Chinese article to English. Return the result in this exact format:",
    "TITLE: (translated title)",
    "SUMMARY: (translated summary)",
    "CONTENT:",
    "(translated content)",
    "",
    `原标题: ${title}`,
    `摘要: ${summary}`,
    `正文:`,
    content,
  ].join("\n");

  const result = await translate(prompt);

  const titleMatch = result.match(/TITLE:\s*(.+)/);
  const summaryMatch = result.match(/SUMMARY:\s*(.+)/);
  const contentMatch = result.match(/CONTENT:\s*([\s\S]+)/);

  return {
    titleEn: titleMatch ? titleMatch[1].trim() : "",
    summaryEn: summaryMatch ? summaryMatch[1].trim() : "",
    contentEn: contentMatch ? contentMatch[1].trim() : result,
  };
}

async function main() {
  fs.mkdirSync(EN_DIR, { recursive: true });

  const files = fs.readdirSync(ZH_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${files.length} articles (model: ${MODEL})\n`);

  let translated = 0;
  for (const file of files) {
    const enPath = path.join(EN_DIR, file);

    // Skip if English version already exists
    if (fs.existsSync(enPath)) {
      console.log(`[skip] ${file} (already translated)`);
      continue;
    }

    const zhPath = path.join(ZH_DIR, file);
    const raw = fs.readFileSync(zhPath, "utf-8");
    const { data, content } = matter(raw);

    console.log(`[translating] ${data.title || file}`);

    try {
      const { titleEn, summaryEn, contentEn } = await translateArticle(
        data.title || "",
        data.summary || "",
        content.trim()
      );

      console.log(`  -> ${titleEn}`);

      // Write English MDX
      const enData = {
        title: titleEn,
        date: data.date,
        category: data.category,
        source: data.source,
        summary: summaryEn,
        image: data.image || "",
        slug: data.slug,
        id: data.id,
        lang: "en",
        original_title: data.title,
      };
      const enMdx = matter.stringify(contentEn + "\n", enData);
      fs.writeFileSync(enPath, enMdx, "utf-8");

      // Also update zh frontmatter with title_en/summary_en
      data.title_en = titleEn;
      data.summary_en = summaryEn;
      const zhMdx = matter.stringify(content, data);
      fs.writeFileSync(zhPath, zhMdx, "utf-8");

      translated++;
      console.log(`  Done! (${translated} translated)\n`);

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  Error: ${err.message}\n`);
    }
  }

  console.log(`\nAll done! Translated ${translated} articles.`);
}

main().catch(console.error);
