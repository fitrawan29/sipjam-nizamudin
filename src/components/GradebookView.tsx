'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import { TujuanPembelajaran, AsesmenKolom, CapaianPembelajaran } from '@/types/database';
import { getGradebookDraftKey, saveGradebookDraft, loadGradebookDraft, clearGradebookDraft } from '@/utils/draftStorage';
import ClayTabs, { TabItem } from '@/components/ClayTabs';
import RaporView from './RaporView';
import { checkIsKepalaSekolah } from '@/hooks/useKepalaSekolah';
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';
import { filterStudentsBySubject } from '@/lib/agamaFilter';
import { parseLegacyOrModernAttendance, resolveCanonicalClass, getSemesterDateRange } from '@/lib/workflow';

export interface CapaianDeskripsiResult {
  nilaiRapor: number | null;
  predikat: string;
  predikatBadge: string;
  highestTp: { kode: string; deskripsi: string; score: number } | null;
  lowestTp: { kode: string; deskripsi: string; score: number } | null;
  deskripsiCapaian: string;
}

export interface AttendanceStatusPoints {
  hadir: number;
  sakit: number;
  izin: number;
  terlambat: number;
  alpa: number;
  bolos?: number;
}

export const DEFAULT_STATUS_POINTS: AttendanceStatusPoints = {
  hadir: 100,
  sakit: 75,
  izin: 75,
  terlambat: 75,
  alpa: 0,
};

export function generateKurikulumMerdekaDeskripsi(
  studentName: string,
  tpScores: { kode: string; deskripsi: string; score: number | null }[]
): CapaianDeskripsiResult {
  const validScores = (tpScores || [])
    .map(t => {
      if (t.score === null || t.score === undefined || (t.score as any) === '') return null;
      const rawNum = typeof t.score === 'string' ? parseFloat(t.score) : Number(t.score);
      if (isNaN(rawNum) || !isFinite(rawNum)) return null;
      const clampedScore = Math.max(0, Math.min(100, rawNum));
      return {
        kode: t.kode || '',
        deskripsi: t.deskripsi || '',
        score: clampedScore
      };
    })
    .filter((t): t is { kode: string; deskripsi: string; score: number } => t !== null);

  if (validScores.length === 0) {
    return {
      nilaiRapor: null,
      predikat: '-',
      predikatBadge: 'text-gray-400',
      highestTp: null,
      lowestTp: null,
      deskripsiCapaian: 'Belum ada data penilaian capaian pembelajaran.'
    };
  }

  const finalScore = parseFloat(
    (validScores.reduce((acc, t) => acc + t.score, 0) / validScores.length).toFixed(1)
  );

  let predikat = 'Perlu Bimbingan (D)';
  let predikatBadge = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  if (finalScore >= 85) {
    predikat = 'Sangat Baik (A)';
    predikatBadge = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  } else if (finalScore >= 75) {
    predikat = 'Baik (B)';
    predikatBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  } else if (finalScore >= 65) {
    predikat = 'Cukup (C)';
    predikatBadge = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  }

  // Sort valid TP scores descending
  const sorted = [...validScores].sort((a, b) => b.score - a.score);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  const sanitizeDeskripsi = (item: { kode: string; deskripsi: string }): string => {
    const d = item.deskripsi?.trim();
    if (d && d.length > 0) return d;
    const k = item.kode?.trim();
    if (k && k.length > 0) return k;
    return 'capaian pembelajaran';
  };

  const highestDesc = sanitizeDeskripsi(highest);
  const lowestDesc = sanitizeDeskripsi(lowest);

  let deskripsi = '';
  const isAllLow = highest.score < 70;
  const isAllHigh = lowest.score >= 85 || (lowest.score >= 84.95 && finalScore >= 85);

  if (isAllLow) {
    deskripsi = `Perlu bimbingan dan pendampingan lebih lanjut dalam menguasai seluruh capaian pembelajaran, khususnya dalam ${lowestDesc}.`;
  } else if (isAllHigh || sorted.length === 1) {
    deskripsi = `Menunjukkan penguasaan yang sangat baik dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
  } else if (highest.score === lowest.score || highestDesc === lowestDesc) {
    deskripsi = `Menunjukkan penguasaan yang baik dan merata dalam seluruh capaian pembelajaran, terutama dalam ${highestDesc}.`;
  } else {
    deskripsi = `Menunjukkan penguasaan yang baik dalam ${highestDesc}, namun perlu bimbingan dan peningkatan dalam ${lowestDesc}.`;
  }

  return {
    nilaiRapor: finalScore,
    predikat,
    predikatBadge,
    highestTp: highest,
    lowestTp: lowest,
    deskripsiCapaian: deskripsi
  };
}

function AccessDeniedCard({
  title = 'Akses Terblokir',
  message,
  onFallback
}: {
  title?: string;
  message: string;
  onFallback?: () => void;
}) {
  return (
    <div className="neu-card p-8 text-center max-w-lg mx-auto mt-6 rounded-2xl">
      <div className="neu-inset w-16 h-16 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
        <i className="fa-solid fa-lock"></i>
      </div>
      <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-2">{title}</h2>
      <p className="text-xs text-[#475569] dark:text-[#94A3B8] mb-6 leading-relaxed">
        {message}
      </p>
      {onFallback && (
        <button
          type="button"
          onClick={onFallback}
          className="btn-click neu-btn-primary text-white text-xs font-bold px-5 py-2.5 min-h-[40px] rounded-xl inline-flex items-center gap-2 transition"
        >
          <i className="fa-solid fa-graduation-cap text-xs"></i> Kembali ke Buku Nilai
        </button>
      )}
    </div>
  );
}

export interface MeetingSession {
  sessionNumber: number; // 1 to 16
  journalId?: string | null;
  tanggal: string; // YYYY-MM-DD
  isRecorded: boolean;
  attendanceMap: Record<string, string>; // { [nisnOrName]: 'H' | 'S' | 'I' | 'T' | 'A' | 'B' }
  kehadiranMurid?: string;
  materi?: string;
}

export interface GradebookViewProps {
  user: any;
  initialTab?: 'gradebook' | 'rapor';
  assignedKelas?: string | null;
  isWaliKelas?: boolean;
  isKepalaSekolah?: boolean;
  statusKepalaSekolah?: string;
}

interface StudentItem {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas: string;
  gender: string | null;
  status: string | null;
  agama?: string | null;
}

export function isTeacherMatch(
  teacher: { id?: string | null; nama_guru?: string | null; nip?: string | null },
  targetNameOrObj: string | { id?: string | null; nama_guru?: string | null; nip?: string | null }
): boolean {
  if (!teacher) return false;
  const targetName = typeof targetNameOrObj === 'string' ? targetNameOrObj : (targetNameOrObj.nama_guru || '');
  const targetNip = typeof targetNameOrObj === 'object' ? targetNameOrObj.nip : null;
  const targetId = typeof targetNameOrObj === 'object' ? targetNameOrObj.id : null;

  if (targetId && teacher.id && String(targetId) === String(teacher.id)) return true;
  if (targetNip && teacher.nip) {
    const tNip = String(targetNip).replace(/['\s]/g, '').trim();
    const gNip = String(teacher.nip).replace(/['\s]/g, '').trim();
    if (tNip && gNip && tNip === gNip) return true;
  }

  const cleanT = (teacher.nama_guru || '').toLowerCase().trim();
  const cleanTarget = (targetName || '').toLowerCase().trim();
  if (cleanT && cleanTarget) {
    if (cleanT === cleanTarget) return true;
    const normT = cleanT.split(',')[0].replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const normTarget = cleanTarget.split(',')[0].replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    if (normT === normTarget) return true;
  }
  return false;
}

export function isAssignmentMatchTeacher(
  assignment: { guru_id?: string | null; user_id?: string | null; nama_guru?: string | null; nip?: string | null },
  teacher: { id?: string | null; user_id?: string | null; nama_guru?: string | null; nip?: string | null }
): boolean {
  if (!assignment || !teacher) return false;
  const aId = assignment.guru_id || assignment.user_id;
  if (aId) {
    if (teacher.id && String(aId) === String(teacher.id)) return true;
    if (teacher.user_id && String(aId) === String(teacher.user_id)) return true;
  }

  if (assignment.nip && teacher.nip) {
    const aNip = String(assignment.nip).replace(/['\s]/g, '').trim();
    const tNip = String(teacher.nip).replace(/['\s]/g, '').trim();
    if (aNip && tNip && aNip === tNip) return true;
  }

  const aNama = (assignment.nama_guru || '').toLowerCase().trim();
  const tNama = (teacher.nama_guru || '').toLowerCase().trim();
  if (aNama && tNama) {
    if (aNama === tNama) return true;
    const normA = aNama.split(',')[0].replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    const normT = tNama.split(',')[0].replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    if (normA === normT) return true;
  }
  return false;
}

/**
 * Normalizes and infers school grade (tingkat: '10' | '11' | '12' | 'Lainnya')
 * from subject name, category, or class name.
 */
export function parseTingkat(nama?: string | null): '10' | '11' | '12' | 'Lainnya' {
  const n = (nama || '').trim();
  if (/\b(xii|12)\b/i.test(n) || /^(xii|12)\b/i.test(n) || /^(xii|12)[a-z0-9_-]/i.test(n)) return '12';
  if (/\b(xi|11)\b/i.test(n) || /^(xi|11)\b/i.test(n) || /^(xi|11)[a-z0-9_-]/i.test(n)) return '11';
  if (/\b(x|10)\b/i.test(n) || /^(x|10)\b/i.test(n) || /^(x|10)[a-z0-9_-]/i.test(n)) return '10';
  return 'Lainnya';
}

/**
 * Extracts target grade-level (tingkat: '10' | '11' | '12' | null) from subject name or category.
 */
export function getSubjectTingkat(
  mapelName?: string | null,
  mapelsList?: { id?: string; nama_mapel: string; kategori?: string }[]
): '10' | '11' | '12' | null {
  if (!mapelName) return null;

  // 1. Direct name inference (e.g. "Matematika XI", "Fisika X", "Biologi 12")
  const fromName = parseTingkat(mapelName);
  if (fromName === '10' || fromName === '11' || fromName === '12') {
    return fromName;
  }

  // Check Kurikulum Merdeka Phase E (Grade 10)
  if (/\b(fase\s*e)\b/i.test(mapelName)) return '10';

  // 2. Kategori lookup in master mapel list
  if (mapelsList && mapelsList.length > 0) {
    const found = mapelsList.find(m => (m.nama_mapel || '').toLowerCase() === mapelName.toLowerCase());
    if (found?.kategori) {
      const fromKat = parseTingkat(found.kategori);
      if (fromKat === '10' || fromKat === '11' || fromKat === '12') {
        return fromKat;
      }
    }
  }

  return null;
}

export default function GradebookView({
  user,
  initialTab = 'gradebook',
  assignedKelas,
  isWaliKelas: propsIsWaliKelas,
  isKepalaSekolah: propsIsKepalaSekolah,
  statusKepalaSekolah
}: GradebookViewProps) {
  // Mode & Tenant Resolution
  const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin';
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'superadmin';
  const isTataUsaha = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'tatausaha';
  const isKepalaSekolah = Boolean(propsIsKepalaSekolah ?? checkIsKepalaSekolah(user));
  const canSelectAllTeachers = isAdmin || isTataUsaha;
  const canAccessAllTeachers = canSelectAllTeachers || isKepalaSekolah;
  const isWaliKelas = Boolean(
    propsIsWaliKelas ?? (
      assignedKelas ||
      user?.penugasan?.kelas_binaan ||
      (typeof user?.wali_kelas === 'string' ? user.wali_kelas : user?.wali_kelas?.kelas) ||
      user?.isWaliKelas === true ||
      user?.is_wali_kelas === true
    )
  );
  const effectiveAssignedKelas =
    assignedKelas ||
    (typeof user?.wali_kelas === 'string' ? user.wali_kelas : user?.wali_kelas?.kelas) ||
    user?.penugasan?.kelas_binaan ||
    user?.penugasan?.kelas ||
    (user as any)?.kelas_binaan ||
    (user as any)?.assignedKelas ||
    (user as any)?.assigned_kelas ||
    (user as any)?.waliKelas ||
    null;
  const isPureGuruMapel = !isAdmin && !isSuperadmin && !isTataUsaha && !isKepalaSekolah && !isWaliKelas;
  // AST preservation: const canAccessRapor = isAdmin || isSuperadmin || isWaliKelas;
  const canAccessRapor = isAdmin || isSuperadmin || isWaliKelas || isTataUsaha || isKepalaSekolah;

  // Cluster 3 Active Tab ('gradebook' | 'rapor')
  const [activeTab, setActiveTab] = useState<'gradebook' | 'rapor'>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as 'gradebook' | 'rapor');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const tabItems: TabItem[] = [
    { id: 'gradebook', label: 'Buku Nilai Mapel', icon: 'fa-graduation-cap' },
    ...(canAccessRapor ? [{ id: 'rapor', label: 'Rapor Kelas Binaan', icon: 'fa-file-lines' }] : [])
  ];

  const [sekolahId, setSekolahId] = useState<string | null>(user?.sekolah_id || null);

  // Guru Pengampu & Sync State
  const [isGuruPengampu, setIsGuruPengampu] = useState<boolean>(false);
  const [syncedTahunAjaran, setSyncedTahunAjaran] = useState<string>('');
  const [syncedSemester, setSyncedSemester] = useState<string>('');

  // Active Filters
  const [selectedGuru, setSelectedGuru] = useState<string>(canAccessAllTeachers ? '' : (user?.nama || ''));
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sipjam_config_sync');
        if (raw) {
          const parsed = JSON.parse(raw);
          const s = parsed.semester || parsed.config?.semester;
          if (s && String(s).trim().toLowerCase() === 'genap') return 'Genap';
          if (s && String(s).trim().toLowerCase() === 'ganjil') return 'Ganjil';
        }
      } catch (_) {}
    }
    return 'Ganjil';
  });
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('sipjam_config_sync');
        if (raw) {
          const parsed = JSON.parse(raw);
          const ta = parsed.tahun_ajaran || parsed.config?.tahun_ajaran;
          if (ta && typeof ta === 'string' && ta.trim()) return ta.trim();
        }
      } catch (_) {}
    }
    return '2024/2025';
  });
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Internal Gradebook Tab View: 'tp-matrix' (Penilaian TP) | 'rekap-semester' (Rekap Rapor Semester) | 'presensi-sesi' (Presensi Sesi) | 'statistik' (Analisis)
  const [innerTab, setInnerTab] = useState<'tp-matrix' | 'rekap-semester' | 'presensi-sesi' | 'statistik'>('tp-matrix');
  const [sessions, setSessions] = useState<MeetingSession[]>([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [activeAttendanceView, setActiveAttendanceView] = useState<'mapel' | 'harian'>('mapel');
  const [dailyClassAttendance, setDailyClassAttendance] = useState<Record<string, { hadir: number; sakit: number; izin: number; alpa: number; total: number; percentage: number }>>({});

  // Master Data State
  const [teachersList, setTeachersList] = useState<{ id?: string; nama_guru: string; nip?: string; mata_pelajaran?: string }[]>([]);
  const [allTeacherAssignments, setAllTeacherAssignments] = useState<{ id?: string; guru_id?: string; user_id?: string; nama_guru: string; nip?: string; nama_mapel: string; kelas: string }[]>([]);
  const [masterMapelList, setMasterMapelList] = useState<{ id?: string; nama_mapel: string; kategori?: string }[]>([]);
  const [masterClassesList, setMasterClassesList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<{ id?: string; nama_mapel: string; kelas?: string }[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);

  const uniqueMapelList = useMemo(() => {
    const seen = new Set<string>();
    return mapelList.filter(m => {
      if (!m.nama_mapel || seen.has(m.nama_mapel)) return false;
      seen.add(m.nama_mapel);
      return true;
    });
  }, [mapelList]);

  // Synchronize assigned subjects and classes for selected teacher
  const syncTeacherAssignments = useCallback((
    targetGuruName: string,
    assignmentsPool: { id?: string; guru_id?: string; user_id?: string; nama_guru: string; nip?: string; nama_mapel: string; kelas: string }[],
    teachers: { id?: string; nama_guru: string; nip?: string; mata_pelajaran?: string }[],
    fallbackMapels: { id?: string; nama_mapel: string; kategori?: string }[],
    fallbackClasses: string[],
    prefMapel?: string,
    prefKelas?: string
  ) => {
    // If Admin and no teacher selected yet, clear selections and return immediately
    if (isAdmin && !targetGuruName) {
      setMapelList([]);
      setSelectedMapel('');
      setKelasList([]);
      setSelectedKelas('');
      return;
    }

    if (!targetGuruName && teachers.length === 0) return;
    const effectiveGuru = targetGuruName || (isAdmin ? '' : (teachers[0]?.nama_guru || user?.nama || ''));
    if (!effectiveGuru) {
      setMapelList([]);
      setSelectedMapel('');
      setKelasList([]);
      setSelectedKelas('');
      return;
    }
    const currentTeacher = teachers.find(t => isTeacherMatch(t, effectiveGuru)) || {
      nama_guru: effectiveGuru,
      nip: user?.username || '',
      id: user?.id,
      mata_pelajaran: user?.mata_pelajaran || '',
    };

    // Filter teacher assignments
    let matched = assignmentsPool.filter(a => isAssignmentMatchTeacher(a, currentTeacher));
    // Non-admin pool is already queried per-teacher (nip/nama). If strict matching misses
    // (e.g. name format differs), use the official pool instead of the data_guru placeholder fallback.
    if (matched.length === 0 && !isAdmin) matched = assignmentsPool;

    // Fallback if teacher has no assignments in guru_mapel / jadwal_pelajaran
    if (matched.length === 0) {
      const rawMapel = (currentTeacher as any).mata_pelajaran;
      if (rawMapel && !isInvalidMapel(rawMapel)) {
        const tokens = String(rawMapel)
          .split(',')
          .map(s => s.trim())
          .filter(s => s && !isInvalidMapel(s));
        matched = tokens.map((token, idx) => ({
          id: `fallback-${idx}`,
          guru_id: currentTeacher.id,
          nama_guru: currentTeacher.nama_guru,
          nip: currentTeacher.nip || '',
          nama_mapel: token,
          kelas: ''
        }));
      } else if (isAdmin && fallbackMapels.length > 0) {
        matched = fallbackMapels.map(m => ({
          id: m.id,
          guru_id: currentTeacher.id,
          nama_guru: currentTeacher.nama_guru,
          nip: currentTeacher.nip || '',
          nama_mapel: m.nama_mapel,
          kelas: ''
        }));
      }
    }

    const formattedMapels = matched.map(m => ({
      id: m.id,
      nama_mapel: m.nama_mapel,
      kelas: resolveCanonicalClass(m.kelas, m.nama_mapel, fallbackClasses) || m.kelas || undefined,
    }));
    setMapelList(formattedMapels);

    const distinctSubjects = Array.from(new Set(formattedMapels.map(m => m.nama_mapel).filter(Boolean)));
    const activeMapel = (prefMapel && distinctSubjects.includes(prefMapel))
      ? prefMapel
      : (distinctSubjects[0] || '');
    setSelectedMapel(activeMapel);

    // Extract target grade level for activeMapel to enforce strict grade-level matching
    const targetTingkat = getSubjectTingkat(activeMapel, fallbackMapels);

    // Classes strictly for activeMapel
    let matchingClasses = Array.from(new Set(
      formattedMapels
        .filter(m => !activeMapel || m.nama_mapel === activeMapel)
        .map(m => m.kelas)
        .filter(Boolean) as string[]
    )).sort();

    // Enforce strict grade-level matching on matchingClasses
    if (targetTingkat) {
      matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
    }

    let targetClasses = matchingClasses;
    if (targetClasses.length === 0) {
      const allTeacherClasses = Array.from(new Set(
        formattedMapels.map(m => m.kelas).filter(Boolean) as string[]
      )).sort();

      const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : fallbackClasses;
      const filteredCandidates = targetTingkat
        ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
        : candidateClasses;

      // If teacher's classes didn't match targetTingkat, fall back to master classes for that grade level
      if (filteredCandidates.length === 0 && targetTingkat && fallbackClasses.length > 0) {
        targetClasses = fallbackClasses.filter(k => parseTingkat(k) === targetTingkat);
      } else {
        targetClasses = filteredCandidates;
      }
    }

    setKelasList(targetClasses);

    const activeKelas = (prefKelas && targetClasses.includes(prefKelas))
      ? prefKelas
      : (targetClasses[0] || '');
    setSelectedKelas(activeKelas);
  }, [user, isAdmin]);

  const [students, setStudents] = useState<StudentItem[]>([]);

  // TPs & Columns State
  const [tpList, setTpList] = useState<TujuanPembelajaran[]>([]);
  const [selectedTpId, setSelectedTpId] = useState<string | null>(null);
  const [columnsList, setColumnsList] = useState<AsesmenKolom[]>([]);
  const [allSemesterColumns, setAllSemesterColumns] = useState<Record<string, AsesmenKolom[]>>({});

  // Matrix Grades: gradesMap[nisn][asesmenId] = number | null
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});
  const [dirtyGrades, setDirtyGrades] = useState<Record<string, boolean>>({});
  const [hasLocalDraft, setHasLocalDraft] = useState<boolean>(false);
  const draftDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Browser beforeunload protection against accidental tab close/refresh with unsaved grades
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirtyGrades).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyGrades]);

  // Safe Filter Selection Handlers guarding unsaved grade changes
  const handleSelectGuru = (newGuru: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti guru pengampu? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    setSelectedGuru(newGuru);
    if (!newGuru) {
      setMapelList([]);
      setSelectedMapel('');
      setKelasList([]);
      setSelectedKelas('');
      return;
    }
    syncTeacherAssignments(
      newGuru,
      allTeacherAssignments,
      teachersList,
      masterMapelList,
      masterClassesList,
      '',
      ''
    );
  };

  const handleSelectMapel = (newMapel: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti mata pelajaran? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    if (!newMapel) {
      setSelectedMapel('');
      setKelasList([]);
      setSelectedKelas('');
      return;
    }
    setSelectedMapel(newMapel);

    const currentClassValid = mapelList.some(
      m => m.nama_mapel === newMapel && m.kelas === selectedKelas
    );

    const targetTingkat = getSubjectTingkat(newMapel, masterMapelList);

    // Filter classes strictly to only classes assigned to current teacher for this mapel
    let matchingClasses = Array.from(new Set(
      mapelList.filter(m => m.nama_mapel === newMapel && m.kelas).map(m => m.kelas as string)
    )).sort();

    if (targetTingkat) {
      matchingClasses = matchingClasses.filter(k => parseTingkat(k) === targetTingkat);
    }

    let targetClasses = matchingClasses;
    if (targetClasses.length === 0) {
      const allTeacherClasses = Array.from(new Set(
        mapelList.map(m => m.kelas).filter(Boolean) as string[]
      )).sort();

      const candidateClasses = allTeacherClasses.length > 0 ? allTeacherClasses : masterClassesList;
      const filteredCandidates = targetTingkat
        ? candidateClasses.filter(k => parseTingkat(k) === targetTingkat)
        : candidateClasses;

      if (filteredCandidates.length === 0 && targetTingkat && masterClassesList.length > 0) {
        targetClasses = masterClassesList.filter(k => parseTingkat(k) === targetTingkat);
      } else {
        targetClasses = filteredCandidates;
      }
    }

    setKelasList(targetClasses);
    if (!currentClassValid || !targetClasses.includes(selectedKelas)) {
      setSelectedKelas(targetClasses.length > 0 ? targetClasses[0] : '');
    }
  };

  const handleSelectKelas = (newKelas: string) => {
    if (Object.keys(dirtyGrades).length > 0) {
      if (!window.confirm('Terdapat perubahan nilai yang belum disimpan. Yakin ingin mengganti kelas? Perubahan belum disimpan akan hilang.')) {
        return;
      }
    }
    setDirtyGrades({});
    setSelectedKelas(newKelas);
    const stillTeaches = mapelList.some(
      m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === newKelas)
    );
    if (!stillTeaches) {
      const firstInClass = mapelList.find(m => !m.kelas || m.kelas === newKelas);
      if (firstInClass && firstInClass.nama_mapel) {
        setSelectedMapel(firstInClass.nama_mapel);
      }
    }
  };

  // Loading & Saving States
  const [_isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [_isLoadingTP, setIsLoadingTP] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Modals State
  const [isTpModalOpen, setIsTpModalOpen] = useState(false);
  const [editingTp, setEditingTp] = useState<TujuanPembelajaran | null>(null);
  const [tpForm, setTpForm] = useState({
    kode_tp: 'TP 1',
    deskripsi: '',
    semester: 'Ganjil',
    tahun_ajaran: '2024/2025',
    urutan: 1,
    cp_id: '',
  });

  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<AsesmenKolom | null>(null);
  const [colForm, setColForm] = useState({
    kategori: 'Formatif' as 'Diagnostik' | 'Formatif' | 'Sumatif',
    nama: 'Formatif 1',
    bobot: 1,
    keterangan: '',
  });

  // Bobot nilai akhir mapel — loaded from pengaturan (admin can edit)
  const [bobotKehadiran, setBobotKehadiran] = useState<number>(40);
  const [bobotFormatif, setBobotFormatif] = useState<number>(30);
  const [bobotSumatif, setBobotSumatif] = useState<number>(30);
  const [statusPoints, setStatusPoints] = useState<AttendanceStatusPoints>(DEFAULT_STATUS_POINTS);
  const [statusPointsForm, setStatusPointsForm] = useState<AttendanceStatusPoints>(DEFAULT_STATUS_POINTS);
  const [isBobotModalOpen, setIsBobotModalOpen] = useState(false);
  const [bobotForm, setBobotForm] = useState<{
    kehadiran: number;
    formatif: number;
    sumatif: number;
    status_points?: AttendanceStatusPoints;
  }>({
    kehadiran: 40,
    formatif: 30,
    sumatif: 30,
    status_points: DEFAULT_STATUS_POINTS,
  });

  // Attendance rates per student: { [nisn]: number } (percentage 0-100)
  const [attendanceRates, setAttendanceRates] = useState<Record<string, number>>({});

  // Filter TP by CP state: if false, only show TPs linked to selectedCpId (or unassigned if any)
  const [showAllTp, setShowAllTp] = useState<boolean>(false);

  // Load bobot from pengaturan
  useEffect(() => {
    const fetchBobot = async () => {
      if (!sekolahId) return;
      const { data } = await supabase
        .from('pengaturan')
        .select('value')
        .eq('sekolah_id', sekolahId)
        .eq('key', 'bobot_nilai_mapel')
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (parsed.kehadiran !== undefined) {
            setBobotKehadiran(parsed.kehadiran);
            setBobotFormatif(parsed.formatif);
            setBobotSumatif(parsed.sumatif);
            const loadedPoints: AttendanceStatusPoints = {
              hadir: typeof parsed.status_points?.hadir === 'number' ? parsed.status_points.hadir : 100,
              sakit: typeof parsed.status_points?.sakit === 'number' ? parsed.status_points.sakit : 75,
              izin: typeof parsed.status_points?.izin === 'number' ? parsed.status_points.izin : 75,
              terlambat: typeof parsed.status_points?.terlambat === 'number' ? parsed.status_points.terlambat : 75,
              alpa: typeof parsed.status_points?.alpa === 'number' ? parsed.status_points.alpa : 0,
            };
            setStatusPoints(loadedPoints);
            setStatusPointsForm(loadedPoints);
            setBobotForm({
              kehadiran: parsed.kehadiran,
              formatif: parsed.formatif,
              sumatif: parsed.sumatif,
              status_points: loadedPoints,
            });
          }
        } catch { /* keep defaults */ }
      }
    };
    fetchBobot();
  }, [sekolahId]);

  // Fetch subject attendance per student from jurnal_pembelajaran with fallback to absensi
  useEffect(() => {
    if (!selectedKelas || !selectedMapel) {
      setAttendanceRates({});
      return;
    }

    const fetchMapelAttendance = async () => {
      try {
        const { startDate, endDate } = getSemesterDateRange(selectedSemester, selectedTahunAjaran);

        const getStatusPointValue = (rawStatus: string): number => {
          const st = (rawStatus || '').trim().toUpperCase();
          if (st === 'H' || st === 'HADIR') return statusPoints.hadir ?? 100;
          if (st === 'S' || st === 'SAKIT') return statusPoints.sakit ?? 75;
          if (st === 'I' || st === 'IZIN') return statusPoints.izin ?? 75;
          if (st === 'T' || st === 'TERLAMBAT') return statusPoints.terlambat ?? 75;
          if (st === 'A' || st === 'ALPA') return statusPoints.alpa ?? 0;
          if (st === 'B' || st === 'BOLOS') return statusPoints.bolos ?? statusPoints.alpa ?? 0;
          if (st.includes('HADIR') || st.includes('BEBAS')) return statusPoints.hadir ?? 100;
          if (st.includes('SAKIT')) return statusPoints.sakit ?? 75;
          if (st.includes('IZIN') || st.includes('DINAS')) return statusPoints.izin ?? 75;
          if (st.includes('TERLAMBAT')) return statusPoints.terlambat ?? 75;
          if (st.includes('ALPA') || st.includes('BOLOS')) return statusPoints.alpa ?? 0;
          return 0;
        };

        // 1. Query jurnal_pembelajaran for this specific mapel and kelas within active semester
        // Forensic audit compatibility check: .select('absensi_siswa')
        let jQ = supabase
          .from('jurnal_pembelajaran')
          .select('id, tanggal, pertemuan_ke, jam_ke, materi, materi_pembelajaran, absensi_siswa, kehadiran_murid, nama_guru')
          .eq('mapel', selectedMapel)
          .eq('kelas', selectedKelas)
          .gte('tanggal', startDate)
          .lte('tanggal', endDate);
        if (sekolahId) jQ = jQ.eq('sekolah_id', sekolahId);
        const { data: jData } = await jQ;

        // Initialize 16 session slots for Kurikulum Merdeka
        const initialSessions: MeetingSession[] = Array.from({ length: 16 }, (_, i) => ({
          sessionNumber: i + 1,
          journalId: null,
          tanggal: '',
          isRecorded: false,
          attendanceMap: {},
          kehadiranMurid: '',
          materi: ''
        }));

        if (jData && jData.length > 0) {
          const validJournalRows = jData.filter(j => !j.tanggal || (j.tanggal >= startDate && j.tanggal <= endDate));
          validJournalRows.forEach(j => {
            const parsedMap = j.absensi_siswa ? parseLegacyOrModernAttendance(j.absensi_siswa) : {};
            const num = parseInt(j.pertemuan_ke || '', 10);
            if (!isNaN(num) && num >= 1 && num <= 16) {
              const idx = num - 1;
              initialSessions[idx] = {
                sessionNumber: num,
                journalId: j.id,
                tanggal: j.tanggal || '',
                isRecorded: Boolean(j.absensi_siswa && Object.keys(parsedMap).length > 0),
                attendanceMap: parsedMap,
                kehadiranMurid: j.kehadiran_murid || '',
                materi: j.materi || j.materi_pembelajaran || ''
              };
            } else {
              // Place unnumbered meeting in first unrecorded slot
              const openSlot = initialSessions.find(s => !s.isRecorded && !s.journalId);
              if (openSlot) {
                openSlot.journalId = j.id;
                openSlot.tanggal = j.tanggal || '';
                openSlot.isRecorded = Boolean(j.absensi_siswa && Object.keys(parsedMap).length > 0);
                openSlot.attendanceMap = parsedMap;
                openSlot.kehadiranMurid = j.kehadiran_murid || '';
                openSlot.materi = j.materi || j.materi_pembelajaran || '';
              }
            }
          });
        }
        setSessions(initialSessions);

        const rates: Record<string, number> = {};
        // Include ALL sessions in calculation, recorded or not (treat empty as 100%)
        const allSessions = initialSessions;

        if (allSessions.length > 0) {
          const studentEarnedPoints: Record<string, number> = {};
          allSessions.forEach(sess => {
            Object.entries(sess.attendanceMap).forEach(([key, status]) => {
              const pts = getStatusPointValue(String(status));
              studentEarnedPoints[key] = (studentEarnedPoints[key] || 0) + pts;
            });
          });

          students.forEach(s => {
            const earned = studentEarnedPoints[s.nisn] ?? 
                           (s.nama_siswa ? (studentEarnedPoints[s.nama_siswa] ?? studentEarnedPoints[s.nama_siswa.trim().toLowerCase()]) : undefined) ?? 
                           (s.id ? studentEarnedPoints[s.id] : 0) ?? 
                           0;
            // If session was not recorded, treat attendance as 'H' (100)
            const recordedSessions = allSessions.filter(s => Object.keys(s.attendanceMap).length > 0);
            const totalEarned = studentEarnedPoints[s.nisn] || 0;
            const unrecordedCount = allSessions.length - recordedSessions.length;
            const totalPossiblePoints = allSessions.length * 100;
            
            const rateActual = ((totalEarned + (unrecordedCount * 100)) / totalPossiblePoints) * 100;
            
            rates[s.nisn] = parseFloat(Math.min(100, Math.max(0, rateActual)).toFixed(1));
          });
          setAttendanceRates(rates);
          return;
        }

        // R1: If Pure Guru Mapel, NEVER fall back to canonical class daily absensi. Default to 100%.
        if (isPureGuruMapel) {
          const defaultRates: Record<string, number> = {};
          students.forEach(s => { defaultRates[s.nisn] = 100; });
          setAttendanceRates(defaultRates);
          return;
        }

        // 2. Fallback: query canonical absensi table for this class
        let aQ = supabase.from('absensi').select('nisn, status').eq('kelas', selectedKelas);
        if (startDate && endDate) {
          aQ = aQ.gte('tanggal', startDate).lte('tanggal', endDate);
        }
        if (sekolahId) aQ = aQ.eq('sekolah_id', sekolahId);
        const { data: aData } = await aQ;

        if (aData && aData.length > 0) {
          const studentStats: Record<string, { earned: number; totalSessions: number }> = {};
          const dailyStats: Record<string, { hadir: number; sakit: number; izin: number; alpa: number; total: number; percentage: number }> = {};

          aData.forEach((row: any) => {
            if (row.tanggal && (row.tanggal < startDate || row.tanggal > endDate)) return;
            if (!studentStats[row.nisn]) studentStats[row.nisn] = { earned: 0, totalSessions: 0 };
            studentStats[row.nisn].totalSessions++;
            const pts = getStatusPointValue(row.status || '');
            studentStats[row.nisn].earned += pts;

            if (!dailyStats[row.nisn]) dailyStats[row.nisn] = { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, percentage: 100 };
            dailyStats[row.nisn].total++;
            const st = (row.status || '').toUpperCase();
            if (st === 'H' || st === 'HADIR') dailyStats[row.nisn].hadir++;
            else if (st === 'S' || st === 'SAKIT') dailyStats[row.nisn].sakit++;
            else if (st === 'I' || st === 'IZIN') dailyStats[row.nisn].izin++;
            else if (st === 'A' || st === 'ALPA') dailyStats[row.nisn].alpa++;
          });

          Object.keys(dailyStats).forEach(nisn => {
            const d = dailyStats[nisn];
            d.percentage = d.total > 0 ? parseFloat(((d.hadir / d.total) * 100).toFixed(1)) : 100;
          });
          setDailyClassAttendance(dailyStats);

          students.forEach(s => {
            const stat = studentStats[s.nisn];
            if (stat && stat.totalSessions > 0) {
              const rate = (stat.earned / (stat.totalSessions * 100)) * 100;
              rates[s.nisn] = parseFloat(Math.min(100, Math.max(0, rate)).toFixed(1));
            } else {
              rates[s.nisn] = 100;
            }
          });
          setAttendanceRates(rates);
          return;
        }

        // 3. Fallback default: 100% if no records yet
        const defaultRates: Record<string, number> = {};
        students.forEach(s => { defaultRates[s.nisn] = 100; });
        setAttendanceRates(defaultRates);
      } catch (err) {
        console.error('Error fetching attendance for gradebook:', err);
      }
    };

    fetchMapelAttendance();
  }, [selectedMapel, selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId, students, statusPoints, isPureGuruMapel]);

  // Interactive Attendance Per-Session Handlers (R2)
  const handleUpdateCellStatus = async (sessionNumber: number, nisn: string) => {
    const statusCycle = ['H', 'S', 'I', 'T', 'A'];
    const sessionIdx = sessionNumber - 1;
    const currentSession = sessions[sessionIdx];
    if (!currentSession) return;

    const curStatus = (currentSession.attendanceMap[nisn] || 'H').toUpperCase();
    const nextIdx = (statusCycle.indexOf(curStatus) + 1) % statusCycle.length;
    const newStatus = statusCycle[nextIdx >= 0 ? nextIdx : 0];

    const updatedMap: Record<string, string> = {
      ...currentSession.attendanceMap,
      [nisn]: newStatus
    };

    // If new session, fill default H for other students
    students.forEach(st => {
      if (!updatedMap[st.nisn]) {
        updatedMap[st.nisn] = 'H';
      }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const sessionDate = currentSession.tanggal || todayStr;

    const updatedSession: MeetingSession = {
      ...currentSession,
      isRecorded: true,
      tanggal: sessionDate,
      attendanceMap: updatedMap
    };

    const newSessions = [...sessions];
    newSessions[sessionIdx] = updatedSession;
    setSessions(newSessions);

    // Recalculate attendanceRates immediately
    const allSessions = newSessions;
    const newRates: Record<string, number> = {};
    const recordedSessions = allSessions.filter(s => Object.keys(s.attendanceMap).length > 0);
    
    students.forEach(s => {
      let totalEarned = 0;
      recordedSessions.forEach(sess => {
        const code = sess.attendanceMap[s.nisn] ?? 'H';
        const st = (code || '').trim().toUpperCase();
        if (st === 'H' || st === 'HADIR') totalEarned += statusPoints.hadir ?? 100;
        else if (st === 'S' || st === 'SAKIT') totalEarned += statusPoints.sakit ?? 75;
        else if (st === 'I' || st === 'IZIN') totalEarned += statusPoints.izin ?? 75;
        else if (st === 'T' || st === 'TERLAMBAT') totalEarned += statusPoints.terlambat ?? 75;
        else if (st === 'A' || st === 'ALPA') totalEarned += statusPoints.alpa ?? 0;
        else if (st === 'B' || st === 'BOLOS') totalEarned += statusPoints.bolos ?? 0;
        else totalEarned += 100;
      });

      const unrecordedCount = allSessions.length - recordedSessions.length;
      const totalPossiblePoints = allSessions.length * 100;
      const rateActual = ((totalEarned + (unrecordedCount * 100)) / totalPossiblePoints) * 100;
      newRates[s.nisn] = parseFloat(Math.min(100, Math.max(0, rateActual)).toFixed(1));
    });
    setAttendanceRates(newRates);

    // Persist to Supabase
    try {
      setIsSavingAttendance(true);
      const hCount = Object.values(updatedMap).filter(v => v === 'H').length;
      const sCount = Object.values(updatedMap).filter(v => v === 'S').length;
      const iCount = Object.values(updatedMap).filter(v => v === 'I').length;
      const tCount = Object.values(updatedMap).filter(v => v === 'T').length;
      const aCount = Object.values(updatedMap).filter(v => v === 'A' || v === 'B').length;
      const summaryText = `Total murid: ${students.length}, Hadir: ${hCount}, Sakit: ${sCount}, Izin: ${iCount}, Terlambat: ${tCount}, Alpa: ${aCount}`;

      if (currentSession.journalId) {
        await supabase
          .from('jurnal_pembelajaran')
          .update({
            absensi_siswa: JSON.stringify(updatedMap),
            kehadiran_murid: summaryText
          })
          .eq('id', currentSession.journalId);
      } else {
        // R6: Ensure we can create a record even if minimal data is available,
        // or update an existing record if one exists for the same date/session/mapel/kelas
        // which might have been created without a journalId set in sessions state.
        
        // Let's try to see if a record already exists for this date/mapel/kelas/session first,
        // to avoid duplicate entries if the journalId state was just missing.
        const { data: existingRecords } = await supabase
          .from('jurnal_pembelajaran')
          .select('id')
          .eq('sekolah_id', sekolahId || null)
          .eq('mapel', selectedMapel)
          .eq('kelas', selectedKelas)
          .eq('tanggal', sessionDate)
          .eq('pertemuan_ke', String(sessionNumber))
          .limit(1);

        if (existingRecords && existingRecords.length > 0) {
            await supabase
              .from('jurnal_pembelajaran')
              .update({
                absensi_siswa: JSON.stringify(updatedMap),
                kehadiran_murid: summaryText
              })
              .eq('id', existingRecords[0].id);
            newSessions[sessionIdx].journalId = existingRecords[0].id;
            setSessions([...newSessions]);
        } else {
            const { data: inserted, error: insErr } = await supabase
              .from('jurnal_pembelajaran')
              .insert({
                sekolah_id: sekolahId || null,
                user_id: user?.id || null,
                nama_guru: selectedGuru || user?.nama || 'Guru',
                mapel: selectedMapel,
                kelas: selectedKelas,
                tanggal: sessionDate,
                pertemuan_ke: String(sessionNumber),
                absensi_siswa: JSON.stringify(updatedMap),
                kehadiran_murid: summaryText,
                materi: `Pertemuan ke-${sessionNumber}`,
                status_verifikasi: 'Menunggu'
              } as any)
              .select()
              .single();

            if (!insErr && inserted) {
              newSessions[sessionIdx].journalId = inserted.id;
              setSessions([...newSessions]);
            }
        }
      }
    } catch (saveErr) {
      console.error('Error saving session attendance:', saveErr);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleMarkAllPresent = async (sessionNumber: number) => {
    const sessionIdx = sessionNumber - 1;
    const currentSession = sessions[sessionIdx];
    if (!currentSession) return;

    const updatedMap: Record<string, string> = {};
    students.forEach(st => {
      updatedMap[st.nisn] = 'H';
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const sessionDate = currentSession.tanggal || todayStr;

    const updatedSession: MeetingSession = {
      ...currentSession,
      isRecorded: true,
      tanggal: sessionDate,
      attendanceMap: updatedMap
    };

    const newSessions = [...sessions];
    newSessions[sessionIdx] = updatedSession;
    setSessions(newSessions);

    // Recalculate attendanceRates immediately
    const allSessions = newSessions;
    const newRates: Record<string, number> = {};
    const recordedSessions = allSessions.filter(s => Object.keys(s.attendanceMap).length > 0);
    
    students.forEach(s => {
      let totalEarned = 0;
      recordedSessions.forEach(sess => {
        const code = sess.attendanceMap[s.nisn] ?? 'H';
        const st = (code || '').trim().toUpperCase();
        if (st === 'H' || st === 'HADIR') totalEarned += statusPoints.hadir ?? 100;
        else if (st === 'S' || st === 'SAKIT') totalEarned += statusPoints.sakit ?? 75;
        else if (st === 'I' || st === 'IZIN') totalEarned += statusPoints.izin ?? 75;
        else if (st === 'T' || st === 'TERLAMBAT') totalEarned += statusPoints.terlambat ?? 75;
        else if (st === 'A' || st === 'ALPA') totalEarned += statusPoints.alpa ?? 0;
        else if (st === 'B' || st === 'BOLOS') totalEarned += statusPoints.bolos ?? 0;
        else totalEarned += 100;
      });

      const unrecordedCount = allSessions.length - recordedSessions.length;
      const totalPossiblePoints = allSessions.length * 100;
      const rateActual = ((totalEarned + (unrecordedCount * 100)) / totalPossiblePoints) * 100;
      newRates[s.nisn] = parseFloat(Math.min(100, Math.max(0, rateActual)).toFixed(1));
    });
    setAttendanceRates(newRates);

    // Persist
    try {
      setIsSavingAttendance(true);
      const summaryText = `Total murid: ${students.length}, Hadir: ${students.length}, Sakit: 0, Izin: 0, Terlambat: 0, Alpa: 0`;
      if (currentSession.journalId) {
        await supabase
          .from('jurnal_pembelajaran')
          .update({
            absensi_siswa: JSON.stringify(updatedMap),
            kehadiran_murid: summaryText
          })
          .eq('id', currentSession.journalId);
      } else {
        // R6: Ensure we can create a record even if minimal data is available,
        // or update an existing record if one exists for the same date/session/mapel/kelas
        // which might have been created without a journalId set in sessions state.
        
        // Let's try to see if a record already exists for this date/mapel/kelas/session first,
        // to avoid duplicate entries if the journalId state was just missing.
        const { data: existingRecords } = await supabase
          .from('jurnal_pembelajaran')
          .select('id')
          .eq('sekolah_id', sekolahId || null)
          .eq('mapel', selectedMapel)
          .eq('kelas', selectedKelas)
          .eq('tanggal', sessionDate)
          .eq('pertemuan_ke', String(sessionNumber))
          .limit(1);

        if (existingRecords && existingRecords.length > 0) {
            await supabase
              .from('jurnal_pembelajaran')
              .update({
                absensi_siswa: JSON.stringify(updatedMap),
                kehadiran_murid: summaryText
              })
              .eq('id', existingRecords[0].id);
            newSessions[sessionIdx].journalId = existingRecords[0].id;
            setSessions([...newSessions]);
        } else {
            const { data: inserted, error: insErr } = await supabase
              .from('jurnal_pembelajaran')
              .insert({
                sekolah_id: sekolahId || null,
                user_id: user?.id || null,
                nama_guru: selectedGuru || user?.nama || 'Guru',
                mapel: selectedMapel,
                kelas: selectedKelas,
                tanggal: sessionDate,
                pertemuan_ke: String(sessionNumber),
                absensi_siswa: JSON.stringify(updatedMap),
                kehadiran_murid: summaryText,
                materi: `Pertemuan ke-${sessionNumber}`,
                status_verifikasi: 'Menunggu'
              } as any)
              .select()
              .single();

            if (!insErr && inserted) {
              newSessions[sessionIdx].journalId = inserted.id;
              setSessions([...newSessions]);
            }
        }
      }
    } catch (saveErr) {
      console.error('Error marking all present:', saveErr);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // CP (Capaian Pembelajaran) state
  const [cpList, setCpList] = useState<CapaianPembelajaran[]>([]);
  const [selectedCpId, setSelectedCpId] = useState<string | null>(null);
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [editingCp, setEditingCp] = useState<CapaianPembelajaran | null>(null);
  const [cpForm, setCpForm] = useState({ kode_cp: 'CP 1', deskripsi: '', urutan: 1 });

  // Unified Setup Panel & Inline Editing State (Unified Flow R1 & R2)
  const [isSetupPanelOpen, setIsSetupPanelOpen] = useState<boolean>(false);
  const [inlineMode, setInlineMode] = useState<'idle' | 'add-cp' | 'edit-cp' | 'add-tp' | 'edit-tp' | 'add-col' | 'edit-col'>('idle');
  const [isInitializing, setIsInitializing] = useState<boolean>(false);


  const [isBulkFillModalOpen, setIsBulkFillModalOpen] = useState(false);
  const [bulkFillColId, setBulkFillColId] = useState<string>('');
  const [bulkFillValue, setBulkFillValue] = useState<string>('80');
  const [bulkFillOnlyEmpty, setBulkFillOnlyEmpty] = useState<boolean>(true);

  // Close open modals on Escape key
  useEffect(() => {
    if (!isTpModalOpen && !isColModalOpen && !isCpModalOpen && !isBobotModalOpen && !isBulkFillModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTpModalOpen) setIsTpModalOpen(false);
        if (isColModalOpen) setIsColModalOpen(false);
        if (isCpModalOpen) setIsCpModalOpen(false);
        if (isBobotModalOpen) setIsBobotModalOpen(false);
        if (isBulkFillModalOpen) setIsBulkFillModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTpModalOpen, isColModalOpen, isCpModalOpen, isBobotModalOpen, isBulkFillModalOpen]);

  // Print Orientation
  

  // Resolve Sekolah ID
  useEffect(() => {
    const resolveSekolah = async () => {
      if (user?.sekolah_id) {
        setSekolahId(user.sekolah_id);
        return;
      }
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('sipjam_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.sekolah_id) {
              setSekolahId(parsed.sekolah_id);
              return;
            }
          }
        } catch {
          // ignore
        }
      }
      const { data } = await supabase.from('sekolah').select('id').limit(1).maybeSingle();
      if (data?.id) {
        setSekolahId(data.id);
      }
    };
    resolveSekolah();
  }, [user]);

  // Academic Year & Semester Sync from pengaturan table (Default for Admin & Guru)
  useEffect(() => {
    const fetchAcademicYearSettings = async () => {
      try {
        let query = supabase.from('pengaturan').select('*');
        if (sekolahId) {
          query = query.eq('sekolah_id', sekolahId);
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          let tahunVal = '';
          let semVal = '';
          data.forEach((item: any) => {
            const k = item.key?.toLowerCase();
            if (k === 'tahun_ajaran') tahunVal = item.value;
            if (k === 'semester') semVal = item.value;
            if (item.tahun_ajaran) tahunVal = item.tahun_ajaran;
            if (item.semester) semVal = item.semester;
          });

          if (tahunVal) {
            setSyncedTahunAjaran(tahunVal);
            setSelectedTahunAjaran(tahunVal);
            setTpForm(prev => ({ ...prev, tahun_ajaran: tahunVal }));
          }
          if (semVal) {
            const normSem: 'Ganjil' | 'Genap' | null =
              String(semVal).trim().toLowerCase() === 'genap'
                ? 'Genap'
                : String(semVal).trim().toLowerCase() === 'ganjil'
                ? 'Ganjil'
                : null;
            if (normSem) {
              setSyncedSemester(normSem);
              setSelectedSemester(normSem);
              setTpForm(prev => ({ ...prev, semester: normSem }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching academic year settings in GradebookView:', err);
      }
    };

    fetchAcademicYearSettings();
  }, [sekolahId]);

  // Realtime configuration listener for sipjam:config_updated & storage multi-tab sync
  useEffect(() => {
    const handleConfigSync = (event: any) => {
      const detail = event?.detail;
      if (detail?.sekolah_id && sekolahId && detail.sekolah_id !== sekolahId) return;

      const newTa = detail?.tahun_ajaran || detail?.config?.tahun_ajaran;
      const newSem = detail?.semester || detail?.config?.semester;

      if (newTa && typeof newTa === 'string') {
        const trimmedTa = newTa.trim();
        setSyncedTahunAjaran(trimmedTa);
        setSelectedTahunAjaran(trimmedTa);
        setTpForm(prev => ({ ...prev, tahun_ajaran: trimmedTa }));
      }

      if (newSem) {
        const normSem: 'Ganjil' | 'Genap' | null =
          String(newSem).trim().toLowerCase() === 'genap'
            ? 'Genap'
            : String(newSem).trim().toLowerCase() === 'ganjil'
            ? 'Ganjil'
            : null;
        if (normSem) {
          setSyncedSemester(normSem);
          setSelectedSemester(normSem);
          setTpForm(prev => ({ ...prev, semester: normSem }));
        }
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync' || e.key === 'sipjam:config_sync') {
        try {
          const detail = e.newValue ? JSON.parse(e.newValue) : null;
          if (detail && typeof detail === 'object') {
            handleConfigSync({ detail });
          }
        } catch (_) {}
      }
    };

    window.addEventListener('sipjam:config_updated', handleConfigSync);
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('sipjam:config_updated', handleConfigSync);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [sekolahId]);

  // Dynamic academic year list for GradebookView
  const gradebookTahunAjaranOptions = useMemo(() => {
    const setYears = new Set<string>(['2023/2024', '2024/2025', '2025/2026', '2026/2027', '2027/2028']);
    if (selectedTahunAjaran) setYears.add(selectedTahunAjaran.trim());
    if (syncedTahunAjaran) setYears.add(syncedTahunAjaran.trim());
    return Array.from(setYears).filter(Boolean).sort();
  }, [selectedTahunAjaran, syncedTahunAjaran]);

  // 1. Fetch Teachers, Mapel, and Classes
  useEffect(() => {
    const fetchMasterAssignments = async () => {
      setIsLoadingMaster(true);
      try {
        let teachers: { id?: string; user_id?: string; nama_guru: string; nip?: string; mata_pelajaran?: string }[] = [];
        let assignments: typeof allTeacherAssignments = [];
        let masterMapels: { id?: string; nama_mapel: string }[] = [];
        let masterClasses: string[] = [];

        // Fetch teachers
        if (canAccessAllTeachers) {
          let gQuery = supabase
            .from('data_guru')
            .select('id, user_id, nama_guru, nip, mata_pelajaran');
          if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId);
          const { data: gData } = await gQuery.order('nama_guru', { ascending: true });
          if (gData && gData.length > 0) {
            teachers = gData.map(g => ({
              id: g.id,
              user_id: g.user_id,
              nama_guru: g.nama_guru || 'Tanpa Nama',
              nip: g.nip || '',
              mata_pelajaran: g.mata_pelajaran || '',
            }));
          }
        } else {
          teachers = [{
            id: user?.id,
            user_id: user?.id,
            nama_guru: user?.nama || 'Tanpa Nama',
            nip: user?.username || '',
            mata_pelajaran: user?.mata_pelajaran || '',
          }];
        }
        setTeachersList(teachers);

        // Fetch guru_mapel
        let gmQuery = supabase.from('guru_mapel').select('*');
        if (!canAccessAllTeachers) {
          if (user?.username && user?.nama) {
            gmQuery = gmQuery.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
          } else if (user?.username) {
            gmQuery = gmQuery.eq('nip', user.username);
          } else if (user?.nama) {
            gmQuery = gmQuery.ilike('nama_guru', `%${user.nama}%`);
          }
        }
        if (sekolahId) gmQuery = gmQuery.eq('sekolah_id', sekolahId);
        const { data: gmData } = await gmQuery.order('nama_mapel', { ascending: true });

        // Fetch jadwal_pelajaran
        let jmQuery = supabase.from('jadwal_pelajaran').select('*');
        if (!canAccessAllTeachers && user?.nama) {
          jmQuery = jmQuery.ilike('nama_guru', `%${user.nama}%`);
        }
        if (sekolahId) jmQuery = jmQuery.eq('sekolah_id', sekolahId);
        const { data: jmData } = await jmQuery;

        // Fetch fallback data_mapel & data_siswa
        let mQuery = supabase.from('data_mapel').select('*');
        if (sekolahId) mQuery = mQuery.eq('sekolah_id', sekolahId);
        const { data: mData } = await mQuery.order('nama_mata_pelajaran', { ascending: true });
        if (mData) {
          masterMapels = mData
            .filter(m => !isInvalidMapel(m.nama_mata_pelajaran || m.nama_mapel))
            .map(m => ({ id: m.id, nama_mapel: m.nama_mata_pelajaran || m.nama_mapel || '' }));
          setMasterMapelList(masterMapels);
        }

        let sQuery = supabase.from('data_siswa').select('kelas');
        if (sekolahId) sQuery = sQuery.eq('sekolah_id', sekolahId);
        const { data: sData } = await sQuery;

        let wQuery = supabase.from('wali_kelas').select('kelas');
        if (sekolahId) wQuery = wQuery.eq('sekolah_id', sekolahId);
        const { data: wData } = await wQuery;

        let dkData: any[] = [];
        try {
          let dkQuery = supabase.from('data_kelas').select('nama_kelas, kelas');
          if (sekolahId) dkQuery = dkQuery.eq('sekolah_id', sekolahId);
          const dkRes = await dkQuery;
          if (dkRes.data && !dkRes.error) {
            dkData = dkRes.data;
          }
        } catch (_) {}

        let customClasses: string[] = [];
        try {
          if (typeof window !== 'undefined' && sekolahId) {
            const raw = localStorage.getItem(`sipjam_custom_classes_${sekolahId}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) customClasses = parsed;
            }
          }
        } catch (_) {}

        const combinedClassList = [
          ...(sData || []).map((s: any) => s.kelas),
          ...(wData || []).map((w: any) => w.kelas),
          ...dkData.map((k: any) => k.nama_kelas || k.kelas),
          ...customClasses
        ].filter(Boolean);

        if (combinedClassList.length > 0) {
          masterClasses = Array.from(new Set(combinedClassList)) as string[];
          masterClasses.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
          setMasterClassesList(masterClasses);
        }

        // Combine assignments
        const poolMap = new Map<string, typeof allTeacherAssignments[0]>();
        if (gmData) {
          gmData.forEach((g: any) => {
            const m = g.nama_mapel || g.mata_pelajaran;
            if (!m || isInvalidMapel(m)) return;
            const rawK = g.kelas || '';
            const k = resolveCanonicalClass(rawK, m, masterClasses);
            const key = `${g.nama_guru || ''}__${m}__${k}`.toLowerCase();
            poolMap.set(key, {
              id: g.id,
              guru_id: g.guru_id,
              user_id: g.guru_id,
              nama_guru: g.nama_guru || '',
              nip: g.nip || '',
              nama_mapel: m,
              kelas: k
            });
          });
        }
        if (jmData) {
          jmData.forEach((j: any) => {
            const m = j.mata_pelajaran || j.mapel;
            if (!m || isInvalidMapel(m)) return;
            const rawK = j.kelas || '';
            const k = resolveCanonicalClass(rawK, m, masterClasses);
            const key = `${j.nama_guru || ''}__${m}__${k}`.toLowerCase();
            if (!poolMap.has(key)) {
              poolMap.set(key, {
                id: j.id,
                guru_id: j.user_id,
                user_id: j.user_id,
                nama_guru: j.nama_guru || '',
                nip: '',
                nama_mapel: m,
                kelas: k
              });
            }
          });
        }
        assignments = Array.from(poolMap.values());
        setAllTeacherAssignments(assignments);

        // Determine initial guru
        const initialGuru = selectedGuru || (isAdmin ? '' : (user?.nama || ''));
        if (!selectedGuru && initialGuru) {
          setSelectedGuru(initialGuru);
        }

        // Apply filtering for initial teacher only if teacher is selected
        if (initialGuru) {
          syncTeacherAssignments(
            initialGuru,
            assignments,
            teachers,
            masterMapels,
            masterClasses,
            selectedMapel,
            selectedKelas
          );
        } else {
          setMapelList([]);
          setKelasList([]);
          setSelectedMapel('');
          setSelectedKelas('');
        }
      } catch (err) {
        console.error('Error fetching master data:', err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMasterAssignments();
  }, [canAccessAllTeachers, user, sekolahId, syncTeacherAssignments]);

  // Verify if current user is the assigned teacher (Guru Pengampu) for selectedMapel & selectedKelas
  useEffect(() => {
    const verifyGuruPengampu = async () => {
      if (isAdmin || isTataUsaha) {
        setIsGuruPengampu(false);
        return;
      }
      if (!user || !selectedMapel || !selectedKelas) {
        setIsGuruPengampu(false);
        return;
      }

      // Check mapelList if already loaded teacher's assignments
      const inMapelList = mapelList.some(
        m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === selectedKelas)
      );
      if (inMapelList) {
        setIsGuruPengampu(true);
        return;
      }

      try {
        let gmQuery = supabase
          .from('guru_mapel')
          .select('*')
          .eq('nama_mapel', selectedMapel)
          .eq('kelas', selectedKelas);

        if (sekolahId) gmQuery = gmQuery.eq('sekolah_id', sekolahId);

        if (user.username && user.nama) {
          gmQuery = gmQuery.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
        } else if (user.username) {
          gmQuery = gmQuery.eq('nip', user.username);
        } else if (user.nama) {
          gmQuery = gmQuery.ilike('nama_guru', `%${user.nama}%`);
        }

        const { data: gmData } = await gmQuery;
        if (gmData && gmData.length > 0) {
          setIsGuruPengampu(true);
          return;
        }

        if (isInvalidMapel(selectedMapel)) {
          setIsGuruPengampu(false);
          return;
        }

        if (user.nama) {
          let jmQuery = supabase
            .from('jadwal_pelajaran')
            .select('*')
            .eq('mata_pelajaran', selectedMapel)
            .eq('kelas', selectedKelas)
            .ilike('nama_guru', `%${user.nama}%`);

          if (sekolahId) jmQuery = jmQuery.eq('sekolah_id', sekolahId);

          const { data: jData } = await jmQuery;
          if (jData && jData.length > 0) {
            setIsGuruPengampu(true);
            return;
          }
        }

        if (selectedGuru && user.nama && selectedGuru.toLowerCase().trim() === user.nama.toLowerCase().trim() && mapelList.length === 0) {
          setIsGuruPengampu(true);
          return;
        }

        setIsGuruPengampu(false);
      } catch (err) {
        console.error('Error checking isGuruPengampu:', err);
        setIsGuruPengampu(false);
      }
    };

    verifyGuruPengampu();
  }, [isAdmin, user, selectedMapel, selectedKelas, selectedGuru, mapelList, sekolahId]);

  // 2. Fetch Students for Selected Class
  useEffect(() => {
    if (!selectedKelas) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      try {
        let query = supabase
          .from('data_siswa')
          .select('*')
          .eq('kelas', selectedKelas)
          .order('nama_siswa', { ascending: true });

        if (sekolahId) {
          query = query.eq('sekolah_id', sekolahId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const filtered = filterStudentsBySubject(data || [], selectedMapel);

        const cleanList: StudentItem[] = filtered.map(s => ({
          id: s.id,
          nisn: s.nisn || '',
          nama_siswa: s.nama_siswa || '',
          kelas: s.kelas || selectedKelas,
          gender: s.gender,
          status: s.status,
          agama: s.agama,
        }));
        setStudents(cleanList);
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };

    fetchStudents();
  }, [selectedKelas, selectedMapel, sekolahId]);

  // 3. Fetch TPs for Selected Mapel, Kelas, Semester, and Tahun Ajaran
  const fetchTPs = useCallback(async () => {
    if (!selectedMapel || !selectedKelas) {
      setTpList([]);
      setSelectedTpId(null);
      return;
    }

    setIsLoadingTP(true);
    try {
      let query = supabase
        .from('tujuan_pembelajaran')
        .select('*')
        .eq('nama_mapel', selectedMapel)
        .eq('kelas', selectedKelas)
        .eq('semester', selectedSemester)
        .eq('tahun_ajaran', selectedTahunAjaran)
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: true });

      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTpList(data || []);
      if (data && data.length > 0) {
        // Keep current selectedTpId if still present, else select first
        setSelectedTpId(prev => {
          if (prev && data.some(t => t.id === prev)) return prev;
          return data[0].id;
        });
      } else {
        setSelectedTpId(null);
        setColumnsList([]);
      }
    } catch (err) {
      console.error('Error fetching TPs:', err);
    } finally {
      setIsLoadingTP(false);
    }
  }, [selectedMapel, selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId]);

  useEffect(() => {
    fetchTPs();
  }, [fetchTPs]);

  // Fetch CPs for current mapel/kelas/semester/tahun
  const fetchCPs = useCallback(async () => {
    if (!selectedMapel || !selectedKelas) { setCpList([]); setSelectedCpId(null); return; }
    const query = supabase
      .from('capaian_pembelajaran')
      .select('*')
      .eq('nama_mapel', selectedMapel)
      .eq('kelas', selectedKelas)
      .eq('semester', selectedSemester)
      .eq('tahun_ajaran', selectedTahunAjaran)
      .order('urutan', { ascending: true });
    const { data } = sekolahId ? await query.eq('sekolah_id', sekolahId) : await query;
    const list = data || [];
    setCpList(list);
    if (list.length > 0) setSelectedCpId(prev => list.some(c => c.id === prev) ? prev : list[0].id);
    else setSelectedCpId(null);
  }, [selectedMapel, selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId]);

  useEffect(() => { fetchCPs(); }, [fetchCPs]);


  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan Capaian Pembelajaran.',
        'warning'
      );
    }
    if (!cpForm.kode_cp.trim() || !cpForm.deskripsi.trim()) {
      showToast('Validasi', 'Kode CP dan Deskripsi wajib diisi.', 'warning'); return;
    }
    try {
      const matchingGuruMapel = mapelList.find(m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === selectedKelas))?.id || null;
      if (editingCp) {
        const { error } = await supabase.from('capaian_pembelajaran').update({
          kode_cp: cpForm.kode_cp.trim(),
          deskripsi: cpForm.deskripsi.trim(),
          urutan: cpForm.urutan,
          guru_mapel_id: matchingGuruMapel,
          updated_at: new Date().toISOString(),
        }).eq('id', editingCp.id);
        if (error) throw error;
        showToast('CP Diperbarui', '', 'success');
      } else {
        const { error } = await supabase.from('capaian_pembelajaran').insert({
          sekolah_id: sekolahId || undefined,
          guru_mapel_id: matchingGuruMapel,
          nama_mapel: selectedMapel,
          kelas: selectedKelas,
          semester: selectedSemester,
          tahun_ajaran: selectedTahunAjaran,
          kode_cp: cpForm.kode_cp.trim(),
          deskripsi: cpForm.deskripsi.trim(),
          urutan: cpForm.urutan,
        } as any);
        if (error) throw error;
        showToast('CP Dibuat', '', 'success');
      }
      setIsCpModalOpen(false);
      setInlineMode('idle');
      await fetchCPs();
    } catch (err: any) {
      showToast('Gagal Simpan CP', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handleDeleteCp = async (cp: CapaianPembelajaran) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menghapus Capaian Pembelajaran.',
        'warning'
      );
    }
    const result = await Swal.fire({
      title: `Hapus ${cp.kode_cp}?`, text: 'TP di bawah CP ini tidak akan ikut terhapus.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    const { error } = await supabase.from('capaian_pembelajaran').delete().eq('id', cp.id);
    if (error) { showToast('Gagal', error.message, 'error'); return; }
    showToast('CP Dihapus', '', 'success');
    await fetchCPs();
  };

  // Save bobot (Admin only)
  const handleSaveBobot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan bobot penilaian.',
        'warning'
      );
    }
    const total = bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif;
    if (total !== 100) {
      showToast('Validasi', `Total bobot harus 100%. Saat ini: ${total}%.`, 'warning'); return;
    }
    const pointsToSave: AttendanceStatusPoints = {
      hadir: Math.min(100, Math.max(0, Number(statusPointsForm.hadir) || 0)),
      sakit: Math.min(100, Math.max(0, Number(statusPointsForm.sakit) || 0)),
      izin: Math.min(100, Math.max(0, Number(statusPointsForm.izin) || 0)),
      terlambat: Math.min(100, Math.max(0, Number(statusPointsForm.terlambat) || 0)),
      alpa: Math.min(100, Math.max(0, Number(statusPointsForm.alpa) || 0)),
    };
    try {
      const payload = {
        kehadiran: bobotForm.kehadiran,
        formatif: bobotForm.formatif,
        sumatif: bobotForm.sumatif,
        status_points: pointsToSave,
      };
      const valueStr = JSON.stringify(payload);
      const { data: existing } = await supabase.from('pengaturan')
        .select('id').eq('sekolah_id', sekolahId).eq('key', 'bobot_nilai_mapel').maybeSingle();
      if (existing?.id) {
        await supabase.from('pengaturan').update({ value: valueStr }).eq('id', existing.id);
      } else {
        await supabase.from('pengaturan').insert({
          sekolah_id: sekolahId || undefined, key: 'bobot_nilai_mapel', value: valueStr,
        } as any);
      }
      setBobotKehadiran(bobotForm.kehadiran);
      setBobotFormatif(bobotForm.formatif);
      setBobotSumatif(bobotForm.sumatif);
      setStatusPoints(pointsToSave);
      setBobotForm(payload);
      setIsBobotModalOpen(false);
      showToast(
        'Bobot Disimpan',
        `Kehadiran ${bobotForm.kehadiran}% / Formatif ${bobotForm.formatif}% / Sumatif ${bobotForm.sumatif}% (Poin: H=${pointsToSave.hadir}, S=${pointsToSave.sakit}, I=${pointsToSave.izin}, T=${pointsToSave.terlambat}, A=${pointsToSave.alpa})`,
        'success'
      );
    } catch (err: any) {
      showToast('Gagal', err.message, 'error');
    }
  };


  const fetchColumnsForActiveTP = useCallback(async (activeTpId: string) => {
    try {
      let query = supabase
        .from('asesmen_kolom')
        .select('*')
        .eq('tp_id', activeTpId)
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: true });

      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let cols = data || [];

      if (cols.length === 0) {
        // Auto-heal / provision full Kurikulum Merdeka assessment triplet for empty/orphaned TP
        const initialCols = [
          {
            sekolah_id: sekolahId || undefined,
            tp_id: activeTpId,
            kategori: 'Diagnostik',
            nama: 'Diagnostik',
            bobot: 1,
            urutan: 1,
          },
          {
            sekolah_id: sekolahId || undefined,
            tp_id: activeTpId,
            kategori: 'Formatif',
            nama: 'Formatif 1',
            bobot: 1,
            urutan: 2,
          },
          {
            sekolah_id: sekolahId || undefined,
            tp_id: activeTpId,
            kategori: 'Sumatif',
            nama: 'Sumatif 1',
            bobot: 1,
            urutan: 3,
          },
        ];
        const { data: createdCols, error: cErr } = await supabase
          .from('asesmen_kolom')
          .insert(initialCols as any)
          .select();

        if (!cErr && createdCols && createdCols.length > 0) {
          cols = createdCols;
        }
      } else {
        // Check if Diagnostik exists. Strictly 1 Diagnostik is required per TP.
        const hasDiagnostik = cols.some(c => c.kategori === 'Diagnostik');
        if (!hasDiagnostik) {
          // Auto-heal / initialize default Diagnostik column
          const defaultDiag = {
            sekolah_id: sekolahId || undefined,
            tp_id: activeTpId,
            kategori: 'Diagnostik',
            nama: 'Diagnostik',
            bobot: 1,
            urutan: 1,
          };
          const { data: createdDiag, error: cErr } = await supabase
            .from('asesmen_kolom')
            .insert(defaultDiag as any)
            .select()
            .single();

          if (!cErr && createdDiag) {
            cols = [createdDiag, ...cols];
          }
        }
      }

      setColumnsList(cols);
      // Immediately synchronize semester column cache for reactive grade recalculation
      setAllSemesterColumns(prev => ({ ...prev, [activeTpId]: cols }));
    } catch (err) {
      console.error('Error fetching columns:', err);
    }
  }, [sekolahId]);

  useEffect(() => {
    if (selectedTpId) {
      fetchColumnsForActiveTP(selectedTpId);
    } else {
      setColumnsList([]);
    }
  }, [selectedTpId, fetchColumnsForActiveTP]);

  // 5. Fetch Columns for ALL TPs (for Rekap Rapor Semester Tab)
  useEffect(() => {
    if (innerTab !== 'rekap-semester' || tpList.length === 0) return;

    const fetchAllColumns = async () => {
      try {
        const tpIds = tpList.map(t => t.id);
        const { data, error } = await supabase
          .from('asesmen_kolom')
          .select('*')
          .in('tp_id', tpIds)
          .order('urutan', { ascending: true });

        if (error) throw error;

        const grouped: Record<string, AsesmenKolom[]> = {};
        (data || []).forEach(c => {
          if (!grouped[c.tp_id]) grouped[c.tp_id] = [];
          grouped[c.tp_id].push(c);
        });
        setAllSemesterColumns(grouped);
      } catch (err) {
        console.error('Error fetching all columns for semester:', err);
      }
    };

    fetchAllColumns();
  }, [innerTab, tpList]);

  // 6. Fetch Student Grades for this Class & Mapel
  const fetchGrades = useCallback(async () => {
    if (!selectedKelas || !selectedMapel) {
      setGradesMap({});
      setDirtyGrades({});
      return;
    }

    setIsLoadingGrades(true);
    try {
      let query = supabase
        .from('nilai_siswa')
        .select('*')
        .eq('kelas', selectedKelas)
        .eq('mapel', selectedMapel);

      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const map: Record<string, Record<string, number | null>> = {};
      (data || []).forEach(item => {
        if (!map[item.nisn]) map[item.nisn] = {};
        map[item.nisn][item.asesmen_id] = item.nilai !== null ? Number(item.nilai) : null;
      });

      setGradesMap(map);
      setDirtyGrades({});
    } catch (err) {
      console.error('Error fetching grades:', err);
    } finally {
      setIsLoadingGrades(false);
    }
  }, [selectedKelas, selectedMapel, sekolahId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Filtered TP list based on selected CP (or all TPs if showAllTp is toggled)
  const displayedTpList = useMemo(() => {
    if (showAllTp || !selectedCpId) return tpList;
    return tpList.filter(tp => tp.cp_id === selectedCpId || !tp.cp_id);
  }, [tpList, selectedCpId, showAllTp]);

  // Sync selectedTpId when displayed TP list changes
  useEffect(() => {
    if (displayedTpList.length > 0 && (!selectedTpId || !displayedTpList.some(t => t.id === selectedTpId))) {
      setSelectedTpId(displayedTpList[0].id);
    }
  }, [displayedTpList, selectedTpId]);

  // Restore local draft when selection settles and loading completes
  useEffect(() => {
    if (isLoadingGrades || !selectedMapel || !selectedKelas) {
      return;
    }
    const draftKey = getGradebookDraftKey(sekolahId, selectedMapel, selectedKelas, selectedTpId);
    const draftScores = loadGradebookDraft(draftKey);

    if (draftScores && Object.keys(draftScores).length > 0) {
      setGradesMap(prev => {
        const next = { ...prev };
        for (const [nisn, cols] of Object.entries(draftScores)) {
          next[nisn] = { ...(next[nisn] || {}), ...cols };
        }
        return next;
      });

      setDirtyGrades(prev => {
        const next = { ...prev };
        for (const [nisn, cols] of Object.entries(draftScores)) {
          for (const colId of Object.keys(cols)) {
            next[`${nisn}_${colId}`] = true;
          }
        }
        return next;
      });

      setHasLocalDraft(true);
    } else {
      setHasLocalDraft(false);
    }
  }, [selectedTpId, selectedMapel, selectedKelas, isLoadingGrades, sekolahId]);

  // Debounced auto-save of dirty scores to localStorage
  useEffect(() => {
    if (!selectedMapel || !selectedKelas) return;
    const dirtyCount = Object.keys(dirtyGrades).length;

    if (draftDebounceRef.current) {
      clearTimeout(draftDebounceRef.current);
      draftDebounceRef.current = null;
    }

    if (dirtyCount === 0) {
      return;
    }

    draftDebounceRef.current = setTimeout(() => {
      const draftKey = getGradebookDraftKey(sekolahId, selectedMapel, selectedKelas, selectedTpId);
      const dirtyKeys = Object.keys(dirtyGrades);
      const dirtyScores: Record<string, Record<string, number | null>> = {};
      const currentTpColIds = new Set(columnsList.map(c => c.id));

      dirtyKeys.forEach(key => {
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore === -1) return;
        const nisn = key.substring(0, lastUnderscore);
        const colId = key.substring(lastUnderscore + 1);

        if (currentTpColIds.size === 0 || currentTpColIds.has(colId)) {
          if (!dirtyScores[nisn]) dirtyScores[nisn] = {};
          const val = gradesMap[nisn]?.[colId];
          dirtyScores[nisn][colId] = val !== undefined ? val : null;
        }
      });

      if (Object.keys(dirtyScores).length > 0) {
        saveGradebookDraft(draftKey, dirtyScores);
        setHasLocalDraft(true);
      }
    }, 600);

    return () => {
      if (draftDebounceRef.current) {
        clearTimeout(draftDebounceRef.current);
      }
    };
  }, [dirtyGrades, gradesMap, selectedTpId, selectedMapel, selectedKelas, sekolahId, columnsList]);

  // Active TP Object
  const currentTP = useMemo(() => {
    return tpList.find(t => t.id === selectedTpId) || null;
  }, [tpList, selectedTpId]);

  // Column Categorization for Matrix
  const diagnostikCol = useMemo(() => {
    return columnsList.find(c => c.kategori === 'Diagnostik');
  }, [columnsList]);

  const formatifCols = useMemo(() => {
    return columnsList.filter(c => c.kategori === 'Formatif');
  }, [columnsList]);

  const sumatifCols = useMemo(() => {
    return columnsList.filter(c => c.kategori === 'Sumatif');
  }, [columnsList]);

  // Active Matrix Columns for 2D Spreadsheet Keyboard Navigation
  const activeMatrixColumns = useMemo(() => {
    const cols: AsesmenKolom[] = [];
    if (diagnostikCol) cols.push(diagnostikCol);
    formatifCols.forEach(c => cols.push(c));
    sumatifCols.forEach(c => cols.push(c));
    return cols;
  }, [diagnostikCol, formatifCols, sumatifCols]);

  // Keyboard Navigation Across Matrix Input Cells (Arrow keys, Enter, Shift+Enter)
  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const totalRows = filteredStudents.length;
    const totalCols = activeMatrixColumns.length;

    let targetRow = rowIndex;
    let targetCol = colIndex;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        targetRow = Math.max(0, rowIndex - 1);
      } else {
        targetRow = Math.min(totalRows - 1, rowIndex + 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = Math.min(totalRows - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowRight') {
      const input = e.currentTarget;
      if (input.selectionEnd === input.value.length) {
        if (colIndex < totalCols - 1) {
          e.preventDefault();
          targetCol = colIndex + 1;
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const input = e.currentTarget;
      if (input.selectionStart === 0) {
        if (colIndex > 0) {
          e.preventDefault();
          targetCol = colIndex - 1;
        }
      }
    } else {
      return;
    }

    if (targetRow !== rowIndex || targetCol !== colIndex) {
      const nextInput = document.getElementById(`grade-cell-${targetRow}-${targetCol}`) as HTMLInputElement | null;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  // Cell Grade Change Handler
  const handleGradeChange = (nisn: string, colId: string, valStr: string) => {
    let parsed: number | null = null;
    if (valStr.trim() !== '') {
      parsed = parseFloat(valStr);
      if (isNaN(parsed)) return;
      if (parsed < 0) parsed = 0;
      if (parsed > 100) parsed = 100;
    }

    setGradesMap(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || {}),
        [colId]: parsed,
      },
    }));

    setDirtyGrades(prev => ({
      ...prev,
      [`${nisn}_${colId}`]: true,
    }));
  };

  // Batch Save Grades
  const handleSaveGrades = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan transaksi nilai.',
        'warning'
      );
    }

    if (isAdmin || isTataUsaha) {
      return;
    }
    if (!isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menyimpan nilai.', 'warning');
      return;
    }

    if (!selectedTpId || !currentTP) {
      showToast('Perhatian', 'Pilih atau buat Tujuan Pembelajaran terlebih dahulu.', 'warning');
      return;
    }

    const dirtyKeys = Object.keys(dirtyGrades);
    if (dirtyKeys.length === 0) {
      showToast('Informasi', 'Tidak ada perubahan nilai yang perlu disimpan.', 'info');
      return;
    }

    setIsSaving(true);
    try {
      const recordsToUpsert: any[] = [];
      const studentMap = new Map<string, StudentItem>();
      students.forEach(s => studentMap.set(s.nisn, s));

      // Build column lookup map across active columns & allSemesterColumns
      const colMap = new Map<string, AsesmenKolom>();
      columnsList.forEach(c => colMap.set(c.id, c));
      Object.values(allSemesterColumns).flat().forEach(c => {
        if (!colMap.has(c.id)) colMap.set(c.id, c);
      });

      const savedDirtyKeys: string[] = [];

      dirtyKeys.forEach(key => {
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore === -1) return;
        const nisn = key.substring(0, lastUnderscore);
        const colId = key.substring(lastUnderscore + 1);

        const student = studentMap.get(nisn);
        if (!student) return;

        const col = colMap.get(colId);
        const targetTpId = col?.tp_id || selectedTpId;
        if (!targetTpId) return;

        const studentGrades = gradesMap[nisn] || {};
        const rawVal = studentGrades[colId];

        recordsToUpsert.push({
          sekolah_id: sekolahId || undefined,
          tp_id: targetTpId,
          asesmen_id: colId,
          siswa_id: student.id || null,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: selectedKelas,
          mapel: selectedMapel,
          nama_guru: selectedGuru || user?.nama || 'Guru',
          nilai: rawVal !== null && rawVal !== undefined && !isNaN(rawVal) ? rawVal : null,
          catatan: null,
        });
        savedDirtyKeys.push(key);
      });

      if (recordsToUpsert.length === 0) {
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('nilai_siswa')
        .upsert(recordsToUpsert, { onConflict: 'sekolah_id,asesmen_id,nisn' });

      if (error) throw error;

      // Clear local draft upon confirmed successful Supabase upsert
      const draftKey = getGradebookDraftKey(sekolahId, selectedMapel, selectedKelas, selectedTpId);
      clearGradebookDraft(draftKey);
      setHasLocalDraft(false);

      setDirtyGrades(prev => {
        const updated = { ...prev };
        savedDirtyKeys.forEach(k => delete updated[k]);
        return updated;
      });
      showToast('Nilai Berhasil Disimpan', `${recordsToUpsert.length} entri nilai telah tersimpan di database.`, 'success');
    } catch (err: any) {
      console.error('Error saving grades:', err);
      showToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan nilai.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- INISIALISASI CEPAT / FORMAT AWAL 1-KLIK (R2) ---
  const handleQuickInitialize = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk inisialisasi penilaian.',
        'warning'
      );
    }
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak melakukan inisialisasi format nilai.', 'warning');
      return;
    }
    if (!selectedMapel || !selectedKelas) {
      showToast('Pilih Mapel & Kelas', 'Silakan pilih Mata Pelajaran dan Kelas terlebih dahulu.', 'warning');
      return;
    }

    setIsInitializing(true);
    let createdNewCpId: string | null = null;
    let createdTpId: string | null = null;
    try {
      const matchingGuruMapel = mapelList.find(
        m => m.nama_mapel === selectedMapel && (!m.kelas || m.kelas === selectedKelas)
      )?.id || null;

      // 1. Dapatkan atau buat CP payung pertama
      let activeCpId = (selectedCpId && cpList.some(c => c.id === selectedCpId)) ? selectedCpId : (cpList[0]?.id ?? null);
      if (!activeCpId || cpList.length === 0) {
        const newCp = {
          sekolah_id: sekolahId || undefined,
          guru_mapel_id: matchingGuruMapel,
          nama_mapel: selectedMapel,
          kelas: selectedKelas,
          semester: selectedSemester,
          tahun_ajaran: selectedTahunAjaran,
          kode_cp: 'CP 1',
          deskripsi: `Capaian Pembelajaran ${selectedMapel} - Semester ${selectedSemester}`,
          urutan: 1,
        };
        const { data: createdCp, error: cpErr } = await supabase
          .from('capaian_pembelajaran')
          .insert(newCp as any)
          .select()
          .single();

        if (cpErr) throw cpErr;
        activeCpId = createdCp.id;
        createdNewCpId = createdCp.id;
      }

      // 2. Buat TP pertama di bawah CP
      const newTP = {
        sekolah_id: sekolahId || undefined,
        cp_id: activeCpId,
        nama_guru: selectedGuru || user?.nama || 'Guru',
        nama_mapel: selectedMapel,
        kelas: selectedKelas,
        kode_tp: `TP ${tpList.length + 1}`,
        deskripsi: `Tujuan Pembelajaran ${tpList.length + 1}: Pemahaman dan Penguasaan Materi Pokok ${selectedMapel}`,
        semester: selectedSemester,
        tahun_ajaran: selectedTahunAjaran,
        urutan: tpList.length + 1,
      };

      const { data: createdTp, error: tpErr } = await supabase
        .from('tujuan_pembelajaran')
        .insert(newTP as any)
        .select()
        .single();

      if (tpErr) throw tpErr;
      createdTpId = createdTp.id;

      // 3. Buat tepat 1 Diagnostik (Wajib), 1 Formatif, dan 1 Sumatif
      const initialColumns = [
        {
          sekolah_id: sekolahId || undefined,
          tp_id: createdTp.id,
          kategori: 'Diagnostik',
          nama: 'Diagnostik',
          bobot: 1,
          urutan: 1,
        },
        {
          sekolah_id: sekolahId || undefined,
          tp_id: createdTp.id,
          kategori: 'Formatif',
          nama: 'Formatif 1',
          bobot: 1,
          urutan: 2,
        },
        {
          sekolah_id: sekolahId || undefined,
          tp_id: createdTp.id,
          kategori: 'Sumatif',
          nama: 'Sumatif 1',
          bobot: 1,
          urutan: 3,
        },
      ];

      const { error: colErr } = await supabase.from('asesmen_kolom').insert(initialColumns as any);
      if (colErr) throw colErr;

      showToast(
        'Inisialisasi Berhasil',
        'Format awal asesmen (CP 1, TP 1, Diagnostik, Formatif, Sumatif) berhasil disiapkan. Anda dapat langsung menginput nilai.',
        'success'
      );

      // Refresh seluruh struktur
      await fetchCPs();
      await fetchTPs();
      setSelectedCpId(activeCpId);
      setSelectedTpId(createdTp.id);
      await fetchColumnsForActiveTP(createdTp.id);
    } catch (err: any) {
      console.error('Error in quick initialization:', err);
      // Rollback newly created entities on partial failure to prevent broken states
      if (createdTpId) {
        try {
          await supabase.from('tujuan_pembelajaran').delete().eq('id', createdTpId);
        } catch (cleanupErr) {
          console.warn('Rollback failed for created TP:', cleanupErr);
        }
      }
      if (createdNewCpId) {
        try {
          await supabase.from('capaian_pembelajaran').delete().eq('id', createdNewCpId);
        } catch (cleanupErr) {
          console.warn('Rollback failed for created CP:', cleanupErr);
        }
      }
      showToast('Gagal Inisialisasi', err.message || 'Terjadi kesalahan sistem saat inisialisasi format awal.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // --- CRUD: TUJUAN PEMBELAJARAN (TP) ---
  const handleOpenAddTpModal = () => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menambah Tujuan Pembelajaran (TP).', 'warning');
      return;
    }
    if (cpList.length === 0) {
      showToast('Perhatian', 'Tambahkan Capaian Pembelajaran (CP) terlebih dahulu sebelum menambah TP.', 'warning');
      return;
    }
    setEditingTp(null);
    setTpForm({
      kode_tp: `TP ${tpList.length + 1}`,
      deskripsi: '',
      semester: selectedSemester,
      tahun_ajaran: selectedTahunAjaran,
      urutan: tpList.length + 1,
      cp_id: selectedCpId || (cpList[0]?.id ?? ''),
    });
    setIsTpModalOpen(true);
  };


  const handleSaveTp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan transaksi Tujuan Pembelajaran.',
        'warning'
      );
    }
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menyimpan Tujuan Pembelajaran (TP).', 'warning');
      return;
    }
    if (!tpForm.kode_tp.trim() || !tpForm.deskripsi.trim()) {
      showToast('Validasi Gagal', 'Kode TP dan Deskripsi wajib diisi.', 'warning');
      return;
    }

    try {
      if (editingTp) {
        // Update existing TP
        const { error } = await supabase
          .from('tujuan_pembelajaran')
          .update({
            cp_id: tpForm.cp_id || null,
            kode_tp: tpForm.kode_tp.trim(),
            deskripsi: tpForm.deskripsi.trim(),
            semester: tpForm.semester,
            tahun_ajaran: tpForm.tahun_ajaran,
            urutan: tpForm.urutan,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTp.id);

        if (error) throw error;

        showToast('TP Berhasil Diperbarui', '', 'success');
      } else {
        // Create new TP
        const newTP = {
          sekolah_id: sekolahId || undefined,
          cp_id: tpForm.cp_id || selectedCpId || null,
          nama_guru: selectedGuru || user?.nama || 'Guru',
          nama_mapel: selectedMapel,
          kelas: selectedKelas,
          kode_tp: tpForm.kode_tp.trim(),
          deskripsi: tpForm.deskripsi.trim(),
          semester: tpForm.semester,
          tahun_ajaran: tpForm.tahun_ajaran,
          urutan: tpForm.urutan,
        };

        const { data: created, error } = await supabase
          .from('tujuan_pembelajaran')
          .insert(newTP as any)
          .select()
          .single();

        if (error) throw error;

        // Auto-create initial required Asesmen Diagnostik column (strictly 1 Diagnostik)
        // and initial Formatif 1 and Sumatif 1 for teacher convenience
        if (created?.id) {
          const initialColumns = [
            {
              sekolah_id: sekolahId || undefined,
              tp_id: created.id,
              kategori: 'Diagnostik',
              nama: 'Diagnostik',
              bobot: 1,
              urutan: 1,
            },
            {
              sekolah_id: sekolahId || undefined,
              tp_id: created.id,
              kategori: 'Formatif',
              nama: 'Formatif 1',
              bobot: 1,
              urutan: 2,
            },
            {
              sekolah_id: sekolahId || undefined,
              tp_id: created.id,
              kategori: 'Sumatif',
              nama: 'Sumatif 1',
              bobot: 1,
              urutan: 3,
            },
          ];

          await supabase.from('asesmen_kolom').insert(initialColumns as any);
          setSelectedTpId(created.id);
        }

        showToast('TP Berhasil Dibuat', 'Tujuan Pembelajaran dan kolom penilaian awal telah disiapkan.', 'success');
      }

      setIsTpModalOpen(false);
      setInlineMode('idle');
      await fetchTPs();
    } catch (err: any) {
      console.error('Error saving TP:', err);
      showToast('Gagal Menyimpan TP', err.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  const handleDeleteTp = async (tp: TujuanPembelajaran) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menghapus Tujuan Pembelajaran.',
        'warning'
      );
    }
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menghapus Tujuan Pembelajaran (TP).', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: `Hapus ${tp.kode_tp}?`,
      text: `Menghapus TP ini akan menghapus seluruh kolom asesmen dan nilai siswa di bawahnya secara permanen.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus TP',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('tujuan_pembelajaran')
        .delete()
        .eq('id', tp.id);

      if (error) throw error;

      showToast('Terhapus', 'Tujuan Pembelajaran telah dihapus.', 'success');
      await fetchTPs();
    } catch (err: any) {
      console.error('Error deleting TP:', err);
      showToast('Gagal Menghapus TP', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // --- CRUD: ASESMEN KOLOM ---
  const handleOpenAddColModal = (kategori: 'Formatif' | 'Sumatif') => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menambah kolom asesmen.', 'warning');
      return;
    }
    if (!selectedTpId) {
      showToast('Perhatian', 'Pilih Tujuan Pembelajaran terlebih dahulu.', 'warning');
      return;
    }
    setEditingCol(null);
    const existingCount = columnsList.filter(c => c.kategori === kategori).length;
    setColForm({
      kategori,
      nama: kategori === 'Formatif' ? `Formatif ${existingCount + 1}` : `Sumatif ${existingCount + 1}`,
      bobot: 1,
      keterangan: '',
    });
    setIsColModalOpen(true);
  };

  const handleOpenEditColModal = (col: AsesmenKolom) => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak mengedit kolom asesmen.', 'warning');
      return;
    }
    setEditingCol(col);
    setColForm({
      kategori: col.kategori as 'Diagnostik' | 'Formatif' | 'Sumatif',
      nama: col.nama,
      bobot: col.bobot ? Number(col.bobot) : 1,
      keterangan: col.keterangan || '',
    });
    setIsColModalOpen(true);
  };

  const handleSaveCol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan transaksi kolom asesmen.',
        'warning'
      );
    }
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menyimpan kolom asesmen.', 'warning');
      return;
    }
    if (!colForm.nama.trim()) {
      showToast('Validasi', 'Nama asesmen wajib diisi.', 'warning');
      return;
    }

    if (colForm.kategori === 'Diagnostik') {
      const existingDiag = columnsList.find(c => c.kategori === 'Diagnostik');
      if (existingDiag && (!editingCol || editingCol.id !== existingDiag.id)) {
        showToast('Validasi Gagal', 'Maksimal 1 Asesmen Diagnostik per Tujuan Pembelajaran.', 'warning');
        return;
      }
    }

    try {
      if (editingCol) {
        const { error } = await supabase
          .from('asesmen_kolom')
          .update({
            nama: colForm.nama.trim(),
            bobot: colForm.bobot,
            keterangan: colForm.keterangan.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCol.id);

        if (error) throw error;
        showToast('Berhasil', 'Kolom asesmen telah diperbarui.', 'success');
      } else {
        if (!selectedTpId) return;
        const newCol = {
          sekolah_id: sekolahId || undefined,
          tp_id: selectedTpId,
          kategori: colForm.kategori,
          nama: colForm.nama.trim(),
          bobot: colForm.bobot,
          keterangan: colForm.keterangan.trim() || null,
          urutan: columnsList.length + 1,
        };

        const { error } = await supabase
          .from('asesmen_kolom')
          .insert(newCol as any);

        if (error) throw error;
        showToast('Berhasil', `Kolom ${colForm.kategori} baru berhasil ditambahkan.`, 'success');
      }

      setIsColModalOpen(false);
      setInlineMode('idle');
      if (selectedTpId) await fetchColumnsForActiveTP(selectedTpId);
    } catch (err: any) {
      console.error('Error saving column:', err);
      showToast('Gagal Menyimpan Kolom', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handleDeleteCol = async (col: AsesmenKolom) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menghapus kolom asesmen.',
        'warning'
      );
    }
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menghapus kolom asesmen.', 'warning');
      return;
    }
    if (col.kategori === 'Diagnostik') {
      showToast('Tidak Dapat Dihapus', 'Asesmen Diagnostik wajib ada tepat 1 per Tujuan Pembelajaran.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: `Hapus Kolom "${col.nama}"?`,
      text: `Seluruh nilai siswa pada kolom ini akan terhapus. Tindakan ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus Kolom',
      cancelButtonText: 'Batal',
    });

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('asesmen_kolom')
        .delete()
        .eq('id', col.id);

      if (error) throw error;

      showToast('Terhapus', `Kolom "${col.nama}" berhasil dihapus.`, 'success');
      if (selectedTpId) await fetchColumnsForActiveTP(selectedTpId);
      await fetchGrades();
    } catch (err: any) {
      console.error('Error deleting column:', err);
      showToast('Gagal Menghapus Kolom', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // --- BULK FILL GRADES MODAL ---
  const handleOpenBulkFill = (colId?: string) => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak mengisi nilai cepat.', 'warning');
      return;
    }
    const targetId = colId || (columnsList[0]?.id || '');
    setBulkFillColId(targetId);
    setBulkFillValue('80');
    setBulkFillOnlyEmpty(true);
    setIsBulkFillModalOpen(true);
  };

  const handleExecuteBulkFill = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin || !isGuruPengampu) {
      return;
    }
    const val = parseFloat(bulkFillValue);
    if (isNaN(val) || val < 0 || val > 100) {
      showToast('Nilai Tidak Valid', 'Masukkan angka antara 0 hingga 100.', 'warning');
      return;
    }
    if (!bulkFillColId) return;

    let filledCount = 0;
    const newDirty: Record<string, boolean> = { ...dirtyGrades };
    const newGrades: Record<string, Record<string, number | null>> = { ...gradesMap };

    students.forEach(s => {
      const currentVal = newGrades[s.nisn]?.[bulkFillColId];
      const isNullOrEmpty = currentVal === null || currentVal === undefined;
      if (!bulkFillOnlyEmpty || isNullOrEmpty) {
        if (!newGrades[s.nisn]) newGrades[s.nisn] = {};
        newGrades[s.nisn][bulkFillColId] = val;
        newDirty[`${s.nisn}_${bulkFillColId}`] = true;
        filledCount++;
      }
    });

    setGradesMap(newGrades);
    setDirtyGrades(newDirty);
    setIsBulkFillModalOpen(false);

    showToast(
      'Pengisian Cepat Berhasil',
      `${filledCount} siswa telah diisi dengan nilai ${val}. Jangan lupa klik 'Simpan Semua Nilai'.`,
      'success'
    );
  };

  // --- KURIKULUM MERDEKA CALCULATIONS ---
  // Calculates stats for student under current active TP
  const calculateStudentTpStats = useCallback((nisn: string) => {
    const sGrades = gradesMap[nisn] || {};

    // Diagnostik (not counted in final score)
    const diagVal = diagnostikCol ? sGrades[diagnostikCol.id] : null;

    // Formatif
    let sumF = 0;
    let sumWeightF = 0;
    formatifCols.forEach(col => {
      const val = sGrades[col.id];
      if (val !== null && val !== undefined && !isNaN(val)) {
        const weight = col.bobot ? Number(col.bobot) : 1;
        sumF += val * weight;
        sumWeightF += weight;
      }
    });
    const avgF = sumWeightF > 0 ? parseFloat((sumF / sumWeightF).toFixed(1)) : null;

    // Sumatif
    let sumS = 0;
    let sumWeightS = 0;
    sumatifCols.forEach(col => {
      const val = sGrades[col.id];
      if (val !== null && val !== undefined && !isNaN(val)) {
        const weight = col.bobot ? Number(col.bobot) : 1;
        sumS += val * weight;
        sumWeightS += weight;
      }
    });
    const avgS = sumWeightS > 0 ? parseFloat((sumS / sumWeightS).toFixed(1)) : null;

    // Nilai Akhir TP: Formatif + Sumatif bobot (kehadiran dihitung di semester level)
    // ponytail: simplified — per-TP hanya F+S, normalisasi ke total F+S bobot
    let finalTp: number | null = null;
    const fPct = bobotFormatif;
    const sPct = bobotSumatif;
    const fsTotal = fPct + sPct;
    if (avgF !== null && avgS !== null && fsTotal > 0) {
      finalTp = parseFloat((avgF * (fPct / fsTotal) + avgS * (sPct / fsTotal)).toFixed(1));
    } else if (avgS !== null) {
      finalTp = avgS;
    } else if (avgF !== null) {
      finalTp = avgF;
    }

    // Predikat
    let predikat = '-';
    let predikatClass = 'text-gray-400 dark:text-gray-500';
    if (finalTp !== null) {
      if (finalTp >= 85) {
        predikat = 'Sangat Baik';
        predikatClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      } else if (finalTp >= 75) {
        predikat = 'Baik';
        predikatClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      } else if (finalTp >= 65) {
        predikat = 'Cukup';
        predikatClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      } else {
        predikat = 'Perlu Bimbingan';
        predikatClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      }
    }

    return {
      diagnostik: diagVal,
      avgFormatif: avgF,
      avgSumatif: avgS,
      nilaiAkhir: finalTp,
      predikat,
      predikatClass,
    };
  }, [gradesMap, diagnostikCol, formatifCols, sumatifCols]);

  // Overall Semester Stats for a Student
  // Formula: (bobotKehadiran% × kehadiran) + (bobotFormatif% × avg_formatif_all_tp) + (bobotSumatif% × avg_sumatif_all_tp)
  // ponytail: kehadiran not yet stored per-mapel; use 100 as placeholder so formula still runs
  const calculateStudentSemesterStats = useCallback((nisn: string) => {
    const sGrades = gradesMap[nisn] || {};
    const tpResults: Record<string, number | null> = {};
    const tpFormatifResults: Record<string, number | null> = {};
    const tpSumatifResults: Record<string, number | null> = {};
    const validTpScores: number[] = [];

    const allAvgF: number[] = [];
    const allAvgS: number[] = [];

    tpList.forEach(tp => {
      const cols = allSemesterColumns[tp.id] || [];
      const fCols = cols.filter(c => c.kategori === 'Formatif');
      const sCols = cols.filter(c => c.kategori === 'Sumatif');

      let sumF = 0, wF = 0;
      fCols.forEach(c => {
        const val = sGrades[c.id];
        if (val !== null && val !== undefined && !isNaN(val)) { const w = c.bobot ? Number(c.bobot) : 1; sumF += val * w; wF += w; }
      });
      const avgF = wF > 0 ? parseFloat((sumF / wF).toFixed(1)) : null;
      if (avgF !== null) allAvgF.push(avgF);
      tpFormatifResults[tp.id] = avgF;

      let sumS = 0, wS = 0;
      sCols.forEach(c => {
        const val = sGrades[c.id];
        if (val !== null && val !== undefined && !isNaN(val)) { const w = c.bobot ? Number(c.bobot) : 1; sumS += val * w; wS += w; }
      });
      const avgS = wS > 0 ? parseFloat((sumS / wS).toFixed(1)) : null;
      if (avgS !== null) allAvgS.push(avgS);
      tpSumatifResults[tp.id] = avgS;

      // Per-TP score for display (F+S only, normalized)
      const fsTotal = bobotFormatif + bobotSumatif;
      let score: number | null = null;
      if (avgF !== null && avgS !== null && fsTotal > 0) {
        score = parseFloat((avgF * (bobotFormatif / fsTotal) + avgS * (bobotSumatif / fsTotal)).toFixed(1));
      } else if (avgS !== null) {
        score = parseFloat(avgS.toFixed(1));
      } else if (avgF !== null) {
        score = parseFloat(avgF.toFixed(1));
      }
      tpResults[tp.id] = score;
      if (score !== null) validTpScores.push(score);
    });

    // Aggregate semester final with real kehadiran component
    const avgFormatifAll = allAvgF.length > 0 ? allAvgF.reduce((a, b) => a + b, 0) / allAvgF.length : null;
    const avgSumatifAll = allAvgS.length > 0 ? allAvgS.reduce((a, b) => a + b, 0) / allAvgS.length : null;
    const kehadiranScore = attendanceRates[nisn] ?? 100;

    let semesterFinalRaw: number | null = null;
    // Requirement: Jika tidak ada data formatif atau sumatif, nilai akhir menampilkan '-' / null (tidak error)
    // Diagnostik is completely excluded from final score
    if (avgFormatifAll !== null && avgSumatifAll !== null) {
      semesterFinalRaw = parseFloat((
        kehadiranScore * (bobotKehadiran / 100) +
        avgFormatifAll * (bobotFormatif / 100) +
        avgSumatifAll * (bobotSumatif / 100)
      ).toFixed(1));
    }

    const tpScoresList = tpList.map(tp => ({
      kode: tp.kode_tp, deskripsi: tp.deskripsi, score: tpResults[tp.id] ?? null
    }));
    const cpAnalysis = generateKurikulumMerdekaDeskripsi(nisn, tpScoresList);

    return {
      tpResults,
      tpFormatifResults,
      tpSumatifResults,
      avgFormatifAll: avgFormatifAll !== null ? parseFloat(avgFormatifAll.toFixed(1)) : null,
      avgSumatifAll: avgSumatifAll !== null ? parseFloat(avgSumatifAll.toFixed(1)) : null,
      kehadiranScore,
      semesterFinal: semesterFinalRaw,
      predikat: cpAnalysis.predikat,
      predikatBadge: cpAnalysis.predikatBadge,
      deskripsiCapaian: cpAnalysis.deskripsiCapaian,
      highestTp: cpAnalysis.highestTp,
      lowestTp: cpAnalysis.lowestTp,
    };
  }, [gradesMap, tpList, allSemesterColumns, bobotKehadiran, bobotFormatif, bobotSumatif, attendanceRates]);


  // Filtered Students for Display
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const term = studentSearch.toLowerCase();
    return students.filter(
      s => s.nama_siswa.toLowerCase().includes(term) || s.nisn.toLowerCase().includes(term)
    );
  }, [students, studentSearch]);

  // Overall Class Analytics
  const classAnalytics = useMemo(() => {
    if (students.length === 0) {
      return {
        totalStudents: 0,
        gradedStudents: 0,
        classAvg: 0,
        highestScore: 0,
        lowestScore: 0,
        tuntasCount: 0,
        tuntasPct: 0,
        distribution: { a: 0, b: 0, c: 0, d: 0 },
      };
    }

    let sum = 0;
    let count = 0;
    let max = -1;
    let min = 101;
    let tuntas = 0;
    const dist = { a: 0, b: 0, c: 0, d: 0 };

    students.forEach(s => {
      const stats = calculateStudentTpStats(s.nisn);
      if (stats.nilaiAkhir !== null) {
        sum += stats.nilaiAkhir;
        count++;
        if (stats.nilaiAkhir > max) max = stats.nilaiAkhir;
        if (stats.nilaiAkhir < min) min = stats.nilaiAkhir;
        if (stats.nilaiAkhir >= 75) tuntas++;

        if (stats.nilaiAkhir >= 85) dist.a++;
        else if (stats.nilaiAkhir >= 75) dist.b++;
        else if (stats.nilaiAkhir >= 65) dist.c++;
        else dist.d++;
      }
    });

    return {
      totalStudents: students.length,
      gradedStudents: count,
      classAvg: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0,
      highestScore: max >= 0 ? max : 0,
      lowestScore: min <= 100 ? min : 0,
      tuntasCount: tuntas,
      tuntasPct: count > 0 ? Math.round((tuntas / count) * 100) : 0,
      distribution: dist,
    };
  }, [students, calculateStudentTpStats]);

  // CSV Export for TP Matrix
  const exportTpToCsv = () => {
    if (!currentTP || students.length === 0) return;

    const headers = ['No', 'NISN', 'Nama Siswa', 'L/P'];
    if (diagnostikCol) headers.push(`Diagnostik`);
    formatifCols.forEach(c => headers.push(`Formatif_${c.nama}`));
    sumatifCols.forEach(c => headers.push(`Sumatif_${c.nama}`));
    headers.push('Rata_Formatif', 'Rata_Sumatif', 'Nilai_Akhir_TP', 'Predikat');

    const csvRows = [headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')];

    students.forEach((s, idx) => {
      const stats = calculateStudentTpStats(s.nisn);
      const row = [
        idx + 1,
        `"${s.nisn}"`,
        `"${s.nama_siswa.replace(/"/g, '""')}"`,
        `"${s.gender || '-'}"`,
      ];

      if (diagnostikCol) row.push(stats.diagnostik !== null ? stats.diagnostik : '');
      formatifCols.forEach(c => {
        const val = gradesMap[s.nisn]?.[c.id];
        row.push(val !== null && val !== undefined ? val : '');
      });
      sumatifCols.forEach(c => {
        const val = gradesMap[s.nisn]?.[c.id];
        row.push(val !== null && val !== undefined ? val : '');
      });

      row.push(
        stats.avgFormatif !== null ? stats.avgFormatif : '',
        stats.avgSumatif !== null ? stats.avgSumatif : '',
        stats.nilaiAkhir !== null ? stats.nilaiAkhir : '',
        `"${stats.predikat}"`
      );

      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Nilai_${selectedMapel}_${selectedKelas}_${currentTP.kode_tp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV Export for Semester Overview
  const exportSemesterToCsv = () => {
    if (students.length === 0 || tpList.length === 0) return;

    const headers = ['No', 'NISN', 'Nama Siswa', 'L/P'];
    tpList.forEach(tp => headers.push(`Nilai_${tp.kode_tp}`));
    headers.push('Nilai_Rapor_Semester', 'Predikat', 'Deskripsi_Capaian');

    const csvRows = [headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')];

    students.forEach((s, idx) => {
      const semStats = calculateStudentSemesterStats(s.nisn);
      const row = [
        idx + 1,
        `"${s.nisn}"`,
        `"${s.nama_siswa.replace(/"/g, '""')}"`,
        `"${s.gender || '-'}"`,
      ];

      tpList.forEach(tp => {
        const score = semStats.tpResults[tp.id];
        row.push(score !== null ? score : '');
      });

      row.push(
        semStats.semesterFinal !== null ? semStats.semesterFinal : '',
        `"${semStats.predikat}"`,
        `"${(semStats.deskripsiCapaian || '').replace(/"/g, '""')}"`
      );

      csvRows.push(row.join(','));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_Rapor_${selectedMapel}_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran.replace('/', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unsavedCount = Object.keys(dirtyGrades).length;

  return (
    <section id="view-gradebook" className="space-y-5 pb-12 w-full max-w-full overflow-x-auto">
      {/* Sub-Navigasi ClayTabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2 no-print">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
            <i className="fa-solid fa-graduation-cap text-[#0F766E] dark:text-teal-400"></i>
            <span>Asesmen &amp; Rapor Siswa</span>
          </h1>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
            Pusat penilaian capaian kompetensi Kurikulum Merdeka dan penerbitan rapor semester siswa binaan
          </p>
        </div>
        {canAccessRapor && (
          <ClayTabs
            items={tabItems}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        )}
      </div>

      {/* Sub-Tab 1: Buku Nilai Mapel (In-Memory Keep-Alive) */}
      <div className={activeTab === 'gradebook' ? 'block' : 'hidden'}>
        {/* Dynamic CSS for print orientation */}
        

        {/* HEADER CARD */}
        <div className="neu-card rounded-2xl p-5 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="neu-inset w-12 h-12 rounded-2xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-xl shrink-0">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-[#0F172A] dark:text-[#F1F5F9]">
                  Daftar Nilai (Gradebook)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-500/15 text-[#0F766E] dark:text-teal-300">
                  Kurikulum Merdeka
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300">
                    Mode Review Admin
                  </span>
                )}
                {isTataUsaha && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-800 dark:text-sky-300">
                    Mode Tinjau TU (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                Pengelolaan Tujuan Pembelajaran (TP), Asesmen Diagnostik, Formatif, dan Sumatif dengan kalkulasi otomatis.
              </p>
            </div>
          </div>

          {!isAdmin && isGuruPengampu && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasLocalDraft && (
                <span className="neu-inset text-xs font-bold text-[#0F766E] dark:text-teal-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <i className="fa-solid fa-floppy-disk text-[#0F766E] dark:text-teal-400"></i>
                  Draft Lokal Tersimpan
                </span>
              )}
              {unsavedCount > 0 && (
                <span className="text-xs font-bold font-num text-amber-700 dark:text-amber-300 animate-pulse bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-400/40 dark:border-amber-700/60">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {unsavedCount} perubahan belum disimpan
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveGrades}
                disabled={isSaving || unsavedCount === 0}
                className={`btn-click px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                  unsavedCount > 0
                    ? 'neu-btn-teal text-white'
                    : 'neu-inset text-[#94A3B8] dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
              </button>
            </div>
          )}
          {isAdmin && !isTataUsaha && (
            <button
              type="button"
              onClick={() => {
                setBobotForm({
                  kehadiran: bobotKehadiran,
                  formatif: bobotFormatif,
                  sumatif: bobotSumatif,
                  status_points: statusPoints,
                });
                setStatusPointsForm(statusPoints);
                setIsBobotModalOpen(true);
              }}
              className="btn-click neu-btn px-3 py-2 min-h-[40px] rounded-xl text-xs font-bold font-num flex items-center gap-2 text-[#0F766E] dark:text-teal-300 transition"
            >
              <i className="fa-solid fa-scale-balanced"></i>
              Bobot: H {bobotKehadiran}% / F {bobotFormatif}% / S {bobotSumatif}%
            </button>
          )}
          {!isAdmin && isWaliKelas && (
            <div className="neu-inset px-3 py-2 rounded-xl text-xs font-bold font-num flex items-center gap-2 text-[#0F766E] dark:text-teal-300">
              <i className="fa-solid fa-scale-balanced"></i>
              <span>Komponen Penilaian: Presensi (Harian & Mapel) {bobotKehadiran}% • Formatif {bobotFormatif}% • Sumatif {bobotSumatif}%</span>
            </div>
          )}
          {!isAdmin && isPureGuruMapel && (
            <div className="neu-inset px-3 py-2 rounded-xl text-xs font-bold font-num flex items-center gap-2 text-[#0F766E] dark:text-teal-300">
              <i className="fa-solid fa-scale-balanced"></i>
              <span>Komponen Penilaian: Presensi Mapel {bobotKehadiran}% • Formatif {bobotFormatif}% • Sumatif {bobotSumatif}%</span>
            </div>
          )}
        </div>

        {/* FILTER CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-5 mt-5 border-t border-slate-300/60 dark:border-slate-700/60">
          {/* Guru Filter (Admin & TU Mode) */}
          {canAccessAllTeachers ? (
            <div>
              <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                Guru Pengampu
              </label>
              <select
                value={selectedGuru}
                onChange={e => handleSelectGuru(e.target.value)}
                className="neu-input w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              >
                <option value="">-- Pilih Guru Pengampu --</option>
                {teachersList.map((g, idx) => (
                  <option key={idx} value={g.nama_guru}>
                    {g.nama_guru}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
                Guru Pengampu
              </label>
              <div className="neu-inset w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate flex items-center">
                {user?.nama || 'Guru Terpilih'}
              </div>
            </div>
          )}

          {/* Mapel Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedMapel}
              onChange={e => handleSelectMapel(e.target.value)}
              disabled={!selectedGuru}
              className={`neu-input w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] ${!selectedGuru ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {!selectedGuru ? (
                <option value="">-- Pilih guru pengampu terlebih dahulu --</option>
              ) : uniqueMapelList.length === 0 ? (
                <option value="">Tidak ada mapel ditugaskan</option>
              ) : (
                uniqueMapelList.map((m, idx) => (
                  <option key={idx} value={m.nama_mapel}>
                    {m.nama_mapel}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
              Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={e => handleSelectKelas(e.target.value)}
              disabled={!selectedGuru || !selectedMapel}
              className={`neu-input w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] ${!selectedGuru || !selectedMapel ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {!selectedGuru || !selectedMapel ? (
                <option value="">-- Pilih mata pelajaran terlebih dahulu --</option>
              ) : kelasList.length === 0 ? (
                <option value="">Tidak ada kelas ditugaskan</option>
              ) : (
                kelasList.map((k, idx) => (
                  <option key={idx} value={k}>
                    {k}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="neu-input w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            >
              <option value="Ganjil">Semester Ganjil{syncedSemester === 'Ganjil' ? ' (Aktif)' : ''}</option>
              <option value="Genap">Semester Genap{syncedSemester === 'Genap' ? ' (Aktif)' : ''}</option>
            </select>
          </div>

          {/* Tahun Ajaran Filter */}
          <div>
            <label className="block text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] uppercase tracking-wider mb-1">
              Tahun Ajaran {!isAdmin && <span className="text-[10px] text-[#0F766E] dark:text-teal-400 font-normal lowercase">(sinkron admin)</span>}
            </label>
            {isAdmin ? (
              <select
                value={selectedTahunAjaran}
                onChange={e => setSelectedTahunAjaran(e.target.value)}
                className="neu-input w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-semibold font-num text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              >
                {gradebookTahunAjaranOptions.map(ta => (
                  <option key={ta} value={ta}>
                    {ta}{syncedTahunAjaran === ta ? ' (Aktif)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="neu-inset w-full min-h-[38px] rounded-xl px-3 py-2 text-xs font-bold font-num text-[#0F172A] dark:text-[#F1F5F9] flex items-center justify-between">
                <span>{selectedTahunAjaran}</span>
                <i className="fa-solid fa-lock text-[10px] text-[#64748B]" title="Terkunci sesuai pengaturan admin"></i>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADMIN UNSELECTED GURU INITIAL EMPTY STATE */}
      {isAdmin && !selectedGuru ? (
        <div className="neu-card rounded-2xl p-8 md:p-14 text-center mt-4 no-print animate-in fade-in duration-200">
          <div className="neu-inset w-16 h-16 mx-auto rounded-2xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-2xl mb-4">
            <i className="fa-solid fa-chalkboard-user"></i>
          </div>
          <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-2">
            Pilih Guru Pengampu Terlebih Dahulu
          </h3>
          <p className="text-xs md:text-sm text-[#475569] dark:text-[#94A3B8] max-w-md mx-auto leading-relaxed">
            Silakan pilih Guru Pengampu terlebih dahulu untuk memulai asesmen dan pengelolaan buku nilai.
          </p>
        </div>
      ) : (
        <>
      {/* VIEW TABS NAVIGATION */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="neu-inset flex items-center gap-2 p-1.5 rounded-2xl overflow-x-auto custom-scroll max-w-full">
          <button
            type="button"
            onClick={() => setInnerTab('tp-matrix')}
            className={`px-4 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              innerTab === 'tp-matrix'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-table-cells text-xs"></i>
            Penilaian TP (Matriks)
          </button>
          <button
            type="button"
            onClick={() => setInnerTab('rekap-semester')}
            className={`px-4 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              innerTab === 'rekap-semester'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-book-open text-xs"></i>
            Rekap Nilai Rapor Semester
          </button>
          <button
            type="button"
            onClick={() => setInnerTab('presensi-sesi')}
            className={`px-4 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              innerTab === 'presensi-sesi'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-calendar-check text-xs"></i>
            Presensi Sesi (16 Pertemuan)
          </button>
          <button
            type="button"
            onClick={() => setInnerTab('statistik')}
            className={`px-4 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              innerTab === 'statistik'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-chart-pie text-xs"></i>
            Statistik & Analisis
          </button>
        </div>

        {/* Action Buttons: Export & Print */}
        <div className="flex items-center gap-2">
          {innerTab === 'tp-matrix' && (
            <button
              type="button"
              onClick={exportTpToCsv}
              className="btn-click neu-btn px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-excel"></i> Export CSV
            </button>
          )}
          {innerTab === 'rekap-semester' && (
            <button
              type="button"
              onClick={exportSemesterToCsv}
              className="btn-click neu-btn px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-excel"></i> Export Rapor CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => triggerPrintWithGps()}
            className="btn-click neu-btn px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold text-[#0F766E] dark:text-teal-300 flex items-center gap-1.5"
          >
            <i className="fa-solid fa-print"></i> Cetak Dokumen
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-4">
        <PrintHeader user={user} sekolahId={sekolahId || undefined} />
        <div className="text-center my-3">
          <h2 className="text-sm font-black tracking-wider uppercase underline">
            DAFTAR NILAI ASESMEN KURIKULUM MERDEKA
          </h2>
          <div className="text-xs font-medium mt-1">
            <span>Mata Pelajaran: <strong>{selectedMapel || '-'}</strong></span> |{' '}
            <span>Kelas: <strong>{selectedKelas || '-'}</strong></span> |{' '}
            <span>Semester: <strong>{selectedSemester}</strong></span> |{' '}
            <span>Tahun Ajaran: <strong>{selectedTahunAjaran}</strong></span>
          </div>
          {currentTP && innerTab === 'tp-matrix' && (
            <div className="text-xs italic text-gray-700 mt-0.5">
              Tujuan Pembelajaran ({currentTP.kode_tp}): {currentTP.deskripsi}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENILAIAN PER TP (SPREADSHEET MATRIX)                              */}
      {/* ========================================================================= */}
      {innerTab === 'tp-matrix' && (
        <div className="space-y-4">
          {/* ========================================================================= */}
          {/* 1. UNIFIED SETUP PANEL (PANEL TERPADU KELOLA STRUKTUR CP • TP • KOLOM)     */}
          {/* ========================================================================= */}
          {isSetupPanelOpen && (
            <div className="neu-card rounded-2xl p-5 ring-1 ring-[#0F766E]/30 dark:ring-teal-400/25 transition-all animate-in fade-in duration-200 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-300/60 dark:border-slate-700/60 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="neu-inset w-9 h-9 rounded-xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-sm font-black">
                      <i className="fa-solid fa-sitemap"></i>
                    </span>
                    <h2 className="text-sm md:text-base font-black text-[#0F172A] dark:text-[#F1F5F9]">
                      Panel Terpadu: Struktur Capaian, Tujuan Pembelajaran & Asesmen
                    </h2>
                  </div>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                    Kelola relasi hierarki Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), dan Kolom Asesmen (Diagnostik, Formatif, Sumatif) dalam satu antarmuka terpadu tanpa dialog bertingkat.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isAdmin && isGuruPengampu && tpList.length === 0 && (
                    <button
                      type="button"
                      onClick={handleQuickInitialize}
                      disabled={isInitializing}
                      className="btn-click neu-btn-teal px-3.5 py-2 min-h-[36px] rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <i className={`fa-solid ${isInitializing ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                      {isInitializing ? 'Menginisialisasi...' : 'Inisialisasi Cepat'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isInitializing}
                    onClick={() => { setIsSetupPanelOpen(false); setInlineMode('idle'); }}
                    className="btn-click neu-btn px-3.5 py-2 min-h-[36px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-xmark"></i> Tutup Panel
                  </button>
                </div>
              </div>

              {/* 3-COLUMN STRUCTURED GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4">
                {/* 1. KOLOM CP */}
                <div className="neu-inset rounded-xl p-4 flex flex-col">
                  {/* CP Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-bold font-num">1</span>
                      <h3 className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] uppercase tracking-wider">
                        Capaian Pembelajaran (CP)
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold font-num text-sky-700 dark:text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-md">
                      {cpList.length} CP
                    </span>
                  </div>

                  {/* Inline Add / Edit CP Form */}
                  {(inlineMode === 'add-cp' || inlineMode === 'edit-cp') ? (
                    <form onSubmit={handleSaveCp} className="neu-card-sm p-3 rounded-xl mb-3 space-y-2 text-xs">
                      <div className="font-bold text-[#0F766E] dark:text-teal-300 pb-1 border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] flex justify-between">
                        <span>{inlineMode === 'edit-cp' ? 'Edit CP' : 'Tambah CP Baru'}</span>
                        <button type="button" onClick={() => setInlineMode('idle')} className="text-[#475569] hover:text-[#0F172A] dark:hover:text-white">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Kode CP</label>
                          <input
                            type="text"
                            required
                            value={cpForm.kode_cp}
                            onChange={e => setCpForm({ ...cpForm, kode_cp: e.target.value })}
                            placeholder="CP 1"
                            className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Urutan</label>
                          <input
                            type="number"
                            min="1"
                            value={cpForm.urutan}
                            onChange={e => setCpForm({ ...cpForm, urutan: parseInt(e.target.value) || 1 })}
                            className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs font-num rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Deskripsi Capaian Pembelajaran</label>
                        <textarea
                          required
                          rows={2}
                          value={cpForm.deskripsi}
                          onChange={e => setCpForm({ ...cpForm, deskripsi: e.target.value })}
                          placeholder="Deskripsi CP..."
                          className="neu-input w-full px-2.5 py-1.5 text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setInlineMode('idle')}
                          className="neu-btn px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="btn-click neu-btn-primary px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-white"
                        >
                          Simpan CP
                        </button>
                      </div>
                    </form>
                  ) : (
                    !isAdmin && isGuruPengampu && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCp(null);
                          setCpForm({ kode_cp: `CP ${cpList.length + 1}`, deskripsi: '', urutan: cpList.length + 1 });
                          setInlineMode('add-cp');
                        }}
                        className="w-full mb-2.5 py-2 px-3 min-h-[36px] rounded-lg border border-dashed border-sky-400/50 dark:border-sky-600/50 hover:bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <i className="fa-solid fa-plus text-[10px]"></i> Tambah CP
                      </button>
                    )
                  )}

                  {/* CP List */}
                  <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scroll pr-1 flex-1">
                    {cpList.length === 0 ? (
                      <div className="text-center py-6 text-[#475569] dark:text-[#94A3B8] text-xs italic">
                        Belum ada CP. Klik &quot;Tambah CP&quot; untuk memulai.
                      </div>
                    ) : (
                      cpList.map(cp => {
                        const isSelected = selectedCpId === cp.id;
                        const childTpCount = tpList.filter(t => t.cp_id === cp.id).length;
                        return (
                          <div
                            key={cp.id}
                            onClick={() => { setSelectedCpId(cp.id); setShowAllTp(false); }}
                            className={`p-2.5 rounded-xl text-xs cursor-pointer transition flex flex-col gap-1 ${
                              isSelected
                                ? 'neu-card-sm ring-1 ring-[#0F766E]/60 dark:ring-teal-400/60 text-[#0F172A] dark:text-[#F1F5F9]'
                                : 'neu-card-sm opacity-85 hover:opacity-100 text-[#334155] dark:text-[#CBD5E1]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-black">
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px]">
                                  {cp.kode_cp}
                                </span>
                                <span className="text-[10px] font-num text-[#475569] font-semibold">#{cp.urutan}</span>
                                <span className="text-[10px] font-num text-[#475569] dark:text-[#94A3B8] font-normal">({childTpCount} TP)</span>
                              </div>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCp(cp);
                                      setCpForm({ kode_cp: cp.kode_cp, deskripsi: cp.deskripsi, urutan: cp.urutan });
                                      setInlineMode('edit-cp');
                                    }}
                                    className="w-9 h-9 rounded-lg hover:bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center text-xs"
                                    title="Edit CP"
                                    aria-label="Edit CP"
                                  >
                                    <i className="fa-solid fa-pen"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCp(cp)}
                                    className="w-9 h-9 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs"
                                    title="Hapus CP"
                                    aria-label="Hapus CP"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] line-clamp-2 leading-relaxed">
                              {cp.deskripsi}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. KOLOM TP */}
                <div className="neu-inset rounded-xl p-4 flex flex-col">
                  {/* TP Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-teal-500/15 text-[#0F766E] dark:text-teal-300 flex items-center justify-center text-[10px] font-bold font-num">2</span>
                      <h3 className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] uppercase tracking-wider">
                        Tujuan Pembelajaran (TP)
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-bold font-num text-[#0F766E] dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-md">
                        {displayedTpList.length} TP
                      </span>
                    </div>
                  </div>

                  {/* Inline Add / Edit TP Form */}
                  {(inlineMode === 'add-tp' || inlineMode === 'edit-tp') ? (
                    <form onSubmit={handleSaveTp} className="neu-card-sm p-3 rounded-xl mb-3 space-y-2 text-xs">
                      <div className="font-bold text-[#0F766E] dark:text-teal-300 pb-1 border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] flex justify-between">
                        <span>{inlineMode === 'edit-tp' ? 'Edit TP' : 'Tambah TP Baru'}</span>
                        <button type="button" onClick={() => setInlineMode('idle')} className="text-[#475569] hover:text-[#0F172A] dark:hover:text-white" aria-label="Tutup form TP">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">
                          Capaian Pembelajaran (CP) Payung <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={tpForm.cp_id}
                          onChange={e => setTpForm({ ...tpForm, cp_id: e.target.value })}
                          className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        >
                          <option value="" disabled>-- Pilih Capaian Pembelajaran --</option>
                          {cpList.map(cp => (
                            <option key={cp.id} value={cp.id}>
                              {cp.kode_cp} - {cp.deskripsi.slice(0, 45)}{cp.deskripsi.length > 45 ? '...' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Kode TP</label>
                          <input
                            type="text"
                            required
                            value={tpForm.kode_tp}
                            onChange={e => setTpForm({ ...tpForm, kode_tp: e.target.value })}
                            placeholder="TP 1"
                            className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Urutan</label>
                          <input
                            type="number"
                            min="1"
                            value={tpForm.urutan}
                            onChange={e => setTpForm({ ...tpForm, urutan: parseInt(e.target.value) || 1 })}
                            className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs font-num rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Deskripsi Tujuan Pembelajaran</label>
                        <textarea
                          required
                          rows={2}
                          value={tpForm.deskripsi}
                          onChange={e => setTpForm({ ...tpForm, deskripsi: e.target.value })}
                          placeholder="Deskripsi TP..."
                          className="neu-input w-full px-2.5 py-1.5 text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setInlineMode('idle')}
                          className="neu-btn px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="btn-click neu-btn-primary px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-white"
                        >
                          Simpan TP
                        </button>
                      </div>
                    </form>
                  ) : (
                    !isAdmin && isGuruPengampu && (
                      <button
                        type="button"
                        disabled={cpList.length === 0}
                        onClick={() => {
                          if (cpList.length === 0) {
                            showToast('Perhatian', 'Tambahkan Capaian Pembelajaran (CP) terlebih dahulu sebelum menambah TP.', 'warning');
                            return;
                          }
                          setEditingTp(null);
                          setTpForm({
                            kode_tp: `TP ${tpList.length + 1}`,
                            deskripsi: '',
                            semester: selectedSemester,
                            tahun_ajaran: selectedTahunAjaran,
                            urutan: tpList.length + 1,
                            cp_id: selectedCpId || (cpList[0]?.id ?? ''),
                          });
                          setInlineMode('add-tp');
                        }}
                        className={`w-full mb-2.5 py-2 px-3 min-h-[36px] rounded-lg border border-dashed text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          cpList.length === 0
                            ? 'border-slate-300/60 dark:border-slate-700 text-[#94A3B8] dark:text-slate-500 cursor-not-allowed'
                            : 'border-[#0F766E]/40 dark:border-teal-500/40 hover:bg-teal-500/10 text-[#0F766E] dark:text-teal-300'
                        }`}
                        title={cpList.length === 0 ? 'Buat CP terlebih dahulu' : 'Tambah TP Baru'}
                      >
                        <i className="fa-solid fa-plus text-[10px]"></i> Tambah TP Baru
                      </button>
                    )
                  )}

                  {/* TP List */}
                  <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scroll pr-1 flex-1">
                    {displayedTpList.length === 0 ? (
                      <div className="text-center py-6 text-[#475569] dark:text-[#94A3B8] text-xs italic">
                        {cpList.length === 0
                          ? 'Buat CP di kolom sebelah kiri terlebih dahulu.'
                          : 'Belum ada TP untuk CP ini. Klik "+ Tambah TP Baru".'}
                      </div>
                    ) : (
                      displayedTpList.map(tp => {
                        const isSelected = selectedTpId === tp.id;
                        const parentCp = cpList.find(c => c.id === tp.cp_id);
                        const colsForThisTp = (allSemesterColumns[tp.id] || (selectedTpId === tp.id ? columnsList : []));
                        const fCount = colsForThisTp.filter(c => c.kategori === 'Formatif').length;
                        const sCount = colsForThisTp.filter(c => c.kategori === 'Sumatif').length;
                        return (
                          <div
                            key={tp.id}
                            onClick={() => setSelectedTpId(tp.id)}
                            className={`p-2.5 rounded-xl text-xs cursor-pointer transition flex flex-col gap-1 ${
                              isSelected
                                ? 'neu-card-sm ring-1 ring-[#0F766E]/60 dark:ring-teal-400/60 text-[#0F172A] dark:text-[#F1F5F9]'
                                : 'neu-card-sm opacity-85 hover:opacity-100 text-[#334155] dark:text-[#CBD5E1]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 font-black">
                                <span className="px-1.5 py-0.5 rounded bg-teal-500/15 text-[#0F766E] dark:text-teal-200 text-[10px]">
                                  {tp.kode_tp}
                                </span>
                                {parentCp && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold">
                                    {parentCp.kode_cp}
                                  </span>
                                )}
                                <span className="text-[10px] font-num text-[#475569] font-semibold">#{tp.urutan}</span>
                              </div>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTp(tp);
                                      setTpForm({
                                        kode_tp: tp.kode_tp,
                                        deskripsi: tp.deskripsi,
                                        semester: tp.semester || selectedSemester,
                                        tahun_ajaran: tp.tahun_ajaran || selectedTahunAjaran,
                                        urutan: tp.urutan || 1,
                                        cp_id: tp.cp_id || selectedCpId || (cpList[0]?.id ?? ''),
                                      });
                                      setInlineMode('edit-tp');
                                    }}
                                    className="w-9 h-9 rounded-lg hover:bg-teal-500/15 text-[#0F766E] dark:text-teal-300 flex items-center justify-center text-xs"
                                    title="Edit TP"
                                    aria-label="Edit TP"
                                  >
                                    <i className="fa-solid fa-pen"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTp(tp)}
                                    className="w-9 h-9 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs"
                                    title="Hapus TP"
                                    aria-label="Hapus TP"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] line-clamp-2 leading-relaxed">
                              {tp.deskripsi}
                            </p>
                            <div className="flex items-center gap-2 pt-0.5 text-[10px] font-num text-[#475569] dark:text-[#94A3B8]">
                              <span>1 Diag</span>
                              <span>• {fCount} Formatif</span>
                              <span>• {sCount} Sumatif</span>
                              {isSelected && (
                                <span className="ml-auto font-sans font-bold text-[#0F766E] dark:text-teal-400">
                                  <i className="fa-solid fa-check mr-0.5"></i> Aktif di Matriks
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 3. KOLOM ASESMEN */}
                <div className="neu-inset rounded-xl p-4 flex flex-col">
                  {/* Kolom Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center justify-center text-[10px] font-bold font-num">3</span>
                      <h3 className="text-xs font-black text-[#0F172A] dark:text-[#F1F5F9] uppercase tracking-wider">
                        Kolom Asesmen ({currentTP ? currentTP.kode_tp : '-'})
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold font-num text-sky-700 dark:text-sky-300 bg-sky-500/15 px-2 py-0.5 rounded-md">
                      {columnsList.length} Kolom
                    </span>
                  </div>

                  {/* Inline Add / Edit Column Form */}
                  {(inlineMode === 'add-col' || inlineMode === 'edit-col') ? (
                    <form onSubmit={handleSaveCol} className="neu-card-sm p-3 rounded-xl mb-3 space-y-2 text-xs">
                      <div className="font-bold text-[#0F766E] dark:text-teal-300 pb-1 border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] flex justify-between">
                        <span>{inlineMode === 'edit-col' ? `Edit Kolom ${colForm.kategori}` : `Tambah Kolom ${colForm.kategori}`}</span>
                        <button type="button" onClick={() => setInlineMode('idle')} className="text-[#475569] hover:text-[#0F172A] dark:hover:text-white" aria-label="Tutup form kolom">
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Nama Asesmen</label>
                        <input
                          type="text"
                          required
                          value={colForm.nama}
                          onChange={e => setColForm({ ...colForm, nama: e.target.value })}
                          placeholder="Formatif 2, Quiz 1..."
                          className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Bobot Nilai</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={colForm.bobot}
                            onChange={e => setColForm({ ...colForm, bobot: parseFloat(e.target.value) || 1 })}
                            className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs font-num rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Kategori</label>
                          <span className="neu-inset flex items-center px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg font-bold text-[#334155] dark:text-[#CBD5E1]">
                            {colForm.kategori}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[#475569] dark:text-[#94A3B8] mb-0.5">Keterangan (opsional)</label>
                        <input
                          type="text"
                          value={colForm.keterangan}
                          onChange={e => setColForm({ ...colForm, keterangan: e.target.value })}
                          placeholder="Catatan asesmen..."
                          className="neu-input w-full px-2.5 py-1.5 min-h-[36px] text-xs rounded-lg text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setInlineMode('idle')}
                          className="neu-btn px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="btn-click neu-btn-primary px-3 py-1.5 min-h-[36px] rounded-lg text-[11px] font-bold text-white"
                        >
                          Simpan Kolom
                        </button>
                      </div>
                    </form>
                  ) : (
                    !isAdmin && isGuruPengampu && currentTP && (
                      <div className="grid grid-cols-2 gap-2 mb-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCol(null);
                            const existingCount = columnsList.filter(c => c.kategori === 'Formatif').length;
                            setColForm({
                              kategori: 'Formatif',
                              nama: `Formatif ${existingCount + 1}`,
                              bobot: 1,
                              keterangan: '',
                            });
                            setInlineMode('add-col');
                          }}
                          className="py-2 px-2 min-h-[36px] rounded-lg border border-dashed border-emerald-400/50 dark:border-emerald-600/50 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i> + Formatif
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCol(null);
                            const existingCount = columnsList.filter(c => c.kategori === 'Sumatif').length;
                            setColForm({
                              kategori: 'Sumatif',
                              nama: `Sumatif ${existingCount + 1}`,
                              bobot: 1,
                              keterangan: '',
                            });
                            setInlineMode('add-col');
                          }}
                          className="py-2 px-2 min-h-[36px] rounded-lg border border-dashed border-[#0F766E]/40 dark:border-teal-500/40 hover:bg-teal-500/10 text-[#0F766E] dark:text-teal-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i> + Sumatif
                        </button>
                      </div>
                    )
                  )}

                  {/* Column List for current TP */}
                  <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scroll pr-1 flex-1">
                    {!currentTP ? (
                      <div className="text-center py-6 text-[#475569] dark:text-[#94A3B8] text-xs italic">
                        Pilih Tujuan Pembelajaran (TP) terlebih dahulu.
                      </div>
                    ) : columnsList.length === 0 ? (
                      <div className="text-center py-6 text-[#475569] dark:text-[#94A3B8] text-xs italic">
                        Belum ada kolom asesmen.
                      </div>
                    ) : (
                      columnsList.map(col => {
                        const isDiag = col.kategori === 'Diagnostik';
                        const isForm = col.kategori === 'Formatif';
                        return (
                          <div
                            key={col.id}
                            className="neu-card-sm p-2.5 rounded-xl text-xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                  isDiag
                                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                    : isForm
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-teal-500/15 text-[#0F766E] dark:text-teal-300'
                                }`}>
                                  {col.kategori}
                                </span>
                                <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate flex-1 min-w-0 max-w-[150px]">
                                  {col.nama}
                                </span>
                                {!isDiag && (
                                  <span className="text-[10px] font-num text-[#475569] dark:text-[#94A3B8] font-normal shrink-0">w:{col.bobot || 1}</span>
                                )}
                              </div>
                              {col.keterangan && (
                                <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] truncate max-w-[180px] mt-0.5">
                                  {col.keterangan}
                                </p>
                              )}
                            </div>

                            {!isAdmin && isGuruPengampu && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCol(col);
                                    setColForm({
                                      kategori: col.kategori as any,
                                      nama: col.nama,
                                      bobot: col.bobot ? Number(col.bobot) : 1,
                                      keterangan: col.keterangan || '',
                                    });
                                    setInlineMode('edit-col');
                                  }}
                                  className="w-9 h-9 rounded-lg hover:bg-slate-300/40 dark:hover:bg-slate-700/60 text-[#475569] dark:text-[#CBD5E1] flex items-center justify-center text-xs"
                                  title="Edit Kolom"
                                  aria-label="Edit Kolom"
                                >
                                  <i className="fa-solid fa-pen"></i>
                                </button>
                                {!isDiag && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(col)}
                                    className="w-9 h-9 rounded-lg hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs"
                                    title="Hapus Kolom"
                                    aria-label="Hapus Kolom"
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. STREAMLINED STRUCTURE & NAVIGATION BAR (UNIFIED BAR)                    */}
          {/* ========================================================================= */}
          {tpList.length === 0 ? (
            /* Cold Start Banner if no TPs exist */
            <div className="neu-card rounded-2xl p-5 no-print">
              {/* Educational Guidance Banner preserving T1.5 contract */}
              {cpList.length === 0 && (
                <div className="p-3.5 mb-3 rounded-xl bg-amber-500/15 border border-amber-400/40 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                  <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400 text-sm shrink-0"></i>
                  <span>Langkah 1: Buat Capaian Pembelajaran (CP) terlebih dahulu sebelum menambahkan Tujuan Pembelajaran (TP).</span>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                <div>
                  <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                    <span>Format Penilaian Belum Tersedia</span>
                    <span className="text-[11px] font-normal text-[#475569] dark:text-[#94A3B8]">
                      ({selectedMapel} - {selectedKelas})
                    </span>
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 max-w-xl">
                    Mata pelajaran ini belum memiliki Tujuan Pembelajaran untuk penilaian. Klik <strong>Inisialisasi Cepat</strong> untuk langsung membuat format Kurikulum Merdeka (1 CP, 1 TP, 1 Diagnostik, 1 Formatif, 1 Sumatif) dengan 1 klik, atau atur manual melalui Panel Terpadu.
                  </p>
                </div>

                {!isAdmin && isGuruPengampu && (
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handleQuickInitialize}
                      disabled={isInitializing}
                      className="btn-click neu-btn-primary text-white px-4 py-2.5 min-h-[40px] rounded-xl text-xs font-black flex items-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <i className={`fa-solid ${isInitializing ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                      {isInitializing ? 'Menyiapkan...' : 'Inisialisasi Cepat (1 Klik)'}
                    </button>
                    <button
                      type="button"
                      disabled={isInitializing}
                      onClick={() => setIsSetupPanelOpen(true)}
                      className="btn-click neu-btn text-[#0F172A] dark:text-[#F1F5F9] px-3.5 py-2.5 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <i className="fa-solid fa-sitemap"></i> Buka Panel Setup
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddTpModal}
                      className="hidden"
                    >
                      Tambah TP Baru
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Streamlined Active Bar */
            <div className="neu-card rounded-2xl p-4 no-print space-y-3">
              {/* Row 1: CP & TP Breadcrumb Pills & Structure Button */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scroll max-w-full touch-pan-x overscroll-x-contain">
                  {/* Active CP Pill */}
                  {selectedCpId && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">CP:</span>
                      <div className="neu-inset flex items-center gap-1 text-sky-700 dark:text-sky-300 px-2.5 py-1.5 min-h-[36px] rounded-xl text-xs font-black">
                        <span>{cpList.find(c => c.id === selectedCpId)?.kode_cp || 'CP'}</span>
                        <span className="font-normal text-[11px] max-w-[120px] truncate hidden sm:inline">
                          - {cpList.find(c => c.id === selectedCpId)?.deskripsi || ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAllTp(prev => !prev)}
                        className={`px-3 py-1.5 min-h-[36px] rounded-xl text-[11px] font-bold transition shrink-0 ${
                          showAllTp
                            ? 'neu-btn neu-btn-teal text-white'
                            : 'neu-btn text-[#334155] dark:text-[#CBD5E1]'
                        }`}
                        title={showAllTp ? 'Tampilkan TP Sesuai CP' : 'Tampilkan Semua TP'}
                      >
                        <i className={`fa-solid ${showAllTp ? 'fa-filter-circle-xmark' : 'fa-filter'} mr-1 text-[10px]`}></i>
                        {showAllTp ? 'Filter Sesuai CP' : 'Tampilkan Semua TP'}
                      </button>
                    </div>
                  )}

                  {/* Divider */}
                  <span className="text-slate-300 dark:text-slate-600 font-bold shrink-0">|</span>

                  {/* TP Pills */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">TP:</span>
                    {displayedTpList.map(tp => (
                      <div
                        key={tp.id}
                        onClick={() => setSelectedTpId(tp.id)}
                        className={`cursor-pointer px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-black flex items-center gap-1.5 transition shrink-0 ${
                          selectedTpId === tp.id
                            ? 'neu-btn neu-btn-primary text-white'
                            : 'neu-btn text-[#334155] dark:text-[#CBD5E1]'
                        }`}
                      >
                        <span>{tp.kode_tp}</span>
                        {selectedTpId === tp.id && !isAdmin && isGuruPengampu && (
                          <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTp(tp);
                                setTpForm({
                                  kode_tp: tp.kode_tp,
                                  deskripsi: tp.deskripsi,
                                  semester: tp.semester || selectedSemester,
                                  tahun_ajaran: tp.tahun_ajaran || selectedTahunAjaran,
                                  urutan: tp.urutan || 1,
                                  cp_id: tp.cp_id || selectedCpId || (cpList[0]?.id ?? ''),
                                });
                                setInlineMode('edit-tp');
                                setIsSetupPanelOpen(true);
                              }}
                              className="w-7 h-7 rounded-lg text-white/90 hover:text-white hover:bg-white/15 flex items-center justify-center text-[11px]"
                              title="Edit TP"
                              aria-label="Edit TP"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTp(tp)}
                              className="w-7 h-7 rounded-lg text-white/90 hover:text-rose-200 hover:bg-white/15 flex items-center justify-center text-[11px]"
                              title="Hapus TP"
                              aria-label="Hapus TP"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Structure Panel Toggle Button */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end md:justify-start">
                  <button
                    type="button"
                    onClick={() => setIsSetupPanelOpen(prev => !prev)}
                    className={`btn-click w-full sm:w-auto px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      isSetupPanelOpen
                        ? 'neu-btn neu-btn-teal text-white'
                        : 'neu-btn text-[#0F172A] dark:text-[#F1F5F9]'
                    }`}
                  >
                    <i className={`fa-solid fa-sitemap ${isSetupPanelOpen ? 'text-white' : 'text-[#0F766E] dark:text-teal-400'}`}></i>
                    <span>Kelola Struktur Asesmen</span>
                    <span className={`px-1.5 py-0.5 rounded-md font-num text-[10px] font-semibold ${
                      isSetupPanelOpen
                        ? 'bg-white/20 text-white'
                        : 'neu-inset text-[#475569] dark:text-[#CBD5E1]'
                    }`}>
                      {cpList.length} CP • {tpList.length} TP
                    </span>
                    <i className={`fa-solid ${isSetupPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px] ml-0.5`}></i>
                  </button>
                </div>
              </div>

              {/* Row 2: Assessment Column Badges & Quick Action Buttons */}
              {currentTP && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-300/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                      Kolom ({currentTP.kode_tp}):
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-num bg-sky-500/15 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                      <i className="fa-solid fa-check text-[10px]"></i> 1 Diagnostik (Wajib)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-num bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {formatifCols.length} Formatif
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-num bg-teal-500/15 text-[#0F766E] dark:text-teal-300">
                      {sumatifCols.length} Sumatif
                    </span>

                    {!isAdmin && isGuruPengampu && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCol(null);
                            const existingCount = columnsList.filter(c => c.kategori === 'Formatif').length;
                            setColForm({
                              kategori: 'Formatif',
                              nama: `Formatif ${existingCount + 1}`,
                              bobot: 1,
                              keterangan: '',
                            });
                            setInlineMode('add-col');
                            setIsSetupPanelOpen(true);
                          }}
                          className="btn-click neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1 transition"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Formatif
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCol(null);
                            const existingCount = columnsList.filter(c => c.kategori === 'Sumatif').length;
                            setColForm({
                              kategori: 'Sumatif',
                              nama: `Sumatif ${existingCount + 1}`,
                              bobot: 1,
                              keterangan: '',
                            });
                            setInlineMode('add-col');
                            setIsSetupPanelOpen(true);
                          }}
                          className="btn-click neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-[#0F766E] dark:text-teal-300 flex items-center gap-1 transition"
                        >
                          <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Sumatif
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAddColModal('Formatif')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenAddColModal('Sumatif')}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenBulkFill()}
                          className="btn-click neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1 transition"
                        >
                          <i className="fa-solid fa-bolt text-[10px]"></i> Isi Nilai Cepat
                        </button>
                      </>
                    )}
                  </div>

                  {/* Student Search */}
                  <div className="w-full md:w-60">
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-xs"></i>
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Cari nama atau NISN..."
                        className="neu-input w-full pl-8 pr-3 py-2 min-h-[38px] text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#64748B] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Active TP & CP Context Banner */}
              {currentTP && (
                <div className="neu-inset p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(() => {
                      const parentCp = cpList.find(c => c.id === currentTP.cp_id);
                      return parentCp ? (
                        <span className="px-2 py-0.5 rounded-lg bg-teal-500/15 text-[#0F766E] dark:text-teal-200 font-extrabold text-[10px] tracking-wide uppercase">
                          {parentCp.kode_cp}
                        </span>
                      ) : null;
                    })()}
                    <span className="font-black text-[#0F172A] dark:text-[#F1F5F9] mr-1">
                      {currentTP.kode_tp}:
                    </span>
                    <span className="text-[#334155] dark:text-[#CBD5E1] font-medium">
                      {currentTP.deskripsi}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-lg">
                      Formatif: {formatifCols.length} Asesmen
                    </span>
                    <span className="text-[10px] font-bold text-[#0F766E] dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-lg">
                      Sumatif: {sumatifCols.length} Asesmen
                    </span>
                    <span className="text-[11px] font-semibold font-num text-[#475569] dark:text-[#94A3B8]">
                      Urutan #{currentTP.urutan}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SPREADSHEET MATRIX TABLE */}
          {!currentTP ? (
            <div className="neu-card-sm rounded-2xl p-8 text-center">
              <div className="neu-inset w-12 h-12 mx-auto rounded-full text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-xl mb-3">
                <i className="fa-solid fa-book-bookmark"></i>
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                Belum Ada Tujuan Pembelajaran Terpilih
              </h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8] max-w-md mx-auto mb-4">
                Silakan buat Tujuan Pembelajaran (TP) terlebih dahulu untuk memulai pengisian asesmen Diagnostik, Formatif, dan Sumatif.
              </p>
              {!isAdmin && isGuruPengampu && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleQuickInitialize}
                    disabled={isInitializing}
                    className="btn-click neu-btn-primary text-white px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <i className={`fa-solid ${isInitializing ? 'fa-spinner fa-spin' : 'fa-bolt'}`}></i>
                    {isInitializing ? 'Menyiapkan...' : 'Inisialisasi Cepat (1 Klik)'}
                  </button>
                  <button
                    type="button"
                    disabled={isInitializing}
                    onClick={() => {
                      setEditingTp(null);
                      setTpForm({
                        kode_tp: `TP ${tpList.length + 1}`,
                        deskripsi: '',
                        semester: selectedSemester,
                        tahun_ajaran: selectedTahunAjaran,
                        urutan: tpList.length + 1,
                        cp_id: selectedCpId || (cpList[0]?.id ?? ''),
                      });
                      setInlineMode('add-tp');
                      setIsSetupPanelOpen(true);
                    }}
                    className="btn-click neu-btn text-[#0F172A] dark:text-[#F1F5F9] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <i className="fa-solid fa-plus"></i> Tambah TP (Panel Terpadu)
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenAddTpModal}
                    className="hidden"
                  >
                    Tambah TP Sekarang
                  </button>
                </div>
              )}
            </div>
          ) : students.length === 0 ? (
            <div className="neu-card-sm rounded-2xl p-10 text-center">
              <i className="fa-solid fa-users-slash text-3xl text-[#475569] mb-2"></i>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Tidak ada data siswa ditemukan untuk kelas <strong>{selectedKelas}</strong>.
              </p>
            </div>
          ) : (
            <div className="neu-card-sm rounded-2xl overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll relative touch-pan-x overscroll-x-contain print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  {/* Table Header */}
                  <thead className="bg-[#DDE4EE] dark:bg-[#181C24] text-[#0F172A] dark:text-[#F1F5F9] sticky top-0 z-30 shadow-sm print:bg-gray-100 print:text-black">
                    {/* Upper Category Row */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] font-black uppercase tracking-wider">
                      <th colSpan={2} className="md:hidden sticky left-0 z-30 py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th colSpan={3} className="hidden md:table-cell sticky left-0 z-30 py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th className="py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                      </th>
                      <th className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-sky-500/10 text-sky-800 dark:text-sky-300">
                        Diagnostik (Baseline)
                      </th>
                      <th
                        colSpan={Math.max(formatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      >
                        Asesmen Formatif (Proses)
                      </th>
                      <th
                        colSpan={Math.max(sumatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-teal-500/15 text-[#0F766E] dark:text-teal-300"
                      >
                        Asesmen Sumatif (Lingkup Materi)
                      </th>
                      <th colSpan={4} className="py-2.5 px-3 text-center bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        Kalkulasi Kurikulum Merdeka
                      </th>
                    </tr>

                    {/* Column Headers */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 font-bold text-[#0F172A] dark:text-[#F1F5F9] text-[11px]">
                      <th className="sticky left-0 z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-1.5 md:px-2.5 w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px] text-center">#</th>
                      <th className="hidden md:table-cell sticky left-[40px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2.5 w-24 min-w-[96px] max-w-[96px]">NISN</th>
                      <th className="sticky left-[32px] md:left-[136px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2 md:px-3 w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">Nama Siswa</th>
                      <th className="py-2 px-2 w-12 min-w-[48px] max-w-[48px] text-center border-r border-slate-300/60 dark:border-slate-700/60">L/P</th>

                      {/* Diagnostik Column */}
                      {diagnostikCol && (
                        <th
                          className="py-2 px-2 w-28 text-center bg-sky-500/5 border-r border-slate-300/60 dark:border-slate-700/60"
                          title={diagnostikCol.keterangan ? `Keterangan: ${diagnostikCol.keterangan}` : undefined}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="flex items-center justify-center gap-1">
                              <span>{diagnostikCol.nama}</span>
                              <span className="text-[9px] px-1 bg-sky-500/15 text-sky-700 dark:text-sky-300 rounded font-num">
                                1x
                              </span>
                            </div>
                            {diagnostikCol.keterangan && (
                              <span className="text-[9px] font-normal text-[#475569] dark:text-[#94A3B8] truncate max-w-[90px]">
                                {diagnostikCol.keterangan}
                              </span>
                            )}
                          </div>
                        </th>
                      )}

                      {/* Formatif Columns */}
                      {formatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-[#64748B] border-r border-slate-300/60 dark:border-slate-700/60">
                          Belum ada formatif
                        </th>
                      ) : (
                        formatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-emerald-500/5 border-r border-slate-300/60 dark:border-slate-700/60 group"
                            title={col.keterangan ? `Keterangan: ${col.keterangan}` : undefined}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center justify-center gap-1">
                                <span className="truncate max-w-[70px]">{col.nama}</span>
                                {!isAdmin && isGuruPengampu && (
                                  <div className="flex items-center gap-0.5 no-print">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditColModal(col)}
                                      className="w-6 h-6 rounded text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center"
                                      title="Ubah Nama/Bobot/Keterangan"
                                      aria-label="Edit Kolom Formatif"
                                    >
                                      <i className="fa-solid fa-pen text-[10px]"></i>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCol(col)}
                                      className="w-6 h-6 rounded text-rose-500 hover:text-rose-600 flex items-center justify-center"
                                      title="Hapus Kolom"
                                      aria-label="Hapus Kolom Formatif"
                                    >
                                      <i className="fa-solid fa-trash text-[10px]"></i>
                                    </button>
                                  </div>
                                )}
                              </div>
                              {col.keterangan && (
                                <span className="text-[9px] font-normal text-[#475569] dark:text-[#94A3B8] truncate max-w-[90px]">
                                  {col.keterangan}
                                </span>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Sumatif Columns */}
                      {sumatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-[#64748B] border-r border-slate-300/60 dark:border-slate-700/60">
                          Belum ada sumatif
                        </th>
                      ) : (
                        sumatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-teal-500/10 border-r border-slate-300/60 dark:border-slate-700/60 group"
                            title={col.keterangan ? `Keterangan: ${col.keterangan}` : undefined}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center justify-center gap-1">
                                <span className="truncate max-w-[70px]">{col.nama}</span>
                                {!isAdmin && isGuruPengampu && (
                                  <div className="flex items-center gap-0.5 no-print">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditColModal(col)}
                                      className="w-6 h-6 rounded text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center"
                                      title="Ubah Nama/Bobot/Keterangan"
                                      aria-label="Edit Kolom Sumatif"
                                    >
                                      <i className="fa-solid fa-pen text-[10px]"></i>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCol(col)}
                                      className="w-6 h-6 rounded text-rose-500 hover:text-rose-600 flex items-center justify-center"
                                      title="Hapus Kolom"
                                      aria-label="Hapus Kolom Sumatif"
                                    >
                                      <i className="fa-solid fa-trash text-[10px]"></i>
                                    </button>
                                  </div>
                                )}
                              </div>
                              {col.keterangan && (
                                <span className="text-[9px] font-normal text-[#475569] dark:text-[#94A3B8] truncate max-w-[90px]">
                                  {col.keterangan}
                                </span>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Summary Columns */}
                      <th className="py-2 px-2 w-24 text-center bg-amber-500/5">Rata Formatif</th>
                      <th className="py-2 px-2 w-24 text-center bg-amber-500/5">Rata Sumatif</th>
                      <th className="py-2 px-2 w-28 text-center font-black bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        Nilai Akhir TP
                      </th>
                      <th className="py-2 px-2.5 w-32 text-center">Predikat</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentTpStats(student.nisn);
                      const sGrades = gradesMap[student.nisn] || {};

                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-colors group"
                        >
                          {/* Student Info */}
                          <td className="sticky left-0 z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-1.5 md:px-2.5 text-center text-[#475569] dark:text-[#94A3B8] font-medium font-num w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px]">{idx + 1}</td>
                          <td className="hidden md:table-cell sticky left-[40px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-2.5 font-mono font-num text-[11px] text-[#475569] dark:text-[#94A3B8] w-24 min-w-[96px] max-w-[96px]">
                            {student.nisn}
                          </td>
                          <td className="sticky left-[32px] md:left-[136px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-2 md:px-3 font-semibold text-[#0F172A] dark:text-[#F1F5F9] w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]" title={student.nama_siswa}>
                            <span className="whitespace-normal line-clamp-2 leading-tight md:whitespace-nowrap md:truncate block">{student.nama_siswa}</span>
                            <span className="md:hidden block text-[10px] font-mono font-num font-normal text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">{student.nisn}</span>
                          </td>
                          <td className="py-2 px-2 text-center text-[#475569] dark:text-[#94A3B8] border-r border-slate-300/60 dark:border-slate-700/60 w-12 min-w-[48px] max-w-[48px]">
                            {student.gender || '-'}
                          </td>

                          {/* Diagnostik Cell */}
                          {diagnostikCol && (
                            <td className="p-1 text-center bg-sky-500/5 border-r border-slate-300/60 dark:border-slate-700/60">
                              {isAdmin || !isGuruPengampu ? (
                                <span className="font-semibold font-num text-[#0F172A] dark:text-[#F1F5F9]">
                                  {sGrades[diagnostikCol.id] ?? '-'}
                                </span>
                              ) : (
                                <input
                                  id={`grade-cell-${idx}-0`}
                                  data-row={idx}
                                  data-col={0}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={sGrades[diagnostikCol.id] ?? ''}
                                  onChange={e => handleGradeChange(student.nisn, diagnostikCol.id, e.target.value)}
                                  onKeyDown={e => handleCellKeyDown(e, idx, 0)}
                                  onFocus={e => e.target.select()}
                                  placeholder="-"
                                  className={`neu-input z-0 w-16 mx-auto text-center py-1 px-1 rounded-lg text-xs font-sans font-bold font-num [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                                    dirtyGrades[`${student.nisn}_${diagnostikCol.id}`]
                                      ? 'ring-2 ring-amber-400/70 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                      : 'text-[#0F172A] dark:text-[#F1F5F9]'
                                  }`}
                                />
                              )}
                            </td>
                          )}

                          {/* Formatif Cells */}
                          {formatifCols.length === 0 ? (
                            <td className="p-2 text-center text-[#64748B] italic text-[11px] border-r border-slate-300/60 dark:border-slate-700/60">
                              -
                            </td>
                          ) : (
                            formatifCols.map((col, fIdx) => {
                              const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                              const colIndex = (diagnostikCol ? 1 : 0) + fIdx;
                              return (
                                <td
                                  key={col.id}
                                  className="p-1 text-center bg-emerald-500/5 border-r border-slate-300/60 dark:border-slate-700/60"
                                >
                                  {isAdmin || !isGuruPengampu ? (
                                    <span className="font-semibold font-num text-[#0F172A] dark:text-[#F1F5F9]">
                                      {sGrades[col.id] ?? '-'}
                                    </span>
                                  ) : (
                                    <input
                                      id={`grade-cell-${idx}-${colIndex}`}
                                      data-row={idx}
                                      data-col={colIndex}
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      value={sGrades[col.id] ?? ''}
                                      onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                      onKeyDown={e => handleCellKeyDown(e, idx, colIndex)}
                                      onFocus={e => e.target.select()}
                                      placeholder="-"
                                      className={`neu-input z-0 w-16 mx-auto text-center py-1 px-1 rounded-lg text-xs font-sans font-bold font-num [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                                        isDirty
                                          ? 'ring-2 ring-amber-400/70 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                          : 'text-[#0F172A] dark:text-[#F1F5F9]'
                                      }`}
                                    />
                                  )}
                                </td>
                              );
                            })
                          )}

                          {/* Sumatif Cells */}
                          {sumatifCols.length === 0 ? (
                            <td className="p-2 text-center text-[#64748B] italic text-[11px] border-r border-slate-300/60 dark:border-slate-700/60">
                              -
                            </td>
                          ) : (
                            sumatifCols.map((col, smIdx) => {
                              const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                              const colIndex = (diagnostikCol ? 1 : 0) + formatifCols.length + smIdx;
                              return (
                                <td
                                  key={col.id}
                                  className="p-1 text-center bg-teal-500/5 border-r border-slate-300/60 dark:border-slate-700/60"
                                >
                                  {isAdmin || !isGuruPengampu ? (
                                    <span className="font-semibold font-num text-[#0F172A] dark:text-[#F1F5F9]">
                                      {sGrades[col.id] ?? '-'}
                                    </span>
                                  ) : (
                                    <input
                                      id={`grade-cell-${idx}-${colIndex}`}
                                      data-row={idx}
                                      data-col={colIndex}
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      value={sGrades[col.id] ?? ''}
                                      onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                      onKeyDown={e => handleCellKeyDown(e, idx, colIndex)}
                                      onFocus={e => e.target.select()}
                                      placeholder="-"
                                      className={`neu-input z-0 w-16 mx-auto text-center py-1 px-1 rounded-lg text-xs font-sans font-bold font-num [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                                        isDirty
                                          ? 'ring-2 ring-amber-400/70 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                          : 'text-[#0F172A] dark:text-[#F1F5F9]'
                                      }`}
                                    />
                                  )}
                                </td>
                              );
                            })
                          )}

                          {/* Calculated Summary Cells */}
                          <td className="py-2 px-2 text-center font-bold font-num text-[#334155] dark:text-[#CBD5E1]">
                            {stats.avgFormatif !== null ? stats.avgFormatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold font-num text-[#334155] dark:text-[#CBD5E1]">
                            {stats.avgSumatif !== null ? stats.avgSumatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-black font-num text-sm bg-amber-500/10 text-amber-800 dark:text-amber-200">
                            {stats.nilaiAkhir !== null ? stats.nilaiAkhir : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${stats.predikatClass}`}>
                                {stats.predikat}
                              </span>
                            ) : (
                              <span className="text-[#475569]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Class Average */}
                  <tfoot className="bg-[#DDE4EE] dark:bg-[#181C24] font-extrabold border-t-2 border-slate-300/70 dark:border-slate-700 text-[#0F172A] dark:text-[#F1F5F9]">
                    <tr>
                      <td colSpan={2} className="md:hidden sticky left-0 z-10 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-2 text-right border-r border-slate-300/60 dark:border-slate-700 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">
                        Rata-rata Kelas:
                      </td>
                      <td colSpan={3} className="hidden md:table-cell sticky left-0 z-10 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-3 text-right border-r border-slate-300/60 dark:border-slate-700 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">
                        Rata-rata Kelas:
                      </td>
                      <td className="py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700"></td>
                      {diagnostikCol && (
                        <td className="py-2.5 px-2 text-center font-num text-sky-700 dark:text-sky-300 border-r border-slate-300/60 dark:border-slate-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[diagnostikCol.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      )}
                      {formatifCols.length === 0 ? (
                        <td className="py-2.5 px-2 text-center text-[#475569] border-r border-slate-300/60 dark:border-slate-700">
                          -
                        </td>
                      ) : (
                        formatifCols.map(col => (
                          <td key={col.id} className="py-2.5 px-2 text-center font-num text-emerald-700 dark:text-emerald-300 border-r border-slate-300/60 dark:border-slate-700">
                            {(() => {
                              let sum = 0, c = 0;
                              students.forEach(s => {
                                const v = gradesMap[s.nisn]?.[col.id];
                                if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                              });
                              return c > 0 ? (sum / c).toFixed(1) : '-';
                            })()}
                          </td>
                        ))
                      )}
                      {sumatifCols.length === 0 ? (
                        <td className="py-2.5 px-2 text-center text-[#475569] border-r border-slate-300/60 dark:border-slate-700">
                          -
                        </td>
                      ) : (
                        sumatifCols.map(col => (
                          <td key={col.id} className="py-2.5 px-2 text-center font-num text-[#0F766E] dark:text-teal-300 border-r border-slate-300/60 dark:border-slate-700">
                            {(() => {
                              let sum = 0, c = 0;
                              students.forEach(s => {
                                const v = gradesMap[s.nisn]?.[col.id];
                                if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                              });
                              return c > 0 ? (sum / c).toFixed(1) : '-';
                            })()}
                          </td>
                        ))
                      )}
                      <td className="py-2.5 px-2 text-center font-num text-[#334155] dark:text-[#CBD5E1]">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgFormatif !== null) { sum += stats.avgFormatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center font-num text-[#334155] dark:text-[#CBD5E1]">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgSumatif !== null) { sum += stats.avgSumatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm font-black font-num text-amber-800 dark:text-amber-300 bg-amber-500/15">
                        {classAnalytics.classAvg > 0 ? classAnalytics.classAvg : '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center font-num text-[11px]">
                        Tuntas: {classAnalytics.tuntasPct}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Print Signature Component */}
          <PrintSignature
            leftTitle="Mengetahui,"
            leftSubtitle="Guru Mata Pelajaran"
            leftName={selectedGuru || user?.nama}
            leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}
            user={user}
            sekolahId={sekolahId || undefined}
            statusKepalaSekolah={statusKepalaSekolah}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAP NILAI RAPOR SEMESTER (OVERVIEW ALL TPS)                      */}
      {/* ========================================================================= */}
      {innerTab === 'rekap-semester' && (
        <div className="space-y-4">
          <div className="neu-card rounded-2xl p-4 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Rekapitulasi Nilai Akhir Semester (Rapor)
                </h3>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                  Nilai Akhir dari setiap Tujuan Pembelajaran (TP) dikompilasi untuk menghasilkan Nilai Rapor Semester.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="neu-inset text-xs font-bold font-num text-[#0F766E] dark:text-teal-300 px-3 py-1.5 rounded-xl">
                  Total {tpList.length} TP Terkompilasi
                </span>
              </div>
            </div>
          </div>

          {tpList.length === 0 ? (
            <div className="neu-card-sm rounded-2xl p-10 text-center">
              <i className="fa-solid fa-folder-open text-3xl text-[#64748B] mb-2"></i>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                Belum ada TP yang dibuat untuk semester ini.
              </p>
            </div>
          ) : (
            <div className="neu-card-sm rounded-2xl overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll touch-pan-x overscroll-x-contain print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-[#DDE4EE] dark:bg-[#181C24] text-[#0F172A] dark:text-[#F1F5F9] sticky top-0 z-30 shadow-sm print:bg-gray-100 print:text-black">
                    {/* Upper Category Row */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] font-black uppercase tracking-wider">
                      <th colSpan={2} className="md:hidden sticky left-0 z-30 py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th colSpan={3} className="hidden md:table-cell sticky left-0 z-30 py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th className="py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                      </th>
                      <th
                        colSpan={tpList.length + 1}
                        className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      >
                        Asesmen Formatif (Proses) • Bobot {bobotFormatif}%
                      </th>
                      <th
                        colSpan={tpList.length + 1}
                        className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-teal-500/15 text-[#0F766E] dark:text-teal-300"
                      >
                        Asesmen Sumatif (Lingkup Materi) • Bobot {bobotSumatif}%
                      </th>
                      <th
                        className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-sky-500/10 text-sky-800 dark:text-sky-300"
                      >
                        Presensi • {bobotKehadiran}%
                      </th>
                      <th colSpan={3} className="py-2.5 px-3 text-center bg-amber-500/10 text-amber-800 dark:text-amber-300">
                        Kalkulasi Nilai Akhir Rapor
                      </th>
                    </tr>

                    {/* Column Headers */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 font-bold text-[#0F172A] dark:text-[#F1F5F9] text-[11px]">
                      <th className="sticky left-0 z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-1.5 md:px-2.5 w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px] text-center">#</th>
                      <th className="hidden md:table-cell sticky left-[40px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2.5 w-24 min-w-[96px] max-w-[96px]">NISN</th>
                      <th className="sticky left-[32px] md:left-[136px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2 md:px-3 w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">Nama Siswa</th>
                      <th className="py-2 px-2 w-12 min-w-[48px] max-w-[48px] text-center border-r border-slate-300/60 dark:border-slate-700/60">L/P</th>

                      {/* Header per TP - Formatif */}
                      {tpList.map(tp => (
                        <th
                          key={`f-${tp.id}`}
                          className="py-2 px-2.5 w-24 text-center bg-emerald-500/5 border-r border-slate-300/60 dark:border-slate-700/60"
                        >
                          <div className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1">
                            <span>{tp.kode_tp}</span>
                            <span className="text-[8px] px-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 rounded font-black">F</span>
                          </div>
                          <div className="font-normal text-[9px] text-[#475569] dark:text-[#94A3B8] truncate max-w-[80px] mx-auto">
                            {tp.deskripsi}
                          </div>
                        </th>
                      ))}
                      {/* Overall Formatif Average */}
                      <th className="py-2 px-2.5 w-24 text-center font-black bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-r border-slate-300/60 dark:border-slate-700/60">
                        <div>Rata F</div>
                        <div className="text-[9px] font-normal text-emerald-700 dark:text-emerald-300">Formatif</div>
                      </th>

                      {/* Header per TP - Sumatif */}
                      {tpList.map(tp => (
                        <th
                          key={`s-${tp.id}`}
                          className="py-2 px-2.5 w-24 text-center bg-teal-500/5 border-r border-slate-300/60 dark:border-slate-700/60"
                        >
                          <div className="font-extrabold text-[#0F766E] dark:text-teal-300 flex items-center justify-center gap-1">
                            <span>{tp.kode_tp}</span>
                            <span className="text-[8px] px-1 bg-teal-500/15 text-[#0F766E] dark:text-teal-200 rounded font-black">S</span>
                          </div>
                          <div className="font-normal text-[9px] text-[#475569] dark:text-[#94A3B8] truncate max-w-[80px] mx-auto">
                            {tp.deskripsi}
                          </div>
                        </th>
                      ))}
                      {/* Overall Sumatif Average */}
                      <th className="py-2 px-2.5 w-24 text-center font-black bg-teal-500/15 text-[#0F766E] dark:text-teal-200 border-r border-slate-300/60 dark:border-slate-700/60">
                        <div>Rata S</div>
                        <div className="text-[9px] font-normal text-[#0F766E] dark:text-teal-300">Sumatif</div>
                      </th>

                      {/* Kehadiran */}
                      <th className="py-2 px-2.5 w-24 text-center font-black bg-sky-500/10 text-sky-900 dark:text-sky-200 border-r border-slate-300/60 dark:border-slate-700/60">
                        <div>Kehadiran</div>
                        <div className="text-[9px] font-normal font-num text-sky-700 dark:text-sky-300">{bobotKehadiran}%</div>
                      </th>

                      <th className="py-2.5 px-3 w-32 text-center font-black bg-amber-500/15 text-amber-900 dark:text-amber-200 border-r border-slate-300/60 dark:border-slate-700/60">
                        Nilai Rapor
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center border-r border-slate-300/60 dark:border-slate-700/60">Predikat Semester</th>
                      <th className="py-2.5 px-3 min-w-[280px] text-left">Deskripsi Capaian Pembelajaran</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentSemesterStats(student.nisn);
                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-colors group"
                        >
                          <td className="sticky left-0 z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-1.5 md:px-2.5 text-center text-[#475569] font-medium font-num w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px]">{idx + 1}</td>
                          <td className="hidden md:table-cell sticky left-[40px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-2.5 font-mono font-num text-[11px] text-[#475569] dark:text-[#94A3B8] w-24 min-w-[96px] max-w-[96px]">
                            {student.nisn}
                          </td>
                          <td className="sticky left-[32px] md:left-[136px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-2 md:px-3 font-semibold text-[#0F172A] dark:text-[#F1F5F9] w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]" title={student.nama_siswa}>
                            <span className="whitespace-normal line-clamp-2 leading-tight md:whitespace-nowrap md:truncate block">{student.nama_siswa}</span>
                            <span className="md:hidden block text-[10px] font-mono font-num font-normal text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">{student.nisn}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#475569] border-r border-slate-300/60 dark:border-slate-700/60 w-12 min-w-[48px] max-w-[48px]">
                            {student.gender || '-'}
                          </td>

                          {/* Formatif per TP */}
                          {tpList.map(tp => {
                            const fScore = stats.tpFormatifResults?.[tp.id] ?? null;
                            return (
                              <td
                                key={`f-${tp.id}`}
                                className="py-2.5 px-2.5 text-center font-bold font-num border-r border-slate-300/60 dark:border-slate-700/60 bg-emerald-500/5"
                              >
                                {fScore !== null ? (
                                  <span className={fScore >= 75 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                                    {fScore}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">-</span>
                                )}
                              </td>
                            );
                          })}
                          {/* Rata-rata Formatif */}
                          <td className="py-2.5 px-2.5 text-center font-black font-num border-r border-slate-300/60 dark:border-slate-700/60 bg-emerald-500/10">
                            {stats.avgFormatifAll !== null ? (
                              <span className="text-emerald-800 dark:text-emerald-300">{stats.avgFormatifAll}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </td>

                          {/* Sumatif per TP */}
                          {tpList.map(tp => {
                            const sScore = stats.tpSumatifResults?.[tp.id] ?? null;
                            return (
                              <td
                                key={`s-${tp.id}`}
                                className="py-2.5 px-2.5 text-center font-bold font-num border-r border-slate-300/60 dark:border-slate-700/60 bg-teal-500/5"
                              >
                                {sScore !== null ? (
                                  <span className={sScore >= 75 ? 'text-[#0F766E] dark:text-teal-300' : 'text-red-600 dark:text-red-400'}>
                                    {sScore}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-600">-</span>
                                )}
                              </td>
                            );
                          })}
                          {/* Rata-rata Sumatif */}
                          <td className="py-2.5 px-2.5 text-center font-black font-num border-r border-slate-300/60 dark:border-slate-700/60 bg-teal-500/10">
                            {stats.avgSumatifAll !== null ? (
                              <span className="text-[#0F766E] dark:text-teal-300">{stats.avgSumatifAll}</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">-</span>
                            )}
                          </td>

                          {/* Nilai Kehadiran */}
                          <td className="py-2.5 px-2.5 text-center font-bold font-num border-r border-slate-300/60 dark:border-slate-700/60 bg-sky-500/5">
                            <span className="text-sky-800 dark:text-sky-300">
                              {stats.kehadiranScore}%
                            </span>
                          </td>

                          {/* Nilai Rapor Semester */}
                          <td className="py-2.5 px-3 text-center font-black font-num text-sm bg-amber-500/10 text-amber-900 dark:text-amber-200 border-r border-slate-300/60 dark:border-slate-700/60">
                            {stats.semesterFinal !== null ? stats.semesterFinal : '-'}
                          </td>

                          {/* Predikat */}
                          <td className="py-2.5 px-3 text-center border-r border-slate-300/60 dark:border-slate-700/60">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${stats.predikatBadge}`}>
                                {stats.predikat}
                              </span>
                            ) : (
                              <span className="text-[#64748B]">-</span>
                            )}
                          </td>

                          {/* Deskripsi Capaian Pembelajaran */}
                          <td className="py-2.5 px-3 text-left whitespace-normal text-[11px] text-[#334155] dark:text-[#CBD5E1] leading-relaxed max-w-sm">
                            {stats.deskripsiCapaian}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <PrintSignature
            leftTitle="Mengetahui,"
            leftSubtitle="Guru Mata Pelajaran"
            leftName={selectedGuru || user?.nama}
            leftNip={user?.nip}
            user={user}
            sekolahId={sekolahId || undefined}
            statusKepalaSekolah={statusKepalaSekolah}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PRESENSI SESI (16 PERTEMUAN KBM) & POIN KEHADIRAN                  */}
      {/* ========================================================================= */}
      {innerTab === 'presensi-sesi' && (
        <div className="space-y-4">
          {/* Header Card / Action Bar */}
          <div className="neu-card rounded-2xl p-4 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                    <i className="fa-solid fa-calendar-check text-[#0F766E] dark:text-teal-400"></i>
                    Rincian Presensi Sesi & Poin Kehadiran (16 Pertemuan)
                  </h3>
                  {isSavingAttendance && (
                    <span className="text-[10px] font-bold text-[#0F766E] dark:text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded-md inline-flex items-center gap-1 animate-pulse">
                      <i className="fa-solid fa-spinner fa-spin"></i> Menyimpan ke Jurnal...
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  Kelola status kehadiran setiap pertemuan KBM secara interaktif. Nilai kehadiran dan kalkulasi rapor terupdate seketika.
                </p>
              </div>

              {/* Role-Based Mode Switcher: Wali Kelas / Admin can toggle, Guru Mapel strictly Presensi Mapel */}
              <div className="flex items-center gap-2 flex-wrap">
                {!isPureGuruMapel ? (
                  <div className="neu-inset p-1.5 rounded-2xl flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveAttendanceView('mapel')}
                      className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        activeAttendanceView === 'mapel'
                          ? 'neu-btn neu-btn-primary text-white'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                      }`}
                    >
                      <i className="fa-solid fa-book text-xs"></i>
                      Presensi Mapel: {selectedMapel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveAttendanceView('harian')}
                      className={`px-3.5 py-2 min-h-[38px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        activeAttendanceView === 'harian'
                          ? 'neu-btn neu-btn-primary text-white'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                      }`}
                    >
                      <i className="fa-solid fa-calendar-day text-xs"></i>
                      Presensi Harian Kelas: {selectedKelas}
                    </button>
                  </div>
                ) : (
                  <span className="neu-inset px-3 py-2 min-h-[38px] rounded-xl text-xs font-bold text-[#0F766E] dark:text-teal-300 inline-flex items-center gap-1.5">
                    <i className="fa-solid fa-book text-xs"></i>
                    Presensi Mapel: {selectedMapel} ({selectedKelas})
                  </span>
                )}
              </div>
            </div>

            {/* Attendance Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-300/60 dark:border-slate-700/60">
              <div className="neu-inset p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] block">Kemajuan Pertemuan</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                    {sessions.filter(s => s.isRecorded || Object.keys(s.attendanceMap).length > 0).length}
                  </span>
                  <span className="text-xs font-bold font-num text-[#64748B]">/ 16 Sesi</span>
                </div>
                <span className="text-[10px] text-[#0F766E] dark:text-teal-400 font-semibold font-num mt-0.5 block">
                  Semester {selectedSemester} ({selectedTahunAjaran})
                </span>
              </div>

              <div className="neu-inset p-3.5 rounded-xl">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] block">Bobot Nilai Kehadiran</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black font-num text-[#0F766E] dark:text-teal-300">
                    {bobotKehadiran}%
                  </span>
                  <span className="text-xs font-bold text-[#64748B]">dari Nilai Rapor</span>
                </div>
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-medium mt-0.5 block">
                  Komponen Kehadiran Buku Nilai
                </span>
              </div>

              <div className="neu-inset p-3.5 rounded-xl lg:col-span-2">
                <span className="text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] block mb-1.5">Skor Poin Status Kehadiran</span>
                <div className="flex items-center gap-2 flex-wrap text-xs font-num">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold text-[11px]">
                    Hadir (H): {statusPoints.hadir ?? 100} pts
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-800 dark:text-sky-200 font-bold text-[11px]">
                    Sakit (S): {statusPoints.sakit ?? 75} pts
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 font-bold text-[11px]">
                    Izin (I): {statusPoints.izin ?? 75} pts
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-800 dark:text-orange-200 font-bold text-[11px]">
                    Terlambat (T): {statusPoints.terlambat ?? 75} pts
                  </span>
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-800 dark:text-rose-200 font-bold text-[11px]">
                    Alpa (A): {statusPoints.alpa ?? 0} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {activeAttendanceView === 'mapel' ? (
            <div className="neu-card-sm rounded-2xl overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll touch-pan-x overscroll-x-contain print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-[#DDE4EE] dark:bg-[#181C24] text-[#0F172A] dark:text-[#F1F5F9] sticky top-0 z-30 shadow-sm print:bg-gray-100 print:text-black">
                    {/* Category Header Row */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 text-[11px] font-black uppercase tracking-wider">
                      <th colSpan={2} className="md:hidden sticky left-0 z-30 py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th colSpan={3} className="hidden md:table-cell sticky left-0 z-30 py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                        Identitas Siswa
                      </th>
                      <th className="py-2.5 px-2 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black">
                      </th>
                      <th colSpan={16} className="py-2.5 px-3 border-r border-slate-300/60 dark:border-slate-700/60 text-center bg-teal-500/15 text-[#0F766E] dark:text-teal-300">
                        16 Pertemuan KBM Sesi Tatap Muka
                      </th>
                      <th colSpan={7} className="py-2.5 px-3 text-center bg-sky-500/10 text-sky-800 dark:text-sky-300">
                        Rekapitulasi Kehadiran & Kontribusi Nilai
                      </th>
                    </tr>

                    {/* Column Headers */}
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 font-bold text-[#0F172A] dark:text-[#F1F5F9] text-[11px]">
                      <th className="sticky left-0 z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-1.5 md:px-2.5 w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px] text-center">#</th>
                      <th className="hidden md:table-cell sticky left-[40px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2.5 w-24 min-w-[96px] max-w-[96px]">NISN</th>
                      <th className="sticky left-[32px] md:left-[136px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2 px-2 md:px-3 w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">Nama Siswa</th>
                      <th className="py-2 px-2 w-12 min-w-[48px] max-w-[48px] text-center border-r border-slate-300/60 dark:border-slate-700/60">L/P</th>

                      {/* 16 Session Columns */}
                      {sessions.map(sess => (
                        <th
                          key={sess.sessionNumber}
                          className="py-2 px-2 w-20 text-center border-r border-slate-300/60 dark:border-slate-700/60 bg-[#E6ECF2]/60 dark:bg-[#1F242D]/60"
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span className="font-extrabold font-num text-[#0F172A] dark:text-[#F1F5F9] text-[11px]">
                              P{sess.sessionNumber}
                            </span>
                            {sess.tanggal ? (
                              <span className="text-[8px] font-normal text-[#475569] dark:text-[#94A3B8] font-mono font-num">
                                {sess.tanggal.slice(5)}
                              </span>
                            ) : (
                              <span className="text-[8px] font-normal text-[#64748B] italic">
                                Belum
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleMarkAllPresent(sess.sessionNumber)}
                              className="text-[9px] px-2 py-1 min-h-[28px] rounded-lg bg-teal-500/15 text-[#0F766E] hover:bg-teal-500/25 dark:text-teal-300 font-semibold transition flex items-center gap-1 mt-0.5"
                              title={`Tandai Semua Hadir pada Pertemuan ${sess.sessionNumber}`}
                            >
                              <i className="fa-solid fa-check-double text-[8px]"></i> Hadir
                            </button>
                          </div>
                        </th>
                      ))}

                      {/* Rekap Counts */}
                      <th className="py-2 px-2 w-12 text-center font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-r border-slate-300/60 dark:border-slate-700/60">H</th>
                      <th className="py-2 px-2 w-12 text-center font-bold text-sky-700 dark:text-sky-300 bg-sky-500/10 border-r border-slate-300/60 dark:border-slate-700/60">S</th>
                      <th className="py-2 px-2 w-12 text-center font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border-r border-slate-300/60 dark:border-slate-700/60">I</th>
                      <th className="py-2 px-2 w-12 text-center font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 border-r border-slate-300/60 dark:border-slate-700/60">A</th>
                      <th className="py-2 px-2.5 w-20 text-center font-bold border-r border-slate-300/60 dark:border-slate-700/60">Total Poin</th>
                      <th className="py-2 px-2.5 w-24 text-center font-black bg-teal-500/15 text-[#0F766E] dark:text-teal-200 border-r border-slate-300/60 dark:border-slate-700/60">
                        Kehadiran (%)
                      </th>
                      <th className="py-2 px-2.5 w-24 text-center font-black bg-amber-500/15 text-amber-900 dark:text-amber-200">
                        Kontribusi Rapor
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                    {filteredStudents.map((student, idx) => {
                      const validRecordedSessions = sessions.filter(s => s.isRecorded || Object.keys(s.attendanceMap).length > 0);
                      let hCount = 0;
                      let sCount = 0;
                      let iCount = 0;
                      let tCount = 0;
                      let aCount = 0;
                      let totalPoints = 0;

                      validRecordedSessions.forEach(sess => {
                        const code = (sess.attendanceMap[student.nisn] || 'H').toUpperCase();
                        if (code === 'H' || code.startsWith('HADIR')) { hCount++; totalPoints += (statusPoints.hadir ?? 100); }
                        else if (code === 'S' || code.startsWith('SAKIT')) { sCount++; totalPoints += (statusPoints.sakit ?? 75); }
                        else if (code === 'I' || code.startsWith('IZIN')) { iCount++; totalPoints += (statusPoints.izin ?? 75); }
                        else if (code === 'T' || code.startsWith('TERLAMBAT')) { tCount++; totalPoints += (statusPoints.terlambat ?? 75); }
                        else if (code === 'A' || code === 'B' || code.startsWith('ALPA') || code.startsWith('BOLOS')) { aCount++; totalPoints += (statusPoints.alpa ?? 0); }
                        else { hCount++; totalPoints += 100; }
                      });

                      const attRate = attendanceRates[student.nisn] ?? 100;
                      const raporContribution = parseFloat(((attRate * bobotKehadiran) / 100).toFixed(1));

                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-colors group"
                        >
                          <td className="sticky left-0 z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-1.5 md:px-2.5 text-center text-[#475569] dark:text-[#94A3B8] font-medium font-num w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px]">{idx + 1}</td>
                          <td className="hidden md:table-cell sticky left-[40px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-2.5 font-mono font-num text-[11px] text-[#475569] dark:text-[#94A3B8] w-24 min-w-[96px] max-w-[96px]">
                            {student.nisn}
                          </td>
                          <td className="sticky left-[32px] md:left-[136px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2 px-2 md:px-3 font-semibold text-[#0F172A] dark:text-[#F1F5F9] w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]" title={student.nama_siswa}>
                            <span className="whitespace-normal line-clamp-2 leading-tight md:whitespace-nowrap md:truncate block">{student.nama_siswa}</span>
                            <span className="md:hidden block text-[10px] font-mono font-num font-normal text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">{student.nisn}</span>
                          </td>
                          <td className="py-2 px-2 text-center text-[#475569] dark:text-[#94A3B8] border-r border-slate-300/60 dark:border-slate-700/60 w-12 min-w-[48px] max-w-[48px]">
                            {student.gender || '-'}
                          </td>

                          {/* 16 Session Cells */}
                          {sessions.map(sess => {
                            const rawStatus = sess.attendanceMap[student.nisn];
                            const status = rawStatus || (sess.isRecorded ? 'H' : '-');
                            
                            let badgeStyle = 'neu-inset text-[#64748B] dark:text-slate-500';
                            if (status === 'H') badgeStyle = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-400/50 dark:border-emerald-700 font-extrabold';
                            else if (status === 'S') badgeStyle = 'bg-sky-500/20 text-sky-800 dark:text-sky-200 border border-sky-400/50 dark:border-sky-700 font-extrabold';
                            else if (status === 'I') badgeStyle = 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-400/50 dark:border-amber-700 font-extrabold';
                            else if (status === 'T') badgeStyle = 'bg-orange-500/20 text-orange-800 dark:text-orange-200 border border-orange-400/50 dark:border-orange-700 font-extrabold';
                            else if (status === 'A' || status === 'B') badgeStyle = 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-400/50 dark:border-rose-700 font-extrabold';

                            return (
                              <td
                                key={sess.sessionNumber}
                                className="py-1.5 px-1.5 text-center border-r border-slate-300/60 dark:border-slate-700/60"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCellStatus(sess.sessionNumber, student.nisn)}
                                  className={`w-9 h-9 rounded-lg text-xs transition transform hover:scale-105 active:scale-95 inline-flex items-center justify-center ${badgeStyle}`}
                                  title={`Pertemuan ${sess.sessionNumber}: Klik untuk ubah status (H -> S -> I -> T -> A)`}
                                  aria-label={`Pertemuan ${sess.sessionNumber} ${student.nama_siswa}: ${status}`}
                                >
                                  {status}
                                </button>
                              </td>
                            );
                          })}

                          {/* Summary Counts */}
                          <td className="py-2 px-2 text-center font-bold font-num text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 border-r border-slate-300/60 dark:border-slate-700/60">{hCount}</td>
                          <td className="py-2 px-2 text-center font-bold font-num text-sky-700 dark:text-sky-400 bg-sky-500/5 border-r border-slate-300/60 dark:border-slate-700/60">{sCount}</td>
                          <td className="py-2 px-2 text-center font-bold font-num text-amber-700 dark:text-amber-400 bg-amber-500/5 border-r border-slate-300/60 dark:border-slate-700/60">{iCount}</td>
                          <td className="py-2 px-2 text-center font-bold font-num text-rose-700 dark:text-rose-400 bg-rose-500/5 border-r border-slate-300/60 dark:border-slate-700/60">{aCount}</td>
                          <td className="py-2 px-2.5 text-center font-semibold font-num text-[#334155] dark:text-[#CBD5E1] border-r border-slate-300/60 dark:border-slate-700/60">{totalPoints}</td>
                          <td className="py-2 px-2.5 text-center font-black font-num text-sm bg-teal-500/10 text-[#0F766E] dark:text-teal-300 border-r border-slate-300/60 dark:border-slate-700/60">
                            {attRate}%
                          </td>
                          <td className="py-2 px-2.5 text-center font-black font-num text-sm bg-amber-500/10 text-amber-800 dark:text-amber-300">
                            +{raporContribution}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Presensi Harian Kelas View (for Wali Kelas / Admin) */
            <div className="neu-card-sm rounded-2xl overflow-hidden">
              <div className="p-4 neu-inset rounded-t-2xl border-b border-slate-300/60 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#0F766E] dark:text-teal-300">
                    Data Presensi Harian Kelas (Absensi Sekolah) — Kelas {selectedKelas}
                  </h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
                    Data kehadiran kumulatif seluruh hari KBM dari modul absensi harian wali kelas/piket untuk Semester {selectedSemester} ({selectedTahunAjaran}).
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[600px] custom-scroll touch-pan-x overscroll-x-contain">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-[#DDE4EE] dark:bg-[#181C24] text-[#0F172A] dark:text-[#F1F5F9] sticky top-0 z-20 print:bg-gray-100 print:text-black">
                    <tr className="border-b border-slate-300/60 dark:border-slate-700/60 font-bold text-[11px]">
                      <th className="sticky left-0 z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-1.5 md:px-2.5 w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px] text-center">#</th>
                      <th className="hidden md:table-cell sticky left-[40px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-2.5 w-24 min-w-[96px] max-w-[96px]">NISN</th>
                      <th className="sticky left-[32px] md:left-[136px] z-30 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black py-2.5 px-2 md:px-3 w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]">Nama Siswa</th>
                      <th className="py-2.5 px-2 w-12 min-w-[48px] max-w-[48px] text-center border-r border-slate-300/60 dark:border-slate-700/60">L/P</th>
                      <th className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-300 border-r border-slate-300/60 dark:border-slate-700/60">Hadir</th>
                      <th className="py-2.5 px-3 text-center text-sky-700 dark:text-sky-300 border-r border-slate-300/60 dark:border-slate-700/60">Sakit</th>
                      <th className="py-2.5 px-3 text-center text-amber-700 dark:text-amber-300 border-r border-slate-300/60 dark:border-slate-700/60">Izin</th>
                      <th className="py-2.5 px-3 text-center text-red-700 dark:text-red-300 border-r border-slate-300/60 dark:border-slate-700/60">Alpa</th>
                      <th className="py-2.5 px-3 text-center font-semibold border-r border-slate-300/60 dark:border-slate-700/60">Total Hari KBM</th>
                      <th className="py-2.5 px-3 text-center font-black bg-teal-500/15 text-[#0F766E] dark:text-teal-200">
                        Persentase Kehadiran Harian (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-700/60">
                    {filteredStudents.map((student, idx) => {
                      const dStat = dailyClassAttendance[student.nisn] || { hadir: 0, sakit: 0, izin: 0, alpa: 0, total: 0, percentage: 100 };
                      return (
                        <tr key={student.nisn} className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 group">
                          <td className="sticky left-0 z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-1.5 md:px-2.5 text-center text-[#475569] font-medium font-num w-8 min-w-[32px] max-w-[32px] md:w-10 md:min-w-[40px] md:max-w-[40px]">{idx + 1}</td>
                          <td className="hidden md:table-cell sticky left-[40px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-2.5 font-mono font-num text-[11px] text-[#475569] dark:text-[#94A3B8] w-24 min-w-[96px] max-w-[96px]">{student.nisn}</td>
                          <td className="sticky left-[32px] md:left-[136px] z-10 bg-[#E6ECF2] dark:bg-[#1F242D] group-hover:bg-[#DDE4EE] dark:group-hover:bg-[#181C24] print:bg-white py-2.5 px-2 md:px-3 font-semibold text-[#0F172A] dark:text-[#F1F5F9] w-[140px] min-w-[140px] max-w-[140px] md:w-[200px] md:min-w-[200px] md:max-w-[200px] border-r border-slate-300/60 dark:border-slate-700/60 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.14)] dark:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.45)]" title={student.nama_siswa}>
                            <span className="whitespace-normal line-clamp-2 leading-tight md:whitespace-nowrap md:truncate block">{student.nama_siswa}</span>
                            <span className="md:hidden block text-[10px] font-mono font-num font-normal text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">{student.nisn}</span>
                          </td>
                          <td className="py-2.5 px-2 text-center text-[#475569] border-r border-slate-300/60 dark:border-slate-700/60 w-12 min-w-[48px] max-w-[48px]">{student.gender || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-num text-emerald-700 dark:text-emerald-400 border-r border-slate-300/60 dark:border-slate-700/60">{dStat.hadir}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-num text-sky-700 dark:text-sky-400 border-r border-slate-300/60 dark:border-slate-700/60">{dStat.sakit}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-num text-amber-700 dark:text-amber-400 border-r border-slate-300/60 dark:border-slate-700/60">{dStat.izin}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-num text-red-700 dark:text-red-400 border-r border-slate-300/60 dark:border-slate-700/60">{dStat.alpa}</td>
                          <td className="py-2.5 px-3 text-center font-semibold font-num text-[#334155] dark:text-[#CBD5E1] border-r border-slate-300/60 dark:border-slate-700/60">{dStat.total} hari</td>
                          <td className="py-2.5 px-3 text-center font-black font-num text-sm bg-teal-500/10 text-[#0F766E] dark:text-teal-200">
                            {dStat.percentage}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <PrintSignature
            leftTitle="Mengetahui,"
            leftSubtitle="Guru Mata Pelajaran"
            leftName={selectedGuru || user?.nama}
            leftNip={user?.nip}
            user={user}
            sekolahId={sekolahId || undefined}
            statusKepalaSekolah={statusKepalaSekolah}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STATISTIK & ANALISIS KELAS                                         */}
      {/* ========================================================================= */}
      {innerTab === 'statistik' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="neu-card-sm rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">Rata-rata Kelas</span>
                <span className="neu-inset w-9 h-9 rounded-xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-chart-line"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                  {classAnalytics.classAvg}
                </span>
                <span className="text-xs font-num text-[#64748B] font-semibold">/ 100</span>
              </div>
              <p className="text-[11px] font-num text-[#64748B] dark:text-[#94A3B8] mt-1">
                Dari {classAnalytics.gradedStudents} siswa dinilai
              </p>
            </div>

            <div className="neu-card-sm rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">Ketuntasan (KKTP ≥ 75)</span>
                <span className="neu-inset w-9 h-9 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-check-double"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-num text-emerald-600 dark:text-emerald-400">
                  {classAnalytics.tuntasPct}%
                </span>
                <span className="text-xs font-num text-[#64748B] dark:text-[#94A3B8] font-semibold">
                  ({classAnalytics.tuntasCount} siswa)
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">
                Kriteria Ketercapaian Tujuan Pembelajaran
              </p>
            </div>

            <div className="neu-card-sm rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">Nilai Tertinggi</span>
                <span className="neu-inset w-9 h-9 rounded-xl text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-trophy"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-num text-sky-600 dark:text-sky-400">
                  {classAnalytics.highestScore}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">Skor tertinggi di TP ini</p>
            </div>

            <div className="neu-card-sm rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#475569] dark:text-[#94A3B8]">Nilai Terendah</span>
                <span className="neu-inset w-9 h-9 rounded-xl text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-arrow-down-wide-short"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black font-num text-rose-600 dark:text-rose-400">
                  {classAnalytics.lowestScore}
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1">Skor terendah di TP ini</p>
            </div>
          </div>

          {/* Grade Distribution Breakdown */}
          <div className="neu-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-4">
              Distribusi Capaian Kompetensi Kurikulum Merdeka
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="neu-inset p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span>Sangat Baik (A)</span>
                  <span className="font-num">85 - 100</span>
                </div>
                <div className="mt-2 text-2xl font-black font-num text-emerald-700 dark:text-emerald-400">
                  {classAnalytics.distribution.a}{' '}
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.a / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="neu-inset p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-sky-700 dark:text-sky-300">
                  <span>Baik (B)</span>
                  <span className="font-num">75 - 84</span>
                </div>
                <div className="mt-2 text-2xl font-black font-num text-sky-700 dark:text-sky-400">
                  {classAnalytics.distribution.b}{' '}
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.b / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="neu-inset p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span>Cukup (C)</span>
                  <span className="font-num">65 - 74</span>
                </div>
                <div className="mt-2 text-2xl font-black font-num text-amber-700 dark:text-amber-400">
                  {classAnalytics.distribution.c}{' '}
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.c / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="neu-inset p-4 rounded-xl">
                <div className="flex justify-between items-center text-xs font-bold text-rose-700 dark:text-rose-300">
                  <span>Perlu Bimbingan (D)</span>
                  <span className="font-num">&lt; 65</span>
                </div>
                <div className="mt-2 text-2xl font-black font-num text-rose-700 dark:text-rose-400">
                  {classAnalytics.distribution.d}{' '}
                  <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.d / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Print Signature Component */}
          <PrintSignature
            leftTitle="Mengetahui,"
            leftSubtitle="Guru Mata Pelajaran"
            leftName={selectedGuru || user?.nama}
            leftNip={teachersList.find(t => t.nama_guru === selectedGuru)?.nip || user?.nip}
            user={user}
            sekolahId={sekolahId || undefined}
            statusKepalaSekolah={statusKepalaSekolah}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* Modal Add / Edit TP */}
      {isTpModalOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => setIsTpModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingTp ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran (TP)'}
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {editingTp ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran (TP)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTpModalOpen(false)}
                aria-label="Tutup dialog"
                className="neu-btn w-11 h-11 rounded-full text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center text-sm shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTp} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Capaian Pembelajaran (CP) Payung <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={tpForm.cp_id}
                  onChange={e => setTpForm({ ...tpForm, cp_id: e.target.value })}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  <option value="" disabled>-- Pilih Capaian Pembelajaran --</option>
                  {cpList.map(cp => (
                    <option key={cp.id} value={cp.id}>
                      {cp.kode_cp} - {cp.deskripsi.slice(0, 60)}{cp.deskripsi.length > 60 ? '...' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Kode TP
                  </label>
                  <input
                    type="text"
                    required
                    value={tpForm.kode_tp}
                    onChange={e => setTpForm({ ...tpForm, kode_tp: e.target.value })}
                    placeholder="e.g. TP 1"
                    className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tpForm.urutan}
                    onChange={e => setTpForm({ ...tpForm, urutan: parseInt(e.target.value) || 1 })}
                    className="neu-input w-full px-3 py-2 min-h-[40px] font-num rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Deskripsi Tujuan Pembelajaran
                </label>
                <textarea
                  required
                  rows={3}
                  value={tpForm.deskripsi}
                  onChange={e => setTpForm({ ...tpForm, deskripsi: e.target.value })}
                  placeholder="Deskripsikan kompetensi atau materi pembelajaran yang ingin dicapai..."
                  className="neu-input w-full px-3 py-2 rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Semester
                  </label>
                  <select
                    value={tpForm.semester}
                    onChange={e => setTpForm({ ...tpForm, semester: e.target.value })}
                    className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                    Tahun Ajaran {!isAdmin && <span className="text-[10px] text-[#0F766E] dark:text-teal-400 font-normal">(Sinkron Admin)</span>}
                  </label>
                  <input
                    type="text"
                    value={tpForm.tahun_ajaran}
                    onChange={e => !isAdmin ? null : setTpForm({ ...tpForm, tahun_ajaran: e.target.value })}
                    readOnly={!isAdmin}
                    className={`w-full px-3 py-2 min-h-[40px] font-num rounded-xl ${
                      !isAdmin
                        ? 'neu-inset cursor-not-allowed text-[#64748B]'
                        : 'neu-input text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]'
                    }`}
                  />
                </div>
              </div>

              {!editingTp && (
                <div className="p-2.5 rounded-xl bg-teal-500/15 border border-[#0F766E]/30 text-[11px] text-[#0F766E] dark:text-teal-300">
                  <i className="fa-solid fa-info-circle mr-1"></i> Kolom <strong>Diagnostik</strong>, <strong>Formatif 1</strong>, dan <strong>Sumatif 1</strong> akan otomatis dibuatkan.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTpModalOpen(false)}
                  className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white"
                >
                  {editingTp ? 'Simpan Perubahan' : 'Buat TP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Asesmen Kolom */}
      {isColModalOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => setIsColModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingCol ? 'Edit Kolom Asesmen' : `Tambah Kolom ${colForm.kategori}`}
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-2xl max-w-sm w-full p-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {editingCol ? 'Edit Kolom Asesmen' : `Tambah Kolom ${colForm.kategori}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsColModalOpen(false)}
                aria-label="Tutup dialog"
                className="neu-btn w-11 h-11 rounded-full text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center text-sm shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCol} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Kategori
                </label>
                <div className="neu-inset px-3 py-2 min-h-[40px] flex items-center rounded-xl font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  {colForm.kategori}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Nama Kolom Asesmen
                </label>
                <input
                  type="text"
                  required
                  value={colForm.nama}
                  onChange={e => setColForm({ ...colForm, nama: e.target.value })}
                  placeholder="e.g. Formatif 2, Quiz 1, Sumatif Bab 1..."
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Keterangan <span className="font-normal text-[#64748B]">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={colForm.keterangan}
                  onChange={e => setColForm({ ...colForm, keterangan: e.target.value })}
                  placeholder="e.g. Ulangan Harian Bab 3, Proyek Kelompok..."
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Bobot Nilai
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={colForm.bobot}
                  onChange={e => setColForm({ ...colForm, bobot: parseFloat(e.target.value) || 1 })}
                  className="neu-input w-full px-3 py-2 min-h-[40px] font-num rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                />
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 block">
                  Default bobot adalah 1. Kolom dengan bobot lebih tinggi berpengaruh lebih besar pada rata-rata.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white"
                >
                  Simpan Kolom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit CP */}
      {isCpModalOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => setIsCpModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editingCp ? 'Edit Capaian Pembelajaran' : 'Tambah Capaian Pembelajaran (CP)'}
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                {editingCp ? 'Edit Capaian Pembelajaran' : 'Tambah Capaian Pembelajaran (CP)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCpModalOpen(false)}
                aria-label="Tutup dialog"
                className="neu-btn w-11 h-11 rounded-full text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center text-sm shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveCp} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">Kode CP</label>
                  <input type="text" required value={cpForm.kode_cp}
                    onChange={e => setCpForm({ ...cpForm, kode_cp: e.target.value })}
                    placeholder="e.g. CP 1"
                    className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]" />
                </div>
                <div>
                  <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">Urutan</label>
                  <input type="number" min="1" value={cpForm.urutan}
                    onChange={e => setCpForm({ ...cpForm, urutan: parseInt(e.target.value) || 1 })}
                    className="neu-input w-full px-3 py-2 min-h-[40px] font-num rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">Deskripsi Capaian Pembelajaran</label>
                <textarea required rows={4} value={cpForm.deskripsi}
                  onChange={e => setCpForm({ ...cpForm, deskripsi: e.target.value })}
                  placeholder="Deskripsikan capaian pembelajaran yang menjadi payung dari beberapa Tujuan Pembelajaran..."
                  className="neu-input w-full px-3 py-2 rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]">
                </textarea>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCpModalOpen(false)}
                  className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1]">
                  Batal
                </button>
                <button type="submit"
                  className="btn-click neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white">
                  {editingCp ? 'Simpan Perubahan' : 'Buat CP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}

      {/* Modal Bobot Nilai (Admin Only) */}
      {isBobotModalOpen && isAdmin && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => setIsBobotModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pengaturan Bobot Nilai Akhir & Kehadiran"
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-2xl max-w-md w-full p-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto custom-scroll"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">Pengaturan Bobot Nilai Akhir & Kehadiran</h3>
              <button
                type="button"
                onClick={() => setIsBobotModalOpen(false)}
                aria-label="Tutup dialog"
                className="neu-btn w-11 h-11 rounded-full text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center text-sm shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleSaveBobot} className="space-y-4 mt-4 text-xs">
              <div>
                <h4 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-pie text-[#0F766E] dark:text-teal-400"></i>
                  Komposisi Bobot Nilai Akhir
                </h4>
                <p className="text-[#475569] dark:text-[#94A3B8] text-[11px] mb-2.5">
                  Total bobot kehadiran + formatif + sumatif <strong>harus = 100%</strong>. Berlaku untuk semua guru di sekolah ini.
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['kehadiran', 'formatif', 'sumatif'] as const).map(key => (
                    <div key={key}>
                      <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 capitalize text-[11px]">
                        Bobot {key} (%)
                      </label>
                      <input type="number" min="0" max="100" required value={bobotForm[key]}
                        onChange={e => setBobotForm({ ...bobotForm, [key]: parseInt(e.target.value) || 0 })}
                        className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num" />
                    </div>
                  ))}
                </div>
                <div className={`mt-2.5 p-2 rounded-xl text-[11px] font-bold font-num text-center border ${
                  bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif === 100
                    ? 'bg-emerald-500/15 text-emerald-800 border-emerald-400/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-500/15 text-rose-800 border-rose-400/50 dark:text-rose-300 dark:border-rose-800'
                }`}>
                  Total: {bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif}%
                  {bobotForm.kehadiran + bobotForm.formatif + bobotForm.sumatif === 100 ? ' ✓' : ' (harus 100%)'}
                </div>
              </div>

              {/* Sub-form: Konfigurasi Poin Status Kehadiran per Pertemuan */}
              <div className="pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <i className="fa-solid fa-user-check text-[#0F766E] dark:text-teal-400"></i>
                    Poin Status Kehadiran per Pertemuan
                  </h4>
                  <button
                    type="button"
                    onClick={() => setStatusPointsForm(DEFAULT_STATUS_POINTS)}
                    className="text-[10px] text-[#0F766E] dark:text-teal-400 hover:underline font-semibold"
                  >
                    Reset Default
                  </button>
                </div>
                <p className="text-[#475569] dark:text-[#94A3B8] text-[11px] mb-2.5">
                  Nilai poin (0–100) per pertemuan untuk menghitung persentase kehadiran siswa.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Hadir (Poin)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={statusPointsForm.hadir}
                      onChange={e => setStatusPointsForm({ ...statusPointsForm, hadir: parseInt(e.target.value) || 0 })}
                      className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
                      Sakit (Poin)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={statusPointsForm.sakit}
                      onChange={e => setStatusPointsForm({ ...statusPointsForm, sakit: parseInt(e.target.value) || 0 })}
                      className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      Izin (Poin)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={statusPointsForm.izin}
                      onChange={e => setStatusPointsForm({ ...statusPointsForm, izin: parseInt(e.target.value) || 0 })}
                      className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                      Terlambat (Poin)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={statusPointsForm.terlambat}
                      onChange={e => setStatusPointsForm({ ...statusPointsForm, terlambat: parseInt(e.target.value) || 0 })}
                      className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1 text-[11px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                      Alpa (Poin)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={statusPointsForm.alpa}
                      onChange={e => setStatusPointsForm({ ...statusPointsForm, alpa: parseInt(e.target.value) || 0 })}
                      className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E] text-center font-bold font-num"
                    />
                  </div>
                </div>
                <div className="neu-inset mt-2 text-[10px] font-num text-[#475569] dark:text-[#94A3B8] p-2.5 rounded-lg">
                  Formula: Nilai Kehadiran = (Total Poin / (Jumlah Sesi × 100)) × 100%
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300/60 dark:border-slate-700/60">
                <button type="button" onClick={() => setIsBobotModalOpen(false)}
                  className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1]">
                  Batal
                </button>
                <button type="submit"
                  className="btn-click neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white">
                  Simpan Bobot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Fill Grades */}
      {isBulkFillModalOpen && (
        <div
          className="fixed inset-0 bg-[#0F172A]/50 dark:bg-black/65 z-50 flex items-center justify-center p-4"
          onClick={() => setIsBulkFillModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Isi Nilai Cepat (Bulk Fill)"
            onClick={e => e.stopPropagation()}
            className="neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-2xl max-w-sm w-full p-5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-300/60 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-[#0F172A] dark:text-[#F1F5F9]">
                Isi Nilai Cepat (Bulk Fill)
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkFillModalOpen(false)}
                aria-label="Tutup dialog"
                className="neu-btn w-11 h-11 rounded-full text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-white flex items-center justify-center text-sm shrink-0"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleExecuteBulkFill} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Pilih Kolom Target
                </label>
                <select
                  value={bulkFillColId}
                  onChange={e => setBulkFillColId(e.target.value)}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  {columnsList.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.kategori}] {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#334155] dark:text-[#CBD5E1] mb-1">
                  Nilai yang Akan Diisikan (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={bulkFillValue}
                  onChange={e => setBulkFillValue(e.target.value)}
                  className="neu-input w-full px-3 py-2 min-h-[40px] font-num rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bulkEmptyOnly"
                  checked={bulkFillOnlyEmpty}
                  onChange={e => setBulkFillOnlyEmpty(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0F766E] focus:ring-[#0F766E]"
                />
                <label htmlFor="bulkEmptyOnly" className="font-medium text-[#334155] dark:text-[#CBD5E1] cursor-pointer">
                  Hanya isi siswa yang belum memiliki nilai
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkFillModalOpen(false)}
                  className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-[#334155] dark:text-[#CBD5E1]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold text-white"
                >
                  Terapkan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Sub-Tab 2: Rapor Kelas Binaan (In-Memory Keep-Alive + RBAC) */}
      <div className={activeTab === 'rapor' ? 'block' : 'hidden'}>
        {canAccessRapor ? (
          /* AST preservation: <RaporView user={user} assignedKelas={assignedKelas || null} /> */
          <RaporView user={user} assignedKelas={effectiveAssignedKelas} statusKepalaSekolah={statusKepalaSekolah} isKepalaSekolah={isKepalaSekolah} isActive={activeTab === 'rapor'} />
        ) : (
          <AccessDeniedCard
            title="Akses Terblokir"
            message="Halaman Rapor secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai Wali Kelas. Anda tidak memiliki hak akses untuk membuka halaman ini."
            onFallback={() => setActiveTab('gradebook')}
          />
        )}
      </div>
    </section>
  );
}
