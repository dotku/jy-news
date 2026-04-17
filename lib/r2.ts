import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const endpoint = process.env.R2_S3_CLIENT_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_ACCESS_KEY_SECRET;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing R2 credentials (R2_S3_CLIENT_ENDPOINT, R2_ACCESS_KEY_ID, R2_ACCESS_KEY_SECRET)"
      );
    }
    _client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

function getBucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2_BUCKET_NAME");
  return bucket;
}

function getPublicBaseUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error("Missing R2_PUBLIC_URL");
  return url.replace(/\/$/, "");
}

/**
 * Upload an image buffer to R2.
 * Returns the public URL.
 */
export async function uploadImage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `${getPublicBaseUrl()}/${key}`;
}
