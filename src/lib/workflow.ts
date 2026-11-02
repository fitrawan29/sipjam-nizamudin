import { supabase } from './supabaseClient';
import { getWitaDateStr, getWitaDayName } from './wita';
import { isInvalidMapel } from './dataIntegrityGuard';
import type { SistemBlok } from '@/types/database';

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

  // Sistem Blok (waktu diblokir untuk kegiatan khusus)
  isBlok: boolean;
  blokInfo: {
    id: string;
    nama_kegiatan: string;
    deskripsi: string | null;
    tanggal_mulai: string;
    tanggal_selesai: string;
  } | null;
  hasBlockedSchedule?: boolean;
  activeBloks?: SistemBlok[];

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

  // Multi-State Arrival & Departure
  arrivalState?: string | null;
  departureState?: string | null;

  // Auto-checkout tracking
  isAutoCheckout?: boolean;
  isPulangCepat?: boolean;
  lastAutoCheckout?: any | null;

  // Multi-day leave coverage
  activeLeaveRecord?: any | null;
};

/**
 * Helper: Ambil semua data sistem blok yang aktif pada tanggal tertentu (WITA format YYYY-MM-DD).
 */
export async function getActiveSistemBloks(dateStr?: string, sekolahId?: string): Promise<SistemBlok[]> {
  try {
    const rawDate = dateStr || getWitaDateStr();
    const targetDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.trim();
    let query = supabase
      .from('sistem_blok')
      .select('*')
      .lte('tanggal_mulai', targetDate)
      .gte('tanggal_selesai', targetDate);

    if (sekolahId) {
      query = query.eq('sekolah_id', sekolahId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];
    return data as SistemBlok[];
  } catch (err) {
    console.warn('Error fetching active sistem_bloks:', err);
    return [];
  }
}

/**
 * Helper: Ambil data sistem blok yang aktif pada tanggal tertentu (WITA format YYYY-MM-DD).
 * Backward-compatible wrapper mengembalikan aturan pertama yang aktif.
 */
export async function getActiveSistemBlok(dateStr?: string, sekolahId?: string): Promise<any | null> {
  const bloks = await getActiveSistemBloks(dateStr, sekolahId);
  return bloks.length > 0 ? bloks[0] : null;
}

/**
 * Helper: Cek apakah kelas berada di dalam angkatan tertentu (misal: 10 <-> X, 11 <-> XI, 12 <-> XII).
 * Mendukung pencocokan token kelas dengan word boundaries atau pemisah umum (spasi, titik, strip).
 */
export function isKelasInAngkatan(kelas: string | null | undefined, angkatan: string): boolean {
  if (!kelas || !angkatan) return false;
  const k = kelas.trim().toLowerCase();
  const a = angkatan.trim().toLowerCase();
  if (k === a) return true;

  const gradeEquivalents: Record<string, string[]> = {
    '10': ['10', 'x'],
    'x': ['10', 'x'],
    '11': ['11', 'xi'],
    'xi': ['11', 'xi'],
    '12': ['12', 'xii'],
    'xii': ['12', 'xii'],
    '7': ['7', 'vii'],
    'vii': ['7', 'vii'],
    '8': ['8', 'viii'],
    'viii': ['8', 'viii'],
    '9': ['9', 'ix'],
    'ix': ['9', 'ix'],
    '1': ['1', 'i'],
    'i': ['1', 'i'],
    '2': ['2', 'ii'],
    'ii': ['2', 'ii'],
    '3': ['3', 'iii'],
    'iii': ['3', 'iii'],
    '4': ['4', 'iv'],
    'iv': ['4', 'iv'],
    '5': ['5', 'v'],
    'v': ['5', 'v'],
    '6': ['6', 'vi'],
    'vi': ['6', 'vi'],
  };

  const tokens = gradeEquivalents[a] || [a];

  return tokens.some(token => {
    if (/^\d+$/.test(token)) {
      const numRegex = new RegExp(`(^|[^0-9])${token}([^0-9]|$)`, 'i');
      return numRegex.test(k);
    }
    const romanRegex = new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|(?![ivx])[a-z]|$)`, 'i');
    return romanRegex.test(k);
  });
}

/**
 * Helper: Parse string waktu format "HH:mm" atau "HH.mm" menjadi menit dari 00:00.
 */
export function parseTimeToMinutes(t?: string | null, fallbackMinutes = 0): number {
  if (!t) return fallbackMinutes;
  const clean = t.replace('.', ':').trim();
  const parts = clean.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return fallbackMinutes;
}

/**
 * Helper: Evaluasi apakah rentang waktu jadwal beririsan dengan rentang waktu sistem blok.
 * Jika sistem blok berlaku penuh sepanjang hari (is_full_day atau tanpa jam), selalu beririsan (true).
 */
export function isTimeRangeOverlap(
  schedStart?: string | null,
  schedEnd?: string | null,
  blokStart?: string | null,
  blokEnd?: string | null,
  isFullDay?: boolean
): boolean {
  if (isFullDay === true) return true;
  if (!blokStart && !blokEnd) return true;

  const bStartMin = parseTimeToMinutes(blokStart, 0);
  const bEndMin = parseTimeToMinutes(blokEnd, 24 * 60);

  if (!schedStart && !schedEnd) return true;

  const sStartMin = parseTimeToMinutes(schedStart, bStartMin);
  const sEndMin = parseTimeToMinutes(schedEnd, sStartMin + 90);

  return sStartMin < bEndMin && sEndMin > bStartMin;
}

export interface ScheduleBlockEvaluation {
  isBlocked: boolean;
  blockRule?: SistemBlok;
  reason?: string;
}

/**
 * Helper: Evaluasi apakah satu item jadwal pelajaran diblokir oleh salah satu sistem blok aktif.
 */
export function evaluateScheduleBlock(
  schedule: {
    kelas?: string;
    nama_guru?: string;
    user_id?: string;
    guru_id?: string;
    jam_mulai?: string;
    jam_selesai?: string;
    [key: string]: any;
  },
  teacher: {
    id?: string;
    user_id?: string;
    nama?: string;
    nama_guru?: string;
    [key: string]: any;
  },
  activeBloks: SistemBlok[]
): ScheduleBlockEvaluation {
  if (!activeBloks || activeBloks.length === 0) {
    return { isBlocked: false };
  }

  for (const rule of activeBloks) {
    let targetMatches = false;
    const targetType = (rule.tipe_target || 'sekolah').toLowerCase().trim();

    if (targetType === 'sekolah' || targetType === 'keseluruhan') {
      targetMatches = true;
    } else if (targetType === 'angkatan') {
      const targetAngkatan = rule.target_angkatan || (rule as any).target_id || '';
      targetMatches = isKelasInAngkatan(schedule.kelas, targetAngkatan);
    } else if (targetType === 'kelas') {
      const targetKelas = (rule.target_kelas || (rule as any).target_id || '').trim().toLowerCase();
      const schedKelas = (schedule.kelas || '').trim().toLowerCase();
      targetMatches = Boolean(targetKelas && schedKelas === targetKelas);
    } else if (targetType === 'guru') {
      const targetGuruId = (rule.target_guru_id || (rule as any).target_id || '').trim().toLowerCase();
      const targetGuruNama = (rule.target_guru_nama || '').trim().toLowerCase();

      const teacherId = String(teacher.id || '').trim().toLowerCase();
      const teacherUserId = String(teacher.user_id || '').trim().toLowerCase();
      const schedUserId = String(schedule.user_id || '').trim().toLowerCase();
      const schedGuruId = String(schedule.guru_id || '').trim().toLowerCase();

      const teacherNama = String(teacher.nama || teacher.nama_guru || '').trim().toLowerCase();
      const schedNamaGuru = String(schedule.nama_guru || '').trim().toLowerCase();

      const idMatches = Boolean(
        targetGuruId &&
        (targetGuruId === teacherId ||
          targetGuruId === teacherUserId ||
          targetGuruId === schedUserId ||
          targetGuruId === schedGuruId)
      );

      const namaMatches = Boolean(
        targetGuruNama &&
        (teacherNama.includes(targetGuruNama) ||
          targetGuruNama.includes(teacherNama) ||
          schedNamaGuru.includes(targetGuruNama) ||
          targetGuruNama.includes(schedNamaGuru))
      );

      const fallbackMatches = Boolean(
        targetGuruId &&
        (teacherNama.includes(targetGuruId) ||
          schedNamaGuru.includes(targetGuruId))
      );

      targetMatches = idMatches || namaMatches || fallbackMatches;
    }

    if (!targetMatches) continue;

    const timeOverlaps = isTimeRangeOverlap(
      schedule.jam_mulai,
      schedule.jam_selesai,
      rule.jam_mulai,
      rule.jam_selesai,
      rule.is_full_day
    );

    if (timeOverlaps) {
      return {
        isBlocked: true,
        blockRule: rule,
        reason: `Diblokir oleh sistem blok: ${rule.nama_kegiatan}`
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Helper: Mencari nama guru di jadwal_pelajaran yang mungkin menggunakan nama pendek.
 * Contoh: jadwal_pelajaran punya "Ade", tapi user login punya "Ade Fitrawan Ibrahim"
 * Kita cari semua jadwal hari ini, lalu filter yang nama guru-nya COCOK (partial match).
 */
export async function findJadwalForGuru(hari: string, namaGuru: string, username?: string, userId?: string, sekolahId?: string): Promise<any[]> {
  // Ambil semua jadwal hari ini
  let query = supabase
    .from('jadwal_pelajaran')
    .select('*')
    .eq('hari', hari)
    .order('kelas', { ascending: true });
  if (sekolahId) query = query.eq('sekolah_id', sekolahId);
  const { data: allJadwalRaw } = await query;
  
  if (!allJadwalRaw || allJadwalRaw.length === 0) return [];

  // Filter out any invalid / non-existent subjects (such as "teknik informasi" or "teknologi informasi")
  const allJadwal = allJadwalRaw.filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
  if (allJadwal.length === 0) return [];

  const uuidMatches = userId ? allJadwal.filter((j: any) => j.user_id === userId) : [];

  const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

  const namaNorm = normalizeName(namaGuru);
  const firstName = namaNorm.split(/\s+/)[0] || '';
  const userNorm = username ? normalizeName(username) : '';

  const nameMatches = allJadwal.filter((j: any) => {
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

  // Combine and deduplicate by ID so unlinked schedules are preserved without duplicates
  const map = new Map<string, any>();
  [...uuidMatches, ...nameMatches].forEach((item: any) => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });

  return Array.from(map.values());
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
  if (!jurnal || !jadwal) return false;
  const jMapel = (jurnal.mapel || jurnal.mata_pelajaran || '').toLowerCase().trim();
  const jKelas = (jurnal.kelas || '').toLowerCase().trim();
  const jdMapel = (jadwal.mata_pelajaran || jadwal.mapel || '').toLowerCase().trim();
  const jdKelas = (jadwal.kelas || '').toLowerCase().trim();

  // Meniadakan perbandingan jika memuat mata pelajaran yang tidak ada / keliru (seperti teknik informasi)
  if (isInvalidMapel(jMapel) || isInvalidMapel(jdMapel)) return false;
  
  // Kelas harus cocok dan tidak boleh kosong
  if (!jKelas || !jdKelas) return false;

  const normKelas = (k: string) => k.replace(/^kelas\s+/i, '').replace(/[\s\-_.]/g, '');
  if (jKelas !== jdKelas && normKelas(jKelas) !== normKelas(jdKelas)) return false;

  // Mapel tidak boleh kosong agar tidak terjadi false-positive match terhadap string kosong
  if (!jMapel || !jdMapel) return false;
  
  // Mapel: cek kesamaan langsung
  if (jMapel === jdMapel) return true;

  // Coba cek tanpa prefix kelas (misal "XI Merdeka_Matematika" -> "Matematika")
  const jMapelClean = jMapel.includes('_') ? (jMapel.split('_').pop() || '').trim() : jMapel;
  const jdMapelClean = jdMapel.includes('_') ? (jdMapel.split('_').pop() || '').trim() : jdMapel;
  if (jMapelClean === jdMapelClean) return true;

  // Cek substring dengan panjang minimal 3 karakter agar tidak collision dengan singkatan pendek
  if (jMapelClean.length >= 3 && jdMapelClean.length >= 3) {
    if (jMapelClean.includes(jdMapelClean) || jdMapelClean.includes(jMapelClean)) return true;
  }
  
  return false;
}

export async function getGuruDailyState(namaGuru: string, username?: string, userId?: string, sekolahId?: string): Promise<GuruDailyState> {
  const now = new Date();
  const todayStr = getWitaDateStr(now);
  const cleanTeacherName = (namaGuru || '').split(',')[0].trim();
  
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
    isBlok: false,
    blokInfo: null,
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
    // 0. Cek Sistem Blok aktif hari ini
    let activeBloks: SistemBlok[] = [];
    try {
      activeBloks = await getActiveSistemBloks(todayStr, sekolahId);
      state.activeBloks = activeBloks;

      const wholeSchoolFullDay = activeBloks.find(b => 
        (b.tipe_target === 'sekolah' || (b.tipe_target as any) === 'keseluruhan' || !b.tipe_target) &&
        (b.is_full_day !== false || (!b.jam_mulai && !b.jam_selesai))
      );

      if (wholeSchoolFullDay) {
        state.isBlok = true;
        state.blokInfo = {
          id: wholeSchoolFullDay.id,
          nama_kegiatan: wholeSchoolFullDay.nama_kegiatan,
          deskripsi: wholeSchoolFullDay.deskripsi,
          tanggal_mulai: wholeSchoolFullDay.tanggal_mulai,
          tanggal_selesai: wholeSchoolFullDay.tanggal_selesai,
        };
      } else if (activeBloks.length > 0) {
        const firstBlok = activeBloks[0];
        state.blokInfo = {
          id: firstBlok.id,
          nama_kegiatan: firstBlok.nama_kegiatan,
          deskripsi: firstBlok.deskripsi,
          tanggal_mulai: firstBlok.tanggal_mulai,
          tanggal_selesai: firstBlok.tanggal_selesai,
        };
      }
    } catch (bErr) {
      console.warn('Error checking sistem_blok in workflow:', bErr);
    }

    // 1. Cek Hari Libur dari kalender_pendidikan
    let calQuery = supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
    if (sekolahId) {
      calQuery = calQuery.or(`sekolah_id.eq.${sekolahId},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000`);
    }
    const { data: cal } = await calQuery;
    if (cal && cal.length > 0) {
      const relevantCal = cal.filter((c: any) =>
        !c.sekolah_id || !sekolahId || c.sekolah_id === sekolahId || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
      );
      const isExplicitMasuk = relevantCal.some((c: any) => c.tipe === 'Masuk' || c.tipe === 'Efektif');
      if (!isExplicitMasuk) {
        const libur = relevantCal.find((c: any) => c.tipe === 'Libur');
        if (libur) {
          state.isLibur = true;
          state.bebasAlpa = true;
          state.isAlpa = false;
          state.keteranganLibur = libur.keterangan || 'Hari Libur';
          state.lockedReason = `Hari ini Libur: ${libur.keterangan || 'Hari Libur'}`;
          return state;
        }
      }
    }

    // 2. Cek Libur Akhir Pekan & Aturan Kehadiran dari tabel pengaturan
    let pengaturanQuery = supabase
      .from('pengaturan')
      .select('key, value, aturan_kehadiran_guru, sekolah_id');
    if (sekolahId) {
      pengaturanQuery = pengaturanQuery.eq('sekolah_id', sekolahId);
    }
    const { data: pengaturanRows } = await pengaturanQuery;

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
        } catch {
          guruHanyaMengajarList = [ghmRow.value];
        }
      }
    }

    // Cek Pengecualian Kehadiran Guru:
    // Guru yang dikecualikan (wajib hadir HANYA saat hari mengajar)
    let isTeacherExempt = false;
    let teacherDataGuruId: string | null = null;
    let teacherDataGuruNip: string | null = null;
    let explicitTeacherSetting: boolean | null = null;
    try {
      let tQ = supabase.from('data_guru').select('id, nama_guru, nip, wajib_hadir_hanya_mengajar, sekolah_id');
      if (sekolahId) {
        tQ = tQ.eq('sekolah_id', sekolahId);
      }
      if (userId) {
        tQ = tQ.or(`user_id.eq.${userId},nama_guru.eq."${cleanTeacherName}"`);
      } else if (username) {
        tQ = tQ.or(`nama_guru.eq."${cleanTeacherName}",nip.eq."${username}"`);
      } else {
        tQ = tQ.eq('nama_guru', cleanTeacherName);
      }
      const { data: tData } = await tQ;
      if (tData && tData.length > 0) {
        for (const teacher of tData) {
          if (!teacherDataGuruId && teacher.id) teacherDataGuruId = String(teacher.id);
          if (!teacherDataGuruNip && teacher.nip) teacherDataGuruNip = String(teacher.nip);
          if (teacher.wajib_hadir_hanya_mengajar !== null && teacher.wajib_hadir_hanya_mengajar !== undefined) {
            explicitTeacherSetting = teacher.wajib_hadir_hanya_mengajar === true || String(teacher.wajib_hadir_hanya_mengajar) === 'true';
          }
          if (teacher.wajib_hadir_hanya_mengajar === true || String(teacher.wajib_hadir_hanya_mengajar) === 'true') {
            isTeacherExempt = true;
          }
          if (
            guruHanyaMengajarList.includes(teacher.id) || 
            guruHanyaMengajarList.includes(teacher.nama_guru) || 
            (teacher.nip && guruHanyaMengajarList.includes(teacher.nip))
          ) {
            isTeacherExempt = true;
          }
        }
      }
    } catch (tErr) {
      console.warn('Error checking teacher exemption in data_guru:', tErr);
    }

    if (guruHanyaMengajarList.includes(namaGuru) || (username && guruHanyaMengajarList.includes(username))) {
      isTeacherExempt = true;
    }

    // Bidirectional consistency:
    // If teacher has explicit setting in data_guru:
    // - true: exempt (only teaching / piket)
    // - false: NOT exempt (must attend every day, global Hari_Mengajar_Saja does not override)
    // If explicit setting is null/undefined (backward compatibility):
    // Fall back to legacy guruHanyaMengajarList or global policy
    if (explicitTeacherSetting === false) {
      isTeacherExempt = false;
    } else if (explicitTeacherSetting === true) {
      isTeacherExempt = true;
    } else {
      if (aturanKehadiran === 'Hari_Mengajar_Saja') {
        isTeacherExempt = true;
      }
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
    state.jadwalKBM = await findJadwalForGuru(selectedHari, namaGuru, username, userId, sekolahId);

    // Evaluasi setiap item jadwal pelajaran terhadap sistem blok aktif
    const teacherRef = {
      id: teacherDataGuruId || userId,
      user_id: userId,
      nama: namaGuru,
      nama_guru: namaGuru,
    };

    state.jadwalKBM = (state.jadwalKBM || []).map((jk: any) => {
      const evalResult = evaluateScheduleBlock(jk, teacherRef, activeBloks);
      return {
        ...jk,
        isBlocked: evalResult.isBlocked,
        blockRule: evalResult.blockRule || null,
        blockedReason: evalResult.reason || null,
      };
    });

    const hasBlocked = state.jadwalKBM.some((jk: any) => jk.isBlocked);
    const allBlocked = state.jadwalKBM.length > 0 && state.jadwalKBM.every((jk: any) => jk.isBlocked);
    state.hasBlockedSchedule = hasBlocked;

    if (allBlocked) {
      state.isBlok = true;
      const matchedRule = state.jadwalKBM.find((jk: any) => jk.blockRule)?.blockRule;
      if (matchedRule) {
        state.blokInfo = {
          id: matchedRule.id,
          nama_kegiatan: matchedRule.nama_kegiatan,
          deskripsi: matchedRule.deskripsi,
          tanggal_mulai: matchedRule.tanggal_mulai,
          tanggal_selesai: matchedRule.tanggal_selesai,
        };
      }
    } else if (state.jadwalKBM.length === 0 && activeBloks.length > 0) {
      const teacherMatches = activeBloks.some(b => {
        if (b.tipe_target === 'sekolah' || (b.tipe_target as any) === 'keseluruhan' || !b.tipe_target) return true;
        if (b.tipe_target === 'guru') {
          return evaluateScheduleBlock({}, teacherRef, [b]).isBlocked;
        }
        return false;
      });
      if (teacherMatches) {
        state.isBlok = true;
      }
    }

    // 3. Cek Piket Hari Ini (case-insensitive matching)
    // Guru pengecualian (wajib hadir hanya di hari mengajar) dibebaskan dari piket saat sistem blok aktif jika tidak ada jadwal hari ini
    const isExemptAndNoSchedule = isTeacherExempt && state.jadwalKBM.length === 0;
    if (!(state.isBlok && isExemptAndNoSchedule)) {
      // Check penugasan_piket directly
      let penugasanQuery = supabase
        .from('penugasan_piket')
        .select('*')
        .eq('hari', selectedHari)
        .eq('tipe_petugas', 'Guru');
      if (sekolahId) penugasanQuery = penugasanQuery.eq('sekolah_id', sekolahId);
      const { data: penugasanList } = await penugasanQuery;

      const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
      const isTeacherPiketMatch = (recordName?: string | null, recordNip?: string | null, recordGuruId?: string | null): boolean => {
        if (recordGuruId && (
          (userId && String(recordGuruId) === String(userId)) ||
          (teacherDataGuruId && String(recordGuruId) === String(teacherDataGuruId))
        )) return true;
        if (recordNip && (
          (username && String(recordNip).trim() === String(username).trim()) ||
          (teacherDataGuruNip && String(recordNip).trim() === String(teacherDataGuruNip).trim())
        )) return true;
        if (!recordName || !namaGuru) return false;
        const c1 = cleanStr(recordName);
        const c2 = cleanStr(namaGuru);
        const cClean = cleanStr(cleanTeacherName);
        if (!c1 || !c2) return false;
        if (c1 === c2 || (cClean && c1 === cClean)) return true;
        if ((c2.length >= 3 && c1.includes(c2)) || (c1.length >= 3 && c2.includes(c1))) return true;
        if (cClean && cClean.length >= 3 && (c1.includes(cClean) || cClean.includes(c1))) return true;
        const t1 = c1.split(/\s+/).filter(w => w.length > 2);
        const t2 = c2.split(/\s+/).filter(w => w.length > 2);
        if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) return true;
        return false;
      };

      if (penugasanList && penugasanList.length > 0) {
        const matched = penugasanList.some((p: any) => isTeacherPiketMatch(p.guru_nama, p.guru_nip, p.guru_id));
        if (matched) {
          state.isPiket = true;
        }
      }

      // Fallback: jadwal_piket
      if (!state.isPiket) {
        let jpQuery = supabase.from('jadwal_piket').select('*').eq('hari', selectedHari);
        if (sekolahId) jpQuery = jpQuery.eq('sekolah_id', sekolahId);
        const { data: jpiket } = await jpQuery;
        if (jpiket && jpiket.length > 0) {
          const piketHariIni = jpiket[0];
          if (isGuruDiPiket(piketHariIni.daftar_guru, namaGuru) || isGuruDiPiket(piketHariIni.daftar_guru, cleanTeacherName)) {
            state.isPiket = true;
          }
        }
      }
    }

    // 4. Cek Presensi Hari Ini
    // Ambil SEMUA presensi guru ini (tanpa filter timestamp range yang bisa gagal karena format campuran)
    // Lalu filter manual berdasarkan tanggal
    let presensiQuery = supabase
      .from('presensi_guru')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (sekolahId) {
      presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
    }

    if (userId) {
      presensiQuery = presensiQuery.or(`user_id.eq.${userId},nama_guru.ilike."%${cleanTeacherName}%"`);
    } else {
      presensiQuery = presensiQuery.ilike('nama_guru', `%${cleanTeacherName}%`);
    }

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

      // Multi-day approved leave coverage:
      // If teacher has an active sick/leave record where today is within [tanggal_mulai, tanggal_selesai]
      const multiDayLeave = allPresensi.find((p: any) => {
        if (p.status_verifikasi === 'Ditolak') return false;
        const isLeaveType = p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit' || p.detail_izin === 'Sakit' || (p.detail_izin && p.detail_izin.includes('Izin'));
        if (!isLeaveType) return false;
        if (p.tanggal_mulai && p.tanggal_selesai) {
          return todayStr >= p.tanggal_mulai && todayStr <= p.tanggal_selesai;
        }
        // Fallback: parse date range from detail_izin text e.g. "(3 Hari: 2026-10-13 s/d 2026-10-15)"
        const match = p.detail_izin?.match(/(\d{4}-\d{2}-\d{2})\s*s\/d\s*(\d{4}-\d{2}-\d{2})/);
        if (match) {
          return todayStr >= match[1] && todayStr <= match[2];
        }
        return false;
      });

      if (multiDayLeave) {
        state.activeLeaveRecord = multiDayLeave;
        if (!state.presensiDatang) {
          state.presensiDatang = multiDayLeave;
        }
      }

      // Check auto-checkout record for forgotten checkout tracking (including Pulang Cepat)
      const lastAutoCheckout = allPresensi.find((p: any) =>
        p.tipe_absen === 'Pulang' && (p.is_auto_checkout || p.status_verifikasi === 'Lupa Checkout' || p.status_verifikasi === 'Pulang Cepat' || p.jenis_presensi === 'Pulang Cepat')
      );
      if (lastAutoCheckout) {
        state.lastAutoCheckout = lastAutoCheckout;
      }
      if (state.presensiPulang?.is_auto_checkout || state.presensiPulang?.status_verifikasi === 'Lupa Checkout' || state.presensiPulang?.status_verifikasi === 'Pulang Cepat' || state.presensiPulang?.jenis_presensi === 'Pulang Cepat') {
        state.isAutoCheckout = true;
      }
      if (state.presensiPulang?.status_verifikasi === 'Pulang Cepat' || state.presensiPulang?.jenis_presensi === 'Pulang Cepat') {
        state.isPulangCepat = true;
      }

      state.arrivalState = state.presensiDatang?.jenis_presensi || null;
      state.departureState = state.presensiPulang?.jenis_presensi || null;
    }

    const hasTeachingObligation = (state.isBlok && !isTeacherExempt) || state.jadwalKBM.length > 0 || state.isPiket;

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

    const jp = state.presensiDatang?.jenis_presensi;
    if (state.activeLeaveRecord || jp === 'Izin' || jp === 'Sakit') {
      state.isIzinSakit = true;
      state.bebasAlpa = true;
      state.isAlpa = false;
      const rec = state.activeLeaveRecord || state.presensiDatang || {};
      state.lockedReason = `Anda sedang ${rec.detail_izin || rec.jenis_presensi || 'Izin/Sakit'}${rec.durasi_hari ? ` (${rec.durasi_hari} hari)` : ''}. Tidak perlu mengisi Jurnal/Piket/Pulang.`;
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
      
      if (sekolahId) {
        piketQuery = piketQuery.eq('sekolah_id', sekolahId);
      }
      
      if (userId) {
        piketQuery = piketQuery.or(`user_id.eq.${userId},guru_pelapor.ilike."%${cleanTeacherName}%"`);
      } else {
        piketQuery = piketQuery.ilike('guru_pelapor', `%${cleanTeacherName}%`);
      }

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
    
    if (sekolahId) {
      jurnalQuery = jurnalQuery.eq('sekolah_id', sekolahId);
    }
    
    if (userId) {
      jurnalQuery = jurnalQuery.or(`user_id.eq.${userId},nama_guru.ilike."%${cleanTeacherName}%"`);
    } else {
      jurnalQuery = jurnalQuery.ilike('nama_guru', `%${cleanTeacherName}%`);
    }

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
    if (state.isNonTeachingDay) {
      isJurnalDone = true;
    } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
      if (state.jurnalKegiatan) isJurnalDone = true;
      if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
      if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
    } else {
      // Evaluasi jadwal reguler dan jadwal yang terblokir
      const unblockedSchedules = state.jadwalKBM.filter((jk: any) => !jk.isBlocked);
      const blockedSchedules = state.jadwalKBM.filter((jk: any) => jk.isBlocked);

      const unblockedFulfilled = unblockedSchedules.every(jk => 
        state.jurnalKBM.some(j => isJurnalMatchJadwal(j, jk))
      );
      const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

      if ((unblockedFulfilled && blockedFulfilled) || state.jurnalKegiatan) isJurnalDone = true;
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
      if (!isJurnalDone) missing.push(state.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)');
      state.lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
    }

    // R2: Fleksibilitas Presensi Tanpa Kewajiban Mengisi Jurnal
    // Guru yang telah tercatat presensi datang dapat langsung melakukan presensi pulang
    // tanpa kewajiban mengisi jurnal KBM, jurnal kegiatan, maupun laporan piket terlebih dahulu.
    if (canTeacherPresensiPulang(state)) {
      state.canPresensiPulang = true;
      if (state.lockedReason && state.lockedReason.startsWith('Anda belum menyelesaikan')) {
        state.lockedReason = null;
      }
    }

  } catch (error) {
    console.error("Workflow check error", error);
  }

  return state;
}

/**
 * R2: Cek apakah guru diizinkan melakukan presensi pulang.
 * Guru yang telah tercatat presensi datang dapat langsung melakukan presensi pulang
 * tanpa kewajiban mengisi jurnal KBM, jurnal kegiatan, maupun laporan piket terlebih dahulu.
 */
export function canTeacherPresensiPulang(state: Partial<GuruDailyState>): boolean {
  if (!state.presensiDatang) return false;
  if (state.isIzinSakit) return false;
  return true;
}


