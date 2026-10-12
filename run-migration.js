const { Client } = require('pg');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Masukkan password database Supabase Anda: ', async (password) => {
  const connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.jicvvqxjyzntdrccnuyz.supabase.co:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Menghubungkan ke Supabase PostgreSQL...");
    await client.connect();
    
    console.log("Membaca file migrasi...");
    const sql = fs.readFileSync('supabase/migrations/20261011_capaian_pembelajaran_and_gradebook_v2.sql', 'utf8');
    
    console.log("Mengeksekusi SQL...");
    await client.query(sql);
    
    console.log("✅ Migrasi BERHASIL dieksekusi!");
  } catch (err) {
    console.error("❌ Migrasi GAGAL:", err.message);
  } finally {
    await client.end();
    rl.close();
  }
});
