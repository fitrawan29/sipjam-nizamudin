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
  jamBatasMalam: string;
}

/**
 * Normalizes and compares whether currentTime is within or at the cutoff time (used by Guru Piket).
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
 * Checks student attendance intervention permission specifically for Wali Kelas.
 * Window 1 (Pagi): currentTime <= batasPagi (default 08:00 WITA)
 * Window 2 (Sore/Pulang Guru): jamPulangMulai <= currentTime <= jamBatasMalam (22:00 WITA)
 * Locked during KBM hours (between batasPagi and jamPulangMulai) and after 22:00 WITA.
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
    const pulang = normalize(jamPulangMulai || '11:00');
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

    // 2. Jendela Sore Jam Pulang Guru (jamPulang s.d. 22:00 WITA)
    if (current >= pulang && current <= malam) {
      return {
        allowed: true,
        phase: 'pulang',
        label: `Penyesuaian Sore (s.d. pk. ${malam})`,
        pesan: `Jam presensi pulang guru aktif. Wali Kelas dapat menyesuaikan kembali presensi siswa perwalian hingga pukul ${malam} WITA.`
      };
    }

    // 3. Jendela KBM (antara batas pagi dan jam pulang)
    if (current > pagi && current < pulang) {
      return {
        allowed: false,
        phase: 'kbm',
        label: `Terkunci KBM (Buka pk. ${pulang})`,
        pesan: `KBM sedang berlangsung dan presensi siswa dikelola oleh Guru Mapel. Wali Kelas dapat menyesuaikan kembali saat jam pulang guru (pk. ${pulang} s.d. ${malam} WITA).`
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
      jamBatasMalam: '22:00' // user requirement: batas penyesuaian sore adalah sampai 22:00 WITA
    };
  } catch {
    return {
      batasPagi: '08:00',
      jamPulangMulai: '11:00',
      jamBatasMalam: '22:00'
    };
  }
}
