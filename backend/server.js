// === server.js ===
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

// Paths setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App config
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://127.0.0.1:5501", "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(bodyParser.json({ limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// SQLite setup
let db;
(async () => {
  db = await open({
    filename: path.join(__dirname, "database.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT,
      category TEXT,
      description TEXT,
      location TEXT,
      status TEXT DEFAULT 'Pending',
      imagePath TEXT,
      createdAt TEXT
    );
  `);
  console.log("✅ Database ready.");
})();

// Multer for image uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, "uploads"),
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// === API Routes ===

// Root
app.get("/", (req, res) => {
  res.send("🚀 civicfinal Backend Running ✅");
});

// Submit complaint
app.post("/api/complaints", upload.array("images", 3), async (req, res) => {
  try {
    const { name, email, phone, category, description, location } = req.body;

    // Fix the string template for paths
    const imagePaths = req.files && req.files.length > 0
      ? req.files.map(f => `/uploads/${f.filename}`).join(",")
      : null;

    await db.run(
      `INSERT INTO complaints (name, email, phone, category, description, location, imagePath, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, email, phone, category, description, location, imagePaths]
    );

    res.json({ success: true, message: "✅ Complaint saved successfully!" });
  } catch (err) {
    console.error("❌ Error saving complaint:", err);
    res.status(500).json({ success: false, message: "Error saving complaint." });
  }
});

// Get all complaints
app.get("/api/complaints", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM complaints ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching complaints:", err);
    res.status(500).json({ success: false, message: "Error fetching complaints." });
  }
});

// Update complaint status
app.put("/api/complaints/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    await db.run("UPDATE complaints SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: "✅ Status updated successfully!" });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ success: false, message: "Error updating status." });
  }
});

// === Serve Frontend ===
app.use(express.static(path.join(__dirname, ".."))); // make sure your HTML is one level up

// Catch-all route for frontend routing (for SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "civicfinal.html"));
});

// === Start Server ===
app.listen(PORT, () => console.log(`🚀 civicFix backend running at http://localhost:${PORT}`));
