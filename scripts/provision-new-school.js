/**
 * SIPJAM - Automated School Provisioning CLI
 * Cara Pakai:
 *   node scripts/provision-new-school.js
 * 
 * Script ini menginstansiasi database Supabase baru untuk 1 sekolah dalam 1 langkah:
 * 1. Menghubungkan ke PostgreSQL Supabase via connection string
 * 2. Menjalankan seluruh skema tabel, trigger, dan RPC dari SETUP_NEW_SCHOOL_TEMPLATE.sql
 * 3. Menyesuaikan nama sekolah, NPSN, dan password admin
 * 4. Menampilkan ringkasan konfigurasi ENV untuk di-paste ke Vercel
 */

let Client;
try {
  Client = require('pg').Client;
} catch {
  // pg is intentionally omitted from package.json dependencies to uphold Ponytail minimalism
}
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  if (!Client) {
    console.error('\n❌ Modul "pg" belum terpasang.');
    console.log('Untuk menjalankan skrip ini tanpa menambah dependensi ke package.json (prinsip Ponytail):');
    console.log('   npx --package=pg node scripts/provision-new-school.js\n');
    console.log('Atau gunakan Cara B (Manual via Supabase SQL Editor) pada docs/PANDUAN_DEPLOY_5_SEKOLAH_GRATIS.md.\n');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🏫 SIPJAM: PROVISI INSTANCE SEKOLAH BARU (SUPABASE FREE)');
  console.log('======================================================\n');
  console.log('Pastikan Anda sudah membuat project baru di https://supabase.com');
  console.log('dan menyalin Connection String URI (Database -> Connection string -> URI)\n');

  try {
    const connStr = await ask('1. Masukkan Connection URI Supabase PostgreSQL:\n   (format: postgresql://postgres.xxxx:[PASSWORD]@aws-0-xx.pooler.supabase.com:6543/postgres)\n   > ');
    if (!connStr || !connStr.trim()) {
      console.error('❌ Connection string tidak boleh kosong.');
      process.exit(1);
    }

    const namaSekolah = (await ask('\n2. Nama Sekolah (misal: SMAN 1 Modayag): > ')).trim() || 'SMAN 1 Modayag';
    const npsn = (await ask('3. NPSN Sekolah: > ')).trim() || '10000001';
    const kota = (await ask('4. Kota / Kabupaten (misal: Kab. Bolaang Mongondow Timur): > ')).trim() || 'Kab. Bolaang Mongondow Timur';
    const passAdmin = (await ask('5. Password untuk akun "admin" (default: admin123): > ')).trim() || 'admin123';

    console.log('\n⏳ Menghubungkan ke database Supabase...');
    const client = new Client({
      connectionString: connStr.trim(),
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Berhasil terhubung ke PostgreSQL!');

    console.log('⏳ Membaca template skema SIPJAM (SETUP_NEW_SCHOOL_TEMPLATE.sql)...');
    const sqlPath = path.join(__dirname, '../supabase/SETUP_NEW_SCHOOL_TEMPLATE.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('⏳ Mengeksekusi pembuatan 31 tabel, view, trigger, dan RPC security...');
    await client.query(sql);
    console.log('✅ Skema tabel & fungsi keamanan berhasil diinisialisasi!');

    console.log('⏳ Memperbarui profil sekolah dan akun administrator...');
    // Update default school record
    await client.query(`
      UPDATE public.sekolah
      SET nama = $1, npsn = $2, kota_kabupaten = $3, updated_at = NOW()
      WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid;
    `, [namaSekolah, npsn, kota]);

    // Update admin password
    await client.query(`
      UPDATE public.users
      SET password = extensions.crypt($1, extensions.gen_salt('bf')), updated_at = NOW()
      WHERE username = 'admin';
    `, [passAdmin]);

    console.log('✅ Profil sekolah dan akun admin berhasil dikonfigurasi!');

    console.log('\n======================================================');
    console.log('🎉 PROVISI DATABASE SELESAI!');
    console.log('======================================================');
    console.log(`\nSekolah: ${namaSekolah} (NPSN: ${npsn})`);
    console.log(`Login Admin: username: "admin" | password: "${passAdmin}"`);
    console.log(`Login Superadmin: username: "superadmin" | password: "superadmin123"`);
    console.log('\n📋 LANGKAH SELANJUTNYA UNTUK VERCEL:');
    console.log('1. Buka Vercel Dashboard -> Add New Project');
    console.log('2. Pilih repository GitHub ini');
    console.log(`3. Beri nama project (misal: sipjam-${npsn})`);
    console.log('4. Isi Environment Variables:');
    console.log('   - NEXT_PUBLIC_SUPABASE_URL = (URL project Supabase Anda)');
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (Anon key project Supabase Anda)');
    console.log('   - NEXT_PUBLIC_DRIVE_UPLOAD_WEBHOOK_URL = (URL Apps Script Google Drive sekolah)');
    console.log('5. Klik Deploy!');
    console.log('======================================================\n');

    await client.end();
  } catch (err) {
    console.error('\n❌ Terjadi kesalahan:', err.message);
  } finally {
    rl.close();
  }
}

main();
