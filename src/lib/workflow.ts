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

  // Attendance requirement & exemption fields
  aturanKehadiran?: 'Semua_Hari' | 'Hari_Mengajar_Saja';
  isNonTeachingDay?: boolean;
  bebasAlpa?: boolean;
  isAlpa?: boolean;

  // Rejection tracking — when admin rejects a submission, these fields are set
  // so the teacher knows they must re-submit (rejected records are excluded from "done" logic)
  presensiDatangDitolak: any | null;
  presensiPulangDitolak: any | null;
  laporanPiketDitolak: any | null;
  jurnalDitolak: any[];
};

/**
 * Helper: Mencari nama guru di jadwal_pelajaran yang mungkin menggunakan nama pendek.
 * Contoh: jadwal_pelajaran punya "Ade", tapi user login punya "Ade Fitrawan Ibrahim"
 * Kita cari semua jadwal hari ini, lalu filter yang nama guru-nya COCOK (partial match).
 */
export async function findJadwalForGuru(hari: string, namaGuru: string, username?: string, userId?: string): Promise<any[]> {
  // Ambil semua jadwal hari ini
  const { data: allJadwal } = await supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari)
    .order('kelas', { ascending: true });
  
  if (!allJadwal || allJadwal.length === 0) return [];

  if (userId) {
    const exactMatches = allJadwal.filter((j: any) => j.user_id === userId);
    // If we find matches by UUID, trust them implicitly and skip fuzzy string matching
    if (exactMatches.length > 0) return exactMatches;
  }

  const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

  const namaNorm = normalizeName(namaGuru);
  const firstName = namaNorm.split(/\s+/)[0] || '';
  const userNorm = username ? normalizeName(username) : '';

  return allJadwal.filter((j: any) => {
    const jNama = (j.nama_guru || '').trim();
    if (!jNama) return false;
    const jNorm = normalizeName(jNama);

    // 1. Prioritaskan username matching jika disediakan (hanya exact match untuk mencegah collision seperti Fitrawan vs Fitra)
    if (userNorm && userNorm === jNorm) return true;

    // 2. Exact match nama lengkap
    if (namaNorm === jNorm) return true;

    // 3. Match first name (e.g. "Ade" matches "Ade Fitrawan Ibrahim", "Riski" matches "Riski Candra Mamangkai")
    // Do NOT match middle/last name tokens if the first name is different (e.g. "assyfa" must NOT match "fitra")
    if (firstName && firstName.length >= 2) {
      if (firstName === jNorm || firstName.startsWith(jNorm) || jNorm.startsWith(firstName)) {
        return true;
      }
    }

    return false;
  });
}

/**
 * Helper: Cek apakah namaGuru terdaftar di string daftar_guru piket (case-insensitive).
 * daftar_guru format: "Setia Ambar Ningsih Mamonto, Rohani Marham"
 */
export function isGuruDiPiket(daftarGuru: string, namaGuru: string): boolean {
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
export function isJurnalMatchJadwal(jurnal: any, jadwal: any): boolean {
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

export async function getGuruDailyState(namaGuru: string, username?: string, userId?: string): Promise<GuruDailyState> {
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
    lockedReason: null,
    aturanKehadiran: 'Semua_Hari',
    isNonTeachingDay: false,
    bebasAlpa: false,
    isAlpa: false,
    // Rejection tracking
    presensiDatangDitolak: null,
    presensiPulangDitolak: null,
    laporanPiketDitolak: null,
    jurnalDitolak: [],
  };

  if (!namaGuru) return state;

  try {
    // 1. Cek Hari Libur dari kalender_pendidikan
    const { data: cal } = await supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
    if (cal && cal.length > 0) {
      const libur = cal.find((c: any) => c.tipe === 'Libur');
      if (libur) {
        state.isLibur = true;
        state.bebasAlpa = true;
        state.isAlpa = false;
        state.keteranganLibur = libur.keterangan;
        state.lockedReason = `Hari ini Libur: ${libur.keterangan}`;
        return state;
      }
    }

    // 2. Cek Libur Akhir Pekan & Aturan Kehadiran dari tabel pengaturan
    const { data: pengaturanRows } = await supabase
      .from('pengaturan')
      .select('key, value, aturan_kehadiran_guru');

    let hariSekolah = 6;
    let aturanKehadiran = 'Semua_Hari';
    let guruHanyaMengajarList: string[] = [];

    if (pengaturanRows && pengaturanRows.length > 0) {
      const hsRow = pengaturanRows.find((p: any) => p.key === 'hari_sekolah');
      if (hsRow && hsRow.value) {
        hariSekolah = parseInt(hsRow.value, 10) || 6;
      }
      const akRow = pengaturanRows.find((p: any) => p.key === 'aturan_kehadiran_guru' || p.aturan_kehadiran_guru);
      if (akRow) {
        aturanKehadiran =
          (akRow.key === 'aturan_kehadiran_guru' ? akRow.value : akRow.aturan_kehadiran_guru) || 'Semua_Hari';
      }
      const ghmRow = pengaturanRows.find((p: any) => p.key === 'guru_hanya_mengajar');
      if (ghmRow && ghmRow.value) {
        try {
          const parsed = JSON.parse(ghmRow.value);
          if (Array.isArray(parsed)) {
            guruHanyaMengajarList = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.ids)) guruHanyaMengajarList.push(...parsed.ids);
            if (Array.isArray(parsed.names)) guruHanyaMengajarList.push(...parsed.names);
          }
        } catch (e) {
          guruHanyaMengajarList = [ghmRow.value];
        }
      }
    }

    // Cek Pengecualian Kehadiran Guru:
    // Guru yang dikecualikan (wajib hadir HANYA saat hari mengajar)
    let isTeacherExempt = false;
    try {
      let tQ = supabase.from('data_guru').select('id, nama, username, wajib_hadir_hanya_mengajar');
      if (username) {
        tQ = tQ.or(`nama.eq."${namaGuru}",username.eq."${username}"`);
      } else {
        tQ = tQ.eq('nama', namaGuru);
      }
      const { data: tData } = await tQ;
      if (tData && tData.length > 0) {
        const teacher = tData[0];
        if (teacher.wajib_hadir_hanya_mengajar === true) {
          isTeacherExempt = true;
        }
        if (
          guruHanyaMengajarList.includes(teacher.id) || 
          guruHanyaMengajarList.includes(teacher.nama) || 
          (teacher.username && guruHanyaMengajarList.includes(teacher.username))
        ) {
          isTeacherExempt = true;
        }
      }
    } catch (tErr) {
      console.warn('Error checking teacher exemption in data_guru:', tErr);
    }

    if (guruHanyaMengajarList.includes(namaGuru) || (username && guruHanyaMengajarList.includes(username))) {
      isTeacherExempt = true;
    }

    // Global policy override
    if (aturanKehadiran === 'Hari_Mengajar_Saja') {
      isTeacherExempt = true;
    }

    state.aturanKehadiran = isTeacherExempt ? 'Hari_Mengajar_Saja' : 'Semua_Hari';

    const hariIni = getWitaDayName(now); // "Senin", "Selasa", ..., "Sabtu", "Minggu"

    if (hariIni === 'Minggu') {
      state.isLibur = true;
      state.bebasAlpa = true;
      state.isAlpa = false;
      state.keteranganLibur = 'Hari Minggu - Hari Libur Mingguan';
      state.lockedReason = 'Hari Minggu adalah hari libur. Presensi, Jurnal, dan Piket tidak dibuka.';
      return state;
    }

    if (hariSekolah === 5 && hariIni === 'Sabtu') {
      state.isLibur = true;
      state.bebasAlpa = true;
      state.isAlpa = false;
      state.keteranganLibur = 'Hari Sabtu - Libur (Sekolah 5 Hari Kerja)';
      state.lockedReason = 'Hari Sabtu adalah hari libur karena sekolah menerapkan 5 hari kerja. Presensi, Jurnal, dan Piket tidak dibuka.';
      return state;
    }

    const selectedHari = hariIni; // Reuse hariIni already computed above

    // Selalu muat jadwal KBM hari ini untuk guru (tidak ditekan oleh isDinasLuar ataupun presensi datang)
    state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru, username, userId);

    // 3. Cek Piket Hari Ini (case-insensitive matching)
    const { data: jpiket } = await supabase.from('jadwal_piket').select('*').eq('hari', selectedHari);
    if (jpiket && jpiket.length > 0) {
      const piketHariIni = jpiket[0];
      if (isGuruDiPiket(piketHariIni.daftar_guru, namaGuru)) {
        state.isPiket = true;
      }
    }

    // 4. Cek Presensi Hari Ini
    const startOfDay = getWitaStartOfDay(todayStr);
    const endOfDay = getWitaEndOfDay(todayStr);

    // Ambil SEMUA presensi guru ini (tanpa filter timestamp range yang bisa gagal karena format campuran)
    // Lalu filter manual berdasarkan tanggal
    let presensiQuery = supabase
      .from('presensi_guru')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (userId) presensiQuery = presensiQuery.eq('user_id', userId);
    else presensiQuery = presensiQuery.eq('nama_guru', namaGuru);

    const { data: allPresensi } = await presensiQuery;

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

      // Separate accepted/pending and rejected records
      // Rejected records are NOT counted as "done" — teacher must re-submit
      const acceptedPresensi = todayPresensi.filter((p: any) => p.status_verifikasi !== 'Ditolak');
      const rejectedPresensi = todayPresensi.filter((p: any) => p.status_verifikasi === 'Ditolak');

      state.presensiDatang = acceptedPresensi.find((p: any) => p.tipe_absen === 'Datang') || null;
      state.presensiPulang = acceptedPresensi.find((p: any) => p.tipe_absen === 'Pulang') || null;

      // Store rejected records for UI notification (most recent rejection first)
      state.presensiDatangDitolak = rejectedPresensi.find((p: any) => p.tipe_absen === 'Datang') || null;
      state.presensiPulangDitolak = rejectedPresensi.find((p: any) => p.tipe_absen === 'Pulang') || null;
    }

    const hasTeachingObligation = state.jadwalKBM.length > 0 || state.isPiket;

    // Evaluasi kewajiban kehadiran & penentuan Alpa
    if (!state.presensiDatang) {
      // Jika guru dikecualikan: hanya wajib hadir di hari mengajar / piket
      if (isTeacherExempt) {
        if (!hasTeachingObligation) {
          state.isNonTeachingDay = true;
          state.bebasAlpa = true;
          state.isAlpa = false;
          state.lockedReason = 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran).';
          return state;
        } else {
          // Ada jadwal mengajar tapi belum melakukan presensi datang
          state.isAlpa = true;
          state.bebasAlpa = false;
          state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
          return state;
        }
      }

      // Default: Guru tanpa pengecualian wajib hadir setiap hari kerja
      state.isAlpa = true;
      state.bebasAlpa = false;
      state.lockedReason = 'Anda belum melakukan Presensi Datang hari ini.';
      return state;
    }

    // Guru sudah melakukan presensi datang
    state.isAlpa = false;
    if (isTeacherExempt && !hasTeachingObligation) {
      state.isNonTeachingDay = true;
      state.bebasAlpa = true;
    }

    const jp = state.presensiDatang.jenis_presensi;
    if (jp === 'Izin' || jp === 'Sakit') {
      state.isIzinSakit = true;
      state.bebasAlpa = true;
      state.lockedReason = `Anda sedang ${jp}. Tidak perlu mengisi Jurnal/Piket/Pulang.`;
      return state;
    }

    if (jp === 'Dinas Luar') {
      state.isDinasLuar = true;
    }

    if (state.isPiket) {
      // Cek Laporan Piket - juga handle format timestamp campuran
      let piketQuery = supabase
        .from('laporan_piket')
        .select('*')
        .eq('tanggal', todayStr);
      
      if (userId) piketQuery = piketQuery.eq('user_id', userId);
      else piketQuery = piketQuery.eq('guru_pelapor', namaGuru);

      const { data: lp } = await piketQuery;
      
      if (lp && lp.length > 0) {
        // Rejected laporan piket: teacher must re-submit
        const acceptedLaporan = lp.filter((l: any) => l.status_verifikasi !== 'Ditolak');
        const rejectedLaporan = lp.filter((l: any) => l.status_verifikasi === 'Ditolak');

        state.laporanPiket = acceptedLaporan.length > 0 ? acceptedLaporan[0] : null;
        state.laporanPiketDitolak = rejectedLaporan.length > 0 ? rejectedLaporan[0] : null;
      }
    }

    // 4. Jadwal KBM sudah dipopulasikan di awal untuk hari berjalan, tidak di-clear ketika isDinasLuar

    // 5. Cek Jurnal
    let jurnalQuery = supabase
      .from('jurnal_pembelajaran')
      .select('*')
      .eq('tanggal', todayStr);
    
    if (userId) jurnalQuery = jurnalQuery.eq('user_id', userId);
    else jurnalQuery = jurnalQuery.eq('nama_guru', namaGuru);

    const { data: jurnal } = await jurnalQuery;

    if (jurnal) {
      // Separate rejected jurnal entries — they must be re-submitted
      const rejectedJurnal = jurnal.filter((j: any) => j.status_verifikasi === 'Ditolak');
      const acceptedJurnal = jurnal.filter((j: any) => j.status_verifikasi !== 'Ditolak');

      state.jurnalDitolak = rejectedJurnal;

      // Handle legacy data: keterangan bisa "-" atau "Jurnal KBM" atau "Jurnal Kegiatan"
      // mapel bisa "Jurnal Kegiatan" untuk jurnal kegiatan legacy
      state.jurnalKBM = acceptedJurnal.filter((j: any) => {
        // Jurnal KBM jika keterangan === 'Jurnal KBM' ATAU (keterangan bukan 'Jurnal Kegiatan' DAN mapel bukan 'Jurnal Kegiatan')
        if (j.keterangan === 'Jurnal KBM') return true;
        if (j.mapel === 'Jurnal Kegiatan') return false;
        if (j.keterangan === 'Jurnal Kegiatan') return false;
        // Legacy data: keterangan = "-" dan mapel berisi kelas_mapel -> ini adalah KBM
        if ((j.keterangan === '-' || !j.keterangan) && j.mapel && j.mapel !== 'Jurnal Kegiatan') return true;
        return false;
      });
      
      state.jurnalKegiatan = acceptedJurnal.find((j: any) => {
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


