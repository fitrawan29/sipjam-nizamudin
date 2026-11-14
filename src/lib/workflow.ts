import { supabase, isSchemaCacheOrMissingTableError } from './supabaseClient';
import { getWitaDateStr, getWitaDayName, extractWitaDateStr, getWitaTimeStr } from './wita';
import { isInvalidMapel } from './dataIntegrityGuard';
import type { SistemBlok } from '@/types/database';

/**
 * Deteksi terpusat apakah role atau mata pelajaran merujuk ke layanan Guru BK.
 */
export function isBkAccount(roleOrMapel?: string | null, extra?: string | null): boolean {
  const check = (val?: string | null) => {
    const norm = (val || '').toLowerCase().replace(/[\s_-]+/g, '');
    return (
      norm === 'bk' ||
      norm === 'gurubk' ||
      norm.includes('bimbingankonseling') ||
      norm.includes('bimbingandankonseling')
    );
  };
  return check(roleOrMapel) || check(extra);
}

/**
 * Deteksi terpusat apakah role atau mata pelajaran merujuk ke staf Tata Usaha (TU).
 */
export function isTuAccount(teacherOrRole?: any, extraRole?: string | null): boolean {
  const mp = (
    typeof teacherOrRole === 'string'
      ? teacherOrRole
      : (teacherOrRole?.mata_pelajaran || teacherOrRole?.mataPelajaran || '')
  ).toLowerCase();
  const roleStr = (
    typeof teacherOrRole === 'string'
      ? teacherOrRole
      : (teacherOrRole?.role || '')
  ).toLowerCase().replace(/[\s_-]+/g, '');
  const extraStr = (extraRole || '').toLowerCase().replace(/[\s_-]+/g, '');
  return (
    mp.includes('tata usaha') ||
    mp.includes('tu (administrasi)') ||
    mp.trim() === 'tu' ||
    roleStr === 'tatausaha' ||
    extraStr === 'tatausaha'
  );
}

/**
 * Parsing nilai boolean eksplisit dari kolom DB / cache (true/false/1/0/'true'/'false').
 */
export function parseExplicitBooleanFlag(val: any): boolean | null {
  if (val === true || val === 1) return true;
  if (val === false || val === 0) return false;
  if (typeof val === 'string') {
    const norm = val.trim().toLowerCase();
    if (norm === 'true' || norm === '1' || norm === 'ya') return true;
    if (norm === 'false' || norm === '0' || norm === 'tidak') return false;
  }
  return null;
}

/**
 * Resolusi aturan kehadiran global sekolah dari baris-baris tabel pengaturan.
 * Memprioritaskan key kanonik 'aturan_kehadiran_guru' sebelum fallback kolom legacy.
 */
export function resolveSchoolAturanKehadiran(
  pengaturanRows: any[] = []
): 'Semua_Hari' | 'Hari_Mengajar_Saja' {
  if (!Array.isArray(pengaturanRows) || pengaturanRows.length === 0) return 'Semua_Hari';
  const keyRow = pengaturanRows.find((p: any) => p?.key === 'aturan_kehadiran_guru' && p?.value);
  const raw = keyRow
    ? keyRow.value
    : pengaturanRows.find((p: any) => p?.aturan_kehadiran_guru)?.aturan_kehadiran_guru;
  return String(raw || '').trim() === 'Hari_Mengajar_Saja' ? 'Hari_Mengajar_Saja' : 'Semua_Hari';
}

/**
 * Resolusi daftar ID/nama guru_hanya_mengajar dari baris-baris tabel pengaturan.
 * Memprioritaskan key kanonik 'guru_hanya_mengajar' / 'guru_bebas_hadir' agar kolom legacy usang tidak mencemari.
 */
export function resolveSchoolLegacyGhmList(pengaturanRows: any[] = []): string[] {
  if (!Array.isArray(pengaturanRows) || pengaturanRows.length === 0) return [];
  const parseList = (rawVal: any): string[] => {
    if (!rawVal) return [];
    if (Array.isArray(rawVal)) return rawVal.map(String).filter(Boolean);
    try {
      const parsed = JSON.parse(String(rawVal));
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      if (parsed && typeof parsed === 'object') {
        const out: string[] = [];
        if (Array.isArray(parsed.ids)) out.push(...parsed.ids.map(String));
        if (Array.isArray(parsed.names)) out.push(...parsed.names.map(String));
        return out.filter(Boolean);
      }
      if (typeof parsed === 'string' && parsed.trim()) return [parsed.trim()];
      return [];
    } catch {
      const s = String(rawVal).trim();
      return s && s !== '[]' ? [s] : [];
    }
  };

  const keyRow = pengaturanRows.find(
    (p: any) => p?.key === 'guru_hanya_mengajar' || p?.key === 'guru_bebas_hadir'
  );
  if (keyRow) {
    return parseList(keyRow.value);
  }
  const colRow = pengaturanRows.find((p: any) => p?.guru_hanya_mengajar);
  return colRow ? parseList(colRow.guru_hanya_mengajar) : [];
}

export interface TeacherAttendancePolicyResult {
  isTu: boolean;
  hasAnyWeeklyKbm: boolean;
  isNonKbmOrTu: boolean;
  explicitSetting: boolean | null;
  isInLegacyList: boolean;
  isTeacherExempt: boolean;
  aturanKehadiran: 'Semua_Hari' | 'Hari_Mengajar_Saja';
}

/**
 * Evaluasi tunggal (single source of truth) kebijakan kehadiran per personel (murni perorangan):
 * 1. Pengaturan eksplisit per personel (`wajib_hadir_hanya_mengajar`: true/false) selalu diutamakan.
 * 2. Jika belum disetel eksplisit (null/undefined): staf TU dan guru tanpa jam KBM tetap
 *    wajib hadir setiap hari; guru berjadwal mengikuti daftar perorangan `guru_hanya_mengajar`,
 *    dan bila tidak ada di daftar tersebut default-nya wajib hadir setiap hari (tanpa default sekolah).
 */
export function resolveTeacherAttendancePolicy(params: {
  teacher?: any;
  linkedUser?: any;
  weeklySchedules?: any[];
  totalTeacherKbmCount?: number;
  aturanGlobal?: string | null;
  guruHanyaMengajarList?: string[];
  preferLegacyListWhenGlobalKbm?: boolean;
}): TeacherAttendancePolicyResult {
  const { teacher, linkedUser, weeklySchedules, totalTeacherKbmCount, guruHanyaMengajarList = [], preferLegacyListWhenGlobalKbm = false } = params;
  const isTu = isTuAccount(teacher, linkedUser?.role);
  const hasAnyWeeklyKbm = isTu
    ? false
    : typeof totalTeacherKbmCount === 'number'
    ? totalTeacherKbmCount > 0
    : (weeklySchedules || []).some(
        (j: any) =>
          !isInvalidMapel(j?.mata_pelajaran || j?.mapel) &&
          isTeacherRecordMatch(j, teacher, linkedUser, { allowSingleWordFirstToken: true })
      );
  const isNonKbmOrTu = isTu || !hasAnyWeeklyKbm;
  const explicitSetting = parseExplicitBooleanFlag(teacher?.wajib_hadir_hanya_mengajar);

  const idSet = new Set(
    [teacher?.id, teacher?.user_id, linkedUser?.id]
      .filter(Boolean)
      .map(v => String(v).trim())
  );
  const identSet = new Set(
    [teacher?.nip, teacher?.username, linkedUser?.username]
      .map(v => String(v || '').trim().toLowerCase())
      .filter(v => v && v !== '-')
  );
  const normNames = new Set(
    [teacher?.nama_guru, teacher?.nama, linkedUser?.nama]
      .map(v => normalizeTeacherIdentityName(v))
      .filter(Boolean)
  );
  const isInLegacyList = (guruHanyaMengajarList || []).some(rawItem => {
    const item = String(rawItem || '').trim();
    if (!item) return false;
    if (idSet.has(item)) return true;
    if (identSet.has(item.toLowerCase())) return true;
    const normItem = normalizeTeacherIdentityName(item);
    return Boolean(normItem && normNames.has(normItem));
  });

  let isTeacherExempt = false;
  if (preferLegacyListWhenGlobalKbm && !isNonKbmOrTu && isInLegacyList) {
    isTeacherExempt = true;
  } else if (explicitSetting === false) {
    isTeacherExempt = false;
  } else if (explicitSetting === true) {
    isTeacherExempt = true;
  } else if (isNonKbmOrTu) {
    isTeacherExempt = false;
  } else if (isInLegacyList) {
    isTeacherExempt = true;
  }

  return {
    isTu,
    hasAnyWeeklyKbm,
    isNonKbmOrTu,
    explicitSetting,
    isInLegacyList,
    isTeacherExempt,
    aturanKehadiran: isTeacherExempt ? 'Hari_Mengajar_Saja' : 'Semua_Hari',
  };
}

/**
 * Normalisasi nama guru (trim spasi awal/akhir, hapus gelar akademik & tanda baca)
 * untuk pencocokan identitas yang akurat.
 */
export function normalizeTeacherIdentityName(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\b(ibu|bu|bapak|pak|bpk|ustadz|ustadzah|ust|guru|haji|h|hj|hjh|kh|kyai|kiai|prof|dr|drs|dra|ir|s\.?\s*pd\.?\s*k?|s\.?\s*pd\.?\s*i?|m\.?\s*pd\.?\s*k?|m\.?\s*pd\.?|s\.?\s*kom\.?|s\.?\s*si\.?|s\.?\s*ag\.?|s\.?\s*th\.?|m\.?\s*th\.?|s\.?\s*pak\.?|s\.?\s*sos\.?|s\.?\s*km\.?|s\.?\s*sn\.?|s\.?\s*or\.?|s\.?\s*tr\.?|s\.?\s*ip\.?|s\.\s*h\.?|s\.\s*p\.?|s\.?\s*e\.?|s\.?\s*t\.?|s\.?\s*psi\.?|s\.?\s*kep\.?|m\.?\s*si\.?|m\.?\s*kom\.?|m\.\s*m\.?|m\.\s*a\.?|a\.?\s*md\.?|gr)\b/gi, '')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mengecek apakah dua varian nama merujuk ke guru yang sama:
 * - Sama persis setelah normalisasi & trim (" Alva Rolan Saerang" == "Alva Rolan Saerang")
 * - Singkatan inisial tengah ("Alva R. Saerang, S.Pd., GR" == "Alva Rolan Saerang")
 * - Nama tengah terlewati ("Alva Saerang" == "Alva Rolan Saerang")
 */
export function isTeacherNameEquivalent(
  nameA?: string | null,
  nameB?: string | null,
  allowSingleWordFirstToken: boolean = false
): boolean {
  const normA = normalizeTeacherIdentityName(nameA);
  const normB = normalizeTeacherIdentityName(nameB);
  if (!normA || !normB) return false;
  if (normA === normB) return true;

  const tA = normA.split(' ').filter(Boolean);
  const tB = normB.split(' ').filter(Boolean);
  if (tA.length === 0 || tB.length === 0) return false;

  if (tA.length === 1 || tB.length === 1) {
    if (!allowSingleWordFirstToken) return false;
    const single = tA.length === 1 ? tA[0] : tB[0];
    const multiTokens = tA.length === 1 ? tB : tA;
    const multiFirst = multiTokens[0];
    if (single.length >= 2 && single === multiFirst) return true;
    // Shortened first-name variant differing only by trailing 'a' (e.g. "Susan" <-> "Susana")
    if (single.length >= 4 && multiFirst.length >= 4 && (multiFirst === single + 'a' || single === multiFirst + 'a')) {
      return true;
    }
    // Given-name second token when first token is a standard lead prefix (e.g. "Mohamad Adnan Mamangkai" -> "Adnan", "Setia Ambar Ningsih Mamonto" -> "Ambar")
    const commonLeadPrefixes = new Set(['mohamad', 'muhammad', 'moh', 'muh', 'mohammad', 'setia', 'siti', 'nur', 'abdul', 'andi', 'ni', 'i', 'la', 'wa']);
    if (single.length >= 3 && commonLeadPrefixes.has(multiFirst) && multiTokens.slice(1).includes(single)) {
      return true;
    }
    return false;
  }

  // Same token count: allow 1-char initial abbreviations when >=1 full word (>=2 chars) matches identically
  if (tA.length === tB.length) {
    let commonFullWords = 0;
    const allPosMatch = tA.every((tokA, i) => {
      const tokB = tB[i];
      if (tokA === tokB) {
        if (tokA.length >= 2) commonFullWords++;
        return true;
      }
      return (tokA.length === 1 && tokB.startsWith(tokA)) || (tokB.length === 1 && tokA.startsWith(tokB));
    });
    if (allPosMatch && commonFullWords >= 1) return true;
  }

  // Subsequence alignment with identical first and last names (e.g. "Alva Saerang" vs "Alva Rolan Saerang")
  if (tA[0] === tB[0] && tA[tA.length - 1] === tB[tB.length - 1]) {
    const shorter = tA.length <= tB.length ? tA : tB;
    const longer = tA.length <= tB.length ? tB : tA;
    let idx = 0;
    for (const sTok of shorter) {
      let found = false;
      while (idx < longer.length) {
        const lTok = longer[idx++];
        if (lTok === sTok || (sTok.length === 1 && lTok.startsWith(sTok)) || (lTok.length === 1 && sTok.startsWith(lTok))) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  return false;
}

/**
 * Mendeteksi apakah suatu sesi jurnal KBM memiliki materi/kegiatan riil
 * dengan mempertimbangkan seluruh variasi field historis maupun modern
 * (materi, materi_pembelajaran, konten, kegiatan, kegiatan_pembelajaran).
 */
export function hasJournalContent(j: any): boolean {
  if (!j) return false;
  const mat = (j.materi && j.materi !== '-') 
    ? j.materi 
    : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') 
      ? j.materi_pembelajaran 
      : ((j.konten && j.konten !== '-') ? j.konten : null));
  const keg = (j.kegiatan && j.kegiatan !== '-') 
    ? j.kegiatan 
    : ((j.kegiatan_pembelajaran && j.kegiatan_pembelajaran !== '-') 
      ? j.kegiatan_pembelajaran 
      : null);
  return Boolean(mat || keg);
}

/**
 * Mendeteksi apakah suatu sesi jurnal memiliki data absensi siswa yang tercatat,
 * baik dalam format modern JSON object (absensi_siswa), array objek legacy ([{ id, status }]),
 * maupun deskripsi kehadiran legacy (kehadiran_murid / detail_absen).
 */
export function hasAttendanceData(journal: any): boolean {
  if (!journal) return false;
  if (journal.absensi_siswa) {
    if (typeof journal.absensi_siswa === 'object' && journal.absensi_siswa !== null) {
      if (Object.keys(journal.absensi_siswa).length > 0) return true;
    } else if (typeof journal.absensi_siswa === 'string') {
      const trimmed = journal.absensi_siswa.trim();
      const stripped = trimmed.replace(/\s+/g, '');
      if (stripped !== '' && stripped !== '{}' && stripped !== '[]' && stripped !== '-' && stripped !== 'null' && stripped !== 'undefined') {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null) {
            if (Object.keys(parsed).length > 0) return true;
          } else {
            return true;
          }
        } catch {
          return true;
        }
      }
    }
  }
  if (journal.kehadiran_murid && typeof journal.kehadiran_murid === 'string') {
    const km = journal.kehadiran_murid.trim();
    if (km !== '' && km !== '-' && !km.toLowerCase().includes('belum diisi')) return true;
  }
  if (journal.detail_absen && typeof journal.detail_absen === 'string') {
    const da = journal.detail_absen.trim();
    if (da !== '' && da !== '-') return true;
  }
  return false;
}

/**
 * Melakukan parsing toleran dan normalisasi terhadap data absensi siswa
 * dari versi terdahulu (array objek, dictionary berstatus kata/objek, atau detail_absen teks)
 * menjadi dictionary standar: { [identitasSiswa]: 'H' | 'S' | 'I' | 'A' | 'B' }
 */
export function parseLegacyOrModernAttendance(
  rawAbsensi?: any,
  detailAbsen?: string,
  kehadiranMurid?: string
): Record<string, string> {
  const map: Record<string, string> = {};

  const normalizeStatusCode = (val: any): string => {
    if (!val) return 'H';
    if (typeof val === 'object') {
      val = val.status || val.st || val.code || 'H';
    }
    const up = String(val).trim().toUpperCase();
    if (up === 'S' || up.startsWith('SAKIT')) return 'S';
    if (up === 'I' || up.startsWith('IZIN')) return 'I';
    if (up === 'A' || up.startsWith('ALPA') || up.startsWith('ALFA')) return 'A';
    if (up === 'B' || up.startsWith('BOLOS')) return 'B';
    if (up === 'H' || up.startsWith('HADIR')) return 'H';
    if (up.length > 0 && ['H', 'S', 'I', 'A', 'B'].includes(up[0])) return up[0];
    return 'H';
  };

  // 1. Parsing rawAbsensi (object, array, atau JSON string)
  if (rawAbsensi) {
    let parsed: any = rawAbsensi;
    if (typeof rawAbsensi === 'string') {
      const trimmed = rawAbsensi.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          parsed = JSON.parse(trimmed);
        } catch (_) {
          parsed = null;
        }
      }
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          if (!item) return;
          const key = item.nisn || item.siswa_id || item.id || item.nama_siswa || item.nama || `student-${idx}`;
          const st = normalizeStatusCode(item.status || item.st || item.code || item);
          map[String(key)] = st;
          if (item.nisn) map[String(item.nisn)] = st;
          if (item.id) map[String(item.id)] = st;
          if (item.siswa_id) map[String(item.siswa_id)] = st;
          if (item.nama_siswa) {
            map[String(item.nama_siswa)] = st;
            map[String(item.nama_siswa).trim().toLowerCase()] = st;
          }
          if (item.nama) {
            map[String(item.nama)] = st;
            map[String(item.nama).trim().toLowerCase()] = st;
          }
        });
      } else {
        Object.entries(parsed).forEach(([key, val]) => {
          const st = normalizeStatusCode(val);
          map[key] = st;
          map[key.trim().toLowerCase()] = st;
        });
      }
    }
  }

  // 2. Fallback detail_absen jika dictionary masih kosong
  if (Object.keys(map).length === 0 && detailAbsen && typeof detailAbsen === 'string') {
    const parts = detailAbsen.split(/[,;\n|]+/);
    parts.forEach(part => {
      const p = part.trim();
      if (!p) return;
      const cleanPart = p.replace(/^\s*(?:\d+[\.\)]\s*|[-*•]\s*)/, '').trim();
      const matchParen = cleanPart.match(/^(.+?)\s*\((H|S|I|A|B|Hadir|Sakit|Izin|Alpa|Alfa|Bolos)\)$/i);
      if (matchParen) {
        const iden = matchParen[1].trim();
        const st = normalizeStatusCode(matchParen[2]);
        map[iden] = st;
        map[iden.toLowerCase()] = st;
        return;
      }
      const matchColon = cleanPart.match(/^(.+?)\s*[:=-]\s*(H|S|I|A|B|Hadir|Sakit|Izin|Alpa|Alfa|Bolos)$/i);
      if (matchColon) {
        const iden = matchColon[1].trim();
        const st = normalizeStatusCode(matchColon[2]);
        map[iden] = st;
        map[iden.toLowerCase()] = st;
      }
    });
  }

  return map;
}

/**
 * Format string ringkasan kehadiran murid dari absensi, detail_absen, atau kehadiran_murid
 */
export function formatAttendanceSummary(
  rawAbsensi?: any,
  detailAbsen?: string,
  kehadiranMurid?: string
): string {
  // 1. Validasi kehadiran_murid format standar
  if (kehadiranMurid && typeof kehadiranMurid === 'string' && kehadiranMurid.trim() && kehadiranMurid.trim() !== '-') {
    const km = kehadiranMurid.trim();
    if (/^Total murid:\s*\d+,\s*Hadir:\s*\d+,\s*Izin:\s*\d+,\s*Sakit:\s*\d+,\s*Alpa:\s*\d+$/i.test(km)) {
      return km;
    }
    const semuaHadirMatch = km.match(/Semua Hadir\s*(?:\((\d+)\s*siswa\))?/i);
    if (semuaHadirMatch) {
      const total = semuaHadirMatch[1] ? parseInt(semuaHadirMatch[1], 10) : 0;
      return total > 0 
        ? `Total murid: ${total}, Hadir: ${total}, Izin: 0, Sakit: 0, Alpa: 0`
        : km;
    }
    const hadirMatch = km.match(/(?:Hadir|Hadir siswa)(?:\s*:\s*|\s+)(\d+)/i);
    const izinMatch = km.match(/Izin(?:\s*:\s*|\s+)(\d+)/i);
    const sakitMatch = km.match(/Sakit(?:\s*:\s*|\s+)(\d+)/i);
    const alpaMatch = km.match(/Alpa(?:\s*:\s*|\s+)(\d+)/i);
    if (hadirMatch || izinMatch || sakitMatch || alpaMatch) {
      const h = hadirMatch ? parseInt(hadirMatch[1], 10) : 0;
      const i = izinMatch ? parseInt(izinMatch[1], 10) : 0;
      const s = sakitMatch ? parseInt(sakitMatch[1], 10) : 0;
      const a = alpaMatch ? parseInt(alpaMatch[1], 10) : 0;
      const total = h + i + s + a;
      return `Total murid: ${total}, Hadir: ${h}, Izin: ${i}, Sakit: ${s}, Alpa: ${a}`;
    }
  }

  // 2. Parsing rawAbsensi
  if (rawAbsensi) {
    let parsed: any = null;
    if (typeof rawAbsensi === 'object') {
      parsed = rawAbsensi;
    } else if (typeof rawAbsensi === 'string') {
      const raw = rawAbsensi.trim();
      if (raw.startsWith('{') || raw.startsWith('[')) {
        try {
          parsed = JSON.parse(raw);
        } catch (_) {}
      } else if (raw.includes('|')) {
        const h = parseInt(raw.match(/H\s*:\s*(\d+)/i)?.[1] || '0', 10);
        const i = parseInt(raw.match(/I\s*:\s*(\d+)/i)?.[1] || '0', 10);
        const s = parseInt(raw.match(/S\s*:\s*(\d+)/i)?.[1] || '0', 10);
        const a = parseInt(raw.match(/A\s*:\s*(\d+)/i)?.[1] || '0', 10);
        const total = h + i + s + a;
        return `Total murid: ${total}, Hadir: ${h}, Izin: ${i}, Sakit: ${s}, Alpa: ${a}`;
      }
    }

    if (parsed) {
      const counts = { H: 0, I: 0, S: 0, A: 0 };
      const extractStatus = (val: any): string => {
        if (!val) return 'H';
        if (typeof val === 'object') {
          return String(val.status || val.st || 'H');
        }
        return String(val);
      };

      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          const st = extractStatus(item?.status || item).trim().toUpperCase();
          if (st.startsWith('H')) counts.H++;
          else if (st.startsWith('I')) counts.I++;
          else if (st.startsWith('S')) counts.S++;
          else if (st.startsWith('A') || st.startsWith('B')) counts.A++;
        });
      } else if (typeof parsed === 'object') {
        Object.values(parsed).forEach((v: any) => {
          const st = extractStatus(v).trim().toUpperCase();
          if (st.startsWith('H')) counts.H++;
          else if (st.startsWith('I')) counts.I++;
          else if (st.startsWith('S')) counts.S++;
          else if (st.startsWith('A') || st.startsWith('B')) counts.A++;
        });
      }

      const total = counts.H + counts.I + counts.S + counts.A;
      if (total > 0) {
        return `Total murid: ${total}, Hadir: ${counts.H}, Izin: ${counts.I}, Sakit: ${counts.S}, Alpa: ${counts.A}`;
      }
    }
  }

  // 3. Fallback detail_absen
  if (detailAbsen && typeof detailAbsen === 'string') {
    const d = detailAbsen.trim();
    if (d && d !== '-') {
      const h = (d.match(/\((?:H|Hadir)\)/gi) || []).length;
      const i = (d.match(/\((?:I|Izin)\)/gi) || []).length;
      const s = (d.match(/\((?:S|Sakit)\)/gi) || []).length;
      const a = (d.match(/\((?:A|Alfa|Alpa|Bolos|B)\)/gi) || []).length;
      const total = h + i + s + a;
      if (total > 0) {
        return `Total murid: ${total}, Hadir: ${h}, Izin: ${i}, Sakit: ${s}, Alpa: ${a}`;
      }
    }
  }

  return 'Total murid: 0, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0';
}

/**
 * Menautkan baris data_guru ke akun login pada tabel users menggunakan user_id,
 * kecocokan nip == username, atau variasi nama yang setara.
 */
export function resolveLinkedUserForTeacher(teacher: any, usersList: any[] = []): any | null {
  if (!teacher || !Array.isArray(usersList) || usersList.length === 0) return null;
  if (teacher.user_id) {
    const byId = usersList.find(u => u && String(u.id) === String(teacher.user_id));
    if (byId) return byId;
  }
  const cleanNip = (teacher.nip || '').trim().toLowerCase();
  const cleanGuruUsername = (teacher.username || '').trim().toLowerCase();
  if ((cleanNip && cleanNip !== '-') || cleanGuruUsername) {
    const byUsername = usersList.find(u => {
      const un = (u?.username || '').trim().toLowerCase();
      return un && ((cleanNip && cleanNip !== '-' && un === cleanNip) || (cleanGuruUsername && un === cleanGuruUsername));
    });
    if (byUsername) return byUsername;
  }
  const byExactName = usersList.find(
    u => normalizeTeacherIdentityName(u?.nama) && normalizeTeacherIdentityName(u?.nama) === normalizeTeacherIdentityName(teacher.nama_guru)
  );
  if (byExactName) return byExactName;

  return usersList.find(u => isTeacherNameEquivalent(teacher.nama_guru, u?.nama, false)) || null;
}

/**
 * Pencocokan terpusat antara record transaksi (presensi, jurnal, jurnal_bk, piket)
 * dan profil guru + akun user tertaut.
 */
export function isTeacherRecordMatch(
  record: {
    user_id?: string | null;
    guru_id?: string | null;
    nama_guru?: string | null;
    guru_pelapor?: string | null;
    guru_nama?: string | null;
    nip?: string | null;
    nip_guru?: string | null;
    guru_nip?: string | null;
    username?: string | null;
  } | null | undefined,
  teacher: {
    id?: string | null;
    user_id?: string | null;
    nama_guru?: string | null;
    nama?: string | null;
    nip?: string | null;
    username?: string | null;
  } | null | undefined,
  linkedUser?: {
    id?: string | null;
    nama?: string | null;
    username?: string | null;
  } | null,
  options?: { allowSingleWordFirstToken?: boolean }
): boolean {
  if (!record || !teacher) return false;

  // 1. Direct ID match (preserves strong link even when names diverge completely)
  const teacherIds = [teacher.user_id, linkedUser?.id, teacher.id]
    .filter(Boolean)
    .map(v => String(v).trim());
  const recIds = [record.user_id, record.guru_id]
    .filter(Boolean)
    .map(v => String(v).trim());
  if (recIds.some(rid => teacherIds.includes(rid))) {
    return true;
  }

  // 2. NIP / Username identifier match (case-insensitive)
  const identSet = new Set(
    [teacher.nip, teacher.username, linkedUser?.username]
      .map(v => (v || '').trim().toLowerCase())
      .filter(v => v && v !== '-')
  );
  const recIdents = [record.nip, record.nip_guru, record.guru_nip, record.username]
    .map(v => (v || '').trim().toLowerCase())
    .filter(v => v && v !== '-');
  if (recIdents.some(ri => identSet.has(ri))) {
    return true;
  }

  const recordName = record.nama_guru || record.guru_pelapor || record.guru_nama || '';
  const normRecSimple = normalizeTeacherIdentityName(recordName);
  if (normRecSimple && identSet.has(normRecSimple)) {
    return true;
  }

  // 3. Name variant matching against both data_guru.nama_guru and linked users.nama
  const allowSingle = Boolean(options?.allowSingleWordFirstToken);
  const candidateNames = [teacher.nama_guru, teacher.nama, linkedUser?.nama].filter(Boolean) as string[];
  for (const alias of candidateNames) {
    if (isTeacherNameEquivalent(recordName, alias, allowSingle)) {
      return true;
    }
    const cleanAlias = normalizeTeacherIdentityName(alias);
    if (cleanAlias && recIdents.includes(cleanAlias)) {
      return true;
    }
  }

  // 3b. INVAL substitution check (e.g. "[INVAL - Menggantikan: Ibu Winda] Jurnal KBM")
  const invalMatch = (record as any)?.keterangan?.match(/\[INVAL\s*-\s*Menggantikan:\s*([^\]]+)\]/i);
  if (invalMatch && invalMatch[1]) {
    const substitutedName = invalMatch[1].trim();
    for (const alias of candidateNames) {
      if (isTeacherNameEquivalent(substitutedName, alias, allowSingle)) {
        return true;
      }
    }
  }

  return false;
}

const CANONICAL_DAYS_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * Mengembalikan ringkasan jadwal KBM mingguan untuk seorang guru:
 * - totalJadwal: total sesi jadwal KBM aktif per minggu
 * - hariMengajarList: daftar hari mengajar terurut (Senin..Sabtu)
 * - kelasMapelList: daftar pasangan hari, kelas, dan mata pelajaran
 */
export function getTeacherScheduleSummary(
  teacher: any,
  weeklySchedules: any[] = [],
  linkedUser?: any
): {
  totalJadwal: number;
  hariMengajarList: string[];
  kelasMapelList: { hari: string; kelas: string; mapel: string }[];
} {
  if (!teacher || isTuAccount(teacher, linkedUser?.role)) {
    return { totalJadwal: 0, hariMengajarList: [], kelasMapelList: [] };
  }
  const matchedSchedules = (weeklySchedules || []).filter(
    (j: any) =>
      !isInvalidMapel(j?.mata_pelajaran || j?.mapel) &&
      isTeacherRecordMatch(j, teacher, linkedUser, { allowSingleWordFirstToken: true })
  );
  const daySet = new Set<string>();
  const kelasMapelList: { hari: string; kelas: string; mapel: string }[] = [];
  for (const j of matchedSchedules) {
    const hari = String(j?.hari || '').trim();
    const kelas = String(j?.kelas || '').trim();
    const mapel = String(j?.mata_pelajaran || j?.mapel || '').trim();
    if (hari) {
      const canonicalDay = CANONICAL_DAYS_ORDER.find(d => d.toLowerCase() === hari.toLowerCase()) || hari;
      daySet.add(canonicalDay);
    }
    kelasMapelList.push({ hari, kelas, mapel });
  }
  const hariMengajarList = CANONICAL_DAYS_ORDER.filter(d => daySet.has(d));
  for (const d of daySet) {
    if (!hariMengajarList.includes(d)) hariMengajarList.push(d);
  }
  return {
    totalJadwal: matchedSchedules.length,
    hariMengajarList,
    kelasMapelList,
  };
}

/**
 * Mengecek apakah string lokasi_kbm adalah nama tempat/ruang KBM yang valid
 * (bukan kosong, '-', 'Lokasi tidak terdeteksi', atau koordinat mentah 'GPS: ...').
 */
export function isValidLokasiKbm(val?: any): boolean {
  if (val === null || val === undefined || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-' || trimmed === '--') return false;
  if (/^lokasi\s+tidak\s+terdeteksi$/i.test(trimmed)) return false;
  if (/^gps\s*:/i.test(trimmed)) return false;
  if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) return false;
  return true;
}

/**
 * Mengisi / meresolusi Tempat/Lokasi KBM pada entri jurnal:
 * 1. Jika entri sudah memiliki `lokasi_kbm` yang valid, gunakan nilai tersebut.
 * 2. Jika kosong/strip/GPS dan `entry.kelas` valid (bukan kosong/'-'), cari dari riwayat jurnal
 *    yang pernah diisi oleh guru yang sama pada `kelas` yang sama persis (tanpa lintas kelas).
 * 3. Fallback ke `entry.lokasi` jika valid (bukan GPS/strip), atau `'-'`.
 */
export function resolveTeacherLokasiKbm(
  entry: any,
  historyRows: any[] = [],
  currentUser?: any
): string {
  if (!entry) return '-';
  if (isValidLokasiKbm(entry.lokasi_kbm)) {
    return String(entry.lokasi_kbm).trim();
  }

  const targetKelas = String(entry.kelas || '').trim().toLowerCase();
  const hasValidTargetKelas = Boolean(targetKelas && targetKelas !== '-');
  if (hasValidTargetKelas) {
    const teacherRef = {
      id: entry.guru_id || entry.user_id,
      user_id: entry.user_id,
      nama_guru: entry.nama_guru || entry.nama,
      nama: entry.nama_guru || entry.nama,
      nip: entry.nip,
      username: entry.username,
    };

    for (const h of historyRows || []) {
      if (!h) continue;
      const hKelas = String(h.kelas || '').trim().toLowerCase();
      if (!hKelas || hKelas !== targetKelas) continue;

      const candidateLoc = isValidLokasiKbm(h.lokasi_kbm)
        ? String(h.lokasi_kbm).trim()
        : isValidLokasiKbm(h.lokasi)
        ? String(h.lokasi).trim()
        : null;
      if (!candidateLoc) continue;

      const isSameTeacher =
        (teacherRef.user_id && h.user_id && String(teacherRef.user_id) === String(h.user_id)) ||
        isTeacherRecordMatch(h, teacherRef, currentUser, { allowSingleWordFirstToken: true });
      if (isSameTeacher) {
        return candidateLoc;
      }
    }
  }

  if (isValidLokasiKbm(entry.lokasi)) return String(entry.lokasi).trim();
  return '-';
}

/**
 * Mengevaluasi apakah suatu entri jurnal sesuai dengan KBM seorang guru
 * yang berstatus "Wajib Hadir Hanya KBM" (untuk tampilan dan cetak jurnal pribadi):
 * - Menyaring keluar Jurnal Kegiatan non-KBM (kelas kosong/'-' atau mapel='Jurnal Kegiatan')
 *   dan baris sintetis "tidak melaksanakan kegiatan apapun".
 * - Mempertahankan jurnal KBM (termasuk jurnal KBM historis yang memiliki kelas & mapel KBM valid
 *   meskipun kolom keterangan lamanya tertulis 'Jurnal Kegiatan').
 * - Memastikan kelas & mata pelajaran pada jurnal cocok dengan penugasan/jadwal KBM guru tersebut
 *   (atau merupakan sesi INVAL KBM yang sah).
 */
export function isJournalEligibleForKbmTeacher(
  journal: any,
  teacherAssignments: any[] = [],
  teacherSchedules: any[] = []
): boolean {
  if (!journal) return false;
  const idStr = String(journal.id || '');
  if (idStr.startsWith('unfilled-kegiatan-')) return false;

  const ketLower = String(journal.keterangan || '').trim().toLowerCase();
  if (ketLower === 'tidak melaksanakan kegiatan apapun') return false;

  const kls = String(journal.kelas || '').trim();
  const mpl = String(journal.mapel || journal.mata_pelajaran || '').trim();

  if (!kls || kls === '-') return false;
  if (!mpl || mpl === '-' || mpl.toLowerCase() === 'jurnal kegiatan' || isInvalidMapel(mpl)) {
    return false;
  }

  // Izinkan sesi INVAL KBM yang memiliki kelas & mapel valid
  if (/\[inval\s*-/i.test(String(journal.keterangan || ''))) {
    return true;
  }

  const hasAssignments = Array.isArray(teacherAssignments) && teacherAssignments.length > 0;
  const hasSchedules = Array.isArray(teacherSchedules) && teacherSchedules.length > 0;

  if (!hasAssignments && !hasSchedules) {
    return true;
  }

  // Jika tanggal jurnal tersedia dan jadwal mingguan guru memiliki atribut hari,
  // pastikan hari jurnal sesuai dengan hari KBM aktif guru tersebut.
  const dateMatch = String(journal.tanggal || '').trim().match(/^(\d{4}-\d{2}-\d{2})/);
  const schedulesWithDay = hasSchedules
    ? teacherSchedules.filter((s: any) => s && s.hari)
    : [];
  if (dateMatch && schedulesWithDay.length > 0) {
    const journalDay = getWitaDayName(new Date(`${dateMatch[1]}T12:00:00+08:00`)).toLowerCase();
    const matchingDaySchedule = schedulesWithDay.some((s: any) =>
      String(s.hari).trim().toLowerCase() === journalDay &&
      isJurnalMatchJadwal(
        { kelas: kls, mapel: mpl },
        { kelas: s.kelas, mata_pelajaran: s.mata_pelajaran || s.mapel }
      )
    );
    if (!matchingDaySchedule) return false;
  }

  if (hasAssignments) {
    const matchedAssignment = teacherAssignments.some((a: any) =>
      isJurnalMatchJadwal(
        { kelas: kls, mapel: mpl },
        { kelas: a.kelas, mata_pelajaran: a.nama_mata_pelajaran || a.nama_mapel || a.mapel_singkat }
      )
    );
    if (matchedAssignment) return true;
  }

  if (hasSchedules) {
    const matchedSchedule = teacherSchedules.some((s: any) =>
      isJurnalMatchJadwal(
        { kelas: kls, mapel: mpl },
        { kelas: s.kelas, mata_pelajaran: s.mata_pelajaran || s.mapel }
      )
    );
    if (matchedSchedule) return true;
  }

  return false;
}

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
  jurnalBK?: any[];

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
  isBk?: boolean;
  bebasAlpa?: boolean;
  isAlpa?: boolean;

  // Rejection tracking — when admin rejects a submission, these fields are set
  // so the teacher knows they must re-submit (rejected records are excluded from "done" logic)
  presensiDatangDitolak: any | null;
  presensiPulangDitolak: any | null;
  laporanPiketDitolak: any | null;
  jurnalDitolak: any[];

  // Jam operasional presensi hari ini
  jamPresensi?: {
    datangMulai: string;
    datangBatas: string;
    datangAkhir: string;
    pulangMulai: string;
    pulangJumat: string;
    pulangAkhir: string;
    effectivePulangMulai: string;
  };

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
        ((teacherNama && (teacherNama.includes(targetGuruNama) || targetGuruNama.includes(teacherNama))) ||
          (schedNamaGuru && (schedNamaGuru.includes(targetGuruNama) || targetGuruNama.includes(schedNamaGuru))))
      );

      const fallbackMatches = Boolean(
        targetGuruId &&
        ((teacherNama && teacherNama.includes(targetGuruId)) ||
          (schedNamaGuru && schedNamaGuru.includes(targetGuruId)))
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
    .order('kelas', { ascending: true });
  if (sekolahId) query = query.eq('sekolah_id', sekolahId);
  const { data: allJadwalRaw, error: qErr } = await query;
  let rawList = (allJadwalRaw && !qErr) ? allJadwalRaw : [];
  if (rawList.length === 0 && sekolahId) {
    const fbRes = await supabase.from('jadwal_pelajaran').select('*').order('kelas', { ascending: true });
    if (Array.isArray(fbRes.data)) rawList = fbRes.data;
  }
  
  if (rawList.length === 0) return [];

  const targetHari = (hari || '').trim().toLowerCase();
  const dayFiltered = rawList.filter((j: any) =>
    (j.hari || '').trim().toLowerCase() === targetHari
  );

  // Filter out any invalid / non-existent subjects (such as "teknik informasi" or "teknologi informasi")
  const allJadwal = dayFiltered.filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel));
  if (allJadwal.length === 0) return [];

  const uuidMatches = userId ? allJadwal.filter((j: any) => j.user_id === userId) : [];

  const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

  const namaNorm = normalizeName(namaGuru);
  const firstName = namaNorm.split(/\s+/)[0] || '';
  const userNorm = username ? normalizeName(username) : '';

  const nameMatches = allJadwal.filter((j: any) => {
    // Direct match via canonical isTeacherRecordMatch
    if (isTeacherRecordMatch(
      j,
      { nama_guru: namaGuru, user_id: userId, nip: username, username },
      { id: userId, nama: namaGuru, username },
      { allowSingleWordFirstToken: true }
    )) {
      return true;
    }

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
      if (firstName === jNorm || (!jNorm.includes(' ') && firstName.startsWith(jNorm)) || (!namaNorm.includes(' ') && jNorm.startsWith(firstName + ' '))) {
        return true;
      }
    }

    // 4. Honorific / identity equivalence fallback (e.g. "Ibu Winda Wulansari" <=> "Winda Wulansari")
    if (isTeacherNameEquivalent(namaGuru, jNama, true)) {
      return true;
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
  return daftarArr.some(n => n === namaLower || namaLower.includes(n) || n.includes(namaLower) || isTeacherNameEquivalent(n, namaGuru, true));
}

export function isLateArrival(p: any): boolean {
  // Izin Terlambat/Terlambat bukan cuti: guru tetap wajib mengisi jurnal KBM.
  return /terlambat/i.test(p?.jenis_presensi || '');
}

/**
 * Klasifikasi terpusat status ketidakhadiran sah dari record presensi_guru.
 * Mengembalikan null bila ditolak atau merupakan keterlambatan (Izin Terlambat / Terlambat).
 */
export function getPresensiLeaveCategory(p: any): 'Sakit' | 'Izin' | 'Cuti' | 'Dinas Luar' | null {
  if (!p || p.status_verifikasi === 'Ditolak' || isLateArrival(p)) return null;
  const jp = String(p.jenis_presensi || '').trim().toLowerCase();
  const di = String(p.detail_izin || '').trim().toLowerCase();
  const sv = String(p.status_verifikasi || '').trim().toLowerCase();
  if (jp === 'sakit' || di.includes('sakit') || sv === 'sakit') return 'Sakit';
  if (jp === 'cuti' || di.includes('cuti') || sv === 'cuti') return 'Cuti';
  if (jp === 'dinas luar' || di.includes('dinas') || sv === 'dinas luar') return 'Dinas Luar';
  if (jp === 'izin' || di.includes('izin') || sv === 'izin') return 'Izin';
  return null;
}

/**
 * Cek apakah suatu record presensi (harian atau multi-hari) mencakup tanggal target (YYYY-MM-DD).
 */
export function isPresensiCoveringDate(p: any, targetDateStr: string): boolean {
  if (!p || !targetDateStr) return false;
  const normDate = (raw: any) => extractWitaDateStr(String(raw || '')) || String(raw || '').trim().substring(0, 10);
  if (p.tanggal_mulai && p.tanggal_selesai) {
    const start = normDate(p.tanggal_mulai);
    const end = normDate(p.tanggal_selesai);
    return Boolean(start && end && targetDateStr >= start && targetDateStr <= end);
  }
  const durasi = Number(p.durasi_hari || p.durasiHari) || 0;
  if (p.tanggal_mulai && durasi > 0) {
    const start = normDate(p.tanggal_mulai);
    if (start) {
      const dt = new Date(`${start}T12:00:00+08:00`);
      if (!isNaN(dt.getTime())) {
        dt.setDate(dt.getDate() + Math.max(1, durasi) - 1);
        const end = getWitaDateStr(dt);
        return targetDateStr >= start && targetDateStr <= end;
      }
    }
  }
  const match = String(p.detail_izin || '').match(/(\d{4}-\d{2}-\d{2})\s*s\/d\s*(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return targetDateStr >= match[1] && targetDateStr <= match[2];
  }
  const pDate = p.timestamp ? (extractWitaDateStr(p.timestamp) || String(p.timestamp).trim().substring(0, 10)) : '';
  return pDate === targetDateStr;
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

  const romanToNum: Record<string, string> = {
    xii: '12', xi: '11', x: '10', ix: '9', viii: '8', vii: '7'
  };
  const normKelas = (k: string) =>
    k
      .replace(/^kelas\s+/i, '')
      .replace(/[\s\-_.]/g, '')
      .replace(/^(xii|xi|x|ix|viii|vii)/i, m => romanToNum[m.toLowerCase()] || m);

  const nJKelas = normKelas(jKelas);
  const nJdKelas = normKelas(jdKelas);

  let classMatches = (jKelas === jdKelas || nJKelas === nJdKelas);

  if (!classMatches) {
    // Check parallel class alignment between broad grade (e.g. "XII Merdeka") and parallel class ("XII Merdeka C")
    const getSuffixLetter = (s: string) =>
      s.match(/-\s*(?:XII|XI|X|IX|VIII|VII|[1-9]|1[0-2])[\s._-]*([A-Za-z0-9])\s*$/i)?.[1]?.toLowerCase();
    const getParallelLetter = (k: string) =>
      k.match(/[\s._-]+([A-Za-z0-9])$/i)?.[1]?.toLowerCase();

    const jLetter = getParallelLetter(jKelas);
    const jdLetter = getParallelLetter(jdKelas) || getSuffixLetter(jdMapel) || getSuffixLetter(jMapel);

    if (jLetter && jdLetter && jLetter === jdLetter) {
      const getGrade = (k: string) => {
        const m = k.match(/^(XII|XI|X|IX|VIII|VII|[1-9]|1[0-2])\b/i)?.[1]?.toLowerCase();
        return m ? (romanToNum[m] || m) : '';
      };
      const jGrade = getGrade(jKelas);
      const jdGrade = getGrade(jdKelas);
      if (jGrade && jdGrade && jGrade === jdGrade) {
        classMatches = true;
      }
    }
  }

  if (!classMatches) return false;

  // Mapel tidak boleh kosong agar tidak terjadi false-positive match terhadap string kosong
  if (!jMapel || !jdMapel) return false;
  
  // Mapel: cek kesamaan langsung
  if (jMapel === jdMapel) return true;

  // Coba cek tanpa prefix kelas (misal "XI Merdeka_Matematika" -> "Matematika")
  const jMapelClean = jMapel.includes('_') ? (jMapel.split('_').pop() || '').trim() : jMapel;
  const jdMapelClean = jdMapel.includes('_') ? (jdMapel.split('_').pop() || '').trim() : jdMapel;
  if (jMapelClean === jdMapelClean) return true;

  // Normalisasi singkatan umum mata pelajaran (e.g. "B. Inggris" <-> "Bahasa Inggris", "MTK" <-> "Matematika")
  const normSubject = (m: string) => {
    let s = m.toLowerCase().replace(/[\.\-_/]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^b(hs|hsa)?\s*ing(gris)?\b|^english\b/i.test(s)) return 'bahasa inggris';
    if (/^b(hs|hsa)?\s*ind(onesia)?\b/i.test(s)) return 'bahasa indonesia';
    if (/^(mtk|mat|matematika|math)\b/i.test(s)) return 'matematika';
    if (/^(pjok|penjas|penjasorkes|pendidikan jasmani)\b/i.test(s)) return 'pjok';
    if (/^(pai|p a i|pendidikan agama islam|agama islam)\b/i.test(s)) return 'pendidikan agama islam';
    if (/^(pak|p a k|pendidikan agama kristen|agama kristen)\b/i.test(s)) return 'pendidikan agama kristen';
    if (/^(pkn|ppkn|pendidikan kewarganegaraan|pendidikan pancasila)\b/i.test(s)) return 'ppkn';
    if (/^(ipa|ilmu pengetahuan alam)\b/i.test(s)) return 'ipa';
    if (/^(ips|ilmu pengetahuan sosial)\b/i.test(s)) return 'ips';
    if (/^(tik|informatika|teknologi informasi)\b/i.test(s)) return 'informatika';
    if (/^(sbk|seni budaya)\b/i.test(s)) return 'seni budaya';
    if (/^(bk|bimbingan konseling)\b/i.test(s)) return 'bimbingan konseling';
    return s;
  };

  const nsJ = normSubject(jMapelClean);
  const nsJd = normSubject(jdMapelClean);
  if (nsJ === nsJd) return true;

  // Cek substring dengan panjang minimal 3 karakter agar tidak collision dengan singkatan pendek
  if (jMapelClean.length >= 3 && jdMapelClean.length >= 3) {
    if (jMapelClean.includes(jdMapelClean) || jdMapelClean.includes(jMapelClean)) return true;
  }
  if (nsJ.length >= 3 && nsJd.length >= 3) {
    if (nsJ.includes(nsJd) || nsJd.includes(nsJ)) return true;
  }
  
  return false;
}

export interface ConnectedGuruMapelItem {
  id: string;
  mapel_id: string;
  nama_mata_pelajaran: string;
  nama_mapel: string;
  mapel_singkat: string;
  kelas: string;
  hariList: string[];
  jadwalByHari: Record<string, { jam_mulai?: string | null; jam_selesai?: string | null }>;
}

/**
 * Resolves the canonical class name for a subject and schedule/assignment entry.
 * Accurately detects and maps parallel class formats across Indonesian schools:
 * - Parallel suffix format: "B. Indonesia - XII C" -> "XII Merdeka C" (or "XII C")
 * - Parallel prefix format: "X Merdeka A_Matematika" -> "X Merdeka A"
 * - Standard grade format: "X Merdeka_MTK" -> "X Merdeka" (e.g. SMA Nizamudin)
 * If validClasses is provided (from school data_siswa / data_kelas), strictly matches against authentic school classes.
 */
export function resolveCanonicalClass(
  rawKelas?: string | null,
  mapelName?: string | null,
  validClasses: string[] = []
): string {
  const m = (mapelName || '').trim();
  const k = (rawKelas || '').trim();

  // 1. If validClasses is provided and k is already an exact valid parallel class (not just generic grade)
  if (validClasses.length > 0 && validClasses.includes(k) && !/^(X|XI|XII)\s+Merdeka$/i.test(k)) {
    return k;
  }

  // 2. Check suffix format: e.g. 'B. Indonesia - XII C', 'IPS Sosiologi - X A', 'PJOK - XI D'
  const suffixMatch = m.match(/-\s*(XII|XI|X|IX|VIII|VII|[1-9]|1[0-2])[\s._-]*([A-Za-z0-9])\s*$/i);
  if (suffixMatch) {
    const tingkat = suffixMatch[1].toUpperCase();
    const parallel = suffixMatch[2].toUpperCase();

    // Match against validClasses if provided
    if (validClasses.length > 0) {
      const found = validClasses.find(vc => {
        const vcTrim = vc.trim();
        const vcTingkat = vcTrim.match(/^(XII|XI|X|IX|VIII|VII|[1-9]|1[0-2])\b/i)?.[1]?.toUpperCase();
        const vcParallel = vcTrim.match(/[\s._-]+([A-Za-z0-9])$/i)?.[1]?.toUpperCase();
        return vcTingkat === tingkat && vcParallel === parallel;
      });
      if (found) return found;
    }

    // Fallback if validClasses is not provided: check if rawKelas has 'Merdeka'
    if (/merdeka/i.test(k)) {
      return `${tingkat} Merdeka ${parallel}`;
    }
    return `${tingkat} ${parallel}`;
  }

  // 3. Check prefix format: e.g. 'X Merdeka A_Matematika' or 'X Merdeka_MTK'
  if (m.includes('_')) {
    const prefix = m.split('_')[0].trim();
    if (validClasses.length > 0 && validClasses.includes(prefix)) {
      return prefix;
    }
    if (prefix && (!k || k === prefix)) return prefix;
  }

  // 4. Default to rawKelas if present
  if (k) return k;

  return '';
}

/**
 * Menghubungkan data_mapel, data_guru, guru_mapel, dan jadwal_pelajaran
 * sehingga setiap guru mendapatkan daftar mata pelajaran & kelas yang terkoneksi
 * lengkap dengan daftar hari jadwal mengajarnya (hariList).
 */
export function connectGuruMapelWithJadwal(
  teacher: {
    id?: string;
    user_id?: string;
    username?: string;
    nip?: string;
    nama?: string;
    nama_guru?: string;
  },
  jadwalRows: any[] = [],
  dataMapelRows: any[] = [],
  guruMapelRows: any[] = [],
  dataGuruRow?: any,
  schoolClasses: string[] = []
): ConnectedGuruMapelItem[] {
  const normalizeName = (s: string) => (s || '').split(',')[0].toLowerCase().trim().replace(/z/g, 's');

  const userId = teacher.user_id || dataGuruRow?.user_id || teacher.id || '';
  const guruName = dataGuruRow?.nama_guru || teacher.nama_guru || teacher.nama || '';
  const username = dataGuruRow?.nip || teacher.nip || teacher.username || '';

  const namaNorm = normalizeName(guruName);
  const firstName = namaNorm.split(/\s+/)[0] || '';
  const userNorm = username ? normalizeName(username) : '';

  const validMapelMaster = (dataMapelRows || []).filter(
    (m: any) => !isInvalidMapel(m.nama_mata_pelajaran || m.nama_mapel)
  );

  const isTeacherJadwalMatch = (j: any): boolean => {
    if (!j || isInvalidMapel(j.mata_pelajaran || j.mapel)) return false;
    if (userId && j.user_id && j.user_id === userId) return true;
    const jNama = (j.nama_guru || '').trim();
    if (!jNama) return false;
    const jNorm = normalizeName(jNama);
    if (userNorm && userNorm === jNorm) return true;
    if (namaNorm && namaNorm === jNorm) return true;
    if (firstName && firstName.length >= 2) {
      if (firstName === jNorm || (!jNorm.includes(' ') && firstName.startsWith(jNorm)) || (!namaNorm.includes(' ') && jNorm.startsWith(firstName + ' '))) {
        return true;
      }
    }
    if (isTeacherNameEquivalent(guruName, jNama, true)) {
      return true;
    }
    return false;
  };

  const isTeacherGmMatch = (g: any): boolean => {
    if (!g || isInvalidMapel(g.nama_mapel || g.mapel_singkat || g.mata_pelajaran)) return false;
    const gUserId = g.user_id || g.guru_id || '';
    if (userId && gUserId && gUserId === userId) return true;
    const gNip = (g.nip || '').trim();
    if (username && gNip && (userNorm === normalizeName(gNip) || username === gNip)) return true;
    const gNama = (g.nama_guru || g.nama || '').trim();
    if (gNama) {
      const gNorm = normalizeName(gNama);
      if (userNorm && userNorm === gNorm) return true;
      if (namaNorm && namaNorm === gNorm) return true;
      if (firstName && firstName.length >= 2) {
        if (firstName === gNorm || (!gNorm.includes(' ') && firstName.startsWith(gNorm)) || (!namaNorm.includes(' ') && gNorm.startsWith(firstName + ' '))) {
          return true;
        }
      }
      return false;
    }
    return true;
  };

  const myJadwal = (jadwalRows || []).filter(isTeacherJadwalMatch);
  const myGm = (guruMapelRows || []).filter(isTeacherGmMatch);

  const resultMap = new Map<string, ConnectedGuruMapelItem>();

  const resolveCanonicalMapel = (kelasRaw: string, mapelRaw: string) => {
    const kls = (kelasRaw || '').trim();
    const rawM = (mapelRaw || '').trim();
    const shortM =
      kls && rawM.toLowerCase().startsWith(kls.toLowerCase() + '_')
        ? rawM.slice(kls.length + 1).trim()
        : rawM.includes('_')
        ? (rawM.split('_').pop() || '').trim()
        : rawM;
    const canonicalCandidate = kls ? `${kls}_${shortM}` : rawM;

    const dm = validMapelMaster.find((m: any) => {
      const mName = (m.nama_mata_pelajaran || m.nama_mapel || '').trim();
      if (!mName) return false;
      if (mName.toLowerCase() === canonicalCandidate.toLowerCase()) return true;
      if (mName.includes('_') && kls && mName.split('_')[0].trim().toLowerCase() !== kls.toLowerCase()) return false;
      if (mName.toLowerCase() === rawM.toLowerCase()) {
        const mKelas = (m.kategori || m.kelompok || '').trim();
        if (!mKelas || !kls || mKelas.toLowerCase() === kls.toLowerCase()) return true;
      }
      return isJurnalMatchJadwal(
        { kelas: m.kategori || m.kelompok || kls, mapel: mName },
        { kelas: kls, mata_pelajaran: rawM }
      );
    });

    const gm = myGm.find((g: any) =>
      isJurnalMatchJadwal(
        { kelas: g.kelas || kls, mapel: g.nama_mapel || g.mapel_singkat },
        { kelas: kls, mata_pelajaran: rawM }
      )
    );

    const finalNama = dm?.nama_mata_pelajaran || dm?.nama_mapel || gm?.nama_mapel || canonicalCandidate;
    const candidateKelas = kls || dm?.kategori || dm?.kelompok || gm?.kelas || (finalNama.includes('_') ? finalNama.split('_')[0].trim() : '');
    const finalKelas = resolveCanonicalClass(candidateKelas, finalNama, schoolClasses);
    const finalId = String(dm?.id || gm?.mapel_id || gm?.id || finalNama);
    const finalSingkat = gm?.mapel_singkat || shortM || finalNama;

    return { finalId, finalNama, finalSingkat, finalKelas };
  };

  for (const j of myJadwal) {
    const kls = (j.kelas || '').trim();
    const rawM = (j.mata_pelajaran || j.mapel || '').trim();
    if (!rawM || isInvalidMapel(rawM)) continue;

    const { finalId, finalNama, finalSingkat, finalKelas } = resolveCanonicalMapel(kls, rawM);
    const key = `${finalNama.toLowerCase()}__${finalKelas.toLowerCase()}`;
    const hari = (j.hari || '').trim();

    if (!resultMap.has(key)) {
      resultMap.set(key, {
        id: finalId,
        mapel_id: finalId,
        nama_mata_pelajaran: finalNama,
        nama_mapel: finalNama,
        mapel_singkat: finalSingkat,
        kelas: finalKelas,
        hariList: hari ? [hari] : [],
        jadwalByHari: hari ? { [hari]: { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai } } : {},
      });
    } else {
      const existing = resultMap.get(key)!;
      if (hari && !existing.hariList.some(h => h.toLowerCase() === hari.toLowerCase())) {
        existing.hariList.push(hari);
      }
      if (hari && !existing.jadwalByHari[hari]) {
        existing.jadwalByHari[hari] = { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai };
      }
    }
  }

  for (const g of myGm) {
    const rawM = (g.nama_mapel || g.mapel_singkat || '').trim();
    const kls = (g.kelas || (rawM.includes('_') ? rawM.split('_')[0].trim() : '')).trim();
    if (!rawM || isInvalidMapel(rawM)) continue;

    const { finalId, finalNama, finalSingkat, finalKelas } = resolveCanonicalMapel(kls, rawM);
    const key = `${finalNama.toLowerCase()}__${finalKelas.toLowerCase()}`;

    if (!resultMap.has(key)) {
      const matchedHariList: string[] = [];
      const jadwalByHari: Record<string, { jam_mulai?: string | null; jam_selesai?: string | null }> = {};
      for (const j of myJadwal) {
        if (isJurnalMatchJadwal({ kelas: finalKelas, mapel: finalNama }, j)) {
          const h = (j.hari || '').trim();
          if (h && !matchedHariList.some(x => x.toLowerCase() === h.toLowerCase())) {
            matchedHariList.push(h);
            jadwalByHari[h] = { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai };
          }
        }
      }
      resultMap.set(key, {
        id: String(g.mapel_id || g.id || finalId),
        mapel_id: String(g.mapel_id || g.id || finalId),
        nama_mata_pelajaran: finalNama,
        nama_mapel: finalNama,
        mapel_singkat: g.mapel_singkat || finalSingkat,
        kelas: finalKelas,
        hariList: matchedHariList,
        jadwalByHari,
      });
    }
  }

  if (dataGuruRow?.mata_pelajaran) {
    const tokens = String(dataGuruRow.mata_pelajaran)
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s && !isInvalidMapel(s));
    for (const token of tokens) {
      const kls = token.includes('_') ? token.split('_')[0].trim() : '';
      const { finalId, finalNama, finalSingkat, finalKelas } = resolveCanonicalMapel(kls, token);
      const key = `${finalNama.toLowerCase()}__${finalKelas.toLowerCase()}`;
      if (!resultMap.has(key)) {
        const matchedHariList: string[] = [];
        const jadwalByHari: Record<string, { jam_mulai?: string | null; jam_selesai?: string | null }> = {};
        for (const j of myJadwal) {
          if (isJurnalMatchJadwal({ kelas: finalKelas, mapel: finalNama }, j)) {
            const h = (j.hari || '').trim();
            if (h && !matchedHariList.some(x => x.toLowerCase() === h.toLowerCase())) {
              matchedHariList.push(h);
              jadwalByHari[h] = { jam_mulai: j.jam_mulai, jam_selesai: j.jam_selesai };
            }
          }
        }
        resultMap.set(key, {
          id: finalId,
          mapel_id: finalId,
          nama_mata_pelajaran: finalNama,
          nama_mapel: finalNama,
          mapel_singkat: finalSingkat,
          kelas: finalKelas,
          hariList: matchedHariList,
          jadwalByHari,
        });
      }
    }
  }

  return Array.from(resultMap.values()).sort((a, b) =>
    a.nama_mata_pelajaran.localeCompare(b.nama_mata_pelajaran)
  );
}

/**
 * Memfilter daftar mapel guru berdasarkan hari KBM aktif.
 * Jika guru memiliki jadwal pada hari tersebut, hanya mapel pada hari tersebut yang ditampilkan
 * (ditambah mapel yang sedang dipilih dari draf/revisi jika ada).
 * Jika tidak ada jadwal pada hari tersebut, mengembalikan seluruh penugasan guru sebagai fallback.
 */
export function filterGuruMapelByHari(
  allAssignments: ConnectedGuruMapelItem[],
  hari?: string,
  preserveSelectedMapel?: string
): ConnectedGuruMapelItem[] {
  if (!allAssignments || allAssignments.length === 0) return [];
  if (!hari) return allAssignments;

  const normHari = hari.trim().toLowerCase();
  const scheduledToday = allAssignments.filter(
    item => Array.isArray(item.hariList) && item.hariList.some(h => h.trim().toLowerCase() === normHari)
  );

  if (scheduledToday.length === 0) {
    return allAssignments;
  }

  if (preserveSelectedMapel) {
    const alreadyIn = scheduledToday.some(
      m => m.nama_mata_pelajaran === preserveSelectedMapel || m.nama_mapel === preserveSelectedMapel
    );
    if (!alreadyIn) {
      const preserved = allAssignments.find(
        m => m.nama_mata_pelajaran === preserveSelectedMapel || m.nama_mapel === preserveSelectedMapel
      );
      if (preserved) {
        return [...scheduledToday, preserved];
      }
    }
  }

  return scheduledToday;
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
    jurnalBK: [],
    isBlok: false,
    blokInfo: null,
    canOpenPiket: false,
    canOpenJurnal: false,
    canPresensiPulang: false,
    lockedReason: null,
    aturanKehadiran: 'Semua_Hari',
    isNonTeachingDay: false,
    isBk: false,
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
    let jamPulangMulai = '11:00';
    let jamPulangJumat = '11:00';
    let jamPulangAkhir = '22:00';
    let jamDatangMulai = '06:45';
    let jamDatangBatas = '07:15';
    let jamDatangAkhir = '08:00';

    if (pengaturanRows && pengaturanRows.length > 0) {
      const hsRow = pengaturanRows.find((p: any) => p.key === 'hari_sekolah');
      if (hsRow && hsRow.value) {
        hariSekolah = parseInt(hsRow.value, 10) || 6;
      }
      aturanKehadiran = resolveSchoolAturanKehadiran(pengaturanRows);
      guruHanyaMengajarList = resolveSchoolLegacyGhmList(pengaturanRows);
      const jpm = pengaturanRows.find((p: any) => p.key === 'jam_pulang_mulai');
      if (jpm && jpm.value) jamPulangMulai = jpm.value;
      const jpj = pengaturanRows.find((p: any) => p.key === 'jam_pulang_jumat');
      if (jpj && jpj.value) jamPulangJumat = jpj.value;
      else if (pengaturanRows.some((p: any) => (p as any).jam_pulang_jumat)) {
        const jRow = pengaturanRows.find((p: any) => (p as any).jam_pulang_jumat);
        if ((jRow as any)?.jam_pulang_jumat) jamPulangJumat = (jRow as any).jam_pulang_jumat;
      }
      const jpa = pengaturanRows.find((p: any) => p.key === 'jam_pulang_akhir');
      if (jpa && jpa.value) jamPulangAkhir = jpa.value;
      const jdm = pengaturanRows.find((p: any) => p.key === 'jam_datang_mulai');
      if (jdm && jdm.value) jamDatangMulai = jdm.value;
      const jdb = pengaturanRows.find((p: any) => p.key === 'jam_datang_batas');
      if (jdb && jdb.value) jamDatangBatas = jdb.value;
      const jda = pengaturanRows.find((p: any) => p.key === 'jam_datang_akhir');
      if (jda && jda.value) jamDatangAkhir = jda.value;
    }

    const isHariJumat = getWitaDayName(now) === 'Jumat';
    const effectivePulangMulai = isHariJumat ? (jamPulangJumat || jamPulangMulai) : jamPulangMulai;

    state.jamPresensi = {
      datangMulai: jamDatangMulai,
      datangBatas: jamDatangBatas,
      datangAkhir: jamDatangAkhir,
      pulangMulai: jamPulangMulai,
      pulangJumat: jamPulangJumat,
      pulangAkhir: jamPulangAkhir,
      effectivePulangMulai,
    };

    // Cek Pengecualian Kehadiran Guru & tautkan data_guru walaupun kolom user_id absen atau nama berbeda tipis:
    let isTeacherExempt = false;
    let isTeacherBk = false;
    let isTeacherTu = false;
    let isNonKbmOrTu = false;
    let teacherDataGuruId: string | null = null;
    let teacherDataGuruNip: string | null = null;
    let teacherCanonicalNama: string | null = null;
    let explicitTeacherSetting: boolean | null = null;
    try {
      let tQ = supabase.from('data_guru').select('*');
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
      const { data: tDataRaw, error: tErrQuery } = await tQ;
      let tData = tDataRaw;
      if (tErrQuery || !tData || tData.length === 0) {
        let fbTQ = supabase.from('data_guru').select('*');
        if (sekolahId) fbTQ = fbTQ.eq('sekolah_id', sekolahId);
        const fbRes = await fbTQ;
        const allSchoolTeachers = Array.isArray(fbRes.data) ? fbRes.data : [];
        tData = allSchoolTeachers.filter((teacher: any) =>
          isTeacherRecordMatch(
            { user_id: userId, nama_guru: namaGuru, nip: username, username },
            teacher,
            { id: userId, nama: namaGuru, username }
          )
        );
      }
      if (tData && tData.length > 0) {
        for (const teacher of tData) {
          if (!teacherDataGuruId && teacher.id) teacherDataGuruId = String(teacher.id);
          if (!teacherDataGuruNip && teacher.nip) teacherDataGuruNip = String(teacher.nip);
          if (!teacherCanonicalNama && teacher.nama_guru) teacherCanonicalNama = String(teacher.nama_guru).trim();
          if (isBkAccount(teacher.mata_pelajaran)) {
            isTeacherBk = true;
          }
          if (isTuAccount(teacher.mata_pelajaran)) {
            isTeacherTu = true;
          }
          const parsedFlag = parseExplicitBooleanFlag(teacher.wajib_hadir_hanya_mengajar);
          if (parsedFlag !== null) {
            explicitTeacherSetting = parsedFlag;
          }
          if (parsedFlag === true) {
            isTeacherExempt = true;
          }
          if (
            guruHanyaMengajarList.includes(teacher.id) ||
            (teacher.user_id && guruHanyaMengajarList.includes(teacher.user_id)) ||
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

    let fetchedUserRecord: any = null;
    if ((userId || username)) {
      try {
        let uQ = supabase.from('users').select('id, nama, username, role');
        if (userId) uQ = uQ.eq('id', userId);
        else if (username) uQ = uQ.eq('username', username);
        const { data: uData } = await uQ;
        if (uData && uData.length > 0) {
          fetchedUserRecord = uData[0];
          if (!isTeacherBk && isBkAccount(uData[0].role)) {
            isTeacherBk = true;
          }
          if (isTuAccount(undefined, uData[0].role)) {
            isTeacherTu = true;
          }
        }
      } catch (_) {}
    }
    state.isBk = isTeacherBk;

    if (
      (userId && guruHanyaMengajarList.includes(userId)) ||
      guruHanyaMengajarList.includes(namaGuru) ||
      (username && guruHanyaMengajarList.includes(username))
    ) {
      isTeacherExempt = true;
    }

    // Determine total teaching assignments across the school timetable
    let totalTeacherKbmCount = 0;
    if (!isTeacherTu) {
      try {
        let allJadwalQ = supabase.from('jadwal_pelajaran').select('*');
        if (sekolahId) allJadwalQ = allJadwalQ.eq('sekolah_id', sekolahId);
        const { data: allJadwalData, error: jErr } = await allJadwalQ;
        let schedules = (allJadwalData && !jErr) ? allJadwalData : [];
        if (schedules.length === 0 && sekolahId) {
          const fbRes = await supabase.from('jadwal_pelajaran').select('*');
          if (Array.isArray(fbRes.data)) schedules = fbRes.data;
        }
        if (schedules && schedules.length > 0) {
          totalTeacherKbmCount = schedules.filter((j: any) =>
            !isInvalidMapel(j.mata_pelajaran || j.mapel) &&
            isTeacherRecordMatch(
              j,
              { nama_guru: teacherCanonicalNama || namaGuru, nama: namaGuru, user_id: userId, id: teacherDataGuruId, nip: teacherDataGuruNip || username, username },
              fetchedUserRecord || { id: userId, nama: namaGuru, username },
              { allowSingleWordFirstToken: true }
            )
          ).length;
        }
      } catch (_) {}
    }

    isNonKbmOrTu = isTeacherTu || totalTeacherKbmCount === 0;

    const policy = resolveTeacherAttendancePolicy({
      teacher: {
        id: teacherDataGuruId,
        user_id: userId,
        nama_guru: teacherCanonicalNama || namaGuru,
        nama: namaGuru,
        nip: teacherDataGuruNip || username,
        username,
        mata_pelajaran: isTeacherTu ? 'Tata Usaha' : '',
        wajib_hadir_hanya_mengajar: explicitTeacherSetting,
      },
      linkedUser: fetchedUserRecord || { id: userId, nama: namaGuru, username },
      totalTeacherKbmCount,
      aturanGlobal: aturanKehadiran,
      guruHanyaMengajarList,
    });
    if (explicitTeacherSetting === false) {
      isTeacherExempt = false;
    } else if (explicitTeacherSetting === true) {
      isTeacherExempt = true;
    } else {
      isTeacherExempt = policy.isTeacherExempt;
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
      let matchedBlock: SistemBlok | undefined;
      const teacherMatches = activeBloks.some(b => {
        if (b.tipe_target === 'sekolah' || (b.tipe_target as any) === 'keseluruhan' || !b.tipe_target) {
          matchedBlock = b;
          return true;
        }
        if (b.tipe_target === 'guru') {
          const evalResult = evaluateScheduleBlock({}, teacherRef, [b]);
          if (evalResult.isBlocked) {
            matchedBlock = b;
            return true;
          }
        }
        return false;
      });
      if (teacherMatches && matchedBlock) {
        state.isBlok = true;
        state.blokInfo = {
          id: matchedBlock.id,
          nama_kegiatan: matchedBlock.nama_kegiatan,
          deskripsi: matchedBlock.deskripsi,
          tanggal_mulai: matchedBlock.tanggal_mulai,
          tanggal_selesai: matchedBlock.tanggal_selesai,
        };
      } else {
        state.blokInfo = null;
      }
    } else if (!hasBlocked) {
      state.blokInfo = null;
    } else {
      const firstBlockedRule = state.jadwalKBM.find((jk: any) => jk.isBlocked)?.blockRule;
      if (firstBlockedRule) {
        state.blokInfo = {
          id: firstBlockedRule.id,
          nama_kegiatan: firstBlockedRule.nama_kegiatan,
          deskripsi: firstBlockedRule.deskripsi,
          tanggal_mulai: firstBlockedRule.tanggal_mulai,
          tanggal_selesai: firstBlockedRule.tanggal_selesai,
        };
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
          if (
            isGuruDiPiket(piketHariIni.daftar_guru, namaGuru) ||
            isGuruDiPiket(piketHariIni.daftar_guru, cleanTeacherName) ||
            (teacherCanonicalNama && isGuruDiPiket(piketHariIni.daftar_guru, teacherCanonicalNama))
          ) {
            state.isPiket = true;
          }
        }
      }
    }

    const teacherIdentityProfile = {
      id: teacherDataGuruId,
      user_id: userId,
      nama_guru: teacherCanonicalNama || namaGuru,
      nama: namaGuru,
      nip: teacherDataGuruNip,
      username
    };
    const teacherLinkedUser = {
      id: userId,
      nama: namaGuru,
      username
    };
    const teacherFirstToken = (normalizeTeacherIdentityName(cleanTeacherName).split(' ')[0] || cleanTeacherName).trim();

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

    const { data: allPresensiRaw, error: presensiErr } = await presensiQuery;
    let allPresensi = allPresensiRaw;
    const hasNameAliasDiff = Boolean(
      teacherCanonicalNama &&
      normalizeTeacherIdentityName(teacherCanonicalNama) !== normalizeTeacherIdentityName(cleanTeacherName)
    );
    if ((presensiErr || !allPresensi || allPresensi.length === 0 || hasNameAliasDiff) && (cleanTeacherName || teacherFirstToken)) {
      const needle = teacherFirstToken.length >= 2 ? teacherFirstToken : cleanTeacherName;
      let fbPresensiQuery = supabase.from('presensi_guru').select('*').order('timestamp', { ascending: false }).limit(50);
      if (sekolahId) fbPresensiQuery = fbPresensiQuery.eq('sekolah_id', sekolahId);
      fbPresensiQuery = fbPresensiQuery.ilike('nama_guru', `%${needle}%`);
      const fbRes = await fbPresensiQuery;
      const fbFiltered = (fbRes.data || []).filter((p: any) =>
        isTeacherRecordMatch(p, teacherIdentityProfile, teacherLinkedUser)
      );
      if (presensiErr || !allPresensi || allPresensi.length === 0) {
        allPresensi = fbFiltered;
      } else if (fbFiltered.length > 0) {
        const seenP = new Set(allPresensi.map((p: any) => p.id));
        allPresensi = [...allPresensi, ...fbFiltered.filter((p: any) => !seenP.has(p.id))];
      }
    }

    if (allPresensi) {
      // Filter presensi hari ini - handle berbagai format timestamp
      const todayPresensi = allPresensi.filter((p: any) => {
        const ts = p.timestamp || '';
        // Format 1: "YYYY-MM-DD HH:mm:ss" -> ambil YYYY-MM-DD
        if (extractWitaDateStr(ts) === todayStr || ts.startsWith(todayStr)) return true;
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
        const isLeaveType = !isLateArrival(p) && (p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit' || p.jenis_presensi === 'Cuti' || p.detail_izin === 'Sakit' || p.detail_izin === 'Cuti' || (Boolean(p.detail_izin) && (p.detail_izin.includes('Izin') || p.detail_izin.includes('Cuti'))));
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
    if (jp === 'Alpa' || state.presensiDatang?.status_verifikasi === 'Alpa') {
      state.isAlpa = true;
      state.bebasAlpa = false;
      state.canPresensiPulang = false;
      state.lockedReason = 'Anda tercatat Alpa hari ini (tidak melakukan presensi datang dan pulang).';
      return state;
    }

    if (state.activeLeaveRecord || jp === 'Izin' || jp === 'Sakit' || jp === 'Cuti') {
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

      const { data: lpRaw, error: lpErr } = await piketQuery;
      let lp = lpRaw;
      if ((lpErr || !lp || lp.length === 0 || hasNameAliasDiff) && (teacherFirstToken || cleanTeacherName)) {
        const needle = teacherFirstToken.length >= 2 ? teacherFirstToken : cleanTeacherName;
        let fbPiketQuery = supabase.from('laporan_piket').select('*').eq('tanggal', todayStr);
        if (sekolahId) fbPiketQuery = fbPiketQuery.eq('sekolah_id', sekolahId);
        fbPiketQuery = fbPiketQuery.ilike('guru_pelapor', `%${needle}%`);
        const fbRes = await fbPiketQuery;
        if (Array.isArray(fbRes.data)) {
          lp = fbRes.data.filter((l: any) =>
            isTeacherRecordMatch(l, teacherIdentityProfile, teacherLinkedUser)
          );
        }
      }
      
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
    
    if (userId && teacherFirstToken) {
      jurnalQuery = jurnalQuery.or(`user_id.eq.${userId},nama_guru.ilike."%${cleanTeacherName}%",keterangan.ilike."%Menggantikan:%${teacherFirstToken}%"`);
    } else if (userId) {
      jurnalQuery = jurnalQuery.or(`user_id.eq.${userId},nama_guru.ilike."%${cleanTeacherName}%"`);
    } else if (teacherFirstToken) {
      jurnalQuery = jurnalQuery.or(`nama_guru.ilike."%${cleanTeacherName}%",keterangan.ilike."%Menggantikan:%${teacherFirstToken}%"`);
    } else {
      jurnalQuery = jurnalQuery.ilike('nama_guru', `%${cleanTeacherName}%`);
    }

    const { data: jurnalRaw, error: jurnalErr } = await jurnalQuery;
    let jurnal = jurnalRaw;
    if ((jurnalErr || !jurnal || jurnal.length === 0 || hasNameAliasDiff) && (teacherFirstToken || cleanTeacherName)) {
      const needle = teacherFirstToken.length >= 2 ? teacherFirstToken : cleanTeacherName;
      let fbJurnalQuery = supabase.from('jurnal_pembelajaran').select('*').eq('tanggal', todayStr);
      if (sekolahId) fbJurnalQuery = fbJurnalQuery.eq('sekolah_id', sekolahId);
      fbJurnalQuery = fbJurnalQuery.or(`nama_guru.ilike."%${needle}%",keterangan.ilike."%Menggantikan:%${needle}%"`);
      const fbRes = await fbJurnalQuery;
      if (Array.isArray(fbRes.data)) {
        jurnal = fbRes.data.filter((j: any) =>
          isTeacherRecordMatch(j, teacherIdentityProfile, teacherLinkedUser)
        );
      }
    }

    if (jurnal) {
      // Separate rejected jurnal entries — they must be re-submitted
      const rejectedJurnal = jurnal.filter((j: any) => j.status_verifikasi === 'Ditolak');
      const acceptedJurnal = jurnal.filter((j: any) => j.status_verifikasi !== 'Ditolak');

      state.jurnalDitolak = rejectedJurnal;

      // Handle legacy data: keterangan bisa "-" atau "Jurnal KBM" atau "Jurnal Kegiatan" (termasuk INVAL prefix)
      // mapel bisa "Jurnal Kegiatan" untuk jurnal kegiatan legacy
      state.jurnalKBM = acceptedJurnal.filter((j: any) => {
        // Exclude delinquency auto-records
        if (j.status_verifikasi === 'Tidak Masuk Kelas' || (j.keterangan || '').toLowerCase() === 'tidak masuk kelas' || (j.materi || '').toLowerCase() === 'tidak masuk kelas') return false;
        // Jurnal KBM jika keterangan === 'Jurnal KBM' atau memuat 'Jurnal KBM' (termasuk prefix INVAL)
        if (j.keterangan === 'Jurnal KBM' || (j.keterangan && j.keterangan.includes('Jurnal KBM'))) return true;
        if (j.mapel === 'Jurnal Kegiatan') return false;
        if (j.keterangan === 'Jurnal Kegiatan' || (j.keterangan && j.keterangan.includes('Jurnal Kegiatan'))) return false;
        // Legacy data: keterangan = "-" dan mapel berisi kelas_mapel -> ini adalah KBM
        if ((j.keterangan === '-' || !j.keterangan) && j.mapel && j.mapel !== 'Jurnal Kegiatan') return true;
        return false;
      });
      
      state.jurnalKegiatan = acceptedJurnal.find((j: any) => {
        return (j.keterangan && j.keterangan.includes('Jurnal Kegiatan')) || j.mapel === 'Jurnal Kegiatan';
      }) || null;
    }

    // 5b. Cek Jurnal BK untuk Guru BK (atau pemilik layanan Bimbingan & Konseling)
    if (isTeacherBk) {
      try {
        let bkQuery = supabase
          .from('jurnal_bk')
          .select('*')
          .eq('tanggal', todayStr);

        if (sekolahId) {
          bkQuery = bkQuery.eq('sekolah_id', sekolahId);
        }

        const bkOwnerId = userId || teacherDataGuruId;
        if (bkOwnerId && cleanTeacherName) {
          bkQuery = bkQuery.or(`guru_id.eq.${bkOwnerId},nama_guru.ilike."%${cleanTeacherName}%"`);
        } else if (bkOwnerId) {
          bkQuery = bkQuery.eq('guru_id', bkOwnerId);
        } else if (cleanTeacherName) {
          bkQuery = bkQuery.ilike('nama_guru', `%${cleanTeacherName}%`);
        }

        const { data: bkRaw, error: bkErr } = await bkQuery;
        let bkEntries: any[] = Array.isArray(bkRaw) ? bkRaw : [];

        if ((bkErr && !isSchemaCacheOrMissingTableError(bkErr)) || (!bkErr && bkEntries.length === 0 && (hasNameAliasDiff || teacherFirstToken.length >= 2))) {
          const bkNeedle = teacherFirstToken.length >= 2 ? teacherFirstToken : cleanTeacherName;
          if (bkNeedle) {
            let fbBkQuery = supabase.from('jurnal_bk').select('*').eq('tanggal', todayStr);
            if (sekolahId) fbBkQuery = fbBkQuery.eq('sekolah_id', sekolahId);
            fbBkQuery = fbBkQuery.ilike('nama_guru', `%${bkNeedle}%`);
            const fbRes = await fbBkQuery;
            if (Array.isArray(fbRes.data)) {
              bkEntries = fbRes.data.filter((b: any) =>
                isTeacherRecordMatch(b, teacherIdentityProfile, teacherLinkedUser)
              );
            }
          }
        }

        // Merge localStorage fallback/offline cache if running in browser
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            const cacheKey = `sipjam_jurnal_bk_cache_${sekolahId || 'default'}`;
            const cachedRaw = window.localStorage.getItem(cacheKey);
            if (cachedRaw) {
              const cachedList = JSON.parse(cachedRaw);
              if (Array.isArray(cachedList)) {
                const seenIds = new Set(bkEntries.map((item: any) => item.id));
                for (const item of cachedList) {
                  if (!item || seenIds.has(item.id) || item.tanggal !== todayStr) continue;
                  if (isTeacherRecordMatch(item, teacherIdentityProfile, teacherLinkedUser)) {
                    bkEntries.push(item);
                    seenIds.add(item.id);
                  }
                }
              }
            }
          } catch (_) {
            // ignore storage parse error
          }
        }

        const rejectedBk = bkEntries
          .filter((b: any) => b.status_verifikasi === 'Ditolak')
          .map((b: any) => ({
            ...b,
            _sourceTable: 'jurnal_bk',
            isJurnalBk: true,
            mapel: `Jurnal BK (${b.bidang_bimbingan || 'Konseling'})`,
          }));
        const acceptedBk = bkEntries.filter((b: any) => b.status_verifikasi !== 'Ditolak');

        state.jurnalBK = acceptedBk;
        if (rejectedBk.length > 0) {
          state.jurnalDitolak = [...(state.jurnalDitolak || []), ...rejectedBk];
        }
      } catch (bkLoadErr) {
        console.warn('Error loading jurnal_bk in workflow:', bkLoadErr);
      }
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
    } else if (state.isBk || isTeacherBk) {
      isJurnalDone = true;
    } else if (state.isBlok || state.isDinasLuar || state.jadwalKBM.length === 0) {
      if (state.jurnalKegiatan) isJurnalDone = true;
      else if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
      else if (!isNonKbmOrTu && state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
      // Invariant preservation for legacy test suites:
      // if (isTeacherExempt && state.jadwalKBM.length === 0) isJurnalDone = true;
      // if (state.jadwalKBM.length === 0 && state.isPiket) isJurnalDone = true;
    } else {
      // Evaluasi jadwal reguler dan jadwal yang terblokir
      const unblockedSchedules = state.jadwalKBM.filter((jk: any) => !jk.isBlocked);
      const blockedSchedules = state.jadwalKBM.filter((jk: any) => jk.isBlocked);

      const unblockedFulfilled = unblockedSchedules.every(jk => 
        state.jurnalKBM.some(j => j.status_verifikasi !== 'Tidak Masuk Kelas' && isJurnalMatchJadwal(j, jk) && (!(j.materi === '-' && j.kegiatan === '-') || hasJournalContent(j)))
      );
      const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

      if (unblockedFulfilled && blockedFulfilled) {
        isJurnalDone = true;
      }
    }

    let isPiketDone = true;
    if (state.isPiket && !state.laporanPiket) {
      isPiketDone = false;
    }

    if (isJurnalDone && isPiketDone) {
      state.canPresensiPulang = true;
      state.lockedReason = null;
    } else {
      state.canPresensiPulang = false;
      const missing = [];
      if (!isPiketDone) missing.push('Laporan Piket');
      if (!isJurnalDone) missing.push(state.isBlok ? 'Jurnal Kegiatan (Sistem Blok)' : 'Jurnal (KBM/Kegiatan)');
      state.lockedReason = `Anda belum menyelesaikan: ${missing.join(', ')}`;
    }

  } catch (error) {
    console.error("Workflow check error", error);
  }

  return state;
}

/**
 * Cek apakah guru diizinkan melakukan presensi pulang.
 * Presensi pulang dapat dilakukan jika guru telah tercatat presensi datang,
 * tidak sedang izin/sakit, dan semua tugas (laporan piket & jurnal) sudah terisi/selesai.
 */
export function canTeacherPresensiPulang(state: Partial<GuruDailyState>): boolean {
  if (!state.presensiDatang) return false;
  if (state.isIzinSakit) return false;
  if (state.isLibur) return false;
  if (state.isAlpa || state.presensiDatang?.jenis_presensi === 'Alpa' || state.presensiDatang?.status_verifikasi === 'Alpa') return false;

  // Jika state sudah dihitung lengkap oleh workflow
  if (typeof state.canPresensiPulang === 'boolean') {
    return state.canPresensiPulang;
  }

  // Evaluasi piket
  let isPiketDone = true;
  if (state.isPiket && !state.laporanPiket) {
    isPiketDone = false;
  }
  if (!isPiketDone) return false;

  // Evaluasi jurnal
  const rawRole = ((state as any).role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const rawMapel = ((state as any).mata_pelajaran || (state as any).mataPelajaran || '').toLowerCase();
  const isBkState = Boolean(state.isBk) ||
    rawRole === 'bk' || rawRole === 'gurubk' || rawRole === 'bimbingankonseling' || rawRole === 'bimbingandankonseling' ||
    rawMapel.includes('bimbingan konseling') || rawMapel.includes('bimbingan dan konseling') || rawMapel.trim() === 'bk';

  if (state.isNonTeachingDay || isBkState) {
    return true;
  }

  const isTeacherExempt = state.aturanKehadiran === 'Hari_Mengajar_Saja';
  if (state.isBlok || state.isDinasLuar || !state.jadwalKBM || state.jadwalKBM.length === 0) {
    if (state.jurnalKegiatan) return true;
    if (isTeacherExempt && (!state.jadwalKBM || state.jadwalKBM.length === 0)) return true;
    // Non-exempt teachers without KBM and TU staff must submit Jurnal Kegiatan
    return false;
  }

  const unblockedSchedules = (state.jadwalKBM || []).filter((jk: any) => !jk.isBlocked);
  const blockedSchedules = (state.jadwalKBM || []).filter((jk: any) => jk.isBlocked);

  const unblockedFulfilled = unblockedSchedules.every((jk: any) => 
    (state.jurnalKBM || []).some((j: any) => j.status_verifikasi !== 'Tidak Masuk Kelas' && isJurnalMatchJadwal(j, jk) && (!(j.materi === '-' && j.kegiatan === '-') || hasJournalContent(j)))
  );
  const blockedFulfilled = blockedSchedules.length === 0 || Boolean(state.jurnalKegiatan);

  return unblockedFulfilled && blockedFulfilled;
}

/**
 * Helper untuk mengevaluasi status waktu presensi pulang hari ini.
 * - isBefore: true jika jam saat ini belum mencapai jam buka presensi pulang (belum sampai presensi pulang)
 * - isOpen: true jika jam saat ini berada dalam rentang jam buka s.d. jam tutup presensi pulang
 * - isAfter: true jika jam saat ini telah melewati batas akhir presensi pulang
 */
export function evaluatePresensiPulangTiming(
  jamPresensi?: GuruDailyState['jamPresensi'] | null,
  customNow?: Date
): {
  isBefore: boolean;
  isOpen: boolean;
  isAfter: boolean;
  effectivePulangMulai: string;
  pulangAkhir: string;
} {
  const effectivePulangMulai = jamPresensi?.effectivePulangMulai || jamPresensi?.pulangMulai || '11:00';
  const pulangAkhir = jamPresensi?.pulangAkhir || '22:00';

  const currentTimeStr = getWitaTimeStr(customNow || new Date());
  const currentMinutes = parseTimeToMinutes(currentTimeStr);
  const startMinutes = parseTimeToMinutes(effectivePulangMulai);
  const endMinutes = parseTimeToMinutes(pulangAkhir);

  const isBefore = currentMinutes < startMinutes;
  const isAfter = currentMinutes > endMinutes;
  const isOpen = !isBefore && !isAfter;

  return {
    isBefore,
    isOpen,
    isAfter,
    effectivePulangMulai,
    pulangAkhir,
  };
}



