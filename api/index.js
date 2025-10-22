const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
// import bcrypt from 'bcryptjs'; // Anda harus menggunakan bcrypt untuk password hash!
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
    rejectUnauthorized: false, // Digunakan untuk lingkungan cloud seperti Vercel
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

console.log("Aksara API Serverless Function starting...");

// --- ROUTE TEST ---
app.get("/api/status", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running successfully with CORS: *." });
});

// 🔥 ROUTE 1: PENDAFTARAN
app.post("/register", async (req, res) => {
  const { fullName, email, whatsapp, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi." });
  }

  // const hashedPassword = await bcrypt.hash(password, 10); // Gunakan ini saat bcrypt terinstal

  let client;
  try {
    client = await pool.connect();

    const result = await client.query(
      "INSERT INTO users (full_name, email, whatsapp, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email",
      [fullName, email, whatsapp, password] // Gunakan hashedPassword setelah diimplementasikan
    );

    res.status(201).json({
      message: "Registrasi berhasil!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Database or Server Error:", error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }
    // Jika ada error lain (seperti gagal koneksi/SSL)
    res.status(500).json({ message: "Gagal memproses pendaftaran. Periksa Log Neon/Vercel." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 ROUTE 2: LOGIN (Rute yang dipanggil frontend Anda)
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  let client;
  try {
    client = await pool.connect();
    const userResult = await client.query("SELECT id, full_name, email, password_hash FROM users WHERE email = $1", [email]);

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ message: "Email atau password salah." });
    }

    // 🔥 Harusnya: const passwordMatch = await bcrypt.compare(password, user.password_hash);
    // Sekarang (sementara tanpa hash):
    const passwordMatch = user.password_hash === password; // GANTI DENGAN LOGIKA HASH YANG BENAR

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
    res.status(500).json({ message: "Gagal memproses login. Error server." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 EXPORT HANDLER UNTUK VERSEL SERVERLESS
module.exports = app;
