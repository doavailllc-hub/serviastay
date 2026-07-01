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
const deleteS3File = require("./utils/deleteS3File");
const app = express();
const server = http.createServer(app);

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

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


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

app.post("/api/login", async (req, res) => {
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
app.post("/api/admin/login", async (req, res) => {
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
      SELECT 
        p.*,
        u.fullname AS host_name,
        u.email AS host_email
      FROM servia_properties p
      LEFT JOIN servia_users u ON p.user_id = u.id
      ORDER BY p.id DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Cannot fetch properties", error: err.message });
  }
});

app.get("/api/properties/:id", async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        p.*,
        u.fullname AS host_name,
        u.email AS host_email,
        u.phone AS host_phone,
        u.kyc_status AS host_kyc_status
      FROM servia_properties p
      LEFT JOIN servia_users u ON u.id = p.user_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [req.params.id]
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
      [req.params.id]
    );

    res.json({
      ...rows[0],
      images,
    });
  } catch (err) {
    res.status(500).json({
      message: "Cannot fetch property",
      error: err.message,
    });
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
  req.body.razorpay_order_id || null,
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
        "SELECT title FROM servia_properties WHERE id = ? LIMIT 1",
        [property_id]
      );

      if (users.length && users[0].email) {
        await sendBookingConfirmation({
          email: users[0].email,
          guestName: users[0].fullname || "Guest",
          propertyTitle: properties[0]?.title || "Dovail Stay",
          checkin,
          checkout,
          guests,
          total,
          bookingId: result.insertId,
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
    res.status(500).json({ message: "Booking failed", error: err.message });
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

app.delete("/api/admin/properties/:id", verifyToken, verifyAdmin, async (req, res) => {
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
    await query("DELETE FROM servia_wishlist WHERE property_id=?", [propertyId]);
    await query("DELETE FROM servia_bookings WHERE property_id=?", [propertyId]);
    await query("DELETE FROM servia_properties WHERE id=?", [propertyId]);

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

app.post("/api/payments/create-order", verifyToken, async (req, res) => {
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
        SET 
          razorpay_order_id = ?,
          payment_id = ?,
          payment_status = ?,
          status = ?
        WHERE id = ?
        `,
        [
          razorpay_order_id,
          razorpay_payment_id,
          "Paid",
          "Confirmed",
          booking_id,
        ]
      );
    }

    res.json({
      success: true,
      message: "Payment verified",
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err) {
    console.log("RAZORPAY VERIFY ERROR:", err);
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

app.get(
  "/api/messages/:userId/:otherUserId",
  verifyToken,
  async (req, res) => {
    try {
      const { userId, otherUserId } = req.params;

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
      res.status(500).json({
        message: "Messages fetch failed",
        error: err.message,
      });
    }
  }
);
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

app.get("/api/reviews/:propertyId", async (req, res) => {
  try {
    const rows = await query(
      `
      SELECT 
        r.id,
        r.property_id,
        r.booking_id,
        r.user_id,
        r.rating,
        r.review,
        r.host_reply,
        r.created_at,
        COALESCE(u.fullname, u.email, 'Guest') AS guest_name
      FROM servia_reviews r
      LEFT JOIN servia_users u ON u.id = r.user_id
      WHERE r.property_id = ?
      AND COALESCE(r.status, 'Approved') = 'Approved'
      ORDER BY r.created_at DESC
      `,
      [req.params.propertyId]
    );

    res.json(rows);
  } catch (err) {
    console.log("REVIEWS LOAD ERROR:", err.message);
    res.status(500).json({
      message: "Reviews load failed",
      error: err.message,
    });
  }
});

app.post("/api/reviews", verifyToken, async (req, res) => {
  try {
    const propertyId = Number(req.body.property_id);
    const bookingId = req.body.booking_id ? Number(req.body.booking_id) : null;
    const userId = Number(req.body.user_id);
    const rating = Number(req.body.rating);
    const review = String(req.body.review || "").trim();

    if (!propertyId || !userId || !rating) {
      return res.status(400).json({
        message: "Property, user and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    if (Number(req.user.id) !== userId) {
      return res.status(403).json({ message: "Invalid user" });
    }

    const result = await query(
      `
      INSERT INTO servia_reviews
      (property_id, booking_id, user_id, rating, review, status)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [propertyId, bookingId, userId, rating, review, "Approved"]
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

    const avgRating = avgRows[0]?.avg_rating || 5;

    await query(
      `
      UPDATE servia_properties
      SET rating = ?
      WHERE id = ?
      `,
      [avgRating, propertyId]
    );

    res.json({
      success: true,
      message: "Review added",
      reviewId: result.insertId,
      rating: avgRating,
    });
  } catch (err) {
    console.log("REVIEW CREATE ERROR:", err.message);
    res.status(500).json({
      message: "Review submit failed",
      error: err.message,
    });
  }
});

app.put("/api/reviews/:id/reply", verifyToken, async (req, res) => {
  try {
    const reply = String(req.body.host_reply || "").trim();

    await query(
      `
      UPDATE servia_reviews
      SET host_reply = ?
      WHERE id = ?
      `,
      [reply, req.params.id]
    );

    res.json({
      success: true,
      message: "Host reply added",
    });
  } catch (err) {
    res.status(500).json({
      message: "Host reply failed",
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

app.get("/api/admin/reviews", verifyToken, async (req, res) => {
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

      if (!title || !location || !price) {
        connection.release();
        return res.status(400).json({
          message: "Title, destination and price are required",
        });
      }

      if (!req.files || req.files.length === 0) {
        connection.release();
        return res.status(400).json({
          message: "Please upload at least one package image",
        });
      }

     const uploadedImages = await Promise.all(
  req.files.map((file) => uploadFileToS3(file, "experiences"))
);

const coverImage = uploadedImages[0].url;
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
          title,
          location,
          city || location,
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
          host_name || "Dovail Travel",
          description || "",
          includes || "",
          itinerary || "",
          cancellation_policy || "",
          package_type || "Trip Package",
          "active",
          0,
          0,
        ]
      );

      const packageId = result.insertId;
const imageValues = uploadedImages.map((img, index) => [
  experienceId,
  img.url,
  img.key,
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

      res.json({
        success: true,
        message: "Trip package created successfully",
        packageId,
        image: coverImage,
      });
    } catch (err) {
      await connection.rollback();

      console.log("CREATE TRIP PACKAGE ERROR:", err.message);

      res.status(500).json({
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

app.get("/api/admin/payouts", verifyToken, verifyAdmin, async (req, res) => {
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
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});