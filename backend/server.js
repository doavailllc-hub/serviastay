const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const http = require("http");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");
const PDFDocument = require("pdfkit");
require("dotenv").config();
const Sentry = require("@sentry/node");
const deleteS3File = require("./utils/deleteS3File");
const { canTransitionBooking, verifyHmacSignature, getWebhookEventId } = require("./utils/productionRules");
const app = express();

const server = http.createServer(app);
const rateLimit = require("express-rate-limit");
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured");
}
if (JWT_SECRET.length < 32) {
  console.warn("JWT_SECRET should be rotated to a random value of at least 32 characters");
}
const API_BASE_URL = process.env.API_BASE_URL || "https://stay.dovail.com";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://44.212.49.157",
  "http://44.212.49.157:5173",
  "http://stay.dovail.com",
  "https://stay.dovail.com",
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()),
].filter(Boolean);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const requestId = String(req.headers["x-request-id"] || crypto.randomUUID()).slice(0, 100);
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(
  "/api/payments/razorpay-webhook",
  express.raw({ type: "application/json" })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please try again later." },
});

const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { message: "Too many payment requests. Try again later." },
});
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  console.log("Razorpay initialized ✅");
} else {
  console.warn("Razorpay keys missing. Payment APIs disabled.");
}

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("DB Connection Failed:", err.message);
    process.exit(1);
  }

  connection.release();
  console.log("Connected to serviadb ✅");
});



function query(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
async function addAuditLog({
  adminId = null,
  action,
  entityType = null,
  entityId = null,
  message = null,
  metadata = null,
}) {
  try {
    await query(
      `
      INSERT INTO servia_admin_audit_logs
      (admin_id, action, entity_type, entity_id, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        adminId,
        action,
        entityType,
        entityId,
        message,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.log("AUDIT LOG ERROR:", err.message);
  }
}

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    if (!userId) return;

    const normalizedUserId = Number(userId);
    socket.userId = normalizedUserId;
    socket.join(`user_${normalizedUserId}`);
    onlineUsers.set(normalizedUserId, socket.id);

    socket.broadcast.emit("user_online", { userId: normalizedUserId });
  });

  socket.on("send_message", async (data) => {
    try {
      const senderId = Number(data.sender_id);
      const receiverId = Number(data.receiver_id);
      const propertyId = data.property_id ? Number(data.property_id) : null;
      const message = String(data.message || "").trim();

      if (!senderId || !receiverId || !message) return;

      const result = await query(
        `
        INSERT INTO servia_messages
        (sender_id, receiver_id, property_id, message, is_read)
        VALUES (?, ?, ?, ?, 0)
        `,
        [senderId, receiverId, propertyId, message]
      );

      const rows = await query(
        `
        SELECT *
        FROM servia_messages
        WHERE id=?
        LIMIT 1
        `,
        [result.insertId]
      );

      const savedMessage = rows[0];

      io.to(`user_${senderId}`).emit("receive_message", savedMessage);
      io.to(`user_${receiverId}`).emit("receive_message", savedMessage);
    } catch (err) {
      console.log("SOCKET SEND MESSAGE ERROR:", err.message);
      socket.emit("message_error", {
        message: "Message failed to send",
      });
    }
  });

  socket.on("typing", ({ sender_id, receiver_id }) => {
    if (!sender_id || !receiver_id) return;

    io.to(`user_${Number(receiver_id)}`).emit("typing", {
      sender_id: Number(sender_id),
    });
  });

  socket.on("stop_typing", ({ sender_id, receiver_id }) => {
    if (!sender_id || !receiver_id) return;

    io.to(`user_${Number(receiver_id)}`).emit("stop_typing", {
      sender_id: Number(sender_id),
    });
  });

  socket.on("message_seen", async ({ user_id, other_user_id }) => {
    try {
      if (!user_id || !other_user_id) return;

      await query(
        `
        UPDATE servia_messages
        SET is_read = 1
        WHERE receiver_id = ?
        AND sender_id = ?
        `,
        [Number(user_id), Number(other_user_id)]
      );

      io.to(`user_${Number(other_user_id)}`).emit("message_seen", {
        by: Number(user_id),
      });
    } catch (err) {
      console.log("SOCKET MESSAGE SEEN ERROR:", err.message);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit("user_offline", {
        userId: socket.userId,
      });
    }
  });
});

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const rows = await query(
      "SELECT id, email, role, is_active, kyc_status FROM servia_users WHERE id=? LIMIT 1",
      [decoded.id]
    );
    const user = rows[0];
    if (!user || Number(user.is_active ?? 1) !== 1) {
      return res.status(401).json({ message: "Account is disabled or no longer exists", code: "SESSION_REVOKED" });
    }
    req.user = { ...decoded, id: user.id, email: user.email, role: user.role || "guest", kyc_status: user.kyc_status };
    next();
  } catch (err) {
    if (err?.name !== "JsonWebTokenError" && err?.name !== "TokenExpiredError") {
      console.log("SESSION CHECK ERROR:", err.message);
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

function verifyAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
}

function requireAdminRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
      }

      const rows = await query(
        `
        SELECT admin_role, is_active
        FROM servia_users
        WHERE id = ?
        LIMIT 1
        `,
        [req.user.id]
      );

      if (!rows.length || Number(rows[0].is_active) !== 1) {
        return res.status(403).json({ message: "Admin account disabled" });
      }

      const adminRole = rows[0].admin_role || "Super Admin";

      if (adminRole === "Super Admin") {
        req.adminRole = adminRole;
        return next();
      }

      if (!allowedRoles.includes(adminRole)) {
        return res.status(403).json({
          message: "You do not have permission for this action",
        });
      }

      req.adminRole = adminRole;
      next();
    } catch (err) {
      console.log("ADMIN PERMISSION ERROR:", err.message);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
}

const { upload, uploadFileToS3 } = require("./middleware/s3Upload");
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Servia Stay API running ✅",
  });
});
/* AUTH */

function publicUser(user) {
  return {
    id: user.id,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone || null,
    role: user.role || "guest",
    profile_image: user.profile_image || null,
    kyc_status: user.kyc_status || null,
  };
}

function hashAuthCode(email, purpose, code) {
  return crypto.createHmac("sha256", JWT_SECRET)
    .update(`${email}:${purpose}:${code}`)
    .digest("hex");
}

async function saveAuthCode(email, purpose, code) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await query("DELETE FROM servia_auth_codes WHERE email=? AND purpose=?", [email, purpose]);
  await query(
    `INSERT INTO servia_auth_codes (email, purpose, code_hash, attempts, expires_at)
     VALUES (?, ?, ?, 0, ?)`,
    [email, purpose, hashAuthCode(email, purpose, code), expiresAt]
  );
}

async function consumeAuthCode(email, purpose, code) {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT * FROM servia_auth_codes
       WHERE email=? AND purpose=? AND expires_at>NOW() LIMIT 1 FOR UPDATE`,
      [email, purpose]
    );
    const record = rows[0];
    if (!record || Number(record.attempts || 0) >= 5) {
      if (record) await connection.query("DELETE FROM servia_auth_codes WHERE id=?", [record.id]);
      await connection.commit();
      return false;
    }
    const supplied = Buffer.from(hashAuthCode(email, purpose, code), "hex");
    const stored = Buffer.from(String(record.code_hash), "hex");
    const valid = supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);
    if (!valid) {
      await connection.query("UPDATE servia_auth_codes SET attempts=attempts+1 WHERE id=?", [record.id]);
      await connection.commit();
      return false;
    }
    await connection.query("DELETE FROM servia_auth_codes WHERE id=?", [record.id]);
    await connection.commit();
    return true;
  } catch (err) {
    try { await connection.rollback(); } catch {}
    throw err;
  } finally {
    connection.release();
  }
}

async function requireApprovedHost(req, res, next) {
  try {
    if (req.user?.role === "admin") return next();
    const rows = await query(
      "SELECT role, kyc_status, is_active FROM servia_users WHERE id=? LIMIT 1",
      [req.user?.id]
    );
    const user = rows[0];
    if (!user || Number(user.is_active ?? 1) !== 1) {
      return res.status(403).json({ message: "Host account is disabled" });
    }
    if (user.role !== "host" || user.kyc_status !== "Approved") {
      return res.status(403).json({
        message: "Approved host verification is required",
        code: "HOST_VERIFICATION_REQUIRED",
        kyc_status: user.kyc_status || "Not submitted",
      });
    }
    req.host = user;
    next();
  } catch (err) {
    console.log("HOST PERMISSION ERROR:", err.message);
    res.status(500).json({ message: "Host permission check failed" });
  }
}

app.post("/api/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await query("SELECT id FROM servia_users WHERE email=? LIMIT 1", [email]);

    if (exists.length) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await query(
      "INSERT INTO servia_users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
      [fullname, email, hashedPassword, "guest"]
    );

    res.json({
      success: true,
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const rows = await query("SELECT * FROM servia_users WHERE email=? LIMIT 1", [email]);

    if (!rows.length) {
      return res.status(401).json({ message: "Email not found" });
    }

    const user = rows[0];
    if (user.is_active === 0) return res.status(403).json({ message: "This account is suspended" });
    if (!user.password) return res.status(400).json({ message: "Use email verification or Google to sign in" });
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role || "guest" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role || "guest",
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

app.post("/api/user/:id/profile-image", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const oldRows = await query(
      "SELECT profile_image_key FROM servia_users WHERE id=? LIMIT 1",
      [userId]
    );

    const uploaded = await uploadFileToS3(req.file, "profiles");

    await query(
      `
      UPDATE servia_users
      SET profile_image = ?, profile_image_key = ?
      WHERE id = ?
      `,
      [uploaded.url, uploaded.key, userId]
    );

    if (oldRows.length && oldRows[0].profile_image_key) {
      await deleteS3File(oldRows[0].profile_image_key);
    }

    res.json({
      success: true,
      message: "Profile image updated",
      profile_image: uploaded.url,
      profile_image_key: uploaded.key,
    });
  } catch (err) {
    console.log("PROFILE IMAGE UPLOAD ERROR:", err.message);
    res.status(500).json({
      message: "Profile image upload failed",
      error: err.message,
    });
  }
});
app.post("/api/admin/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query(
      "SELECT * FROM servia_users WHERE email=? AND role='admin' LIMIT 1",
      [email],
      async (err, rows) => {
        if (err) {
          return res.status(500).json({ message: "Admin login failed" });
        }

        if (!rows.length) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const admin = rows[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
          return res.status(401).json({ message: "Invalid admin credentials" });
        }

        const token = jwt.sign(
          { id: admin.id, role: "admin" },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          success: true,
          message: "Admin login successful",
          token,
          admin: {
            id: admin.id,
            fullname: admin.fullname,
            email: admin.email,
            role: admin.role,
          },
        });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Admin login failed" });
  }
});
/* USER */

app.get("/api/user/:id", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, fullname, email, phone, profile_image, role FROM servia_users WHERE id=?",
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "User fetch failed", error: err.message });
  }
});

/* SINGLE UPLOAD */

app.post("/api/upload", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const folder = req.body.folder || "temp";

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const uploaded = await uploadFileToS3(req.file, folder);

    res.json({
      success: true,
      imageUrl: uploaded.url,
      imageKey: uploaded.key,
    });
  } catch (err) {
    console.log("S3 SINGLE UPLOAD ERROR:", err.message);
    res.status(500).json({ message: "Image upload failed", error: err.message });
  }
});

app.post("/api/upload/multiple", verifyToken, upload.array("images", 10), async (req, res) => {
  try {
    const folder = req.body.folder || "properties";

    if (!req.files?.length) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    const uploadedImages = await Promise.all(
      req.files.map((file) => uploadFileToS3(file, folder))
    );

    res.json({
      success: true,
      images: uploadedImages,
      imageUrls: uploadedImages.map((img) => img.url),
    });
  } catch (err) {
    console.log("S3 MULTIPLE UPLOAD ERROR:", err.message);
    res.status(500).json({ message: "Images upload failed", error: err.message });
  }
});


/* PROPERTIES */

app.get("/api/properties", async (req, res) => {
  try {
    const rows = await query(`
      SELECT *
      FROM servia_properties
      WHERE status = 'Published'
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Properties load error:", err);
    res.status(500).json({ message: "Failed to load properties" });
  }
});
app.get("/api/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const rows = await query(
      `
      SELECT *
      FROM servia_properties
      WHERE id = ?
      AND status = 'Published'
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Property not available" });
    }

    const images = await query(
      `
      SELECT id, image_url, is_cover, sort_order
      FROM servia_property_images
      WHERE property_id = ?
      ORDER BY is_cover DESC, sort_order ASC, id ASC
      `,
      [id]
    );

    res.json({
      ...rows[0],
      images,
    });
  } catch (err) {
    console.error("Property detail error:", err);
    res.status(500).json({ message: "Failed to load property" });
  }
});
app.post("/api/properties", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      category,
      location,
       latitude,
       longitude,
      price,
      guests,
      bedrooms,
      bathrooms,
      image,
      host_whatsapp,
    } = req.body;

    if (!user_id || !title || !location || !price || !image) {
      return res.status(400).json({ message: "Required property fields missing" });
    }
    if (Number(user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only create listings for your own account" });
    }

    const result = await query(
      `
      INSERT INTO servia_properties
      (user_id, title, description, category, location, price, guests, bedrooms, bathrooms, image, host_whatsapp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
      `,
      [
        req.user.id,
        title,
        description || "",
        category || "Home",
        location,
        price,
        guests || 1,
        bedrooms || 1,
        bathrooms || 1,
        image,
        host_whatsapp || null,
      ]
    );

    res.json({
      success: true,
      propertyId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Property create failed", error: err.message });
  }
});

/* AIRBNB HOST WIZARD CREATE */

app.post(
  "/api/properties/host-create",
  verifyToken,
  upload.array("images", 10),
  async (req, res) => {
    const connection = await db.promise().getConnection();
    const uploadedImages = [];
    let submissionKey = null;
    try {
      const {
        user_id,
        title,
        description,
        category,
        location,
        latitude,
        longitude,
        guests,
        bedrooms,
        beds,
        bedroomLock,
        privateAttachedBath,
        dedicatedBath,
        sharedBath,
        amenities,
        weekdayPrice,
        weekendPrice,
        client_submission_id,
        host_whatsapp,
      } = req.body;

      submissionKey = String(client_submission_id || "").trim();
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(submissionKey)) {
        return res.status(400).json({ message: "Invalid submission token. Refresh the form and try again." });
      }

      const normalizedTitle = String(title || "").trim();
      const normalizedLocation = String(location || "").trim();
      const lat = Number(latitude);
      const lng = Number(longitude);
      const guestCount = Number(guests);
      const bedroomCount = Number(bedrooms);
      const bedCount = Number(beds);
      const weekday = Number(weekdayPrice);
      const weekend = Number(weekendPrice);

      if (!user_id || normalizedTitle.length < 5 || normalizedTitle.length > 90 ||
          !normalizedLocation || normalizedLocation.length > 255 ||
          !Number.isFinite(lat) || lat < -90 || lat > 90 ||
          !Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({
          message: "Enter a valid title, location and map coordinates",
        });
      }

      if (![guestCount, bedroomCount, bedCount].every(Number.isInteger) ||
          guestCount < 1 || guestCount > 50 || bedroomCount < 1 || bedroomCount > 30 ||
          bedCount < 1 || bedCount > 50 || !Number.isFinite(weekday) || weekday <= 0 ||
          weekday > 10000000 || !Number.isFinite(weekend) || weekend <= 0 || weekend > 10000000) {
        return res.status(400).json({ message: "Enter valid capacity and pricing details" });
      }

      if (Number(user_id) !== Number(req.user.id)) {
        return res.status(403).json({ message: "You can only create listings for your own account" });
      }

      if (!req.files || req.files.length < 5) {
        return res.status(400).json({
          message: "Please upload at least 5 photos",
        });
      }

      const [userCheck] = await connection.query(
        "SELECT id FROM servia_users WHERE id=? LIMIT 1",
        [req.user.id]
      );

      if (!userCheck.length) {
        return res.status(404).json({ message: "User not found" });
      }

      try {
        await connection.query(
          "INSERT INTO servia_host_submissions (submission_key,user_id,submission_type,status) VALUES (?,?,'property','Processing')",
          [submissionKey, req.user.id]
        );
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
        const [prior] = await connection.query(
          "SELECT status,entity_id,updated_at FROM servia_host_submissions WHERE submission_key=? AND user_id=? AND submission_type='property' LIMIT 1",
          [submissionKey, req.user.id]
        );
        if (prior[0]?.status === "Completed") {
          return res.status(200).json({ success: true, message: "Listing was already submitted", propertyId: prior[0].entity_id, status: "Pending" });
        }
        const [reclaimed] = await connection.query(
          "UPDATE servia_host_submissions SET updated_at=NOW() WHERE submission_key=? AND user_id=? AND status='Processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)",
          [submissionKey, req.user.id]
        );
        if (!reclaimed.affectedRows) return res.status(409).json({ message: "This listing submission is already being processed" });
      }

      let parsedAmenities = [];

      try {
        parsedAmenities = JSON.parse(amenities || "[]");
      } catch {
        return res.status(400).json({ message: "Amenities data is invalid" });
      }

      if (!Array.isArray(parsedAmenities) || parsedAmenities.length < 3 || parsedAmenities.length > 100 ||
          parsedAmenities.some((item) => typeof item !== "string" || item.length > 100)) {
        return res.status(400).json({ message: "Select at least 3 valid amenities" });
      }

      const totalBathrooms =
        Number(privateAttachedBath || 0) +
        Number(dedicatedBath || 0) +
        Number(sharedBath || 0);

      for (const file of req.files) {
        uploadedImages.push(await uploadFileToS3(file, "properties"));
      }

const mainImage = uploadedImages[0].url;

      const propertyTitle =
        title || `Stay in ${String(location).split(",")[0] || "beautiful place"}`;

      const propertyDescription =
        description || "A beautiful and comfortable stay with modern amenities.";

      await connection.beginTransaction();

      const [propertyResult] = await connection.query(
        `
        INSERT INTO servia_properties
        (
          user_id,
          title,
          description,
          category,
          location,
          price,
          guests,
          bedrooms,
          bathrooms,
          image,
          host_whatsapp,
          latitude,
          longitude,
          beds,
          bedroom_lock,
          private_attached_bath,
          dedicated_bath,
          shared_bath,
          amenities,
          weekday_price,
          weekend_price,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          req.user.id,
          normalizedTitle,
          propertyDescription,
          category || "Home",
          normalizedLocation,
          weekday,
          guestCount,
          bedroomCount,
          totalBathrooms || 1,
          mainImage,
          host_whatsapp || null,
          lat,
          lng,
          bedCount,
          bedroomLock || null,
          Number(privateAttachedBath || 0),
          Number(dedicatedBath || 0),
          Number(sharedBath || 0),
          JSON.stringify(parsedAmenities),
          weekday,
          weekend,
          "Pending",
        ]
      );

      const propertyId = propertyResult.insertId;

const imageValues = uploadedImages.map((img, index) => [
  propertyId,
  img.url,
  img.key,
  index === 0 ? 1 : 0,
  index,
]);

await connection.query(
  `
  INSERT INTO servia_property_images
  (property_id, image_url, image_key, is_cover, sort_order)
  VALUES ?
  `,
  [imageValues]
);
      await connection.query("UPDATE servia_host_submissions SET status='Completed',entity_id=? WHERE submission_key=?", [propertyId, submissionKey]);
      await connection.commit();

      return res.json({
        success: true,
        message: "Listing submitted for review",
        propertyId,
        image: mainImage,
      });
    } catch (err) {
      try { await connection.rollback(); } catch {}
      await Promise.allSettled(uploadedImages.map((image) => deleteS3File(image.key)));
      if (submissionKey) await query("DELETE FROM servia_host_submissions WHERE submission_key=? AND status='Processing'", [submissionKey]).catch(() => {});

      console.log("HOST CREATE ERROR:", err.message);

      return res.status(500).json({
        message: "Host create failed",
        error: err.message,
      });
    } finally {
      connection.release();
    }
  }
);
app.get("/api/conversations/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const rows = await query(
      `
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.property_id,
        m.message,
        COALESCE(m.is_read, 0) AS is_read,
        m.created_at,
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END AS other_user_id,
        COALESCE(u.fullname, u.email, 'User') AS other_user_name,
        p.title AS property_title,
        p.image AS property_image,
        0 AS unread_count
      FROM servia_messages m
      LEFT JOIN servia_users u 
        ON u.id = CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END
      LEFT JOIN servia_properties p ON p.id = m.property_id
      WHERE m.id IN (
        SELECT MAX(id)
        FROM servia_messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY 
          CASE 
            WHEN sender_id = ? THEN receiver_id
            ELSE sender_id
          END
      )
      ORDER BY m.created_at DESC, m.id DESC
      `,
      [userId, userId, userId, userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.log("CONVERSATIONS FETCH ERROR:", err);
    res.status(500).json({
      message: "Conversations fetch failed",
      error: err.message,
    });
  }
});
app.post("/api/conversations/start", verifyToken, async (req, res) => {
  try {
    const senderId = Number(req.body.sender_id);
    const receiverId = Number(req.body.receiver_id);
    const propertyId = req.body.property_id ? Number(req.body.property_id) : null;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "sender_id and receiver_id are required" });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    const message =
      String(req.body.message || "").trim() ||
      "Hi, I’m interested in this stay. Is it available?";

    const result = await query(
      `
      INSERT INTO servia_messages
      (sender_id, receiver_id, property_id, message, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [senderId, receiverId, propertyId, message]
    );

    res.json({
      success: true,
      message: "Conversation started",
      messageId: result.insertId,
      otherUserId: receiverId,
    });
  } catch (err) {
    console.log("START CONVERSATION ERROR:", err.message);
    res.status(500).json({
      message: "Failed to start conversation",
      error: err.message,
    });
  }
});
app.get("/api/notifications/:userId/unread-count", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT COUNT(*) AS count
      FROM servia_notifications
      WHERE user_id=? AND is_read=false
      `,
      [req.params.userId]
    );

    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ message: "Notification count failed", error: err.message });
  }
});

app.get("/api/notifications/:userId", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT *
      FROM servia_notifications
      WHERE user_id=?
      ORDER BY id DESC
      `,
      [req.params.userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Notifications fetch failed", error: err.message });
  }
});

app.get("/api/host/reservations/:hostId", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    if (Number(req.params.hostId) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const rows = await query(
      `
      SELECT 
        b.*,
        p.title,
        p.location,
        p.image,
        p.price,
        u.fullname AS guest_name,
        u.email AS guest_email,
        u.phone AS guest_phone
      FROM servia_bookings b
      JOIN servia_properties p ON b.property_id = p.id
      JOIN servia_users u ON b.user_id = u.id
      WHERE p.user_id = ?
      ORDER BY b.id DESC
      `,
      [req.params.hostId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Host reservations fetch failed", error: err.message });
  }
});
app.get("/api/host/earnings/:hostId", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.params.hostId);

    if (Number(req.user.id) !== hostId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const summaryRows = await query(
      `
      SELECT
        COUNT(b.id) AS totalBookings,
        COALESCE(SUM(CASE WHEN b.status != 'Cancelled' THEN b.total ELSE 0 END), 0) AS totalRevenue,
        COALESCE(SUM(CASE WHEN b.status = 'Confirmed' THEN b.total ELSE 0 END), 0) AS confirmedRevenue,
        COALESCE(SUM(CASE WHEN b.status = 'Cancelled' THEN b.total ELSE 0 END), 0) AS cancelledRevenue
      FROM servia_bookings b
      JOIN servia_properties p ON p.id = b.property_id
      WHERE p.user_id = ?
      `,
      [hostId]
    );

    const monthlyRows = await query(
      `
      SELECT
        DATE_FORMAT(b.created_at, '%Y-%m') AS month,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(CASE WHEN b.status != 'Cancelled' THEN b.total ELSE 0 END), 0) AS revenue
      FROM servia_bookings b
      JOIN servia_properties p ON p.id = b.property_id
      WHERE p.user_id = ?
      GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
      `,
      [hostId]
    );

    const propertyRows = await query(
      `
      SELECT
        p.id,
        p.title,
        p.image,
        COUNT(b.id) AS bookings,
        COALESCE(SUM(CASE WHEN b.status != 'Cancelled' THEN b.total ELSE 0 END), 0) AS revenue
      FROM servia_properties p
      LEFT JOIN servia_bookings b ON b.property_id = p.id
      WHERE p.user_id = ?
      GROUP BY p.id
      ORDER BY revenue DESC
      `,
      [hostId]
    );

    res.json({
      summary: summaryRows[0],
      monthly: monthlyRows,
      properties: propertyRows,
    });
  } catch (err) {
    console.log("HOST EARNINGS ERROR:", err.message);
    res.status(500).json({
      message: "Host earnings fetch failed",
      error: err.message,
    });
  }
});


app.get("/api/my-properties/:userId", verifyToken, async (req, res) => {
  try {
    if (Number(req.params.userId) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const rows = await query(
      "SELECT * FROM servia_properties WHERE user_id=? ORDER BY id DESC",
      [req.params.userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "My properties fetch failed", error: err.message });
  }
});

app.put("/api/properties/:id", verifyToken, async (req, res) => {
  try {
    const propertyId = Number(req.params.id);
    const ownerRows = await query("SELECT user_id FROM servia_properties WHERE id=? LIMIT 1", [propertyId]);
    if (!ownerRows.length) return res.status(404).json({ message: "Property not found" });
    if (Number(ownerRows[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      title,
      description,
      category,
      location,
      price,
      guests,
      bedrooms,
      bathrooms,
      image,
    } = req.body;

    await query(
      `
      UPDATE servia_properties
      SET title=?, description=?, category=?, location=?, price=?, guests=?, bedrooms=?, bathrooms=?, image=?,
          status=CASE WHEN ?='admin' THEN status ELSE 'Pending' END
      WHERE id=?
      `,
      [
        title,
        description,
        category,
        location,
        price,
        guests,
        bedrooms,
        bathrooms,
        image,
        req.user.role,
        propertyId,
      ]
    );

    res.json({ success: true, message: "Property updated" });
  } catch (err) {
    res.status(500).json({ message: "Property update failed", error: err.message });
  }
});

app.delete("/api/properties/:id", verifyToken, async (req, res) => {
  try {
    const propertyId = Number(req.params.id);
    const ownerRows = await query("SELECT user_id FROM servia_properties WHERE id=? LIMIT 1", [propertyId]);
    if (!ownerRows.length) return res.status(404).json({ message: "Property not found" });
    if (Number(ownerRows[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const activeBookings = await query(
      "SELECT id FROM servia_bookings WHERE property_id=? AND status NOT IN ('Cancelled','Declined','Checked-out') LIMIT 1",
      [propertyId]
    );
    if (activeBookings.length) {
      return res.status(409).json({ message: "A property with active bookings cannot be deleted" });
    }

    const images = await query(
      "SELECT image_key FROM servia_property_images WHERE property_id=?",
      [propertyId]
    );

    for (const img of images) {
      if (img.image_key) {
        await deleteS3File(img.image_key);
      }
    }

    await query("DELETE FROM servia_property_images WHERE property_id=?", [propertyId]);
    await query("DELETE FROM servia_properties WHERE id=?", [propertyId]);

    res.json({
      success: true,
      message: "Property deleted",
    });
  } catch (err) {
    console.log("PROPERTY DELETE ERROR:", err.message);
    res.status(500).json({
      message: "Property delete failed",
      error: err.message,
    });
  }
});

/* PROPERTY IMAGES */

app.get("/api/property-images/:propertyId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM servia_property_images WHERE property_id=? ORDER BY sort_order ASC, id ASC",
      [req.params.propertyId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Images fetch failed", error: err.message });
  }
});

app.post("/api/property-images", verifyToken, upload.single("image"), async (req, res) => {
  try {
    const { property_id } = req.body;

    if (!property_id) {
      return res.status(400).json({ message: "property_id required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const owners = await query("SELECT user_id FROM servia_properties WHERE id=? LIMIT 1", [property_id]);
    if (!owners.length) return res.status(404).json({ message: "Property not found" });
    if (Number(owners[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const uploaded = await uploadFileToS3(req.file, "properties");

    const result = await query(
      `
      INSERT INTO servia_property_images
      (property_id,image_url,image_key,is_cover,sort_order)
      VALUES(?,?,?,?,?)
      `,
      [
        property_id,
        uploaded.url,
        uploaded.key,
        0,
        0,
      ]
    );

    res.json({
      success: true,
      image_url: uploaded.url,
      image_key: uploaded.key,
      id: result.insertId,
    });
  } catch (err) {
    res.status(500).json({
      message: "Upload failed",
      error: err.message,
    });
  }
});

app.delete("/api/property-images/:id", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `SELECT i.image_key, p.user_id FROM servia_property_images i
       JOIN servia_properties p ON p.id=i.property_id WHERE i.id=? LIMIT 1`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ message: "Image not found" });
    if (Number(rows[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (rows.length && rows[0].image_key) {
      await deleteS3File(rows[0].image_key);
    }

    await query("DELETE FROM servia_property_images WHERE id=?", [req.params.id]);

    res.json({
      success: true,
      message: "Image deleted",
    });
  } catch (err) {
    console.log("PROPERTY IMAGE DELETE ERROR:", err.message);

    res.status(500).json({
      message: "Image delete failed",
      error: err.message,
    });
  }
});
/* SEARCH */

app.get("/api/search-properties", async (req, res) => {
  try {
    const { destination, category, minPrice, maxPrice, rating, guests } = req.query;

    let sql = "SELECT * FROM servia_properties WHERE 1=1";
    const values = [];

    if (destination) {
      sql += " AND location LIKE ?";
      values.push(`%${destination}%`);
    }

    if (category) {
      sql += " AND category = ?";
      values.push(category);
    }

    if (minPrice) {
      sql += " AND price >= ?";
      values.push(Number(minPrice));
    }

    if (maxPrice) {
      sql += " AND price <= ?";
      values.push(Number(maxPrice));
    }

    if (rating) {
      sql += " AND rating >= ?";
      values.push(Number(rating));
    }

    if (guests) {
      sql += " AND guests >= ?";
      values.push(Number(guests));
    }

    sql += " ORDER BY id DESC";

    const rows = await query(sql, values);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
});

/* BOOKINGS */

app.post("/api/check-availability", async (req, res) => {
  try {
    const { property_id, checkin, checkout } = req.body;

    const propertyId = Number(property_id);
    const startDate = new Date(`${checkin}T00:00:00Z`);
    const endDate = new Date(`${checkout}T00:00:00Z`);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!propertyId || !/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout) ||
        !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate || startDate < today) {
      return res.status(400).json({ available: false, message: "Invalid booking dates" });
    }

    const rows = await query(
      `
      SELECT 'booking' AS conflict_type FROM servia_bookings
      WHERE property_id = ? AND status NOT IN ('Cancelled','Declined') AND checkin < ? AND checkout > ?
      UNION ALL
      SELECT 'calendar' AS conflict_type FROM servia_property_calendar
      WHERE property_id = ? AND status='Blocked' AND calendar_date >= ? AND calendar_date < ?
      LIMIT 1
      `,
      [propertyId, checkout, checkin, propertyId, checkin, checkout]
    );

    res.json({
      available: rows.length === 0,
      message: rows.length ? "This property is already booked" : "Property is available",
    });
  } catch (err) {
    res.status(500).json({ message: "Availability check failed", error: err.message });
  }
});

app.post("/api/properties/check-availability", verifyToken, async (req, res) => {
  try {
    const { property_id, checkin, checkout } = req.body;

    if (!property_id || !checkin || !checkout) {
      return res.status(400).json({ message: "Missing availability details" });
    }

    const startDate = new Date(`${checkin}T00:00:00Z`);
    const endDate = new Date(`${checkout}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout) ||
        !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) ||
        endDate <= startDate || startDate < today) {
      return res.status(400).json({ message: "Invalid booking dates" });
    }

    const rows = await query(
      `
      SELECT 'booking' AS conflict_type FROM servia_bookings
      WHERE property_id = ? AND status NOT IN ('Cancelled','Declined') AND checkin < ? AND checkout > ?
      UNION ALL
      SELECT 'calendar' AS conflict_type FROM servia_property_calendar
      WHERE property_id = ? AND status='Blocked' AND calendar_date >= ? AND calendar_date < ?
      LIMIT 1
      `,
      [property_id, checkout, checkin, property_id, checkin, checkout]
    );

    if (rows.length) {
      return res.status(409).json({
        available: false,
        message: "This property is already booked for these dates",
      });
    }

    res.json({
      available: true,
      message: "Property is available",
    });
  } catch (err) {
    console.log("AVAILABILITY CHECK ERROR:", err.message);
    res.status(500).json({
      message: "Availability check failed",
      error: err.message,
    });
  }
});
async function sendBookingConfirmation({
  email,
  guestName,
  propertyTitle,
  checkin,
  checkout,
  guests,
  total,
  bookingId,
}) {
  await enqueueEmail({
    to: email,
    subject: `Booking Confirmed - ${propertyTitle}`,
    type: "booking_confirmation",
    dedupeKey: `booking_confirmation:${bookingId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2>Booking Confirmed 🎉</h2>

        <p>Hello ${guestName},</p>

        <p>Your reservation has been confirmed.</p>

        <table style="border-collapse:collapse">
          <tr>
            <td><b>Booking ID</b></td>
            <td>${bookingId}</td>
          </tr>
          <tr>
            <td><b>Property</b></td>
            <td>${propertyTitle}</td>
          </tr>
          <tr>
            <td><b>Check-in</b></td>
            <td>${checkin}</td>
          </tr>
          <tr>
            <td><b>Check-out</b></td>
            <td>${checkout}</td>
          </tr>
          <tr>
            <td><b>Guests</b></td>
            <td>${guests}</td>
          </tr>
          <tr>
            <td><b>Total</b></td>
            <td>₹${Number(total).toLocaleString("en-IN")}</td>
          </tr>
        </table>

        <br>

        <a href="https://stay.dovail.com/trips"
           style="background:#3b71e6;color:#fff;padding:12px 20px;
           text-decoration:none;border-radius:8px;">
           View Booking
        </a>

        <p style="margin-top:20px">
          Thank you for choosing Dovail Stay.
        </p>
      </div>
    `,
  });
}
app.post("/api/bookings", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();

  try {
    const {
      property_id,
      checkin,
      checkout,
      guests,
      adults,
      children,
      infants,
      pets,
      payment_method,
      coupon_code,
      razorpay_order_id,
      razorpay_payment_id,
    } = req.body;

    const userId = Number(req.user?.id);
    const propertyId = Number(property_id);

    if (!userId || !propertyId || !checkin || !checkout) {
      return res.status(400).json({ message: "Missing booking details" });
    }

    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const startDate = new Date(`${checkin}T00:00:00Z`);
    const endDate = new Date(`${checkout}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!datePattern.test(checkin) || !datePattern.test(checkout) ||
        !Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) ||
        endDate <= startDate || startDate < today) {
      return res.status(400).json({ message: "Invalid booking dates" });
    }

    await connection.beginTransaction();

    const [propertyRows] = await connection.query(
      `
      SELECT id, user_id, title, price, status, guests AS max_guests
      FROM servia_properties
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [propertyId]
    );

    if (!propertyRows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Property not found" });
    }

    const property = propertyRows[0];

    if (property.status !== "Published") {
      await connection.rollback();
      return res.status(400).json({ message: "Property is not available" });
    }

    if (Number(property.user_id) === userId) {
      await connection.rollback();
      return res.status(400).json({ message: "You cannot book your own listing" });
    }

    const guestCount = Math.max(1, Number(guests || 1));
    if (!Number.isInteger(guestCount) || guestCount > Number(property.max_guests || 1)) {
      await connection.rollback();
      return res.status(400).json({
        message: "Guest count exceeds this property's capacity",
      });
    }

    const [existing] = await connection.query(
      `
      SELECT id
      FROM servia_bookings
      WHERE property_id = ?
      AND status != 'Cancelled'
      AND checkin < ?
      AND checkout > ?
      LIMIT 1
      FOR UPDATE
      `,
      [propertyId, checkout, checkin]
    );

    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "This property is already booked for these dates",
      });
    }

    const [blockedDates] = await connection.query(
      `SELECT calendar_date FROM servia_property_calendar
       WHERE property_id=? AND status='Blocked' AND calendar_date >= ? AND calendar_date < ?
       LIMIT 1 FOR UPDATE`,
      [propertyId, checkin, checkout]
    );
    if (blockedDates.length) {
      await connection.rollback();
      return res.status(409).json({ message: "The host has blocked one or more selected dates" });
    }

    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);

    const nights = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24))
    );

    const price = Number(property.price || 0);
    const subtotal = price * nights;
    const serviceFee = Math.round(subtotal * 0.08);
    const taxes = Math.round(subtotal * 0.12);

    let discount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
      const [couponRows] = await connection.query(
        `
        SELECT *
        FROM servia_coupons
        WHERE UPPER(code) = UPPER(?)
        AND is_active = 1
        LIMIT 1
        `,
        [coupon_code]
      );

      if (!couponRows.length) {
        await connection.rollback();
        return res.status(400).json({ message: "Invalid coupon" });
      }

      const coupon = couponRows[0];
      const baseAmount = subtotal + serviceFee + taxes;
      const minimumAmount = Number(coupon.minimum_amount || 0);
      const maxDiscount = Number(coupon.max_discount || 0);

      if (baseAmount < minimumAmount) {
        await connection.rollback();
        return res.status(400).json({
          message: `Minimum booking amount for this coupon is ₹${minimumAmount}`,
        });
      }

      if (coupon.discount_type === "percentage") {
        discount = Math.round(
          baseAmount * (Number(coupon.discount_value || 0) / 100)
        );
      } else {
        discount = Number(coupon.discount_value || 0);
      }

      if (maxDiscount > 0) {
        discount = Math.min(discount, maxDiscount);
      }

      discount = Math.max(0, discount);
      appliedCoupon = coupon.code;
    }

    const total = Math.max(subtotal + serviceFee + taxes - discount, 0);

    if (payment_method === "razorpay") {
      if (!razorpay_order_id || !razorpay_payment_id) {
        await connection.rollback();
        return res.status(400).json({
          message: "Payment details missing",
        });
      }

      if (!razorpay) {
        await connection.rollback();
        return res.status(503).json({ message: "Payment gateway not configured" });
      }

      const [duplicatePayments] = await connection.query(
        "SELECT id FROM servia_bookings WHERE payment_id=? OR razorpay_order_id=? LIMIT 1 FOR UPDATE",
        [razorpay_payment_id, razorpay_order_id]
      );
      if (duplicatePayments.length) {
        await connection.rollback();
        return res.status(409).json({ message: "This payment has already been used" });
      }

      const [payment, order] = await Promise.all([
        razorpay.payments.fetch(razorpay_payment_id),
        razorpay.orders.fetch(razorpay_order_id),
      ]);
      const notes = order.notes || {};
      if (
        payment.order_id !== razorpay_order_id ||
        payment.status !== "captured" ||
        Number(payment.amount) !== Math.round(total * 100) ||
        order.currency !== "INR" ||
        String(notes.user_id) !== String(userId) ||
        String(notes.property_id) !== String(propertyId) ||
        String(notes.checkin) !== String(checkin) ||
        String(notes.checkout) !== String(checkout)
      ) {
        await connection.rollback();
        return res.status(400).json({ message: "Payment does not match this booking" });
      }
    }

    const [result] = await connection.query(
      `
      INSERT INTO servia_bookings
      (
        property_id,
        user_id,
        checkin,
        checkout,
        guests,
        total,
        status,
        payment_method,
        payment_status,
        razorpay_order_id,
        payment_id,
        coupon_code,
        discount
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        propertyId,
        userId,
        checkin,
        checkout,
        guestCount,
        total,
        payment_method === "razorpay" ? "Confirmed" : "Pending",
        payment_method || "razorpay",
        payment_method === "razorpay" ? "Paid" : "Pending",
        razorpay_order_id || null,
        razorpay_payment_id || null,
        appliedCoupon,
        discount,
      ]
    );

    if (appliedCoupon) {
      await connection.query(
        `
        UPDATE servia_coupons
        SET used_count = COALESCE(used_count, 0) + 1
        WHERE UPPER(code) = UPPER(?)
        `,
        [appliedCoupon]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId,
      pricing: {
        nights,
        price,
        subtotal,
        serviceFee,
        taxes,
        discount,
        total,
      },
    });

    try {
      const users = await query(
        "SELECT fullname, email FROM servia_users WHERE id = ? LIMIT 1",
        [userId]
      );

      const properties = await query(
        `
        SELECT p.title, u.email AS host_email, u.fullname AS host_name
        FROM servia_properties p
        LEFT JOIN servia_users u ON p.user_id = u.id
        WHERE p.id = ?
        LIMIT 1
        `,
        [propertyId]
      );

      const guest = users[0];
      const bookedProperty = properties[0];

      if (guest?.email) {
        await sendBookingConfirmation({
          email: guest.email,
          guestName: guest.fullname || "Guest",
          propertyTitle: bookedProperty?.title || "Dovail Stay",
          checkin,
          checkout,
          guests: Number(guests || 1),
          total,
          bookingId: result.insertId,
        });
      }

      if (bookedProperty?.host_email && typeof sendEmail === "function") {
        await sendEmail({
          to: bookedProperty.host_email,
          subject: "New Booking Received - Dovail Stay",
          html: `
            <h2>New Booking Received 🏡</h2>
            <p>Hi ${bookedProperty.host_name || "Host"},</p>
            <p>Your property has received a new booking.</p>
            <p><b>Guest:</b> ${guest?.fullname || "Guest"}</p>
            <p><b>Property:</b> ${bookedProperty?.title || "Dovail Stay"}</p>
            <p><b>Check-in:</b> ${checkin}</p>
            <p><b>Check-out:</b> ${checkout}</p>
            <p><b>Guests:</b> ${Number(guests || 1)}</p>
            <p><b>Total:</b> ₹${Number(total || 0).toLocaleString("en-IN")}</p>
          `,
        });
      }
    } catch (emailErr) {
      console.log("BOOKING EMAIL ERROR:", emailErr.message);
    }
  } catch (err) {
    try {
      await connection.rollback();
    } catch {}

    console.log("BOOKING ERROR:", err.message);

    res.status(500).json({
      message: "Booking failed",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});
/* WISHLIST */

app.post("/api/wishlist", verifyToken, async (req, res) => {
  try {
    const { user_id, property_id } = req.body;

    const exists = await query(
      "SELECT id FROM servia_wishlist WHERE user_id=? AND property_id=?",
      [user_id, property_id]
    );

    if (exists.length) {
      return res.status(409).json({ message: "Already in wishlist" });
    }

    const result = await query(
      "INSERT INTO servia_wishlist (user_id, property_id) VALUES (?, ?)",
      [user_id, property_id]
    );
    res.json({
      success: true,
      wishlistId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Wishlist failed", error: err.message });
  }
});

app.get("/api/wishlist/:userId", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT w.id AS wishlist_id, p.*
      FROM servia_wishlist w
      JOIN servia_properties p ON w.property_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.id DESC
      `,
      [req.params.userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Wishlist fetch failed", error: err.message });
  }
});
app.delete("/api/wishlist/:wishlistId", verifyToken, async (req, res) => {
  try {
    const wishlistId = Number(req.params.wishlistId);
    const userId = Number(req.user.id);

    if (!wishlistId) {
      return res.status(400).json({
        message: "Invalid wishlist id",
      });
    }

    const result = await query(
      `
      DELETE FROM servia_wishlist
      WHERE id = ? AND user_id = ?
      `,
      [wishlistId, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Wishlist item not found",
      });
    }

    return res.json({
      success: true,
      message: "Removed from wishlist",
    });
  } catch (err) {
    console.log("WISHLIST DELETE ERROR:", err.message);

    return res.status(500).json({
      message: "Wishlist delete failed",
      error: err.message,
    });
  }
});
/* ADMIN */

app.get("/api/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await query("SELECT COUNT(*) AS totalUsers FROM servia_users");
    const properties = await query("SELECT COUNT(*) AS totalProperties FROM servia_properties");
    const bookings = await query("SELECT COUNT(*) AS totalBookings FROM servia_bookings");
    const revenue = await query(
      "SELECT COALESCE(SUM(total),0) AS totalRevenue FROM servia_bookings WHERE status!='Cancelled'"
    );

    res.json({
      totalUsers: users[0].totalUsers,
      totalProperties: properties[0].totalProperties,
      totalBookings: bookings[0].totalBookings,
      totalRevenue: revenue[0].totalRevenue,
    });
  } catch (err) {
    res.status(500).json({ message: "Stats failed", error: err.message });
  }
});

app.get("/api/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = await query(
      "SELECT id, fullname, email, phone, role, IF(COALESCE(is_active,1)=1,'active','suspended') AS status, created_at FROM servia_users ORDER BY id DESC"
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Users fetch failed", error: err.message });
  }
});

app.get("/api/admin/properties", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT p.*, u.fullname AS host_name, u.email AS host_email
      FROM servia_properties p
      LEFT JOIN servia_users u ON p.user_id = u.id
      ORDER BY p.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Admin properties failed", error: err.message });
  }
});

app.get("/api/admin/bookings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        b.*,
        p.title AS property_title,
        p.image,
        guest.fullname AS guest_name,
        host.fullname AS host_name
      FROM servia_bookings b
      JOIN servia_properties p ON b.property_id = p.id
      JOIN servia_users guest ON b.user_id = guest.id
      LEFT JOIN servia_users host ON p.user_id = host.id
      ORDER BY b.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Admin bookings failed", error: err.message });
  }
});

/* ERROR HANDLER */
/* ADMIN PROPERTY DELETE */
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message: err.message,
    });
  }

  res.status(500).json({
    message: err.message || "Internal server error",
  });
});
app.delete("/api/admin/properties/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const activeBookings = await query(
      "SELECT id FROM servia_bookings WHERE property_id=? AND status NOT IN ('Cancelled','Declined','Checked-out') LIMIT 1",
      [req.params.id]
    );
    if (activeBookings.length) {
      return res.status(409).json({ message: "Archive this property after its active bookings are completed" });
    }
    await query("DELETE FROM servia_property_images WHERE property_id=?", [
      req.params.id,
    ]);

    await query("DELETE FROM servia_wishlist WHERE property_id=?", [
      req.params.id,
    ]);

    await query("DELETE FROM servia_properties WHERE id=?", [req.params.id]);

    await addAuditLog({
      adminId: req.user.id, action: "PROPERTY_DELETED", entityType: "property",
      entityId: Number(req.params.id), message: `Property #${req.params.id} deleted by admin`,
    });

    res.json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (err) {
    console.log("ADMIN PROPERTY DELETE ERROR:", err.message);

    res.status(500).json({
      message: "Property delete failed",
      error: err.message,
    });
  }
});

app.post("/api/payments/create-order", paymentLimiter, verifyToken, async (req, res) => {
  if (!razorpay) {
    return res.status(503).json({ message: "Payment gateway not configured" });
  }

  try {
    const {
      property_id,
      checkin,
      checkout,
      guests,
      adults,
      children,
      infants,
      pets,
      coupon_code,
    } = req.body;

    const userId = Number(req.user?.id);

    if (!userId || !property_id || !checkin || !checkout) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    if (checkout <= checkin) {
      return res.status(400).json({ message: "Invalid checkout date" });
    }

    const properties = await query(
      `
      SELECT id, user_id, price, status, guests AS max_guests
      FROM servia_properties
      WHERE id = ?
      LIMIT 1
      `,
      [property_id]
    );

    if (!properties.length) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (properties[0].status !== "Published") {
      return res.status(400).json({ message: "Property is not available" });
    }

    if (Number(properties[0].user_id) === userId) {
      return res.status(400).json({ message: "You cannot book your own listing" });
    }

    const guestCount = Math.max(1, Number(guests || 1));
    if (!Number.isInteger(guestCount) || guestCount > Number(properties[0].max_guests || 1)) {
      return res.status(400).json({ message: "Guest count exceeds this property's capacity" });
    }

    const existing = await query(
      `
      SELECT id
      FROM servia_bookings
      WHERE property_id = ?
      AND status != 'Cancelled'
      AND checkin < ?
      AND checkout > ?
      LIMIT 1
      `,
      [property_id, checkout, checkin]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "This property is already booked for these dates",
      });
    }

    const start = new Date(`${checkin}T00:00:00`);
    const end = new Date(`${checkout}T00:00:00`);

    const nights = Math.max(
      1,
      Math.round((end - start) / (1000 * 60 * 60 * 24))
    );

    const price = Number(properties[0].price || 0);
    const subtotal = price * nights;
    const serviceFee = Math.round(subtotal * 0.08);
    const taxes = Math.round(subtotal * 0.12);

    let discount = 0;
    let appliedCoupon = null;

    if (coupon_code) {
      const couponRows = await query(
        `
        SELECT *
        FROM servia_coupons
        WHERE UPPER(code) = UPPER(?)
        AND is_active = 1
        LIMIT 1
        `,
        [coupon_code]
      );

      if (!couponRows.length) {
        return res.status(400).json({ message: "Invalid coupon" });
      }

      const coupon = couponRows[0];
      const minimumAmount = Number(coupon.minimum_amount || 0);
      const maxDiscount = Number(coupon.max_discount || 0);

      const baseAmount = subtotal + serviceFee + taxes;

      if (baseAmount < minimumAmount) {
        return res.status(400).json({
          message: `Minimum booking amount for this coupon is ₹${minimumAmount}`,
        });
      }

      if (coupon.discount_type === "percentage") {
        discount = Math.round(baseAmount * (Number(coupon.discount_value || 0) / 100));
      } else {
        discount = Number(coupon.discount_value || 0);
      }

      if (maxDiscount > 0) {
        discount = Math.min(discount, maxDiscount);
      }

      discount = Math.max(0, discount);
      appliedCoupon = coupon.code;
    }

    const total = Math.max(subtotal + serviceFee + taxes - discount, 0);

    if (total <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: `servia_${Date.now()}`,
      notes: {
        property_id: String(property_id),
        user_id: String(userId),
        checkin,
        checkout,
        guests: String(guestCount),
        adults: String(adults || 1),
        children: String(children || 0),
        infants: String(infants || 0),
        pets: String(pets || 0),
        coupon_code: appliedCoupon || "",
      },
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      order,
      priceDetails: {
        nights,
        price,
        subtotal,
        serviceFee,
        taxes,
        discount,
        total,
        couponCode: appliedCoupon,
      },
    });
  } catch (err) {
    console.log("RAZORPAY ORDER ERROR:", err);
    res.status(500).json({
      message: "Payment order creation failed",
      error: err.message,
    });
  }
});

app.post("/api/payments/verify", verifyToken, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ message: "Payment gateway not configured" });
    }

    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Payment verification details are incomplete" });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const signatureBuffer = Buffer.from(String(razorpay_signature));
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const [payment, order] = await Promise.all([
      razorpay.payments.fetch(razorpay_payment_id),
      razorpay.orders.fetch(razorpay_order_id),
    ]);
    if (
      payment.order_id !== razorpay_order_id ||
      payment.status !== "captured" ||
      String(order.notes?.user_id) !== String(req.user.id)
    ) {
      return res.status(400).json({ message: "Payment ownership verification failed" });
    }

    if (booking_id) {
      const result = await query(
        `
        UPDATE servia_bookings
        SET razorpay_order_id=?, payment_id=?, payment_status=?, status=?
        WHERE id=? AND user_id=?
          AND (payment_id IS NULL OR payment_id=?)
        `,
        [razorpay_order_id, razorpay_payment_id, "Paid", "Confirmed", booking_id, req.user.id, razorpay_payment_id]
      );
      if (!result.affectedRows) return res.status(404).json({ message: "Booking not found or payment already used" });
    }

    res.json({ success: true, message: "Payment verified" });
  } catch (err) {
    console.log("RAZORPAY VERIFY ERROR:", err.message);
    res.status(500).json({ message: "Payment verification failed" });
  }
});
app.get("/api/trip/:id", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        b.*,
        p.title,
        p.location,
        p.image,
        p.price,
        p.rating,
        p.description,
        p.guests AS property_guests,
        p.bedrooms,
        p.bathrooms,
        host.fullname AS host_name,
        guest.fullname AS guest_name,
        guest.email AS guest_email
      FROM servia_bookings b
      JOIN servia_properties p ON b.property_id = p.id
      LEFT JOIN servia_users host ON p.user_id = host.id
      LEFT JOIN servia_users guest ON b.user_id = guest.id
      WHERE b.id = ?
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.log("TRIP DETAILS ERROR:", err.message);
    res.status(500).json({
      message: "Trip fetch failed",
      error: err.message,
    });
  }
});
/* START */
app.post("/api/auth/send-otp", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await saveAuthCode(email, "login", otp);

    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: "Your Dovail Stay verification code",
      html: `
        <h2>Dovail Stay</h2>
        <p>Your verification code is:</p>
        <h1>${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      `,
    });

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.log("SEND OTP ERROR:", err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    if (!/^\d{6}$/.test(otp) || !(await consumeAuthCode(email, "login", otp))) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    let users = await query("SELECT * FROM servia_users WHERE email=? LIMIT 1", [
      email,
    ]);

    let user;

    if (!users.length) {
      const result = await query(
        "INSERT INTO servia_users (fullname, email, role) VALUES (?, ?, ?)",
        ["Dovail Guest", email, "guest"]
      );

      users = await query("SELECT * FROM servia_users WHERE id=? LIMIT 1", [
        result.insertId,
      ]);
    }

    user = users[0];
    if (user.is_active === 0) return res.status(403).json({ message: "This account is suspended" });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role || "guest",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.log("VERIFY OTP ERROR:", err.message);
    res.status(500).json({ message: "OTP verification failed" });
  }
});


app.put(
  "/api/messages/read/:userId/:otherUserId",
  verifyToken,
  async (req, res) => {
    try {
      const { userId, otherUserId } = req.params;

      await query(
        `
        UPDATE servia_messages
        SET is_read = 1
        WHERE receiver_id = ?
        AND sender_id = ?
        `,
        [userId, otherUserId]
      );

      res.json({
        success: true,
      });
    } catch (err) {
      res.status(500).json({
        message: "Read update failed",
        error: err.message,
      });
    }
  }
);

app.get("/api/messages/:userId/:otherUserId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const otherUserId = Number(req.params.otherUserId);

    const rows = await query(
      `
      SELECT *
      FROM servia_messages
      WHERE
      (sender_id=? AND receiver_id=?)
      OR
      (sender_id=? AND receiver_id=?)
      ORDER BY created_at ASC
      `,
      [userId, otherUserId, otherUserId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.log("MESSAGES FETCH ERROR:", err.message);
    res.status(500).json({
      message: "Messages fetch failed",
      error: err.message,
    });
  }
});

app.put("/api/messages/read/:userId/:otherUserId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const otherUserId = Number(req.params.otherUserId);

    await query(
      `
      UPDATE servia_messages
      SET is_read = 1
      WHERE receiver_id = ?
      AND sender_id = ?
      `,
      [userId, otherUserId]
    );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (err) {
    console.log("MARK READ ERROR:", err.message);
    res.status(500).json({
      message: "Read update failed",
      error: err.message,
    });
  }
});
app.get("/api/properties/:id/booked-dates", async (req, res) => {
  try {
    const bookingRows = await query(
      `
      SELECT checkin, checkout, 'Booked' AS type
      FROM servia_bookings
      WHERE property_id = ?
      AND status NOT IN ('Cancelled', 'Declined')
      `,
      [req.params.id]
    );

    const blockedRows = await query(
      `
      SELECT 
        calendar_date AS checkin,
        DATE_ADD(calendar_date, INTERVAL 1 DAY) AS checkout,
        'Blocked' AS type
      FROM servia_property_calendar
      WHERE property_id = ?
      AND status = 'Blocked'
      `,
      [req.params.id]
    );

    res.json([...bookingRows, ...blockedRows]);
  } catch (err) {
    console.log("BOOKED DATES ERROR:", err.message);
    res.status(500).json({
      message: "Booked dates fetch failed",
      error: err.message,
    });
  }
});
app.put("/api/notifications/:userId/mark-read", verifyToken, async (req, res) => {
  try {
    await query(
      `
      UPDATE servia_notifications
      SET is_read = 1
      WHERE user_id = ?
      `,
      [req.params.userId]
    );

    res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (err) {
    console.log("NOTIFICATION MARK READ ERROR:", err.message);
    res.status(500).json({
      message: "Notification update failed",
      error: err.message,
    });
  }
});


app.post("/api/reviews", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const propertyId = Number(req.body.property_id);
    const bookingId = Number(req.body.booking_id);

    const rating = Number(req.body.rating || 5);
    const review = String(req.body.review || "").trim();

    const cleanliness = Number(req.body.cleanliness_rating || rating);
    const accuracy = Number(req.body.accuracy_rating || rating);
    const communication = Number(req.body.communication_rating || rating);
    const location = Number(req.body.location_rating || rating);
    const checkin = Number(req.body.checkin_rating || rating);
    const value = Number(req.body.value_rating || rating);

    if (!propertyId || !bookingId || !review) {
      return res.status(400).json({
        message: "Property, booking and review are required",
      });
    }

    const bookingRows = await query(
      `
      SELECT id
      FROM servia_bookings
      WHERE id = ?
      AND property_id = ?
      AND user_id = ?
      AND status IN ('Checked-out','Completed')
      LIMIT 1
      `,
      [bookingId, propertyId, userId]
    );

    if (!bookingRows.length) {
      return res.status(403).json({
        message: "You can review only after completed stay",
      });
    }

    const existing = await query(
      `
      SELECT id
      FROM servia_reviews
      WHERE booking_id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [bookingId, userId]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "You already reviewed this booking",
      });
    }

    await query(
      `
      INSERT INTO servia_reviews
      (
        property_id,
        booking_id,
        user_id,
        rating,
        review,
        cleanliness_rating,
        accuracy_rating,
        communication_rating,
        location_rating,
        checkin_rating,
        value_rating,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')
      `,
      [
        propertyId,
        bookingId,
        userId,
        rating,
        review,
        cleanliness,
        accuracy,
        communication,
        location,
        checkin,
        value,
      ]
    );

    const avgRows = await query(
      `
      SELECT ROUND(AVG(rating), 1) AS avg_rating
      FROM servia_reviews
      WHERE property_id = ?
      AND COALESCE(status, 'Approved') = 'Approved'
      `,
      [propertyId]
    );

    await query(
      `
      UPDATE servia_properties
      SET rating = ?
      WHERE id = ?
      `,
      [avgRows[0]?.avg_rating || 5, propertyId]
    );

    res.json({
      success: true,
      message: "Review added successfully",
    });
  } catch (err) {
    console.log("REVIEW CREATE ERROR:", err.message);
    res.status(500).json({
      message: "Review submit failed",
      error: err.message,
    });
  }
});
app.get("/api/reviews/:propertyId", async (req, res) => {
  try {
    const propertyId = Number(req.params.propertyId);

    const rows = await query(
      `
      SELECT 
        r.*,
        COALESCE(u.fullname, u.email, 'Guest') AS guest_name,
        u.profile_image AS guest_image
      FROM servia_reviews r
      LEFT JOIN servia_users u ON u.id = r.user_id
      WHERE r.property_id = ?
      AND COALESCE(r.status, 'Approved') = 'Approved'
      ORDER BY r.id DESC
      `,
      [propertyId]
    );

    const summaryRows = await query(
      `
      SELECT
        ROUND(AVG(rating), 1) AS average_rating,
        COUNT(*) AS total_reviews,
        ROUND(AVG(cleanliness_rating), 1) AS cleanliness,
        ROUND(AVG(accuracy_rating), 1) AS accuracy,
        ROUND(AVG(communication_rating), 1) AS communication,
        ROUND(AVG(location_rating), 1) AS location,
        ROUND(AVG(checkin_rating), 1) AS checkin,
        ROUND(AVG(value_rating), 1) AS value
      FROM servia_reviews
      WHERE property_id = ?
      AND COALESCE(status, 'Approved') = 'Approved'
      `,
      [propertyId]
    );

    res.json({
      reviews: rows,
      summary: summaryRows[0],
    });
  } catch (err) {
    console.log("REVIEWS LOAD ERROR:", err.message);
    res.status(500).json({
      message: "Reviews load failed",
      error: err.message,
    });
  }
});

app.get("/api/host/reviews/:hostId", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.params.hostId);
    if (hostId !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const rows = await query(
      `SELECT r.*, u.fullname AS guest_name, u.profile_image AS guest_image,
              p.title AS property_title, p.image AS property_image
       FROM servia_reviews r
       JOIN servia_properties p ON p.id=r.property_id
       LEFT JOIN servia_users u ON u.id=r.user_id
       WHERE p.user_id=? ORDER BY r.id DESC`,
      [hostId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Host reviews failed to load" });
  }
});

async function enqueueEmail({ to, subject, html, type = "transactional", dedupeKey = null }) {
  if (!to || !subject || !html) return null;
  try {
    const result = await query(
      `INSERT INTO servia_email_outbox
       (recipient,subject,html_body,email_type,dedupe_key,status,next_attempt_at)
       VALUES (?,?,?,?,?,'Pending',NOW())`,
      [String(to).trim().toLowerCase(), String(subject).slice(0, 255), html, type, dedupeKey]
    );
    return result.insertId;
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY" && dedupeKey) return null;
    throw error;
  }
}

let emailWorkerBusy = false;
async function processEmailOutbox() {
  if (emailWorkerBusy) return;
  emailWorkerBusy = true;
  try {
    for (let count = 0; count < 10; count += 1) {
      const connection = await db.promise().getConnection();
      let email = null;
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query(
          `SELECT * FROM servia_email_outbox
           WHERE status IN ('Pending','Retry') AND next_attempt_at <= NOW()
           ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
        );
        if (!rows.length) { await connection.rollback(); break; }
        email = rows[0];
        await connection.query("UPDATE servia_email_outbox SET status='Sending',attempts=attempts+1 WHERE id=?", [email.id]);
        await connection.commit();
      } finally { connection.release(); }

      try {
        await transporter.sendMail({ from: process.env.MAIL_FROM, to: email.recipient, subject: email.subject, html: email.html_body });
        await query("UPDATE servia_email_outbox SET status='Sent',sent_at=NOW(),last_error=NULL WHERE id=?", [email.id]);
      } catch (error) {
        const exhausted = Number(email.attempts || 0) + 1 >= Number(email.max_attempts || 5);
        const delayMinutes = Math.min(60, 2 ** Math.max(1, Number(email.attempts || 0) + 1));
        await query(
          `UPDATE servia_email_outbox SET status=?,last_error=?,
           next_attempt_at=DATE_ADD(NOW(),INTERVAL ? MINUTE) WHERE id=?`,
          [exhausted ? "Failed" : "Retry", String(error.message).slice(0, 1000), delayMinutes, email.id]
        );
      }
    }
  } catch (error) {
    console.log("EMAIL OUTBOX ERROR:", error.message);
  } finally { emailWorkerBusy = false; }
}

async function startEmailWorker() {
  await query(
    "UPDATE servia_email_outbox SET status='Retry',next_attempt_at=NOW(),last_error='Recovered after worker restart' WHERE status='Sending' AND updated_at < DATE_SUB(NOW(),INTERVAL 10 MINUTE)"
  );
  processEmailOutbox();
  const timer = setInterval(processEmailOutbox, 15000);
  timer.unref();
}

app.get("/health", (req, res) => res.json({ status: "ok", uptime_seconds: Math.round(process.uptime()) }));
app.get("/ready", async (req, res) => {
  try {
    await query("SELECT 1 AS ready");
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "not_ready" });
  }
});

app.put("/api/reviews/:id/reply", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const hostReply = String(req.body.host_reply || "").trim();

    if (!hostReply) {
      return res.status(400).json({ message: "Reply is required" });
    }

    const rows = await query(
      `
      SELECT r.id, p.user_id AS host_id
      FROM servia_reviews r
      JOIN servia_properties p ON p.id = r.property_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [reviewId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (Number(rows[0].host_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await query(
      `
      UPDATE servia_reviews
      SET host_reply = ?
      WHERE id = ?
      `,
      [hostReply, reviewId]
    );

    res.json({
      success: true,
      message: "Reply added",
    });
  } catch (err) {
    console.log("HOST REVIEW REPLY ERROR:", err.message);
    res.status(500).json({
      message: "Reply failed",
      error: err.message,
    });
  }
});
app.get("/api/admin/users/:id/details", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    const users = await query(
      `
      SELECT id, fullname, email, phone, role, profile_image, kyc_status, created_at
      FROM servia_users
      WHERE id=?
      LIMIT 1
      `,
      [userId]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const bookings = await query(
      `
      SELECT b.*, p.title, p.location, p.image
      FROM servia_bookings b
      LEFT JOIN servia_properties p ON p.id=b.property_id
      WHERE b.user_id=?
      ORDER BY b.id DESC
      LIMIT 20
      `,
      [userId]
    );

    const listings = await query(
      `
      SELECT id, title, location, price, status, image, rating
      FROM servia_properties
      WHERE user_id=?
      ORDER BY id DESC
      LIMIT 20
      `,
      [userId]
    );

    const bank = await query(
      `SELECT * FROM servia_host_bank_accounts WHERE host_id=? LIMIT 1`,
      [userId]
    ).catch(() => []);

    const kyc = await query(
      `SELECT * FROM servia_host_kyc WHERE host_id=? LIMIT 1`,
      [userId]
    ).catch(() => []);

    const wallet = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type='earning' THEN amount ELSE 0 END),0) AS earnings,
        COALESCE(SUM(CASE WHEN type='payout' THEN amount ELSE 0 END),0) AS payouts
      FROM servia_host_wallet_transactions
      WHERE host_id=?
      `,
      [userId]
    ).catch(() => [{ earnings: 0, payouts: 0 }]);

    const payouts = await query(
      `
      SELECT *
      FROM servia_host_payouts
      WHERE host_id=?
      ORDER BY id DESC
      LIMIT 20
      `,
      [userId]
    ).catch(() => []);

    const reviews = await query(
      `
      SELECT r.*, p.title AS property_title
      FROM servia_reviews r
      LEFT JOIN servia_properties p ON p.id=r.property_id
      WHERE r.user_id=?
      ORDER BY r.id DESC
      LIMIT 20
      `,
      [userId]
    ).catch(() => []);

    res.json({
      success: true,
      user: users[0],
      bookings,
      listings,
      bank: bank[0] || null,
      kyc: kyc[0] || null,
      wallet: wallet[0] || { earnings: 0, payouts: 0 },
      payouts,
      reviews,
      activity: [],
      security: {
        email_verified: true,
        phone_verified: Boolean(users[0].phone),
        last_login: null,
      },
    });
  } catch (err) {
    console.log("ADMIN USER DETAILS ERROR:", err.message);
    res.status(500).json({
      message: "User details load failed",
      error: err.message,
    });
  }
});
app.get("/api/user/:id", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const rows = await query(
      `
      SELECT 
        id,
        fullname,
        email,
        phone,
        role,
        profile_image,
        created_at
      FROM servia_users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.log("USER LOAD ERROR:", err.message);
    res.status(500).json({
      message: "User load failed",
      error: err.message,
    });
  }
});

app.put("/api/user/:id", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const fullname = String(req.body.fullname || "").trim();
    const phone = String(req.body.phone || "").trim();
    const profileImage = String(req.body.profile_image || "").trim();

    await query(
      `
      UPDATE servia_users
      SET fullname = ?, phone = ?, profile_image = ?
      WHERE id = ?
      `,
      [fullname, phone, profileImage, userId]
    );

    const rows = await query(
      `
      SELECT 
        id,
        fullname,
        email,
        phone,
        role,
        profile_image,
        created_at
      FROM servia_users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    res.json({
      success: true,
      message: "Profile updated",
      user: rows[0],
    });
  } catch (err) {
    console.log("USER UPDATE ERROR:", err.message);
    res.status(500).json({
      message: "Profile update failed",
      error: err.message,
    });
  }
});


app.get("/api/bookings/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const rows = await query(
      `
      SELECT 
        b.*,
        p.title,
        p.location,
        p.image
      FROM servia_bookings b
      JOIN servia_properties p ON b.property_id = p.id
      WHERE b.user_id = ? OR p.user_id = ?
      ORDER BY b.id DESC
      `,
      [userId, userId]
    );

    res.json(rows);
  } catch (err) {
    console.log("BOOKINGS FETCH ERROR:", err.message);
    res.status(500).json({
      message: "Bookings fetch failed",
      error: err.message,
    });
  }
});

app.get("/api/bookings/:bookingId/receipt", verifyToken, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);

    const rows = await query(
      `
      SELECT 
        b.*,
        u.fullname,
        u.email,
        p.title,
        p.location
      FROM servia_bookings b
      JOIN servia_users u ON u.id = b.user_id
      JOIN servia_properties p ON p.id = b.property_id
      WHERE b.id = ?
      LIMIT 1
      `,
      [bookingId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = rows[0];

    if (
      Number(req.user.id) !== Number(booking.user_id) &&
      Number(req.user.id) !== Number(booking.host_id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=dovail-receipt-${bookingId}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc
      .fontSize(24)
      .fillColor("#3b71e6")
      .text("Dovail Stay", { align: "left" });

    doc
      .moveDown(0.5)
      .fontSize(18)
      .fillColor("#222")
      .text("Booking Receipt");

    doc.moveDown();
    doc.fontSize(11).fillColor("#555");

    doc.text(`Receipt ID: DOVAIL-${booking.id}`);
    doc.text(`Booking Status: ${booking.status}`);
    doc.text(`Payment Method: ${booking.payment_method || "N/A"}`);
    doc.text(`Issued Date: ${new Date().toLocaleDateString("en-IN")}`);

    doc.moveDown();
    doc.fontSize(14).fillColor("#222").text("Guest Details");
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555");
    doc.text(`Name: ${booking.fullname || "Guest"}`);
    doc.text(`Email: ${booking.email || "N/A"}`);

    doc.moveDown();
    doc.fontSize(14).fillColor("#222").text("Stay Details");
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#555");
    doc.text(`Property: ${booking.title}`);
    doc.text(`Location: ${booking.location || "N/A"}`);
    doc.text(`Check-in: ${booking.checkin}`);
    doc.text(`Check-out: ${booking.checkout}`);
    doc.text(`Guests: ${booking.guests}`);

    doc.moveDown();
    doc.fontSize(14).fillColor("#222").text("Payment Summary");
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor("#111");
    doc.text(`Total Paid: INR ${Number(booking.total || 0).toLocaleString("en-IN")}`);

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#777");
    doc.text("Thank you for choosing Dovail Stay.");
    doc.text("This is a system generated receipt.");

    doc.end();
  } catch (err) {
    console.log("RECEIPT PDF ERROR:", err.message);
    res.status(500).json({
      message: "Receipt generation failed",
      error: err.message,
    });
  }
});

app.post("/api/payments/razorpay-webhook", async (req, res) => {
  let eventId = null;
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ message: "Webhook secret missing" });
    }

    const signature = req.headers["x-razorpay-signature"];

    if (!verifyHmacSignature(req.body, signature, webhookSecret)) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());
    eventId = getWebhookEventId(req.body, req.headers["x-razorpay-event-id"]);
    try {
      await query(
        "INSERT INTO servia_webhook_events (provider,event_id,event_type,status,payload,attempts) VALUES ('razorpay',?,?, 'Processing',?,1)",
        [eventId, String(event.event || "unknown"), JSON.stringify(event)]
      );
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.json({ success: true, duplicate: true });
      throw error;
    }

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      await query(
        `
        UPDATE servia_bookings
        SET payment_status = ?, payment_id = ?
        WHERE razorpay_order_id = ?
        `,
        ["Paid", paymentId, orderId]
      );
    }

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      await query(
        `
        UPDATE servia_bookings
        SET payment_status = ?
        WHERE razorpay_order_id = ?
        `,
        ["Failed", payment.order_id]
      );
    }

    if (["refund.processed", "refund.failed"].includes(event.event)) {
      const refund = event.payload?.refund?.entity;
      if (refund?.id) {
        const gatewayStatus = event.event === "refund.processed" ? "Processed" : "Failed";
        const requests = await query(
          "SELECT refund_request_id,booking_id FROM servia_gateway_refunds WHERE gateway_refund_id=? LIMIT 1",
          [refund.id]
        );
        await query(
          "UPDATE servia_gateway_refunds SET status=?,error_message=? WHERE gateway_refund_id=?",
          [gatewayStatus, refund.error_description || null, refund.id]
        );
        if (requests.length) {
          await query("UPDATE servia_refund_requests SET status=? WHERE id=?", [gatewayStatus === "Processed" ? "Paid" : "Approved", requests[0].refund_request_id]);
          await query("UPDATE servia_bookings SET status='Cancelled',payment_status=? WHERE id=?", [gatewayStatus === "Processed" ? "Refunded" : "Refund Failed", requests[0].booking_id]);
        }
      }
    }

    await query("UPDATE servia_webhook_events SET status='Processed',error_message=NULL WHERE provider='razorpay' AND event_id=?", [eventId]);
    res.json({ success: true });
  } catch (err) {
    console.log("RAZORPAY WEBHOOK ERROR:", err.message);
    if (eventId) await query("UPDATE servia_webhook_events SET status='Failed',error_message=? WHERE provider='razorpay' AND event_id=?", [String(err.message).slice(0, 1000), eventId]).catch(() => {});
    res.status(500).json({
      message: "Webhook failed",
      error: err.message,
    });
  }
});

app.put("/api/host/bookings/:bookingId/status", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const hostId = Number(req.user.id);
    const { status } = req.body;

    const allowedStatuses = ["Confirmed", "Checked-in", "Checked-out", "Cancelled", "Declined"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    const rows = await query(
      `
      SELECT 
        b.id,
        b.user_id,
        b.checkin,
        b.checkout,
        b.total,
        b.status AS current_status,
        p.user_id AS host_id,
        p.title,
        u.fullname,
        u.email
      FROM servia_bookings b
      JOIN servia_properties p ON p.id = b.property_id
      JOIN servia_users u ON u.id = b.user_id
      WHERE b.id = ?
      LIMIT 1
      `,
      [bookingId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = rows[0];

    if (Number(booking.host_id) !== hostId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!canTransitionBooking(booking.current_status, status)) {
      return res.status(409).json({
        message: `Booking cannot move from ${booking.current_status} to ${status}`,
      });
    }

    await query(
      `
      UPDATE servia_bookings
      SET status = ?
      WHERE id = ?
      `,
      [status, bookingId]
    );

    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        booking.user_id,
        "Booking status updated",
        `Your booking for ${booking.title} is now ${status}.`,
        "booking",
        0,
      ]
    );

    try {
      await enqueueEmail({
        to: booking.email,
        subject: `Booking ${status} - ${booking.title}`,
        type: "booking_status",
        dedupeKey: `booking_status:${booking.id}:${status}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px;border:1px solid #eee;border-radius:18px">
            <h2 style="color:#3b71e6;margin-bottom:8px">Booking ${status}</h2>
            <p>Hello ${booking.fullname || "Guest"},</p>
            <p>Your booking status has been updated.</p>

            <div style="background:#f7f4ff;padding:16px;border-radius:14px;margin:20px 0">
              <p><b>Booking ID:</b> ${booking.id}</p>
              <p><b>Property:</b> ${booking.title}</p>
              <p><b>Status:</b> ${status}</p>
              <p><b>Check-in:</b> ${booking.checkin}</p>
              <p><b>Check-out:</b> ${booking.checkout}</p>
              <p><b>Total:</b> ₹${Number(booking.total || 0).toLocaleString("en-IN")}</p>
            </div>

            <a href="${process.env.CLIENT_URL}/trips"
              style="display:inline-block;background:#3b71e6;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;font-weight:bold">
              View My Trips
            </a>

            <p style="margin-top:24px;color:#666;font-size:14px">
              Thank you for choosing Dovail Stay.
            </p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.log("BOOKING STATUS EMAIL ERROR:", mailErr.message);
    }

    res.json({
      success: true,
      message: `Booking marked as ${status}`,
    });
  } catch (err) {
    console.log("HOST BOOKING STATUS ERROR:", err.message);
    res.status(500).json({
      message: "Booking status update failed",
      error: err.message,
    });
  }
});

app.get("/api/admin/reviews", verifyToken,
requireAdminRole("Moderator"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const rows = await query(`
      SELECT 
        r.*,
        u.fullname AS guest_name,
        u.email AS guest_email,
        p.title AS property_title
      FROM servia_reviews r
      LEFT JOIN servia_users u ON u.id = r.user_id
      LEFT JOIN servia_properties p ON p.id = r.property_id
      ORDER BY r.id DESC
    `);

    res.json(rows);
  } catch (err) {
    console.log("ADMIN REVIEWS LOAD ERROR:", err.message);
    res.status(500).json({ message: "Admin reviews load failed" });
  }
});

app.put("/api/admin/reviews/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status, admin_note } = req.body;
    const allowed = ["Approved", "Hidden", "Flagged"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    await query(
      `
      UPDATE servia_reviews
      SET status = ?, admin_note = ?
      WHERE id = ?
      `,
      [status, admin_note || null, req.params.id]
    );

    res.json({ success: true, message: "Review updated" });
  } catch (err) {
    console.log("ADMIN REVIEW UPDATE ERROR:", err.message);
    res.status(500).json({ message: "Review update failed" });
  }
});


app.post("/api/kyc/submit", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { id_proof, address_proof } = req.body;

    if (!id_proof || !address_proof) {
      return res.status(400).json({ message: "ID proof and address proof are required" });
    }

    await query(
      `
      UPDATE servia_users
      SET kyc_status = ?, kyc_id_proof = ?, kyc_address_proof = ?, kyc_note = NULL
      WHERE id = ?
      `,
      ["Pending", id_proof, address_proof, userId]
    );

    res.json({ success: true, message: "KYC submitted for review" });
  } catch (err) {
    res.status(500).json({ message: "KYC submit failed", error: err.message });
  }
});

app.get("/api/kyc/me", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, fullname, email, kyc_status, kyc_id_proof, kyc_address_proof, kyc_note
      FROM servia_users
      WHERE id = ?
      LIMIT 1
      `,
      [req.user.id]
    );

    res.json(rows[0] || null);
  } catch (err) {
    res.status(500).json({ message: "KYC load failed", error: err.message });
  }
});
app.post(
  "/api/kyc/upload",
  verifyToken,
  upload.fields([
    { name: "id_proof", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = Number(req.user.id);

      const idFile = req.files?.id_proof?.[0];
      const addressFile = req.files?.address_proof?.[0];

      if (!idFile || !addressFile) {
        return res.status(400).json({
          message: "ID proof and address proof are required",
        });
      }

      const oldRows = await query(
        `
        SELECT kyc_id_key, kyc_address_key
        FROM servia_users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
      );

      const [idUpload, addressUpload] = await Promise.all([
        uploadFileToS3(idFile, "kyc"),
        uploadFileToS3(addressFile, "kyc"),
      ]);

      await query(
        `
        UPDATE servia_users
        SET
          kyc_status = ?,
          kyc_id_proof = ?,
          kyc_id_key = ?,
          kyc_address_proof = ?,
          kyc_address_key = ?,
          kyc_note = NULL
        WHERE id = ?
        `,
        [
          "Pending",
          idUpload.url,
          idUpload.key,
          addressUpload.url,
          addressUpload.key,
          userId,
        ]
      );

      if (oldRows.length) {
        if (oldRows[0].kyc_id_key) {
          await deleteS3File(oldRows[0].kyc_id_key);
        }

        if (oldRows[0].kyc_address_key) {
          await deleteS3File(oldRows[0].kyc_address_key);
        }
      }

      res.json({
        success: true,
        message: "KYC uploaded successfully",
        kyc_status: "Pending",
        id_proof: idUpload.url,
        address_proof: addressUpload.url,
      });
    } catch (err) {
      console.log("KYC UPLOAD ERROR:", err.message);

      res.status(500).json({
        message: "KYC upload failed",
        error: err.message,
      });
    }
  }
);
app.get("/api/admin/kyc", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const rows = await query(
      `
      SELECT id, fullname, email, phone, kyc_status, kyc_id_proof, kyc_address_proof, kyc_note
      FROM servia_users
      WHERE kyc_status IS NOT NULL
      ORDER BY FIELD(kyc_status, 'Pending', 'Rejected', 'Approved', 'Not Submitted'), id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Admin KYC load failed", error: err.message });
  }
});

app.put("/api/admin/kyc/:userId/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status, note } = req.body;
    const allowed = ["Approved", "Rejected", "Pending"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid KYC status" });
    }

    await query(
      `
      UPDATE servia_users
      SET kyc_status = ?, kyc_note = ?,
          role = CASE WHEN ?='Approved' THEN 'host' WHEN role='admin' THEN role ELSE 'guest' END
      WHERE id = ?
      `,
      [status, note || null, status, req.params.userId]
    );

    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.params.userId,
        "KYC verification updated",
        `Your host verification status is now ${status}.`,
        "kyc",
        0,
      ]
    );

    res.json({ success: true, message: "KYC status updated" });
  } catch (err) {
    res.status(500).json({ message: "KYC update failed", error: err.message });
  }
});
app.get("/api/host/calendar/:propertyId", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const propertyId = Number(req.params.propertyId);
    const userId = Number(req.user.id);

    const ownerRows = await query(
      "SELECT id FROM servia_properties WHERE id = ? AND user_id = ? LIMIT 1",
      [propertyId, userId]
    );

    if (!ownerRows.length && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const rows = await query(
      `
      SELECT *
      FROM servia_property_calendar
      WHERE property_id = ?
      ORDER BY calendar_date ASC
      `,
      [propertyId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Calendar load failed", error: err.message });
  }
});

app.post("/api/host/calendar", verifyToken, requireApprovedHost, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const userId = Number(req.user.id);
    const propertyId = Number(req.body.property_id);
    const calendarDate = String(req.body.calendar_date || "");
    const status = String(req.body.status || "");
    const selectedDate = new Date(`${calendarDate}T00:00:00Z`);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const customPrice = req.body.custom_price === "" || req.body.custom_price == null
      ? null : Number(req.body.custom_price);

    if (!propertyId || !/^\d{4}-\d{2}-\d{2}$/.test(calendarDate) ||
        !Number.isFinite(selectedDate.getTime()) || selectedDate < today) {
      return res.status(400).json({ message: "Enter a valid future calendar date" });
    }
    if (!["Available", "Blocked"].includes(status)) {
      return res.status(400).json({ message: "Invalid calendar status" });
    }
    if (customPrice !== null && (!Number.isFinite(customPrice) || customPrice <= 0 || customPrice > 10000000)) {
      return res.status(400).json({ message: "Custom price is invalid" });
    }

    await connection.beginTransaction();
    const [properties] = await connection.query(
      "SELECT id,user_id FROM servia_properties WHERE id=? LIMIT 1 FOR UPDATE", [propertyId]
    );
    if (!properties.length) { await connection.rollback(); return res.status(404).json({ message: "Property not found" }); }
    if (Number(properties[0].user_id) !== userId && req.user.role !== "admin") {
      await connection.rollback(); return res.status(403).json({ message: "Access denied" });
    }

    if (status === "Blocked") {
      const [reservations] = await connection.query(
        `SELECT id FROM servia_bookings WHERE property_id=?
         AND status NOT IN ('Cancelled','Declined') AND checkin <= ? AND checkout > ? LIMIT 1 FOR UPDATE`,
        [propertyId, calendarDate, calendarDate]
      );
      if (reservations.length) {
        await connection.rollback();
        return res.status(409).json({ message: "This date already has an active reservation" });
      }
    }

    await connection.query(
      `INSERT INTO servia_property_calendar (property_id,calendar_date,status,custom_price,note)
       VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),custom_price=VALUES(custom_price),note=VALUES(note)`,
      [propertyId, calendarDate, status, customPrice, String(req.body.note || "").trim().slice(0, 500) || null]
    );
    await connection.commit();
    res.json({ success: true, message: "Calendar updated" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Calendar update failed", error: err.message });
  } finally {
    connection.release();
  }
});
app.post("/api/coupons/validate", verifyToken, async (req, res) => {
  try {
    const { code, amount } = req.body;

    const rows = await query(
      `
      SELECT *
      FROM servia_coupons
      WHERE UPPER(code) = UPPER(?)
      LIMIT 1
      `,
      [code]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    const coupon = rows[0];

    if (coupon.status !== "Active") {
      return res.status(400).json({ message: "Coupon is not active" });
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ message: "Coupon expired" });
    }

    if (Number(amount) < Number(coupon.min_amount || 0)) {
      return res.status(400).json({
        message: `Minimum booking amount is ₹${Number(
          coupon.min_amount || 0
        ).toLocaleString("en-IN")}`,
      });
    }

    if (
      coupon.usage_limit &&
      Number(coupon.used_count || 0) >= Number(coupon.usage_limit)
    ) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    let discount = 0;

    if (coupon.discount_type === "percentage") {
      discount = Math.round((Number(amount) * Number(coupon.discount_value)) / 100);

      if (coupon.max_discount) {
        discount = Math.min(discount, Number(coupon.max_discount));
      }
    } else {
      discount = Number(coupon.discount_value);
    }

    discount = Math.min(discount, Number(amount));

    res.json({
      success: true,
      code: coupon.code,
      discount,
      final_amount: Number(amount) - discount,
      coupon,
    });
  } catch (err) {
    res.status(500).json({ message: "Coupon validation failed", error: err.message });
  }
});

app.get("/api/admin/coupons", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const rows = await query(`
      SELECT *
      FROM servia_coupons
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Coupons load failed", error: err.message });
  }
});

app.post("/api/admin/coupons", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const {
      code,
      discount_type,
      discount_value,
      min_amount,
      max_discount,
      usage_limit,
      expires_at,
    } = req.body;

    await query(
      `
      INSERT INTO servia_coupons
      (code, discount_type, discount_value, min_amount, max_discount, usage_limit, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(code || "").trim().toUpperCase(),
        discount_type || "percentage",
        discount_value || 0,
        min_amount || 0,
        max_discount || null,
        usage_limit || null,
        expires_at || null,
      ]
    );

    res.json({ success: true, message: "Coupon created" });
  } catch (err) {
    res.status(500).json({ message: "Coupon create failed", error: err.message });
  }
});

app.put("/api/admin/coupons/:id/status", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { status } = req.body;

    await query(
      `
      UPDATE servia_coupons
      SET status = ?
      WHERE id = ?
      `,
      [status, req.params.id]
    );

    res.json({ success: true, message: "Coupon status updated" });
  } catch (err) {
    res.status(500).json({ message: "Coupon update failed", error: err.message });
  }
});

/* EXPERIENCES */

app.get("/api/experiences", async (req, res) => {
  try {
    const { search = "", category = "All" } = req.query;

    let sql = `
      SELECT
        e.*,
        (
          SELECT image_url
          FROM experience_images
          WHERE experience_id = e.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ) AS image
      FROM experiences e
      WHERE e.status = 'active'
    `;

    const values = [];

    if (category && category !== "All") {
      sql += " AND e.category = ?";
      values.push(category);
    }

    if (search) {
      sql += `
        AND (
          e.title LIKE ?
          OR e.location LIKE ?
          OR e.city LIKE ?
          OR e.category LIKE ?
        )
      `;

      const q = `%${search}%`;
      values.push(q, q, q, q);
    }

    sql += " ORDER BY e.created_at DESC";

    const rows = await query(sql, values);

    res.json(rows);
  } catch (err) {
    console.log("Experiences load error:", err.message);

    res.status(500).json({
      message: "Failed to load experiences",
      error: err.message,
    });
  }
});

app.get("/api/experiences/:id", async (req, res) => {
  try {
    const experienceId = Number(req.params.id);

    const rows = await query(
      `
      SELECT *
      FROM experiences
      WHERE id = ?
      AND status = 'active'
      LIMIT 1
      `,
      [experienceId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Experience not found" });
    }

    const images = await query(
      `
      SELECT *
      FROM experience_images
      WHERE experience_id = ?
      ORDER BY is_cover DESC, sort_order ASC, id ASC
      `,
      [experienceId]
    );

    res.json({
      ...rows[0],
      images,
    });
  } catch (err) {
    console.log("Experience detail error:", err.message);

    res.status(500).json({
      message: "Failed to load experience",
      error: err.message,
    });
  }
});

app.get("/api/experience-reviews/:experienceId", async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        r.*,
        COALESCE(u.fullname, 'Guest') AS guest_name
      FROM experience_reviews r
      LEFT JOIN servia_users u ON u.id = r.user_id
      WHERE r.experience_id = ?
      AND r.status = 'Approved'
      ORDER BY r.id DESC
      `,
      [req.params.experienceId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      message: "Experience reviews load failed",
      error: err.message,
    });
  }
});
/* EXPERIENCE BOOKINGS */

app.post("/api/experience-payments/create-order", verifyToken, paymentLimiter, async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ message: "Online payments are not configured" });
    const experienceId = Number(req.body.experience_id);
    const guests = Number(req.body.guests || 0);
    const bookingDate = String(req.body.booking_date || "");
    const departureId = Number(req.body.departure_id || 0) || null;
    const rows = await query("SELECT id, title, price, status, max_people FROM experiences WHERE id=? LIMIT 1", [experienceId]);
    if (!rows.length || rows[0].status !== "active") return res.status(400).json({ message: "Package is not available" });
    if (!Number.isInteger(guests) || guests < 1 || guests > Number(rows[0].max_people || guests) || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
      return res.status(400).json({ message: "Invalid trip date or traveller count" });
    }
    const tripDate = new Date(`${bookingDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(tripDate.getTime()) || tripDate < today) {
      return res.status(400).json({ message: "Trip date must be today or later" });
    }
    if (departureId) {
      const departures = await query(
        `SELECT id, total_seats, booked_seats, status FROM package_departures
         WHERE id=? AND experience_id=? AND departure_date=? LIMIT 1`,
        [departureId, experienceId, bookingDate]
      );
      if (!departures.length || departures[0].status !== "Available" ||
          Number(departures[0].total_seats) - Number(departures[0].booked_seats) < guests) {
        return res.status(409).json({ message: "Selected departure is unavailable" });
      }
    }
    const subtotal = Number(rows[0].price || 0) * guests;
    const total = subtotal + Math.round(subtotal * 0.12);
    const order = await razorpay.orders.create({
      amount: Math.round(total * 100), currency: "INR",
      receipt: `experience_${experienceId}_${Date.now()}`,
      notes: {
        experience_id: String(experienceId), user_id: String(req.user.id), guests: String(guests),
        booking_date: bookingDate, departure_id: departureId ? String(departureId) : "",
      },
    });
    res.json({ success: true, key: process.env.RAZORPAY_KEY_ID, order });
  } catch (err) {
    console.log("EXPERIENCE ORDER ERROR:", err.message);
    res.status(500).json({ message: "Payment order creation failed" });
  }
});

app.put("/api/admin/users/:id/role", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const role = String(req.body.role || "").toLowerCase();
    if (!["guest", "host", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    if (userId === Number(req.user.id) && role !== "admin") return res.status(400).json({ message: "You cannot remove your own admin access" });
    await query("UPDATE servia_users SET role=? WHERE id=?", [role, userId]);
    res.json({ success: true, message: "User role updated" });
  } catch (err) {
    res.status(500).json({ message: "Role update failed" });
  }
});

app.put("/api/admin/users/:id/status", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const status = String(req.body.status || "").toLowerCase();
    if (!["active", "suspended"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    if (userId === Number(req.user.id) && status === "suspended") return res.status(400).json({ message: "You cannot suspend yourself" });
    await query("UPDATE servia_users SET is_active=? WHERE id=?", [status === "active" ? 1 : 0, userId]);
    res.json({ success: true, message: "User status updated" });
  } catch (err) {
    res.status(500).json({ message: "Status update failed" });
  }
});

app.delete("/api/admin/users/:id", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === Number(req.user.id)) return res.status(400).json({ message: "You cannot deactivate yourself" });
    await query("UPDATE servia_users SET is_active=0 WHERE id=?", [userId]);
    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    res.status(500).json({ message: "User deactivation failed" });
  }
});

app.post("/api/experience-payments/verify", verifyToken, paymentLimiter, async (req, res) => {
  try {
    if (!razorpay) return res.status(503).json({ message: "Online payments are not configured" });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ message: "Payment verification details are incomplete" });
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    const valid = expected.length === razorpay_signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature));
    if (!valid) return res.status(400).json({ message: "Payment signature is invalid" });
    const [payment, order] = await Promise.all([
      razorpay.payments.fetch(razorpay_payment_id),
      razorpay.orders.fetch(razorpay_order_id),
    ]);
    if (payment.order_id !== razorpay_order_id || payment.status !== "captured" ||
        String(order.notes?.user_id) !== String(req.user.id)) {
      return res.status(400).json({ message: "Payment ownership verification failed" });
    }
    res.json({ success: true, paymentId: razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ message: "Payment verification failed" });
  }
});

app.post("/api/experience-bookings", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const {
      experience_id,
      user_id,
      departure_id,
      booking_date,
      guests,
      payment_method,
      razorpay_payment_id,
      razorpay_order_id,
      pickup_note,
      special_request,
    } = req.body;

    const guestCount = Number(guests || 0);
    if (!experience_id || !user_id || !/^\d{4}-\d{2}-\d{2}$/.test(booking_date) ||
        !Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({
        message: "Required booking fields missing",
      });
    }

    if (Number(req.user.id) !== Number(user_id)) {
      return res.status(403).json({
        message: "Invalid user",
      });
    }

    const tripDate = new Date(`${booking_date}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!Number.isFinite(tripDate.getTime()) || tripDate < today) {
      return res.status(400).json({ message: "Trip date must be today or later" });
    }

    const experienceRows = await query(
      `
      SELECT id, title, price, status, max_people
      FROM experiences
      WHERE id = ?
      LIMIT 1
      `,
      [experience_id]
    );

    if (!experienceRows.length) {
      return res.status(404).json({
        message: "Package not found",
      });
    }

    if (experienceRows[0].status !== "active") {
      return res.status(400).json({
        message: "Package is not available",
      });
    }

    if (guestCount > Number(experienceRows[0].max_people || guestCount)) {
      return res.status(400).json({ message: "Traveller count exceeds package capacity" });
    }

    const subtotal = Number(experienceRows[0].price || 0) * guestCount;
    const taxes = Math.round(subtotal * 0.12);
    const serverTotal = subtotal + taxes;
    if (serverTotal <= 0) return res.status(400).json({ message: "Invalid package price" });

    if (payment_method === "razorpay") {
      if (!razorpay || !razorpay_payment_id || !razorpay_order_id) {
        return res.status(400).json({ message: "Verified payment details are required" });
      }
      const [payment, order] = await Promise.all([
        razorpay.payments.fetch(razorpay_payment_id),
        razorpay.orders.fetch(razorpay_order_id),
      ]);
      const notes = order.notes || {};
      if (
        payment.order_id !== razorpay_order_id || payment.status !== "captured" ||
        Number(payment.amount) !== Math.round(serverTotal * 100) || order.currency !== "INR" ||
        String(notes.user_id) !== String(req.user.id) ||
        String(notes.experience_id) !== String(experience_id) ||
        String(notes.guests) !== String(guestCount) ||
        String(notes.booking_date) !== String(booking_date) ||
        String(notes.departure_id || "") !== String(departure_id || "")
      ) {
        return res.status(400).json({ message: "Payment does not match this trip booking" });
      }
    }

    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `
      SELECT id
      FROM experience_bookings
      WHERE experience_id = ?
      AND user_id = ?
      AND booking_date = ?
      AND status NOT IN ('Cancelled', 'Declined')
      LIMIT 1 FOR UPDATE
      `,
      [experience_id, user_id, booking_date]
    );

    if (existingRows.length) {
      await connection.rollback();
      return res.status(409).json({
        message: "You already booked this package for this date",
      });
    }

    if (departure_id) {
      const [departureRows] = await connection.query(
        `
        SELECT *
        FROM package_departures
        WHERE id = ?
        AND experience_id = ?
        AND departure_date = ?
        LIMIT 1 FOR UPDATE
        `,
        [departure_id, experience_id, booking_date]
      );

      if (!departureRows.length) {
        await connection.rollback();
        return res.status(404).json({
          message: "Selected departure not found",
        });
      }

      const departure = departureRows[0];

      const remainingSeats =
        Number(departure.total_seats || 0) -
        Number(departure.booked_seats || 0);

      if (departure.status !== "Available") {
        await connection.rollback();
        return res.status(400).json({
          message: "Selected departure is not available",
        });
      }

      if (remainingSeats < guestCount) {
        await connection.rollback();
        return res.status(400).json({
          message: `Only ${remainingSeats} seats left for this departure`,
        });
      }
    }

    const [result] = await connection.query(
      `
      INSERT INTO experience_bookings
      (
        experience_id,
        user_id,
        departure_id,
        booking_date,
        guests,
        total,
        payment_method,
        payment_status,
        status,
        pickup_note,
        special_request
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        experience_id,
        user_id,
        departure_id || null,
        booking_date,
        guestCount,
        serverTotal,
        payment_method || "cash",
        payment_method === "razorpay" ? "Paid" : "Pay at trip",
        payment_method === "razorpay" ? "Confirmed" : "Pending",
        pickup_note || null,
        special_request || null,
      ]
    );

    if (departure_id) {
      await connection.query(
        `
        UPDATE package_departures
        SET booked_seats = booked_seats + ?
        WHERE id = ?
        `,
        [guestCount, departure_id]
      );

      await connection.query(
        `
        UPDATE package_departures
        SET status = 'Sold Out'
        WHERE id = ?
        AND booked_seats >= total_seats
        `,
        [departure_id]
      );
    }

    if (payment_method === "razorpay") {
      await connection.query(
        `INSERT INTO servia_payment_claims
         (payment_id, order_id, user_id, booking_type, booking_id, amount)
         VALUES (?, ?, ?, 'experience', ?, ?)`,
        [razorpay_payment_id, razorpay_order_id, req.user.id, result.insertId, serverTotal]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Package booked successfully",
      bookingId: result.insertId,
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.log("PACKAGE BOOKING ERROR:", err.message);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "This payment or booking has already been used" });
    }

    res.status(500).json({
      message: "Package booking failed",
      error: err.message,
    });
  } finally {
    connection.release();
  }
});
/* MY EXPERIENCE BOOKINGS */

app.get("/api/experience-bookings/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const rows = await query(
      `
      SELECT 
        b.*,
        e.title,
        e.location,
        e.city,
        e.category,
        e.duration,
        e.language,
        e.host_name,
        e.price,
        e.rating,
        (
          SELECT image_url
          FROM experience_images
          WHERE experience_id = e.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ) AS image
      FROM experience_bookings b
      JOIN experiences e ON e.id = b.experience_id
      WHERE b.user_id = ?
      ORDER BY b.id DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.log("MY EXPERIENCE BOOKINGS ERROR:", err.message);

    res.status(500).json({
      message: "Experience bookings fetch failed",
      error: err.message,
    });
  }
});
/* HOST / ADMIN - CREATE TRIP PACKAGE */

app.post(
  "/api/trip-packages",
  verifyToken,
  requireApprovedHost,
  upload.array("images", 10),
  async (req, res) => {
    let connection;
    const uploadedImages = [];
    let submissionKey = null;
    let createPhase = "database_connection";

    try {
      connection = await db.promise().getConnection();
      const {
        title,
        category,
        location,
        city,
        price,
        package_days,
        package_nights,
        max_people,
        brand_name,
        team_contact,
        hotel_name,
        transport,
        meals,
      pickup_location,
pickup_map_url,
pickup_latitude,
pickup_longitude,
language,
        host_name,
        description,
        includes,
        itinerary,
        exclusions,
        cancellation_policy,
        terms_conditions,
        package_type,
        client_submission_id,
      } = req.body;

      submissionKey = String(client_submission_id || "").trim();
      if (!/^[a-zA-Z0-9_-]{16,100}$/.test(submissionKey)) {
        return res.status(400).json({ success: false, message: "Invalid submission token. Refresh the form and try again." });
      }

      const normalizedTitle = String(title || "").trim();
      const normalizedLocation = String(location || "").trim();
      const normalizedCity = String(city || normalizedLocation).trim();
      const packagePrice = Number(price);
      const days = Number(package_days);
      const nights = Number(package_nights);
      const capacity = Number(max_people);
      const pickupLat = pickup_latitude === "" ? null : Number(pickup_latitude);
      const pickupLng = pickup_longitude === "" ? null : Number(pickup_longitude);

      if (normalizedTitle.length < 5 || normalizedTitle.length > 120 ||
          !normalizedLocation || normalizedLocation.length > 255 || !normalizedCity ||
          !Number.isFinite(packagePrice) || packagePrice <= 0 || packagePrice > 10000000) {
        return res.status(400).json({
          success: false,
          message: "Enter a valid title, destination, city and price.",
        });
      }

      if (!Number.isInteger(days) || days < 1 || days > 365 || !Number.isInteger(nights) ||
          nights < 0 || nights >= days || !Number.isInteger(capacity) || capacity < 1 || capacity > 1000) {
        return res.status(400).json({ success: false, message: "Enter valid duration and traveller capacity" });
      }

      if ((pickupLat !== null && (!Number.isFinite(pickupLat) || pickupLat < -90 || pickupLat > 90)) ||
          (pickupLng !== null && (!Number.isFinite(pickupLng) || pickupLng < -180 || pickupLng > 180))) {
        return res.status(400).json({ success: false, message: "Pickup coordinates are invalid" });
      }

      if (!String(includes || "").trim() || !String(itinerary || "").trim() ||
          !String(exclusions || "").trim() || !String(terms_conditions || "").trim()) {
        return res.status(400).json({ success: false, message: "Includes, itinerary, exclusions and terms are required" });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least one package image.",
        });
      }

      try {
        createPhase = "submission_reservation";
        await connection.query(
          "INSERT INTO servia_host_submissions (submission_key,user_id,submission_type,status) VALUES (?,?,'experience','Processing')",
          [submissionKey, req.user.id]
        );
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY") throw error;
        const [prior] = await connection.query(
          "SELECT status,entity_id,updated_at FROM servia_host_submissions WHERE submission_key=? AND user_id=? AND submission_type='experience' LIMIT 1",
          [submissionKey, req.user.id]
        );
        if (prior[0]?.status === "Completed") {
          return res.status(200).json({ success: true, message: "Trip package was already submitted", experienceId: prior[0].entity_id, packageId: prior[0].entity_id, status: "Pending" });
        }
        const [reclaimed] = await connection.query(
          "UPDATE servia_host_submissions SET updated_at=NOW() WHERE submission_key=? AND user_id=? AND status='Processing' AND updated_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)",
          [submissionKey, req.user.id]
        );
        if (!reclaimed.affectedRows) return res.status(409).json({ message: "This trip package submission is already being processed" });
      }

      for (const file of req.files) {
        createPhase = "image_upload";
        const uploaded = await uploadFileToS3(file, "experiences");
        uploadedImages.push(uploaded);
      }

      const coverImage = uploadedImages[0]?.url || null;

      await connection.beginTransaction();

      createPhase = "package_insert";
      const [result] = await connection.query(
        `
        INSERT INTO experiences
        (
          host_id,
title,
          location,
          city,
          category,
          price,
          package_days,
          package_nights,
          max_people,
          brand_name,
          team_contact,
          hotel_name,
          transport,
          meals,
        pickup_location,
pickup_map_url,
pickup_latitude,
pickup_longitude,
language,
          host_name,
          description,
          includes,
          itinerary,
          exclusions,
          cancellation_policy,
          terms_conditions,
          package_type,
          status,
          rating,
          reviews
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
           Number(req.user.id),
  normalizedTitle,
  normalizedLocation,
          normalizedCity,
          category || "Family",
          packagePrice,
          days,
          nights,
          capacity,
          brand_name || "Dovail Travel Hosting Team",
          team_contact || null,
          hotel_name || null,
          transport || null,
          meals || null,
       pickup_location || null,
pickup_map_url || null,
pickupLat,
pickupLng,
language || "English",
          host_name || req.user?.fullname || req.user?.name || "Dovail Host",
          description || "",
          includes || "",
          itinerary || "",
          exclusions || "",
          cancellation_policy || "",
          terms_conditions || "",
          package_type || "Trip Package",
          "Pending",
          0,
          0,
        ]
      );

      const experienceId = result.insertId;

      const imageValues = uploadedImages.map((img, index) => [
        experienceId,
        img.url,
        img.key || null,
        index === 0 ? 1 : 0,
        index,
      ]);

      createPhase = "image_record_insert";
      await connection.query(
        `
        INSERT INTO experience_images
        (experience_id, image_url, image_key, is_cover, sort_order)
        VALUES ?
        `,
        [imageValues]
      );

      createPhase = "submission_completion";
      await connection.query("UPDATE servia_host_submissions SET status='Completed',entity_id=? WHERE submission_key=?", [experienceId, submissionKey]);
      await connection.commit();

      res.status(201).json({
        success: true,
        message:
          "Trip package submitted successfully and is awaiting admin approval.",
        experienceId,
        packageId: experienceId,
        coverImage,
        status: "Pending",
      });
    } catch (err) {
      try { await connection?.rollback(); } catch {}
      await Promise.allSettled(uploadedImages.map((image) => deleteS3File(image.key)));
      if (submissionKey) await query("DELETE FROM servia_host_submissions WHERE submission_key=? AND status='Processing'", [submissionKey]).catch(() => {});

      console.error("CREATE TRIP PACKAGE ERROR:", {
        requestId: req.requestId,
        phase: createPhase,
        code: err.code,
        message: err.message,
      });

      res.status(500).json({
        success: false,
        message: "Trip package create failed",
        request_id: req.requestId,
        phase: createPhase,
      });
    } finally {
      connection?.release();
    }
  }
);


/* HOST - OWN TRIP PACKAGES */

app.get("/api/host/trip-packages", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.user?.id);

    if (!hostId) {
      return res.status(401).json({
        message: "Invalid user session",
      });
    }

    const rows = await query(
      `
      SELECT
        e.*,
        (
          SELECT ei.image_url
          FROM experience_images ei
          WHERE ei.experience_id = e.id
          ORDER BY
            ei.is_cover DESC,
            ei.sort_order ASC,
            ei.id ASC
          LIMIT 1
        ) AS image,
        (
          SELECT COUNT(*)
          FROM experience_bookings eb
          WHERE eb.experience_id = e.id
        ) AS booking_count,
        (
          SELECT COALESCE(SUM(eb.total), 0)
          FROM experience_bookings eb
          WHERE eb.experience_id = e.id
            AND eb.status IN (
              'Confirmed',
              'Checked-in',
              'Checked-out',
              'Completed'
            )
        ) AS earnings
      FROM experiences e
      WHERE e.host_id = ?
        AND e.package_type IS NOT NULL
      ORDER BY e.created_at DESC, e.id DESC
      `,
      [hostId]
    );

    return res.json(rows);
  } catch (err) {
    console.log("HOST TRIP PACKAGES ERROR:", err.message);

    return res.status(500).json({
      message: "Host trip packages load failed",
      error: err.message,
    });
  }
});
app.put("/api/trip-packages/:id", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const packageId = Number(req.params.id);

    const {
      title,
      category,
      location,
      city,
      price,
      package_days,
      package_nights,
      max_people,
      brand_name,
      team_contact,
      hotel_name,
      transport,
      meals,
      pickup_location,
      pickup_map_url,
      language,
      host_name,
      description,
      includes,
      itinerary,
      exclusions,
      cancellation_policy,
      terms_conditions,
      package_type,
      status,
    } = req.body;

    if (!packageId) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    if (!title?.trim() || !location?.trim() || Number(price) <= 0) {
      return res.status(400).json({
        message: "Title, destination and valid price are required",
      });
    }

    await query(
      `
      UPDATE experiences
      SET
        title = ?,
        category = ?,
        location = ?,
        city = ?,
        price = ?,
        package_days = ?,
        package_nights = ?,
        max_people = ?,
        brand_name = ?,
        team_contact = ?,
        hotel_name = ?,
        transport = ?,
        meals = ?,
        pickup_location = ?,
        pickup_map_url = ?,
        language = ?,
        host_name = ?,
        description = ?,
        includes = ?,
        itinerary = ?,
        exclusions = ?,
        cancellation_policy = ?,
        terms_conditions = ?,
        package_type = ?,
        status = ?
      WHERE id = ?
      `,
      [
        title.trim(),
        category || "Family",
        location.trim(),
        city?.trim() || location.trim(),
        Number(price || 0),
        Number(package_days || 1),
        Number(package_nights || 0),
        Number(max_people || 10),
        brand_name || "Dovail Travel Hosting Team",
        team_contact || null,
        hotel_name || null,
        transport || null,
        meals || null,
        pickup_location || null,
        pickup_map_url || null,
        language || "English",
        host_name || "Dovail Travel",
        description || "",
        includes || "",
        itinerary || "",
        exclusions || "",
        cancellation_policy || "",
        terms_conditions || "",
        package_type || "Trip Package",
        status || "Pending",
        packageId,
      ]
    );

    res.json({
      success: true,
      message: "Trip package updated successfully",
    });
  } catch (err) {
    console.log("UPDATE TRIP PACKAGE ERROR:", err.message);

    res.status(500).json({
      message: "Trip package update failed",
      error: err.message,
    });
  }
});
/* HOST / ADMIN - PACKAGE BOOKINGS */

app.get("/api/host/package-bookings", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        b.*,
        e.title,
        e.location,
        e.city,
        e.package_days,
        e.package_nights,
        e.price,
        (
          SELECT image_url
          FROM experience_images
          WHERE experience_id = e.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ) AS image,
        u.fullname AS guest_name,
        u.email AS guest_email,
        u.phone AS guest_phone
      FROM experience_bookings b
JOIN experiences e ON e.id = b.experience_id
LEFT JOIN servia_users u ON u.id = b.user_id
WHERE e.host_id = ?
ORDER BY b.id DESC
        `,
      [Number(req.user.id)]
    );

    res.json(rows);
  } catch (err) {
    console.log("HOST PACKAGE BOOKINGS ERROR:", err.message);
    res.status(500).json({
      message: "Package bookings load failed",
      error: err.message,
    });
  }
});

app.put("/api/host/package-bookings/:id/status", verifyToken, requireApprovedHost, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    const allowed = ["Confirmed", "Completed", "Cancelled", "Declined"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT b.*, e.host_id FROM experience_bookings b
       JOIN experiences e ON e.id=b.experience_id
       WHERE b.id=? LIMIT 1 FOR UPDATE`,
      [bookingId]
    );
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Booking not found" }); }
    const booking = rows[0];
    if (Number(booking.host_id) !== Number(req.user.id) && req.user.role !== "admin") {
      await connection.rollback(); return res.status(403).json({ message: "Access denied" });
    }
    const transitions = { Pending: ["Confirmed", "Cancelled", "Declined"], Confirmed: ["Completed", "Cancelled"] };
    if (!(transitions[booking.status] || []).includes(status)) {
      await connection.rollback();
      return res.status(409).json({ message: `Booking cannot move from ${booking.status} to ${status}` });
    }
    await connection.query("UPDATE experience_bookings SET status=? WHERE id=?", [status, bookingId]);
    if (["Cancelled", "Declined"].includes(status) && booking.departure_id) {
      await connection.query(
        `UPDATE package_departures SET booked_seats=GREATEST(0, booked_seats-?),
         status=CASE WHEN status='Sold Out' THEN 'Available' ELSE status END WHERE id=?`,
        [Number(booking.guests || 1), booking.departure_id]
      );
    }
    await connection.commit();

    res.json({
      success: true,
      message: "Package booking status updated",
    });
  } catch (err) {
    console.log("PACKAGE BOOKING STATUS ERROR:", err.message);
    res.status(500).json({
      message: "Package booking status update failed",
      error: err.message,
    });
  }
});

app.get("/api/trip-packages/:id/departures", async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT *
      FROM package_departures
      WHERE experience_id = ?
      ORDER BY departure_date ASC
      `,
      [req.params.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      message: "Departures load failed",
      error: err.message,
    });
  }
});

app.post("/api/trip-packages/:id/departures", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const { departure_date, total_seats, status } = req.body;
    const seats = Number(total_seats);
    const departureDate = new Date(`${departure_date}T00:00:00Z`);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);

    const owners = await query("SELECT host_id FROM experiences WHERE id=? LIMIT 1", [req.params.id]);
    if (!owners.length) return res.status(404).json({ message: "Trip package not found" });
    if (Number(owners[0].host_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(departure_date || "")) ||
        !Number.isFinite(departureDate.getTime()) || departureDate < today ||
        !Number.isInteger(seats) || seats < 1 || seats > 10000 ||
        !["Available", "Cancelled"].includes(status || "Available")) {
      return res.status(400).json({ message: "Enter a valid future departure and seat capacity" });
    }

    const result = await query(
      `
      INSERT INTO package_departures
      (experience_id, departure_date, total_seats, booked_seats, status)
      VALUES (?, ?, ?, 0, ?)
      `,
      [
        req.params.id,
        departure_date,
        seats,
        status || "Available",
      ]
    );

    res.json({
      success: true,
      departureId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({
      message: "Departure create failed",
      error: err.message,
    });
  }
});

app.put("/api/departures/:id", verifyToken, requireApprovedHost, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const departureId = Number(req.params.id);
    const departureDate = String(req.body.departure_date || "");
    const totalSeats = Number(req.body.total_seats);
    const requestedStatus = String(req.body.status || "Available");
    if (!departureId || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || !Number.isInteger(totalSeats) ||
        totalSeats < 1 || totalSeats > 10000 || !["Available", "Sold Out", "Cancelled"].includes(requestedStatus)) {
      return res.status(400).json({ message: "Invalid departure details" });
    }
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT d.*,e.host_id FROM package_departures d JOIN experiences e ON e.id=d.experience_id
       WHERE d.id=? LIMIT 1 FOR UPDATE`, [departureId]
    );
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Departure not found" }); }
    const departure = rows[0];
    if (Number(departure.host_id) !== Number(req.user.id) && req.user.role !== "admin") {
      await connection.rollback(); return res.status(403).json({ message: "Access denied" });
    }
    if (totalSeats < Number(departure.booked_seats || 0)) {
      await connection.rollback();
      return res.status(409).json({ message: `Capacity cannot be below ${departure.booked_seats} booked seats` });
    }
    if (requestedStatus === "Cancelled" && Number(departure.booked_seats || 0) > 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Cancel active bookings before cancelling this departure" });
    }
    const status = totalSeats === Number(departure.booked_seats || 0) ? "Sold Out" : requestedStatus === "Sold Out" ? "Available" : requestedStatus;
    await connection.query(
      "UPDATE package_departures SET departure_date=?,total_seats=?,status=? WHERE id=?",
      [departureDate, totalSeats, status, departureId]
    );
    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Departure update failed", error: err.message });
  } finally { connection.release(); }
});

app.delete("/api/departures/:id", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const owners = await query(
      `SELECT e.host_id,d.booked_seats FROM package_departures d JOIN experiences e ON e.id=d.experience_id
       WHERE d.id=? LIMIT 1`, [req.params.id]
    );
    if (!owners.length) return res.status(404).json({ message: "Departure not found" });
    if (Number(owners[0].host_id) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    if (Number(owners[0].booked_seats || 0) > 0) {
      return res.status(409).json({ message: "A departure with active bookings cannot be deleted" });
    }
    await query("DELETE FROM package_departures WHERE id = ?", [req.params.id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      message: "Departure delete failed",
      error: err.message,
    });
  }
});
/* HOST - UPDATE TRIP PACKAGE */

app.put("/api/trip-packages/:id", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const packageId = Number(req.params.id);
    const hostId = Number(req.user.id);

    if (!packageId) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const existing = await query(
      `
      SELECT id, host_id
      FROM experiences
      WHERE id = ?
      AND package_type IS NOT NULL
      LIMIT 1
      `,
      [packageId]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Trip package not found" });
    }

    if (
      Number(existing[0].host_id) !== hostId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      title,
      category,
      location,
      city,
      price,
      package_days,
      package_nights,
      max_people,
      hotel_name,
      transport,
      meals,
      pickup_location,
      language,
      host_name,
      description,
      includes,
      itinerary,
      cancellation_policy,
      package_type,
      status,
    } = req.body;

    if (!title || !location || !price) {
      return res.status(400).json({
        message: "Title, destination and price are required",
      });
    }

    await query(
      `
      UPDATE experiences
      SET
        title = ?,
        category = ?,
        location = ?,
        city = ?,
        price = ?,
        package_days = ?,
        package_nights = ?,
        max_people = ?,
        hotel_name = ?,
        transport = ?,
        meals = ?,
        pickup_location = ?,
        language = ?,
        host_name = ?,
        description = ?,
        includes = ?,
        itinerary = ?,
        cancellation_policy = ?,
        package_type = ?,
        status = ?
      WHERE id = ?
      `,
      [
        title,
        category || "Family",
        location,
        city || location,
        Number(price || 0),
        Number(package_days || 1),
        Number(package_nights || 0),
        Number(max_people || 10),
        hotel_name || null,
        transport || null,
        meals || null,
        pickup_location || null,
        language || "English",
        host_name || "Dovail Travel",
        description || "",
        includes || "",
        itinerary || "",
        cancellation_policy || "",
        package_type || "Trip Package",
        status || "active",
        packageId,
      ]
    );

    res.json({
      success: true,
      message: "Trip package updated successfully",
    });
  } catch (err) {
    console.log("UPDATE TRIP PACKAGE ERROR:", err.message);

    res.status(500).json({
      message: "Trip package update failed",
      error: err.message,
    });
  }
});

/* HOST - DELETE TRIP PACKAGE */

app.delete("/api/trip-packages/:id", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const packageId = Number(req.params.id);
    const hostId = Number(req.user.id);

    if (!packageId) {
      return res.status(400).json({ message: "Invalid package id" });
    }

    const existing = await query(
      `
      SELECT id, host_id
      FROM experiences
      WHERE id = ?
      AND package_type IS NOT NULL
      LIMIT 1
      `,
      [packageId]
    );

    if (!existing.length) {
      return res.status(404).json({ message: "Trip package not found" });
    }

    if (
      Number(existing[0].host_id) !== hostId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const activeBookings = await query(
      "SELECT id FROM experience_bookings WHERE experience_id=? AND status NOT IN ('Cancelled','Declined','Completed') LIMIT 1",
      [packageId]
    );
    if (activeBookings.length) {
      return res.status(409).json({ message: "A trip package with active bookings cannot be deleted" });
    }

    await query("DELETE FROM package_departures WHERE experience_id = ?", [
      packageId,
    ]);

    await query("DELETE FROM experience_images WHERE experience_id = ?", [
      packageId,
    ]);

    await query("DELETE FROM experience_bookings WHERE experience_id = ?", [
      packageId,
    ]);

    await query("DELETE FROM experience_reviews WHERE experience_id = ?", [
      packageId,
    ]);

    await query("DELETE FROM experiences WHERE id = ?", [packageId]);

    await addAuditLog({
      adminId: req.user.role === "admin" ? req.user.id : null,
      action: "TRIP_PACKAGE_DELETED", entityType: "experience", entityId: packageId,
      message: `Trip package #${packageId} deleted by ${req.user.role === "admin" ? "admin" : "host"}`,
      metadata: { actorUserId: req.user.id },
    });

    res.json({
      success: true,
      message: "Trip package deleted successfully",
    });
  } catch (err) {
    console.log("DELETE TRIP PACKAGE ERROR:", err.message);

    res.status(500).json({
      message: "Trip package delete failed",
      error: err.message,
    });
  }
});
/* HOST WALLET + PAYOUTS */

app.get("/api/host/wallet/:hostId", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.params.hostId);

    if (Number(req.user.id) !== hostId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const earningsRows = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN b.status IN ('Confirmed','Checked-in','Checked-out') THEN b.total ELSE 0 END), 0) AS total_earnings,
        COALESCE(SUM(CASE WHEN b.status IN ('Confirmed','Checked-in') THEN b.total ELSE 0 END), 0) AS pending_earnings,
        COALESCE(SUM(CASE WHEN b.status = 'Checked-out' THEN b.total ELSE 0 END), 0) AS eligible_earnings
      FROM servia_bookings b
      JOIN servia_properties p ON p.id = b.property_id
      WHERE p.user_id = ?
      `,
      [hostId]
    );

    const payoutRows = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('Pending','Approved') THEN amount ELSE 0 END), 0) AS pending_payouts,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paid_payouts
      FROM servia_host_payouts
      WHERE host_id = ?
      `,
      [hostId]
    );

    const bankRows = await query(
      `
      SELECT id, account_holder, bank_name, account_number, ifsc_code, upi_id
      FROM servia_host_bank_accounts
      WHERE host_id = ?
      LIMIT 1
      `,
      [hostId]
    );

    const totalEarnings = Number(earningsRows[0]?.total_earnings || 0);
    const eligibleEarnings = Number(earningsRows[0]?.eligible_earnings || 0);
    const pendingPayouts = Number(payoutRows[0]?.pending_payouts || 0);
    const paidPayouts = Number(payoutRows[0]?.paid_payouts || 0);

    const available_balance = Math.max(
      0,
      eligibleEarnings - pendingPayouts - paidPayouts
    );

    const recentPayouts = await query(
      `
      SELECT *
      FROM servia_host_payouts
      WHERE host_id = ?
      ORDER BY id DESC
      LIMIT 20
      `,
      [hostId]
    );

    res.json({
      success: true,
      wallet: {
        total_earnings: totalEarnings,
        pending_earnings: Number(earningsRows[0]?.pending_earnings || 0),
        eligible_earnings: eligibleEarnings,
        pending_payouts: pendingPayouts,
        paid_payouts: paidPayouts,
        available_balance,
      },
      bank_account: bankRows[0] || null,
      payouts: recentPayouts,
    });
  } catch (err) {
    console.log("HOST WALLET ERROR:", err.message);
    res.status(500).json({
      message: "Host wallet load failed",
      error: err.message,
    });
  }
});

app.post("/api/host/bank-account", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.user.id);

    const accountHolder = String(req.body.account_holder || "").trim();
    const bankName = String(req.body.bank_name || "").trim();
    const accountNumber = String(req.body.account_number || "").trim();
    const ifscCode = String(req.body.ifsc_code || "").trim().toUpperCase();
    const upiId = String(req.body.upi_id || "").trim();

    if (!accountHolder) {
      return res.status(400).json({ message: "Account holder name is required" });
    }

    if (!upiId && (!bankName || !accountNumber || !ifscCode)) {
      return res.status(400).json({
        message: "Add either UPI ID or complete bank account details",
      });
    }

    await query(
      `
      INSERT INTO servia_host_bank_accounts
      (host_id, account_holder, bank_name, account_number, ifsc_code, upi_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        account_holder = VALUES(account_holder),
        bank_name = VALUES(bank_name),
        account_number = VALUES(account_number),
        ifsc_code = VALUES(ifsc_code),
        upi_id = VALUES(upi_id)
      `,
      [hostId, accountHolder, bankName, accountNumber, ifscCode, upiId]
    );

    res.json({
      success: true,
      message: "Bank account saved successfully",
    });
  } catch (err) {
    console.log("BANK ACCOUNT SAVE ERROR:", err.message);
    res.status(500).json({
      message: "Bank account save failed",
      error: err.message,
    });
  }
});

app.post("/api/host/payout-request", verifyToken, requireApprovedHost, async (req, res) => {
  try {
    const hostId = Number(req.user.id);
    const amount = Number(req.body.amount || 0);
const kycRows = await query(
  `
  SELECT kyc_status
  FROM servia_users
  WHERE id = ?
  LIMIT 1
  `,
  [hostId]
);

if (!kycRows.length || kycRows[0].kyc_status !== "Approved") {
  return res.status(403).json({
    message: "KYC verification is required before requesting payouts",
  });
}

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payout amount" });
    }

    const walletRes = await new Promise((resolve, reject) => {
      query(
        `
        SELECT
          COALESCE(SUM(CASE WHEN b.status = 'Checked-out' THEN b.total ELSE 0 END), 0) AS eligible_earnings
        FROM servia_bookings b
        JOIN servia_properties p ON p.id = b.property_id
        WHERE p.user_id = ?
        `,
        [hostId]
      )
        .then(resolve)
        .catch(reject);
    });

    const payoutRows = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN status IN ('Pending','Approved') THEN amount ELSE 0 END), 0) AS pending_payouts,
        COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS paid_payouts
      FROM servia_host_payouts
      WHERE host_id = ?
      `,
      [hostId]
    );

    const eligibleEarnings = Number(walletRes[0]?.eligible_earnings || 0);
    const pendingPayouts = Number(payoutRows[0]?.pending_payouts || 0);
    const paidPayouts = Number(payoutRows[0]?.paid_payouts || 0);
    const availableBalance = Math.max(
      0,
      eligibleEarnings - pendingPayouts - paidPayouts
    );

    if (amount > availableBalance) {
      return res.status(400).json({
        message: "Requested amount exceeds available balance",
        available_balance: availableBalance,
      });
    }

    const bankRows = await query(
      `
      SELECT *
      FROM servia_host_bank_accounts
      WHERE host_id = ?
      LIMIT 1
      `,
      [hostId]
    );

    if (!bankRows.length) {
      return res.status(400).json({
        message: "Please add bank account details before requesting payout",
      });
    }

    const bank = bankRows[0];

    const result = await query(
      `
      INSERT INTO servia_host_payouts
      (
        host_id,
        amount,
        status,
        payout_method,
        bank_name,
        account_holder,
        account_number,
        ifsc_code,
        upi_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        hostId,
        amount,
        "Pending",
        bank.upi_id ? "upi" : "bank",
        bank.bank_name || null,
        bank.account_holder || null,
        bank.account_number || null,
        bank.ifsc_code || null,
        bank.upi_id || null,
      ]
    );

    res.json({
      success: true,
      message: "Payout request submitted",
      payoutId: result.insertId,
    });
  } catch (err) {
    console.log("PAYOUT REQUEST ERROR:", err.message);
    res.status(500).json({
      message: "Payout request failed",
      error: err.message,
    });
  }
});

app.get("/api/admin/payouts", verifyToken,
requireAdminRole("Finance Admin"),async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        p.*,
        u.fullname AS host_name,
        u.email AS host_email,
        u.phone AS host_phone
      FROM servia_host_payouts p
      LEFT JOIN servia_users u ON u.id = p.host_id
      ORDER BY p.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("ADMIN PAYOUTS ERROR:", err.message);
    res.status(500).json({
      message: "Admin payouts load failed",
      error: err.message,
    });
  }
});

app.put("/api/admin/payouts/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payoutId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const adminNote = String(req.body.admin_note || "").trim();

    const allowed = ["Pending", "Approved", "Rejected", "Paid"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid payout status" });
    }

    const rows = await query(
      `
      SELECT *
      FROM servia_host_payouts
      WHERE id = ?
      LIMIT 1
      `,
      [payoutId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Payout request not found" });
    }

    const nowField =
      status === "Approved"
        ? ", approved_at = NOW()"
        : status === "Paid"
        ? ", paid_at = NOW()"
        : "";

    await query(
      `
      UPDATE servia_host_payouts
      SET status = ?, admin_note = ?
      ${nowField}
      WHERE id = ?
      `,
      [status, adminNote || null, payoutId]
    );
await addAuditLog({
  adminId: req.user.id,
  action: "HOST_PAYOUT_APPROVED",
  entityType: "payout",
  entityId: payoutId,
  message: `Approved payout #${payoutId}`,
});
    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        rows[0].host_id,
        "Payout status updated",
        `Your payout request of ₹${Number(rows[0].amount).toLocaleString(
          "en-IN"
        )} is now ${status}.`,
        "payout",
        0,
      ]
    );

    res.json({
      success: true,
      message: `Payout marked as ${status}`,
    });
  } catch (err) {
    console.log("ADMIN PAYOUT STATUS ERROR:", err.message);
    res.status(500).json({
      message: "Payout status update failed",
      error: err.message,
    });
  }
});

/* HOST KYC - S3 */

app.get("/api/host/kyc", verifyToken, async (req, res) => {
  try {
    const hostId = Number(req.user.id);

    const rows = await query(
      `
      SELECT *
      FROM servia_host_kyc
      WHERE host_id = ?
      LIMIT 1
      `,
      [hostId]
    );

    res.json({
      success: true,
      kyc: rows[0] || null,
    });
  } catch (err) {
    console.log("HOST KYC LOAD ERROR:", err.message);
    res.status(500).json({
      message: "KYC load failed",
      error: err.message,
    });
  }
});

app.post(
  "/api/host/kyc",
  verifyToken,
  upload.fields([
    { name: "id_front", maxCount: 1 },
    { name: "id_back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "address_proof", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const hostId = Number(req.user.id);

      const idFront = req.files?.id_front?.[0];
      const idBack = req.files?.id_back?.[0];
      const selfie = req.files?.selfie?.[0];
      const addressProof = req.files?.address_proof?.[0];

      if (!idFront || !selfie || !addressProof) {
        return res.status(400).json({
          message: "ID front, selfie and address proof are required",
        });
      }

      const oldRows = await query(
        `
        SELECT id_front_key, id_back_key, selfie_key, address_proof_key
        FROM servia_host_kyc
        WHERE host_id = ?
        LIMIT 1
        `,
        [hostId]
      );

      const [frontUpload, backUpload, selfieUpload, addressUpload] =
        await Promise.all([
          uploadFileToS3(idFront, "kyc"),
          idBack ? uploadFileToS3(idBack, "kyc") : Promise.resolve(null),
          uploadFileToS3(selfie, "kyc"),
          uploadFileToS3(addressProof, "kyc"),
        ]);

      await query(
        `
        INSERT INTO servia_host_kyc
        (
          host_id,
          id_front,
          id_front_key,
          id_back,
          id_back_key,
          selfie,
          selfie_key,
          address_proof,
          address_proof_key,
          status,
          rejection_reason
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', NULL)
        ON DUPLICATE KEY UPDATE
          id_front = VALUES(id_front),
          id_front_key = VALUES(id_front_key),
          id_back = VALUES(id_back),
          id_back_key = VALUES(id_back_key),
          selfie = VALUES(selfie),
          selfie_key = VALUES(selfie_key),
          address_proof = VALUES(address_proof),
          address_proof_key = VALUES(address_proof_key),
          status = 'Pending',
          rejection_reason = NULL,
          verified_at = NULL
        `,
        [
          hostId,
          frontUpload.url,
          frontUpload.key,
          backUpload?.url || null,
          backUpload?.key || null,
          selfieUpload.url,
          selfieUpload.key,
          addressUpload.url,
          addressUpload.key,
        ]
      );

      await query(
        `
        UPDATE servia_users
        SET kyc_status = ?
        WHERE id = ?
        `,
        ["Pending", hostId]
      );

      if (oldRows.length) {
        const oldKeys = [
          oldRows[0].id_front_key,
          oldRows[0].id_back_key,
          oldRows[0].selfie_key,
          oldRows[0].address_proof_key,
        ];

        for (const key of oldKeys) {
          if (key) {
            try {
              await deleteS3File(key);
            } catch (deleteErr) {
              console.log("OLD KYC DELETE ERROR:", deleteErr.message);
            }
          }
        }
      }

      res.json({
        success: true,
        message: "KYC submitted successfully",
        status: "Pending",
      });
    } catch (err) {
      console.log("HOST KYC SUBMIT ERROR:", err.message);
      res.status(500).json({
        message: "KYC submit failed",
        error: err.message,
      });
    }
  }
);

app.get("/api/admin/host-kyc", verifyToken,requireAdminRole("KYC Admin", "Moderator"), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        k.*,
        u.fullname AS host_name,
        u.email AS host_email,
        u.phone AS host_phone
      FROM servia_host_kyc k
      JOIN servia_users u ON u.id = k.host_id
      ORDER BY k.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("ADMIN HOST KYC LOAD ERROR:", err.message);
    res.status(500).json({
      message: "Admin KYC load failed",
      error: err.message,
    });
  }
});

app.put(
  "/api/admin/host-kyc/:id/status",
  verifyToken,
  verifyAdmin,
  async (req, res) => {
    try {
      const kycId = Number(req.params.id);
      const status = String(req.body.status || "").trim();
      const rejectionReason = String(req.body.rejection_reason || "").trim();

      if (!["Approved", "Rejected"].includes(status)) {
        return res.status(400).json({
          message: "Invalid KYC status",
        });
      }

      if (status === "Rejected" && !rejectionReason) {
        return res.status(400).json({
          message: "Rejection reason is required",
        });
      }

      const rows = await query(
        `
        SELECT *
        FROM servia_host_kyc
        WHERE id = ?
        LIMIT 1
        `,
        [kycId]
      );

      if (!rows.length) {
        return res.status(404).json({
          message: "KYC request not found",
        });
      }

      const kyc = rows[0];

      await query(
        `
        UPDATE servia_host_kyc
        SET 
          status = ?,
          rejection_reason = ?,
          verified_at = CASE WHEN ? = 'Approved' THEN NOW() ELSE NULL END
        WHERE id = ?
        `,
        [
          status,
          status === "Rejected" ? rejectionReason : null,
          status,
          kycId,
        ]
      );

      await query(
        `
        UPDATE servia_users
        SET kyc_status = ?,
            role = CASE WHEN ?='Approved' THEN 'host' WHEN role='admin' THEN role ELSE 'guest' END
        WHERE id = ?
        `,
        [status, status, kyc.host_id]
      );
await addAuditLog({
  adminId: req.user.id,
  action:
    status === "Approved"
      ? "HOST_KYC_APPROVED"
      : "HOST_KYC_REJECTED",
  entityType: "host_kyc",
  entityId: kycId,
  message: `Host #${kyc.host_id} KYC ${status}`,
  metadata: {
    status,
    rejectionReason,
  },
});
      await query(
        `
        INSERT INTO servia_notifications
        (user_id, title, message, type, is_read)
        VALUES (?, ?, ?, ?, 0)
        `,
        [
          kyc.host_id,
          "Host verification updated",
          status === "Approved"
            ? "Your host verification has been approved."
            : `Your host verification was rejected. ${rejectionReason}`,
          "kyc",
        ]
      );

      res.json({
        success: true,
        message: `KYC marked as ${status}`,
      });
    } catch (err) {
      console.log("ADMIN HOST KYC STATUS ERROR:", err.message);
      res.status(500).json({
        message: "KYC status update failed",
        error: err.message,
      });
    }
  }
);
app.get("/api/admin/host-kyc/:id/details", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const kycId = Number(req.params.id);

    const kycRows = await query(
      `
      SELECT 
        k.*,
        u.id AS host_id,
        u.fullname,
        u.email,
        u.phone,
        u.profile_image,
        u.kyc_status,
        u.created_at AS host_created_at
      FROM servia_host_kyc k
      JOIN servia_users u ON u.id = k.host_id
      WHERE k.id = ?
      LIMIT 1
      `,
      [kycId]
    );

    if (!kycRows.length) {
      return res.status(404).json({ message: "KYC request not found" });
    }

    const hostId = kycRows[0].host_id;

    const bankRows = await query(
      `SELECT * FROM servia_host_bank_details WHERE host_id=? LIMIT 1`,
      [hostId]
    ).catch(() => []);

    const walletRows = await query(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type='earning' THEN amount ELSE 0 END),0) AS earnings,
        COALESCE(SUM(CASE WHEN type='payout' THEN amount ELSE 0 END),0) AS payouts
      FROM servia_host_wallet_transactions
      WHERE host_id=?
      `,
      [hostId]
    ).catch(() => [{ earnings: 0, payouts: 0 }]);

    const listings = await query(
      `
      SELECT id, title, location, price, status, image
      FROM servia_properties
      WHERE user_id=?
      ORDER BY id DESC
      LIMIT 20
      `,
      [hostId]
    ).catch(() => []);

    const payouts = await query(
      `
      SELECT *
      FROM servia_host_payouts
      WHERE host_id=?
      ORDER BY id DESC
      LIMIT 10
      `,
      [hostId]
    ).catch(() => []);

    res.json({
      success: true,
      kyc: kycRows[0],
      bank: bankRows[0] || null,
      wallet: walletRows[0] || { earnings: 0, payouts: 0 },
      listings,
      payouts,
    });
  } catch (err) {
    console.log("ADMIN KYC DETAILS ERROR:", err.message);
    res.status(500).json({ message: "KYC details load failed", error: err.message });
  }
});

app.put("/api/admin/host-kyc/:id/request-reupload", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const kycId = Number(req.params.id);
    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const rows = await query("SELECT * FROM servia_host_kyc WHERE id=? LIMIT 1", [kycId]);

    if (!rows.length) {
      return res.status(404).json({ message: "KYC request not found" });
    }

    const kyc = rows[0];

    await query(
      `
      UPDATE servia_host_kyc
      SET status='Rejected', rejection_reason=?, verified_at=NULL
      WHERE id=?
      `,
      [reason, kycId]
    );

    await query(
      `UPDATE servia_users SET kyc_status='Rejected', kyc_note=? WHERE id=?`,
      [reason, kyc.host_id]
    );

    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [kyc.host_id, "KYC document mismatch", reason, "kyc"]
    );

    res.json({ success: true, message: "Re-upload request sent" });
  } catch (err) {
    console.log("KYC REUPLOAD ERROR:", err.message);
    res.status(500).json({ message: "Re-upload request failed", error: err.message });
  }
});

app.put("/api/admin/host-kyc/:id/request-reupload", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const kycId = Number(req.params.id);
    const reason = String(req.body.reason || "").trim();

    if (!reason) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const rows = await query(
      "SELECT * FROM servia_host_kyc WHERE id=? LIMIT 1",
      [kycId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "KYC request not found" });
    }

    const kyc = rows[0];

    await query(
      `
      UPDATE servia_host_kyc
      SET status='Rejected', rejection_reason=?, verified_at=NULL
      WHERE id=?
      `,
      [reason, kycId]
    );

    await query(
      "UPDATE servia_users SET kyc_status='Rejected', kyc_note=? WHERE id=?",
      [reason, kyc.host_id]
    );

    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        kyc.host_id,
        "KYC document mismatch",
        reason,
        "kyc",
      ]
    );

    res.json({
      success: true,
      message: "Re-upload request sent to host",
    });
  } catch (err) {
    console.log("KYC REUPLOAD REQUEST ERROR:", err.message);
    res.status(500).json({
      message: "Re-upload request failed",
      error: err.message,
    });
  }
});
/* ADMIN SUPPORT CENTER */

app.get("/api/admin/support/tickets", verifyToken,
requireAdminRole("Support Admin"), async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        t.*,
        u.fullname AS user_name,
        u.email AS user_email,
        a.fullname AS assigned_admin_name
      FROM servia_support_tickets t
      LEFT JOIN servia_users u ON u.id = t.user_id
      LEFT JOIN servia_users a ON a.id = t.assigned_admin_id
      ORDER BY 
        CASE t.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        t.updated_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.log("ADMIN SUPPORT TICKETS ERROR:", err.message);
    res.status(500).json({ message: "Support tickets load failed" });
  }
});

app.get("/api/admin/support/tickets/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    const tickets = await query(
      `
      SELECT 
        t.*,
        u.fullname AS user_name,
        u.email AS user_email,
        u.phone AS user_phone
      FROM servia_support_tickets t
      LEFT JOIN servia_users u ON u.id = t.user_id
      WHERE t.id=?
      LIMIT 1
      `,
      [ticketId]
    );

    if (!tickets.length) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const messages = await query(
      `
      SELECT 
        m.*,
        u.fullname AS sender_name,
        u.email AS sender_email
      FROM servia_support_messages m
      LEFT JOIN servia_users u ON u.id = m.sender_id
      WHERE m.ticket_id=?
      ORDER BY m.id ASC
      `,
      [ticketId]
    );

    res.json({
      ticket: tickets[0],
      messages,
    });
  } catch (err) {
    console.log("ADMIN SUPPORT DETAILS ERROR:", err.message);
    res.status(500).json({ message: "Ticket details load failed" });
  }
});

app.put("/api/admin/support/tickets/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { status, priority, assigned_admin_id } = req.body;

    await query(
      `
      UPDATE servia_support_tickets
      SET status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          assigned_admin_id = COALESCE(?, assigned_admin_id)
      WHERE id=?
      `,
      [status || null, priority || null, assigned_admin_id || null, ticketId]
    );
await addAuditLog({
  adminId: req.user.id,
  action: "SUPPORT_UPDATED",
  entityType: "ticket",
  entityId: ticketId,
  message: "Support ticket updated",
});
    res.json({ success: true, message: "Ticket updated" });
  } catch (err) {
    console.log("ADMIN SUPPORT UPDATE ERROR:", err.message);
    res.status(500).json({ message: "Ticket update failed" });
  }
});

app.post("/api/admin/support/tickets/:id/messages", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const message = String(req.body.message || "").trim();
    const internalNote = req.body.internal_note ? 1 : 0;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    await query(
      `
      INSERT INTO servia_support_messages
      (ticket_id, sender_id, sender_role, message, internal_note)
      VALUES (?, ?, 'admin', ?, ?)
      `,
      [ticketId, req.user.id, message, internalNote]
    );

    await query(
      "UPDATE servia_support_tickets SET updated_at=NOW() WHERE id=?",
      [ticketId]
    );

    res.json({ success: true, message: "Reply added" });
  } catch (err) {
    console.log("ADMIN SUPPORT MESSAGE ERROR:", err.message);
    res.status(500).json({ message: "Reply failed" });
  }
});
app.get("/api/admin/properties/:id/details", verifyToken,requireAdminRole("Moderator"), async (req, res) => {
  try {
    const propertyId = Number(req.params.id);

    const rows = await query(
      `
      SELECT 
        p.*,
        u.id AS host_id,
        u.fullname AS host_name,
        u.email AS host_email,
        u.phone AS host_phone,
        u.profile_image AS host_image,
        u.kyc_status AS host_kyc_status,
        u.created_at AS host_since
      FROM servia_properties p
      LEFT JOIN servia_users u ON u.id = p.user_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [propertyId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Property not found" });
    }

    const images = await query(
      `
      SELECT *
      FROM servia_property_images
      WHERE property_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [propertyId]
    ).catch(() => []);

    const bookings = await query(
      `
      SELECT COUNT(*) AS total_bookings,
             COALESCE(SUM(total),0) AS revenue
      FROM servia_bookings
      WHERE property_id = ?
      AND status != 'Cancelled'
      `,
      [propertyId]
    ).catch(() => [{ total_bookings: 0, revenue: 0 }]);

    const reviews = await query(
      `
      SELECT COUNT(*) AS total_reviews,
             ROUND(AVG(rating),1) AS avg_rating
      FROM servia_reviews
      WHERE property_id = ?
      AND COALESCE(status,'Approved')='Approved'
      `,
      [propertyId]
    ).catch(() => [{ total_reviews: 0, avg_rating: 0 }]);

    res.json({
      success: true,
      property: rows[0],
      images,
      stats: {
        bookings: bookings[0]?.total_bookings || 0,
        revenue: bookings[0]?.revenue || 0,
        reviews: reviews[0]?.total_reviews || 0,
        rating: reviews[0]?.avg_rating || rows[0].rating || 0,
      },
    });
  } catch (err) {
    console.log("ADMIN PROPERTY DETAILS ERROR:", err.message);
    res.status(500).json({
      message: "Property details load failed",
      error: err.message,
    });
  }
});

app.put("/api/admin/properties/:id/moderation", verifyToken,requireAdminRole("Moderator"), async (req, res) => {
  try {
    const propertyId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const reason = String(req.body.reason || "").trim();

    const allowed = ["Published", "Pending", "Rejected", "Needs Changes", "Suspended", "Archived"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid property status" });
    }

    if (["Rejected", "Needs Changes", "Suspended"].includes(status) && !reason) {
      return res.status(400).json({
        message: "Reason is required",
      });
    }

    const rows = await query(
      `SELECT p.id,p.user_id,p.title,u.email FROM servia_properties p
       JOIN servia_users u ON u.id=p.user_id WHERE p.id=? LIMIT 1`,
      [propertyId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Property not found" });
    }

    const property = rows[0];

    await query(
      `
      UPDATE servia_properties
      SET status=?,
          rejection_reason=?,
          admin_note=?,
          approved_at = CASE WHEN ?='Published' THEN NOW() ELSE approved_at END,
          suspended_at = CASE WHEN ?='Suspended' THEN NOW() ELSE suspended_at END
      WHERE id=?
      `,
      [
        status,
        ["Rejected", "Needs Changes", "Suspended"].includes(status) ? reason : null,
        reason || null,
        status,
        status,
        propertyId,
      ]
    );
await addAuditLog({
  adminId: req.user.id,
  action: "PROPERTY_STATUS_CHANGED",
  entityType: "property",
  entityId: propertyId,
  message: `Property "${property.title}" changed to ${status}`,
  metadata: {
    status,
    reason,
  },
});
    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        property.user_id,
        "Listing status updated",
        `Your listing "${property.title}" is now ${status}.${reason ? ` Reason: ${reason}` : ""}`,
        "property",
      ]
    );
    await enqueueEmail({
      to: property.email, subject: `Listing review: ${property.title}`,
      type: "property_moderation", dedupeKey: `property_moderation:${propertyId}:${status}`,
      html: `<h2>Listing review updated</h2><p>Your listing <b>${property.title}</b> is now <b>${status}</b>.</p>${reason ? `<p>Admin note: ${reason}</p>` : ""}`,
    });

    res.json({
      success: true,
      message: `Property marked as ${status}`,
    });
  } catch (err) {
    console.log("ADMIN PROPERTY MODERATION ERROR:", err.message);
    res.status(500).json({
      message: "Property moderation failed",
      error: err.message,
    });
  }
});

app.get("/api/admin/finance", verifyToken,
requireAdminRole("Finance Admin"), async (req, res) => {
  try {
    const payments = await query(
      `
      SELECT 
        b.*,
        p.title AS property_title,
        guest.fullname AS guest_name,
        host.fullname AS host_name
      FROM servia_bookings b
      LEFT JOIN servia_properties p ON p.id = b.property_id
      LEFT JOIN servia_users guest ON guest.id = b.user_id
      LEFT JOIN servia_users host ON host.id = p.user_id
      ORDER BY b.id DESC
      LIMIT 300
      `
    );

    const payouts = await query(
      `
      SELECT 
        po.*,
        u.fullname AS host_name,
        u.email AS host_email
      FROM servia_host_payouts po
      LEFT JOIN servia_users u ON u.id = po.host_id
      ORDER BY po.id DESC
      LIMIT 300
      `
    ).catch(() => []);

    const ledger = await query(
      `
      SELECT *
      FROM servia_host_wallet_transactions
      ORDER BY id DESC
      LIMIT 300
      `
    ).catch(() => []);

    res.json({
      success: true,
      payments,
      payouts,
      ledger,
    });
  } catch (err) {
    console.log("ADMIN FINANCE ERROR:", err.message);
    res.status(500).json({
      message: "Finance load failed",
      error: err.message,
    });
  }
});

app.get("/api/admin/audit-logs", verifyToken,requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        l.*,
        u.fullname AS admin_name,
        u.email AS admin_email
      FROM servia_admin_audit_logs l
      LEFT JOIN servia_users u ON u.id = l.admin_id
      ORDER BY l.id DESC
      LIMIT 500
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("AUDIT LOG LOAD ERROR:", err.message);
    res.status(500).json({ message: "Audit logs load failed" });
  }
});

app.get("/api/admin/settings", verifyToken,requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM servia_platform_settings WHERE id=1 LIMIT 1"
    );

    res.json(rows[0] || {});
  } catch (err) {
    console.log("ADMIN SETTINGS LOAD ERROR:", err.message);
    res.status(500).json({ message: "Settings load failed" });
  }
});

app.put("/api/admin/settings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const {
      platform_name,
      support_email,
      support_phone,
      commission_percent,
      service_fee_percent,
      tax_percent,
      minimum_payout,
      maintenance_mode,
      allow_new_hosts,
      allow_new_bookings,
      cancellation_hours,
      refund_days,
    } = req.body;

    await query(
      `
      UPDATE servia_platform_settings
      SET platform_name=?,
          support_email=?,
          support_phone=?,
          commission_percent=?,
          service_fee_percent=?,
          tax_percent=?,
          minimum_payout=?,
          maintenance_mode=?,
          allow_new_hosts=?,
          allow_new_bookings=?,
          cancellation_hours=?,
          refund_days=?
      WHERE id=1
      `,
      [
        platform_name,
        support_email,
        support_phone,
        Number(commission_percent || 10),
        Number(service_fee_percent || 5),
        Number(tax_percent || 12),
        Number(minimum_payout || 1000),
        maintenance_mode ? 1 : 0,
        allow_new_hosts ? 1 : 0,
        allow_new_bookings ? 1 : 0,
        Number(cancellation_hours || 24),
        Number(refund_days || 7),
      ]
    );

    await addAuditLog({
      adminId: req.user.id,
      action: "PLATFORM_SETTINGS_UPDATED",
      entityType: "settings",
      entityId: 1,
      message: "Platform settings updated",
    });

    res.json({ success: true, message: "Settings updated" });
  } catch (err) {
    console.log("ADMIN SETTINGS UPDATE ERROR:", err.message);
    res.status(500).json({ message: "Settings update failed" });
  }
});
app.get("/api/admin/admins", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT id, fullname, email, phone, role, admin_role, is_active, created_at
      FROM servia_users
      WHERE role='admin'
      ORDER BY id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("ADMIN LIST ERROR:", err.message);
    res.status(500).json({ message: "Admin list failed" });
  }
});

app.put("/api/admin/admins/:id", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    const adminRole = String(req.body.admin_role || "").trim();
    const isActive = req.body.is_active ? 1 : 0;

    const allowedRoles = [
      "Super Admin",
      "Finance Admin",
      "Support Admin",
      "KYC Admin",
      "Moderator",
      "Read Only",
    ];

    if (!allowedRoles.includes(adminRole)) {
      return res.status(400).json({ message: "Invalid admin role" });
    }

    await query(
      `
      UPDATE servia_users
      SET role='admin', admin_role=?, is_active=?
      WHERE id=?
      `,
      [adminRole, isActive, adminId]
    );

    await addAuditLog({
      adminId: req.user.id,
      action: "ADMIN_ROLE_UPDATED",
      entityType: "admin",
      entityId: adminId,
      message: `Admin #${adminId} updated to ${adminRole}`,
      metadata: { adminRole, isActive },
    });

    res.json({ success: true, message: "Admin updated" });
  } catch (err) {
    console.log("ADMIN UPDATE ERROR:", err.message);
    res.status(500).json({ message: "Admin update failed" });
  }
});

app.post("/api/admin/admins/promote", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const adminRole = String(req.body.admin_role || "Read Only").trim();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const users = await query(
      "SELECT id FROM servia_users WHERE LOWER(email)=LOWER(?) LIMIT 1",
      [email]
    );

    if (!users.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = users[0].id;

    await query(
      `
      UPDATE servia_users
      SET role='admin', admin_role=?, is_active=1
      WHERE id=?
      `,
      [adminRole, userId]
    );

    await addAuditLog({
      adminId: req.user.id,
      action: "USER_PROMOTED_TO_ADMIN",
      entityType: "admin",
      entityId: userId,
      message: `${email} promoted to ${adminRole}`,
    });

    res.json({ success: true, message: "User promoted to admin" });
  } catch (err) {
    console.log("ADMIN PROMOTE ERROR:", err.message);
    res.status(500).json({ message: "Promote failed" });
  }
});

app.put("/api/admin/admins/:id/revoke", verifyToken, requireAdminRole("Super Admin"), async (req, res) => {
  try {
    const adminId = Number(req.params.id);

    if (Number(req.user.id) === adminId) {
      return res.status(400).json({ message: "You cannot revoke yourself" });
    }

    await query(
      `
      UPDATE servia_users
      SET role='guest', admin_role=NULL, is_active=1
      WHERE id=?
      `,
      [adminId]
    );

    await addAuditLog({
      adminId: req.user.id,
      action: "ADMIN_ACCESS_REVOKED",
      entityType: "admin",
      entityId: adminId,
      message: `Admin access revoked for user #${adminId}`,
    });

    res.json({ success: true, message: "Admin access revoked" });
  } catch (err) {
    console.log("ADMIN REVOKE ERROR:", err.message);
    res.status(500).json({ message: "Revoke failed" });
  }
});

/* CUSTOMER HISTORY + DISCOVERY */

app.get("/api/host/:id", async (req, res) => {
  try {
    const hostId = Number(req.params.id);
    const rows = await query(
      `SELECT u.id, u.fullname, u.email, u.profile_image, u.created_at, u.kyc_status,
        ROUND(AVG(r.rating),1) AS rating, COUNT(DISTINCT r.id) AS review_count,
        COUNT(DISTINCT p.id) AS listing_count
       FROM servia_users u
       LEFT JOIN servia_properties p ON p.user_id=u.id
       LEFT JOIN servia_reviews r ON r.property_id=p.id AND COALESCE(r.status,'Approved')='Approved'
       WHERE u.id=? GROUP BY u.id LIMIT 1`,
      [hostId]
    );
    if (!rows.length) return res.status(404).json({ message: "Host not found" });
    res.json(rows[0]);
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Host profile failed to load" });
  } finally {
    connection.release();
  }
});

app.put("/api/experience-bookings/:id/cancel", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).json({ message: "Invalid booking" });

    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT * FROM experience_bookings WHERE id=? LIMIT 1 FOR UPDATE",
      [bookingId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Package booking not found" });
    }

    const booking = rows[0];
    if (Number(booking.user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      await connection.rollback();
      return res.status(403).json({ message: "Access denied" });
    }

    if (booking.status === "Cancelled") {
      await connection.rollback();
      return res.status(409).json({ message: "Booking is already cancelled" });
    }
    if (["Completed", "Declined"].includes(booking.status)) {
      await connection.rollback();
      return res.status(409).json({ message: `A ${booking.status.toLowerCase()} booking cannot be cancelled` });
    }
    if (new Date(booking.booking_date) <= new Date()) {
      await connection.rollback();
      return res.status(409).json({ message: "This trip has already started" });
    }

    await connection.query(
      "UPDATE experience_bookings SET status='Cancelled' WHERE id=?",
      [bookingId]
    );
    if (booking.departure_id) {
      await connection.query(
        `UPDATE package_departures
         SET booked_seats=GREATEST(0, booked_seats-?),
             status=CASE WHEN status='Sold Out' THEN 'Available' ELSE status END
         WHERE id=?`,
        [Number(booking.guests || 1), booking.departure_id]
      );
    }
    await connection.commit();
    res.json({
      success: true,
      message: booking.payment_status === "Paid"
        ? "Trip cancelled. Contact support to request the applicable refund."
        : "Trip cancelled successfully",
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Trip cancellation failed" });
  } finally {
    connection.release();
  }
});

app.get("/api/host/:id/properties", async (req, res) => {
  try {
    const rows = await query(
      `SELECT p.*, (SELECT image_url FROM servia_property_images WHERE property_id=p.id ORDER BY sort_order ASC,id ASC LIMIT 1) AS image
       FROM servia_properties p WHERE p.user_id=? AND COALESCE(p.status,'Published')='Published' ORDER BY p.id DESC`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Host listings failed to load" });
  }
});

app.get("/api/host/:id/reviews", async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, u.fullname AS guest_name, u.profile_image AS guest_image, p.title AS property_title
       FROM servia_reviews r JOIN servia_properties p ON p.id=r.property_id
       LEFT JOIN servia_users u ON u.id=r.user_id
       WHERE p.user_id=? AND COALESCE(r.status,'Approved')='Approved' ORDER BY r.id DESC`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Host reviews failed to load" });
  }
});

app.get("/api/services", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM servia_services WHERE is_active=1 ORDER BY sort_order ASC, id ASC");
    res.json(rows.map((item) => ({ ...item, includes: JSON.parse(item.includes_json || "[]") })));
  } catch (err) {
    res.status(500).json({ message: "Services failed to load" });
  }
});

app.get("/api/services/:id", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM servia_services WHERE id=? AND is_active=1 LIMIT 1", [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ message: "Service not found" });
    res.json({ ...rows[0], includes: JSON.parse(rows[0].includes_json || "[]") });
  } catch (err) {
    res.status(500).json({ message: "Service failed to load" });
  }
});

app.get("/api/service-bookings/user/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (userId !== Number(req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
    const rows = await query(
      `SELECT b.*, s.image, s.location, s.duration, s.currency
       FROM servia_service_bookings b LEFT JOIN servia_services s ON s.id=b.service_id
       WHERE b.user_id=? ORDER BY b.id DESC`, [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Service bookings failed to load" });
  }
});

app.post("/api/service-bookings", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const userId = Number(req.user.id);
    const serviceId = Number(req.body.service_id);
    const serviceDate = String(req.body.service_date || "");
    const people = Number(req.body.people || 0);
    const selectedDate = new Date(`${serviceDate}T00:00:00Z`);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    if (!serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !Number.isInteger(people) || people < 1 || !Number.isFinite(selectedDate.getTime()) || selectedDate < today) {
      return res.status(400).json({ message: "Invalid service booking details" });
    }
    await connection.beginTransaction();
    const [services] = await connection.query("SELECT * FROM servia_services WHERE id=? AND is_active=1 LIMIT 1 FOR UPDATE", [serviceId]);
    if (!services.length) { await connection.rollback(); return res.status(404).json({ message: "Service is unavailable" }); }
    const service = services[0];
    if (people > Number(service.max_people || people)) { await connection.rollback(); return res.status(400).json({ message: "People count exceeds service capacity" }); }
    const [capacityRows] = await connection.query(
      "SELECT COUNT(*) AS bookings FROM servia_service_bookings WHERE service_id=? AND service_date=? AND status NOT IN ('Cancelled','Declined') FOR UPDATE",
      [serviceId, serviceDate]
    );
    if (Number(capacityRows[0]?.bookings || 0) >= Number(service.max_bookings_per_day || 1)) {
      await connection.rollback(); return res.status(409).json({ message: "Service is fully booked for this date" });
    }
    const total = Number(service.price || 0) * people;
    const [result] = await connection.query(
      `INSERT INTO servia_service_bookings
       (user_id, service_id, service_title, provider, service_date, people, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Confirmed')`,
      [userId, serviceId, service.title, service.provider, serviceDate, people, total]
    );
    await connection.commit();
    res.status(201).json({ success: true, bookingId: result.insertId, total, currency: service.currency || "USD" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.log("SERVICE BOOKING ERROR:", err.message);
    res.status(500).json({ message: "Service booking failed" });
  } finally {
    connection.release();
  }
});

app.get("/api/admin/service-bookings", verifyToken, requireAdminRole("Support Admin", "Finance Admin"), async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.*, u.fullname AS customer_name, u.email AS customer_email, s.category, s.location, s.currency
       FROM servia_service_bookings b JOIN servia_users u ON u.id=b.user_id
       LEFT JOIN servia_services s ON s.id=b.service_id ORDER BY b.id DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Service bookings failed to load" });
  }
});

app.put("/api/admin/service-bookings/:id/status", verifyToken, requireAdminRole("Support Admin"), async (req, res) => {
  try {
    const status = String(req.body.status || "");
    if (!["Confirmed", "In Progress", "Completed", "Cancelled", "Declined"].includes(status)) return res.status(400).json({ message: "Invalid service status" });
    const result = await query("UPDATE servia_service_bookings SET status=? WHERE id=?", [status, Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Service booking not found" });
    res.json({ success: true, message: "Service booking status updated" });
  } catch (err) {
    res.status(500).json({ message: "Service status update failed" });
  }
});

app.get("/api/service-booking/:id", verifyToken, async (req, res) => {
  try {
    const rows = await query("SELECT * FROM servia_service_bookings WHERE id=? LIMIT 1", [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ message: "Service booking not found" });
    if (Number(rows[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") return res.status(403).json({ message: "Access denied" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Service booking failed to load" });
  }
});

app.put("/api/service-booking/:id/cancel", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const id = Number(req.params.id);
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT * FROM servia_service_bookings WHERE id=? LIMIT 1 FOR UPDATE", [id]);
    if (!rows.length) { await connection.rollback(); return res.status(404).json({ message: "Service booking not found" }); }
    if (Number(rows[0].user_id) !== Number(req.user.id) && req.user.role !== "admin") { await connection.rollback(); return res.status(403).json({ message: "Access denied" }); }
    if (!["Confirmed", "Pending"].includes(rows[0].status)) { await connection.rollback(); return res.status(409).json({ message: `A ${rows[0].status.toLowerCase()} booking cannot be cancelled` }); }
    if (new Date(rows[0].service_date) <= new Date()) { await connection.rollback(); return res.status(409).json({ message: "This service has already started" }); }
    await connection.query("UPDATE servia_service_bookings SET status='Cancelled', cancellation_reason=? WHERE id=?", [String(req.body.reason || "Cancelled by user").slice(0, 500), id]);
    await connection.commit();
    res.json({ success: true, message: "Service booking cancelled" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Service cancellation failed" });
  } finally {
    connection.release();
  }
});

app.get("/api/properties/:id/similar", async (req, res) => {
  try {
    const propertyId = Number(req.params.id);
    if (!propertyId) return res.status(400).json({ message: "Invalid property" });

    const sourceRows = await query(
      "SELECT id, category, location, price FROM servia_properties WHERE id=? LIMIT 1",
      [propertyId]
    );
    if (!sourceRows.length) return res.status(404).json({ message: "Property not found" });
    const source = sourceRows[0];
    const rows = await query(
      `SELECT p.*,
        (SELECT image_url FROM servia_property_images WHERE property_id=p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM servia_properties p
       WHERE p.id <> ? AND COALESCE(p.status, 'Published')='Published'
         AND (p.category=? OR p.location=?)
       ORDER BY ABS(COALESCE(p.price,0) - ?) ASC, p.id DESC
       LIMIT 6`,
      [propertyId, source.category, source.location, Number(source.price || 0)]
    );
    res.json(rows);
  } catch (err) {
    console.log("SIMILAR PROPERTIES ERROR:", err.message);
    res.status(500).json({ message: "Similar properties failed to load" });
  }
});

app.post("/api/auth/google", authLimiter, async (req, res) => {
  try {
    const identityToken = String(req.body.identityToken || "").trim();
    if (!identityToken) return res.status(400).json({ message: "Google identity token is required" });

    const { data } = await axios.get("https://oauth2.googleapis.com/tokeninfo", {
      params: { id_token: identityToken }, timeout: 8000,
    });
    if (!data?.email || data.email_verified !== "true") {
      return res.status(401).json({ message: "Google account could not be verified" });
    }
    if (process.env.GOOGLE_CLIENT_ID && data.aud !== process.env.GOOGLE_CLIENT_ID) {
      return res.status(401).json({ message: "Google token was issued for another application" });
    }

    const email = String(data.email).trim().toLowerCase();
    let users = await query("SELECT * FROM servia_users WHERE email=? LIMIT 1", [email]);
    if (!users.length) {
      const result = await query(
        "INSERT INTO servia_users (fullname, email, role, profile_image) VALUES (?, ?, 'guest', ?)",
        [String(data.name || "Dovail Guest").trim(), email, data.picture || null]
      );
      users = await query("SELECT * FROM servia_users WHERE id=? LIMIT 1", [result.insertId]);
    }
    const user = users[0];
    if (user.is_active === 0) return res.status(403).json({ message: "This account is suspended" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role || "guest" }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ success: true, token, user: publicUser(user) });
  } catch (err) {
    console.log("GOOGLE AUTH ERROR:", err.message);
    res.status(401).json({ message: "Google login failed" });
  }
});

app.post("/api/forgot-password", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Valid email is required" });
    const users = await query("SELECT id FROM servia_users WHERE email=? LIMIT 1", [email]);
    if (users.length) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await saveAuthCode(email, "password_reset", otp);
      await transporter.sendMail({
        from: process.env.MAIL_FROM, to: email, subject: "Reset your Dovail Stay password",
        html: `<h2>Dovail Stay</h2><p>Your password reset code is:</p><h1>${otp}</h1><p>This code expires in 10 minutes.</p>`,
      });
    }
    res.json({ success: true, message: "If that account exists, a reset code has been sent" });
  } catch (err) {
    console.log("FORGOT PASSWORD ERROR:", err.message);
    res.status(500).json({ message: "Unable to send reset code" });
  }
});

app.post("/api/reset-password", authLimiter, async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");
    if (!/^\d{6}$/.test(otp) || newPassword.length < 8) {
      return res.status(400).json({ message: "A valid code and password of at least 8 characters are required" });
    }
    if (!(await consumeAuthCode(email, "password_reset", otp))) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }
    await query("UPDATE servia_users SET password=? WHERE email=?", [await bcrypt.hash(newPassword, 12), email]);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.log("RESET PASSWORD ERROR:", err.message);
    res.status(500).json({ message: "Password reset failed" });
  }
});

app.get("/api/payments/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const rows = await query(
      `SELECT b.id, b.total AS amount, b.payment_status AS status,
        b.payment_method, b.payment_id AS razorpay_payment_id, b.razorpay_order_id,
        b.created_at, p.title, p.location,
        (SELECT image_url FROM servia_property_images WHERE property_id=p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM servia_bookings b
       LEFT JOIN servia_properties p ON p.id=b.property_id
       WHERE b.user_id=? AND (b.payment_status IS NOT NULL OR b.payment_id IS NOT NULL)
       ORDER BY b.id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.log("PAYMENT HISTORY ERROR:", err.message);
    res.status(500).json({ message: "Payment history failed to load" });
  }
});

app.get("/api/refunds/:userId", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (Number(req.user.id) !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    const rows = await query(
      `SELECT r.*, b.checkin, b.checkout, p.title, p.location,
        (SELECT image_url FROM servia_property_images WHERE property_id=p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image
       FROM servia_refund_requests r
       JOIN servia_bookings b ON b.id=r.booking_id
       LEFT JOIN servia_properties p ON p.id=b.property_id
       WHERE r.user_id=? ORDER BY r.id DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.log("REFUND HISTORY ERROR:", err.message);
    res.status(500).json({ message: "Refund history failed to load" });
  }
});

/* REFUNDS */

app.put("/api/bookings/:id/cancel", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const bookingId = Number(req.params.id);
    if (!bookingId) return res.status(400).json({ message: "Invalid booking" });

    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT * FROM servia_bookings WHERE id=? LIMIT 1 FOR UPDATE",
      [bookingId]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = rows[0];
    if (Number(booking.user_id) !== Number(req.user.id) && req.user.role !== "admin") {
      await connection.rollback();
      return res.status(403).json({ message: "Access denied" });
    }
    if (booking.status === "Cancelled") {
      await connection.rollback();
      return res.status(409).json({ message: "Booking is already cancelled" });
    }
    if (["Checked-in", "Checked-out", "Completed", "Declined"].includes(booking.status)) {
      await connection.rollback();
      return res.status(409).json({ message: `A ${booking.status.toLowerCase()} booking cannot be cancelled` });
    }
    if (new Date(booking.checkin) <= new Date()) {
      await connection.rollback();
      return res.status(409).json({ message: "This stay has already started" });
    }

    await connection.query("UPDATE servia_bookings SET status='Cancelled' WHERE id=?", [bookingId]);
    await connection.commit();
    res.json({
      success: true,
      message: booking.payment_status === "Paid"
        ? "Booking cancelled. You can now submit a refund request."
        : "Booking cancelled successfully",
    });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    res.status(500).json({ message: "Booking cancellation failed" });
  } finally {
    connection.release();
  }
});

app.post("/api/refunds/request", verifyToken, async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const userId = Number(req.user.id);
    const bookingId = Number(req.body.booking_id);
    const reason = String(req.body.reason || "").trim();

    if (!bookingId || !reason) {
      return res.status(400).json({ message: "Booking and reason are required" });
    }

    await connection.beginTransaction();
    const [bookings] = await connection.query(
      `
      SELECT *
      FROM servia_bookings
      WHERE id = ? AND user_id = ?
      LIMIT 1 FOR UPDATE
      `,
      [bookingId, userId]
    );

    if (!bookings.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookings[0];

    if (booking.payment_status !== "Paid" || !booking.payment_id || Number(booking.total || 0) <= 0) {
      await connection.rollback();
      return res.status(409).json({ message: "Only a recorded paid booking can be refunded" });
    }

    if (!["Cancelled", "Confirmed", "Pending"].includes(booking.status)) {
      await connection.rollback();
      return res.status(409).json({ message: "Refund is not available for this booking status" });
    }

    const [exists] = await connection.query(
      "SELECT id FROM servia_refund_requests WHERE booking_id=? LIMIT 1 FOR UPDATE",
      [bookingId]
    );

    if (exists.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Refund already requested" });
    }

    await connection.query(
      `
      INSERT INTO servia_refund_requests
      (booking_id, user_id, amount, reason, status)
      VALUES (?, ?, ?, ?, 'Pending')
      `,
      [bookingId, userId, Number(booking.total || 0), reason]
    );

    await connection.query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        userId,
        "Refund request submitted",
        "Your refund request has been submitted and is under review.",
        "refund",
      ]
    );

    await connection.query("UPDATE servia_bookings SET status='Cancelled', payment_status='Refund Requested' WHERE id=?", [bookingId]);
    await connection.commit();
    res.json({ success: true, message: "Refund request submitted" });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.log("REFUND REQUEST ERROR:", err.message);
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Refund already requested" });
    res.status(500).json({ message: "Refund request failed", error: err.message });
  } finally {
    connection.release();
  }
});

app.get("/api/admin/refunds", verifyToken, requireAdminRole("Finance Admin"), async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT
        r.*,
        u.fullname AS guest_name,
        u.email AS guest_email,
        b.checkin,
        b.checkout,
        b.status AS booking_status,
        p.title AS property_title
      FROM servia_refund_requests r
      JOIN servia_users u ON u.id = r.user_id
      JOIN servia_bookings b ON b.id = r.booking_id
      LEFT JOIN servia_properties p ON p.id = b.property_id
      ORDER BY r.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("ADMIN REFUNDS ERROR:", err.message);
    res.status(500).json({ message: "Refunds load failed" });
  }
});

app.put("/api/admin/refunds/:id/status", verifyToken, requireAdminRole("Finance Admin"), async (req, res) => {
  const connection = await db.promise().getConnection();
  try {
    const refundId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const adminNote = String(req.body.admin_note || "").trim();

    if (!["Approved", "Rejected", "Paid"].includes(status)) {
      return res.status(400).json({ message: "Invalid refund status" });
    }

    if (status === "Rejected" && !adminNote) {
      return res.status(400).json({ message: "Admin note is required for rejection" });
    }

    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT r.*,b.payment_id,b.total AS booking_total FROM servia_refund_requests r
       JOIN servia_bookings b ON b.id=r.booking_id WHERE r.id=? LIMIT 1 FOR UPDATE`,
      [refundId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: "Refund request not found" });
    }

    const refund = rows[0];

    const allowedTransitions = {
      Pending: ["Approved", "Rejected"],
      Approved: ["Paid"],
      Rejected: [],
      Paid: [],
    };
    if (!(allowedTransitions[refund.status] || []).includes(status)) {
      await connection.rollback();
      return res.status(409).json({
        message: `Refund cannot move from ${refund.status} to ${status}`,
      });
    }

    let finalStatus = status;
    let gatewayRefund = null;
    if (status === "Approved") {
      if (!razorpay || !refund.payment_id) {
        await connection.rollback();
        return res.status(409).json({ message: "A Razorpay payment is required to approve this refund" });
      }
      const amount = Number(refund.amount || 0);
      if (amount <= 0 || amount > Number(refund.booking_total || 0)) {
        await connection.rollback();
        return res.status(409).json({ message: "Recorded refund amount is invalid" });
      }
      const [existingGateway] = await connection.query(
        "SELECT * FROM servia_gateway_refunds WHERE refund_request_id=? LIMIT 1 FOR UPDATE", [refundId]
      );
      if (existingGateway.length) {
        await connection.rollback();
        return res.status(409).json({ message: "This refund has already been sent to the payment gateway" });
      }
      gatewayRefund = await razorpay.payments.refund(refund.payment_id, {
        amount: Math.round(amount * 100),
        speed: "normal",
        receipt: `refund_${refundId}`,
        notes: { refund_request_id: String(refundId), booking_id: String(refund.booking_id) },
      });
      const gatewayStatus = gatewayRefund.status === "processed" ? "Processed" : "Pending";
      await connection.query(
        `INSERT INTO servia_gateway_refunds
         (refund_request_id,booking_id,payment_id,gateway_refund_id,amount,status)
         VALUES (?,?,?,?,?,?)`,
        [refundId, refund.booking_id, refund.payment_id, gatewayRefund.id, amount, gatewayStatus]
      );
      finalStatus = gatewayStatus === "Processed" ? "Paid" : "Approved";
    }

    if (status === "Paid") {
      const [gatewayRows] = await connection.query(
        "SELECT status FROM servia_gateway_refunds WHERE refund_request_id=? LIMIT 1 FOR UPDATE", [refundId]
      );
      if (!gatewayRows.length || gatewayRows[0].status !== "Processed") {
        await connection.rollback();
        return res.status(409).json({ message: "Refund is not confirmed as processed by Razorpay" });
      }
    }

    await connection.query(
      `
      UPDATE servia_refund_requests
      SET status=?, admin_note=?
      WHERE id=?
      `,
      [finalStatus, adminNote || null, refundId]
    );

    if (finalStatus === "Approved") {
      await connection.query(
        "UPDATE servia_bookings SET status='Cancelled', payment_status='Refund Approved' WHERE id=?",
        [refund.booking_id]
      );
    }

    if (finalStatus === "Paid") {
      await connection.query(
        "UPDATE servia_bookings SET status='Cancelled', payment_status='Refunded' WHERE id=?",
        [refund.booking_id]
      );
    }

    await connection.query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        refund.user_id,
        "Refund request updated",
        finalStatus === "Rejected"
          ? `Your refund request was rejected. ${adminNote}`
          : `Your refund request is now ${finalStatus}.`,
        "refund",
      ]
    );

    await connection.commit();

    await addAuditLog({
      adminId: req.user.id,
      action: "REFUND_STATUS_UPDATED",
      entityType: "refund",
      entityId: refundId,
      message: `Refund #${refundId} marked as ${finalStatus}`,
      metadata: { status: finalStatus, adminNote, gatewayRefundId: gatewayRefund?.id || null },
    });

    res.json({ success: true, message: `Refund marked as ${finalStatus}`, gateway_refund_id: gatewayRefund?.id || null });
  } catch (err) {
    try { await connection.rollback(); } catch {}
    console.log("ADMIN REFUND STATUS ERROR:", err.message);
    res.status(500).json({ message: "Refund update failed", error: err.message });
  } finally {
    connection.release();
  }
});


app.get("/api/admin/trip-packages", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        e.*,
        (
          SELECT image_url
          FROM experience_images
          WHERE experience_id = e.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ) AS image
      FROM experiences e
      ORDER BY e.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.log("ADMIN TRIPS LOAD ERROR:", err.message);
    res.status(500).json({ message: "Failed to load trip packages" });
  }
});

app.put("/api/admin/trip-packages/:id/status", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || "");
    const adminNote = String(req.body.admin_note || "").trim();

    const allowed = ["Pending", "active", "Rejected", "Suspended"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    if (["Rejected", "Suspended"].includes(status) && !adminNote) {
      return res.status(400).json({ message: "An admin note is required" });
    }

    const rows = await query(`SELECT e.id,e.host_id,e.title,e.status,u.email FROM experiences e
      JOIN servia_users u ON u.id=e.host_id WHERE e.id=? LIMIT 1`, [id]);
    if (!rows.length) return res.status(404).json({ message: "Trip package not found" });
    const trip = rows[0];
    const transitions = { Pending: ["active", "Rejected"], active: ["Suspended"], Rejected: ["Pending"], Suspended: ["active"] };
    if (!(transitions[trip.status] || []).includes(status)) {
      return res.status(409).json({ message: `Trip package cannot move from ${trip.status} to ${status}` });
    }

    await query(
      `
      UPDATE experiences
      SET status = ?, admin_note = ?
      WHERE id = ?
      `,
      [status, adminNote || null, id]
    );

    await query(
      "INSERT INTO servia_notifications (user_id,title,message,type,is_read) VALUES (?,?,?,?,0)",
      [trip.host_id, "Trip package review updated", status === "active" ? `Your trip package \"${trip.title}\" is now published.` : `Your trip package \"${trip.title}\" is now ${status}. ${adminNote}`.trim(), "trip_package"]
    );
    await enqueueEmail({
      to: trip.email, subject: `Trip package review: ${trip.title}`,
      type: "trip_moderation", dedupeKey: `trip_moderation:${id}:${status}`,
      html: `<h2>Trip package review updated</h2><p>Your package <b>${trip.title}</b> is now <b>${status}</b>.</p>${adminNote ? `<p>Admin note: ${adminNote}</p>` : ""}`,
    });
    await addAuditLog({
      adminId: req.user.id, action: "TRIP_PACKAGE_STATUS_CHANGED", entityType: "experience",
      entityId: id, message: `Trip package \"${trip.title}\" changed from ${trip.status} to ${status}`,
      metadata: { previousStatus: trip.status, status, adminNote },
    });

    res.json({ message: "Trip package status updated" });
  } catch (err) {
    console.log("ADMIN TRIP STATUS ERROR:", err.message);
    res.status(500).json({ message: "Failed to update trip package" });
  }
});

app.get("/api/admin/email-outbox", verifyToken, requireAdminRole("Support Admin"), async (req, res) => {
  try {
    const status = String(req.query.status || "");
    const allowed = ["Pending", "Sending", "Retry", "Sent", "Failed"];
    const rows = status && allowed.includes(status)
      ? await query("SELECT id,recipient,subject,email_type,status,attempts,max_attempts,last_error,next_attempt_at,sent_at,created_at FROM servia_email_outbox WHERE status=? ORDER BY id DESC LIMIT 200", [status])
      : await query("SELECT id,recipient,subject,email_type,status,attempts,max_attempts,last_error,next_attempt_at,sent_at,created_at FROM servia_email_outbox ORDER BY id DESC LIMIT 200");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Email outbox failed to load" });
  }
});

app.put("/api/admin/email-outbox/:id/retry", verifyToken, requireAdminRole("Support Admin"), async (req, res) => {
  try {
    const result = await query(
      "UPDATE servia_email_outbox SET status='Retry',attempts=0,last_error=NULL,next_attempt_at=NOW() WHERE id=? AND status='Failed'",
      [Number(req.params.id)]
    );
    if (!result.affectedRows) return res.status(409).json({ message: "Only failed emails can be retried" });
    await addAuditLog({ adminId: req.user.id, action: "EMAIL_RETRY_REQUESTED", entityType: "email", entityId: Number(req.params.id), message: `Email #${req.params.id} queued for retry` });
    processEmailOutbox();
    res.json({ success: true, message: "Email queued for retry" });
  } catch (err) {
    res.status(500).json({ message: "Email retry failed" });
  }
});

// Temporary test route
app.get("/api/sentry-test", (req, res) => {
  throw new Error("Sentry test error");
});

// Sentry error handler
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Keep the terminal error handler after every route so upload/parser failures
// from host and trip-package forms always return a useful JSON response.
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Each image must be 5 MB or smaller"
      : err.code === "LIMIT_FILE_COUNT"
        ? "Maximum 10 images are allowed"
        : err.message;
    return res.status(400).json({ message });
  }
  if (err?.message?.includes("Only JPG")) {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: "Internal server error" });
});

async function ensureSupplementalTables() {
  await query(`CREATE TABLE IF NOT EXISTS servia_email_outbox (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recipient VARCHAR(320) NOT NULL, subject VARCHAR(255) NOT NULL, html_body MEDIUMTEXT NOT NULL,
    email_type VARCHAR(60) NOT NULL DEFAULT 'transactional', dedupe_key VARCHAR(191) NULL,
    status ENUM('Pending','Sending','Retry','Sent','Failed') NOT NULL DEFAULT 'Pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0, max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
    last_error VARCHAR(1000) NULL, next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email_outbox_dedupe (dedupe_key), INDEX idx_email_outbox_delivery (status,next_attempt_at)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS servia_auth_codes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    code_hash CHAR(64) NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_auth_code_email_purpose (email, purpose),
    INDEX idx_auth_code_expiry (expires_at)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS servia_service_bookings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL, service_id BIGINT NOT NULL,
    service_title VARCHAR(255) NOT NULL, provider VARCHAR(255) NULL,
    service_date DATE NOT NULL, people INT NOT NULL DEFAULT 1,
    total DECIMAL(12,2) NOT NULL DEFAULT 0, status VARCHAR(40) NOT NULL DEFAULT 'Confirmed',
    cancellation_reason VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_service_booking_user (user_id), INDEX idx_service_booking_date (service_date)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS servia_host_submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    submission_key VARCHAR(100) NOT NULL,
    user_id BIGINT NOT NULL,
    submission_type ENUM('property','experience') NOT NULL,
    status ENUM('Processing','Completed') NOT NULL DEFAULT 'Processing',
    entity_id BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_host_submission_key (submission_key),
    INDEX idx_host_submission_user (user_id, submission_type)
  )`);
  await query(`CREATE TABLE IF NOT EXISTS servia_services (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL, category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL, price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD', provider VARCHAR(255) NOT NULL,
    duration VARCHAR(100) NULL, image TEXT NULL, tag VARCHAR(100) NULL,
    description TEXT NULL, includes_json JSON NULL,
    rating DECIMAL(3,2) NOT NULL DEFAULT 0, reviews INT NOT NULL DEFAULT 0,
    max_people INT NOT NULL DEFAULT 10, max_bookings_per_day INT NOT NULL DEFAULT 20,
    is_active TINYINT(1) NOT NULL DEFAULT 1, sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_services_active_category (is_active, category)
  )`);
  await query(
    `INSERT IGNORE INTO servia_services
     (id,title,category,location,price,currency,provider,duration,image,tag,description,includes_json,rating,reviews,max_people,max_bookings_per_day,sort_order)
     VALUES
     (1,'Airport pickup','Transport','Riyadh',45,'USD','Riyadh Premium Cars','One-way transfer','https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=80','Popular','Reliable airport pickup with professional drivers, clean vehicles, and direct transfer to your stay.','["Airport meet & greet","Luggage assistance","Private car","Direct drop-off"]',4.92,88,6,30,1),
     (2,'Private chef','Food','At your stay',120,'USD','Chef Omar','Dinner service','https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80','Guest favorite','Enjoy a private dining experience prepared at your stay by a professional chef.','["Menu planning","Fresh ingredients","Cooking at your stay","Kitchen cleanup"]',4.98,62,12,5,2),
     (3,'House cleaning','Cleaning','Riyadh',35,'USD','Sparkle Home Care','2 hours','https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1400&q=80','Fast booking','Professional cleaning service for your stay.','["General cleaning","Bathroom cleaning","Kitchen cleaning","Basic supplies"]',4.89,109,1,25,3),
     (4,'Laundry pickup','Cleaning','Riyadh',25,'USD','Fresh Laundry','24 hour return','https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1400&q=80','Quick service','Laundry pickup and next-day return service.','["Pickup","Wash and fold","Next-day delivery"]',4.86,41,1,30,4),
     (5,'Home spa session','Wellness','At your stay',85,'USD','Calm Spa','90 minutes','https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80','Relaxing','A private wellness session delivered at your stay.','["Qualified therapist","Spa supplies","90 minute session"]',4.95,57,2,8,5),
     (6,'Baby sitter','Family','Riyadh',50,'USD','Family Care Pro','Per hour','https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1400&q=80','Trusted','Trusted family care from verified professionals.','["Verified caregiver","Hourly care","Emergency contact support"]',4.93,35,4,10,6)`
  );
  await query(`CREATE TABLE IF NOT EXISTS servia_payment_claims (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(191) NOT NULL,
    order_id VARCHAR(191) NOT NULL,
    user_id BIGINT NOT NULL,
    booking_type VARCHAR(40) NOT NULL,
    booking_id BIGINT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_payment_claim_payment (payment_id),
    UNIQUE KEY uq_payment_claim_order (order_id),
    INDEX idx_payment_claim_booking (booking_type, booking_id)
  )`);
}

ensureSupplementalTables().then(async () => {
  await startEmailWorker();
  server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
  });
}).catch((err) => {
  console.error("Database initialization failed:", err.message);
  process.exitCode = 1;
});
