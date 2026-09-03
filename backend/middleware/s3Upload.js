const multer = require("multer");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const sharp = require("sharp");
const s3 = require("../config/s3");
const { matchesImageSignature } = require("../utils/validation");

const storage = multer.memoryStorage();

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images allowed"));
    }
    cb(null, true);
  },
});

const getFolder = (type = "temp") => {
  const allowed = ["properties", "experiences", "profiles", "kyc", "receipts", "temp"];
  return allowed.includes(type) ? type : "temp";
};

const uploadFileToS3 = async (file, folder = "temp") => {
  if (!matchesImageSignature(file?.buffer, file?.mimetype)) {
    throw new Error("Uploaded file content does not match a supported image format");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${getFolder(folder)}/${Date.now()}-${uuidv4()}${ext}`;
  const optimizedKey = key.replace(/\.[^.]+$/, "-480.webp");
  const shouldCreateCardVariant = ["properties", "experiences"].includes(
    getFolder(folder)
  );

  const uploads = [
    s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        // Uploaded objects use unique, timestamped UUID keys, so they can be
        // cached permanently without risking stale replacements.
        CacheControl: "public, max-age=31536000, immutable",
      })
    ),
  ];

  if (shouldCreateCardVariant) {
    const optimizedBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 480, height: 480, fit: "cover", withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toBuffer();

    uploads.push(
      s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: optimizedKey,
          Body: optimizedBuffer,
          ContentType: "image/webp",
          CacheControl: "public, max-age=31536000, immutable",
        })
      )
    );
  }

  await Promise.all(uploads);

  return {
    key,
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    optimizedUrl: shouldCreateCardVariant
      ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${optimizedKey}`
      : null,
  };
};

module.exports = {
  upload,
  uploadFileToS3,
};
