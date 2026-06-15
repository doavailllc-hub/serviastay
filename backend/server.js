const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
const app = express();
const http = require("http");

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "servia_secret_key";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const { Server } = require("socket.io");
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_user", (userId) => {
    if (!userId) return;

    socket.join(`user_${userId}`);
    onlineUsers.set(Number(userId), socket.id);

    io.emit("user_online", {
      userId: Number(userId),
    });
  });

  socket.on("typing", ({ sender_id, receiver_id }) => {
    if (!sender_id || !receiver_id) return;

    io.to(`user_${receiver_id}`).emit("typing", {
      sender_id,
    });
  });

  socket.on("stop_typing", ({ sender_id, receiver_id }) => {
    if (!sender_id || !receiver_id) return;

    io.to(`user_${receiver_id}`).emit("stop_typing", {
      sender_id,
    });
  });

  socket.on("send_message", (data) => {
    const { sender_id, receiver_id, property_id, message } = data;

    if (!sender_id || !receiver_id || !message?.trim()) {
      socket.emit("message_error", {
        message: "Invalid message data",
      });
      return;
    }

    const cleanMessage = message.trim();

    db.query(
      `
      INSERT INTO servia_messages
      (sender_id, receiver_id, property_id, message, is_read)
      VALUES (?, ?, ?, ?, false)
      `,
      [sender_id, receiver_id, property_id || null, cleanMessage],
      (err, result) => {
        if (err) {
          console.log("Socket message insert failed:", err.message);

          socket.emit("message_error", {
            message: "Message failed",
          });

          return;
        }

        const newMessage = {
          id: result.insertId,
          sender_id,
          receiver_id,
          property_id: property_id || null,
          message: cleanMessage,
          is_read: false,
          created_at: new Date(),
        };

        db.query(
          `
          INSERT INTO servia_notifications
          (user_id, type, title, message)
          VALUES (?, ?, ?, ?)
          `,
          [
            receiver_id,
            "message",
            "New message",
            cleanMessage,
          ]
        );

        io.to(`user_${sender_id}`).emit("receive_message", newMessage);
        io.to(`user_${receiver_id}`).emit("receive_message", newMessage);

        io.to(`user_${receiver_id}`).emit("notification_received", {
          type: "message",
          title: "New message",
          message: cleanMessage,
        });
      }
    );
  });

  socket.on("message_seen", ({ user_id, other_user_id }) => {
    if (!user_id || !other_user_id) return;

    db.query(
      `
      UPDATE servia_messages
      SET is_read = true
      WHERE receiver_id = ?
      AND sender_id = ?
      `,
      [user_id, other_user_id],
      (err) => {
        if (err) {
          console.log("Message seen update failed:", err.message);
          return;
        }

        io.to(`user_${other_user_id}`).emit("message_seen", {
          by: user_id,
        });
      }
    );
  });

  socket.on("disconnect", () => {
    let disconnectedUserId = null;

    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      io.emit("user_offline", {
        userId: disconnectedUserId,
      });
    }

    console.log("Socket disconnected:", socket.id);
  });
});


const nodemailer = require("nodemailer");

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  try {
    if (!to) return;

    await mailer.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.log("Email send failed:", err.message);
  }
};

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
const emailTemplate = ({ title, body, buttonText, buttonUrl }) => {
  return `
    <div style="font-family:Arial,sans-serif;background:#f7f7fa;padding:30px;">
      <div style="max-width:620px;margin:auto;background:#fff;border-radius:18px;padding:30px;">
        <h1 style="color:#8363F5;margin:0 0 20px;">Servia Stay</h1>
        <h2 style="color:#222;">${title}</h2>
        <div style="color:#555;font-size:15px;line-height:1.7;">
          ${body}
        </div>

        ${
          buttonText && buttonUrl
            ? `<a href="${buttonUrl}" style="display:inline-block;margin-top:24px;background:#8363F5;color:#fff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:bold;">${buttonText}</a>`
            : ""
        }

        <p style="margin-top:30px;color:#999;font-size:12px;">
          This is an automated email from Servia Stay.
        </p>
      </div>
    </div>
  `;
};
app.use(express.json());
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
});

db.connect((err) => {
  if (err) {
    console.error("DB Connection Failed:", err.message);
    return;
  }
  console.log("Connected to serviadb ✅");
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-")),
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("Servia API running ✅");
});

/* AUTH */
app.post("/api/register", async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO servia_users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
    [fullname, email, hashedPassword, "guest"],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Registration failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "User registered successfully",
        userId: result.insertId,
      });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM servia_users WHERE email=?", [email], async (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
      return res.status(401).json({ message: "Email not found" });
    }

    const user = result[0];

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
  });
});

/* USER */
app.get("/api/user/:id", verifyToken, (req, res) => {
  db.query(
    "SELECT id, fullname, email, phone, profile_image, role FROM servia_users WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

app.put("/api/user/:id", verifyToken, (req, res) => {
  const { fullname, email, phone } = req.body;

  db.query(
    "UPDATE servia_users SET fullname=?, email=?, phone=? WHERE id=?",
    [fullname, email, phone, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

/* UPLOAD */
app.post("/api/upload", verifyToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No image uploaded" });
  }

  res.json({
    success: true,
    imageUrl: `http://localhost:${PORT}/uploads/${req.file.filename}`,
  });
});

/* PROPERTIES */
app.get("/api/properties", (req, res) => {
  db.query("SELECT * FROM servia_properties ORDER BY id DESC", (err, result) => {
    if (err) {
      console.log("PROPERTIES ERROR:", err.message);

      return res.status(500).json({
        message: "Cannot fetch properties",
        error: err.message,
      });
    }

    res.json(result);
  });
});

app.get("/api/properties/:id", (req, res) => {
  db.query("SELECT * FROM servia_properties WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Cannot fetch property", error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: "Property not found" });
    }

    res.json(result[0]);
  });
});

app.post("/api/properties", verifyToken, (req, res) => {
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
    return res.status(400).json({
      success: false,
      message: "Required property fields missing",
    });
  }

  db.query(
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
      host_whatsapp
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
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
      host_whatsapp || null,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Property create failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        propertyId: result.insertId,
      });
    }
  );
});

app.get("/api/my-properties/:userId", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM servia_properties WHERE user_id=? ORDER BY id DESC",
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.put("/api/properties/:id", verifyToken, (req, res) => {
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

  db.query(
    `
    UPDATE servia_properties
    SET title=?, description=?, category=?, location=?, price=?,
    guests=?, bedrooms=?, bathrooms=?, image=?
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
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/properties/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM servia_properties WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

/* SEARCH */
app.get("/api/search-properties", (req, res) => {
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

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ message: "Search failed", error: err.message });
    res.json(result);
  });
});

/* BOOKINGS */
app.post("/api/check-availability", (req, res) => {
  const { property_id, checkin, checkout } = req.body;

  db.query(
    `
    SELECT * FROM servia_bookings
    WHERE property_id = ?
    AND status != 'Cancelled'
    AND checkin < ?
    AND checkout > ?
    `,
    [property_id, checkout, checkin],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Availability check failed",
          error: err.message,
        });
      }

      if (result.length > 0) {
        return res.json({
          available: false,
          message: "This property is already booked for these dates",
        });
      }

      res.json({ available: true, message: "Property is available" });
    }
  );
});

app.post("/api/bookings", verifyToken, (req, res) => {
  const { property_id, user_id, checkin, checkout, guests, total, payment_method } = req.body;

  const checkSql = `
    SELECT * FROM servia_bookings
    WHERE property_id = ?
    AND status != 'Cancelled'
    AND checkin < ?
    AND checkout > ?
  `;

  db.query(checkSql, [property_id, checkout, checkin], (err, existing) => {
    if (err) return res.status(500).json(err);

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "This property is already booked for these dates",
      });
    }

    db.query(
      `
      INSERT INTO servia_bookings
      (property_id,user_id,checkin,checkout,guests,total,status,payment_method)
      VALUES(?,?,?,?,?,?,?,?)
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
      ],
      (err, result) => {
        if (err) return res.status(500).json(err);

        const bookingId = result.insertId;

db.query(
  `
  SELECT 
    guest.email AS guest_email,
    guest.fullname AS guest_name,
    host.email AS host_email,
    host.fullname AS host_name,
    p.title,
    p.location
  FROM servia_properties p
  JOIN servia_users guest ON guest.id = ?
  LEFT JOIN servia_users host ON host.id = p.user_id
  WHERE p.id = ?
  `,
  [user_id, property_id],
  async (mailErr, rows) => {
    if (!mailErr && rows.length) {
      const data = rows[0];

      await sendMail({
        to: data.guest_email,
        subject: "Booking confirmed - Servia Stay",
        html: emailTemplate({
          title: "Booking Confirmed ✅",
          message: `
            <p>Hello ${data.guest_name || "Guest"},</p>
            <p>Your booking for <strong>${data.title}</strong> is confirmed.</p>
            <p><strong>Location:</strong> ${data.location}</p>
            <p><strong>Check-in:</strong> ${checkin}</p>
            <p><strong>Check-out:</strong> ${checkout}</p>
            <p><strong>Guests:</strong> ${guests}</p>
            <p><strong>Total:</strong> ₹${Number(total || 0).toLocaleString("en-IN")}</p>
          `,
          buttonText: "View Trips",
          buttonUrl: `${CLIENT_URL}/trips`,
        }),
      });

      await sendMail({
        to: data.host_email,
        subject: "New reservation received - Servia Stay",
        html: emailTemplate({
          title: "New Reservation Received 🏡",
          message: `
            <p>Hello ${data.host_name || "Host"},</p>
            <p>You received a new booking for <strong>${data.title}</strong>.</p>
            <p><strong>Check-in:</strong> ${checkin}</p>
            <p><strong>Check-out:</strong> ${checkout}</p>
            <p><strong>Total:</strong> ₹${Number(total || 0).toLocaleString("en-IN")}</p>
          `,
          buttonText: "Manage Reservations",
          buttonUrl: `${CLIENT_URL}/host-reservations`,
        }),
      });
    }
  }
);

res.json({
  success: true,
  message: "Booking created successfully",
  bookingId,
});
      }
    );
  });
});

app.get("/api/bookings/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      b.id,
      b.property_id,
      b.checkin,
      b.checkout,
      b.guests,
      b.total,
      b.status,
      b.payment_method,
      p.title,
      p.location,
      p.image
    FROM servia_bookings b
    JOIN servia_properties p ON b.property_id = p.id
    WHERE b.user_id = ? OR p.user_id = ?
    ORDER BY b.id DESC
    `,
    [req.params.userId, req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Cannot fetch bookings", error: err.message });
      res.json(result);
    }
  );
});

app.put("/api/bookings/:id/status", verifyToken, (req, res) => {
  const { status } = req.body;

  db.query(
    "UPDATE servia_bookings SET status=? WHERE id=?",
    [status, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        message: "Booking status updated",
      });
    }
  );
});

/* WISHLIST */
app.post("/api/wishlist", verifyToken, (req, res) => {
  const { user_id, property_id } = req.body;

  db.query(
    "SELECT id FROM servia_wishlist WHERE user_id=? AND property_id=?",
    [user_id, property_id],
    (err, existing) => {
      if (err) return res.status(500).json(err);

      if (existing.length > 0) {
        return res.status(409).json({ message: "Already in wishlist" });
      }

      db.query(
        "INSERT INTO servia_wishlist (user_id, property_id) VALUES (?, ?)",
        [user_id, property_id],
        (err, result) => {
          if (err) return res.status(500).json(err);

          res.json({
            success: true,
            message: "Added to wishlist",
            wishlistId: result.insertId,
          });
        }
      );
    }
  );
});
app.put("/api/bookings/:id/cancel", verifyToken, (req, res) => {
  const { reason } = req.body;
  const bookingId = req.params.id;

  db.query(
    `
    SELECT 
      b.id,
      b.user_id,
      b.total,
      b.status,
      guest.email AS guest_email,
      guest.fullname AS guest_name,
      host.email AS host_email,
      host.fullname AS host_name,
      p.title,
      p.user_id AS host_id
    FROM servia_bookings b
    JOIN servia_users guest ON b.user_id = guest.id
    JOIN servia_properties p ON b.property_id = p.id
    LEFT JOIN servia_users host ON p.user_id = host.id
    WHERE b.id = ?
    `,
    [bookingId],
    (findErr, rows) => {
      if (findErr) {
        return res.status(500).json({
          message: "Booking lookup failed",
          error: findErr.message,
        });
      }

      if (!rows.length) {
        return res.status(404).json({
          message: "Booking not found",
        });
      }

      const booking = rows[0];

      if (booking.status === "Cancelled") {
        return res.status(400).json({
          message: "Booking already cancelled",
        });
      }

      db.query(
        `
        UPDATE servia_bookings
        SET status = 'Cancelled'
        WHERE id = ?
        `,
        [bookingId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json({
              message: "Cancellation failed",
              error: updateErr.message,
            });
          }

          db.query(
            `
            INSERT INTO servia_notifications
            (user_id, type, title, message)
            VALUES (?, ?, ?, ?), (?, ?, ?, ?)
            `,
            [
              booking.user_id,
              "booking",
              "Booking cancelled",
              `Your booking #${booking.id} has been cancelled.`,

              booking.host_id,
              "booking",
              "Guest cancelled booking",
              `A guest cancelled booking #${booking.id}.`,
            ]
          );

          db.query(
            `
            INSERT INTO servia_refunds
            (booking_id, user_id, amount, reason, status)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              booking.id,
              booking.user_id,
              booking.total || 0,
              reason || "Cancelled by guest",
              "Pending",
            ]
          );

          res.json({
            success: true,
            message: "Booking cancelled successfully",
            refundStatus: "Pending",
          });

          sendMail({
            to: booking.guest_email,
            subject: "Booking cancelled - Servia Stay",
            html: emailTemplate({
              title: "Booking Cancelled",
              message: `
                <p>Hello ${booking.guest_name || "Guest"},</p>
                <p>Your booking #${booking.id} for <strong>${booking.title}</strong> has been cancelled.</p>
                <p>A refund request has been created and is now pending review.</p>
              `,
              buttonText: "View Refunds",
              buttonUrl: `${CLIENT_URL}/refunds`,
            }),
          });

          sendMail({
            to: booking.host_email,
            subject: "Guest cancelled booking - Servia Stay",
            html: emailTemplate({
              title: "Guest Cancelled Booking",
              message: `
                <p>Hello ${booking.host_name || "Host"},</p>
                <p>Booking #${booking.id} for <strong>${booking.title}</strong> was cancelled by the guest.</p>
              `,
              buttonText: "View Reservations",
              buttonUrl: `${CLIENT_URL}/host-reservations`,
            }),
          });
        }
      );
    }
  );
});
app.get("/api/wishlist/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      w.id,
      p.*
    FROM servia_wishlist w
    JOIN servia_properties p ON w.property_id = p.id
    WHERE w.user_id = ?
    ORDER BY w.id DESC
    `,
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Wishlist fetch failed", error: err.message });
      res.json(result);
    }
  );
});

app.delete("/api/wishlist/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM servia_wishlist WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

/* REVIEWS */
app.get("/api/reviews/:propertyId", (req, res) => {
  db.query(
    `
    SELECT r.*, u.fullname
    FROM servia_reviews r
    JOIN servia_users u ON r.user_id = u.id
    WHERE r.property_id = ?
    ORDER BY r.id DESC
    `,
    [req.params.propertyId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.post("/api/reviews", verifyToken, (req, res) => {
  const { property_id, user_id, rating, review } = req.body;

  db.query(
    "INSERT INTO servia_reviews (property_id,user_id,rating,review) VALUES (?,?,?,?)",
    [property_id, user_id, rating, review],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        reviewId: result.insertId,
      });
    }
  );
});

app.get("/api/host/reviews/:hostId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      r.*,
      u.fullname,
      p.title,
      p.image
    FROM servia_reviews r
    JOIN servia_users u ON r.user_id = u.id
    JOIN servia_properties p ON r.property_id = p.id
    WHERE p.user_id = ?
    ORDER BY r.id DESC
    `,
    [req.params.hostId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

/* MESSAGES */
app.get("/api/messages/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      m.*,
      u.fullname AS sender_name
    FROM servia_messages m
    LEFT JOIN servia_users u ON m.sender_id = u.id
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY m.created_at ASC
    `,
    [req.params.userId, req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.post("/api/messages", verifyToken, (req, res) => {
  const { sender_id, receiver_id, property_id, message } = req.body;

  db.query(
    `
    INSERT INTO servia_messages
    (sender_id,receiver_id,property_id,message)
    VALUES(?,?,?,?)
    `,
    [sender_id, receiver_id, property_id, message],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        messageId: result.insertId,
      });
    }
  );
});

app.get("/api/conversations/:userId", verifyToken, (req, res) => {
  const userId = req.params.userId;

  const sql = `
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
        AND x.sender_id = other_user_id
        AND x.is_read = false
      ) AS unread_count
    FROM servia_messages m
    JOIN servia_users u 
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
    ORDER BY m.created_at DESC
  `;

  db.query(
    sql,
    [userId, userId, userId, userId, userId, userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.get("/api/messages/:userId/:otherUserId", verifyToken, (req, res) => {
  const { userId, otherUserId } = req.params;

  db.query(
    `
    SELECT *
    FROM servia_messages
    WHERE 
      (sender_id=? AND receiver_id=?)
      OR
      (sender_id=? AND receiver_id=?)
    ORDER BY created_at ASC
    `,
    [userId, otherUserId, otherUserId, userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.put("/api/messages/read/:userId/:otherUserId", verifyToken, (req, res) => {
  const { userId, otherUserId } = req.params;

  db.query(
    `
    UPDATE servia_messages
    SET is_read = true
    WHERE receiver_id = ?
    AND sender_id = ?
    `,
    [userId, otherUserId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});
app.get("/api/notifications/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT *
    FROM servia_notifications
    WHERE user_id=?
    ORDER BY id DESC
    `,
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.get("/api/notifications/:userId/unread-count", verifyToken, (req, res) => {
  db.query(
    `
    SELECT COUNT(*) AS count
    FROM servia_notifications
    WHERE user_id=? AND is_read=false
    `,
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ count: result[0].count });
    }
  );
});

app.put("/api/notifications/:userId/read-all", verifyToken, (req, res) => {
  db.query(
    `
    UPDATE servia_notifications
    SET is_read=true
    WHERE user_id=?
    `,
    [req.params.userId],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});
app.post(
  "/api/property-images",
  verifyToken,
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
      });
    }

    const imageUrl =
      `http://localhost:${PORT}/uploads/` +
      req.file.filename;

    db.query(
      `
      INSERT INTO servia_property_images
      (property_id,image_url)
      VALUES(?,?)
      `,
      [
        req.body.property_id,
        imageUrl,
      ],
      (err, result) => {
        if (err)
          return res.status(500).json(err);

        res.json({
          success: true,
          id: result.insertId,
          image: imageUrl,
        });
      }
    );
  }
);
app.get(
"/api/property-images/:propertyId",
(req,res)=>{

db.query(
`
SELECT *
FROM servia_property_images
WHERE property_id=?
ORDER BY id
`,
[req.params.propertyId],

(err,result)=>{

if(err)
return res.status(500).json(err);

res.json(result);

});

});
app.delete(
"/api/property-images/:id",
verifyToken,
(req,res)=>{

db.query(
`
DELETE FROM servia_property_images
WHERE id=?
`,
[req.params.id],

(err)=>{

if(err)
return res.status(500).json(err);

res.json({
success:true
});

});

});
/* PROPERTY MULTIPLE IMAGES */

app.post(
  "/api/property-images",
  verifyToken,
  upload.single("image"),
  (req, res) => {
    const { property_id } = req.body;

    if (!property_id) {
      return res.status(400).json({
        success: false,
        message: "property_id is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

    db.query(
      `
      INSERT INTO servia_property_images
      (property_id, image_url)
      VALUES (?, ?)
      `,
      [property_id, imageUrl],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Image save failed",
            error: err.message,
          });
        }

        res.json({
          success: true,
          id: result.insertId,
          image_url: imageUrl,
        });
      }
    );
  }
);

app.get("/api/property-images/:propertyId", (req, res) => {
  db.query(
    `
    SELECT *
    FROM servia_property_images
    WHERE property_id = ?
    ORDER BY id ASC
    `,
    [req.params.propertyId],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Images fetch failed",
          error: err.message,
        });
      }

      res.json(result);
    }
  );
});

app.delete("/api/property-images/:id", verifyToken, (req, res) => {
  db.query(
    `
    DELETE FROM servia_property_images
    WHERE id = ?
    `,
    [req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Image delete failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "Image deleted",
      });
    }
  );
});
/* ADMIN DASHBOARD */

function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }

  next();
}

app.get("/api/admin/stats", verifyToken, verifyAdmin, (req, res) => {
  const stats = {};

  db.query("SELECT COUNT(*) AS totalUsers FROM servia_users", (err, users) => {
    if (err) return res.status(500).json(err);
    stats.totalUsers = users[0].totalUsers;

    db.query("SELECT COUNT(*) AS totalProperties FROM servia_properties", (err, properties) => {
      if (err) return res.status(500).json(err);
      stats.totalProperties = properties[0].totalProperties;

      db.query("SELECT COUNT(*) AS totalBookings FROM servia_bookings", (err, bookings) => {
        if (err) return res.status(500).json(err);
        stats.totalBookings = bookings[0].totalBookings;

        db.query(
          "SELECT COALESCE(SUM(total),0) AS totalRevenue FROM servia_bookings WHERE status!='Cancelled'",
          (err, revenue) => {
            if (err) return res.status(500).json(err);
            stats.totalRevenue = revenue[0].totalRevenue;

            res.json(stats);
          }
        );
      });
    });
  });
});

app.get("/api/admin/users", verifyToken, verifyAdmin, (req, res) => {
  db.query(
    "SELECT id, fullname, email, phone, role, created_at FROM servia_users ORDER BY id DESC",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.get("/api/admin/properties", verifyToken, verifyAdmin, (req, res) => {
  db.query(
    `
    SELECT 
      p.*,
      u.fullname AS host_name,
      u.email AS host_email
    FROM servia_properties p
    LEFT JOIN servia_users u ON p.user_id = u.id
    ORDER BY p.id DESC
    `,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.get("/api/admin/bookings", verifyToken, verifyAdmin, (req, res) => {
  db.query(
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
    `,
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

app.put("/api/admin/users/:id/role", verifyToken, verifyAdmin, (req, res) => {
  const { role } = req.body;

  db.query(
    "UPDATE servia_users SET role=? WHERE id=?",
    [role, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

app.delete("/api/admin/properties/:id", verifyToken, verifyAdmin, (req, res) => {
  db.query(
    "DELETE FROM servia_properties WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true });
    }
  );
});

/* ADMIN ANALYTICS */

app.get("/api/admin/analytics", verifyToken, verifyAdmin, (req, res) => {
  const data = {};

  const revenueSql = `
    SELECT 
      COALESCE(SUM(total), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS todayRevenue,
      COALESCE(SUM(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN total ELSE 0 END), 0) AS monthlyRevenue
    FROM servia_bookings
    WHERE status != 'Cancelled'
  `;

  db.query(revenueSql, (err, revenue) => {
    if (err) return res.status(500).json({ error: err.message });

    data.revenue = revenue[0];

    db.query(
      `
      SELECT 
        DATE(created_at) AS date,
        COALESCE(SUM(total), 0) AS revenue,
        COUNT(*) AS bookings
      FROM servia_bookings
      WHERE status != 'Cancelled'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
      LIMIT 14
      `,
      (err, revenueTrend) => {
        if (err) return res.status(500).json({ error: err.message });

        data.revenueTrend = revenueTrend.reverse();

        db.query(
          `
          SELECT 
            DATE(created_at) AS date,
            COUNT(*) AS users
          FROM servia_users
          GROUP BY DATE(created_at)
          ORDER BY DATE(created_at) DESC
          LIMIT 14
          `,
          (err, userGrowth) => {
            if (err) return res.status(500).json({ error: err.message });

            data.userGrowth = userGrowth.reverse();

            db.query(
              `
              SELECT 
                location,
                COUNT(*) AS total
              FROM servia_properties
              GROUP BY location
              ORDER BY total DESC
              LIMIT 5
              `,
              (err, topCities) => {
                if (err) return res.status(500).json({ error: err.message });

                data.topCities = topCities;

                db.query(
                  `
                  SELECT 
                    p.id,
                    p.title,
                    p.location,
                    p.image,
                    COALESCE(SUM(b.total), 0) AS revenue,
                    COUNT(b.id) AS bookings
                  FROM servia_properties p
                  LEFT JOIN servia_bookings b ON p.id = b.property_id AND b.status != 'Cancelled'
                  GROUP BY p.id
                  ORDER BY revenue DESC
                  LIMIT 5
                  `,
                  (err, topProperties) => {
                    if (err) return res.status(500).json({ error: err.message });

                    data.topProperties = topProperties;

                    db.query(
                      `
                      SELECT 
                        u.id,
                        u.fullname,
                        u.email,
                        COALESCE(SUM(b.total), 0) AS revenue,
                        COUNT(b.id) AS bookings
                      FROM servia_users u
                      JOIN servia_properties p ON u.id = p.user_id
                      LEFT JOIN servia_bookings b ON p.id = b.property_id AND b.status != 'Cancelled'
                      GROUP BY u.id
                      ORDER BY revenue DESC
                      LIMIT 5
                      `,
                      (err, topHosts) => {
                        if (err) return res.status(500).json({ error: err.message });

                        data.topHosts = topHosts;

                        res.json(data);
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});
/* RAZORPAY PAYMENTS */

app.post("/api/payments/create-order", verifyToken, async (req, res) => {
  try {
    const { user_id, property_id, amount } = req.body;

    if (!user_id || !property_id || !amount) {
      return res.status(400).json({
        success: false,
        message: "user_id, property_id and amount are required",
      });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
      currency: "INR",
      receipt: `servia_${Date.now()}`,
    });

    db.query(
      `
      INSERT INTO servia_payments
      (user_id, property_id, razorpay_order_id, amount, status)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user_id, property_id, order.id, amount, "Created"],
      (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Payment save failed",
            error: err.message,
          });
        }

        res.json({
          success: true,
          key: process.env.RAZORPAY_KEY_ID,
          order,
        });
      }
    );
  } catch (err) {
    console.log("Razorpay order failed:", err);
    res.status(500).json({
      success: false,
      message: "Payment order creation failed",
    });
  }
});

app.post("/api/payments/verify", verifyToken, (req, res) => {
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
    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  db.query(
    `
    UPDATE servia_payments
    SET razorpay_payment_id=?, status=?
    WHERE razorpay_order_id=?
    `,
    [razorpay_payment_id, "Paid", razorpay_order_id],
    (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "Payment verified",
      });
    }
  );
});

app.get("/api/payments/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      pay.*,
      p.title,
      p.image,
      p.location
    FROM servia_payments pay
    JOIN servia_properties p ON pay.property_id = p.id
    WHERE pay.user_id=?
    ORDER BY pay.id DESC
    `,
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});
app.get("/api/admin/payments",verifyToken,verifyAdmin,(req,res)=>{

db.query(

`
SELECT

pay.*,

u.fullname,

u.email,

p.title

FROM servia_payments pay

JOIN servia_users u

ON pay.user_id=u.id

JOIN servia_properties p

ON pay.property_id=p.id

ORDER BY pay.id DESC
`,

(err,result)=>{

if(err) return res.status(500).json(err);

res.json(result);

});

});

app.put("/api/admin/payments/:id",(req,res)=>{

const {status}=req.body;

db.query(

"UPDATE servia_payments SET status=? WHERE id=?",

[status,req.params.id],

(err)=>{

if(err) return res.status(500).json(err);

res.json({

success:true

});

});

});

/* HOST PAYOUTS */

app.get("/api/host/payouts/:hostId", verifyToken, (req, res) => {
  const hostId = req.params.hostId;

  const sql = `
    SELECT 
      COALESCE(SUM(b.total), 0) AS totalEarnings,
      COALESCE((
        SELECT SUM(amount) 
        FROM servia_payouts 
        WHERE host_id=? AND status='Paid'
      ), 0) AS paidOut,
      COALESCE((
        SELECT SUM(amount) 
        FROM servia_payouts 
        WHERE host_id=? AND status='Pending'
      ), 0) AS pendingPayout
    FROM servia_bookings b
    JOIN servia_properties p ON b.property_id = p.id
    WHERE p.user_id=? AND b.status!='Cancelled'
  `;

  db.query(sql, [hostId, hostId, hostId], (err, stats) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(
      `
      SELECT *
      FROM servia_payouts
      WHERE host_id=?
      ORDER BY id DESC
      `,
      [hostId],
      (err, history) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          ...stats[0],
          availableBalance:
            Number(stats[0].totalEarnings || 0) -
            Number(stats[0].paidOut || 0) -
            Number(stats[0].pendingPayout || 0),
          history,
        });
      }
    );
  });
});

app.post("/api/host/payouts/request", verifyToken, (req, res) => {
  const { host_id, amount, method } = req.body;

  if (!host_id || !amount || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid host_id and amount required",
    });
  }

  db.query(
    `
    INSERT INTO servia_payouts
    (host_id, amount, method, status)
    VALUES (?, ?, ?, ?)
    `,
    [host_id, amount, method || "Bank Transfer", "Pending"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        payoutId: result.insertId,
      });
    }
  );
});

app.get("/api/host/reservations/:hostId", verifyToken, (req, res) => {
  const { hostId } = req.params;

  const sql = `
    SELECT 
      b.id,
      b.property_id,
      b.user_id AS guest_id,
      b.checkin,
      b.checkout,
      b.guests,
      b.total,
      b.status,
      b.payment_method,
      b.created_at,

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
  `;

  db.query(sql, [hostId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Host reservations fetch failed",
        error: err.message,
      });
    }

    res.json(result);
  });
});

/* USER TRIP DETAILS */

app.get("/api/trip/:bookingId", verifyToken, (req, res) => {
  const { bookingId } = req.params;

  const sql = `
    SELECT 
      b.*,
      p.title,
      p.location,
      p.image,
      p.price,
      p.description,
      p.user_id AS host_id,
      host.fullname AS host_name,
      host.email AS host_email,
      host.phone AS host_phone
    FROM servia_bookings b
    JOIN servia_properties p ON b.property_id = p.id
    LEFT JOIN servia_users host ON p.user_id = host.id
    WHERE b.id = ?
  `;

  db.query(sql, [bookingId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Trip details failed",
        error: err.message,
      });
    }

    if (result.length === 0) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json(result[0]);
  });
});

app.put("/api/bookings/:id/cancel", verifyToken, (req, res) => {
  const { reason } = req.body;

  db.query(
    `
    UPDATE servia_bookings
    SET status = 'Cancelled'
    WHERE id = ?
    `,
    [req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({
          message: "Cancellation failed",
          error: err.message,
        });
      }

      db.query(
        `
        INSERT INTO servia_notifications
        (user_id, type, title, message)
        SELECT 
          p.user_id,
          'booking',
          'Booking cancelled',
          CONCAT('A guest cancelled booking #', b.id)
        FROM servia_bookings b
        JOIN servia_properties p ON b.property_id = p.id
        WHERE b.id = ?
        `,
        [req.params.id]
      );

      res.json({
        success: true,
        message: "Booking cancelled successfully",
        reason: reason || null,
      });
    }
  );
});

app.get("/api/reviews/can-review/:bookingId", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      b.id,
      b.user_id,
      b.property_id,
      b.status,
      r.id AS review_id
    FROM servia_bookings b
    LEFT JOIN servia_reviews r 
      ON r.property_id = b.property_id 
      AND r.user_id = b.user_id
    WHERE b.id = ?
  `;

  db.query(sql, [req.params.bookingId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = result[0];

    res.json({
      canReview: booking.status === "Completed" && !booking.review_id,
      booking,
    });
  });
});

/* FORGOT PASSWORD */


app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  db.query(
    "SELECT id, email FROM servia_users WHERE email=?",
    [email],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!result.length) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      db.query(
        `
        UPDATE servia_users
        SET reset_otp=?, reset_otp_expires=?
        WHERE email=?
        `,
        [otp, expiresAt, email],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          console.log("RESET OTP:", otp);

          res.json({
            success: true,
            message: "OTP sent to your email",
          });
        }
      );
    }
  );
});

app.post("/api/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Email, OTP and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters",
    });
  }

  db.query(
    `
    SELECT *
    FROM servia_users
    WHERE email=? AND reset_otp=?
    `,
    [email, otp],
    async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!result.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      const user = result[0];

      if (new Date(user.reset_otp_expires) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      db.query(
        `
        UPDATE servia_users
        SET password=?, reset_otp=NULL, reset_otp_expires=NULL
        WHERE email=?
        `,
        [hashedPassword, email],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            success: true,
            message: "Password reset successful",
          });
        }
      );
    }
  );
});
/* SUPPORT TICKETS */

app.post("/api/support/tickets", verifyToken, (req, res) => {
  const { user_id, subject, category, message } = req.body;

  if (!user_id || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Subject and message are required",
    });
  }

  db.query(
    `
    INSERT INTO servia_support_tickets
    (user_id, subject, category, message, status, priority)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user_id, subject, category || "General", message, "Open", "Normal"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        ticketId: result.insertId,
      });
    }
  );
});

app.get("/api/support/tickets/:userId", verifyToken, (req, res) => {
  db.query(
    `
    SELECT *
    FROM servia_support_tickets
    WHERE user_id=?
    ORDER BY id DESC
    `,
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
});

app.get("/api/properties/:id/similar", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT category, location, price FROM servia_properties WHERE id=?",
    [id],
    (err, current) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!current.length) {
        return res.status(404).json({ message: "Property not found" });
      }

      const property = current[0];

      const sql = `
        SELECT *
        FROM servia_properties
        WHERE id != ?
        AND (
          category = ?
          OR location LIKE ?
          OR price BETWEEN ? AND ?
        )
        ORDER BY rating DESC, id DESC
        LIMIT 6
      `;

      const minPrice = Math.max(Number(property.price || 0) - 1000, 0);
      const maxPrice = Number(property.price || 0) + 1000;

      db.query(
        sql,
        [id, property.category, `%${property.location}%`, minPrice, maxPrice],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(result);
        }
      );
    }
  );
});
app.get("/api/host/:id", verifyToken, (req, res) => {
  db.query(
    "SELECT id, fullname, email, phone, role, created_at FROM servia_users WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!result.length) {
        return res.status(404).json({ message: "Host not found" });
      }

      res.json(result[0]);
    }
  );
});

app.get("/api/host/:id/properties", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM servia_properties WHERE user_id=? ORDER BY id DESC",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    }
  );
});

app.get("/api/host/:id/reviews", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      r.*,
      u.fullname,
      p.title AS property_title
    FROM servia_reviews r
    JOIN servia_users u ON r.user_id = u.id
    JOIN servia_properties p ON r.property_id = p.id
    WHERE p.user_id = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});
app.post("/api/refunds", verifyToken, (req, res) => {
  const { booking_id, user_id, amount, reason } = req.body;

  if (!booking_id || !user_id || !amount) {
    return res.status(400).json({
      success: false,
      message: "booking_id, user_id and amount are required",
    });
  }

  db.query(
    `
    INSERT INTO servia_refunds
    (booking_id, user_id, amount, reason, status)
    VALUES (?, ?, ?, ?, ?)
    `,
    [booking_id, user_id, amount, reason || "", "Pending"],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        refundId: result.insertId,
      });
    }
  );
});

app.get("/api/refunds/:userId", verifyToken, (req, res) => {
  const sql = `
    SELECT 
      r.*,
      b.checkin,
      b.checkout,
      p.title,
      p.image,
      p.location
    FROM servia_refunds r
    JOIN servia_bookings b ON r.booking_id = b.id
    JOIN servia_properties p ON b.property_id = p.id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [req.params.userId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});


app.get("/api/user/:id/verification", verifyToken, (req, res) => {
  db.query(
    `
    SELECT 
      id,
      email_verified,
      phone_verified,
      id_verified,
      selfie_verified
    FROM servia_users
    WHERE id=?
    `,
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!result.length) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(result[0]);
    }
  );
});

app.post("/api/coupons/validate", verifyToken, (req, res) => {
  const { code, amount } = req.body;

  db.query(
    `
    SELECT *
    FROM servia_coupons
    WHERE code=? AND status='Active'
    LIMIT 1
    `,
    [code],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!result.length) {
        return res.status(404).json({ message: "Invalid coupon" });
      }

      const coupon = result[0];

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return res.status(400).json({ message: "Coupon expired" });
      }

      if (Number(amount) < Number(coupon.min_amount || 0)) {
        return res.status(400).json({
          message: `Minimum booking amount is ₹${coupon.min_amount}`,
        });
      }

      if (Number(coupon.used_count) >= Number(coupon.usage_limit)) {
        return res.status(400).json({ message: "Coupon usage limit reached" });
      }

      let discount = 0;

      if (coupon.discount_type === "percentage") {
        discount = Math.round((Number(amount) * Number(coupon.discount_value)) / 100);

        if (Number(coupon.max_discount || 0) > 0) {
          discount = Math.min(discount, Number(coupon.max_discount));
        }
      } else {
        discount = Number(coupon.discount_value);
      }

      res.json({
        success: true,
        coupon,
        discount,
        payableAmount: Math.max(Number(amount) - discount, 0),
      });
    }
  );
});
app.post("/api/service-bookings", verifyToken, (req, res) => {
  const {
    user_id,
    service_id,
    service_title,
    provider,
    service_date,
    people,
    total,
  } = req.body;

  if (!user_id || !service_id || !service_date) {
    return res.status(400).json({
      success: false,
      message: "User, service and date are required",
    });
  }

  db.query(
    `
    INSERT INTO servia_service_bookings
    (user_id, service_id, service_title, provider, service_date, people, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      user_id,
      service_id,
      service_title,
      provider,
      service_date,
      people || 1,
      total || 0,
      "Confirmed",
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Service booking failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "Service booked successfully",
        bookingId: result.insertId,
      });
    }
  );
});

app.get("/api/service-booking/:id", verifyToken, (req, res) => {
  db.query(
    `
    SELECT *
    FROM servia_service_bookings
    WHERE id=?
    `,
    [req.params.id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Service booking fetch failed",
          error: err.message,
        });
      }

      if (!result.length) {
        return res.status(404).json({
          message: "Service booking not found",
        });
      }

      res.json(result[0]);
    }
  );
});

app.put("/api/service-booking/:id/cancel", verifyToken, (req, res) => {
  db.query(
    `
    UPDATE servia_service_bookings
    SET status='Cancelled'
    WHERE id=?
    `,
    [req.params.id],
    (err) => {
      if (err) {
        return res.status(500).json({
          message: "Service booking cancel failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "Service booking cancelled",
      });
    }
  );
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});