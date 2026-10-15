'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import { generateKurikulumMerdekaDeskripsi } from './GradebookView';
import { TujuanPembelajaran, AsesmenKolom, CapaianPembelajaran } from '@/types/database';

interface RaporViewProps {
  user: any;
  assignedKelas: string | null;
}

interface StudentItem {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas: string;
  gender?: string | null;
}

interface SubjectScoreItem {
  namaMapel: string;
  nilaiAkhir: number | string | null;
  predikat: string;
  predikatBadge: string;
  deskripsiCapaian: string;
}

interface WaliKelasInfo {
  nama_guru: string;
  nip: string | null;
}

export default function RaporView({ user, assignedKelas }: RaporViewProps) {
  const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin';
  const isSuperadmin = user?.role === 'Superadmin' || user?.role === 'superadmin';
  const sekolahId = user?.sekolah_id || null;

  // View state
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'cetak-individu'>('ringkasan');
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>(assignedKelas || '');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2024/2025');
  const [activeSchoolTahunAjaran, setActiveSchoolTahunAjaran] = useState<string>('2024/2025');
  const [activeSchoolSemester, setActiveSchoolSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([
    '2023/2024',
    '2024/2025',
    '2025/2026',
    '2026/2027'
  ]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data state
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { hadir: number; izin: number; sakit: number; alpa: number }>>({});
  const [catatanWaliMap, setCatatanWaliMap] = useState<Record<string, string>>({});
  const [deepLearningMap, setDeepLearningMap] = useState<Record<string, { mindful: string; meaningful: string; joyful: string }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Real Kurikulum Merdeka Academic Pipeline
  const [activeMapels, setActiveMapels] = useState<string[]>([]);
  const [cpList, setCpList] = useState<CapaianPembelajaran[]>([]);
  const [tpList, setTpList] = useState<TujuanPembelajaran[]>([]);
  const [columnsList, setColumnsList] = useState<AsesmenKolom[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});

  // Assigned Wali Kelas Information for Print Signatures
  const [assignedWaliInfo, setAssignedWaliInfo] = useState<WaliKelasInfo | null>(null);

  // Persistence State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Debounce refs for persistent Supabase autosave
  const catatanDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dlDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const catatanRef = useRef(catatanWaliMap);
  catatanRef.current = catatanWaliMap;
  const dlRef = useRef(deepLearningMap);
  dlRef.current = deepLearningMap;
  const hasInitializedConfig = useRef(false);
  const selectedTahunAjaranRef = useRef(selectedTahunAjaran);
  selectedTahunAjaranRef.current = selectedTahunAjaran;

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      if (catatanDebounceRef.current) clearTimeout(catatanDebounceRef.current);
      if (dlDebounceRef.current) clearTimeout(dlDebounceRef.current);
    };
  }, []);

  // Synchronize non-admin homeroom teacher's selectedKelas with assignedKelas
  useEffect(() => {
    if (!isAdmin && assignedKelas && selectedKelas !== assignedKelas) {
      setSelectedKelas(assignedKelas);
    }
  }, [isAdmin, assignedKelas, selectedKelas]);

  // Fetch available classes (all active classes in school for Admin)
  useEffect(() => {
    const fetchKelasList = async () => {
      try {
        let q = supabase.from('data_siswa').select('kelas');
        if (sekolahId) q = q.eq('sekolah_id', sekolahId);
        const { data } = await q;

        let wq = supabase.from('wali_kelas').select('kelas');
        if (sekolahId) wq = wq.eq('sekolah_id', sekolahId);
        const { data: wData } = await wq;

        const allClasses = [
          ...(data || []).map((d: any) => d.kelas),
          ...(wData || []).map((w: any) => w.kelas)
        ].filter(Boolean);

        if (allClasses.length > 0) {
          const unique = Array.from(new Set(allClasses)) as string[];
          unique.sort();
          setKelasList(unique);
          if (!selectedKelas && unique.length > 0) {
            setSelectedKelas(assignedKelas || unique[0]);
          }
        } else if (assignedKelas) {
          setKelasList([assignedKelas]);
          setSelectedKelas(assignedKelas);
        }
      } catch (err) {
        console.error('Error fetching kelas list:', err);
      }
    };
    fetchKelasList();
  }, [sekolahId, assignedKelas]);

  // Fetch active school configuration from pengaturan table
  const fetchSchoolConfig = useCallback(async (forceSelect = false) => {
    try {
      let query = supabase.from('pengaturan').select('*');
      if (sekolahId) {
        query = query.eq('sekolah_id', sekolahId);
      }
      let { data, error } = await query;
      if ((!data || data.length === 0) && sekolahId) {
        const fallback = await supabase.from('pengaturan').select('*');
        if (fallback.data && fallback.data.length > 0) {
          data = fallback.data;
        }
      }
      if (!error && data && data.length > 0) {
        let activeTa = '';
        let activeSem = '';
        data.forEach((item: any) => {
          const k = item.key?.toLowerCase();
          if (k === 'tahun_ajaran' && item.value) activeTa = item.value;
          if (k === 'semester' && item.value) activeSem = item.value;
          if (item.tahun_ajaran) activeTa = item.tahun_ajaran;
          if (item.semester) activeSem = item.semester;
        });

        if (activeTa) {
          setActiveSchoolTahunAjaran(activeTa);
          if (forceSelect || !hasInitializedConfig.current) {
            setSelectedTahunAjaran(activeTa);
          }
        }
        if (activeSem === 'Ganjil' || activeSem === 'Genap') {
          setActiveSchoolSemester(activeSem as 'Ganjil' | 'Genap');
          if (forceSelect || !hasInitializedConfig.current) {
            setSelectedSemester(activeSem as 'Ganjil' | 'Genap');
          }
        }
        hasInitializedConfig.current = true;

        return {
          tahunAjaran: activeTa || null,
          semester: (activeSem === 'Ganjil' || activeSem === 'Genap') ? activeSem : null
        };
      }
    } catch (err) {
      console.warn('[RaporView] Error fetching school config:', err);
    }
    return {};
  }, [sekolahId]);

  // Dynamically build available academic year options combining active config, recorded database entries, and relevant surrounding years
  const fetchTahunAjaranOptions = useCallback(async (currentActiveTa?: string) => {
    const activeTa = currentActiveTa || activeSchoolTahunAjaran || '2024/2025';
    const yearsSet = new Set<string>();

    if (activeTa) yearsSet.add(activeTa.trim());
    if (selectedTahunAjaranRef.current) yearsSet.add(selectedTahunAjaranRef.current.trim());

    // Generate surrounding years around active configuration (supporting / or - with optional whitespace)
    const match = activeTa.match(/(\d{4})\s*[-/]\s*(\d{4})/);
    const baseYear = match ? parseInt(match[1], 10) : new Date().getFullYear();
    for (let offset = -2; offset <= 2; offset++) {
      const y = baseYear + offset;
      yearsSet.add(`${y}/${y + 1}`);
    }

    // Query recorded academic years from capaian_pembelajaran, tujuan_pembelajaran, wali_kelas, jadwal_pelajaran
    try {
      let cpQ = supabase.from('capaian_pembelajaran').select('tahun_ajaran');
      if (sekolahId) cpQ = cpQ.eq('sekolah_id', sekolahId);
      let tpQ = supabase.from('tujuan_pembelajaran').select('tahun_ajaran');
      if (sekolahId) tpQ = tpQ.eq('sekolah_id', sekolahId);
      let wkQ = supabase.from('wali_kelas').select('tahun_ajaran');
      if (sekolahId) wkQ = wkQ.eq('sekolah_id', sekolahId);
      let jpQ = supabase.from('jadwal_pelajaran').select('tahun_ajaran');
      if (sekolahId) jpQ = jpQ.eq('sekolah_id', sekolahId);

      const [cpRes, tpRes, wkRes, jpRes] = await Promise.allSettled([cpQ, tpQ, wkQ, jpQ]);

      if (cpRes.status === 'fulfilled' && cpRes.value.data) {
        cpRes.value.data.forEach((r: any) => { if (r.tahun_ajaran) yearsSet.add(r.tahun_ajaran.trim()); });
      }
      if (tpRes.status === 'fulfilled' && tpRes.value.data) {
        tpRes.value.data.forEach((r: any) => { if (r.tahun_ajaran) yearsSet.add(r.tahun_ajaran.trim()); });
      }
      if (wkRes.status === 'fulfilled' && wkRes.value.data) {
        wkRes.value.data.forEach((r: any) => { if (r.tahun_ajaran) yearsSet.add(r.tahun_ajaran.trim()); });
      }
      if (jpRes.status === 'fulfilled' && jpRes.value.data) {
        jpRes.value.data.forEach((r: any) => { if (r.tahun_ajaran) yearsSet.add(r.tahun_ajaran.trim()); });
      }
    } catch (err) {
      console.warn('[RaporView] Error querying recorded academic years:', err);
    }

    const sorted = Array.from(yearsSet).filter(Boolean).sort();
    setTahunAjaranList(sorted);
  }, [activeSchoolTahunAjaran, sekolahId]);

  // Load active school config & dynamic academic year options on mount or sekolahId change
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const conf = await fetchSchoolConfig(false);
      if (isMounted) {
        await fetchTahunAjaranOptions(conf?.tahunAjaran || undefined);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [sekolahId, fetchSchoolConfig, fetchTahunAjaranOptions]);

  // Realtime synchronization: listen to 'sipjam:config_updated' event from AdminConfigView or AppScreen, plus storage event for multi-tab sync
  useEffect(() => {
    const handleConfigSync = async (event: any) => {
      const detail = event?.detail;
      if (detail?.sekolah_id && sekolahId && detail.sekolah_id !== sekolahId) {
        return;
      }

      let newTa = detail?.tahun_ajaran || detail?.config?.tahun_ajaran;
      let newSem = detail?.semester || detail?.config?.semester;

      if (!newTa || !newSem) {
        const conf = await fetchSchoolConfig(true);
        if (conf?.tahunAjaran) newTa = conf.tahunAjaran;
        if (conf?.semester) newSem = conf.semester;
      } else {
        if (newTa) {
          setActiveSchoolTahunAjaran(newTa);
          setSelectedTahunAjaran(newTa);
        }
        if (newSem && (newSem === 'Ganjil' || newSem === 'Genap')) {
          setActiveSchoolSemester(newSem as 'Ganjil' | 'Genap');
          setSelectedSemester(newSem as 'Ganjil' | 'Genap');
        }
      }

      if (newTa) {
        await fetchTahunAjaranOptions(newTa);
      }
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'sipjam:config_sync' || e.key === 'sipjam_config_sync') {
        try {
          const detail = e.newValue ? JSON.parse(e.newValue) : null;
          if (detail) {
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
  }, [sekolahId, fetchSchoolConfig, fetchTahunAjaranOptions]);

  // Synchronize document.title for browser print jobs
  useEffect(() => {
    let originalTitle = '';
    const handleBeforePrint = () => {
      if (!document.title.startsWith('E-Rapor_')) {
        originalTitle = document.title;
      }
      if (selectedStudent) {
        const cleanTa = selectedTahunAjaran.replace(/\//g, '-');
        document.title = `E-Rapor_${selectedStudent.nama_siswa}_Kelas_${selectedKelas}_Semester_${selectedSemester}_TA_${cleanTa}`;
      }
    };
    const handleAfterPrint = () => {
      if (originalTitle) {
        document.title = originalTitle;
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [selectedStudent, selectedKelas, selectedSemester, selectedTahunAjaran]);

  // Fetch assigned Wali Kelas information for current selected class
  useEffect(() => {
    const fetchWaliKelasInfo = async () => {
      if (!selectedKelas) return;
      try {
        let wQuery = supabase
          .from('wali_kelas')
          .select('nama_guru, nip, kelas, tahun_ajaran, guru_id')
          .eq('kelas', selectedKelas);
        if (sekolahId) wQuery = wQuery.eq('sekolah_id', sekolahId);
        const { data: wList } = await wQuery;

        const matchingWali = (wList || []).find((w: any) => w.tahun_ajaran === selectedTahunAjaran) || (wList || [])[0];

        if (matchingWali && matchingWali.nama_guru) {
          let resolvedNip = matchingWali.nip && matchingWali.nip !== '-' ? matchingWali.nip : null;
          if (!resolvedNip && matchingWali.guru_id) {
            try {
              let gQuery = supabase.from('data_guru').select('nip').eq('id', matchingWali.guru_id);
              if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId);
              const { data: g } = await gQuery.maybeSingle();
              if (g?.nip && g.nip !== '-') resolvedNip = g.nip;
            } catch {}
          }
          if (!resolvedNip) {
            try {
              let gQuery = supabase.from('data_guru').select('nip').ilike('nama_guru', matchingWali.nama_guru);
              if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId);
              const { data: g } = await gQuery.maybeSingle();
              if (g?.nip && g.nip !== '-') resolvedNip = g.nip;
            } catch {}
          }

          setAssignedWaliInfo({
            nama_guru: matchingWali.nama_guru,
            nip: resolvedNip
          });
          return;
        }

        // Fallback: check data_guru for wali_kelas field if schema permits
        try {
          let gQuery = supabase
            .from('data_guru')
            .select('nama_guru, nip, wali_kelas');
          if (sekolahId) gQuery = gQuery.eq('sekolah_id', sekolahId);
          gQuery = gQuery.eq('wali_kelas', selectedKelas);
          const { data: gData } = await gQuery.maybeSingle();

          if (gData && gData.nama_guru) {
            setAssignedWaliInfo({
              nama_guru: gData.nama_guru,
              nip: gData.nip || null
            });
            return;
          }
        } catch {
          // ignore data_guru schema mismatch
        }

        // Fallback for teacher assigned to this class
        if (user && !isAdmin && assignedKelas === selectedKelas) {
          setAssignedWaliInfo({
            nama_guru: user.nama || '...........................................',
            nip: user.nip || user.username || null
          });
        } else {
          setAssignedWaliInfo(null);
        }
      } catch (err) {
        console.error('Error fetching assigned wali kelas:', err);
      }
    };
    fetchWaliKelasInfo();
  }, [selectedKelas, sekolahId, user, isAdmin, assignedKelas, selectedTahunAjaran]);

  // Fetch students, attendance, real Merdeka academic data, and notes for selected class
  const fetchClassData = useCallback(async () => {
    if (!selectedKelas) return;
    if (catatanDebounceRef.current) {
      clearTimeout(catatanDebounceRef.current);
      catatanDebounceRef.current = null;
    }
    if (dlDebounceRef.current) {
      clearTimeout(dlDebounceRef.current);
      dlDebounceRef.current = null;
    }
    setIsLoading(true);
    try {
      // 1. Fetch Students
      let sQuery = supabase
        .from('data_siswa')
        .select('id, nisn, nama_siswa, kelas, gender')
        .eq('kelas', selectedKelas);
      if (sekolahId) sQuery = sQuery.eq('sekolah_id', sekolahId);
      const { data: sData, error: sErr } = await sQuery;

      if (sErr) throw sErr;
      const sortedStudents = (sData || []).sort((a: any, b: any) =>
        (a.nama_siswa || '').localeCompare(b.nama_siswa || '')
      );
      setStudents(sortedStudents);

      if (sortedStudents.length > 0 && !selectedStudent) {
        setSelectedStudent(sortedStudents[0]);
      } else if (sortedStudents.length > 0 && selectedStudent) {
        const stillExists = sortedStudents.find((s: any) => s.nisn === selectedStudent.nisn);
        if (!stillExists) setSelectedStudent(sortedStudents[0]);
      } else if (sortedStudents.length === 0) {
        setSelectedStudent(null);
      }

      // 2. Fetch Attendance Summary
      let aQuery = supabase
        .from('absensi')
        .select('nisn, status')
        .eq('kelas', selectedKelas);
      if (sekolahId) aQuery = aQuery.eq('sekolah_id', sekolahId);
      const { data: aData } = await aQuery;

      const attRecord: Record<string, { hadir: number; izin: number; sakit: number; alpa: number }> = {};
      sortedStudents.forEach((s: any) => {
        attRecord[s.nisn] = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
      });

      if (aData) {
        aData.forEach((row: any) => {
          if (!attRecord[row.nisn]) {
            attRecord[row.nisn] = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
          }
          const st = (row.status || '').toUpperCase();
          if (st === 'H' || st === 'HADIR') attRecord[row.nisn].hadir++;
          else if (st === 'I' || st === 'IZIN') attRecord[row.nisn].izin++;
          else if (st === 'S' || st === 'SAKIT') attRecord[row.nisn].sakit++;
          else if (st === 'A' || st === 'ALPA') attRecord[row.nisn].alpa++;
        });
      }
      setAttendanceMap(attRecord);

      // 3. Fetch Active Subjects (guru_mapel & data_mapel) for this class
      let gmQuery = supabase
        .from('guru_mapel')
        .select('nama_mapel')
        .eq('kelas', selectedKelas);
      if (sekolahId) gmQuery = gmQuery.eq('sekolah_id', sekolahId);
      const { data: gmData } = await gmQuery;

      let mapels = Array.from(
        new Set((gmData || []).map((g: any) => g.nama_mapel).filter(Boolean))
      ) as string[];

      if (mapels.length === 0) {
        let dmQuery = supabase.from('data_mapel').select('nama_mata_pelajaran, nama_mapel');
        if (sekolahId) dmQuery = dmQuery.eq('sekolah_id', sekolahId);
        const { data: dmData } = await dmQuery;
        if (dmData && dmData.length > 0) {
          mapels = Array.from(
            new Set(dmData.map((d: any) => d.nama_mata_pelajaran || d.nama_mapel).filter(Boolean))
          ) as string[];
        }
      }

      if (mapels.length === 0) {
        try {
          let jpQuery = supabase.from('jadwal_pelajaran').select('mata_pelajaran').eq('kelas', selectedKelas);
          if (sekolahId) jpQuery = jpQuery.eq('sekolah_id', sekolahId);
          const { data: jpData } = await jpQuery;
          if (jpData && jpData.length > 0) {
            mapels = Array.from(new Set(jpData.map((j: any) => j.mata_pelajaran).filter(Boolean))) as string[];
          }
        } catch {
          // ignore
        }
      }

      // 4. Fetch Capaian Pembelajaran (capaian_pembelajaran)
      let cpQuery = supabase
        .from('capaian_pembelajaran')
        .select('id, kode_cp, deskripsi, nama_mapel, kelas, urutan, semester, tahun_ajaran')
        .eq('kelas', selectedKelas)
        .eq('semester', selectedSemester)
        .eq('tahun_ajaran', selectedTahunAjaran);
      if (sekolahId) cpQuery = cpQuery.eq('sekolah_id', sekolahId);
      const { data: cpData } = await cpQuery.order('urutan', { ascending: true });
      const currentCps = (cpData || []) as CapaianPembelajaran[];
      setCpList(currentCps);

      currentCps.forEach(cp => {
        if (cp.nama_mapel && !mapels.includes(cp.nama_mapel)) {
          mapels.push(cp.nama_mapel);
        }
      });

      // 5. Fetch Tujuan Pembelajaran (tujuan_pembelajaran)
      let tpQuery = supabase
        .from('tujuan_pembelajaran')
        .select('id, kode_tp, deskripsi, nama_mapel, kelas, urutan, semester, tahun_ajaran')
        .eq('kelas', selectedKelas)
        .eq('semester', selectedSemester)
        .eq('tahun_ajaran', selectedTahunAjaran);
      if (sekolahId) tpQuery = tpQuery.eq('sekolah_id', sekolahId);
      const { data: tpData } = await tpQuery.order('urutan', { ascending: true });
      const currentTps = (tpData || []) as TujuanPembelajaran[];
      setTpList(currentTps);

      currentTps.forEach(tp => {
        if (tp.nama_mapel && !mapels.includes(tp.nama_mapel)) {
          mapels.push(tp.nama_mapel);
        }
      });
      mapels.sort();
      setActiveMapels(mapels);

      // 6. Fetch Asesmen Kolom (asesmen_kolom)
      const tpIds = currentTps.map(tp => tp.id);
      let currentCols: AsesmenKolom[] = [];
      if (tpIds.length > 0) {
        let akQuery = supabase
          .from('asesmen_kolom')
          .select('id, tp_id, kategori, nama, bobot, urutan, keterangan')
          .in('tp_id', tpIds);
        if (sekolahId) akQuery = akQuery.eq('sekolah_id', sekolahId);
        const { data: akData } = await akQuery.order('urutan', { ascending: true });
        currentCols = (akData || []) as AsesmenKolom[];
      }
      setColumnsList(currentCols);

      // 7. Fetch Nilai Siswa (nilai_siswa)
      const currentGrades: Record<string, Record<string, number | null>> = {};
      let nsQuery = supabase
        .from('nilai_siswa')
        .select('asesmen_id, tp_id, nisn, nilai, mapel')
        .eq('kelas', selectedKelas);
      if (sekolahId) nsQuery = nsQuery.eq('sekolah_id', sekolahId);
      const { data: nsData } = await nsQuery;

      if (nsData) {
        nsData.forEach((row: any) => {
          if (!row.nisn) return;
          if (!currentGrades[row.nisn]) currentGrades[row.nisn] = {};
          const numVal =
            row.nilai !== null && row.nilai !== undefined && row.nilai !== ''
              ? Number(row.nilai)
              : null;
          const parsed = numVal !== null && !isNaN(numVal) ? numVal : null;
          if (row.asesmen_id) {
            currentGrades[row.nisn][row.asesmen_id] = parsed;
          }
          if (row.tp_id) {
            currentGrades[row.nisn][`tp_${row.tp_id}`] = parsed;
          }
        });
      }
      setGradesMap(currentGrades);

      // 8. Load saved teacher notes from database Supabase (pengaturan) with localStorage fallback
      const notesKey = `sipjam_rapor_catatan_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
      let loadedNotes: Record<string, string> = {};
      try {
        let nQuery = supabase.from('pengaturan').select('value').eq('key', notesKey);
        if (sekolahId) nQuery = nQuery.eq('sekolah_id', sekolahId);
        const { data: nDb } = await nQuery.maybeSingle();
        if (nDb?.value) {
          loadedNotes = JSON.parse(nDb.value);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(notesKey, nDb.value); } catch {}
          }
        }
      } catch (err) {
        console.warn('[RaporView] Cloud notes load error:', err);
      }
      if (Object.keys(loadedNotes).length === 0 && typeof window !== 'undefined') {
        const savedNotes = localStorage.getItem(notesKey);
        if (savedNotes) {
          try {
            loadedNotes = JSON.parse(savedNotes);
          } catch {
            // ignore parsing error
          }
        }
      }
      catatanRef.current = loadedNotes;
      setCatatanWaliMap(loadedNotes);

      // 9. Load saved Deep Learning observations from database Supabase (pengaturan) with localStorage fallback
      const dlKey = `sipjam_rapor_dl_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
      let loadedDl: Record<string, { mindful: string; meaningful: string; joyful: string }> = {};
      try {
        let dlQuery = supabase.from('pengaturan').select('value').eq('key', dlKey);
        if (sekolahId) dlQuery = dlQuery.eq('sekolah_id', sekolahId);
        const { data: dlDb } = await dlQuery.maybeSingle();
        if (dlDb?.value) {
          loadedDl = JSON.parse(dlDb.value);
          if (typeof window !== 'undefined') {
            try { localStorage.setItem(dlKey, dlDb.value); } catch {}
          }
        }
      } catch (err) {
        console.warn('[RaporView] Cloud deep learning load error:', err);
      }
      if (Object.keys(loadedDl).length === 0 && typeof window !== 'undefined') {
        const savedDl = localStorage.getItem(dlKey);
        if (savedDl) {
          try {
            loadedDl = JSON.parse(savedDl);
          } catch {
            // ignore parsing error
          }
        }
      }
      dlRef.current = loadedDl;
      setDeepLearningMap(loadedDl);
    } catch (err: any) {
      console.error('Error fetching class data for rapor:', err);
      showToast('Gagal memuat data kelas untuk rapor', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedKelas, sekolahId, selectedSemester, selectedTahunAjaran]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  // Save Catatan Wali to database Supabase & localStorage
  const saveCatatanToSupabase = useCallback(async (dataToSave: Record<string, string>, options: { throwOnError?: boolean } = {}) => {
    if (!selectedKelas) return false;
    setIsSaving(true);
    setSaveStatus('Menyimpan...');
    const notesKey = `sipjam_rapor_catatan_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(notesKey, JSON.stringify(dataToSave));
      } catch {
        // ignore
      }
    }
    try {
      const payload: any = {
        key: notesKey,
        value: JSON.stringify(dataToSave)
      };
      if (sekolahId) payload.sekolah_id = sekolahId;

      const conflictTarget = sekolahId ? 'sekolah_id,key' : 'key';
      const { error } = await supabase.from('pengaturan').upsert(payload, { onConflict: conflictTarget });
      if (error) throw error;
      setSaveStatus('Tersimpan di database');
      return true;
    } catch (err) {
      console.error('Error saving catatan to database:', err);
      setSaveStatus('Tersimpan lokal');
      if (options.throwOnError) throw err;
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId]);

  // Save Deep Learning observations to database Supabase & localStorage
  const saveDlToSupabase = useCallback(async (dataToSave: Record<string, { mindful: string; meaningful: string; joyful: string }>, options: { throwOnError?: boolean } = {}) => {
    if (!selectedKelas) return false;
    setIsSaving(true);
    setSaveStatus('Menyimpan...');
    const dlKey = `sipjam_rapor_dl_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(dlKey, JSON.stringify(dataToSave));
      } catch {
        // ignore
      }
    }
    try {
      const payload: any = {
        key: dlKey,
        value: JSON.stringify(dataToSave)
      };
      if (sekolahId) payload.sekolah_id = sekolahId;

      const conflictTarget = sekolahId ? 'sekolah_id,key' : 'key';
      const { error } = await supabase.from('pengaturan').upsert(payload, { onConflict: conflictTarget });
      if (error) throw error;
      setSaveStatus('Tersimpan di database');
      return true;
    } catch (err) {
      console.error('Error saving deep learning to database:', err);
      setSaveStatus('Tersimpan lokal');
      if (options.throwOnError) throw err;
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [selectedKelas, selectedSemester, selectedTahunAjaran, sekolahId]);

  // Handle Catatan Change with Debounced Auto-save
  const handleCatatanChange = (nisn: string, text: string) => {
    const updated = { ...catatanRef.current, [nisn]: text };
    catatanRef.current = updated;
    setCatatanWaliMap(updated);
    const notesKey = `sipjam_rapor_catatan_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(notesKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    if (catatanDebounceRef.current) clearTimeout(catatanDebounceRef.current);
    catatanDebounceRef.current = setTimeout(() => {
      saveCatatanToSupabase(updated);
    }, 800);
  };

  // Handle Deep Learning Change with Debounced Auto-save
  const handleDeepLearningChange = (nisn: string, field: 'mindful' | 'meaningful' | 'joyful', text: string) => {
    const prev = dlRef.current[nisn] || { mindful: '', meaningful: '', joyful: '' };
    const updatedObj = { ...prev, [field]: text };
    const updatedMap = { ...dlRef.current, [nisn]: updatedObj };
    dlRef.current = updatedMap;
    setDeepLearningMap(updatedMap);
    const dlKey = `sipjam_rapor_dl_${selectedKelas}_${selectedSemester}_${selectedTahunAjaran}`;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(dlKey, JSON.stringify(updatedMap));
      } catch {
        // ignore
      }
    }
    if (dlDebounceRef.current) clearTimeout(dlDebounceRef.current);
    dlDebounceRef.current = setTimeout(() => {
      saveDlToSupabase(updatedMap);
    }, 800);
  };

  // Manual save trigger for Admin & Wali Kelas
  const handleManualSave = async () => {
    if (!selectedKelas) {
      showToast('Peringatan', 'Pilih kelas terlebih dahulu sebelum menyimpan rapor.', 'warning');
      return;
    }
    try {
      if (catatanDebounceRef.current) clearTimeout(catatanDebounceRef.current);
      if (dlDebounceRef.current) clearTimeout(dlDebounceRef.current);
      setIsSaving(true);
      const [catatanOk, dlOk] = await Promise.all([
        saveCatatanToSupabase(catatanRef.current, { throwOnError: true }),
        saveDlToSupabase(dlRef.current, { throwOnError: true })
      ]);
      if (catatanOk && dlOk) {
        showToast('Tersimpan', 'Catatan wali & observasi deep learning berhasil disimpan ke database.', 'success');
      } else {
        showToast('Penyimpanan Lokal', 'Data disimpan di penyimpanan lokal.', 'info');
      }
    } catch (err: any) {
      showToast('Tersimpan Lokal', 'Data tersimpan di perangkat ini, namun gagal menyinkronkan ke server: ' + (err.message || 'Koneksi terputus'), 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  // Compute Kurikulum Merdeka subject scores & descriptions from real Supabase data
  const getStudentSubjectScores = useCallback(
    (student: StudentItem): SubjectScoreItem[] => {
      if (activeMapels.length === 0) return [];

      return activeMapels.map(mapel => {
        const subjectTps = tpList.filter(
          tp => (tp.nama_mapel || '').trim().toLowerCase() === mapel.trim().toLowerCase()
        );

        const tpScoresList = subjectTps.map(tp => {
          const cols = columnsList.filter(c => c.tp_id === tp.id);
          const fCols = cols.filter(c => c.kategori === 'Formatif');
          const sCols = cols.filter(c => c.kategori === 'Sumatif');

          let sumF = 0, wF = 0;
          fCols.forEach(c => {
            const val = gradesMap[student.nisn]?.[c.id];
            if (val !== null && val !== undefined && !isNaN(val)) {
              const w = c.bobot ? Number(c.bobot) : 1;
              sumF += val * w;
              wF += w;
            }
          });
          const avgF = wF > 0 ? sumF / wF : null;

          let sumS = 0, wS = 0;
          sCols.forEach(c => {
            const val = gradesMap[student.nisn]?.[c.id];
            if (val !== null && val !== undefined && !isNaN(val)) {
              const w = c.bobot ? Number(c.bobot) : 1;
              sumS += val * w;
              wS += w;
            }
          });
          const avgS = wS > 0 ? sumS / wS : null;

          let score: number | null = null;
          if (avgF !== null && avgS !== null) {
            score = parseFloat((avgF * 0.5 + avgS * 0.5).toFixed(1));
          } else if (avgS !== null) {
            score = parseFloat(avgS.toFixed(1));
          } else if (avgF !== null) {
            score = parseFloat(avgF.toFixed(1));
          } else if (gradesMap[student.nisn]?.[`tp_${tp.id}`] !== undefined) {
            score = gradesMap[student.nisn]?.[`tp_${tp.id}`];
          }

          return {
            kode: tp.kode_tp,
            deskripsi: tp.deskripsi,
            score
          };
        });

        const res = generateKurikulumMerdekaDeskripsi(student.nama_siswa, tpScoresList);

        return {
          namaMapel: mapel,
          nilaiAkhir: res.nilaiRapor,
          predikat: res.predikat,
          predikatBadge: res.predikatBadge,
          deskripsiCapaian: res.deskripsiCapaian
        };
      });
    },
    [activeMapels, tpList, columnsList, gradesMap]
  );

  // Filtered students for table search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      s => s.nama_siswa.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Overall student average across graded subjects
  const studentAverageMap = useMemo(() => {
    const map: Record<string, { avg: number | string; predikat: string }> = {};
    students.forEach(s => {
      const scores = getStudentSubjectScores(s);
      const gradedScores = scores.filter(sc => typeof sc.nilaiAkhir === 'number' && !isNaN(sc.nilaiAkhir));
      if (gradedScores.length === 0) {
        map[s.nisn] = { avg: '-', predikat: '-' };
      } else {
        const total = gradedScores.reduce((acc, curr) => acc + (curr.nilaiAkhir as number), 0);
        const avg = parseFloat((total / gradedScores.length).toFixed(1));
        let predikat = 'Perlu Bimbingan (D)';
        if (avg >= 85) predikat = 'Sangat Baik (A)';
        else if (avg >= 75) predikat = 'Baik (B)';
        else if (avg >= 65) predikat = 'Cukup (C)';
        map[s.nisn] = { avg, predikat };
      }
    });
    return map;
  }, [students, getStudentSubjectScores]);

  // Handle GPS-verified print
  const handlePrintRapor = async () => {
    setIsPrinting(true);
    const origTitle = typeof document !== 'undefined' && !document.title.startsWith('E-Rapor_') ? document.title : 'SIPJAM';
    const cleanTa = selectedTahunAjaran.replace(/\//g, '-');
    const studentName = selectedStudent?.nama_siswa || 'Siswa';
    const printDocTitle = `E-Rapor_${studentName}_Kelas_${selectedKelas}_Semester_${selectedSemester}_TA_${cleanTa}`;

    if (typeof document !== 'undefined') {
      document.title = printDocTitle;
    }

    const restoreTitle = () => {
      if (typeof document !== 'undefined') {
        document.title = origTitle || 'SIPJAM';
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('afterprint', restoreTitle);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('afterprint', restoreTitle);
    }

    try {
      const success = await triggerPrintWithGps({
        onErrorAlert: (msg) => {
          Swal.fire({
            icon: 'warning',
            title: 'Izin Lokasi Diperlukan',
            text: `${msg} Dokumen rapor resmi memerlukan penanda koordinat GPS sebagai keabsahan cetak.`,
            confirmButtonColor: '#0B4619'
          });
        }
      });
      if (!success) {
        window.print();
      }
    } catch {
      window.print();
    } finally {
      setIsPrinting(false);
      setTimeout(() => {
        if (typeof document !== 'undefined' && document.title === printDocTitle) {
          document.title = origTitle || 'SIPJAM';
        }
      }, 5000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & CONTROLS */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300 text-xl shadow-sm">
              <i className="fa-solid fa-file-lines"></i>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                E-Rapor SMA (Kurikulum Deep Learning)
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  {isAdmin || isSuperadmin ? 'Administrator' : 'Wali Kelas'}
                </span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pusat penerbitan dan pengesahan rapor siswa dengan capaian pembelajaran (CP) dan legalitas GPS.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status saving indicator */}
            {isSaving ? (
              <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-spinner fa-spin text-xs"></i>
                Menyimpan...
              </span>
            ) : saveStatus ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-xs"></i>
                {saveStatus}
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleManualSave}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 dark:text-teal-300 border border-teal-200 dark:border-teal-700/50 transition cursor-pointer flex items-center gap-1.5"
              title="Simpan Catatan & Observasi ke Database"
            >
              <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
              Simpan Rapor
            </button>

            {/* Kelas selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Kelas:</span>
              {isAdmin || isSuperadmin ? (
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
                >
                  {kelasList.map(k => (
                    <option key={k} value={k} className="dark:bg-gray-800">{k}</option>
                  ))}
                </select>
              ) : (
                <span className="font-extrabold text-teal-700 dark:text-teal-300">
                  {selectedKelas || assignedKelas || 'Tidak Ada'}
                </span>
              )}
            </div>

            {/* Semester selector */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
                className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              >
                <option value="Ganjil" className="dark:bg-gray-800">
                  Ganjil{activeSchoolSemester === 'Ganjil' ? ' (Aktif)' : ''}
                </option>
                <option value="Genap" className="dark:bg-gray-800">
                  Genap{activeSchoolSemester === 'Genap' ? ' (Aktif)' : ''}
                </option>
              </select>
            </div>

            {/* Tahun Ajaran */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">T.A.:</span>
              <select
                value={selectedTahunAjaran}
                onChange={(e) => setSelectedTahunAjaran(e.target.value)}
                className="bg-transparent font-bold text-gray-900 dark:text-white outline-none cursor-pointer"
              >
                {tahunAjaranList.map(ta => (
                  <option key={ta} value={ta} className="dark:bg-gray-800">
                    {ta}{ta === activeSchoolTahunAjaran ? ' (Aktif)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* TABS & SEARCH */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'ringkasan'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <i className="fa-solid fa-table-list"></i>
              Ringkasan Kelas ({students.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cetak-individu')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'cetak-individu'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <i className="fa-solid fa-print"></i>
              Lembar Rapor Siswa
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'ringkasan' ? (
              <div className="relative w-full sm:w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Cari siswa / NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedStudent?.nisn || ''}
                  onChange={(e) => {
                    const st = students.find(s => s.nisn === e.target.value);
                    if (st) setSelectedStudent(st);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/30 w-full sm:w-64 cursor-pointer"
                >
                  {students.map(s => (
                    <option key={s.nisn} value={s.nisn} className="dark:bg-gray-800">
                      {s.nama_siswa} ({s.nisn})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handlePrintRapor}
                  disabled={isPrinting || !selectedStudent}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  <i className="fa-solid fa-print"></i>
                  Cetak (GPS)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-teal-600 mb-3"></i>
          <p className="text-xs text-gray-500 dark:text-gray-400">Memuat data rapor Kurikulum Merdeka...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
          <i className="fa-solid fa-users-slash text-3xl text-gray-400 mb-3"></i>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Tidak Ada Siswa di Kelas Ini</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tidak ditemukan data siswa aktif untuk kelas {selectedKelas}.
          </p>
        </div>
      ) : activeTab === 'ringkasan' ? (
        /* TAB 1: RINGKASAN RAPOR KELAS */
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 w-28">NISN</th>
                  <th className="py-3 px-3 min-w-[200px]">Nama Siswa</th>
                  <th className="py-3 px-3 w-14 text-center">L/P</th>
                  <th className="py-3 px-3 w-28 text-center bg-teal-50/50 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200">
                    Rata-Rata
                  </th>
                  <th className="py-3 px-3 w-36 text-center">Predikat</th>
                  <th className="py-3 px-3 w-32 text-center" title="Hadir / Sakit / Izin / Alpa">
                    Kehadiran (H/S/I/A)
                  </th>
                  <th className="py-3 px-3 min-w-[250px]">Catatan Wali Kelas</th>
                  <th className="py-3 px-3 w-24 text-center no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredStudents.map((s, idx) => {
                  const avgData = studentAverageMap[s.nisn] || { avg: '-', predikat: '-' };
                  const att = attendanceMap[s.nisn] || { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
                  const note = catatanWaliMap[s.nisn] || '';

                  return (
                    <tr key={s.nisn} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition">
                      <td className="py-3 px-3 text-center text-gray-400 font-medium">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400 text-[11px]">{s.nisn}</td>
                      <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white">{s.nama_siswa}</td>
                      <td className="py-3 px-3 text-center text-gray-500">{s.gender || '-'}</td>
                      <td className="py-3 px-3 text-center font-black text-sm bg-teal-50/30 dark:bg-teal-950/10 text-teal-800 dark:text-teal-300">
                        {avgData.avg}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          typeof avgData.avg === 'number'
                            ? avgData.avg >= 85
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : avgData.avg >= 75
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : avgData.avg >= 65
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            : 'text-gray-400'
                        }`}>
                          {avgData.predikat}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold">
                          <span className="text-emerald-700 dark:text-emerald-400" title="Hadir">{att.hadir}H</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-blue-700 dark:text-blue-400" title="Sakit">{att.sakit}S</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-amber-700 dark:text-amber-400" title="Izin">{att.izin}I</span>
                          <span className="text-gray-300">/</span>
                          <span className="text-red-700 dark:text-red-400" title="Alpa">{att.alpa}A</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <input
                          type="text"
                          value={note}
                          placeholder="Tulis catatan wali kelas..."
                          onChange={(e) => handleCatatanChange(s.nisn, e.target.value)}
                          className="w-full text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-gray-900 outline-none"
                        />
                      </td>
                      <td className="py-3 px-3 text-center no-print">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setActiveTab('cetak-individu');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 dark:text-teal-300 transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-eye text-[10px]"></i> Rapor
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: CETAK INDIVIDU RAPOR KURIKULUM MERDEKA */
        selectedStudent ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-10 shadow-sm border border-gray-100 dark:border-gray-700 print:p-0 print:border-none print:shadow-none">
            {/* SCHOOL PRINT HEADER */}
            <PrintHeader sekolahId={sekolahId} user={user} />

            <div className="text-center my-6">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-gray-900 dark:text-white">
                LAPORAN HASIL BELAJAR (E-RAPOR SMA)
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold mt-1">
                KURIKULUM DEEP LEARNING — SEMESTER {selectedSemester.toUpperCase()} TAHUN AJARAN {selectedTahunAjaran}
              </p>
            </div>

            {/* STUDENT IDENTITY GRID */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border border-gray-200 dark:border-gray-700 p-4 rounded-xl mb-6 bg-gray-50/40 dark:bg-gray-900/40 print:bg-transparent">
              <div className="flex">
                <span className="w-28 font-bold text-gray-600 dark:text-gray-400">Nama Siswa</span>
                <span className="font-extrabold text-gray-900 dark:text-white">: {selectedStudent.nama_siswa}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-gray-600 dark:text-gray-400">Kelas</span>
                <span className="font-extrabold text-gray-900 dark:text-white">: {selectedKelas}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-gray-600 dark:text-gray-400">NISN</span>
                <span className="font-mono text-gray-800 dark:text-gray-200">: {selectedStudent.nisn}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-gray-600 dark:text-gray-400">Semester</span>
                <span className="text-gray-800 dark:text-gray-200">: {selectedSemester}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-gray-600 dark:text-gray-400">Tahun Ajaran</span>
                <span className="text-gray-800 dark:text-gray-200">: {selectedTahunAjaran}</span>
              </div>
            </div>

            {/* SUBJECT SCORES & CAPAIAN PEMBELAJARAN TABLE */}
            <div className="mb-6">
              <h3 className="text-xs font-black uppercase text-gray-900 dark:text-white mb-2">
                A. Nilai Capaian Pembelajaran
              </h3>
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden print:rounded-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center border-r border-gray-200 dark:border-gray-700">#</th>
                      <th className="py-2.5 px-3 w-56 border-r border-gray-200 dark:border-gray-700">Mata Pelajaran</th>
                      <th className="py-2.5 px-3 w-20 text-center border-r border-gray-200 dark:border-gray-700">Nilai Akhir</th>
                      <th className="py-2.5 px-3 min-w-[260px]">Capaian Kompetensi / Capaian Pembelajaran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {getStudentSubjectScores(selectedStudent).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500 italic">
                          Belum ada mata pelajaran terdaftar untuk kelas ini.
                        </td>
                      </tr>
                    ) : (
                      getStudentSubjectScores(selectedStudent).map((item, idx) => (
                        <tr key={item.namaMapel} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                          <td className="py-2.5 px-3 text-center text-gray-500 border-r border-gray-200 dark:border-gray-700">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                            {item.namaMapel}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                            {item.nilaiAkhir !== null && item.nilaiAkhir !== undefined ? item.nilaiAkhir : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {item.deskripsiCapaian}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ATTENDANCE SUMMARY & DEEP LEARNING */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:grid-cols-2">
              {/* Rekap Kehadiran */}
              <div>
                <h3 className="text-xs font-black uppercase text-gray-900 dark:text-white mb-2">
                  B. Ketidakhadiran
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-xs">
                  <div className="flex justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">1. Sakit</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {attendanceMap[selectedStudent.nisn]?.sakit || 0} hari
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">2. Izin</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {attendanceMap[selectedStudent.nisn]?.izin || 0} hari
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-3">
                    <span className="text-gray-600 dark:text-gray-400">3. Tanpa Keterangan (Alpa)</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {attendanceMap[selectedStudent.nisn]?.alpa || 0} hari
                    </span>
                  </div>
                </div>
              </div>

              {/* Observasi Kurikulum Deep Learning */}
              <div>
                <h3 className="text-xs font-black uppercase text-gray-900 dark:text-white mb-2">
                  C. Observasi Kurikulum Deep Learning
                </h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden text-xs">
                  <div className="flex flex-col py-1.5 px-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-bold text-gray-900 dark:text-white">1. Mindful Learning (Kesadaran Belajar)</span>
                    <input 
                      type="text" 
                      className="mt-1 w-full text-xs px-1 py-1 rounded bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 outline-none print:hidden focus:border-teal-500" 
                      placeholder="Catatan mindfulness..." 
                      value={deepLearningMap[selectedStudent.nisn]?.mindful || ''}
                      onChange={(e) => handleDeepLearningChange(selectedStudent.nisn, 'mindful', e.target.value)}
                    />
                    <p className="hidden print:block text-gray-800 dark:text-gray-200 italic mt-0.5 text-xs">
                      {deepLearningMap[selectedStudent.nisn]?.mindful || '-'}
                    </p>
                  </div>
                  <div className="flex flex-col py-1.5 px-3 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-bold text-gray-900 dark:text-white">2. Meaningful Learning (Pemaknaan Materi)</span>
                    <input 
                      type="text" 
                      className="mt-1 w-full text-xs px-1 py-1 rounded bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 outline-none print:hidden focus:border-teal-500" 
                      placeholder="Catatan meaningfulness..." 
                      value={deepLearningMap[selectedStudent.nisn]?.meaningful || ''}
                      onChange={(e) => handleDeepLearningChange(selectedStudent.nisn, 'meaningful', e.target.value)}
                    />
                    <p className="hidden print:block text-gray-800 dark:text-gray-200 italic mt-0.5 text-xs">
                      {deepLearningMap[selectedStudent.nisn]?.meaningful || '-'}
                    </p>
                  </div>
                  <div className="flex flex-col py-1.5 px-3">
                    <span className="font-bold text-gray-900 dark:text-white">3. Joyful Learning (Kegembiraan Belajar)</span>
                    <input 
                      type="text" 
                      className="mt-1 w-full text-xs px-1 py-1 rounded bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 outline-none print:hidden focus:border-teal-500" 
                      placeholder="Catatan joyfulness..." 
                      value={deepLearningMap[selectedStudent.nisn]?.joyful || ''}
                      onChange={(e) => handleDeepLearningChange(selectedStudent.nisn, 'joyful', e.target.value)}
                    />
                    <p className="hidden print:block text-gray-800 dark:text-gray-200 italic mt-0.5 text-xs">
                      {deepLearningMap[selectedStudent.nisn]?.joyful || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Wali Kelas */}
            <div className="mb-8">
              <h3 className="text-xs font-black uppercase text-gray-900 dark:text-white mb-2">
                D. Catatan Wali Kelas
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs min-h-[50px] bg-gray-50/30 dark:bg-gray-900/30 print:bg-transparent">
                <textarea
                  value={catatanWaliMap[selectedStudent.nisn] ?? ''}
                  onChange={(e) => handleCatatanChange(selectedStudent.nisn, e.target.value)}
                  placeholder="Tulis catatan wali kelas..."
                  rows={2}
                  className="w-full bg-transparent text-gray-800 dark:text-gray-200 leading-relaxed italic outline-none resize-none print:hidden border-none focus:ring-0 p-0 text-xs"
                />
                <p className="hidden print:block text-gray-800 dark:text-gray-200 leading-relaxed italic">
                  {catatanWaliMap[selectedStudent.nisn] ||
                    'Menunjukkan perkembangan belajar yang positif. Tingkatkan terus kedisiplinan dan pertahankan motivasi belajar untuk capaian yang lebih baik.'}
                </p>
              </div>
            </div>

            {/* PRINT SIGNATURE */}
            <PrintSignature
              leftTitle="Mengetahui,"
              leftSubtitle="Orang Tua / Wali Murid"
              leftName="..........................................."
              hideLeftNip={true}
              rightTitle={`Wali Kelas ${selectedKelas}`}
              rightName={assignedWaliInfo?.nama_guru || (!isAdmin ? user?.nama : '') || '...........................................'}
              rightNip={assignedWaliInfo?.nip ?? (!isAdmin ? user?.nip : undefined)}
              showKepalaSekolah={true}
              user={user}
              sekolahId={sekolahId || undefined}
            />

            {/* ACTION BAR AT BOTTOM */}
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center no-print">
              <button
                type="button"
                onClick={() => setActiveTab('ringkasan')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left"></i>
                Kembali ke Ringkasan
              </button>

              <button
                type="button"
                onClick={handlePrintRapor}
                disabled={isPrinting}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-teal-600 hover:bg-teal-700 text-white shadow-md inline-flex items-center gap-2 transition cursor-pointer"
              >
                <i className="fa-solid fa-print"></i>
                Cetak Rapor Resmi (GPS Verified)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <i className="fa-solid fa-user-xmark text-3xl text-gray-400 mb-3"></i>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Pilih Siswa Terlebih Dahulu</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Silakan pilih siswa dari menu dropdown di atas atau klik tombol &quot;Rapor&quot; pada tabel ringkasan.
            </p>
          </div>
        )
      )}
    </div>
  );
}
