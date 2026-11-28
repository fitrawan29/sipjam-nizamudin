'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, getActiveTargetSchool } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaTimestamp, formatTimestampWita } from '@/lib/wita';
import { BankDokumen, DataGuru, GuruMapel, SyaratPerangkatPembelajaranRow } from '@/types/database';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import { isInvalidMapel, normalizeScheduleMapel } from '@/lib/dataIntegrityGuard';

export const NIZAMUDIN_SEKOLAH_ID = 'a0000000-0000-0000-0000-000000000001';
export const TUTUYAN_SEKOLAH_ID = 'fd7f077e-5fc6-4f3b-b375-21c6be89b492';

const NON_CLASS_KATEGORI_REGEX = /^(umum|wajib|peminatan|pilihan|kejuruan|muatan\s*lokal|mulok|-)$/i;

/**
 * Multi-tenant cross-school guard between SMA Nizamudin (X Merdeka, XI Merdeka, XII Merdeka)
 * and SMAN 1 Tutuyan (X Merdeka A..G, XI Merdeka A..F, XII Merdeka A..F).
 */
export function isCrossTenantMapelOrKelas(
  rawMapel?: string | null,
  rawKelas?: string | null,
  sekolahId?: string | null,
  validClasses: string[] = []
): boolean {
  const m = (rawMapel || '').trim();
  const k = (rawKelas || '').trim();
  const prefixKelas = m.includes('_') ? m.split('_')[0].trim() : '';
  const candidates = [k, prefixKelas].filter(Boolean);
  if (candidates.length === 0) return false;

  const sid = (sekolahId || '').trim().toLowerCase();
  const hasLetterParallelInSchool =
    sid === TUTUYAN_SEKOLAH_ID ||
    (validClasses.length > 0 && validClasses.every(c => /^(X|XI|XII)\s+Merdeka\s+[A-Z]\b/i.test(c.trim())));
  const hasBareMerdekaInSchool =
    sid === NIZAMUDIN_SEKOLAH_ID ||
    (validClasses.length > 0 && validClasses.every(c => /^(X|XI|XII)\s+Merdeka$/i.test(c.trim())));

  for (const cls of candidates) {
    if (hasBareMerdekaInSchool && /^(X|XI|XII)\s+Merdeka\s+[A-Z]\b/i.test(cls)) {
      return true;
    }
    if (hasLetterParallelInSchool && /^(X|XI|XII)\s+Merdeka$/i.test(cls)) {
      return true;
    }
  }
  return false;
}

export const KURIKULUM_DOCS = [
  { id: 'CP', code: 'CP', name: 'Analisis Capaian Pembelajaran', short: 'CP' },
  { id: 'ATP', code: 'ATP', name: 'Alur Tujuan Pembelajaran', short: 'ATP' },
  { id: 'RPE', code: 'RPE', name: 'Rencana Pekan Efektif', short: 'RPE' },
  { id: 'Prota', code: 'Prota', name: 'Program Tahunan', short: 'Prota' },
  { id: 'Promes', code: 'Promes', name: 'Program Semester', short: 'Promes' },
  { id: 'RPM', code: 'RPM', name: 'Rencana Pembelajaran Mendalam', short: 'RPM' }
] as const;

/**
 * Normalisasi dan ekstraksi tingkat/jenjang kelas dari string kelas.
 * Contoh: "X Merdeka 1" -> "X", "10A" -> "X", "XI Merdeka 2" -> "XI", "XII IPA 1" -> "XII",
 *         "7A" / "VII-B" -> "VII", "8.1" / "VIII-A" -> "VIII", "9.2" / "IX-A" -> "IX",
 *         "1A" -> "1", dst.
 */
export function extractTingkat(kelasStr?: string | null): string {
  if (!kelasStr) return '';
  const k = kelasStr.trim();
  // SMA/SMK
  if (/\bxii\b/i.test(k) || /\b12\b/i.test(k) || /(?:^|\D)12(?!\d)/i.test(k)) return 'XII';
  if (/\bxi\b/i.test(k) || /\b11\b/i.test(k) || /(?:^|\D)11(?!\d)/i.test(k)) return 'XI';
  if (/\bx\b/i.test(k) || /\b10\b/i.test(k) || /(?:^|\D)10(?!\d)/i.test(k)) return 'X';
  // SMP
  if (/\bix\b/i.test(k) || /\b9\b/i.test(k) || /(?:^|\D)9(?!\d)/i.test(k)) return 'IX';
  if (/\bviii\b/i.test(k) || /\b8\b/i.test(k) || /(?:^|\D)8(?!\d)/i.test(k)) return 'VIII';
  if (/\bvii\b/i.test(k) || /\b7\b/i.test(k) || /(?:^|\D)7(?!\d)/i.test(k)) return 'VII';
  // SD (1-6)
  const digitMatch = k.match(/(?:^|\D)([1-6])(?!\d)/);
  if (digitMatch) return digitMatch[1];
  if (/\bvi\b/i.test(k)) return 'VI';
  if (/\bv\b/i.test(k)) return 'V';
  if (/\biv\b/i.test(k)) return 'IV';
  if (/\biii\b/i.test(k)) return 'III';
  if (/\bii\b/i.test(k)) return 'II';
  if (/\bi\b/i.test(k)) return 'I';

  return k.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Normalizes name strings by removing academic and honorary titles and unifying spelling.
 */
export function normalizeTeacherToken(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(',')[0] // remove trailing degrees after comma
    .replace(/\b(dr|drs|dra|ir|prof|h|hj|kh|ust|ustadz|ustadzah|s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b\.?/gi, '')
    .replace(/z/g, 's') // Normalize Rizki <-> Riski, Azhar <-> Ashar
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenized / fuzzy teacher name matching.
 * Accurately matches "Ade" <-> "Ade Fitrawan Ibrahim", "Ambar" <-> "Setia Ambar Ningsih Mamonto", etc.
 */
export function isTeacherNameMatch(
  teacherName?: string | null,
  candidateName?: string | null
): boolean {
  if (!teacherName || !candidateName) return false;
  const n1 = normalizeTeacherToken(teacherName);
  const n2 = normalizeTeacherToken(candidateName);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;

  // Word-boundary prefix matching (prevents "fitra" matching "fitrawan"/"fitri")
  if (n1.startsWith(n2 + ' ') || n2.startsWith(n1 + ' ')) return true;

  // Tokenized matching
  const tokens1 = n1.split(' ').filter(t => t.length >= 2);
  const tokens2 = n2.split(' ').filter(t => t.length >= 2);
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  if (tokens1.length === 1) {
    return tokens2[0] === tokens1[0] || (tokens1[0].length >= 4 && tokens2.includes(tokens1[0]));
  }
  if (tokens2.length === 1) {
    return tokens1[0] === tokens2[0] || (tokens2[0].length >= 4 && tokens1.includes(tokens2[0]));
  }

  const all1In2 = tokens1.every(t => tokens2.includes(t));
  const all2In1 = tokens2.every(t => tokens1.includes(t));
  return all1In2 || all2In1;
}

/**
 * Multi-factor teacher entity matching (name, nip/nickname, user_id, sekolah_id).
 */
export function isTeacherEntityMatch(
  teacher: any,
  candidateName?: string | null,
  candidateNip?: string | null,
  candidateUserId?: string | null,
  candidateSekolahId?: string | null
): boolean {
  if (!teacher) return false;
  if (teacher.sekolah_id && candidateSekolahId && teacher.sekolah_id !== candidateSekolahId) {
    return false;
  }

  const tUid = (teacher.user_id || teacher.id || '').trim();
  const cUid = (candidateUserId || '').trim();
  if (cUid && tUid && (cUid === teacher.user_id || cUid === teacher.id)) return true;

  const tNip = (teacher.nip || '').trim().toLowerCase();
  const cNip = (candidateNip || '').trim().toLowerCase();
  const hasRealTNip = Boolean(tNip && tNip !== '-' && tNip.length >= 5);
  const hasRealCNip = Boolean(cNip && cNip !== '-' && cNip.length >= 5);
  if (hasRealTNip && hasRealCNip) {
    if (tNip === cNip) return true;
    return false;
  }
  if (tNip && tNip !== '-' && cNip && cNip !== '-' && tNip === cNip) return true;

  const teacherName = teacher.nama_guru || teacher.nama;
  if (isTeacherNameMatch(teacherName, candidateName)) return true;
  if (teacher.nip && teacher.nip !== '-' && isTeacherNameMatch(teacher.nip, candidateName)) return true;
  if (candidateNip && candidateNip !== '-' && isTeacherNameMatch(teacherName, candidateNip)) return true;

  return false;
}

/**
 * Subject acronym expansion mapping for clean, formal display.
 */
export const MAPEL_EXPANSIONS: Record<string, string> = {
  'mtk': 'Matematika',
  'matematika': 'Matematika',
  'informatika': 'Informatika',
  'fisika': 'Fisika',
  'kimia': 'Kimia',
  'biologi': 'Biologi',
  'geografi': 'Geografi',
  'sosiologi': 'Sosiologi',
  'ekonomi': 'Ekonomi',
  'sejarah': 'Sejarah',
  'pp': 'Pendidikan Pancasila',
  'pkn': 'Pendidikan Pancasila',
  'pjok': 'PJOK',
  'sb': 'Seni Budaya',
  'b. ing': 'Bahasa Inggris',
  'b.ing': 'Bahasa Inggris',
  'b ing': 'Bahasa Inggris',
  'b. indo': 'Bahasa Indonesia',
  'b.indo': 'Bahasa Indonesia',
  'b indo': 'Bahasa Indonesia',
  'pai bp': 'PAI & BP',
  'mtl': 'Matematika Tingkat Lanjut'
};

const EMBEDDED_CLASS_SUFFIX_REGEX = /(?:\s+untuk)?(?:\s+kelas)?\s+(?:X|XI|XII|10|11|12|VII|VIII|IX|7|8|9)(?:\s+Merdeka)?(?:\s+(?:IPA|IPS|Bahasa|Keagamaan|Umum|[A-Z0-9-]{1,3}))*(?:\s+untuk\s+(?:kelas\s+)?.*)?$/i;

export function extractEmbeddedClassAndSubject(rawMapel: string): { subject: string; embeddedKelas: string } {
  const trimmed = (rawMapel || '').trim();
  if (!trimmed) return { subject: '', embeddedKelas: '' };

  let embeddedKelas = '';
  let subject = trimmed;

  if (subject.includes('_')) {
    const parts = subject.split('_');
    embeddedKelas = parts[0].trim();
    subject = parts.slice(1).join('_').trim();
  }

  subject = subject.replace(/^kelas\s+/i, '').trim();
  const suffixMatch = subject.match(EMBEDDED_CLASS_SUFFIX_REGEX);
  if (suffixMatch && suffixMatch.index !== undefined && suffixMatch.index > 0) {
    if (!embeddedKelas) {
      embeddedKelas = suffixMatch[0].replace(/^\s*(?:untuk\s+)?(?:kelas\s+)?/i, '').trim();
    }
    subject = subject.slice(0, suffixMatch.index).trim();
  }

  return { subject, embeddedKelas };
}

export function canonicalizeSubjectName(rawMapel: string): string {
  const { subject } = extractEmbeddedClassAndSubject(rawMapel);
  if (!subject) return '';
  const lowerCore = subject.toLowerCase();
  return MAPEL_EXPANSIONS[lowerCore] || subject;
}

export function isMapelMatch(m1?: string | null, m2?: string | null): boolean {
  if (!m1 || !m2) return false;
  const s1 = m1.trim().toLowerCase();
  const s2 = m2.trim().toLowerCase();
  if (s1 === s2) return true;

  const c1 = canonicalizeSubjectName(s1).toLowerCase();
  const c2 = canonicalizeSubjectName(s2).toLowerCase();
  if (c1 === c2) return true;

  const core1 = s1.includes('_') ? s1.split('_').slice(1).join('_').trim() : s1;
  const core2 = s2.includes('_') ? s2.split('_').slice(1).join('_').trim() : s2;
  if (core1 === core2) return true;

  return false;
}

export interface TeacherSubjectResolved {
  nama_mapel: string;
  kelas: string;
}

/**
 * Pure multi-source subject resolver for any teacher.
 * Aggregates assignments from jadwal_pelajaran, guru_mapel, and data_guru.mata_pelajaran,
 * strictly scoped to the teacher's school and assigned subjects.
 */
export function resolveTeacherSubjects(
  teacher: any,
  jadwalList: any[] = [],
  dataMapelList: any[] = [],
  guruMapelList: any[] = [],
  validClasses: string[] = []
): TeacherSubjectResolved[] {
  if (!teacher) return [];

  const targetSekolahId = teacher.sekolah_id || null;
  const scopedMapelList = (dataMapelList || []).filter(m => {
    if (targetSekolahId && m?.sekolah_id && m.sekolah_id !== targetSekolahId) return false;
    const rawM = m?.nama_mata_pelajaran || m?.nama_mapel || '';
    const rawK = m?.kategori && !NON_CLASS_KATEGORI_REGEX.test(String(m.kategori).trim()) ? m.kategori : '';
    return !isCrossTenantMapelOrKelas(rawM, rawK, targetSekolahId, validClasses);
  });

  const subjects: TeacherSubjectResolved[] = [];
  const seen = new Set<string>();

  const addSubject = (rawMapel?: string | null, rawKelas?: string | null) => {
    if (!rawMapel || isInvalidMapel(rawMapel)) return;
    if (isCrossTenantMapelOrKelas(rawMapel, rawKelas, targetSekolahId, validClasses)) return;

    const { subject: extractedMapel, embeddedKelas } = extractEmbeddedClassAndSubject(rawMapel);
    let mapel = extractedMapel;
    let kelas = (rawKelas || '').trim();
    if (NON_CLASS_KATEGORI_REGEX.test(kelas)) kelas = '';

    // Look up exact match in scopedMapelList if kelas is still missing
    if (!kelas && scopedMapelList.length > 0) {
      const dm = scopedMapelList.find(m => {
        const nm = (m.nama_mata_pelajaran || m.nama_mapel || '').trim().toLowerCase();
        return nm === rawMapel.trim().toLowerCase();
      });
      if (dm) {
        const dmName = String(dm.nama_mata_pelajaran || dm.nama_mapel || '').trim();
        const dmKat = String(dm.kategori || dm.kelompok || '').trim();
        const candidateKelas = dmName.includes('_')
          ? dmName.split('_')[0].trim()
          : (!NON_CLASS_KATEGORI_REGEX.test(dmKat) ? dmKat : '');
        if (candidateKelas && !isCrossTenantMapelOrKelas(rawMapel, candidateKelas, targetSekolahId, validClasses)) {
          kelas = candidateKelas;
        }
      }
    }

    if (isCrossTenantMapelOrKelas(mapel, kelas, targetSekolahId, validClasses)) return;
    if (!kelas && embeddedKelas) kelas = embeddedKelas;

    // Canonicalize subject name (e.g. MTK -> Matematika)
    const canonicalMapel = canonicalizeSubjectName(mapel);
    if (!canonicalMapel) return;

    // Collapse parallel classes to grade level (tingkat) for Perangkat Pembelajaran
    const tingkat = kelas ? extractTingkat(kelas) : '';
    const normalizedKelas = tingkat || kelas;

    const lowerCanon = canonicalMapel.toLowerCase();
    // Avoid adding a duplicate classless entry when a grade-specific assignment already exists for the same subject
    if (!normalizedKelas && subjects.some(s => s.nama_mapel.toLowerCase() === lowerCanon && Boolean(s.kelas))) {
      return;
    }
    // If a classless entry was added earlier and now we have a specific grade level, upgrade it in-place
    if (normalizedKelas) {
      const classlessIdx = subjects.findIndex(s => s.nama_mapel.toLowerCase() === lowerCanon && !s.kelas);
      if (classlessIdx !== -1) {
        seen.delete(`${lowerCanon}__`);
        subjects.splice(classlessIdx, 1);
      }
    }

    const key = `${lowerCanon}__${normalizedKelas.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      subjects.push({
        nama_mapel: canonicalMapel,
        kelas: normalizedKelas
      });
    }
  };

  const rawMataPelajaran = teacher.mata_pelajaran;
  const assignedTokens = (rawMataPelajaran && typeof rawMataPelajaran === 'string')
    ? rawMataPelajaran
        .split(',')
        .map(s => s.trim())
        .filter(s => s && !isInvalidMapel(s) && !isCrossTenantMapelOrKelas(s, '', targetSekolahId, validClasses))
    : [];

  // 1. Resolve from jadwal_pelajaran (Primary truth for teaching schedule)
  const matchingJadwal = (jadwalList || []).filter(j =>
    isTeacherEntityMatch(teacher, j.nama_guru, j.nip, j.user_id, j.sekolah_id) &&
    !isCrossTenantMapelOrKelas(j.mata_pelajaran || j.mapel, j.kelas, targetSekolahId, validClasses)
  );
  matchingJadwal.forEach(j => {
    addSubject(j.mata_pelajaran || j.mapel, j.kelas);
  });

  // 2. Resolve from guru_mapel relations (filtered against stale/unassigned subjects when assignedTokens or jadwal exist)
  const matchingGm = (guruMapelList || []).filter(gm => {
    if (!isTeacherEntityMatch(teacher, gm.nama_guru, gm.nip, gm.user_id || gm.guru_id, gm.sekolah_id)) return false;
    const gmMapel = gm.nama_mapel || gm.mapel_singkat || gm.mata_pelajaran;
    if (isCrossTenantMapelOrKelas(gmMapel, gm.kelas, targetSekolahId, validClasses)) return false;
    if (assignedTokens.length > 0) {
      const inAssigned = assignedTokens.some(tok => isMapelMatch(tok, gmMapel));
      const inJadwal = matchingJadwal.some(j => isMapelMatch(j.mata_pelajaran || j.mapel, gmMapel));
      if (!inAssigned && !inJadwal) return false;
    }
    return true;
  });
  matchingGm.forEach(gm => {
    addSubject(gm.nama_mapel || gm.mapel_singkat, gm.kelas);
  });

  // 3. Resolve from teacher.mata_pelajaran in data_guru (e.g. "X Merdeka_MTK, X Merdeka_Informatika")
  assignedTokens.forEach(tok => {
    addSubject(tok, '');
  });

  // 4. Sort Class X subjects logically first
  subjects.sort((a, b) => {
    const tA = extractTingkat(a.kelas);
    const tB = extractTingkat(b.kelas);
    if (tA === 'X' && tB !== 'X') return -1;
    if (tA !== 'X' && tB === 'X') return 1;
    return a.nama_mapel.localeCompare(b.nama_mapel);
  });

  return subjects;
}

export interface DokumenViewProps {
  user: any;
  isReadOnly?: boolean;
  statusKepalaSekolah?: string;
}

export default function DokumenView({ user, isReadOnly = false, statusKepalaSekolah }: DokumenViewProps) {
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdmin = normRole === 'admin' || normRole === 'superadmin';
  const effectiveSekolahId = getActiveTargetSchool()?.id || user?.sekolah_id;
  const [activeTab, setActiveTab] = useState<'matrix' | 'syarat' | 'list' | 'upload'>(isAdmin ? 'matrix' : 'list');
    
  // Data states
  const [dokumenList, setDokumenList] = useState<BankDokumen[]>([]);
  const [teachersList, setTeachersList] = useState<DataGuru[]>([]);
  const [guruMapelList, setGuruMapelList] = useState<GuruMapel[]>([]);
  const [jadwalList, setJadwalList] = useState<any[]>([]);
  const [dataMapelList, setDataMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [syaratList, setSyaratList] = useState<SyaratPerangkatPembelajaranRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lengkap' | 'Belum Lengkap' | 'Menunggu'>('Semua');
  const [filterSyaratMapel, setFilterSyaratMapel] = useState<string>('Semua');

  // Preview & Verification Modal
  const [previewDoc, setPreviewDoc] = useState<BankDokumen | null>(null);

  // Minimalist Card Click Expansion State
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);

  // Admin Syarat CRUD Modal States
  const [showSyaratModal, setShowSyaratModal] = useState(false);
  const [editingSyarat, setEditingSyarat] = useState<SyaratPerangkatPembelajaranRow | null>(null);
  const [syaratMapel, setSyaratMapel] = useState('Semua Mapel');
  const [syaratKode, setSyaratKode] = useState('');
  const [syaratNama, setSyaratNama] = useState('');
  const [syaratFormat, setSyaratFormat] = useState('PDF, DOCX');
  const [syaratWajib, setSyaratWajib] = useState(true);
  const [syaratUrutan, setSyaratUrutan] = useState(1);
  const [syaratDeskripsi, setSyaratDeskripsi] = useState('');
  const [syaratSaving, setSyaratSaving] = useState(false);

  // Teacher Upload Form States (For non-admin)
  const [judul, setJudul] = useState('');
  const [jenis, setJenis] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!previewDoc && !showSyaratModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSyaratModal) setShowSyaratModal(false);
        else if (previewDoc) setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, showSyaratModal]);

  const loadAllData = useCallback(async () => {
    try {
      setFetching(true);
      const targetSchoolId = getActiveTargetSchool()?.id || user?.sekolah_id;

      // 1. Fetch bank_dokumen
      let docQuery = supabase
        .from('bank_dokumen')
        .select('*')
        .order('timestamp', { ascending: false });

      if (targetSchoolId) {
        docQuery = docQuery.eq('sekolah_id', targetSchoolId);
      }
      if (!isAdmin && user?.nama) {
        docQuery = docQuery.eq('nama_guru', user.nama);
      }

      let guruQuery = supabase.from('data_guru').select('*').order('nama_guru', { ascending: true });
      if (targetSchoolId) {
        guruQuery = guruQuery.eq('sekolah_id', targetSchoolId);
      }

      let gmQuery = supabase.from('guru_mapel').select('*');
      if (targetSchoolId) {
        gmQuery = gmQuery.eq('sekolah_id', targetSchoolId);
      }

      let siswaQuery = supabase.from('data_siswa').select('kelas, sekolah_id');
      if (targetSchoolId) {
        siswaQuery = siswaQuery.eq('sekolah_id', targetSchoolId);
      }

      let syaratQuery = supabase
        .from('syarat_perangkat_pembelajaran')
        .select('*')
        .order('urutan', { ascending: true });
      if (targetSchoolId) {
        syaratQuery = syaratQuery.eq('sekolah_id', targetSchoolId);
      }

      let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
      if (targetSchoolId) {
        jadwalQuery = jadwalQuery.eq('sekolah_id', targetSchoolId);
      }

      let mapelQuery = supabase.from('data_mapel').select('*');
      if (targetSchoolId) {
        mapelQuery = mapelQuery.eq('sekolah_id', targetSchoolId);
      }

      // Parallel fetch of all master data tables
      const [
        { data: docs, error: docError },
        { data: teachers, error: teacherError },
        { data: gm, error: gmError },
        { data: jadwalData, error: jadwalError },
        { data: mapelData, error: mapelError },
        { data: siswaData },
        { data: syaratData, error: syaratErr }
      ] = await Promise.all([
        docQuery,
        guruQuery,
        gmQuery,
        jadwalQuery,
        mapelQuery,
        siswaQuery,
        syaratQuery
      ]);

      const matchesTenant = (row: any) => !targetSchoolId || !row?.sekolah_id || row.sekolah_id === targetSchoolId;

      const uniqueKls = siswaData
        ? (Array.from(
            new Set(
              siswaData
                .filter((s: any) => matchesTenant(s) && !isCrossTenantMapelOrKelas('', s.kelas, targetSchoolId))
                .map((s: any) => s.kelas)
                .filter(Boolean)
            )
          ) as string[]).sort()
        : [];
      setKelasList(uniqueKls);

      if (docError) console.error('Error fetching bank_dokumen:', docError);
      if (docs) {
        setDokumenList(
          (docs as BankDokumen[]).filter(
            (d: any) => matchesTenant(d) && !isCrossTenantMapelOrKelas(d.mapel, d.kelas, targetSchoolId, uniqueKls)
          )
        );
      }

      if (teacherError) console.error('Error fetching data_guru:', teacherError);
      if (teachers) {
        setTeachersList((teachers as DataGuru[]).filter(matchesTenant));
      }

      const validGm = ((gm as GuruMapel[]) || []).filter(
        (g: any) =>
          matchesTenant(g) &&
          !isInvalidMapel(g.nama_mapel || g.mata_pelajaran) &&
          !isCrossTenantMapelOrKelas(g.nama_mapel || g.mata_pelajaran, g.kelas, targetSchoolId, uniqueKls)
      );
      setGuruMapelList(validGm);

      const validJadwal = (jadwalData || []).filter(
        (j: any) =>
          matchesTenant(j) &&
          !isInvalidMapel(j.mata_pelajaran || j.mapel) &&
          !isCrossTenantMapelOrKelas(j.mata_pelajaran || j.mapel, j.kelas, targetSchoolId, uniqueKls)
      );
      setJadwalList(validJadwal);

      const validMapel = (mapelData || []).filter(
        (m: any) =>
          matchesTenant(m) &&
          !isInvalidMapel(m.nama_mata_pelajaran || m.nama_mapel) &&
          !isCrossTenantMapelOrKelas(m.nama_mata_pelajaran || m.nama_mapel, '', targetSchoolId, uniqueKls)
      );
      setDataMapelList(validMapel);

      if (syaratErr) console.error('Error fetching syarat_perangkat_pembelajaran:', syaratErr);
      if (syaratData) {
        setSyaratList((syaratData as SyaratPerangkatPembelajaranRow[]).filter(matchesTenant));
      }
    } catch (err) {
      console.error('loadAllData exception:', err);
    } finally {
      setFetching(false);
    }
  }, [isAdmin, user?.nama, user?.sekolah_id]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // --- Admin Syarat CRUD Operations ---
  const handleOpenAddSyarat = () => {
    if (isReadOnly) return;
    setEditingSyarat(null);
    setSyaratMapel('Semua Mapel');
    setSyaratKode('');
    setSyaratNama('');
    setSyaratFormat('PDF, DOCX');
    setSyaratWajib(true);
    setSyaratUrutan(syaratList.length + 1);
    setSyaratDeskripsi('');
    setShowSyaratModal(true);
  };

  const handleOpenEditSyarat = (syarat: SyaratPerangkatPembelajaranRow) => {
    if (isReadOnly) return;
    setEditingSyarat(syarat);
    setSyaratMapel(syarat.nama_mapel || 'Semua Mapel');
    setSyaratKode(syarat.kode_dokumen || '');
    setSyaratNama(syarat.nama_dokumen || '');
    setSyaratFormat(syarat.format_dokumen || 'PDF, DOCX');
    setSyaratWajib(syarat.wajib !== false);
    setSyaratUrutan(syarat.urutan ?? 1);
    setSyaratDeskripsi(syarat.deskripsi || '');
    setShowSyaratModal(true);
  };

  const handleSaveSyarat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!syaratKode.trim() || !syaratNama.trim()) {
      Swal.fire('Peringatan', 'Kode dokumen dan nama dokumen wajib diisi.', 'warning');
      return;
    }

    try {
      setSyaratSaving(true);
      const payload = {
        nama_mapel: syaratMapel.trim() || 'Semua Mapel',
        kode_dokumen: syaratKode.trim().toUpperCase(),
        nama_dokumen: syaratNama.trim(),
        format_dokumen: syaratFormat.trim() || 'PDF, DOCX',
        wajib: syaratWajib,
        urutan: Number(syaratUrutan) || 1,
        deskripsi: syaratDeskripsi.trim() || null,
        sekolah_id: effectiveSekolahId || NIZAMUDIN_SEKOLAH_ID
      };

      if (editingSyarat) {
        const { error } = await supabase
          .from('syarat_perangkat_pembelajaran')
          .update(payload)
          .eq('id', editingSyarat.id);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'Berhasil Diperbarui', text: 'Syarat dokumen berhasil diperbarui.', timer: 1500, showConfirmButton: false });
      } else {
        const { error } = await supabase
          .from('syarat_perangkat_pembelajaran')
          .insert([payload]);
        if (error) throw error;
        Swal.fire({ icon: 'success', title: 'Berhasil Ditambahkan', text: 'Syarat dokumen baru berhasil ditambahkan.', timer: 1500, showConfirmButton: false });
      }

      setShowSyaratModal(false);
      loadAllData();
    } catch (err: any) {
      console.error('Error saving syarat:', err);
      Swal.fire('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setSyaratSaving(false);
    }
  };

  const handleDeleteSyarat = async (syarat: SyaratPerangkatPembelajaranRow) => {
    if (isReadOnly) return;
    const confirm = await Swal.fire({
      title: 'Hapus Syarat Dokumen?',
      text: `Apakah Anda yakin ingin menghapus "${syarat.nama_dokumen}" (${syarat.nama_mapel})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
      setFetching(true);
      const { error } = await supabase
        .from('syarat_perangkat_pembelajaran')
        .delete()
        .eq('id', syarat.id);
      if (error) throw error;
      Swal.fire({ icon: 'success', title: 'Berhasil Dihapus', text: 'Syarat dokumen berhasil dihapus.', timer: 1500, showConfirmButton: false });
      loadAllData();
    } catch (err: any) {
      console.error('Error deleting syarat:', err);
      Swal.fire('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleVerifyDokumen = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    if (isReadOnly) {
      Swal.fire('Mode Peninjau', 'Anda sedang berada dalam mode peninjau (read-only). Aksi verifikasi dinonaktifkan.', 'info');
      return;
    }
    let catatan = '';
    if (status === 'Ditolak') {
      const { value: text } = await Swal.fire({
        title: 'Tolak Dokumen',
        input: 'textarea',
        inputLabel: 'Catatan / Alasan Penolakan',
        inputPlaceholder: 'Tuliskan catatan perbaikan untuk guru...',
        showCancelButton: true,
        confirmButtonText: 'Tolak Dokumen',
        confirmButtonColor: '#dc2626',
        cancelButtonText: 'Batal',
        inputValidator: (val) => (!val ? 'Catatan perbaikan wajib diisi saat menolak dokumen!' : null)
      });
      if (text === undefined) return;
      catatan = text;
    } else {
      const { value: text } = await Swal.fire({
        title: 'Setujui Dokumen',
        input: 'text',
        inputLabel: 'Catatan Admin (Opsional)',
        inputPlaceholder: 'Contoh: Perangkat pembelajaran telah sesuai standar kurikulum',
        showCancelButton: true,
        confirmButtonText: 'Ya, Setujui',
        confirmButtonColor: '#0F766E',
        cancelButtonText: 'Batal'
      });
      if (text === undefined) return;
      catatan = text || 'Disetujui oleh Admin';
    }

    setFetching(true);
    const { error } = await supabase
      .from('bank_dokumen')
      .update({
        status_verifikasi: status,
        catatan_admin: catatan
      })
      .eq('id', id);

    setFetching(false);
    if (error) {
      Swal.fire('Gagal Verifikasi', error.message, 'error');
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Verifikasi Berhasil',
        text: `Status dokumen telah diubah menjadi ${status}.`,
        timer: 1500,
        showConfirmButton: false
      });
      // Update preview doc if open
      if (previewDoc && previewDoc.id === id) {
        setPreviewDoc({ ...previewDoc, status_verifikasi: status, catatan_admin: catatan });
      }
      loadAllData();
    }
  };

  const submitDokumen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenis || !judul || !file) {
      Swal.fire('Peringatan', 'Mohon lengkapi semua data dan lampirkan file dokumen.', 'warning');
      return;
    }

    if (!isAdmin && availableMapels.length > 0 && selectedMapel.trim()) {
      const isAssignedMapel = availableMapels.some(m => isMapelMatch(m, selectedMapel));
      if (!isAssignedMapel) {
        Swal.fire(
          'Mata Pelajaran Tidak Sesuai',
          `Mata pelajaran "${selectedMapel}" tidak termasuk dalam penugasan mengajar Anda (${availableMapels.join(', ')}).`,
          'warning'
        );
        return;
      }
    }

    // R2: Batasi pengunggahan perangkat pembelajaran per mata pelajaran hanya satu kali untuk kelas paralel pada tingkat yang sama
    const targetTingkat = extractTingkat(selectedKelas);
    const normalizedMapel = (selectedMapel || '').trim().toLowerCase();
    const normalizedJenis = (jenis || '').trim().toLowerCase();

    const duplicateDoc = dokumenList.find(d => {
      // Guru yang sama
      const isSameTeacher = (d.nama_guru || '').trim().toLowerCase() === (user.nama || '').trim().toLowerCase();
      if (!isSameTeacher) return false;

      // Jenis dokumen yang sama
      const dJenis = (d.jenis_dokumen || '').trim().toLowerCase();
      const isSameJenis = dJenis === normalizedJenis || 
        (normalizedJenis.includes('cp') && (dJenis.includes('capaian') || dJenis.includes('cp'))) ||
        (normalizedJenis.includes('atp') && (dJenis.includes('tujuan') || dJenis.includes('atp'))) ||
        (normalizedJenis.includes('rpe') && (dJenis.includes('pekan') || dJenis.includes('rpe'))) ||
        (normalizedJenis.includes('prota') && (dJenis.includes('tahunan') || dJenis.includes('prota'))) ||
        (normalizedJenis.includes('promes') && (dJenis.includes('semester') || dJenis.includes('promes'))) ||
        ((normalizedJenis.includes('rpm') || normalizedJenis.includes('modul')) && (dJenis.includes('rpm') || dJenis.includes('modul')));
      if (!isSameJenis) return false;

      // Mapel yang sama
      const dMapel = (d.mapel || '').trim().toLowerCase();
      const isSameMapel = !normalizedMapel || !dMapel || isMapelMatch(dMapel, normalizedMapel) || (d.judul || '').toLowerCase().includes(normalizedMapel);
      if (!isSameMapel) return false;

      // Tingkat kelas paralel yang sama
      const dTingkat = extractTingkat(d.kelas);
      return Boolean(targetTingkat && dTingkat && targetTingkat === dTingkat);
    });

    if (duplicateDoc) {
      Swal.fire({
        icon: 'warning',
        title: 'Pengunggahan Dibatasi',
        html: `
          <div class="text-xs text-left space-y-2">
            <p>Perangkat pembelajaran <strong>${jenis}</strong> untuk mata pelajaran <strong>${selectedMapel || 'terpilih'}</strong> pada <strong>Tingkat ${targetTingkat}</strong> sudah pernah diunggah (Kelas: <em>${duplicateDoc.kelas || 'Paralel'}</em>).</p>
            <p class="text-gray-500 dark:text-gray-400">Sesuai kebijakan Kurikulum Merdeka, pengunggahan perangkat pembelajaran per mata pelajaran dibatasi hanya <strong>satu kali</strong> untuk kelas paralel pada tingkat yang sama dan otomatis berlaku untuk seluruh kelas paralel tingkat tersebut.</p>
          </div>
        `,
        confirmButtonColor: '#0F766E'
      });
      return;
    }

    setLoading(true);
    try {
      let fileUrl = '';
      if (file) {
        try {
          const tingkatLabel = targetTingkat ? `Kelas ${targetTingkat}` : 'Tingkat';
          const label = `${selectedMapel || 'Mapel'} - ${tingkatLabel} - ${user.nama || 'Guru'}`.replace(/[\\/:*?"<>|]/g, ' ');
          fileUrl = await uploadToDrive(file, user.nama, 'Perangkat_Pembelajaran', label);
        } catch (err: any) {
          setLoading(false);
          return Swal.fire('Gagal Upload', err.message, 'error');
        }
      }

      const newDokumen = {
        id: crypto.randomUUID(),
        timestamp: getWitaTimestamp(),
        nama_guru: user.nama,
        jenis_dokumen: jenis,
        judul: judul,
        link_file: fileUrl,
        status_verifikasi: 'Menunggu',
        catatan_admin: '',
        mapel: selectedMapel || null,
        kelas: selectedKelas || null,
        sekolah_id: effectiveSekolahId || user?.sekolah_id || null
      };

      const { error } = await supabase.from('bank_dokumen').insert([newDokumen]);

      if (error) {
        Swal.fire('Error', 'Gagal mengupload dokumen: ' + error.message, 'error');
      } else {
        Swal.fire('Berhasil', 'Dokumen berhasil diupload dan menunggu verifikasi admin.', 'success');
        setJenis('');
        setJudul('');
        setSelectedMapel('');
        setSelectedKelas('');
        setFile(null);
        setActiveTab('list');
        loadAllData();
      }
    } catch (err: any) {
      Swal.fire('Error', 'Gagal menyimpan dokumen: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to match a document to one of the 6 Kurikulum Merdeka types
  const matchDocToType = (teacherDocs: BankDokumen[], docId: string) => {
    return teacherDocs.find(d => {
      const j = (d.jenis_dokumen || '').toLowerCase();
      if (docId === 'CP') return j.includes('capaian') || j.includes('cp');
      if (docId === 'ATP') return j.includes('tujuan') || j.includes('atp');
      if (docId === 'RPE') return j.includes('pekan') || j.includes('rpe');
      if (docId === 'Prota') return j.includes('tahunan') || j.includes('prota');
      if (docId === 'Promes') return j.includes('semester') || j.includes('promes');
      if (docId === 'RPM') return j.includes('mendalam') || j.includes('rpm') || j.includes('modul');
      return false;
    });
  };

  // Helper to match a document for a specific subject
  const matchDocToTypeForSubject = (teacherDocs: BankDokumen[], docId: string, mapelName?: string, kelasName?: string) => {
    // 1. Exact match first
    const exact = teacherDocs.find(d => {
      if (mapelName && d.mapel) {
        if (!isMapelMatch(mapelName, d.mapel)) {
          if (!d.judul || !d.judul.toLowerCase().includes(mapelName.toLowerCase())) {
            return false;
          }
        }
      }
      if (kelasName && d.kelas) {
        if (d.kelas.trim().toLowerCase() !== kelasName.trim().toLowerCase()) {
          if (!d.judul || !d.judul.toLowerCase().includes(kelasName.toLowerCase())) {
            return false;
          }
        }
      }

      const j = (d.jenis_dokumen || '').toLowerCase();
      if (docId === 'CP') return j.includes('capaian') || j.includes('cp');
      if (docId === 'ATP') return j.includes('tujuan') || j.includes('atp');
      if (docId === 'RPE') return j.includes('pekan') || j.includes('rpe');
      if (docId === 'Prota') return j.includes('tahunan') || j.includes('prota');
      if (docId === 'Promes') return j.includes('semester') || j.includes('promes');
      if (docId === 'RPM') return j.includes('mendalam') || j.includes('rpm') || j.includes('modul');
      return false;
    });

    if (exact) return exact;

    // 2. Fallback: match parallel class on same grade level (extractTingkat)
    if (kelasName) {
      const targetTingkat = extractTingkat(kelasName);
      if (targetTingkat) {
        return teacherDocs.find(d => {
          if (mapelName && d.mapel) {
            if (!isMapelMatch(mapelName, d.mapel)) {
              if (!d.judul || !d.judul.toLowerCase().includes(mapelName.toLowerCase())) {
                return false;
              }
            }
          }
          const dTingkat = extractTingkat(d.kelas);
          if (!dTingkat || dTingkat !== targetTingkat) return false;

          const j = (d.jenis_dokumen || '').toLowerCase();
          if (docId === 'CP') return j.includes('capaian') || j.includes('cp');
          if (docId === 'ATP') return j.includes('tujuan') || j.includes('atp');
          if (docId === 'RPE') return j.includes('pekan') || j.includes('rpe');
          if (docId === 'Prota') return j.includes('tahunan') || j.includes('prota');
          if (docId === 'Promes') return j.includes('semester') || j.includes('promes');
          if (docId === 'RPM') return j.includes('mendalam') || j.includes('rpm') || j.includes('modul');
          return false;
        });
      }
    }

    return undefined;
  };

  // Subjects assigned to the currently logged in teacher
  const myTeacherSubjects = useMemo(() => {
    const currentTeacher = teachersList.find(t =>
      isTeacherEntityMatch(t, user?.nama, user?.nip || user?.username, user?.id, effectiveSekolahId)
    ) || {
      nama_guru: user?.nama,
      nip: user?.nip || user?.username,
      user_id: user?.id,
      mata_pelajaran: user?.mata_pelajaran,
      sekolah_id: effectiveSekolahId
    };

    return resolveTeacherSubjects(currentTeacher, jadwalList, dataMapelList, guruMapelList, kelasList);
  }, [teachersList, jadwalList, dataMapelList, guruMapelList, kelasList, user, effectiveSekolahId]);

  const availableMapels = useMemo(() => {
    const set = new Set<string>();
    if (isAdmin) {
      dataMapelList.forEach(m => {
        const raw = m.nama_mata_pelajaran || m.nama_mapel || '';
        const canon = canonicalizeSubjectName(raw);
        if (canon && !isInvalidMapel(canon) && !isCrossTenantMapelOrKelas(raw, '', effectiveSekolahId, kelasList)) {
          set.add(canon);
        }
      });
      teachersList.forEach(t => {
        resolveTeacherSubjects(t, jadwalList, dataMapelList, guruMapelList, kelasList).forEach(s => {
          if (s.nama_mapel && !isInvalidMapel(s.nama_mapel)) set.add(s.nama_mapel);
        });
      });
    } else {
      myTeacherSubjects.forEach(s => {
        if (s.nama_mapel && !isInvalidMapel(s.nama_mapel)) set.add(s.nama_mapel);
      });
    }
    return Array.from(set);
  }, [isAdmin, myTeacherSubjects, dataMapelList, teachersList, jadwalList, guruMapelList, kelasList, effectiveSekolahId]);

  const allKelasOptions = useMemo(() => {
    const set = new Set<string>();
    if (!isAdmin) {
      const matchingSubjects = selectedMapel.trim()
        ? myTeacherSubjects.filter(s => isMapelMatch(s.nama_mapel, selectedMapel))
        : myTeacherSubjects;
      matchingSubjects.forEach(s => {
        if (s.kelas) set.add(s.kelas);
      });
      if (set.size === 0) {
        myTeacherSubjects.forEach(s => {
          if (s.kelas) set.add(s.kelas);
        });
      }
      if (set.size === 0) {
        kelasList.forEach(k => {
          if (k) set.add(k);
        });
      }
    } else {
      kelasList.forEach(k => {
        if (k) set.add(k);
      });
    }
    return Array.from(set).sort();
  }, [isAdmin, myTeacherSubjects, selectedMapel, kelasList]);

  // Auto-select default mapel & kelas for teacher when switching to upload tab
  useEffect(() => {
    if (!isAdmin && activeTab === 'upload') {
      if (!selectedMapel && availableMapels.length > 0) {
        setSelectedMapel(availableMapels[0]);
      }
      if (!selectedKelas && myTeacherSubjects.length > 0) {
        const targetSub = selectedMapel
          ? myTeacherSubjects.find(s => isMapelMatch(s.nama_mapel, selectedMapel) && s.kelas)
          : myTeacherSubjects.find(s => s.kelas);
        if (targetSub?.kelas) {
          setSelectedKelas(targetSub.kelas);
        }
      }
    }
  }, [isAdmin, activeTab, availableMapels, myTeacherSubjects, selectedMapel, selectedKelas]);

  // Structured Print Table Rows for Teacher
  const teacherPrintRows = useMemo(() => {
    const rows: {
      index: number;
      kode: string;
      nama: string;
      mapelKelas: string;
      format: string;
      statusUnggah: string;
      statusVerif: string;
      tanggal: string;
    }[] = [];

    let counter = 1;
    myTeacherSubjects.forEach(sub => {
      KURIKULUM_DOCS.forEach(doc => {
        const matchDoc = matchDocToTypeForSubject(dokumenList, doc.id, sub.nama_mapel, sub.kelas);
        const isUploaded = Boolean(matchDoc);
        rows.push({
          index: counter++,
          kode: doc.code,
          nama: doc.name,
          mapelKelas: `${sub.nama_mapel}${sub.kelas ? ` (Kelas ${sub.kelas})` : ''}`,
          format: 'PDF, DOCX',
          statusUnggah: isUploaded ? 'Sudah Diunggah' : 'Belum Diunggah',
          statusVerif: isUploaded ? (matchDoc?.status_verifikasi || 'Menunggu') : '-',
          tanggal: matchDoc?.timestamp ? formatTimestampWita(matchDoc.timestamp) : '-'
        });
      });
    });

    return rows;
  }, [myTeacherSubjects, dokumenList]);

  // Handler for direct upload trigger from matrix card
  const handleTriggerDirectUpload = (docTypeName: string, mapelName: string, kelasName?: string) => {
    setJenis(docTypeName);
    setSelectedMapel(mapelName);
    setSelectedKelas(kelasName || '');
    setJudul(`${docTypeName} ${mapelName}${kelasName ? ` Kelas ${kelasName}` : ''}`.trim());
    setActiveTab('upload');
  };

  // Teacher Matrix Calculations
  const teacherMatrixData = teachersList.map(teacher => {
    const teacherDocs = dokumenList.filter(d =>
      isTeacherEntityMatch(teacher, d.nama_guru, undefined, undefined, d.sekolah_id)
    );

    const teacherMapel = resolveTeacherSubjects(teacher, jadwalList, dataMapelList, guruMapelList, kelasList);

    const docStatusMap: Record<string, BankDokumen | undefined> = {};
    let completedCount = 0;

    KURIKULUM_DOCS.forEach(doc => {
      const match = matchDocToType(teacherDocs, doc.id);
      docStatusMap[doc.id] = match;
      if (match) completedCount += 1;
    });

    const completionRate = Math.round((completedCount / 6) * 100);
    const isComplete = completedCount === 6;
    const hasPendingVerification = Object.values(docStatusMap).some(
      d => d && (d.status_verifikasi === 'Menunggu' || !d.status_verifikasi)
    );

    return {
      teacher,
      teacherDocs,
      teacherMapel,
      docStatusMap,
      completedCount,
      completionRate,
      isComplete,
      hasPendingVerification
    };
  });

  // Filtered Teacher Matrix
  const filteredTeacherMatrix = teacherMatrixData.filter(item => {
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = (item.teacher.nama_guru || '').toLowerCase().includes(q);
      const matchNip = (item.teacher.nip || '').toLowerCase().includes(q);
      const matchMapel = item.teacherMapel.some(
        m => (m.nama_mapel || '').toLowerCase().includes(q) || (m.kelas || '').toLowerCase().includes(q)
      );
      if (!matchName && !matchNip && !matchMapel) return false;
    }

    // Status filter
    if (statusFilter === 'Lengkap') return item.isComplete;
    if (statusFilter === 'Belum Lengkap') return !item.isComplete;
    if (statusFilter === 'Menunggu') return item.hasPendingVerification;

    return true;
  });

  // Per-Teacher, Per-Subject Document Tracking Data (R2)
  const teacherSubjectCards = useMemo(() => {
    const list: {
      cardKey: string;
      teacher: DataGuru;
      subject: { nama_mapel: string; kelas: string };
      requiredDocs: {
        req: {
          id: string;
          kode_dokumen: string;
          nama_dokumen: string;
          format_dokumen: string;
          wajib: boolean;
          urutan: number;
          deskripsi?: string | null;
        };
        uploadedDoc: BankDokumen | undefined;
      }[];
      completedCount: number;
      totalRequired: number;
      completionRate: number;
      isComplete: boolean;
      hasPending: boolean;
    }[] = [];

    teachersList.forEach(teacher => {
      // Resolve teacher's subjects across jadwal, guru_mapel, and data_guru
      const subjects = resolveTeacherSubjects(teacher, jadwalList, dataMapelList, guruMapelList, kelasList);

      // Teacher's uploaded docs (tokenized match)
      const teacherDocs = dokumenList.filter(d =>
        isTeacherEntityMatch(teacher, d.nama_guru, undefined, undefined, d.sekolah_id)
      );

      subjects.forEach(sub => {
        // Find requirements for this subject in syarat_perangkat_pembelajaran
        let reqs = syaratList.filter(
          s => isMapelMatch(s.nama_mapel, sub.nama_mapel)
        );
        if (reqs.length === 0) {
          reqs = syaratList.filter(s => (s.nama_mapel || '').trim().toLowerCase() === 'semua mapel');
        }

        let activeReqs: Array<{
          id: string;
          kode_dokumen: string;
          nama_dokumen: string;
          format_dokumen: string;
          wajib: boolean;
          urutan: number;
          deskripsi?: string | null;
        }> = reqs;

        if (activeReqs.length === 0) {
          activeReqs = KURIKULUM_DOCS.map((k, idx) => ({
            id: k.id,
            kode_dokumen: k.code,
            nama_dokumen: k.name,
            format_dokumen: 'PDF, DOCX',
            wajib: true,
            urutan: idx + 1,
            deskripsi: null
          }));
        }

        const requiredDocs = activeReqs.map(req => {
          const uploaded = teacherDocs.find(d => {
            if (d.syarat_id && d.syarat_id === req.id) return true;

            // Check mapel match
            if (sub.nama_mapel && d.mapel) {
              if (!isMapelMatch(sub.nama_mapel, d.mapel)) {
                if (!d.judul || !d.judul.toLowerCase().includes(sub.nama_mapel.toLowerCase())) {
                  return false;
                }
              }
            }
            if (sub.kelas && d.kelas) {
              const exactClass = d.kelas.trim().toLowerCase() === sub.kelas.trim().toLowerCase() ||
                (d.judul && d.judul.toLowerCase().includes(sub.kelas.toLowerCase()));
              const targetTingkat = extractTingkat(sub.kelas);
              const dTingkat = extractTingkat(d.kelas);
              const parallelClass = Boolean(targetTingkat && dTingkat && targetTingkat === dTingkat);
              if (!exactClass && !parallelClass) {
                return false;
              }
            }

            // Doc type match check
            const j = (d.jenis_dokumen || '').toLowerCase();
            const kode = (req.kode_dokumen || '').toLowerCase();
            const nama = (req.nama_dokumen || '').toLowerCase();

            if (kode === 'cp' && (j.includes('capaian') || j.includes('cp'))) return true;
            if (kode === 'atp' && (j.includes('tujuan') || j.includes('atp'))) return true;
            if (kode === 'rpe' && (j.includes('pekan') || j.includes('rpe'))) return true;
            if (kode === 'prota' && (j.includes('tahunan') || j.includes('prota'))) return true;
            if (kode === 'promes' && (j.includes('semester') || j.includes('promes'))) return true;
            if (kode === 'rpm' && (j.includes('mendalam') || j.includes('rpm') || j.includes('modul'))) return true;

            if (j === nama || j.includes(kode) || (req.nama_dokumen && j.includes(req.nama_dokumen.toLowerCase()))) return true;
            return false;
          });

          return { req, uploadedDoc: uploaded };
        });

        const totalRequired = requiredDocs.filter(r => r.req.wajib !== false).length || requiredDocs.length;
        const completedCount = requiredDocs.filter(r => (r.req.wajib !== false ? Boolean(r.uploadedDoc) : false)).length;
        const completionRate = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 100;
        const isComplete = completedCount >= totalRequired;
        const hasPending = requiredDocs.some(r => r.uploadedDoc && (r.uploadedDoc.status_verifikasi === 'Menunggu' || !r.uploadedDoc.status_verifikasi));

        list.push({
          cardKey: `${teacher.id}-${sub.nama_mapel}-${sub.kelas}`,
          teacher,
          subject: sub,
          requiredDocs,
          completedCount,
          totalRequired,
          completionRate,
          isComplete,
          hasPending
        });
      });
    });

    return list;
  }, [teachersList, guruMapelList, jadwalList, dataMapelList, kelasList, dokumenList, syaratList]);

  // Filtered Teacher-Subject Minimalist Cards
  const filteredTeacherSubjectCards = useMemo(() => {
    return teacherSubjectCards.filter(card => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (card.teacher.nama_guru || '').toLowerCase().includes(q);
        const matchNip = (card.teacher.nip || '').toLowerCase().includes(q);
        const matchMapel = (card.subject.nama_mapel || '').toLowerCase().includes(q);
        const matchKelas = (card.subject.kelas || '').toLowerCase().includes(q);
        if (!matchName && !matchNip && !matchMapel && !matchKelas) return false;
      }

      if (statusFilter === 'Lengkap') return card.isComplete;
      if (statusFilter === 'Belum Lengkap') return !card.isComplete;
      if (statusFilter === 'Menunggu') return card.hasPending;

      return true;
    });
  }, [teacherSubjectCards, search, statusFilter]);

  // Group filtered subject cards per teacher (only teachers that have mapel)
  const teacherGroups: { teacher: DataGuru; cards: typeof filteredTeacherSubjectCards }[] = [];
  filteredTeacherSubjectCards.forEach(card => {
    const g = teacherGroups.find(x => x.teacher.id === card.teacher.id);
    if (g) g.cards.push(card);
    else teacherGroups.push({ teacher: card.teacher, cards: [card] });
  });

  // KPI Statistics
  const totalGuru = teachersList.length;
  const totalLengkap = teacherMatrixData.filter(t => t.isComplete).length;
  const totalBelumLengkap = totalGuru - totalLengkap;
  const totalMenungguVerif = dokumenList.filter(
    d => d.status_verifikasi === 'Menunggu' || !d.status_verifikasi
  ).length;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const tahunAjaran = currentMonth >= 7 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
  const tanggalCetak = now.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <section id="view-dokumen" className="view-section page-enter">
      <div className="neu-card bg-[var(--neu-surface)] p-4 sm:p-6 mb-6 print:bg-white print:text-black print:shadow-none print:border-none print:p-0 print:mb-0">
        {/* Print Header (Official School Kop) */}
        <PrintHeader user={user} sekolahId={user?.sekolah_id} />

        {/* Document Print Subheader */}
        <div className="hidden print:block text-center my-3 print:my-2">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white print:text-black uppercase tracking-wider">
            {isAdmin
              ? 'Rekapitulasi Matriks Kelengkapan Perangkat Pembelajaran Dewan Guru'
              : 'Laporan Kelengkapan Perangkat Pembelajaran Kurikulum Merdeka'}
          </h3>
          <div className="text-xs text-slate-600 dark:text-slate-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
            {!isAdmin && (
              <span>Guru: <strong>{user?.nama || '-'}</strong> {user?.nip ? <span className="font-num">(NIP. {user.nip})</span> : ''}</span>
            )}
            <span>Tahun Ajaran: <strong className="font-num">{tahunAjaran}</strong></span>
            <span>Dicetak: <strong className="font-num">{tanggalCetak}</strong></span>
          </div>
        </div>

        {/* Print Orientation Toolbar & Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
          <button
            type="button"
            onClick={() => triggerPrintWithGps()}
            className="neu-btn neu-btn-teal min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-print"></i> Cetak Dokumen
          </button>
        </div>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-slate-300/60 dark:border-slate-700/60 pb-4 no-print">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 min-w-0">
              <span className="w-11 h-11 shrink-0 rounded-2xl neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center">
                <i className="fa-solid fa-folder-open text-base"></i>
              </span>
              <span className="min-w-0 break-words">Perangkat Pembelajaran Kurikulum Merdeka</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAdmin
                ? 'Matriks kelengkapan dokumen administrasi KBM per guru dan per mata pelajaran.'
                : 'Kelola dan unggah dokumen administrasi pembelajaran Anda.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadAllData}
              title="Muat Ulang Data"
              aria-label="Muat Ulang Data"
              className="neu-btn w-10 h-10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#0F766E] dark:hover:text-[#14B8A6] flex justify-center items-center cursor-pointer"
            >
              <i className={`fa-solid fa-rotate-right ${fetching ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div
          role="tablist"
          aria-label="Navigasi Perangkat Pembelajaran"
          className="neu-inset p-2 rounded-2xl flex flex-wrap gap-2 mb-6 no-print"
        >
          {isAdmin ? (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'matrix'}
                onClick={() => setActiveTab('matrix')}
                className={`neu-btn min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'matrix'
                    ? 'neu-btn-teal neu-tab-active bg-[#0F766E] dark:bg-[#14B8A6] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                }`}
              >
                <i className="fa-solid fa-table-cells"></i>
                Matriks Guru (<span className="font-num">{totalGuru}</span>)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'syarat'}
                onClick={() => setActiveTab('syarat')}
                className={`neu-btn min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'syarat'
                    ? 'neu-btn-teal neu-tab-active bg-[#0F766E] dark:bg-[#14B8A6] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                Kelola Syarat Dokumen (<span className="font-num">{syaratList.length}</span>)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'list'}
                onClick={() => setActiveTab('list')}
                className={`neu-btn min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'list'
                    ? 'neu-btn-teal neu-tab-active bg-[#0F766E] dark:bg-[#14B8A6] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                }`}
              >
                <i className="fa-solid fa-file-lines"></i>
                Dokumen Saya (<span className="font-num">{dokumenList.length}</span>)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'upload'}
                onClick={() => setActiveTab('upload')}
                className={`neu-btn min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'neu-btn-teal neu-tab-active bg-[#0F766E] dark:bg-[#14B8A6] text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                }`}
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                Upload Baru
              </button>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ADMIN VIEW: TEACHER MATRIX CARD SYSTEM (R4.2)                             */}
        {/* ========================================================================= */}
        {isAdmin && activeTab === 'matrix' && (
          <div className="space-y-6 fade-in no-print">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="neu-card-sm bg-[var(--neu-surface)] p-4 rounded-2xl min-w-0">
                <div className="text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wide">
                  Total Dewan Guru
                </div>
                <div className="text-xl font-black font-num text-slate-900 dark:text-white mt-1">
                  {totalGuru} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Guru</span>
                </div>
              </div>

              <div className="neu-card-sm bg-[var(--neu-surface)] p-4 rounded-2xl min-w-0">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  Dokumen Lengkap (<span className="font-num">6/6</span>)
                </div>
                <div className="text-xl font-black font-num text-emerald-700 dark:text-emerald-400 mt-1">
                  {totalLengkap}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({totalGuru > 0 ? Math.round((totalLengkap / totalGuru) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="neu-card-sm bg-[var(--neu-surface)] p-4 rounded-2xl min-w-0">
                <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">
                  Belum Lengkap (<span className="font-num">&lt;6</span>)
                </div>
                <div className="text-xl font-black font-num text-rose-700 dark:text-rose-400 mt-1">
                  {totalBelumLengkap} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Guru</span>
                </div>
              </div>

              <div className="neu-card-sm bg-[var(--neu-surface)] p-4 rounded-2xl min-w-0">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                  Menunggu Verifikasi
                </div>
                <div className="text-xl font-black font-num text-amber-700 dark:text-amber-400 mt-1">
                  {totalMenungguVerif} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Dokumen</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
              <div className="relative flex-1 min-w-0">
                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none"></i>
                <input
                  type="text"
                  aria-label="Cari nama guru, NIP, atau mata pelajaran"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama guru, NIP, atau mata pelajaran..."
                  className="w-full pl-9 pr-3 py-2.5 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div className="neu-inset p-2 rounded-2xl flex flex-wrap sm:flex-nowrap gap-1.5 overflow-x-auto custom-scroll">
                {(['Semua', 'Lengkap', 'Belum Lengkap', 'Menunggu'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`neu-btn min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      statusFilter === f
                        ? 'neu-btn-teal bg-[#0F766E] dark:bg-[#14B8A6] text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                    }`}
                  >
                    {f === 'Semua' ? 'Semua Guru' : f}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimalist Cards Grid Per-Teacher Per-Subject */}
            {filteredTeacherSubjectCards.length === 0 ? (
              <div className="neu-inset bg-[var(--neu-inset)] text-center py-12 px-4 text-slate-500 dark:text-slate-400 text-xs italic rounded-2xl">
                Tidak ada data guru atau mata pelajaran yang cocok dengan filter atau pencarian.
              </div>
            ) : (
              <div className="space-y-3">
                {teacherGroups.map((g) => {
                  const tOpen = expandedTeacherId === g.teacher.id;
                  const doneCount = g.cards.filter(c => c.isComplete).length;
                  return (
                    <div key={g.teacher.id} className="neu-card-sm bg-[var(--neu-surface)] rounded-2xl p-4">
                      <button
                        type="button"
                        onClick={() => setExpandedTeacherId(tOpen ? null : g.teacher.id)}
                        aria-expanded={tOpen}
                        className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 cursor-pointer text-left min-h-[44px] rounded-xl"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] font-black text-xs flex items-center justify-center shrink-0">
                            {(g.teacher.nama_guru || 'G').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{g.teacher.nama_guru}</h4>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="font-num">{g.cards.length}</span> Mapel/Kelas
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold font-num px-2.5 py-1 rounded-lg ${doneCount === g.cards.length ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6]'}`}>
                            {doneCount}/{g.cards.length} Lengkap
                          </span>
                          <i className={`fa-solid fa-chevron-down text-[10px] text-slate-500 transition-transform duration-200 ${tOpen ? 'rotate-180 text-[#0F766E] dark:text-[#14B8A6]' : ''}`}></i>
                        </div>
                      </button>
                      {tOpen && (
                        <div className="mt-3 pt-3 border-t border-slate-300/60 dark:border-slate-700/60 grid grid-cols-1 md:grid-cols-2 gap-3 fade-in">
                          {g.cards.map((card) => {
                            const isExpanded = expandedCardKey === card.cardKey;
                            return (
                              <div
                                key={card.cardKey}
                                onClick={() => setExpandedCardKey(isExpanded ? null : card.cardKey)}
                                className="neu-card-sm bg-[var(--neu-surface)] rounded-2xl p-4 transition-all cursor-pointer card-interactive flex flex-col justify-between min-w-0"
                              >
                                <div>
                                  {/* Header: Teacher Name, Subject Badge, & Progress Pill */}
                                  <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-10 h-10 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] font-black text-xs flex items-center justify-center shrink-0">
                                        {(card.subject.nama_mapel || 'M').charAt(0).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                          {card.subject.nama_mapel}
                                        </h4>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-700/80 px-2 py-0.5 rounded-md truncate">
                                            {card.subject.kelas ? `Kelas ${card.subject.kelas}` : 'Semua Kelas'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status Badge & Percentage */}
                                    <div className="text-right shrink-0">
                                      <span className={`text-[10px] font-bold font-num px-2 py-0.5 rounded-lg inline-block ${
                                        card.isComplete
                                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                          : card.hasPending
                                          ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                      }`}>
                                        {card.completedCount}/{card.totalRequired} Dokumen ({card.completionRate}%)
                                      </span>
                                    </div>
                                  </div>

                                  {/* Slim Minimalist Progress Bar */}
                                  <div className="mt-3">
                                    <div className="neu-inset w-full h-2 rounded-full overflow-hidden p-0.5">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          card.isComplete ? 'bg-emerald-500' : card.completionRate >= 50 ? 'bg-[#0F766E] dark:bg-[#14B8A6]' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${card.completionRate}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Click prompt indicator */}
                                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                    <span>{isExpanded ? 'Klik untuk menutup rincian' : 'Klik untuk rincian dokumen'}</span>
                                    <i className={`fa-solid fa-chevron-down text-[9px] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#0F766E] dark:text-[#14B8A6]' : ''}`}></i>
                                  </div>

                                  {/* Expandable Breakdown Drawer */}
                                  {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-slate-300/60 dark:border-slate-700/60 space-y-2 fade-in" onClick={e => e.stopPropagation()}>
                                      <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Rincian Syarat Dokumen:
                                      </div>
                                      {card.requiredDocs.map((item, rIdx) => {
                                        const up = item.uploadedDoc;
                                        return (
                                          <div
                                            key={rIdx}
                                            className="p-2.5 rounded-xl neu-inset bg-[var(--neu-inset)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2"
                                          >
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] shrink-0">
                                                  {item.req.kode_dokumen}
                                                </span>
                                                <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                  {item.req.nama_dokumen}
                                                </span>
                                              </div>
                                              <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                Format: {item.req.format_dokumen} {item.req.wajib ? '• (Wajib)' : '• (Opsional)'}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                              {up ? (
                                                <>
                                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                                    up.status_verifikasi === 'Disetujui'
                                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                      : up.status_verifikasi === 'Ditolak'
                                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                  }`}>
                                                    {up.status_verifikasi || 'Menunggu'}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewDoc(up)}
                                                    className="neu-btn neu-btn-teal w-10 h-10 rounded-xl flex items-center justify-center text-xs transition cursor-pointer"
                                                    title="Buka / Verifikasi Dokumen"
                                                    aria-label="Buka atau Verifikasi Dokumen"
                                                  >
                                                    <i className="fa-solid fa-eye"></i>
                                                  </button>
                                                </>
                                              ) : (
                                                <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-1 rounded">
                                                  Belum Diunggah
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN VIEW: KELOLA SYARAT DOKUMEN PER MAPEL (R2.1)                        */}
        {/* ========================================================================= */}
        {isAdmin && activeTab === 'syarat' && (
          <div className="space-y-6 fade-in no-print">
            {/* Header & Filter Toolbar */}
            <div className="neu-inset bg-[var(--neu-inset)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-4 rounded-2xl">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <i className="fa-solid fa-gear text-[#0F766E] dark:text-[#14B8A6]"></i>
                  Standar &amp; Syarat Dokumen Per Mata Pelajaran
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Atur jenis dokumen kurikulum, format file yang diizinkan, dan apakah dokumen tersebut wajib diunggah guru.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleOpenAddSyarat}
                  className="neu-btn neu-btn-teal min-h-[40px] text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Tambah Syarat Dokumen
                </button>
              )}
            </div>

            {/* Syarat Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <label htmlFor="filter-syarat-mapel" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Filter Mapel:</label>
                <select
                  id="filter-syarat-mapel"
                  value={filterSyaratMapel}
                  onChange={e => setFilterSyaratMapel(e.target.value)}
                  className="px-3 py-2 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 font-semibold cursor-pointer"
                >
                  <option value="Semua" className="bg-[var(--neu-bg)] text-[var(--foreground)]">Semua Kategori Mapel</option>
                  <option value="Semua Mapel" className="bg-[var(--neu-bg)] text-[var(--foreground)]">Semua Mapel (Global)</option>
                  {Array.from(new Set(syaratList.map(s => s.nama_mapel).filter(m => m && m !== 'Semua Mapel'))).map(m => (
                    <option key={m} value={m} className="bg-[var(--neu-bg)] text-[var(--foreground)]">{m}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total <strong className="font-num text-slate-800 dark:text-slate-200">{syaratList.length}</strong> syarat dokumen terdaftar
              </div>
            </div>

            {/* Syarat List Table */}
            <div className="neu-card-sm bg-[var(--neu-surface)] rounded-2xl p-2">
              <div className="overflow-x-auto rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-200/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 uppercase text-[10px] font-bold border-b border-slate-300/70 dark:border-slate-700">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3">Kode</th>
                      <th className="p-3">Nama Dokumen &amp; Panduan</th>
                      <th className="p-3">Format</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/50 dark:divide-slate-700/60">
                    {syaratList
                      .filter(s => filterSyaratMapel === 'Semua' || s.nama_mapel === filterSyaratMapel)
                      .map((s, idx) => (
                        <tr key={s.id} className="hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition">
                          <td className="p-3 text-center font-bold font-num text-slate-500 dark:text-slate-400">{s.urutan ?? idx + 1}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              s.nama_mapel === 'Semua Mapel'
                                ? 'bg-[#0F766E]/15 text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6]'
                                : 'bg-sky-500/15 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                            }`}>
                              {s.nama_mapel}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#0F766E] dark:text-[#14B8A6]">
                            {s.kode_dokumen}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{s.nama_dokumen}</div>
                            {s.deskripsi && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{s.deskripsi}</div>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-mono bg-slate-200/70 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-200">
                              {s.format_dokumen}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {s.wajib !== false ? (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Wajib
                              </span>
                            ) : (
                              <span className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                Opsional
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {!isReadOnly ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSyarat(s)}
                                  title="Edit Syarat"
                                  aria-label={`Edit Syarat ${s.nama_dokumen}`}
                                  className="neu-btn w-10 h-10 rounded-xl text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center text-xs transition cursor-pointer"
                                >
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSyarat(s)}
                                  title="Hapus Syarat"
                                  aria-label={`Hapus Syarat ${s.nama_dokumen}`}
                                  className="neu-btn neu-btn-rose w-10 h-10 rounded-xl flex items-center justify-center text-xs transition cursor-pointer"
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Read-only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEACHER VIEW: MY DOCUMENTS LIST & PERSONAL COMPLETENESS CHECKLIST         */}
        {/* ========================================================================= */}
        {!isAdmin && activeTab === 'list' && (
          <div className="space-y-6 fade-in no-print">
            {/* Subject-Grouped 6-Document Matrix for Teacher */}
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <i className="fa-solid fa-layer-group text-[#0F766E] dark:text-[#14B8A6]"></i>
                  Matriks Kelengkapan Dokumen Per Mata Pelajaran
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="font-num">{myTeacherSubjects.length}</span> Rombel / Mapel Diampu
                </span>
              </div>

              {myTeacherSubjects.map((sub, sIdx) => {
                const completedInSubject = KURIKULUM_DOCS.filter(d =>
                  matchDocToTypeForSubject(dokumenList, d.id, sub.nama_mapel, sub.kelas)
                ).length;
                const percentage = Math.round((completedInSubject / 6) * 100);

                return (
                  <div
                    key={`${sub.nama_mapel}-${sub.kelas}-${sIdx}`}
                    className="neu-card-sm bg-[var(--neu-surface)] rounded-2xl p-4 space-y-3"
                  >
                    {/* Subject Header with Progress */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-300/60 dark:border-slate-700/60">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] shrink-0"></span>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {sub.nama_mapel}
                          </h4>
                          {sub.kelas && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6]">
                              Kelas {sub.kelas}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[11px] font-bold font-num px-2.5 py-0.5 rounded-md ${
                          completedInSubject === 6
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6]'
                        }`}>
                          {completedInSubject}/6 Selesai ({percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* 6-Document Status Matrix Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                      {KURIKULUM_DOCS.map(doc => {
                        const matchDoc = matchDocToTypeForSubject(dokumenList, doc.id, sub.nama_mapel, sub.kelas);
                        const isUploaded = Boolean(matchDoc);

                        return (
                          <div
                            key={doc.id}
                            className={`neu-inset bg-[var(--neu-inset)] p-3 rounded-xl flex flex-col justify-between min-h-[115px] min-w-0 gap-2 transition ${
                              isUploaded ? 'ring-1 ring-emerald-500/40 dark:ring-emerald-400/30' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{doc.short}</span>
                              <span className={`text-[11px] ${isUploaded ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                <i className={`fa-solid ${isUploaded ? 'fa-circle-check' : 'fa-circle-notch'}`}></i>
                              </span>
                            </div>

                            <div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded inline-block ${
                                isUploaded
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                              }`}>
                                {isUploaded ? 'Sudah Diunggah' : 'Belum Diunggah'}
                              </span>
                              {isUploaded && matchDoc?.status_verifikasi && (
                                <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {matchDoc.status_verifikasi}
                                </div>
                              )}
                            </div>

                            <div>
                              {isUploaded ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(matchDoc!)}
                                  className="neu-btn neu-btn-teal min-h-[40px] w-full px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <i className="fa-solid fa-eye text-[10px]"></i> Lihat
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTriggerDirectUpload(doc.name, sub.nama_mapel, sub.kelas)}
                                  className="neu-btn min-h-[40px] w-full px-2.5 py-2 rounded-xl text-[11px] font-bold text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <i className="fa-solid fa-upload text-[10px]"></i> Unggah
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Uploaded Documents List */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-3">
                Riwayat Dokumen yang Telah Anda Unggah (<span className="font-num">{dokumenList.length}</span>)
              </h3>

              {dokumenList.length === 0 ? (
                <div className="neu-inset bg-[var(--neu-inset)] text-center py-12 px-4 text-slate-500 dark:text-slate-400 text-xs italic rounded-2xl">
                  Belum ada dokumen yang diunggah. Klik tab &quot;Upload Baru&quot; untuk mengunggah berkas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1">
                  {dokumenList.map(dok => (
                    <div
                      key={dok.id}
                      className="neu-card-sm bg-[var(--neu-surface)] p-4 rounded-2xl flex flex-col justify-between gap-3 min-w-0"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold uppercase text-[#0F766E] dark:text-[#14B8A6]">
                            {dok.jenis_dokumen}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              dok.status_verifikasi === 'Disetujui'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : dok.status_verifikasi === 'Ditolak'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {dok.status_verifikasi || 'Menunggu'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight break-words">
                          {`${dok.mapel || '-'} - ${dok.kelas ? `Kelas ${extractTingkat(dok.kelas)}` : '-'} - ${dok.nama_guru || '-'}`}
                        </h4>
                        <div className="text-[10px] font-num text-slate-500 dark:text-slate-400">
                          {dok.timestamp ? formatTimestampWita(dok.timestamp) : '-'}
                        </div>

                        {dok.catatan_admin && (
                          <div className="neu-inset p-2.5 rounded-xl text-[10px]">
                            <span className="font-bold block text-slate-700 dark:text-slate-300">Catatan Admin:</span>
                            <span className="text-slate-600 dark:text-slate-400 italic break-words">{dok.catatan_admin}</span>
                          </div>
                        )}
                      </div>

                      {dok.link_file && (
                        <a
                          href={dok.link_file}
                          target="_blank"
                          rel="noreferrer"
                          className="neu-btn neu-btn-teal min-h-[40px] w-full flex items-center justify-center text-xs font-bold py-2 px-3 rounded-xl transition"
                        >
                          <i className="fa-solid fa-file-pdf mr-1.5"></i> Buka Dokumen
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEACHER VIEW: UPLOAD NEW DOCUMENT FORM                                    */}
        {/* ========================================================================= */}
        {!isAdmin && activeTab === 'upload' && (
          <div id="dokumen-content-upload" className="fade-in max-w-xl mx-auto no-print">
            <div className="neu-card-sm bg-[var(--neu-surface)] p-5 sm:p-6 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-cloud-arrow-up text-[#0F766E] dark:text-[#14B8A6]"></i>
                Upload Perangkat Pembelajaran Baru
              </h3>
              <form onSubmit={submitDokumen} className="space-y-4">
                <div>
                  <label htmlFor="upload-jenis-dokumen" className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1.5 ml-1">
                    Jenis Dokumen Kurikulum Merdeka <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="upload-jenis-dokumen"
                    required
                    value={jenis}
                    onChange={e => setJenis(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 cursor-pointer"
                  >
                    <option value="" disabled className="bg-[var(--neu-bg)] text-[var(--foreground)]">-- Pilih Jenis Dokumen --</option>
                    {KURIKULUM_DOCS.map(d => (
                      <option key={d.id} value={d.name} className="bg-[var(--neu-bg)] text-[var(--foreground)]">
                        {d.name} ({d.short})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="upload-mapel-input" className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1.5 ml-1">
                      Mata Pelajaran
                    </label>
                    <input
                      id="upload-mapel-input"
                      type="text"
                      list="mapel-upload-options"
                      value={selectedMapel}
                      onChange={e => setSelectedMapel(e.target.value)}
                      placeholder="Contoh: Matematika"
                      className="w-full px-3 py-2.5 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                    <datalist id="mapel-upload-options">
                      {availableMapels.map((m, idx) => (
                        <option key={idx} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="upload-kelas-input" className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1.5 ml-1">
                      Kelas
                    </label>
                    <input
                      id="upload-kelas-input"
                      type="text"
                      list="kelas-upload-options"
                      value={selectedKelas}
                      onChange={e => setSelectedKelas(e.target.value)}
                      placeholder="Contoh: X Merdeka"
                      className="w-full px-3 py-2.5 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                    <datalist id="kelas-upload-options">
                      {allKelasOptions.map((k, idx) => (
                        <option key={idx} value={k} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label htmlFor="upload-judul-input" className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1.5 ml-1">
                    Judul / Deskripsi Dokumen <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="upload-judul-input"
                    type="text"
                    required
                    value={judul}
                    onChange={e => setJudul(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    placeholder="Contoh: Modul Ajar Matematika Bab 1 Kelas X Merdeka"
                  />
                </div>

                <div>
                  <label htmlFor="upload-file-input" className="block text-[11px] font-bold text-slate-900 dark:text-white mb-1.5 ml-1">
                    Upload Berkas (PDF / Dokumen) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="upload-file-input"
                    type="file"
                    required
                    accept=".pdf,image/*,.docx,.doc"
                    onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full px-3 py-2 min-h-[40px] text-xs rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="neu-btn neu-btn-teal w-full font-bold min-h-[44px] py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <i className="fa-solid fa-circle-notch fa-spin"></i> Mengupload...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-cloud-arrow-up"></i> Upload Perangkat
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRINT-ONLY TABLES (STANDARDIZED ADMIN & TEACHER LAYOUT)                  */}
        {/* ========================================================================= */}
        <div className="print-only hidden print:block w-full my-4">
          {!isAdmin ? (
            <table className="w-full text-left text-xs border-collapse border border-black print:border-black print:text-[8pt]">
              <thead>
                <tr className="bg-gray-100 text-black font-bold border-b border-black print:bg-gray-100 print:text-black print:border-black">
                  <th className="px-2 py-1.5 border border-black text-center w-10">No</th>
                  <th className="px-2 py-1.5 border border-black text-center w-16">Kode</th>
                  <th className="px-2 py-1.5 border border-black">Nama Dokumen</th>
                  <th className="px-2 py-1.5 border border-black">Mata Pelajaran &amp; Kelas</th>
                  <th className="px-2 py-1.5 border border-black text-center w-24">Format</th>
                  <th className="px-2 py-1.5 border border-black text-center w-28">Status Unggah</th>
                  <th className="px-2 py-1.5 border border-black text-center w-28">Status Verifikasi</th>
                  <th className="px-2 py-1.5 border border-black text-center w-32">Tanggal Unggah</th>
                </tr>
              </thead>
              <tbody>
                {teacherPrintRows.map(row => (
                  <tr key={`${row.index}-${row.kode}-${row.mapelKelas}`} className="border-b border-black print:border-black">
                    <td className="px-2 py-1.5 border border-black text-center font-medium font-num align-top">{row.index}</td>
                    <td className="px-2 py-1.5 border border-black text-center font-mono font-bold align-top">{row.kode}</td>
                    <td className="px-2 py-1.5 border border-black align-top font-semibold">{row.nama}</td>
                    <td className="px-2 py-1.5 border border-black align-top">{row.mapelKelas}</td>
                    <td className="px-2 py-1.5 border border-black text-center align-top font-mono">{row.format}</td>
                    <td className="px-2 py-1.5 border border-black text-center align-top font-medium">{row.statusUnggah}</td>
                    <td className="px-2 py-1.5 border border-black text-center align-top font-medium">{row.statusVerif}</td>
                    <td className="px-2 py-1.5 border border-black text-center font-num align-top">{row.tanggal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'syarat' ? (
            <table className="w-full text-left text-xs border-collapse border border-black print:border-black print:text-[8pt]">
              <thead>
                <tr className="bg-gray-100 text-black font-bold border-b border-black print:bg-gray-100 print:text-black print:border-black">
                  <th className="px-2 py-1.5 border border-black text-center w-10">No</th>
                  <th className="px-2 py-1.5 border border-black">Mata Pelajaran</th>
                  <th className="px-2 py-1.5 border border-black text-center w-16">Kode</th>
                  <th className="px-2 py-1.5 border border-black">Nama Dokumen</th>
                  <th className="px-2 py-1.5 border border-black text-center w-24">Format</th>
                  <th className="px-2 py-1.5 border border-black text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {syaratList.map((s, idx) => (
                  <tr key={s.id || idx} className="border-b border-black print:border-black">
                    <td className="px-2 py-1.5 border border-black text-center font-medium font-num align-top">{s.urutan ?? idx + 1}</td>
                    <td className="px-2 py-1.5 border border-black align-top">{s.nama_mapel}</td>
                    <td className="px-2 py-1.5 border border-black text-center font-mono font-bold align-top">{s.kode_dokumen}</td>
                    <td className="px-2 py-1.5 border border-black align-top font-semibold">{s.nama_dokumen}</td>
                    <td className="px-2 py-1.5 border border-black text-center align-top font-mono">{s.format_dokumen}</td>
                    <td className="px-2 py-1.5 border border-black text-center align-top">{s.wajib !== false ? 'Wajib' : 'Opsional'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs border-collapse border border-black print:border-black print:text-[8pt]">
              <thead>
                <tr className="bg-gray-100 text-black font-bold border-b border-black print:bg-gray-100 print:text-black print:border-black">
                  <th className="px-2 py-1.5 border border-black text-center w-10">No</th>
                  <th className="px-2 py-1.5 border border-black">Nama Guru</th>
                  <th className="px-2 py-1.5 border border-black text-center w-24">NIP</th>
                  <th className="px-2 py-1.5 border border-black">Mata Pelajaran Diampu</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">CP</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">ATP</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">RPE</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">Prota</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">Promes</th>
                  <th className="px-2 py-1.5 border border-black text-center w-10">RPM</th>
                  <th className="px-2 py-1.5 border border-black text-center w-28">Kelengkapan</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeacherMatrix.map((item, idx) => {
                  const mapelStr = item.teacherMapel.map(m => m.nama_mapel).filter(Boolean).join(', ') || item.teacher.mata_pelajaran || '-';
                  return (
                    <tr key={item.teacher.id || idx} className="border-b border-black print:border-black">
                      <td className="px-2 py-1.5 border border-black text-center font-medium font-num align-top">{idx + 1}</td>
                      <td className="px-2 py-1.5 border border-black font-semibold align-top">{item.teacher.nama_guru}</td>
                      <td className="px-2 py-1.5 border border-black text-center font-mono font-num align-top">{item.teacher.nip || '-'}</td>
                      <td className="px-2 py-1.5 border border-black align-top">{mapelStr}</td>
                      {KURIKULUM_DOCS.map(doc => {
                        const d = item.docStatusMap[doc.id];
                        return (
                          <td key={doc.id} className="px-2 py-1.5 border border-black text-center font-bold align-top">
                            {d ? (d.status_verifikasi === 'Disetujui' ? '✓ (V)' : '✓') : '-'}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 border border-black text-center font-bold font-num align-top">
                        {item.completedCount}/6 ({item.completionRate}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Print Signature Block */}
        <PrintSignature
          leftTitle="Mengetahui,"
          leftSubtitle={isAdmin ? "Pengelola Data / Admin" : "Guru Mata Pelajaran"}
          leftName={user?.nama}
          leftNip={user?.nip}
          user={user}
          sekolahId={user?.sekolah_id}
          statusKepalaSekolah={statusKepalaSekolah}
        />
      </div>

      {/* ========================================================================= */}
      {/* QUICK PREVIEW & VERIFICATION MODAL FOR ADMIN & TEACHERS                   */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau dokumen ${previewDoc.judul || previewDoc.jenis_dokumen}`}
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[var(--neu-surface)] rounded-2xl w-full max-w-lg p-5 sm:p-6 modal-pop space-y-4 max-h-[90vh] overflow-y-auto custom-scroll"
          >
            <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-[#0F766E] dark:text-[#14B8A6]">
                  {previewDoc.jenis_dokumen}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-snug break-words">
                  {previewDoc.judul}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Tutup pratinjau dokumen"
                className="neu-btn w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <div className="neu-inset p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2 py-1.5 border-b border-slate-300/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Nama Guru Pengunggah:</span>
                <span className="font-bold text-slate-900 dark:text-white">{previewDoc.nama_guru}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1.5 border-b border-slate-300/50 dark:border-slate-700/50">
                <span className="text-slate-500 dark:text-slate-400">Tanggal Upload:</span>
                <span className="text-slate-900 dark:text-white font-medium font-num">
                  {previewDoc.timestamp ? formatTimestampWita(previewDoc.timestamp) : '-'}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 py-1.5 items-center">
                <span className="text-slate-500 dark:text-slate-400">Status Verifikasi:</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    previewDoc.status_verifikasi === 'Disetujui'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : previewDoc.status_verifikasi === 'Ditolak'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {previewDoc.status_verifikasi || 'Menunggu'}
                </span>
              </div>

              {previewDoc.catatan_admin && (
                <div className="pt-2 border-t border-slate-300/50 dark:border-slate-700/50">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Catatan Verifikasi Admin:
                  </span>
                  <p className="text-slate-600 dark:text-slate-300 italic text-xs leading-relaxed">
                    {previewDoc.catatan_admin}
                  </p>
                </div>
              )}
            </div>

            {/* File view link */}
            {previewDoc.link_file && (
              <a
                href={previewDoc.link_file}
                target="_blank"
                rel="noreferrer"
                className="neu-btn min-h-[44px] w-full flex items-center justify-center text-slate-900 dark:text-white py-2.5 px-4 rounded-xl text-xs font-bold transition"
              >
                <i className="fa-solid fa-arrow-up-right-from-square mr-1.5 text-[#0F766E] dark:text-[#14B8A6]"></i> Buka Dokumen di Tab Baru
              </a>
            )}

            {/* Admin Verification Actions */}
            {isAdmin && !isReadOnly && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-300/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleVerifyDokumen(previewDoc.id, 'Disetujui')}
                  className="neu-btn neu-btn-teal min-h-[44px] flex-1 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-check"></i> Setujui Dokumen
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyDokumen(previewDoc.id, 'Ditolak')}
                  className="neu-btn neu-btn-rose min-h-[44px] flex-1 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark"></i> Tolak Dokumen
                </button>
              </div>
            )}
            {isAdmin && isReadOnly && (
              <div className="pt-2 border-t border-slate-300/60 dark:border-slate-700/60">
                <div className="neu-inset p-2.5 rounded-xl text-center text-xs text-amber-700 dark:text-amber-300 font-medium">
                  <i className="fa-solid fa-lock mr-1.5"></i> Mode Peninjau (Read-Only) &mdash; Aksi verifikasi dinonaktifkan
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN MODAL: ADD / EDIT SYARAT DOKUMEN                                    */}
      {/* ========================================================================= */}
      {showSyaratModal && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowSyaratModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingSyarat ? 'Edit Syarat Dokumen' : 'Tambah Syarat Dokumen Baru'}
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[var(--neu-surface)] rounded-2xl w-full max-w-md p-5 sm:p-6 modal-pop space-y-4 max-h-[90vh] overflow-y-auto custom-scroll"
          >
            <div className="flex justify-between items-center gap-3 pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
                <i className="fa-solid fa-list-check text-[#0F766E] dark:text-[#14B8A6] shrink-0"></i>
                <span className="truncate">{editingSyarat ? 'Edit Syarat Dokumen' : 'Tambah Syarat Dokumen Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSyaratModal(false)}
                aria-label="Tutup modal syarat dokumen"
                className="neu-btn w-11 h-11 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base"></i>
              </button>
            </div>

            <form onSubmit={handleSaveSyarat} className="space-y-3 text-xs">
              <div>
                <label htmlFor="syarat-mapel-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  id="syarat-mapel-input"
                  type="text"
                  list="syarat-mapel-list"
                  required
                  value={syaratMapel}
                  onChange={e => setSyaratMapel(e.target.value)}
                  placeholder="Contoh: Semua Mapel atau Matematika"
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
                <datalist id="syarat-mapel-list">
                  <option value="Semua Mapel" />
                  {availableMapels.map((m, i) => <option key={i} value={m} />)}
                </datalist>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">Gunakan &quot;Semua Mapel&quot; untuk standar global seluruh guru.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="syarat-kode-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kode Singkat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="syarat-kode-input"
                    type="text"
                    required
                    value={syaratKode}
                    onChange={e => setSyaratKode(e.target.value)}
                    placeholder="Contoh: CP, ATP, MA"
                    className="w-full px-3 py-2 min-h-[40px] rounded-xl input-premium neu-input uppercase font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>
                <div>
                  <label htmlFor="syarat-urutan-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Urutan Tampilan
                  </label>
                  <input
                    id="syarat-urutan-input"
                    type="number"
                    min="1"
                    value={syaratUrutan}
                    onChange={e => setSyaratUrutan(Number(e.target.value))}
                    className="w-full px-3 py-2 min-h-[40px] rounded-xl input-premium neu-input font-num text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="syarat-nama-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Dokumen <span className="text-rose-500">*</span>
                </label>
                <input
                  id="syarat-nama-input"
                  type="text"
                  required
                  value={syaratNama}
                  onChange={e => setSyaratNama(e.target.value)}
                  placeholder="Contoh: Analisis Capaian Pembelajaran (CP)"
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label htmlFor="syarat-format-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Format Dokumen Diizinkan
                </label>
                <input
                  id="syarat-format-input"
                  type="text"
                  value={syaratFormat}
                  onChange={e => setSyaratFormat(e.target.value)}
                  placeholder="Contoh: PDF, DOCX"
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div>
                <label htmlFor="syarat-deskripsi-input" className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Petunjuk / Deskripsi Dokumen (Opsional)
                </label>
                <textarea
                  id="syarat-deskripsi-input"
                  rows={2}
                  value={syaratDeskripsi}
                  onChange={e => setSyaratDeskripsi(e.target.value)}
                  placeholder="Catatan panduan pengunggahan bagi guru..."
                  className="w-full px-3 py-2 rounded-xl input-premium neu-input text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="syarat-wajib-toggle"
                  checked={syaratWajib}
                  onChange={e => setSyaratWajib(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-400 text-[#0F766E] dark:text-[#14B8A6] focus:ring-[#0F766E] cursor-pointer"
                />
                <label htmlFor="syarat-wajib-toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  Wajib diunggah untuk kelengkapan 100%
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setShowSyaratModal(false)}
                  className="neu-btn min-h-[44px] flex-1 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={syaratSaving}
                  className="neu-btn neu-btn-teal min-h-[44px] flex-1 py-2.5 rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {syaratSaving ? 'Menyimpan...' : 'Simpan Syarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
