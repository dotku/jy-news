/**
 * Download article images and upload to R2, then update MDX files.
 * Usage: node scripts/upload-images-r2.js
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const NEWS_DIRS = ["content/news", "content/news-en"];
const ENDPOINT = process.env.R2_S3_CLIENT_ENDPOINT;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_ACCESS_KEY_SECRET;
const BUCKET = process.env.R2_BUCKET_NAME;
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY || !BUCKET || !PUBLIC_URL) {
  console.error("Missing R2 env vars (R2_S3_CLIENT_ENDPOINT, R2_ACCESS_KEY_ID, R2_ACCESS_KEY_SECRET, R2_BUCKET_NAME, R2_PUBLIC_URL)");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function getExt(url) {
  try {
    const p = new URL(url).pathname;
    const ext = path.extname(p).toLowerCase();
    return ext || ".jpg";
  } catch {
    return ".jpg";
  }
}

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Referer": "https://www.cnbeta.com.tw/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  let uploaded = 0;
  let updated = 0;

  for (const dir of NEWS_DIRS) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = path.join(fullDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);

      if (!data.image || data.image.startsWith(PUBLIC_URL)) {
        continue; // No image or already on R2
      }

      const imageUrl = data.image;
      const ext = getExt(imageUrl);
      const id = data.id || file.replace(".mdx", "");
      const key = `images/${id}${ext}`;

      console.log(`[${dir}/${file}] ${imageUrl}`);

      // Check if already uploaded
      const exists = await existsInR2(key);
      if (exists) {
        console.log(`  Already in R2, updating MDX only`);
      } else {
        try {
          const buf = await downloadImage(imageUrl);
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET,
              Key: key,
              Body: buf,
              ContentType: MIME_MAP[ext] || "image/jpeg",
            })
          );
          uploaded++;
          console.log(`  Uploaded: ${key} (${(buf.length / 1024).toFixed(0)} KB)`);
        } catch (err) {
          console.error(`  Download/upload failed: ${err.message}`);
          continue;
        }
      }

      // Update MDX
      data.image = `${PUBLIC_URL}/${key}`;
      const newMdx = matter.stringify(content, data);
      fs.writeFileSync(filePath, newMdx, "utf-8");
      updated++;
    }
  }

  console.log(`\nDone! Uploaded ${uploaded} images, updated ${updated} MDX files.`);
}

main().catch(console.error);
