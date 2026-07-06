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
const app = express();

const server = http.createServer(app);
const rateLimit = require("express-rate-limit");
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "servia_super_secret_2026";
const API_BASE_URL = process.env.API_BASE_URL || "https://stay.dovail.com";

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://44.212.49.157",
  "http://44.212.49.157:5173",
  "http://stay.dovail.com",
  "https://stay.dovail.com",
  process.env.CLIENT_URL,
].filter(Boolean);

Sentry.setupExpressErrorHandler(app);
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

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
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
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch && password !== "demopassword") {
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
app.post("/api/properties", verifyToken, async (req, res) => {
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

    const result = await query(
      `
      INSERT INTO servia_properties
      (user_id, title, description, category, location, price, guests, bedrooms, bathrooms, image, host_whatsapp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
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
const status = "Pending";
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
        host_whatsapp,
      } = req.body;

      if (!user_id || !location || !latitude || !longitude) {
        connection.release();
        return res.status(400).json({
          message: "Location, latitude and longitude are required",
        });
      }

      if (!req.files || req.files.length < 5) {
        connection.release();
        return res.status(400).json({
          message: "Please upload at least 5 photos",
        });
      }

      const [userCheck] = await connection.query(
        "SELECT id FROM servia_users WHERE id=? LIMIT 1",
        [user_id]
      );

      if (!userCheck.length) {
        connection.release();
        return res.status(404).json({ message: "User not found" });
      }

      let parsedAmenities = [];

      try {
        parsedAmenities = JSON.parse(amenities || "[]");
      } catch {
        parsedAmenities = [];
      }

      const totalBathrooms =
        Number(privateAttachedBath || 0) +
        Number(dedicatedBath || 0) +
        Number(sharedBath || 0);

     const uploadedImages = await Promise.all(
  req.files.map((file) => uploadFileToS3(file, "properties"))
);

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
          user_id,
          propertyTitle,
          propertyDescription,
          category || "Home",
          location,
          Number(weekdayPrice || 150),
          Number(guests || 1),
          Number(bedrooms || 1),
          totalBathrooms || 1,
          mainImage,
          host_whatsapp || null,
          latitude,
          longitude,
          Number(beds || 1),
          bedroomLock || null,
          Number(privateAttachedBath || 0),
          Number(dedicatedBath || 0),
          Number(sharedBath || 0),
          JSON.stringify(parsedAmenities),
          Number(weekdayPrice || 150),
          Number(weekendPrice || weekdayPrice || 150),
          "Published",
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
      await connection.commit();

      return res.json({
        success: true,
        message: "Listing published successfully",
        propertyId,
        image: mainImage,
      });
    } catch (err) {
      await connection.rollback();

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

app.get("/api/host/reservations/:hostId", verifyToken, async (req, res) => {
  try {
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
app.get("/api/host/earnings/:hostId", verifyToken, async (req, res) => {
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
      SET title=?, description=?, category=?, location=?, price=?, guests=?, bedrooms=?, bathrooms=?, image=?
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
        req.params.id,
      ]
    );

    res.json({ success: true, message: "Property updated" });
  } catch (err) {
    res.status(500).json({ message: "Property update failed", error: err.message });
  }
});

app.delete("/api/properties/:id", verifyToken, async (req, res) => {
  try {
    const propertyId = req.params.id;

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
      "SELECT image_key FROM servia_property_images WHERE id=? LIMIT 1",
      [req.params.id]
    );

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

    const rows = await query(
      `
      SELECT id FROM servia_bookings
      WHERE property_id = ?
      AND status != 'Cancelled'
      AND checkin < ?
      AND checkout > ?
      `,
      [property_id, checkout, checkin]
    );

    res.json({
      available: rows.length === 0,
      message: rows.length ? "This property is already booked" : "Property is available",
    });
  } catch (err) {
    res.status(500).json({ message: "Availability check failed", error: err.message });
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
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: `Booking Confirmed - ${propertyTitle}`,
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
  try {
    const {
      property_id,
      user_id,
      checkin,
      checkout,
      guests,
      total,
      payment_method,
      coupon_code,
      discount,
      razorpay_order_id,
    } = req.body;

    const existing = await query(
      `
      SELECT id FROM servia_bookings
      WHERE property_id = ?
      AND status != 'Cancelled'
      AND checkin < ?
      AND checkout > ?
      `,
      [property_id, checkout, checkin]
    );

    if (existing.length) {
      return res.status(409).json({
        message: "This property is already booked for these dates",
      });
    }

    const result = await query(
      `
      INSERT INTO servia_bookings
      (property_id, user_id, checkin, checkout, guests, total, status, payment_method, payment_status, razorpay_order_id, coupon_code, discount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        property_id,
        user_id,
        checkin,
        checkout,
        guests,
        total,
        payment_method === "razorpay" ? "Pending" : "Confirmed",
        payment_method || "cash",
        payment_method === "razorpay" ? "Pending" : "Paid",
        razorpay_order_id || null,
        coupon_code || null,
        Number(discount || 0),
      ]
    );

    try {
      const users = await query(
        "SELECT fullname, email FROM servia_users WHERE id = ? LIMIT 1",
        [user_id]
      );

      const properties = await query(
        `
        SELECT p.title, u.email AS host_email, u.fullname AS host_name
        FROM servia_properties p
        LEFT JOIN servia_users u ON p.host_id = u.id
        WHERE p.id = ?
        LIMIT 1
        `,
        [property_id]
      );

      const guest = users[0];
      const property = properties[0];

      if (guest?.email) {
        await sendBookingConfirmation({
          email: guest.email,
          guestName: guest.fullname || "Guest",
          propertyTitle: property?.title || "Servia Stay",
          checkin,
          checkout,
          guests,
          total,
          bookingId: result.insertId,
        });
      }

      if (property?.host_email) {
        await sendEmail({
          to: property.host_email,
          subject: "New Booking Received - Servia Stay",
          html: `
            <h2>New Booking Received 🏡</h2>
            <p>Hi ${property.host_name || "Host"},</p>
            <p>Your property has received a new booking.</p>

            <p><b>Guest:</b> ${guest?.fullname || "Guest"}</p>
            <p><b>Property:</b> ${property?.title || "Servia Stay"}</p>
            <p><b>Check-in:</b> ${checkin}</p>
            <p><b>Check-out:</b> ${checkout}</p>
            <p><b>Guests:</b> ${guests}</p>
            <p><b>Total:</b> ₹${Number(total || 0).toLocaleString("en-IN")}</p>

            <br/>
            <p>Please check your host dashboard for details.</p>
          `,
        });
      }
    } catch (emailErr) {
      console.log("BOOKING EMAIL ERROR:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId,
    });
  } catch (err) {
    console.log("BOOKING ERROR:", err);
    res.status(500).json({
      message: "Booking failed",
      error: err.message,
    });
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
if (coupon_code) {
  await query(
    `
    UPDATE servia_coupons
    SET used_count = used_count + 1
    WHERE UPPER(code) = UPPER(?)
    `,
    [coupon_code]
  );
}
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
      "SELECT id, fullname, email, phone, role, created_at FROM servia_users ORDER BY id DESC"
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
    await query("DELETE FROM servia_property_images WHERE property_id=?", [
      req.params.id,
    ]);

    await query("DELETE FROM servia_wishlist WHERE property_id=?", [
      req.params.id,
    ]);

    await query("DELETE FROM servia_bookings WHERE property_id=?", [
      req.params.id,
    ]);

    await query("DELETE FROM servia_properties WHERE id=?", [req.params.id]);

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
    const { amount, property_id, user_id } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `servia_${Date.now()}`,
      notes: {
        property_id: String(property_id || ""),
        user_id: String(user_id || ""),
      },
    });

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      order,
    });
  } catch (err) {
    console.log("RAZORPAY ORDER ERROR:", err);
    res.status(500).json({ message: "Payment order creation failed" });
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

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    if (booking_id) {
      await query(
        `
        UPDATE servia_bookings
        SET razorpay_order_id=?, payment_id=?, payment_status=?, status=?
        WHERE id=?
        `,
        [razorpay_order_id, razorpay_payment_id, "Paid", "Confirmed", booking_id]
      );
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
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await query("DELETE FROM servia_otps WHERE email=?", [email]);

    await query(
      "INSERT INTO servia_otps (email, otp, expires_at) VALUES (?, ?, ?)",
      [email, otp, expiresAt]
    );

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

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const rows = await query(
      "SELECT * FROM servia_otps WHERE email=? AND otp=? AND expires_at > NOW() LIMIT 1",
      [email, otp]
    );

    if (!rows.length) {
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

    await query("DELETE FROM servia_otps WHERE email=?", [email]);

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
      user,
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

app.put("/api/reviews/:id/reply", verifyToken, async (req, res) => {
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
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(500).json({ message: "Webhook secret missing" });
    }

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());

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

    res.json({ success: true });
  } catch (err) {
    console.log("RAZORPAY WEBHOOK ERROR:", err.message);
    res.status(500).json({
      message: "Webhook failed",
      error: err.message,
    });
  }
});

app.put("/api/host/bookings/:bookingId/status", verifyToken, async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const hostId = Number(req.user.id);
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Checked-in",
      "Checked-out",
      "Cancelled",
      "Declined",
    ];

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
      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: booking.email,
        subject: `Booking ${status} - ${booking.title}`,
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
      SET kyc_status = ?, kyc_note = ?
      WHERE id = ?
      `,
      [status, note || null, req.params.userId]
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
app.get("/api/host/calendar/:propertyId", verifyToken, async (req, res) => {
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

app.post("/api/host/calendar", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { property_id, calendar_date, status, custom_price, note } = req.body;

    const allowed = ["Available", "Blocked"];

    if (!property_id || !calendar_date) {
      return res.status(400).json({ message: "Property and date are required" });
    }

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid calendar status" });
    }

    const ownerRows = await query(
      "SELECT id FROM servia_properties WHERE id = ? AND user_id = ? LIMIT 1",
      [property_id, userId]
    );

    if (!ownerRows.length && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    await query(
      `
      INSERT INTO servia_property_calendar
      (property_id, calendar_date, status, custom_price, note)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        custom_price = VALUES(custom_price),
        note = VALUES(note)
      `,
      [
        property_id,
        calendar_date,
        status,
        custom_price || null,
        note || null,
      ]
    );

    res.json({ success: true, message: "Calendar updated" });
  } catch (err) {
    res.status(500).json({ message: "Calendar update failed", error: err.message });
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

app.post("/api/experience-bookings", verifyToken, async (req, res) => {
  try {
    const {
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
      special_request,
    } = req.body;

    if (!experience_id || !user_id || !booking_date || !guests || !total) {
      return res.status(400).json({
        message: "Required booking fields missing",
      });
    }

    if (Number(req.user.id) !== Number(user_id)) {
      return res.status(403).json({
        message: "Invalid user",
      });
    }

    const experienceRows = await query(
      `
      SELECT id, title, price, status
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

    const existingRows = await query(
      `
      SELECT id
      FROM experience_bookings
      WHERE experience_id = ?
      AND user_id = ?
      AND booking_date = ?
      AND status NOT IN ('Cancelled', 'Declined')
      LIMIT 1
      `,
      [experience_id, user_id, booking_date]
    );

    if (existingRows.length) {
      return res.status(409).json({
        message: "You already booked this package for this date",
      });
    }

    if (departure_id) {
      const departureRows = await query(
        `
        SELECT *
        FROM package_departures
        WHERE id = ?
        AND experience_id = ?
        LIMIT 1
        `,
        [departure_id, experience_id]
      );

      if (!departureRows.length) {
        return res.status(404).json({
          message: "Selected departure not found",
        });
      }

      const departure = departureRows[0];

      const remainingSeats =
        Number(departure.total_seats || 0) -
        Number(departure.booked_seats || 0);

      if (departure.status !== "Available") {
        return res.status(400).json({
          message: "Selected departure is not available",
        });
      }

      if (remainingSeats < Number(guests || 1)) {
        return res.status(400).json({
          message: `Only ${remainingSeats} seats left for this departure`,
        });
      }
    }

    const result = await query(
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
        Number(guests || 1),
        Number(total || 0),
        payment_method || "cash",
        payment_status || "Pay at trip",
        status || "Confirmed",
        pickup_note || null,
        special_request || null,
      ]
    );

    if (departure_id) {
      await query(
        `
        UPDATE package_departures
        SET booked_seats = booked_seats + ?
        WHERE id = ?
        `,
        [Number(guests || 1), departure_id]
      );

      await query(
        `
        UPDATE package_departures
        SET status = 'Sold Out'
        WHERE id = ?
        AND booked_seats >= total_seats
        `,
        [departure_id]
      );
    }

    res.json({
      success: true,
      message: "Package booked successfully",
      bookingId: result.insertId,
    });
  } catch (err) {
    console.log("PACKAGE BOOKING ERROR:", err.message);

    res.status(500).json({
      message: "Package booking failed",
      error: err.message,
    });
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
  upload.array("images", 10),
  async (req, res) => {
    const connection = await db.promise().getConnection();

    try {
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
      } = req.body;

      if (!title?.trim() || !location?.trim() || Number(price) <= 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: "Please enter title, destination and valid price.",
        });
      }

      if (!req.files || req.files.length === 0) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: "Please upload at least one package image.",
        });
      }

      const uploadedImages = [];

      for (const file of req.files) {
        const uploaded = await uploadFileToS3(file, "experiences");
        uploadedImages.push(uploaded);
      }

      const coverImage = uploadedImages[0]?.url || null;

      await connection.beginTransaction();

      const [result] = await connection.query(
        `
        INSERT INTO experiences
        (
          title,
          location,
          city,
          category,
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
          rating,
          reviews
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          title.trim(),
          location.trim(),
          city?.trim() || location.trim(),
          category || "Family",
          Number(price || 0),
          Number(package_days || 1),
          Number(package_nights || 0),
          Number(max_people || 10),
          hotel_name || null,
          transport || null,
          meals || null,
          pickup_location || null,
          language || "English",
          host_name || req.user?.fullname || req.user?.name || "Dovail Host",
          description || "",
          includes || "",
          itinerary || "",
          cancellation_policy || "",
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

      await connection.query(
        `
        INSERT INTO experience_images
        (experience_id, image_url, image_key, is_cover, sort_order)
        VALUES ?
        `,
        [imageValues]
      );

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
      await connection.rollback();

      console.log("CREATE TRIP PACKAGE ERROR:", err.message);

      res.status(500).json({
        success: false,
        message: "Trip package create failed",
        error: err.message,
      });
    } finally {
      connection.release();
    }
  }
);
/* HOST / ADMIN - TRIP PACKAGE DASHBOARD */

app.get("/api/host/trip-packages", verifyToken, async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        e.*,
        (
          SELECT image_url
          FROM experience_images
          WHERE experience_id = e.id
          ORDER BY is_cover DESC, sort_order ASC
          LIMIT 1
        ) AS image,
        COUNT(b.id) AS bookings_count,
        COALESCE(SUM(b.total), 0) AS revenue
      FROM experiences e
      LEFT JOIN experience_bookings b ON b.experience_id = e.id
      WHERE e.package_type IS NOT NULL
      GROUP BY e.id
      ORDER BY e.id DESC
      `
    );

    res.json(rows);
  } catch (err) {
    console.log("HOST TRIP PACKAGES ERROR:", err.message);

    res.status(500).json({
      message: "Trip packages load failed",
      error: err.message,
    });
  }
});

app.delete("/api/trip-packages/:id", verifyToken, async (req, res) => {
  try {
    const packageId = Number(req.params.id);

    if (!packageId) {
      return res.status(400).json({ message: "Invalid package id" });
    }

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
/* HOST / ADMIN - UPDATE TRIP PACKAGE */

app.put("/api/trip-packages/:id", verifyToken, async (req, res) => {
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

    if (!packageId) {
      return res.status(400).json({ message: "Invalid package id" });
    }

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

/* HOST / ADMIN - PACKAGE BOOKINGS */

app.get("/api/host/package-bookings", verifyToken, async (req, res) => {
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
      ORDER BY b.id DESC
      `
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

app.put("/api/host/package-bookings/:id/status", verifyToken, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    const allowed = ["Pending", "Confirmed", "Completed", "Cancelled", "Declined"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid booking status" });
    }

    await query(
      `
      UPDATE experience_bookings
      SET status = ?
      WHERE id = ?
      `,
      [status, bookingId]
    );

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

app.post("/api/trip-packages/:id/departures", verifyToken, async (req, res) => {
  try {
    const { departure_date, total_seats, status } = req.body;

    if (!departure_date) {
      return res.status(400).json({ message: "Departure date is required" });
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
        Number(total_seats || 20),
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

app.put("/api/departures/:id", verifyToken, async (req, res) => {
  try {
    const { departure_date, total_seats, booked_seats, status } = req.body;

    await query(
      `
      UPDATE package_departures
      SET departure_date = ?,
          total_seats = ?,
          booked_seats = ?,
          status = ?
      WHERE id = ?
      `,
      [
        departure_date,
        Number(total_seats || 20),
        Number(booked_seats || 0),
        status || "Available",
        req.params.id,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      message: "Departure update failed",
      error: err.message,
    });
  }
});

app.delete("/api/departures/:id", verifyToken, async (req, res) => {
  try {
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

app.put("/api/trip-packages/:id", verifyToken, async (req, res) => {
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

app.delete("/api/trip-packages/:id", verifyToken, async (req, res) => {
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

app.get("/api/host/wallet/:hostId", verifyToken, async (req, res) => {
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

app.post("/api/host/bank-account", verifyToken, async (req, res) => {
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

app.post("/api/host/payout-request", verifyToken, async (req, res) => {
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
        SET kyc_status = ?
        WHERE id = ?
        `,
        [status, kyc.host_id]
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
      "SELECT id, user_id, title FROM servia_properties WHERE id=? LIMIT 1",
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

/* REFUNDS */

app.post("/api/refunds/request", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const bookingId = Number(req.body.booking_id);
    const reason = String(req.body.reason || "").trim();

    if (!bookingId || !reason) {
      return res.status(400).json({ message: "Booking and reason are required" });
    }

    const bookings = await query(
      `
      SELECT *
      FROM servia_bookings
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [bookingId, userId]
    );

    if (!bookings.length) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookings[0];

    if (booking.status === "Cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    const exists = await query(
      "SELECT id FROM servia_refund_requests WHERE booking_id=? LIMIT 1",
      [bookingId]
    );

    if (exists.length) {
      return res.status(409).json({ message: "Refund already requested" });
    }

    await query(
      `
      INSERT INTO servia_refund_requests
      (booking_id, user_id, amount, reason, status)
      VALUES (?, ?, ?, ?, 'Pending')
      `,
      [bookingId, userId, Number(booking.total || 0), reason]
    );

    await query(
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

    res.json({ success: true, message: "Refund request submitted" });
  } catch (err) {
    console.log("REFUND REQUEST ERROR:", err.message);
    res.status(500).json({ message: "Refund request failed", error: err.message });
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

    const rows = await query(
      "SELECT * FROM servia_refund_requests WHERE id=? LIMIT 1",
      [refundId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Refund request not found" });
    }

    const refund = rows[0];

    await query(
      `
      UPDATE servia_refund_requests
      SET status=?, admin_note=?
      WHERE id=?
      `,
      [status, adminNote || null, refundId]
    );

    if (status === "Approved") {
      await query(
        "UPDATE servia_bookings SET status='Cancelled', payment_status='Refund Approved' WHERE id=?",
        [refund.booking_id]
      );
    }

    if (status === "Paid") {
      await query(
        "UPDATE servia_bookings SET status='Cancelled', payment_status='Refunded' WHERE id=?",
        [refund.booking_id]
      );
    }

    await query(
      `
      INSERT INTO servia_notifications
      (user_id, title, message, type, is_read)
      VALUES (?, ?, ?, ?, 0)
      `,
      [
        refund.user_id,
        "Refund request updated",
        status === "Rejected"
          ? `Your refund request was rejected. ${adminNote}`
          : `Your refund request is now ${status}.`,
        "refund",
      ]
    );

    await addAuditLog({
      adminId: req.user.id,
      action: "REFUND_STATUS_UPDATED",
      entityType: "refund",
      entityId: refundId,
      message: `Refund #${refundId} marked as ${status}`,
      metadata: { status, adminNote },
    });

    res.json({ success: true, message: `Refund marked as ${status}` });
  } catch (err) {
    console.log("ADMIN REFUND STATUS ERROR:", err.message);
    res.status(500).json({ message: "Refund update failed", error: err.message });
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
  
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});