const express = require("express");
const cors = require("cors");
const { Pool } = require("pg"); // Library untuk PostgreSQL
const app = express();

// Konfigurasi Variabel Lingkungan
// Vercel akan secara otomatis mengisi process.env.POSTGRES_DATABASE_URL
const DATABASE_URL = process.env.POSTGRES_DATABASE_URL;

// --- KONFIGURASI KONEKSI DATABASE NEON ---
if (!DATABASE_URL) {
  console.error("FATAL ERROR: POSTGRES_DATABASE_URL tidak ditemukan. Server tidak dapat berjalan.");
  // Di lingkungan Vercel, kita biarkan server crash jika variabel penting hilang
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // 🔥 Wajib untuk Neon: Mengaktifkan SSL/TLS untuk koneksi aman dari server cloud
  ssl: {
    rejectUnauthorized: false,
  },
});

// --- KONFIGURASI CORS (Cross-Origin Resource Sharing) ---
// Ganti URL 'https://dashboard-aksara.vercel.app' dengan domain frontend Anda
const frontendUrl = "https://dashboard-aksara.vercel.app";

const corsOptions = {
  origin: frontendUrl, // Hanya izinkan permintaan dari domain frontend Anda
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Terapkan middleware
app.use(cors(corsOptions));
app.use(express.json()); // Middleware untuk parsing JSON body

// Logging sederhana untuk konfirmasi startup (hanya muncul di logs Vercel)
console.log("Serverless Function Aksara API starting...");

// --- DEFINISI ROUTE API ---

// Route Test Sederhana (Opsional, untuk memastikan server merespons)
app.get("/api/status", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running successfully." });
});

// Route Pendaftaran (Contoh dari frontend)
app.post("/register", async (req, res) => {
  const { fullName, email, whatsapp, password } = req.body;

  // Periksa data input sederhana
  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi." });
  }

  let client;
  try {
    client = await pool.connect();

    // 🔥 Lakukan logika registrasi dan hashing password di sini
    // Ini adalah placeholder:
    const result = await client.query(
      "INSERT INTO users (full_name, email, whatsapp, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email",
      [fullName, email, whatsapp, password] // Gunakan bcrypt untuk password hash!
    );

    res.status(201).json({
      message: "Registrasi berhasil!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Database or Server Error:", error);
    // Tangani error jika email sudah ada, dll.
    if (error.code === "23505") {
      // PostgreSQL code for unique violation
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }
    res.status(500).json({ message: "Gagal memproses pendaftaran. Error server." });
  } finally {
    if (client) client.release();
  }
});

// Route Login (Contoh)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  let client;
  try {
    client = await pool.connect();
    const userResult = await client.query("SELECT * FROM users WHERE email = $1", [email]);

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    // 🔥 Lakukan perbandingan password (gunakan bcrypt.compare())
    // Placeholder perbandingan:
    if (user.password_hash === password) {
      // GANTI DENGAN LOGIKA HASH YANG BENAR
      return res.status(200).json({ message: "Login berhasil!", user: { id: user.id, fullName: user.full_name, email: user.email } });
    } else {
      return res.status(401).json({ message: "Email atau password salah." });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Gagal memproses login. Error server." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 PENTING: EXPORT HANDLER UNTUK VERSEL SERVERLESS
// Ini menggantikan app.listen(port)
module.exports = app;
