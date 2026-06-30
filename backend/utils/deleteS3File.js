const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

async function deleteS3File(key) {
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    })
  );
}

module.exports = deleteS3File;