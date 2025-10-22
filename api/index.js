const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();

// Konfigurasi Variabel Lingkungan
const DATABASE_URL = process.env.POSTGRES_DATABASE_URL;

// --- KONFIGURASI KONEKSI DATABASE NEON ---
if (!DATABASE_URL) {
  console.error("FATAL ERROR: POSTGRES_DATABASE_URL tidak ditemukan.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // 🔥 Wajib untuk Neon: Mengaktifkan SSL/TLS untuk koneksi aman
  ssl: {
    rejectUnauthorized: false,
  },
});

// --- KONFIGURASI CORS (Paling Permisif untuk Debugging) ---
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

// Logging sederhana untuk konfirmasi startup
console.log("Aksara API Serverless Function starting...");

// --- ROUTE TEST ---
// Akses: https://aksara-api.vercel.app/api/status
app.get("/api/status", (req, res) => {
  // Jika koneksi berhasil, ini akan merespons 200 OK
  res.status(200).json({ status: "OK", message: "API is running and ready for database connections." });
});

// 🔥 ROUTE 1: PENDAFTARAN
app.post("/api/register", async (req, res) => {
  const { fullName, email, whatsapp, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi." });
  }

  let client;
  try {
    client = await pool.connect();

    // Pastikan skema pengguna sudah dibuat di Neon Console
    const result = await client.query("INSERT INTO users (full_name, email, whatsapp, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name", [fullName, email, whatsapp, password]);

    res.status(201).json({
      message: "Registrasi berhasil!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Database or Server Error on /register:", error);

    if (error.code === "23505") {
      // Unique violation
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }
    // Jika crash database lain (SSL, koneksi, dll.)
    res.status(500).json({ message: "Error server internal. Periksa kredensial DB." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 ROUTE 2: LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  let client;
  try {
    client = await pool.connect();
    const userResult = await client.query("SELECT id, full_name, email, password_hash FROM users WHERE email = $1", [email]);

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    // 🔥 Perbandingan password SEMENTARA (Karena kita tidak menggunakan bcrypt)
    const passwordMatch = user.password_hash === password;

    if (passwordMatch) {
      return res.status(200).json({
        message: "Login berhasil!",
        user: { id: user.id, fullName: user.full_name, email: user.email },
      });
    } else {
      return res.status(401).json({ message: "Email atau password salah." });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Error server internal saat login." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 ROUTE PLACEHOLDER UNTUK PENGAMBILAN DATA (Frontend akan memanggil ini setelah login)
// Jika rute ini hilang, dashboard akan crash dengan Failed to Fetch
app.get("/api/products", (req, res) => res.json([]));
app.get("/api/projects", (req, res) => res.json([]));
app.get("/api/teamMembers", (req, res) => res.json([]));

// 🔥 EXPORT HANDLER UNTUK VERSEL SERVERLESS
module.exports = app;
