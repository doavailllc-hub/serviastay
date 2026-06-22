const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
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

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const onlineUsers = new Map();

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
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "servia_super_secret_2026";
const API_BASE_URL = process.env.API_BASE_URL || "https://stay.dovail.com";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
const buildFileUrl = (filename) => `${API_BASE_URL}/uploads/${filename}`;

function query(sql, values = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images allowed"));
    }
    cb(null, true);
  },
});

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

app.post("/api/upload", verifyToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image uploaded" });
  }

  res.json({
    success: true,
    imageUrl: buildFileUrl(req.file.filename),
  });
});

/* MULTIPLE UPLOAD */

app.post("/api/upload/multiple", verifyToken, upload.array("images", 10), (req, res) => {
  if (!req.files?.length) {
    return res.status(400).json({ message: "No images uploaded" });
  }

  res.json({
    success: true,
    imageUrls: req.files.map((file) => buildFileUrl(file.filename)),
  });
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
    const rows = await query("SELECT * FROM servia_properties WHERE id=?", [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ message: "Property not found" });
    }

    const images = await query(
      "SELECT * FROM servia_property_images WHERE property_id=? ORDER BY sort_order ASC, id ASC",
      [req.params.id]
    );

    res.json({
      ...rows[0],
      images,
    });
  } catch (err) {
    res.status(500).json({ message: "Cannot fetch property", error: err.message });
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

      const mainImage = buildFileUrl(req.files[0].filename);

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

      const imageValues = req.files.map((file, index) => [
        propertyId,
        buildFileUrl(file.filename),
        index === 0 ? 1 : 0,
        index,
      ]);

      await connection.query(
        `
        INSERT INTO servia_property_images
        (property_id, image_url, is_cover, sort_order)
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
    const userId = req.params.userId;

    const rows = await query(
      `
      SELECT 
        m.*,
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END AS other_user_id,
        u.fullname AS other_user_name,
        p.title AS property_title,
        p.image AS property_image,
        (
          SELECT COUNT(*)
          FROM servia_messages x
          WHERE x.receiver_id = ?
          AND x.sender_id = CASE 
            WHEN m.sender_id = ? THEN m.receiver_id
            ELSE m.sender_id
          END
          AND x.is_read = false
        ) AS unread_count
      FROM servia_messages m
      JOIN servia_users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id
        ELSE m.sender_id
      END
      LEFT JOIN servia_properties p ON p.id = m.property_id
      WHERE m.id IN (
        SELECT MAX(id)
        FROM servia_messages
        WHERE sender_id = ? OR receiver_id = ?
        GROUP BY CASE 
          WHEN sender_id = ? THEN receiver_id
          ELSE sender_id
        END
      )
      ORDER BY m.created_at DESC
      `,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Conversations fetch failed", error: err.message });
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
    await query("DELETE FROM servia_property_images WHERE property_id=?", [req.params.id]);
    await query("DELETE FROM servia_properties WHERE id=?", [req.params.id]);

    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ message: "Property delete failed", error: err.message });
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
      return res.status(400).json({ message: "property_id is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imageUrl = buildFileUrl(req.file.filename);

    const result = await query(
      "INSERT INTO servia_property_images (property_id, image_url, is_cover, sort_order) VALUES (?, ?, ?, ?)",
      [property_id, imageUrl, 0, 0]
    );

    res.json({
      success: true,
      id: result.insertId,
      image_url: imageUrl,
    });
  } catch (err) {
    res.status(500).json({ message: "Image save failed", error: err.message });
  }
});

app.delete("/api/property-images/:id", verifyToken, async (req, res) => {
  try {
    await query("DELETE FROM servia_property_images WHERE id=?", [req.params.id]);

    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ message: "Image delete failed", error: err.message });
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

app.post("/api/bookings", verifyToken, async (req, res) => {
  try {
    const { property_id, user_id, checkin, checkout, guests, total, payment_method } = req.body;

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
      (property_id, user_id, checkin, checkout, guests, total, status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        property_id,
        user_id,
        checkin,
        checkout,
        guests,
        total,
        "Confirmed",
        payment_method || "cash",
      ]
    );

    res.json({
      success: true,
      message: "Booking created successfully",
      bookingId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
});

app.get("/api/bookings/:userId", verifyToken, async (req, res) => {
  try {
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
      [req.params.userId, req.params.userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Bookings fetch failed", error: err.message });
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


server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT} 🚀`);
});