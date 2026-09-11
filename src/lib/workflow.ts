import { supabase } from './supabaseClient';
import { getWitaDateStr, getWitaStartOfDay, getWitaEndOfDay, getWitaDayName } from './wita';

export type GuruDailyState = {
  tanggal: string;
  isLibur: boolean;
  keteranganLibur?: string;
  
  presensiDatang: any | null;
  presensiPulang: any | null;

  isIzinSakit: boolean;
  isDinasLuar: boolean;

  isPiket: boolean;
  laporanPiket: any | null;

  jadwalKBM: any[];
  jurnalKBM: any[];
  jurnalKegiatan: any | null;

  // Status flags
  canOpenPiket: boolean;
  canOpenJurnal: boolean;
  canPresensiPulang: boolean;
  
  lockedReason: string | null;
};

/**
 * Helper: Mencari nama guru di jadwal_pelajaran yang mungkin menggunakan nama pendek.
 * Contoh: jadwal_pelajaran punya "Ade", tapi user login punya "Ade Fitrawan Ibrahim"
 * Kita cari semua jadwal hari ini, lalu filter yang nama guru-nya COCOK (partial match).
 */
async function findJadwalForGuru(hari: string, namaGuru: string): Promise<any[]> {
  // Pertama, coba exact match
  const { data: exact } = await supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari)
    .eq('nama_guru', namaGuru);
  
  if (exact && exact.length > 0) return exact;

  // Jika exact match gagal, ambil semua jadwal hari ini dan cari partial match
  const { data: allJadwal } = await supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari);
  
  if (!allJadwal || allJadwal.length === 0) return [];

  const namaLower = namaGuru.toLowerCase();
  // Cek apakah nama_guru di jadwal merupakan bagian awal dari namaGuru
  // (misal "Ade" cocok dengan "Ade Fitrawan Ibrahim")
  return allJadwal.filter((j: any) => {
    const jNama = (j.nama_guru || '').toLowerCase().trim();
    return namaLower.startsWith(jNama) || namaLower.includes(jNama) || jNama.includes(namaLower);
  });
}

/**
 * Helper: Cek apakah namaGuru terdaftar di string daftar_guru piket (case-insensitive).
 * daftar_guru format: "Setia Ambar Ningsih Mamonto, Rohani Marham"
 */
function isGuruDiPiket(daftarGuru: string, namaGuru: string): boolean {
  if (!daftarGuru || !namaGuru) return false;
  const namaLower = namaGuru.toLowerCase().trim();
  const daftarArr = daftarGuru.split(',').map(n => n.trim().toLowerCase());
  return daftarArr.some(n => n === namaLower || namaLower.includes(n) || n.includes(namaLower));
}

/**
 * Helper: Cek apakah jurnal tertentu cocok dengan jadwal tertentu.
 * Jadwal punya mata_pelajaran (singkat: "MTK") sedangkan jurnal punya mapel (panjang: "XI Merdeka_Matematika")
 * Kita lakukan fuzzy matching.
 */
function isJurnalMatchJadwal(jurnal: any, jadwal: any): boolean {
  const jMapel = (jurnal.mapel || '').toLowerCase();
  const jKelas = (jurnal.kelas || '').toLowerCase();
  const jdMapel = (jadwal.mata_pelajaran || '').toLowerCase();
  const jdKelas = (jadwal.kelas || '').toLowerCase();
  
  // Kelas harus cocok
  if (jKelas !== jdKelas) return false;
  
  // Mapel: cek partial match (misal "MTK" di dalam "XI Merdeka_MTK", atau "Matematika" includes "MTK")
  if (jMapel === jdMapel) return true;
  if (jMapel.includes(jdMapel)) return true;
  if (jdMapel.includes(jMapel)) return true;
  
  // Coba cek tanpa prefix kelas (misal "XI Merdeka_Matematika" -> "Matematika")
  const jMapelClean = jMapel.includes('_') ? jMapel.split('_').pop() || '' : jMapel;
  if (jMapelClean === jdMapel || jMapelClean.includes(jdMapel) || jdMapel.includes(jMapelClean)) return true;
  
  return false;
}

export async function getGuruDailyState(namaGuru: string): Promise<GuruDailyState> {
  const now = new Date();
  const todayStr = getWitaDateStr(now);
  
  const state: GuruDailyState = {
    tanggal: todayStr,
    isLibur: false,
    presensiDatang: null,
    presensiPulang: null,
    isIzinSakit: false,
    isDinasLuar: false,
    isPiket: false,
    laporanPiket: null,
    jadwalKBM: [],
    jurnalKBM: [],
    jurnalKegiatan: null,
    canOpenPiket: false,
    canOpenJurnal: false,
    canPresensiPulang: false,
    lockedReason: null
  };

  if (!namaGuru) return state;

  try {
    // 1. Cek Hari Libur
    const { data: cal } = await supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
    if (cal && cal.length > 0) {
      const libur = cal.find((c: any) => c.tipe === 'Libur');
      if (libur) {
        state.isLibur = true;
        state.keteranganLibur = libur.keterangan;
        state.lockedReason = `Hari ini Libur: ${libur.keterangan}`;
        return state;
      }
    }

    // 2. Cek Presensi Hari Ini
    const startOfDay = getWitaStartOfDay(todayStr);
    const endOfDay = getWitaEndOfDay(todayStr);

    // Ambil SEMUA presensi guru ini (tanpa filter timestamp range yang bisa gagal karena format campuran)
    // Lalu filter manual berdasarkan tanggal
    const { data: allPresensi } = await supabase
      .from('presensi_guru')
      .select('*')
      .eq('nama_guru', namaGuru)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (allPresensi) {
      // Filter presensi hari ini - handle berbagai format timestamp
      const todayPresensi = allPresensi.filter((p: any) => {
        const ts = p.timestamp || '';
        // Format 1: "YYYY-MM-DD HH:mm:ss" -> ambil YYYY-MM-DD
        if (ts.startsWith(todayStr)) return true;
        // Format 2: "M/D/YYYY H:mm:ss" -> parse manual
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const month = slashMatch[1].padStart(2, '0');
          const day = slashMatch[2].padStart(2, '0');
          const year = slashMatch[3];
          if (`${year}-${month}-${day}` === todayStr) return true;
        }
        // Format 3: ISO "2026-09-10T..." -> ambil date part
        if (ts.includes('T') && ts.substring(0, 10) === todayStr) return true;
        return false;
      });

      state.presensiDatang = todayPresensi.find((p: any) => p.tipe_absen === 'Datang') || null;
      state.presensiPulang = todayPresensi.find((p: any) => p.tipe_absen === 'Pulang') || null;
    }

    if (!state.presensiDatang) {
      state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
      return state;
    }

    const jp = state.presensiDatang.jenis_presensi;
    if (jp === 'Izin' || jp === 'Sakit') {
      state.isIzinSakit = true;
      state.lockedReason = `Anda sedang ${jp}. Tidak perlu mengisi Jurnal/Piket/Pulang.`;
      return state;
    }

    if (jp === 'Dinas Luar') {
      state.isDinasLuar = true;
    }

    // 3. Cek Piket (case-insensitive matching)
    const selectedHari = getWitaDayName(now);

    const { data: jpiket } = await supabase.from('jadwal_piket').select('*').eq('hari', selectedHari);
    if (jpiket && jpiket.length > 0) {
      const piketHariIni = jpiket[0];
      if (isGuruDiPiket(piketHariIni.daftar_guru, namaGuru)) {
        state.isPiket = true;
      }
    }

    if (state.isPiket) {
      // Cek Laporan Piket - juga handle format timestamp campuran
      const { data: lp } = await supabase
        .from('laporan_piket')
        .select('*')
        .eq('guru_pelapor', namaGuru)
        .eq('tanggal', todayStr);
      
      if (lp && lp.length > 0) {
        state.laporanPiket = lp[0];
      }
    }

    // 4. Cek Jadwal KBM (fuzzy name matching)
    if (!state.isDinasLuar) {
      state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru);
    }

    // 5. Cek Jurnal
    const { data: jurnal } = await supabase
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('nama_guru', namaGuru)
      .eq('tanggal', todayStr);

    if (jurnal) {
      // Handle legacy data: keterangan bisa "-" atau "Jurnal KBM" atau "Jurnal Kegiatan"
      // mapel bisa "Jurnal Kegiatan" untuk jurnal kegiatan legacy
      state.jurnalKBM = jurnal.filter((j: any) => {
        // Jurnal KBM jika keterangan === 'Jurnal KBM' ATAU (keterangan bukan 'Jurnal Kegiatan' DAN mapel bukan 'Jurnal Kegiatan')
        if (j.keterangan === 'Jurnal KBM') return true;
        if (j.mapel === 'Jurnal Kegiatan') return false;
        if (j.keterangan === 'Jurnal Kegiatan') return false;
        // Legacy data: keterangan = "-" dan mapel berisi kelas_mapel -> ini adalah KBM
        if ((j.keterangan === '-' || !j.keterangan) && j.mapel && j.mapel !== 'Jurnal Kegiatan') return true;
        return false;
      });
      
      state.jurnalKegiatan = jurnal.find((j: any) => {
        return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan';
      }) || null;
    }

    // 6. Evaluasi State Lanjutan
    if (state.isPiket) {
      state.canOpenPiket = true;
    }

    // Untuk Jurnal
    if (state.isPiket && !state.laporanPiket) {
      state.canOpenJurnal = false;
      state.lockedReason = 'Selesaikan Laporan Piket Anda terlebih dahulu.';
    } else {
      state.canOpenJurnal = true;
    }

    // Untuk Presensi Pulang
    let isJurnalDone = false;
    if (state.isDinasLuar || state.jadwalKBM.length === 0) {
      if (state.jurnalKegiatan) isJurnalDone = true;
    } else {
      // Harus isi KBM sejumlah jadwal - gunakan fuzzy matching
      const fulfilled = state.jadwalKBM.every(jk => 
        state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
      );
      if (fulfilled) isJurnalDone = true;
    }

    let isPiketDone = true;
    if (state.isPiket && !state.laporanPiket) {
      isPiketDone = false;
    }

    if (isJurnalDone && isPiketDone) {
      state.canPresensiPulang = true;
    } else {
      const missing = [];
      if (!isPiketDone) missing.push('Laporan Piket');
      if (!isJurnalDone) missing.push('Jurnal (KBM/Kegiatan)');
      state.lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
    }

  } catch (error) {
    console.error("Workflow check error", error);
  }

  return state;
}
