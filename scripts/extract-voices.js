/**
 * 行业之声: extract industry leaders' direct quotes from our fetched news
 * articles (content/news) and write them as posts (content/posts), replacing
 * the old X/nitter feed (nitter.net died in Aug 2026).
 *
 * Accuracy rule: a quote is kept ONLY if it appears verbatim in the article
 * body — the model may select quotes, never write or polish them.
 *
 * Usage: OPENROUTER_API_KEY=... node scripts/extract-voices.js
 *   VOICES_MAX_ARTICLES (12), VOICES_DAYS (3), VOICES_DRY_RUN=1 (print, don't write)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const matter = require("gray-matter");

const NEWS_DIR = path.join(process.cwd(), "content/news");
const POSTS_DIR = path.join(process.cwd(), "content/posts");
const SCANNED_FILE = path.join(POSTS_DIR, ".voices-scanned.json");
const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
// Paid Gemma 4 31B first (~$0.09/M input tokens, ≈$3/month at this volume); free
// models are too rate-limited to rely on and come and go (gemma-3-27b-it:free
// vanished in 2026). A model that is gone or stays rate-limited is skipped for the run.
const MODELS = (process.env.VOICES_MODELS ||
  "google/gemma-4-31b-it,google/gemma-4-31b-it:free,nvidia/nemotron-3-super-120b-a12b:free")
  .split(",").map((m) => m.trim()).filter(Boolean);
const deadModels = new Set();
const MAX_ARTICLES = Number(process.env.VOICES_MAX_ARTICLES || 12);
const DAYS = Number(process.env.VOICES_DAYS || 3);
const DRY = process.env.VOICES_DRY_RUN === "1";
const DELAY_MS = 4000;
const LEADER_ROLES = new Set(["executive", "founder", "researcher", "official"]);
// Generic or anonymous speakers are never "industry voices".
const NOT_A_NAME = /网友|发帖者|有人|用户|消费者|知情人士|人士|记者|博主|玩家|读者|该公司|公司|官方|发言人$/;

if (!API_KEY) {
  console.error("Missing OPENROUTER_API_KEY");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/\s+/g, "").replace(/[“”"「」『』]/g, "");

function loadScanned() {
  try {
    return new Set(JSON.parse(fs.readFileSync(SCANNED_FILE, "utf-8")));
  } catch {
    return new Set();
  }
}

function recentArticles(scanned) {
  const cutoff = Date.now() - DAYS * 86_400_000;
  return fs
    .readdirSync(NEWS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .flatMap((f) => {
      try {
        const { data, content } = matter(fs.readFileSync(path.join(NEWS_DIR, f), "utf-8"));
        const id = String(data.id || f.replace(/\.mdx$/, ""));
        const t = new Date(data.date).getTime();
        if (!(t >= cutoff) || scanned.has(id)) return [];
        return [{ id, slug: data.slug || id, title: data.title || "", date: data.date, category: data.category || "tech", body: content.trim() }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_ARTICLES);
}

const PROMPT = (a) => `下面是一篇中文科技新闻。请找出文中**行业领袖**亲口说的**直接引语**（在引号“”内、并明确标注了说话人的话）。

行业领袖指：企业高管（CEO、总裁、创始人、CTO 等）、知名研究者/科学家、政府官员或监管机构负责人。
不要：网友、匿名人士、普通用户、记者、博主、主持人、普通员工或前员工、游戏/内容创作者、"公司表示"等没有具体人名的说法。

只要关于**科技、产品、商业策略、行业趋势或科技政策**的观点；不要涉及个人生活、家庭、八卦、情绪化回复或没有信息量的应答（如"是的""我们会改变"）。

规则：
- "quote" 必须**逐字复制**文中引号内的原文，不得改写、删减、润色或拼接；
- 每条引语 15 到 150 个字；没有符合条件的就返回空数组 []；
- 最多返回 3 条。

只输出 JSON 数组，不要其他文字，格式：
[{"name":"说话人中文姓名","name_en":"英文名或拼音","title":"职务","org":"所属机构","role":"executive|founder|researcher|official|other","quote":"逐字引语","context":"一句话背景（20字内）","quote_en":"引语的英文翻译"}]

标题：${a.title}

正文：
${a.body.slice(0, 6000)}`;

// Models sometimes wrap the array in prose or emit two arrays; take the first
// "[ ... ]" span that parses.
function parseFirstArray(text) {
  const start = text.indexOf("[");
  if (start < 0) return [];
  for (let end = text.indexOf("]", start); end >= 0; end = text.indexOf("]", end + 1)) {
    try {
      const v = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(v)) return v;
    } catch {
      /* keep extending */
    }
  }
  return [];
}

async function callModel(model, article) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0, messages: [{ role: "user", content: PROMPT(article) }] }),
    });
    if (res.status === 429) {
      await sleep(attempt * 15000);
      continue;
    }
    if (res.status === 404 || res.status === 400) {
      const msg = (await res.text()).slice(0, 160);
      const err = new Error(`${model} ${res.status}: ${msg}`);
      err.modelGone = true;
      throw err;
    }
    if (!res.ok) throw new Error(`${model} ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const text = (await res.json()).choices?.[0]?.message?.content || "";
    return parseFirstArray(text);
  }
  const err = new Error(`${model} rate-limited after 3 attempts`);
  err.modelGone = true;
  throw err;
}

async function extract(article) {
  let last;
  for (const model of MODELS) {
    if (deadModels.has(model)) continue;
    try {
      return { items: await callModel(model, article), model };
    } catch (e) {
      last = e;
      if (e.modelGone) {
        deadModels.add(model);
        console.log(`  model unavailable, skipping for this run: ${e.message}`);
      } else break;
    }
  }
  throw last || new Error("no model available");
}

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

const yaml = (s) => JSON.stringify(String(s ?? ""));

async function main() {
  const scanned = loadScanned();
  const articles = recentArticles(scanned);
  console.log(`${articles.length} new article(s) to scan (models: ${MODELS.join(" → ")})`);
  if (articles.length === 0) return;

  let ok = 0, failed = 0, written = 0, rejected = 0;
  for (const a of articles) {
    let items, model;
    try {
      ({ items, model } = await extract(a));
      ok += 1;
    } catch (e) {
      failed += 1;
      console.log(`  [${a.id}] error: ${e.message}`);
      await sleep(DELAY_MS);
      continue;
    }
    const body = norm(a.body);
    for (const q of Array.isArray(items) ? items : []) {
      const quote = String(q.quote || "").trim();
      const name = String(q.name || "").trim();
      const why =
        !LEADER_ROLES.has(q.role) ? `role=${q.role}` :
        !name || NOT_A_NAME.test(name) ? `speaker=${name}` :
        quote.length < 15 ? "too short" :
        !body.includes(norm(quote)) ? "NOT VERBATIM" : null;
      if (why) {
        rejected += 1;
        console.log(`  [${a.id}] reject (${why}): ${name} — ${quote.slice(0, 40)}`);
        continue;
      }
      const hash = crypto.createHash("sha1").update(a.id + quote).digest("hex").slice(0, 8);
      const handle = slugify(q.name_en) || hash;
      const slug = `voice-${a.id}-${hash}`;
      // Models sometimes write "（文中未明确…）" instead of leaving a field empty.
      const clean = (v) => (/未明确|未提及|未知|不详|N\/A/i.test(String(v || "")) ? "" : String(v || "").replace(/[（(][^）)]*[）)]/g, "").trim());
      const titleLine = [clean(q.title), clean(q.org)].filter(Boolean).join(" · ");
      console.log(`  [${a.id}] ✓ ${name}（${titleLine}）：${quote.slice(0, 50)}  [${model}]`);
      if (DRY) continue;
      const mdx =
        "---\n" +
        `title: ${yaml(quote.slice(0, 60))}\n` +
        `date: ${yaml(a.date)}\n` +
        `handle: ${yaml(handle)}\n` +
        `name: ${yaml(name)}\n` +
        `author_title: ${yaml(titleLine)}\n` +
        `category: ${yaml(a.category)}\n` +
        `is_rt: false\n` +
        `original_author: ""\n` +
        `link: ""\n` +
        `image: ""\n` +
        `source_name: "cnBeta"\n` +
        `source_article: ${yaml(a.slug)}\n` +
        `context: ${yaml(q.context)}\n` +
        `quote_en: ${yaml(q.quote_en)}\n` +
        `slug: ${yaml(slug)}\n` +
        "---\n\n" +
        quote +
        "\n";
      fs.writeFileSync(path.join(POSTS_DIR, `${slug}.mdx`), mdx, "utf-8");
      written += 1;
    }
    scanned.add(a.id);
    await sleep(DELAY_MS);
  }

  if (!DRY) fs.writeFileSync(SCANNED_FILE, JSON.stringify([...scanned].slice(-3000)), "utf-8");
  console.log(`\nscanned ${ok}, failed ${failed}, quotes written ${written}, rejected ${rejected}`);
  // Fail loudly: if every call failed, the source is broken — don't report success.
  if (failed > 0 && ok === 0) {
    console.error("All extraction calls failed — failing the job so it gets noticed.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
