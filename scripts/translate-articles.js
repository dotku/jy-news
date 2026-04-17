/**
 * Translate MDX articles from Chinese to English using OpenRouter.
 * Adds title_en, summary_en, and content_en to frontmatter.
 * Usage: node scripts/translate-articles.js
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const CONTENT_DIR = path.join(process.cwd(), "content/news");
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("Missing OPENROUTER_API_KEY in environment");
  process.exit(1);
}

async function translate(text) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "You are a professional translator. Translate the following Chinese text to English. Output ONLY the translated text, no explanations or formatting. Preserve paragraph breaks.",
        },
        { role: "user", content: text },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));
  console.log(`Found ${files.length} articles\n`);

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    // Skip if already translated
    if (data.title_en) {
      console.log(`[skip] ${file} (already translated)`);
      continue;
    }

    console.log(`[translating] ${data.title || file}`);

    try {
      // Translate title
      const titleEn = await translate(data.title);
      console.log(`  title_en: ${titleEn}`);

      // Translate summary
      let summaryEn = "";
      if (data.summary) {
        summaryEn = await translate(data.summary);
      }

      // Translate body content
      const contentTrimmed = content.trim();
      let contentEn = "";
      if (contentTrimmed) {
        contentEn = await translate(contentTrimmed);
      }

      // Update frontmatter
      data.title_en = titleEn;
      data.summary_en = summaryEn;

      // Write back: Chinese content first, then English below a separator
      const combinedContent = contentTrimmed + "\n\n---\n\n" + contentEn + "\n";
      const updated = matter.stringify(combinedContent, data);
      fs.writeFileSync(filePath, updated, "utf-8");

      console.log(`  Done!\n`);

      // Rate limit
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.error(`  Error: ${err.message}\n`);
    }
  }

  console.log("All done!");
}

main().catch(console.error);
