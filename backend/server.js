const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const multer = require("multer");
const path = require("path");

app.use("/uploads", express.static("uploads"));
app.use(cors());
app.use(express.json());
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + file.originalname.replace(/\s+/g, "-")
    );
  },
});

const upload = multer({ storage });

console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

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

app.get("/", (req, res) => {
  res.send("Servia API running ✅");
});

app.get("/api/test-users", (req, res) => {
  db.query("SELECT * FROM servia_users", (err, result) => {
    if (err) {
      console.error("SELECT ERROR:", err.message);
      return res.status(500).json({
        message: "Cannot read servia_users",
        error: err.message,
      });
    }

    res.json(result);
  });
});

app.post("/api/register", async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields required",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO servia_users (fullname, email, password) VALUES (?, ?, ?)";

    db.query(sql, [fullname, email, hashedPassword], (err, result) => {
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
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  console.log("LOGIN BODY:", req.body);

  db.query(
    "SELECT * FROM servia_users WHERE email = ?",
    [email],
    (err, result) => {
      if (err) return res.status(500).json(err);

      console.log("DB RESULT:", result);

      if (result.length === 0) {
        return res.status(401).json({ message: "Email not found" });
      }

      const user = result[0];

      // temporary demo login
      if (password !== "demopassword") {
        return res.status(401).json({ message: "Wrong password" });
      }

      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          fullname: user.fullname,
          email: user.email,
          role: user.role,
        },
      });
    }
  );
});
app.get("/api/properties", (req, res) => {
  db.query("SELECT * FROM servia_properties", (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Cannot fetch properties",
        error: err.message,
      });
    }

    res.json(result);
  });
});

app.get("/api/properties/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT * FROM servia_properties WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Cannot fetch property",
          error: err.message,
        });
      }

      if (result.length === 0) {
        return res.status(404).json({
          message: "Property not found",
        });
      }

      res.json(result[0]);
    }
  );
});

app.post("/api/bookings", (req, res) => {
  const {
    property_id,
    user_id,
    checkin,
    checkout,
    guests,
    total,
    payment_method,
  } = req.body;

  const sql = `
    INSERT INTO servia_bookings
   (property_id, user_id, checkin, checkout, guests, total, status, payment_method)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      property_id,
      user_id,
      checkin,
      checkout,
      guests,
      total,
      "Confirmed",
        payment_method || "card",
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({
          message: "Booking failed",
          error: err.message,
        });
      }

      res.json({
        success: true,
        message: "Booking created successfully",
        bookingId: result.insertId,
      });
    }
  );
});
app.get("/api/bookings/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      b.id,
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
    WHERE b.user_id = ?
    ORDER BY b.id DESC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Cannot fetch bookings",
        error: err.message,
      });
    }

    res.json(result);
  });
});

app.post("/api/wishlist", (req, res) => {
  const { user_id, property_id } = req.body;

  const sql = `
    INSERT INTO servia_wishlist (user_id, property_id)
    VALUES (?, ?)
  `;

  db.query(sql, [user_id, property_id], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Wishlist add failed",
        error: err.message,
      });
    }

    res.json({
      success: true,
      message: "Added to wishlist",
      wishlistId: result.insertId,
    });
  });
});

app.get("/api/wishlist/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      w.id AS wishlist_id,
      p.*
    FROM servia_wishlist w
    JOIN servia_properties p ON w.property_id = p.id
    WHERE w.user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({
        message: "Wishlist fetch failed",
        error: err.message,
      });
    }

    res.json(result);
  });
});

app.post("/api/messages", (req, res) => {
  const {
    sender_id,
    receiver_id,
    property_id,
    message,
  } = req.body;

  db.query(
    `INSERT INTO servia_messages
    (sender_id,receiver_id,property_id,message)
    VALUES(?,?,?,?)`,
    [sender_id, receiver_id, property_id, message],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        id: result.insertId,
      });
    }
  );
});
app.get("/api/messages/:sender/:receiver", (req, res) => {
  const { sender, receiver } = req.params;

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
    [sender, receiver, receiver, sender],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    }
  );
});

app.post("/api/properties", (req, res) => {
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
  } = req.body;

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
image
)
VALUES(?,?,?,?,?,?,?,?,?,?)
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
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
        propertyId: result.insertId,
      });
    }
  );
});

app.get("/api/my-properties/:userId", (req, res) => {
  db.query(
    "SELECT * FROM servia_properties WHERE user_id=? ORDER BY id DESC",
    [req.params.userId],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json(result);
    }
  );
});

app.put("/api/properties/:id", (req, res) => {
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
SET
title=?,
description=?,
category=?,
location=?,
price=?,
guests=?,
bedrooms=?,
bathrooms=?,
image=?
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

      res.json({
        success: true,
      });
    }
  );
});

app.delete("/api/properties/:id", (req, res) => {
  db.query(
    "DELETE FROM servia_properties WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({
        success: true,
      });
    }
  );
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image uploaded",
    });
  }

  res.json({
    success: true,
    imageUrl: `http://localhost:5000/uploads/${req.file.filename}`,
  });
});

app.get("/api/messages/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      m.*,
      u.fullname AS sender_name
    FROM servia_messages m
    LEFT JOIN servia_users u ON m.sender_id = u.id
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY m.created_at DESC
  `;

  db.query(sql, [userId, userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/api/messages", (req, res) => {
  const { sender_id, receiver_id, property_id, message } = req.body;

  const sql = `
    INSERT INTO servia_messages
    (sender_id, receiver_id, property_id, message)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [sender_id, receiver_id, property_id, message], (err, result) => {
    if (err) return res.status(500).json(err);

    res.json({
      success: true,
      messageId: result.insertId,
    });
  });
});

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

app.post("/api/reviews", (req, res) => {
  const { property_id, user_id, rating, review } = req.body;

  db.query(
    `
    INSERT INTO servia_reviews
    (property_id, user_id, rating, review)
    VALUES (?, ?, ?, ?)
    `,
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
app.get("/api/user/:id", (req, res) => {
  db.query(
    "SELECT id, fullname, email, phone, profile_image, role FROM servia_users WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
    }
  );
});

app.put("/api/user/:id", (req, res) => {
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

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000} 🚀`);
});