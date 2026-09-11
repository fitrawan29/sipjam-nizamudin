import { findJadwalForGuru } from '../src/lib/workflow';
import { supabase } from '../src/lib/supabaseClient';

const users = [
  { username: 'Fitrawan', nama: 'Ade Fitrawan Ibrahim' },
  { username: 'admin', nama: 'Admin Sma Nizamudin' },
  { username: 'Assyfa', nama: 'Assyfa Fitra Azzahrah Abukasim' },
  { username: 'Dinda', nama: 'Dinda Putri Kurniawati' },
  { username: 'Fitra', nama: 'FITRA SURYAZANA MAMONTO' },
  { username: 'Fitri', nama: 'Fitri Aprilia Dotulong' },
  { username: 'Adnan', nama: 'Mohamad Adnan Mamangkai' },
  { username: 'Riski', nama: 'Riski Candra Mamangkai' },
  { username: 'Rohani', nama: 'Rohani Marham' },
  { username: 'Saskia', nama: 'Saskia Agow' },
  { username: 'Ambar', nama: 'Setia Ambar Ningsih Mamonto' },
  { username: 'Susana', nama: 'Susana Muliono' },
  { username: 'Tika', nama: 'Tika Mamonto, S.Pd.' },
  { username: 'Venda', nama: 'Venda Lestari Kairupan' }
];

async function checkAll() {
  console.log('--- CURRENT findJadwalForGuru RESULTS ---');
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  for (const u of users) {
    for (const d of days) {
      const res = await findJadwalForGuru(d, u.nama, u.username);
      if (res.length > 0) {
        const teachersInSchedule = Array.from(new Set(res.map((j: any) => j.nama_guru)));
        const mapels = res.map((j: any) => j.kelas + ' ' + j.mata_pelajaran).join(', ');
        console.log('User: ' + u.username.padEnd(10) + ' (' + u.nama.padEnd(25) + ') on ' + d.padEnd(7) + ' -> ' + res.length + ' classes [' + teachersInSchedule.join(', ') + ']: ' + mapels);
      }
    }
  }

  console.log('\n--- PROPOSED LOGIC (exact userNorm === jNorm only) ---');
  const { data: allJadwal } = await supabase.from('jadwal_pelajaran').select('*').order('kelas', { ascending: true });
  const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

  function matchGuru(j: any, namaGuru: string, username?: string) {
    const jNama = (j.nama_guru || '').trim();
    if (!jNama) return false;
    const jNorm = normalizeName(jNama);
    const namaNorm = normalizeName(namaGuru);
    const firstName = namaNorm.split(/\s+/)[0] || '';
    const userNorm = username ? normalizeName(username) : '';

    // 1. Prioritaskan username matching jika disediakan (EXACT MATCH ONLY)
    if (userNorm && userNorm === jNorm) return true;

    // 2. Exact match nama lengkap
    if (namaNorm === jNorm) return true;

    // 3. Match first name
    if (firstName && firstName.length >= 2) {
      if (firstName === jNorm || firstName.startsWith(jNorm) || jNorm.startsWith(firstName)) {
        return true;
      }
    }

    return false;
  }

  for (const u of users) {
    for (const d of days) {
      const dayJadwal = (allJadwal || []).filter((j: any) => j.hari === d && matchGuru(j, u.nama, u.username));
      if (dayJadwal.length > 0) {
        const teachersInSchedule = Array.from(new Set(dayJadwal.map((j: any) => j.nama_guru)));
        const mapels = dayJadwal.map((j: any) => j.kelas + ' ' + j.mata_pelajaran).join(', ');
        console.log('User: ' + u.username.padEnd(10) + ' (' + u.nama.padEnd(25) + ') on ' + d.padEnd(7) + ' -> ' + dayJadwal.length + ' classes [' + teachersInSchedule.join(', ') + ']: ' + mapels);
      }
    }
  }
}

checkAll().catch(console.error);
