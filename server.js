// Pastikan ini ada di baris paling atas
import "dotenv/config";

import express from "express";
import cors from "cors";
// Hapus import yang berhubungan dengan pembacaan file db.json (misalnya 'fs')

// Impor fungsi-fungsi dari helper database yang baru
import { getProducts, getProjects, getTeamMembers, getUsers } from "./lib/db.js";

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// --- CONTOH RUTE LAMA (YANG HARUS DIHAPUS/DIGANTI) ---
/*
app.get('/products', (req, res) => {
  // Logika lama membaca dari db.json
  const data = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
  res.json(data.products);
});
*/
// ---------------------------------------------------

// +++ CONTOH RUTE BARU DENGAN DATABASE VERCEL +++
app.get("/products", async (req, res) => {
  try {
    const products = await getProducts(); // Panggil fungsi dari db.js
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Terapkan pola yang sama untuk rute lainnya
app.get("/projects", async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ...tambahkan rute untuk getTeamMembers dan getUsers

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
