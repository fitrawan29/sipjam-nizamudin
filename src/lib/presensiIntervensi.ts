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
 * Rule: Guru Piket has access from jamPulangMulai up to 60 minutes after (jamPulangPiketAkhir).
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
    const pulangEnd = normalize(addMinutesToTime(pulangStart, 60));

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
        pesan: `Hak akses Guru Piket aktif untuk presensi pulang siswa (s.d. pk. ${pulangEnd} WITA, alokasi 1 jam).`
      };
    }

    return {
      allowed: false,
      batasAkhir: pulangEnd,
      pesan: `Akses presensi pulang Guru Piket telah berakhir (hanya aktif hingga 1 jam setelah jam pulang guru pk. ${pulangEnd} WITA).`
    };
  } catch {
    return {
      allowed: false,
      batasAkhir: '12:00',
      pesan: 'Status presensi pulang tidak dapat diproses.'
    };
  }
}

/**
 * Checks student attendance intervention permission specifically for Wali Kelas.
 * Window 1 (Pagi): currentTime <= batasPagi (default 12:00 WITA)
 * Window 2 (Pulang): jamPulangMulai s.d. 60 menit setelah jam pulang (selaras Guru Piket)
 * Evening access (22:00 WITA) is eliminated; locked after 60-minute window ends.
 */
export function isWaliKelasIntervensiAllowed(
  batasPagi: string = '12:00',
  jamPulangMulai: string = '11:00',
  jamBatasMalam?: string,
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
    const pagi = normalize(batasPagi || '12:00');
    const pulangStart = normalize(jamPulangMulai || '11:00');
    const pulangEnd = normalize(addMinutesToTime(pulangStart, 60));

    // 1. Jendela Pulang (jamPulangMulai s.d. jamPulangMulai + 60m)
    // Selaras dengan Guru Piket: aktif tepat 1 jam (60 menit)
    if (current >= pulangStart && current <= pulangEnd) {
      return {
        allowed: true,
        phase: 'pulang',
        label: `Presensi Pulang Siswa (s.d. pk. ${pulangEnd})`,
        pesan: `Alokasi presensi pulang aktif selaras Guru Piket & Wali Kelas hingga pukul ${pulangEnd} WITA (60 menit pasca jam pulang).`
      };
    }

    // 2. Jika sudah melewati batas 1 jam kepulangan (current > pulangEnd)
    // Akses malam 22:00 dihapus sehingga intervensi terkunci penuh
    if (current > pulangEnd) {
      return {
        allowed: false,
        phase: 'malam_tutup',
        label: `Terkunci (Lewat pk. ${pulangEnd})`,
        pesan: `Batas waktu penyesuaian presensi siswa untuk hari ini telah berakhir (hanya aktif hingga 1 jam setelah jam pulang pk. ${pulangEnd} WITA).`
      };
    }

    // 3. Jendela Pagi (s.d. 12:00 WITA dan sebelum jam pulang mulai)
    if (current <= pagi && current < pulangStart) {
      return {
        allowed: true,
        phase: 'pagi',
        label: `Buka Pagi (s.d. pk. ${pagi})`,
        pesan: `Presensi siswa dibuka sebelum & selama KBM pagi (s.d. pk. ${pagi} WITA).`
      };
    }

    // 4. Jendela KBM (antara batas pagi 12:00 dan jam pulang mulai, jika jam pulang > 12:00)
    return {
      allowed: false,
      phase: 'kbm',
      label: `Terkunci KBM (Buka pk. ${pulangStart})`,
      pesan: `KBM sedang berlangsung dan presensi dikelola oleh Guru Mapel. Wali Kelas dapat menginput presensi pulang mulai pk. ${pulangStart} s.d. ${pulangEnd} WITA.`
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

    const pulangAkhir60m = addMinutesToTime(effectivePulang, 60);

    return {
      batasPagi: '12:00', // Wali Kelas batas pagi diperpanjang hingga pk. 12:00 WITA
      jamPulangMulai: effectivePulang,
      jamPulangPiketAkhir: pulangAkhir60m,
      jamBatasMalam: pulangAkhir60m // Ditutup 1 jam pasca jam pulang (akses malam 22:00 dinonaktifkan)
    };
  } catch {
    return {
      batasPagi: '12:00',
      jamPulangMulai: '11:00',
      jamPulangPiketAkhir: '12:00',
      jamBatasMalam: '12:00'
    };
  }
}

/**
 * Extracts the maximum numeric teaching hour (jam_ke) from string or number.
 * e.g. "Jam 5" -> 5, "3-4" -> 4, 3 -> 3.
 */
export function extractMaxJamKe(jamKeValue: any): number {
  if (typeof jamKeValue === 'number') return jamKeValue;
  if (!jamKeValue) return 0;
  const str = String(jamKeValue);
  const matches = str.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  const numbers = matches.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

function hasAttendanceData(journal: any): boolean {
  if (!journal) return false;
  if (journal.absensi_siswa) {
    if (typeof journal.absensi_siswa === 'object' && Object.keys(journal.absensi_siswa).length > 0) return true;
    if (typeof journal.absensi_siswa === 'string' && journal.absensi_siswa.trim() !== '' && journal.absensi_siswa.trim() !== '{}') return true;
  }
  if (journal.kehadiran_murid && String(journal.kehadiran_murid).trim() !== '') return true;
  if (journal.detail_absen && String(journal.detail_absen).trim() !== '') return true;
  return false;
}

/**
 * Finds the KBM teaching journal with the latest teaching hour (jam_ke) for that day,
 * prioritizing journals with recorded student attendance data.
 */
export function findLastKbmJournal(journals: any[]): any {
  if (!journals || journals.length === 0) return null;
  const withAttendance = journals.filter(hasAttendanceData);
  const candidates = withAttendance.length > 0 ? withAttendance : journals;
  const sorted = candidates.slice().sort((a, b) => {
    const jamA = extractMaxJamKe(a.jam_ke);
    const jamB = extractMaxJamKe(b.jam_ke);
    if (jamB !== jamA) return jamB - jamA;
    const timeA = String(a.timestamp || a.created_at || '');
    const timeB = String(b.timestamp || b.created_at || '');
    return timeB.localeCompare(timeA);
  });
  return sorted[0] || null;
}

export interface DailyAttendanceResolved {
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '';
  isFallback: boolean;
  source: string;
  keterangan?: string;
}

/**
 * Resolves daily attendance for a student:
 * - If Wali Kelas already recorded attendance, that record is canonical.
 * - Canonical excused statuses (Sakit / Izin) from Wali Kelas are preserved and never overridden as Bolos.
 * - If Wali Kelas has not recorded attendance, dynamically falls back to the last KBM session's attendance.
 * - Aturan Bolos: Hadir di awal (datang pagi / gerbang / kelas pagi) namun Alfa di sesi KBM jam terakhir -> Otomatis Bolos (B).
 */
export function resolveDailyStudentAttendance(
  student: { id?: string; nisn?: string; nama_siswa: string },
  classAbsensiRecord: { status?: string; keterangan?: string | null } | null | undefined,
  hasMorningPresence: boolean,
  lastKbmJournal?: any | null
): DailyAttendanceResolved {
  const normStatus = (st: string | null | undefined): 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' => {
    if (!st) return '';
    const s = st.trim().toLowerCase();
    if (s === 'hadir' || s === 'h') return 'Hadir';
    if (s === 'sakit' || s === 's') return 'Sakit';
    if (s === 'izin' || s === 'i') return 'Izin';
    if (s === 'alpa' || s === 'alfa' || s === 'a') return 'Alpa';
    if (s === 'bolos' || s === 'b') return 'Bolos';
    return '';
  };

  const mapCode = (rawCode: string): 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' => {
    const code = rawCode.trim().toUpperCase();
    if (code === 'A' || code === 'ALFA' || code === 'ALPA') return 'Alpa';
    if (code === 'B' || code === 'BOLOS') return 'Bolos';
    if (code === 'S' || code === 'SAKIT') return 'Sakit';
    if (code === 'I' || code === 'IZIN') return 'Izin';
    if (code === 'H' || code === 'HADIR') return 'Hadir';
    return '';
  };

  // 1. Extract status from last KBM journal if available
  let lastKbmStatus: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Bolos' | '' = '';
  if (lastKbmJournal) {
    let absensiJson: Record<string, any> | null = null;
    if (lastKbmJournal.absensi_siswa) {
      if (typeof lastKbmJournal.absensi_siswa === 'object') {
        absensiJson = lastKbmJournal.absensi_siswa;
      } else if (typeof lastKbmJournal.absensi_siswa === 'string' && lastKbmJournal.absensi_siswa.trim().startsWith('{')) {
        try {
          absensiJson = JSON.parse(lastKbmJournal.absensi_siswa);
        } catch (_) {}
      }
    }

    const combinedText = `${lastKbmJournal.kehadiran_murid || ''} ${typeof lastKbmJournal.absensi_siswa === 'string' ? lastKbmJournal.absensi_siswa : ''} ${lastKbmJournal.detail_absen || ''}`.toLowerCase();
    const isSemuaHadir = /semua\s*hadir|hadir\s*semua|semua\s*siswa\s*hadir/i.test(combinedText);

    if (absensiJson && Object.keys(absensiJson).length > 0) {
      let val = (student.nisn && absensiJson[student.nisn] !== undefined)
        ? absensiJson[student.nisn]
        : (student.nama_siswa && absensiJson[student.nama_siswa] !== undefined)
          ? absensiJson[student.nama_siswa]
          : (student.id && absensiJson[student.id] !== undefined)
            ? absensiJson[student.id]
            : undefined;

      // Whitespace-insensitive lookup for NISN
      if (val === undefined && student.nisn) {
        const cleanNisn = student.nisn.trim();
        const foundNisnKey = Object.keys(absensiJson).find(k => k.trim() === cleanNisn);
        if (foundNisnKey) val = absensiJson[foundNisnKey];
      }

      // Case-insensitive lookup for nama_siswa if not directly found
      if (val === undefined && student.nama_siswa) {
        const lowerName = student.nama_siswa.trim().toLowerCase();
        const foundKey = Object.keys(absensiJson).find(k => k.trim().toLowerCase() === lowerName);
        if (foundKey) val = absensiJson[foundKey];
      }

      if (val !== undefined) {
        lastKbmStatus = mapCode(String(val));
      }
    }

    // If not found in absensiJson, check detail_absen / kehadiran_murid
    if (!lastKbmStatus && (lastKbmJournal.detail_absen || lastKbmJournal.kehadiran_murid)) {
      const detail = `${lastKbmJournal.detail_absen || ''} ${lastKbmJournal.kehadiran_murid || ''}`;
      const identifiers = [
        student.nama_siswa?.trim(),
        student.nisn?.trim()
      ].filter(Boolean) as string[];

      for (const idStr of identifiers) {
        if (lastKbmStatus) break;
        const escaped = idStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Pattern 1: Postfix status (e.g. "Nama (Alfa)", "Nama (A)", "Nama - Alfa", "Nama - A", "Nama: Alfa", "Nama: A", "Nama = Sakit")
        const postfixRegex = new RegExp(`(?:^|\\b)${escaped}\\b\\s*(?:[-:=—–]|\\(|\\b)\\s*([a-zA-Z]+)\\)?`, 'i');
        const match = detail.match(postfixRegex);
        if (match && match[1]) {
          const parsed = mapCode(match[1]);
          if (parsed) {
            lastKbmStatus = parsed;
            break;
          }
        }

        // Pattern 2: Prefix status within lines/clauses (e.g. "Alpa: Nama", "Alfa: Nama", "Sakit: Nama", "Izin: Nama", "Bolos: Nama")
        const linesOrClauses = detail.split(/[\r\n;]+/).map(s => s.trim()).filter(Boolean);
        const lowerId = idStr.toLowerCase();
        for (const segment of linesOrClauses) {
          const segLower = segment.toLowerCase();
          if (segLower.includes(lowerId)) {
            const idxId = segLower.indexOf(lowerId);
            const idxSakit = segLower.lastIndexOf('sakit', idxId);
            const idxIzin = segLower.lastIndexOf('izin', idxId);
            const idxAlpa = Math.max(segLower.lastIndexOf('alpa', idxId), segLower.lastIndexOf('alfa', idxId));
            const idxBolos = segLower.lastIndexOf('bolos', idxId);
            const idxHadir = segLower.lastIndexOf('hadir', idxId);

            const maxIdx = Math.max(idxSakit, idxIzin, idxAlpa, idxBolos, idxHadir);
            if (maxIdx !== -1) {
              if (maxIdx === idxBolos) lastKbmStatus = 'Bolos';
              else if (maxIdx === idxAlpa) lastKbmStatus = 'Alpa';
              else if (maxIdx === idxSakit) lastKbmStatus = 'Sakit';
              else if (maxIdx === idxIzin) lastKbmStatus = 'Izin';
              else if (maxIdx === idxHadir) lastKbmStatus = 'Hadir';
              break;
            }
          }
        }

        // Pattern 3: Fallback full text prefix search if not matched in segmented clauses
        if (!lastKbmStatus) {
          const detailLower = detail.toLowerCase();
          if (detailLower.includes(lowerId)) {
            const idxId = detailLower.indexOf(lowerId);
            const idxSakit = detailLower.lastIndexOf('sakit', idxId);
            const idxIzin = detailLower.lastIndexOf('izin', idxId);
            const idxAlpa = Math.max(detailLower.lastIndexOf('alpa', idxId), detailLower.lastIndexOf('alfa', idxId));
            const idxBolos = detailLower.lastIndexOf('bolos', idxId);
            const idxHadir = detailLower.lastIndexOf('hadir', idxId);

            const maxIdx = Math.max(idxSakit, idxIzin, idxAlpa, idxBolos, idxHadir);
            if (maxIdx !== -1) {
              if (maxIdx === idxBolos) lastKbmStatus = 'Bolos';
              else if (maxIdx === idxAlpa) lastKbmStatus = 'Alpa';
              else if (maxIdx === idxSakit) lastKbmStatus = 'Sakit';
              else if (maxIdx === idxIzin) lastKbmStatus = 'Izin';
              else if (maxIdx === idxHadir) lastKbmStatus = 'Hadir';
            }
          }
        }
      }
    }

    // Default to Hadir if "semua hadir" or if absensiJson was an absentee-only list
    if (!lastKbmStatus) {
      if (isSemuaHadir) {
        lastKbmStatus = 'Hadir';
      } else if (absensiJson && Object.keys(absensiJson).length > 0) {
        const jsonValues = Object.values(absensiJson).map(v => String(v).trim().toUpperCase());
        const hasExplicitHadir = jsonValues.some(v => v === 'H' || v === 'HADIR');
        if (!hasExplicitHadir) {
          lastKbmStatus = 'Hadir';
        }
      }
    }
  }

  // 2. Canonical status from Wali Kelas
  const recordedStatus = normStatus(classAbsensiRecord?.status);

  // 3. Excused statuses (Sakit / Izin) recorded by Wali Kelas must NEVER be overwritten as Bolos
  if (recordedStatus === 'Sakit' || recordedStatus === 'Izin') {
    return {
      status: recordedStatus,
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 4. Pre-existing canonical Bolos is preserved
  if (recordedStatus === 'Bolos') {
    return {
      status: 'Bolos',
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 5. Aturan Bolos: Hadir di awal (datang pagi gerbang / kelas pagi) namun Alfa pada sesi KBM jam terakhir
  const isMorningHadir = recordedStatus === 'Hadir' || (!recordedStatus && hasMorningPresence);

  if (isMorningHadir && (lastKbmStatus === 'Alpa' || lastKbmStatus === 'Bolos')) {
    return {
      status: 'Bolos',
      isFallback: !recordedStatus,
      source: recordedStatus ? 'Wali Kelas & KBM Terakhir (Preservasi Bolos)' : 'Fallback KBM Terakhir (Otomatis Bolos)',
      keterangan: classAbsensiRecord?.keterangan || (lastKbmJournal ? `Terdeteksi Bolos: Hadir pagi, Alfa pada KBM Jam ${lastKbmJournal.jam_ke || '-'}` : 'Terdeteksi Bolos')
    };
  }

  // 6. If class absensi record exists from Wali Kelas (e.g. Hadir or Alpa), preserve it
  if (recordedStatus) {
    return {
      status: recordedStatus,
      isFallback: false,
      source: 'Wali Kelas',
      keterangan: classAbsensiRecord?.keterangan || undefined
    };
  }

  // 7. Fallback dinamis ke Jurnal KBM Jam Terakhir jika Wali Kelas belum mengisi / tidak ada
  if (lastKbmStatus) {
    return {
      status: lastKbmStatus,
      isFallback: true,
      source: `Fallback Jurnal KBM (Jam ${lastKbmJournal?.jam_ke || '-'})`,
      keterangan: `Otomatis diwarisi dari Jurnal KBM Jam ${lastKbmJournal?.jam_ke || '-'}`
    };
  }

  // 8. Fallback gerbang pagi jika hanya ada presensi gerbang
  if (hasMorningPresence) {
    return {
      status: 'Hadir',
      isFallback: true,
      source: 'Presensi Gerbang',
      keterangan: 'Tercatat Hadir Datang di Pos Gerbang'
    };
  }

  return {
    status: '',
    isFallback: false,
    source: 'Belum Ada Data'
  };
}
