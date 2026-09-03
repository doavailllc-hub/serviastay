require("dotenv").config();

const {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const sharp = require("sharp");
const s3 = require("../config/s3");

const bucket = process.env.AWS_S3_BUCKET;
const cacheControl = "public, max-age=31536000, immutable";

if (!bucket) {
  throw new Error("AWS_S3_BUCKET is required");
}

async function exists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (["NotFound", "NoSuchKey"].includes(error.name) || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

async function createVariant(key) {
  const optimizedKey = key.replace(/\.[^.]+$/, "-480.webp");
  if (await exists(optimizedKey)) return "skipped";

  const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const source = Buffer.from(await object.Body.transformToByteArray());
  const optimized = await sharp(source)
    .rotate()
    .resize({ width: 480, height: 480, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 72, effort: 4 })
    .toBuffer();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: optimizedKey,
      Body: optimized,
      ContentType: "image/webp",
      CacheControl: cacheControl,
    })
  );
  return "created";
}

async function main() {
  let continuationToken;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "properties/",
        ContinuationToken: continuationToken,
      })
    );

    const keys = (page.Contents || [])
      .map((item) => item.Key)
      .filter((key) => /\.(jpe?g|png|webp)$/i.test(key) && !/-480\.webp$/i.test(key));

    for (const key of keys) {
      try {
        const result = await createVariant(key);
        if (result === "created") created += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed ${key}: ${error.message}`);
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  console.log(`Image variants: ${created} created, ${skipped} existing, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
