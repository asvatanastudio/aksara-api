// File ini berisi semua fungsi untuk berkomunikasi dengan database Vercel
import { sql } from "@vercel/postgres";

// --- FUNGSI UNTUK PRODUCTS ---
export async function getProducts() {
  const { rows } = await sql`SELECT * FROM products;`;
  return rows;
}

// --- FUNGSI UNTUK PROJECTS ---
export async function getProjects() {
  const { rows } = await sql`SELECT * FROM projects;`;
  return rows;
}

// --- FUNGSI UNTUK TEAM MEMBERS ---
export async function getTeamMembers() {
  const { rows } = await sql`SELECT * FROM "teamMembers";`;
  return rows;
}

// --- FUNGSI UNTUK USERS ---
export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users;`;
  return rows;
}

// Anda bisa menambahkan fungsi lain di sini, misalnya:
// export async function createProduct(name, price, qty) { ... }
// export async function deleteProductById(id) { ... }
