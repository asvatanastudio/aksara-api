const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();

// Konfigurasi Variabel Lingkungan
const DATABASE_URL = process.env.POSTGRES_DATABASE_URL;

// --- KONFIGURASI KONEKSI DATABASE NEON ---
if (!DATABASE_URL) {
  console.error("FATAL ERROR: POSTGRES_DATABASE_URL tidak ditemukan.");
  // Server akan merespons 500 jika variabel ini hilang saat startup
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // 🔥 Wajib untuk Neon: Mengaktifkan SSL/TLS untuk koneksi aman
  ssl: {
    rejectUnauthorized: false, // Digunakan untuk lingkungan cloud seperti Vercel
  },
});

// --- KONFIGURASI CORS (Paling Permisif untuk Debugging) ---
// Origin: '*' diatur untuk memastikan browser tidak memblokir permintaan
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

// --- ROUTE TEST (Untuk memastikan server merespons) ---
// Akses: https://aksara-api.vercel.app/api/status
app.get("/api/status", (req, res) => {
  res.status(200).json({ status: "OK", message: "API is running successfully with CORS: *." });
});

// 🔥 PENTING: ROUTE PENDAFTARAN DENGAN LOGIKA KONEKSI NEON
// Perhatikan: Endpoint frontend Anda memanggil /register, jadi rute di sini harus disesuaikan
app.post("/register", async (req, res) => {
  const { fullName, email, whatsapp, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password wajib diisi." });
  }

  let client;
  try {
    client = await pool.connect();

    // --- Coba koneksi ke database ---
    // Ganti 'users' dan kolom sesuai dengan skema database Neon Anda
    const result = await client.query("INSERT INTO users (full_name, email, whatsapp, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, email", [fullName, email, whatsapp, password]);

    res.status(201).json({
      message: "Registrasi berhasil!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Database or Server Error:", error);

    // Error handling spesifik
    if (error.code === "23505") {
      return res.status(409).json({ message: "Email sudah terdaftar." });
    }

    // 🔥 Jika ada error lain (seperti gagal koneksi/SSL), kita kirim 500
    res.status(500).json({ message: "Gagal memproses pendaftaran. Periksa Log Neon/Vercel." });
  } finally {
    if (client) client.release();
  }
});

// 🔥 EXPORT HANDLER UNTUK VERSEL SERVERLESS
// Ini memberi tahu Vercel untuk menjalankan aplikasi Express ini
module.exports = app;
