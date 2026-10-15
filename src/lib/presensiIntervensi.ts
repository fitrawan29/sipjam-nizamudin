import { SupabaseClient } from '@supabase/supabase-js';
import { getWitaTimeStr, getWitaDayName } from '@/lib/wita';

export type IntervensiPhase = 'pagi' | 'kbm' | 'pulang' | 'malam_tutup';

export interface WaliIntervensiCheck {
  allowed: boolean;
  phase: IntervensiPhase;
  label: string;
  pesan: string;
}

export interface JadwalIntervensiWali {
  batasPagi: string;
  jamPulangMulai: string;
  jamPulangPiketAkhir?: string;
  jamBatasMalam: string;
}

/**
 * Adds minutes to a 'HH:mm' time string and returns formatted 'HH:mm'.
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  try {
    const parts = (timeStr || '00:00').replace('.', ':').split(':');
    const hh = parseInt(parts[0] || '0', 10);
    const mm = parseInt(parts[1] || '0', 10);
    const totalMinutes = hh * 60 + mm + minutesToAdd;
    const newHh = Math.floor(totalMinutes / 60) % 24;
    const newMm = totalMinutes % 60;
    return `${String(newHh).padStart(2, '0')}:${String(newMm).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
}

/**
 * Normalizes and compares whether currentTime is within or at the cutoff time (used by Guru Piket pagi).
 * Returns true if intervention is permitted (currentTime <= cutoffTime).
 */
export function isIntervensiAllowed(
  cutoffTime: string = '08:00',
  currentTimeStr?: string
): boolean {
  try {
    const rawCurrent = (currentTimeStr || getWitaTimeStr() || '00:00').trim();
    const rawCutoff = (cutoffTime || '08:00').trim();

    const normalize = (t: string): string => {
      const parts = t.replace('.', ':').split(':');
      const hh = (parts[0] || '0').padStart(2, '0');
      const mm = (parts[1] || '0').padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const currentNorm = normalize(rawCurrent);
    const cutoffNorm = normalize(rawCutoff);

    return currentNorm <= cutoffNorm;
  } catch {
    return false;
  }
}

/**
 * Checks whether Guru Piket is permitted to record student pulang attendance.
 * Rule: Guru Piket has primary access from jamPulangMulai up to 30 minutes after (jamPulangPiketAkhir).
 */
export function isPiketPulangAllowed(
  jamPulangMulai: string = '11:00',
  currentTimeStr?: string
): { allowed: boolean; pesan: string; batasAkhir: string } {
  try {
    const rawCurrent = (currentTimeStr || getWitaTimeStr() || '00:00').trim();
    const normalize = (t: string): string => {
      const parts = t.replace('.', ':').split(':');
      const hh = (parts[0] || '0').padStart(2, '0');
      const mm = (parts[1] || '0').padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const current = normalize(rawCurrent);
    const pulangStart = normalize(jamPulangMulai || '11:00');
    const pulangEnd = normalize(addMinutesToTime(pulangStart, 30));

    if (current < pulangStart) {
      return {
        allowed: false,
        batasAkhir: pulangEnd,
        pesan: `Presensi pulang siswa baru dapat diinput mulai jam pulang guru (pk. ${pulangStart} WITA).`
      };
    }

    if (current <= pulangEnd) {
      return {
        allowed: true,
        batasAkhir: pulangEnd,
        pesan: `Hak akses utama Guru Piket aktif untuk presensi pulang siswa (s.d. pk. ${pulangEnd} WITA).`
      };
    }

    return {
      allowed: false,
      batasAkhir: pulangEnd,
      pesan: `Akses presensi pulang Guru Piket telah berakhir (hanya aktif hingga 30 menit setelah jam pulang guru pk. ${pulangEnd} WITA). Akses kini dialihkan penuh ke Wali Kelas.`
    };
  } catch {
    return {
      allowed: false,
      batasAkhir: '11:30',
      pesan: 'Status presensi pulang tidak dapat diproses.'
    };
  }
}

/**
 * Checks student attendance intervention permission specifically for Wali Kelas.
 * Window 1 (Pagi): currentTime <= batasPagi (default 08:00 WITA)
 * Window 2 (Sore/Pulang Guru): setelah 30 menit jam pulang guru (jamPulangMulai + 30m) s.d. jamBatasMalam (22:00 WITA)
 * Locked during KBM hours and during Piket's 30-minute primary window, and after 22:00 WITA.
 */
export function isWaliKelasIntervensiAllowed(
  batasPagi: string = '08:00',
  jamPulangMulai: string = '11:00',
  jamBatasMalam: string = '22:00',
  currentTimeStr?: string
): WaliIntervensiCheck {
  try {
    const rawCurrent = (currentTimeStr || getWitaTimeStr() || '00:00').trim();
    const normalize = (t: string): string => {
      const parts = t.replace('.', ':').split(':');
      const hh = (parts[0] || '0').padStart(2, '0');
      const mm = (parts[1] || '0').padStart(2, '0');
      return `${hh}:${mm}`;
    };

    const current = normalize(rawCurrent);
    const pagi = normalize(batasPagi || '08:00');
    const pulangStart = normalize(jamPulangMulai || '11:00');
    const piketAkhir = normalize(addMinutesToTime(pulangStart, 30));
    const malam = normalize(jamBatasMalam || '22:00');

    // 1. Jendela Pagi (s.d. 08:00 WITA)
    if (current <= pagi) {
      return {
        allowed: true,
        phase: 'pagi',
        label: `Buka Pagi (s.d. pk. ${pagi})`,
        pesan: `Presensi siswa dibuka sebelum KBM dimulai (s.d. pk. ${pagi} WITA).`
      };
    }

    // 2. Jendela Sore Jam Pulang Wali Kelas (setelah 30 menit jam pulang guru s.d. 22:00 WITA)
    if (current >= piketAkhir && current <= malam) {
      return {
        allowed: true,
        phase: 'pulang',
        label: `Penyesuaian Presensi Siswa (s.d. pk. ${malam})`,
        pesan: `Wali Kelas mengambil alih penuh akses penyesuaian presensi siswa hingga pukul ${malam} WITA.`
      };
    }

    // 3. Jendela KBM & Masa Piket Pulang (antara batas pagi dan piketAkhir)
    if (current > pagi && current < piketAkhir) {
      const isDuringPiketWindow = current >= pulangStart;
      return {
        allowed: false,
        phase: 'kbm',
        label: isDuringPiketWindow 
          ? `Piket Pulang Aktif (Wali Buka pk. ${piketAkhir})`
          : `Terkunci KBM (Wali Buka pk. ${piketAkhir})`,
        pesan: isDuringPiketWindow
          ? `Presensi pulang siswa sedang dikelola oleh Guru Piket (s.d. pk. ${piketAkhir} WITA). Wali Kelas dapat mengambil alih penuh mulai pk. ${piketAkhir} s.d. ${malam} WITA.`
          : `KBM sedang berlangsung dan presensi dikelola oleh Guru Mapel. Wali Kelas dapat mengambil alih penyesuaian mulai pk. ${piketAkhir} s.d. ${malam} WITA.`
      };
    }

    // 4. Setelah jam 22:00 WITA (Tutup malam)
    return {
      allowed: false,
      phase: 'malam_tutup',
      label: `Terkunci (Lewat pk. ${malam})`,
      pesan: `Batas waktu penyesuaian presensi siswa untuk hari ini telah berakhir (pk. ${malam} WITA).`
    };
  } catch {
    return {
      allowed: false,
      phase: 'malam_tutup',
      label: 'Terkunci',
      pesan: 'Status intervensi tidak dapat diproses.'
    };
  }
}

/**
 * Fetches the school-specific student attendance intervention cutoff time (default: '08:00').
 */
export async function fetchBatasIntervensiSiswa(
  supabaseClient: SupabaseClient | any,
  sekolahId?: string | null
): Promise<string> {
  try {
    let q = supabaseClient
      .from('pengaturan')
      .select('value')
      .eq('key', 'jam_batas_intervensi_siswa');

    if (sekolahId) {
      q = q.eq('sekolah_id', sekolahId);
    }

    const { data } = await q.maybeSingle();
    return data?.value || '08:00';
  } catch {
    return '08:00';
  }
}

/**
 * Fetches the complete schedule configuration for Wali Kelas intervention windows.
 */
export async function fetchJadwalIntervensiWali(
  supabaseClient: SupabaseClient | any,
  sekolahId?: string | null
): Promise<JadwalIntervensiWali> {
  try {
    let q = supabaseClient
      .from('pengaturan')
      .select('key, value')
      .in('key', ['jam_batas_intervensi_siswa', 'jam_pulang_mulai', 'jam_pulang_jumat', 'jam_pulang_akhir']);

    if (sekolahId) {
      q = q.eq('sekolah_id', sekolahId);
    }

    const { data } = await q;
    const configMap: Record<string, string> = {};
    if (data) {
      data.forEach((item: any) => {
        if (item.key && item.value) configMap[item.key] = item.value;
      });
    }

    const isJumat = getWitaDayName() === 'Jumat';
    const effectivePulang = isJumat
      ? (configMap.jam_pulang_jumat || configMap.jam_pulang_mulai || '11:00')
      : (configMap.jam_pulang_mulai || '11:00');

    return {
      batasPagi: configMap.jam_batas_intervensi_siswa || '08:00',
      jamPulangMulai: effectivePulang,
      jamPulangPiketAkhir: addMinutesToTime(effectivePulang, 30),
      jamBatasMalam: '22:00' // user requirement: batas penyesuaian sore adalah sampai 22:00 WITA
    };
  } catch {
    return {
      batasPagi: '08:00',
      jamPulangMulai: '11:00',
      jamPulangPiketAkhir: '11:30',
      jamBatasMalam: '22:00'
    };
  }
}
