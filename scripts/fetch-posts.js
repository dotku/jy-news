/**
 * Fetch latest X/Twitter posts from tracked influencers via Nitter RSS.
 * Saves posts as MDX files in content/posts/.
 * Usage: node scripts/fetch-posts.js
 */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const NITTER_BASE = "https://nitter.net";
const OUTPUT_DIR = path.join(process.cwd(), "content/posts");
const INFLUENCERS = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "config/influencers.json"), "utf-8")
);

function sanitize(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;nbsp;/g, " ")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>[^<]*<\/a>/gi, "$1")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

const { execSync } = require("child_process");

function fetchRSS(handle) {
  const url = `${NITTER_BASE}/${handle}/rss`;
  const result = execSync(
    `curl -s --max-time 15 --compressed "${url}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" -H "Accept: application/rss+xml,application/xml,text/xml"`,
    { encoding: "utf-8", maxBuffer: 1024 * 1024 }
  );
  if (!result || !result.includes("<item>")) {
    throw new Error(`Empty or invalid RSS for ${handle}`);
  }
  return result;
}

function parseRSS(xml, influencer) {
  const posts = [];
  // Split by <item> tags and parse each
  const items = xml.split("<item>").slice(1);

  for (const itemRaw of items) {
    const item = itemRaw.split("</item>")[0];
    const getTag = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].trim() : "";
    };
    const getCDATA = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
      return m ? m[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim() : "";
    };

    const title = getTag("title");
    const link = getTag("link");
    const description = getCDATA("description");
    const pubDate = getTag("pubDate");
    const guid = getTag("guid");
    const creator = getTag("dc:creator");

    // Check if it's an original post or RT
    const isRT = title.startsWith("RT by @");
    const originalAuthor = isRT ? creator : `@${influencer.handle}`;

    // Extract text content
    const content = stripHtml(description);

    // Extract image if any
    const imgMatch = description.match(/<img[^>]*src="([^"]*)"[^>]*>/);
    let image = imgMatch ? imgMatch[1] : "";
    // Fix nitter proxy URLs
    if (image.startsWith(NITTER_BASE)) {
      image = image.replace(
        `${NITTER_BASE}/pic/`,
        "https://pbs.twimg.com/"
      );
    }

    // Convert nitter link to x.com link
    const xLink = link
      .replace("https://nitter.net/", "https://x.com/")
      .replace("#m", "");

    if (!content && !title) continue;

    posts.push({
      id: guid,
      handle: influencer.handle,
      name: influencer.name,
      title: influencer.title,
      category: influencer.category,
      isRT,
      originalAuthor,
      content,
      image,
      date: new Date(pubDate).toISOString(),
      link: xLink,
    });
  }

  return posts;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalNew = 0;

  for (const influencer of INFLUENCERS) {
    console.log(`[${influencer.handle}] Fetching posts...`);

    try {
      const xml = await fetchRSS(influencer.handle);
      const posts = parseRSS(xml, influencer);
      console.log(`  Found ${posts.length} posts`);

      for (const post of posts) {
        const slug = `${post.handle}-${post.id}`;
        const filePath = path.join(OUTPUT_DIR, `${slug}.mdx`);

        if (fs.existsSync(filePath)) continue;

        const mdx =
          "---\n" +
          `title: "${sanitize(post.content.slice(0, 100))}"\n` +
          `date: "${post.date}"\n` +
          `handle: "${post.handle}"\n` +
          `name: "${post.name}"\n` +
          `author_title: "${post.title}"\n` +
          `category: "${post.category}"\n` +
          `is_rt: ${post.isRT}\n` +
          `original_author: "${post.originalAuthor}"\n` +
          `link: "${post.link}"\n` +
          `image: "${post.image}"\n` +
          `slug: "${slug}"\n` +
          "---\n\n" +
          post.content +
          "\n";

        fs.writeFileSync(filePath, mdx, "utf-8");
        totalNew++;
      }

      console.log(`  Saved ${posts.length} posts (${totalNew} new total)`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\nDone! ${totalNew} new posts saved.`);
}

main().catch(console.error);
