/**
 * Translate MDX articles from Chinese to English using OpenRouter free models.
 * Adds title_en, summary_en to frontmatter and appends English content.
 * Usage: node scripts/translate-articles.js
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const CONTENT_DIR = path.join(process.cwd(), "content/news");
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "google/gemma-3-27b-it:free";
const MAX_RETRIES = 3;
const DELAY_MS = 10000; // 10s between requests to stay under 8 req/min

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
      console.log(`    Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
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
  // Batch title + summary + content into one request to reduce API calls
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

  // Parse the structured response
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
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${files.length} articles (model: ${MODEL})\n`);

  let translated = 0;
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    if (data.title_en) {
      console.log(`[skip] ${file}`);
      continue;
    }

    console.log(`[translating] ${data.title || file}`);

    try {
      const { titleEn, summaryEn, contentEn } = await translateArticle(
        data.title || "",
        data.summary || "",
        content.trim()
      );

      console.log(`  -> ${titleEn}`);

      data.title_en = titleEn;
      data.summary_en = summaryEn;

      const combinedContent = content.trim() + "\n\n---\n\n" + contentEn + "\n";
      const updated = matter.stringify(combinedContent, data);
      fs.writeFileSync(filePath, updated, "utf-8");

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
