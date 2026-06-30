const multer = require("multer");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/s3");

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
  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${getFolder(folder)}/${Date.now()}-${uuidv4()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return {
    key,
    url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
};

module.exports = {
  upload,
  uploadFileToS3,
};