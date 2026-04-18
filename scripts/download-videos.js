/**
 * Download videos from posts/articles and upload to R2.
 * Only downloads short videos (<2min, <100MB).
 * Usage: node scripts/download-videos.js
 * Requires: yt-dlp installed (brew install yt-dlp or pip install yt-dlp)
 */
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { execSync } = require("child_process");
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const CONTENT_DIRS = ["content/posts", "content/news", "content/news-en"];
const R2_ENDPOINT = process.env.R2_S3_CLIENT_ENDPOINT;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_ACCESS_KEY_SECRET;
const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_PUBLIC = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
const MAX_DURATION = 120; // 2 minutes
const MAX_SIZE_MB = 100;
const TMP_DIR = path.join(process.cwd(), ".tmp-videos");

if (!R2_ENDPOINT || !R2_KEY || !R2_SECRET || !R2_BUCKET || !R2_PUBLIC) {
  console.error("Missing R2 env vars");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// Extract video URLs from MDX content
function findVideoUrls(content) {
  const urls = [];
  const patterns = [
    // YouTube
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|piped\.video\/watch\?v=)([\w-]+)/g,
    // Bilibili
    /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[\w]+)/g,
    // Twitter/X video posts
    /https?:\/\/(?:x\.com|twitter\.com)\/\w+\/status\/(\d+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      urls.push(match[0]);
    }
  }

  return [...new Set(urls)];
}

function getVideoDuration(url) {
  try {
    const result = execSync(
      `yt-dlp --get-duration "${url}" 2>/dev/null`,
      { encoding: "utf-8", timeout: 30000 }
    ).trim();
    // Parse "MM:SS" or "HH:MM:SS"
    const parts = result.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  } catch {
    return 0; // Can't determine, skip
  }
}

function downloadVideo(url, outputPath) {
  execSync(
    `yt-dlp -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best" ` +
    `--merge-output-format mp4 ` +
    `--max-filesize ${MAX_SIZE_MB}M ` +
    `-o "${outputPath}" "${url}" 2>&1`,
    { encoding: "utf-8", timeout: 300000 }
  );
}

async function uploadToR2(filePath, key) {
  const body = fs.readFileSync(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "video/mp4",
    })
  );
  return `${R2_PUBLIC}/${key}`;
}

async function main() {
  // Check yt-dlp is installed
  try {
    execSync("yt-dlp --version", { encoding: "utf-8" });
  } catch {
    console.error("yt-dlp not installed. Install with: brew install yt-dlp");
    process.exit(1);
  }

  fs.mkdirSync(TMP_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;

  for (const dir of CONTENT_DIRS) {
    const fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) continue;

    const files = fs.readdirSync(fullDir).filter((f) => f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = path.join(fullDir, file);
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);

      // Skip if already has a video_url pointing to R2
      if (data.video_url && data.video_url.startsWith(R2_PUBLIC)) continue;

      const videoUrls = findVideoUrls(content + " " + (data.link || ""));
      if (videoUrls.length === 0) continue;

      const url = videoUrls[0]; // Process first video only
      const slug = data.slug || file.replace(".mdx", "");
      const r2Key = `videos/${slug}.mp4`;

      console.log(`[${file}] Found: ${url}`);

      // Check if already in R2
      if (await existsInR2(r2Key)) {
        console.log("  Already in R2, updating MDX");
        data.video_url = `${R2_PUBLIC}/${r2Key}`;
        fs.writeFileSync(filePath, matter.stringify(content, data), "utf-8");
        continue;
      }

      // Check duration
      const duration = getVideoDuration(url);
      if (duration > MAX_DURATION) {
        console.log(`  Skip: too long (${duration}s > ${MAX_DURATION}s)`);
        skipped++;
        continue;
      }
      if (duration > 0) {
        console.log(`  Duration: ${duration}s`);
      }

      // Download
      const tmpFile = path.join(TMP_DIR, `${slug}.mp4`);
      try {
        console.log("  Downloading...");
        downloadVideo(url, tmpFile);

        if (!fs.existsSync(tmpFile)) {
          console.log("  Download produced no file, skipping");
          skipped++;
          continue;
        }

        const sizeMB = fs.statSync(tmpFile).size / (1024 * 1024);
        if (sizeMB > MAX_SIZE_MB) {
          console.log(`  Skip: too large (${sizeMB.toFixed(1)}MB)`);
          fs.unlinkSync(tmpFile);
          skipped++;
          continue;
        }

        console.log(`  Uploading to R2 (${sizeMB.toFixed(1)}MB)...`);
        const publicUrl = await uploadToR2(tmpFile, r2Key);
        fs.unlinkSync(tmpFile);

        // Update MDX
        data.video_url = publicUrl;
        fs.writeFileSync(filePath, matter.stringify(content, data), "utf-8");
        downloaded++;
        console.log(`  Done: ${publicUrl}\n`);
      } catch (err) {
        console.log(`  Error: ${err.message}`);
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        skipped++;
      }
    }
  }

  // Cleanup
  fs.rmSync(TMP_DIR, { recursive: true, force: true });

  console.log(`\nDone! Downloaded ${downloaded}, skipped ${skipped}`);
}

main().catch(console.error);
