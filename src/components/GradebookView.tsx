'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { PrintHeader, PrintSignature, PrintOrientationToggle } from './PrintHeader';
import { TujuanPembelajaran, AsesmenKolom, NilaiSiswa } from '@/types/database';

interface GradebookViewProps {
  user: any;
}

interface StudentItem {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas: string;
  gender: string | null;
  status: string | null;
}

export default function GradebookView({ user }: GradebookViewProps) {
  // Mode & Tenant Resolution
  const isAdmin = user?.role === 'Admin' || user?.role === 'Superadmin' || user?.role === 'admin';
  const [sekolahId, setSekolahId] = useState<string | null>(user?.sekolah_id || null);

  // Guru Pengampu & Sync State
  const [isGuruPengampu, setIsGuruPengampu] = useState<boolean>(false);
  const [syncedTahunAjaran, setSyncedTahunAjaran] = useState<string>('');
  const [syncedSemester, setSyncedSemester] = useState<string>('');

  // Active Filters
  const [selectedGuru, setSelectedGuru] = useState<string>(user?.nama || '');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2024/2025');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Tab View: 'tp-matrix' (Penilaian TP) | 'rekap-semester' (Rekap Rapor Semester) | 'statistik' (Analisis)
  const [activeTab, setActiveTab] = useState<'tp-matrix' | 'rekap-semester' | 'statistik'>('tp-matrix');

  // Master Data State
  const [teachersList, setTeachersList] = useState<{ id?: string; nama_guru: string; nip?: string }[]>([]);
  const [mapelList, setMapelList] = useState<{ id?: string; nama_mapel: string; kelas?: string }[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // TPs & Columns State
  const [tpList, setTpList] = useState<TujuanPembelajaran[]>([]);
  const [selectedTpId, setSelectedTpId] = useState<string | null>(null);
  const [columnsList, setColumnsList] = useState<AsesmenKolom[]>([]);
  const [allSemesterColumns, setAllSemesterColumns] = useState<Record<string, AsesmenKolom[]>>({});

  // Matrix Grades: gradesMap[nisn][asesmenId] = number | null
  const [gradesMap, setGradesMap] = useState<Record<string, Record<string, number | null>>>({});
  const [dirtyGrades, setDirtyGrades] = useState<Record<string, boolean>>({});

  // Loading & Saving States
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [isLoadingTP, setIsLoadingTP] = useState(false);
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
  });

  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<AsesmenKolom | null>(null);
  const [colForm, setColForm] = useState({
    kategori: 'Formatif' as 'Formatif' | 'Sumatif',
    nama: 'Formatif 1',
    bobot: 1,
  });

  const [isBulkFillModalOpen, setIsBulkFillModalOpen] = useState(false);
  const [bulkFillColId, setBulkFillColId] = useState<string>('');
  const [bulkFillValue, setBulkFillValue] = useState<string>('80');
  const [bulkFillOnlyEmpty, setBulkFillOnlyEmpty] = useState<boolean>(true);

  // Print Orientation
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

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
        } catch (e) {
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

  // Academic Year & Semester Sync from pengaturan table for Guru accounts
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
            if (!isAdmin) {
              setSelectedTahunAjaran(tahunVal);
              setTpForm(prev => ({ ...prev, tahun_ajaran: tahunVal }));
            }
          }
          if (semVal && (semVal === 'Ganjil' || semVal === 'Genap')) {
            setSyncedSemester(semVal);
            if (!isAdmin) {
              setSelectedSemester(semVal as 'Ganjil' | 'Genap');
              setTpForm(prev => ({ ...prev, semester: semVal }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching academic year settings in GradebookView:', err);
      }
    };

    fetchAcademicYearSettings();
  }, [sekolahId, isAdmin]);

  // 1. Fetch Teachers, Mapel, and Classes
  useEffect(() => {
    const fetchMasterAssignments = async () => {
      setIsLoadingMaster(true);
      try {
        if (isAdmin) {
          // Fetch teachers
          const { data: gData } = await supabase
            .from('data_guru')
            .select('id, nama_guru, nip')
            .order('nama_guru', { ascending: true });
          if (gData && gData.length > 0) {
            const list = gData.map(g => ({
              id: g.id,
              nama_guru: g.nama_guru || 'Tanpa Nama',
              nip: g.nip || '',
            }));
            setTeachersList(list);
            if (!selectedGuru && list.length > 0) {
              setSelectedGuru(list[0].nama_guru);
            }
          }

          // Fetch all mapel
          const { data: mData } = await supabase
            .from('data_mapel')
            .select('*')
            .order('nama_mata_pelajaran', { ascending: true });
          if (mData && mData.length > 0) {
            const formatted = mData.map(m => ({
              id: m.id,
              nama_mapel: m.nama_mata_pelajaran || '',
              kelas: m.kategori || undefined,
            }));
            setMapelList(formatted);
            if (!selectedMapel && formatted.length > 0) {
              setSelectedMapel(formatted[0].nama_mapel);
            }
          }

          // Fetch all classes
          const { data: sData } = await supabase
            .from('data_siswa')
            .select('kelas');
          if (sData) {
            const unique = Array.from(new Set(sData.map(s => s.kelas).filter(Boolean))) as string[];
            unique.sort();
            setKelasList(unique);
            if (!selectedKelas && unique.length > 0) {
              setSelectedKelas(unique[0]);
            }
          }
        } else {
          // Teacher mode: fetch teacher's assigned subjects & classes
          let query = supabase.from('guru_mapel').select('*');
          if (user?.username && user?.nama) {
            query = query.or(`nip.eq.${user.username},nama_guru.ilike.%${user.nama}%`);
          } else if (user?.username) {
            query = query.eq('nip', user.username);
          } else if (user?.nama) {
            query = query.ilike('nama_guru', `%${user.nama}%`);
          }

          let { data: gmData } = await query.order('nama_mapel', { ascending: true });

          // Fallback to jadwal_pelajaran
          if (!gmData || gmData.length === 0) {
            if (user?.nama) {
              const { data: jData } = await supabase
                .from('jadwal_pelajaran')
                .select('*')
                .ilike('nama_guru', `%${user.nama}%`);
              if (jData && jData.length > 0) {
                const uniqueMap = new Map();
                jData.forEach((j: any) => {
                  const m = j.mata_pelajaran || '-';
                  const k = j.kelas || '-';
                  const key = `${m}-${k}`;
                  if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, {
                      id: j.id,
                      nama_mapel: m,
                      kelas: k,
                      nama_guru: j.nama_guru,
                      nip: user?.username || '',
                    });
                  }
                });
                gmData = Array.from(uniqueMap.values());
              }
            }
          }

          if (gmData && gmData.length > 0) {
            const mapped = gmData.map(d => ({
              id: d.id,
              nama_mapel: d.nama_mapel,
              kelas: d.kelas,
            }));
            setMapelList(mapped);
            if (!selectedMapel && mapped.length > 0) {
              setSelectedMapel(mapped[0].nama_mapel);
            }

            const uniqueK = Array.from(new Set(gmData.map(d => d.kelas).filter(Boolean))) as string[];
            uniqueK.sort();
            setKelasList(uniqueK);
            if (!selectedKelas && uniqueK.length > 0) {
              setSelectedKelas(uniqueK[0]);
            }
          }
          if (user?.nama) {
            setSelectedGuru(user.nama);
          }
        }
      } catch (err) {
        console.error('Error fetching master data:', err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMasterAssignments();
  }, [isAdmin, user]);

  // Verify if current user is the assigned teacher (Guru Pengampu) for selectedMapel & selectedKelas
  useEffect(() => {
    const verifyGuruPengampu = async () => {
      if (isAdmin) {
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
          .select('id, nisn, nama_siswa, kelas, gender, status')
          .eq('kelas', selectedKelas)
          .order('nama_siswa', { ascending: true });

        if (sekolahId) {
          query = query.eq('sekolah_id', sekolahId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const cleanList: StudentItem[] = (data || []).map(s => ({
          id: s.id,
          nisn: s.nisn || '',
          nama_siswa: s.nama_siswa || '',
          kelas: s.kelas || selectedKelas,
          gender: s.gender,
          status: s.status,
        }));
        setStudents(cleanList);
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };

    fetchStudents();
  }, [selectedKelas, sekolahId]);

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

  // 4. Fetch Columns for Active TP (and strictly ensure 1 Diagnostik exists)
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

      let { data, error } = await query;
      if (error) throw error;

      let cols = data || [];

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

      setColumnsList(cols);
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
    if (activeTab !== 'rekap-semester' || tpList.length === 0) return;

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
  }, [activeTab, tpList]);

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
    if (isAdmin) {
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

      students.forEach(student => {
        const studentGrades = gradesMap[student.nisn] || {};
        columnsList.forEach(col => {
          const key = `${student.nisn}_${col.id}`;
          if (dirtyGrades[key]) {
            const rawVal = studentGrades[col.id];
            recordsToUpsert.push({
              sekolah_id: sekolahId || undefined,
              tp_id: selectedTpId,
              asesmen_id: col.id,
              siswa_id: student.id || null,
              nisn: student.nisn,
              nama_siswa: student.nama_siswa,
              kelas: selectedKelas,
              mapel: selectedMapel,
              nama_guru: selectedGuru || user?.nama || 'Guru',
              nilai: rawVal !== null && rawVal !== undefined && !isNaN(rawVal) ? rawVal : null,
              catatan: null,
            });
          }
        });
      });

      if (recordsToUpsert.length === 0) {
        setIsSaving(false);
        setDirtyGrades({});
        return;
      }

      const { error } = await supabase
        .from('nilai_siswa')
        .upsert(recordsToUpsert, { onConflict: 'sekolah_id,asesmen_id,nisn' });

      if (error) throw error;

      setDirtyGrades({});
      showToast('Nilai Berhasil Disimpan', `${recordsToUpsert.length} entri nilai telah tersimpan di database.`, 'success');
    } catch (err: any) {
      console.error('Error saving grades:', err);
      showToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan nilai.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- CRUD: TUJUAN PEMBELAJARAN (TP) ---
  const handleOpenAddTpModal = () => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menambah Tujuan Pembelajaran (TP).', 'warning');
      return;
    }
    setEditingTp(null);
    setTpForm({
      kode_tp: `TP ${tpList.length + 1}`,
      deskripsi: '',
      semester: selectedSemester,
      tahun_ajaran: selectedTahunAjaran,
      urutan: tpList.length + 1,
    });
    setIsTpModalOpen(true);
  };

  const handleOpenEditTpModal = (tp: TujuanPembelajaran) => {
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak mengedit Tujuan Pembelajaran (TP).', 'warning');
      return;
    }
    setEditingTp(tp);
    setTpForm({
      kode_tp: tp.kode_tp,
      deskripsi: tp.deskripsi,
      semester: tp.semester || selectedSemester,
      tahun_ajaran: tp.tahun_ajaran || selectedTahunAjaran,
      urutan: tp.urutan || 1,
    });
    setIsTpModalOpen(true);
  };

  const handleSaveTp = async (e: React.FormEvent) => {
    e.preventDefault();
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
        }

        showToast('TP Berhasil Dibuat', 'Tujuan Pembelajaran dan kolom penilaian awal telah disiapkan.', 'success');
      }

      setIsTpModalOpen(false);
      await fetchTPs();
    } catch (err: any) {
      console.error('Error saving TP:', err);
      showToast('Gagal Menyimpan TP', err.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  const handleDeleteTp = async (tp: TujuanPembelajaran) => {
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
      kategori: col.kategori as 'Formatif' | 'Sumatif',
      nama: col.nama,
      bobot: col.bobot ? Number(col.bobot) : 1,
    });
    setIsColModalOpen(true);
  };

  const handleSaveCol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin || !isGuruPengampu) {
      showToast('Akses Ditolak', 'Hanya guru pengampu mata pelajaran ini yang berhak menyimpan kolom asesmen.', 'warning');
      return;
    }
    if (!colForm.nama.trim()) {
      showToast('Validasi', 'Nama asesmen wajib diisi.', 'warning');
      return;
    }

    try {
      if (editingCol) {
        const { error } = await supabase
          .from('asesmen_kolom')
          .update({
            nama: colForm.nama.trim(),
            bobot: colForm.bobot,
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
          urutan: columnsList.length + 1,
        };

        const { error } = await supabase
          .from('asesmen_kolom')
          .insert(newCol as any);

        if (error) throw error;
        showToast('Berhasil', `Kolom ${colForm.kategori} baru berhasil ditambahkan.`, 'success');
      }

      setIsColModalOpen(false);
      if (selectedTpId) await fetchColumnsForActiveTP(selectedTpId);
    } catch (err: any) {
      console.error('Error saving column:', err);
      showToast('Gagal Menyimpan Kolom', err.message || 'Terjadi kesalahan.', 'error');
    }
  };

  const handleDeleteCol = async (col: AsesmenKolom) => {
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

    // Diagnostik
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

    // Nilai Akhir TP: Weighted 50% Formatif + 50% Sumatif, or available average
    let finalTp: number | null = null;
    if (avgF !== null && avgS !== null) {
      finalTp = parseFloat((avgF * 0.5 + avgS * 0.5).toFixed(1));
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
  const calculateStudentSemesterStats = useCallback((nisn: string) => {
    const sGrades = gradesMap[nisn] || {};
    const tpResults: Record<string, number | null> = {};
    const validTpScores: number[] = [];

    tpList.forEach(tp => {
      const cols = allSemesterColumns[tp.id] || [];
      const fCols = cols.filter(c => c.kategori === 'Formatif');
      const sCols = cols.filter(c => c.kategori === 'Sumatif');

      let sumF = 0;
      let wF = 0;
      fCols.forEach(c => {
        const val = sGrades[c.id];
        if (val !== null && val !== undefined && !isNaN(val)) {
          const w = c.bobot ? Number(c.bobot) : 1;
          sumF += val * w;
          wF += w;
        }
      });
      const avgF = wF > 0 ? sumF / wF : null;

      let sumS = 0;
      let wS = 0;
      sCols.forEach(c => {
        const val = sGrades[c.id];
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
      }

      tpResults[tp.id] = score;
      if (score !== null) validTpScores.push(score);
    });

    const semesterFinal = validTpScores.length > 0
      ? parseFloat((validTpScores.reduce((a, b) => a + b, 0) / validTpScores.length).toFixed(1))
      : null;

    let predikat = '-';
    let predikatBadge = 'text-gray-400';
    if (semesterFinal !== null) {
      if (semesterFinal >= 85) {
        predikat = 'Sangat Baik (A)';
        predikatBadge = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      } else if (semesterFinal >= 75) {
        predikat = 'Baik (B)';
        predikatBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      } else if (semesterFinal >= 65) {
        predikat = 'Cukup (C)';
        predikatBadge = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      } else {
        predikat = 'Perlu Bimbingan (D)';
        predikatBadge = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      }
    }

    return {
      tpResults,
      semesterFinal,
      predikat,
      predikatBadge,
    };
  }, [gradesMap, tpList, allSemesterColumns]);

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

    const csvRows = [headers.join(',')];

    students.forEach((s, idx) => {
      const stats = calculateStudentTpStats(s.nisn);
      const row = [
        idx + 1,
        `"${s.nisn}"`,
        `"${s.nama_siswa.replace(/"/g, '""')}"`,
        s.gender || '-',
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
    headers.push('Nilai_Rapor_Semester', 'Predikat');

    const csvRows = [headers.join(',')];

    students.forEach((s, idx) => {
      const semStats = calculateStudentSemesterStats(s.nisn);
      const row = [
        idx + 1,
        `"${s.nisn}"`,
        `"${s.nama_siswa.replace(/"/g, '""')}"`,
        s.gender || '-',
      ];

      tpList.forEach(tp => {
        const score = semStats.tpResults[tp.id];
        row.push(score !== null ? score : '');
      });

      row.push(
        semStats.semesterFinal !== null ? semStats.semesterFinal : '',
        `"${semStats.predikat}"`
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
    <section className="space-y-5 pb-12 w-full max-w-full overflow-x-auto">
      {/* Dynamic CSS for print orientation */}
      <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />

      {/* HEADER CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl shadow-inner shrink-0">
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black text-gray-900 dark:text-white">
                  Daftar Nilai (Gradebook)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  Kurikulum Merdeka
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Mode Review Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-200 mt-0.5">
                Pengelolaan Tujuan Pembelajaran (TP), Asesmen Diagnostik, Formatif, dan Sumatif dengan kalkulasi otomatis.
              </p>
            </div>
          </div>

          {!isAdmin && isGuruPengampu && (
            <div className="flex items-center gap-2 flex-wrap">
              {unsavedCount > 0 && (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800">
                  <i className="fa-solid fa-circle-exclamation mr-1.5"></i>
                  {unsavedCount} perubahan belum disimpan
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveGrades}
                disabled={isSaving || unsavedCount === 0}
                className={`btn-click px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-2 transition ${
                  unsavedCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                }`}
              >
                <i className={`fa-solid ${isSaving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
              </button>
            </div>
          )}
        </div>

        {/* FILTER CONTROLS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-5 mt-5 border-t border-gray-100 dark:border-gray-700">
          {/* Guru Filter (Admin Mode only) */}
          {isAdmin ? (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                Guru Pengampu
              </label>
              <select
                value={selectedGuru}
                onChange={e => setSelectedGuru(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {teachersList.map((g, idx) => (
                  <option key={idx} value={g.nama_guru}>
                    {g.nama_guru}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
                Guru Pengampu
              </label>
              <div className="w-full bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white truncate">
                {user?.nama || 'Guru Terpilih'}
              </div>
            </div>
          )}

          {/* Mapel Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedMapel}
              onChange={e => setSelectedMapel(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {mapelList.map((m, idx) => (
                <option key={idx} value={m.nama_mapel}>
                  {m.nama_mapel}
                </option>
              ))}
            </select>
          </div>

          {/* Kelas Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Kelas
            </label>
            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {kelasList.map((k, idx) => (
                <option key={idx} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Semester
            </label>
            <select
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          {/* Tahun Ajaran Filter */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider mb-1">
              Tahun Ajaran {!isAdmin && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal lowercase">(sinkron admin)</span>}
            </label>
            {isAdmin ? (
              <select
                value={selectedTahunAjaran}
                onChange={e => setSelectedTahunAjaran(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            ) : (
              <div className="w-full bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white flex items-center justify-between">
                <span>{selectedTahunAjaran}</span>
                <i className="fa-solid fa-lock text-[10px] text-gray-400" title="Terkunci sesuai pengaturan admin"></i>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIEW TABS NAVIGATION */}
      <div className="flex items-center justify-between gap-3 flex-wrap no-print">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-x-auto custom-scroll max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('tp-matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'tp-matrix'
                ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-table-cells text-xs"></i>
            Penilaian TP (Matriks)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rekap-semester')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'rekap-semester'
                ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-book-open text-xs"></i>
            Rekap Nilai Rapor Semester
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'statistik'
                ? 'bg-white dark:bg-gray-900 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white'
            }`}
          >
            <i className="fa-solid fa-chart-pie text-xs"></i>
            Statistik & Analisis
          </button>
        </div>

        {/* Action Buttons: Export & Print */}
        <div className="flex items-center gap-2">
          {!isAdmin && activeTab === 'tp-matrix' && (
            <button
              type="button"
              onClick={exportTpToCsv}
              className="btn-click bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-excel"></i> Export CSV
            </button>
          )}
          {!isAdmin && activeTab === 'rekap-semester' && (
            <button
              type="button"
              onClick={exportSemesterToCsv}
              className="btn-click bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-file-excel"></i> Export Rapor CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-click bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1.5"
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
          {currentTP && activeTab === 'tp-matrix' && (
            <div className="text-xs italic text-gray-700 mt-0.5">
              Tujuan Pembelajaran ({currentTP.kode_tp}): {currentTP.deskripsi}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENILAIAN PER TP (SPREADSHEET MATRIX)                              */}
      {/* ========================================================================= */}
      {activeTab === 'tp-matrix' && (
        <div className="space-y-4">
          {/* TP Selector Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Tujuan Pembelajaran:
                </span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-lg">
                  {tpList.length} TP Tersedia
                </span>
              </div>
              {!isAdmin && isGuruPengampu && (
                <button
                  type="button"
                  onClick={handleOpenAddTpModal}
                  className="btn-click bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-xs"></i> Tambah TP Baru
                </button>
              )}
            </div>

            {/* Horizontal TP Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scroll">
              {tpList.length === 0 ? (
                <div className="text-xs italic text-gray-400 dark:text-gray-500 py-2">
                  Belum ada Tujuan Pembelajaran (TP) untuk mata pelajaran dan kelas ini. Klik "Tambah TP Baru".
                </div>
              ) : (
                tpList.map(tp => (
                  <div
                    key={tp.id}
                    onClick={() => setSelectedTpId(tp.id)}
                    className={`cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shrink-0 ${
                      selectedTpId === tp.id
                        ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-700 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{tp.kode_tp}</span>
                    <span className="font-normal text-[11px] max-w-[140px] truncate text-gray-500 dark:text-gray-400">
                      {tp.deskripsi}
                    </span>
                    {selectedTpId === tp.id && !isAdmin && isGuruPengampu && (
                      <div className="flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTpModal(tp);
                          }}
                          className="w-5 h-5 rounded-md hover:bg-teal-100 dark:hover:bg-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-300"
                          title="Edit TP"
                        >
                          <i className="fa-solid fa-pen text-[10px]"></i>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTp(tp);
                          }}
                          className="w-5 h-5 rounded-md hover:bg-red-100 dark:hover:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400"
                          title="Hapus TP"
                        >
                          <i className="fa-solid fa-trash text-[10px]"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Active TP Description Banner */}
            {currentTP && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/60 flex items-start justify-between gap-3 text-xs">
                <div>
                  <span className="font-black text-gray-900 dark:text-white mr-2">
                    {currentTP.kode_tp}:
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {currentTP.deskripsi}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                    Urutan #{currentTP.urutan}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Assessment Columns Toolbar & Student Search */}
          {currentTP && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  Kelola Kolom:
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <i className="fa-solid fa-check text-[10px]"></i> 1 Diagnostik (Wajib)
                </span>
                {!isAdmin && isGuruPengampu && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenAddColModal('Formatif')}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Formatif
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddColModal('Sumatif')}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-plus text-[10px]"></i> + Kolom Sumatif
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBulkFill()}
                      className="btn-click px-3 py-1 rounded-lg text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 flex items-center gap-1.5 transition"
                    >
                      <i className="fa-solid fa-bolt text-[10px]"></i> Isi Nilai Cepat
                    </button>
                  </>
                )}
              </div>

              <div className="w-full md:w-64">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Cari nama atau NISN..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SPREADSHEET MATRIX TABLE */}
          {!currentTP ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="w-14 h-14 mx-auto rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mb-3">
                <i className="fa-solid fa-book-bookmark"></i>
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                Belum Ada Tujuan Pembelajaran Terpilih
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
                Silakan buat Tujuan Pembelajaran (TP) terlebih dahulu untuk memulai pengisian asesmen Diagnostik, Formatif, dan Sumatif.
              </p>
              {!isAdmin && isGuruPengampu && (
                <button
                  type="button"
                  onClick={handleOpenAddTpModal}
                  className="btn-click bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i> Tambah TP Sekarang
                </button>
              )}
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <i className="fa-solid fa-users-slash text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tidak ada data siswa ditemukan untuk kelas <strong>{selectedKelas}</strong>.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll relative print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  {/* Table Header */}
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                    {/* Upper Category Row */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-[11px] font-black uppercase tracking-wider">
                      <th colSpan={4} className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-gray-100/70 dark:bg-gray-800/80">
                        Identitas Siswa
                      </th>
                      <th className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-blue-50/70 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                        Diagnostik (Baseline)
                      </th>
                      <th
                        colSpan={Math.max(formatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                      >
                        Asesmen Formatif (Proses)
                      </th>
                      <th
                        colSpan={Math.max(sumatifCols.length, 1)}
                        className="py-2.5 px-3 border-r border-gray-200 dark:border-gray-700 text-center bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300"
                      >
                        Asesmen Sumatif (Lingkup Materi)
                      </th>
                      <th colSpan={4} className="py-2.5 px-3 text-center bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                        Kalkulasi Kurikulum Merdeka
                      </th>
                    </tr>

                    {/* Column Headers */}
                    <tr className="border-b border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                      <th className="py-2 px-2.5 w-10 text-center">#</th>
                      <th className="py-2 px-2.5 w-24">NISN</th>
                      <th className="py-2 px-3 min-w-[180px]">Nama Siswa</th>
                      <th className="py-2 px-2 w-12 text-center border-r border-gray-200 dark:border-gray-700">L/P</th>

                      {/* Diagnostik Column */}
                      {diagnostikCol && (
                        <th className="py-2 px-2 w-28 text-center bg-blue-50/30 dark:bg-blue-950/20 border-r border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-center gap-1">
                            <span>{diagnostikCol.nama}</span>
                            <span className="text-[9px] px-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded">
                              1x
                            </span>
                          </div>
                        </th>
                      )}

                      {/* Formatif Columns */}
                      {formatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-gray-400 border-r border-gray-200 dark:border-gray-700">
                          Belum ada formatif
                        </th>
                      ) : (
                        formatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-emerald-50/30 dark:bg-emerald-950/20 border-r border-gray-200 dark:border-gray-700 group"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate max-w-[70px]">{col.nama}</span>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-0.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditColModal(col)}
                                    className="w-4 h-4 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    title="Ubah Nama/Bobot"
                                  >
                                    <i className="fa-solid fa-pen text-[9px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(col)}
                                    className="w-4 h-4 rounded text-red-400 hover:text-red-600"
                                    title="Hapus Kolom"
                                  >
                                    <i className="fa-solid fa-trash text-[9px]"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Sumatif Columns */}
                      {sumatifCols.length === 0 ? (
                        <th className="py-2 px-3 w-28 text-center italic text-gray-400 border-r border-gray-200 dark:border-gray-700">
                          Belum ada sumatif
                        </th>
                      ) : (
                        sumatifCols.map(col => (
                          <th
                            key={col.id}
                            className="py-2 px-2 w-28 text-center bg-purple-50/30 dark:bg-purple-950/20 border-r border-gray-200 dark:border-gray-700 group"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span className="truncate max-w-[70px]">{col.nama}</span>
                              {!isAdmin && isGuruPengampu && (
                                <div className="flex items-center gap-0.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditColModal(col)}
                                    className="w-4 h-4 rounded text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    title="Ubah Nama/Bobot"
                                  >
                                    <i className="fa-solid fa-pen text-[9px]"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(col)}
                                    className="w-4 h-4 rounded text-red-400 hover:text-red-600"
                                    title="Hapus Kolom"
                                  >
                                    <i className="fa-solid fa-trash text-[9px]"></i>
                                  </button>
                                </div>
                              )}
                            </div>
                          </th>
                        ))
                      )}

                      {/* Summary Columns */}
                      <th className="py-2 px-2 w-24 text-center bg-amber-50/30 dark:bg-amber-950/20">Rata Formatif</th>
                      <th className="py-2 px-2 w-24 text-center bg-amber-50/30 dark:bg-amber-950/20">Rata Sumatif</th>
                      <th className="py-2 px-2 w-28 text-center font-black bg-amber-100/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200">
                        Nilai Akhir TP
                      </th>
                      <th className="py-2 px-2.5 w-32 text-center">Predikat</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentTpStats(student.nisn);
                      const sGrades = gradesMap[student.nisn] || {};

                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          {/* Student Info */}
                          <td className="py-2 px-2.5 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                            {student.nisn}
                          </td>
                          <td className="py-2 px-3 font-semibold text-gray-900 dark:text-white">
                            {student.nama_siswa}
                          </td>
                          <td className="py-2 px-2 text-center text-gray-500 border-r border-gray-200 dark:border-gray-700">
                            {student.gender || '-'}
                          </td>

                          {/* Diagnostik Cell */}
                          {diagnostikCol && (
                            <td className="p-1 text-center bg-blue-50/10 dark:bg-blue-950/10 border-r border-gray-200 dark:border-gray-700">
                              {isAdmin || !isGuruPengampu ? (
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {sGrades[diagnostikCol.id] ?? '-'}
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={sGrades[diagnostikCol.id] ?? ''}
                                  onChange={e => handleGradeChange(student.nisn, diagnostikCol.id, e.target.value)}
                                  placeholder="-"
                                  className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    dirtyGrades[`${student.nisn}_${diagnostikCol.id}`]
                                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                  }`}
                                />
                              )}
                            </td>
                          )}

                          {/* Formatif Cells */}
                          {formatifCols.map(col => {
                            const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                            return (
                              <td
                                key={col.id}
                                className="p-1 text-center bg-emerald-50/10 dark:bg-emerald-950/10 border-r border-gray-200 dark:border-gray-700"
                              >
                                {isAdmin || !isGuruPengampu ? (
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {sGrades[col.id] ?? '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={sGrades[col.id] ?? ''}
                                    onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                    placeholder="-"
                                    className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                      isDirty
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                    }`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {/* Sumatif Cells */}
                          {sumatifCols.map(col => {
                            const isDirty = dirtyGrades[`${student.nisn}_${col.id}`];
                            return (
                              <td
                                key={col.id}
                                className="p-1 text-center bg-purple-50/10 dark:bg-purple-950/10 border-r border-gray-200 dark:border-gray-700"
                              >
                                {isAdmin || !isGuruPengampu ? (
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    {sGrades[col.id] ?? '-'}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={sGrades[col.id] ?? ''}
                                    onChange={e => handleGradeChange(student.nisn, col.id, e.target.value)}
                                    placeholder="-"
                                    className={`w-16 mx-auto text-center py-1 px-1 rounded-lg border text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                      isDirty
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                                    }`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {/* Calculated Summary Cells */}
                          <td className="py-2 px-2 text-center font-bold text-gray-700 dark:text-gray-300">
                            {stats.avgFormatif !== null ? stats.avgFormatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-gray-700 dark:text-gray-300">
                            {stats.avgSumatif !== null ? stats.avgSumatif : '-'}
                          </td>
                          <td className="py-2 px-2 text-center font-black text-sm bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                            {stats.nilaiAkhir !== null ? stats.nilaiAkhir : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${stats.predikatClass}`}>
                                {stats.predikat}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Table Footer: Class Average */}
                  <tfoot className="bg-gray-100/90 dark:bg-gray-900 font-extrabold border-t-2 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right border-r border-gray-200 dark:border-gray-700">
                        Rata-rata Kelas:
                      </td>
                      {diagnostikCol && (
                        <td className="py-2.5 px-2 text-center text-blue-700 dark:text-blue-300 border-r border-gray-200 dark:border-gray-700">
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
                      {formatifCols.map(col => (
                        <td key={col.id} className="py-2.5 px-2 text-center text-emerald-700 dark:text-emerald-300 border-r border-gray-200 dark:border-gray-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[col.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      ))}
                      {sumatifCols.map(col => (
                        <td key={col.id} className="py-2.5 px-2 text-center text-purple-700 dark:text-purple-300 border-r border-gray-200 dark:border-gray-700">
                          {(() => {
                            let sum = 0, c = 0;
                            students.forEach(s => {
                              const v = gradesMap[s.nisn]?.[col.id];
                              if (v !== null && v !== undefined && !isNaN(v)) { sum += v; c++; }
                            });
                            return c > 0 ? (sum / c).toFixed(1) : '-';
                          })()}
                        </td>
                      ))}
                      <td className="py-2.5 px-2 text-center text-gray-700 dark:text-gray-300">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgFormatif !== null) { sum += stats.avgFormatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-700 dark:text-gray-300">
                        {(() => {
                          let sum = 0, c = 0;
                          students.forEach(s => {
                            const stats = calculateStudentTpStats(s.nisn);
                            if (stats.avgSumatif !== null) { sum += stats.avgSumatif; c++; }
                          });
                          return c > 0 ? (sum / c).toFixed(1) : '-';
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center text-sm font-black text-amber-800 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/40">
                        {classAnalytics.classAvg > 0 ? classAnalytics.classAvg : '-'}
                      </td>
                      <td className="py-2.5 px-2.5 text-center text-[11px]">
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
            leftNip={user?.nip}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAP NILAI RAPOR SEMESTER (OVERVIEW ALL TPS)                      */}
      {/* ========================================================================= */}
      {activeTab === 'rekap-semester' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 no-print">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Rekapitulasi Nilai Akhir Semester (Rapor)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nilai Akhir dari setiap Tujuan Pembelajaran (TP) dikompilasi untuk menghasilkan Nilai Rapor Semester.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
                  Total {tpList.length} TP Terkompilasi
                </span>
              </div>
            </div>
          </div>

          {tpList.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
              <i className="fa-solid fa-folder-open text-3xl text-gray-400 mb-2"></i>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Belum ada TP yang dibuat untuk semester ini.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden print:overflow-visible print:max-h-none print:border-none print:shadow-none">
              <div className="overflow-x-auto max-h-[600px] custom-scroll print:overflow-visible print:max-h-none">
                <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                    <tr className="border-b border-gray-200 dark:border-gray-700 font-bold text-[11px]">
                      <th className="py-2.5 px-2.5 w-10 text-center">#</th>
                      <th className="py-2.5 px-2.5 w-24">NISN</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Nama Siswa</th>
                      <th className="py-2.5 px-2 w-12 text-center border-r border-gray-200 dark:border-gray-700">L/P</th>

                      {/* Header per TP */}
                      {tpList.map(tp => (
                        <th
                          key={tp.id}
                          className="py-2.5 px-3 w-28 text-center bg-teal-50/40 dark:bg-teal-950/20 border-r border-gray-200 dark:border-gray-700"
                        >
                          <div className="font-extrabold text-teal-800 dark:text-teal-300">{tp.kode_tp}</div>
                          <div className="font-normal text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-[90px] mx-auto">
                            {tp.deskripsi}
                          </div>
                        </th>
                      ))}

                      <th className="py-2.5 px-3 w-32 text-center font-black bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-r border-gray-200 dark:border-gray-700">
                        Nilai Rapor
                      </th>
                      <th className="py-2.5 px-3 w-36 text-center">Predikat Semester</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredStudents.map((student, idx) => {
                      const stats = calculateStudentSemesterStats(student.nisn);
                      return (
                        <tr
                          key={student.nisn}
                          className="hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-2.5 text-center text-gray-500 font-medium">{idx + 1}</td>
                          <td className="py-2.5 px-2.5 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                            {student.nisn}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">
                            {student.nama_siswa}
                          </td>
                          <td className="py-2.5 px-2 text-center text-gray-500 border-r border-gray-200 dark:border-gray-700">
                            {student.gender || '-'}
                          </td>

                          {/* Nilai per TP */}
                          {tpList.map(tp => {
                            const score = stats.tpResults[tp.id];
                            return (
                              <td
                                key={tp.id}
                                className="py-2.5 px-3 text-center font-bold border-r border-gray-200 dark:border-gray-700"
                              >
                                {score !== null ? (
                                  <span
                                    className={
                                      score >= 75
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }
                                  >
                                    {score}
                                  </span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600">-</span>
                                )}
                              </td>
                            );
                          })}

                          {/* Nilai Rapor Semester */}
                          <td className="py-2.5 px-3 text-center font-black text-sm bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-r border-gray-200 dark:border-gray-700">
                            {stats.semesterFinal !== null ? stats.semesterFinal : '-'}
                          </td>

                          {/* Predikat */}
                          <td className="py-2.5 px-3 text-center">
                            {stats.predikat !== '-' ? (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${stats.predikatBadge}`}>
                                {stats.predikat}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STATISTIK & ANALISIS KELAS                                         */}
      {/* ========================================================================= */}
      {activeTab === 'statistik' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Rata-rata Kelas</span>
                <span className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-chart-line"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {classAnalytics.classAvg}
                </span>
                <span className="text-xs text-gray-500 font-semibold">/ 100</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Dari {classAnalytics.gradedStudents} siswa dinilai
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Ketuntasan (KKTP ≥ 75)</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-check-double"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {classAnalytics.tuntasPct}%
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  ({classAnalytics.tuntasCount} siswa)
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Kriteria Ketercapaian Tujuan Pembelajaran
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Nilai Tertinggi</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-trophy"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {classAnalytics.highestScore}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Skor tertinggi di TP ini</p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Nilai Terendah</span>
                <span className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-arrow-down-wide-short"></i>
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-red-600 dark:text-red-400">
                  {classAnalytics.lowestScore}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Skor terendah di TP ini</p>
            </div>
          </div>

          {/* Grade Distribution Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">
              Distribusi Capaian Kompetensi Kurikulum Merdeka
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-green-800 dark:text-green-300">
                  <span>Sangat Baik (A)</span>
                  <span>85 - 100</span>
                </div>
                <div className="mt-2 text-2xl font-black text-green-700 dark:text-green-400">
                  {classAnalytics.distribution.a}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.a / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-blue-800 dark:text-blue-300">
                  <span>Baik (B)</span>
                  <span>75 - 84</span>
                </div>
                <div className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-400">
                  {classAnalytics.distribution.b}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.b / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-yellow-800 dark:text-yellow-300">
                  <span>Cukup (C)</span>
                  <span>65 - 74</span>
                </div>
                <div className="mt-2 text-2xl font-black text-yellow-700 dark:text-yellow-400">
                  {classAnalytics.distribution.c}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.c / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                <div className="flex justify-between items-center text-xs font-bold text-red-800 dark:text-red-300">
                  <span>Perlu Bimbingan (D)</span>
                  <span>&lt; 65</span>
                </div>
                <div className="mt-2 text-2xl font-black text-red-700 dark:text-red-400">
                  {classAnalytics.distribution.d}{' '}
                  <span className="text-xs font-medium text-gray-500">
                    ({classAnalytics.gradedStudents > 0 ? Math.round((classAnalytics.distribution.d / classAnalytics.gradedStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS SECTION                                                            */}
      {/* ========================================================================= */}

      {/* Modal Add / Edit TP */}
      {isTpModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                {editingTp ? 'Edit Tujuan Pembelajaran' : 'Tambah Tujuan Pembelajaran (TP)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTpModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTp} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Kode TP
                  </label>
                  <input
                    type="text"
                    required
                    value={tpForm.kode_tp}
                    onChange={e => setTpForm({ ...tpForm, kode_tp: e.target.value })}
                    placeholder="e.g. TP 1"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Urutan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tpForm.urutan}
                    onChange={e => setTpForm({ ...tpForm, urutan: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Deskripsi Tujuan Pembelajaran
                </label>
                <textarea
                  required
                  rows={3}
                  value={tpForm.deskripsi}
                  onChange={e => setTpForm({ ...tpForm, deskripsi: e.target.value })}
                  placeholder="Deskripsikan kompetensi atau materi pembelajaran yang ingin dicapai..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={tpForm.semester}
                    onChange={e => setTpForm({ ...tpForm, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Tahun Ajaran {!isAdmin && <span className="text-[10px] text-teal-600 font-normal">(Sinkron Admin)</span>}
                  </label>
                  <input
                    type="text"
                    value={tpForm.tahun_ajaran}
                    onChange={e => !isAdmin ? null : setTpForm({ ...tpForm, tahun_ajaran: e.target.value })}
                    readOnly={!isAdmin}
                    className={`w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none ${
                      !isAdmin
                        ? 'bg-gray-100 dark:bg-gray-800/80 cursor-not-allowed text-gray-500'
                        : 'bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-teal-500'
                    }`}
                  />
                </div>
              </div>

              {!editingTp && (
                <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-800 dark:text-teal-300">
                  <i className="fa-solid fa-info-circle mr-1"></i> Kolom <strong>Diagnostik</strong>, <strong>Formatif 1</strong>, dan <strong>Sumatif 1</strong> akan otomatis dibuatkan.
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTpModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                {editingCol ? 'Edit Kolom Asesmen' : `Tambah Kolom ${colForm.kategori}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsColModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCol} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Kategori
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-white">
                  {colForm.kategori}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nama Kolom Asesmen
                </label>
                <input
                  type="text"
                  required
                  value={colForm.nama}
                  onChange={e => setColForm({ ...colForm, nama: e.target.value })}
                  placeholder="e.g. Formatif 2, Quiz 1, Sumatif Bab 1..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Bobot Nilai
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={colForm.bobot}
                  onChange={e => setColForm({ ...colForm, bobot: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Default bobot adalah 1. Kolom dengan bobot lebih tinggi berpengaruh lebih besar pada rata-rata.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsColModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                >
                  Simpan Kolom
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Bulk Fill Grades */}
      {isBulkFillModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">
                Isi Nilai Cepat (Bulk Fill)
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkFillModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center justify-center text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleExecuteBulkFill} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Pilih Kolom Target
                </label>
                <select
                  value={bulkFillColId}
                  onChange={e => setBulkFillColId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  {columnsList.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.kategori}] {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bulkEmptyOnly"
                  checked={bulkFillOnlyEmpty}
                  onChange={e => setBulkFillOnlyEmpty(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="bulkEmptyOnly" className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Hanya isi siswa yang belum memiliki nilai
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkFillModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-click px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md"
                >
                  Terapkan Nilai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
