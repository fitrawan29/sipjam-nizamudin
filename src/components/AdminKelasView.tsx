'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { isMasterDataModificationAllowed, importMasterDataFromCsv, getStorageCache, setStorageCache } from '@/lib/dataIntegrityGuard';
import NaikKelasModal from './NaikKelasModal';
import { AppUser } from '@/types/user';
import { filterStudentsBySubject, isStudentEligibleForSubject } from '@/lib/agamaFilter';
import { downloadMasterDataCsv } from '@/lib/csvExport';

export interface AdminKelasViewProps {
  user: AppUser | any;
}

export interface StudentItem {
  id: string;
  nisn: string | null;
  nama_siswa: string;
  kelas: string | null;
  gender: string | null;
  status: string | null;
  no_hp_ortu?: string | null;
  sekolah_id?: string;
  agama?: string | null;
}

export interface WaliKelasItem {
  id?: string;
  kelas: string;
  nama_guru: string;
  nip?: string | null;
  tahun_ajaran?: string | null;
  sekolah_id?: string;
}

export interface ClassDirectoryItem {
  id: string;
  nama_kelas: string;
  tingkat: '10' | '11' | '12' | 'Lainnya';
  jurusan?: string | null;
  wali_kelas?: WaliKelasItem | null;
  totalSiswa: number;
  siswaLaki: number;
  siswaPerempuan: number;
  students: StudentItem[];
  isDbRecord?: boolean;
}

export type TingkatFilter = 'ALL' | '10' | '11' | '12';

/**
 * Normalizes and infers school grade (tingkat) from class name.
 */
export function parseTingkat(nama: string): '10' | '11' | '12' | 'Lainnya' {
  const n = (nama || '').trim();
  if (/\b(xii|12)\b/i.test(n)) return '12';
  if (/\b(xi|11)\b/i.test(n)) return '11';
  if (/\b(x|10)\b/i.test(n)) return '10';
  return 'Lainnya';
}

/**
 * Determines whether a student is without a designated class.
 */
export function isUnassignedClass(k?: string | null): boolean {
  if (!k) return true;
  const clean = k.trim().toLowerCase();
  return !clean || clean === '-' || clean === 'tanpa kelas' || clean === 'belum ada';
}

export default function AdminKelasView({ user }: AdminKelasViewProps) {
  const isMountedRef = useRef<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Milestone 3 (R4) - Upload Progress & Diagnostic State
  const [isClassUploading, setIsClassUploading] = useState<boolean>(false);
  const [classUploadProgress, setClassUploadProgress] = useState<number>(0);
  const [classUploadStage, setClassUploadStage] = useState<string>('');
  const [classBatchInfo, setClassBatchInfo] = useState<{
    currentBatch: number;
    totalBatches: number;
    processedRows: number;
    totalRows: number;
  } | null>(null);

  const escapeHtml = (str?: string) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const showMasterDataDiagnosticModal = (err: any) => {
    const detail = err?.detail || (typeof err === 'object' && err?.message ? {
      message: err.message,
      row: err.message.match(/Baris (\d+)/)?.[1],
      column: err.message.match(/Kolom "([^"]+)"/)?.[1] || err.message.match(/kolom '([^']+)'/)?.[1],
      remediation: 'Periksa kembali berkas CSV Anda sesuai format template dan pastikan seluruh relasi master data sudah terdaftar.'
    } : { message: String(err) });

    Swal.fire({
      icon: 'error',
      title: 'Gagal Mengunggah Data Kelas',
      html: `
        <div class="text-left text-xs space-y-3 text-gray-700 dark:text-gray-300">
          <div class="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-xl">
            <div class="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/60 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <i class="fa-solid fa-triangle-exclamation text-base"></i>
            </div>
            <div>
              <h4 class="font-bold text-red-700 dark:text-red-300 text-xs">Kesalahan Validasi Unggahan</h4>
              <p class="text-[11px] text-red-600 dark:text-red-400 font-mono">
                ${detail.code ? `Kode Error: ${detail.code}` : 'Format/Relasi Data Tidak Valid'}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px]">
            ${detail.row ? `
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <span class="text-gray-400 text-[10px] block uppercase font-semibold">Lokasi Baris</span>
                <span class="font-bold text-red-600 dark:text-red-400 font-mono">Baris ${detail.row}</span>
              </div>
            ` : ''}
            ${detail.column ? `
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <span class="text-gray-400 text-[10px] block uppercase font-semibold">Kolom Terkait</span>
                <span class="font-bold text-purple-600 dark:text-purple-400 font-mono">${escapeHtml(detail.column)}</span>
              </div>
            ` : ''}
            ${detail.receivedValue ? `
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                <span class="text-gray-400 text-[10px] block uppercase font-semibold">Nilai Diterima</span>
                <span class="font-semibold text-rose-600 dark:text-rose-400 font-mono text-[10.5px]">${escapeHtml(detail.receivedValue)}</span>
              </div>
            ` : ''}
            ${detail.referenceTable ? `
              <div class="bg-gray-50 dark:bg-gray-800/60 p-2 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2">
                <span class="text-gray-400 text-[10px] block uppercase font-semibold">Tabel Referensi</span>
                <span class="font-semibold text-indigo-600 dark:text-indigo-400 font-mono text-[10.5px]">${escapeHtml(detail.referenceTable)}</span>
              </div>
            ` : ''}
          </div>

          <div class="p-3 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl font-mono text-[11px] text-red-800 dark:text-red-300 break-words">
            ${escapeHtml(detail.message)}
          </div>

          <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
            <div class="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 text-[11px]">
              <i class="fa-solid fa-lightbulb text-amber-500"></i> Saran Perbaikan:
            </div>
            <p class="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              ${escapeHtml(detail.remediation || 'Periksa berkas CSV Anda sesuai panduan template resmi, pastikan seluruh data master terkait telah dibuat.')}
            </p>
          </div>
        </div>
      `,
      confirmButtonText: 'Tutup & Perbaiki',
      confirmButtonColor: '#7C3AED'
    });
  };

  // Primary data pools
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [waliKelasList, setWaliKelasList] = useState<WaliKelasItem[]>([]);
  const [dbClasses, setDbClasses] = useState<{ id: string; nama_kelas: string; tingkat?: string; jurusan?: string }[]>([]);
  const [customClasses, setCustomClasses] = useState<string[]>(() => {
    if (typeof window !== 'undefined' && user?.sekolah_id) {
      try {
        const saved = localStorage.getItem(`sipjam_custom_classes_${user.sekolah_id}`);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });
  const [customClassesMeta, setCustomClassesMeta] = useState<Record<string, { tingkat?: string; jurusan?: string | null }>>(() => {
    if (typeof window !== 'undefined' && user?.sekolah_id) {
      try {
        const saved = localStorage.getItem(`sipjam_custom_classes_meta_${user.sekolah_id}`);
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return {};
  });

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTingkat, setFilterTingkat] = useState<TingkatFilter>('ALL');

  // Centralized Allocation Workspace Slide-over Drawer
  const [selectedClassForWorkspace, setSelectedClassForWorkspace] = useState<ClassDirectoryItem | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<'roster' | 'inbound'>('roster');
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [rosterMapelFilter, setRosterMapelFilter] = useState<string>('ALL');
  const [selectedRosterStudentIds, setSelectedRosterStudentIds] = useState<string[]>([]);
  const [targetTransferClass, setTargetTransferClass] = useState<string>('');

  // Inbound Allocation tab states inside workspace drawer
  const [inboundSourceClass, setInboundSourceClass] = useState<string>('UNASSIGNED');
  const [inboundSearch, setInboundSearch] = useState<string>('');
  const [selectedInboundStudentIds, setSelectedInboundStudentIds] = useState<string[]>([]);

  // Standalone Quick "Siswa Tanpa Kelas" Drawer
  const [isUnassignedDrawerOpen, setIsUnassignedDrawerOpen] = useState<boolean>(false);
  const [unassignedSearch, setUnassignedSearch] = useState<string>('');
  const [selectedUnassignedStudentIds, setSelectedUnassignedStudentIds] = useState<string[]>([]);
  const [unassignedTargetClass, setUnassignedTargetClass] = useState<string>('');

  // Naik Kelas Modal Launcher
  const [isNaikKelasOpen, setIsNaikKelasOpen] = useState<boolean>(false);

  const classFileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = isMasterDataModificationAllowed(user?.role);
  const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch all master data with multi-tenant isolation and defensive schema-cache fallbacks
  const loadAllData = useCallback(async (isManualTrigger = false) => {
    if (!isMountedRef.current) return;
    if (isManualTrigger) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');

    try {
      // 1. Fetch Students
      const { data: sData, error: sErr } = await supabase
        .from('data_siswa')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('nama_siswa', { ascending: true });

      if (sErr) throw sErr;
      if (!isMountedRef.current) return;
      if (sData) {
        setAllStudents(sData as StudentItem[]);
        setStorageCache('Data_Siswa', sekolahId, sData);
      }

      // 2. Fetch Wali Kelas
      const { data: wData, error: wErr } = await supabase
        .from('wali_kelas')
        .select('id, kelas, nama_guru, nip, tahun_ajaran, sekolah_id')
        .eq('sekolah_id', sekolahId);

      if (wErr && !isSchemaCacheOrMissingTableError(wErr)) {
        console.warn('[AdminKelasView] Warning fetching wali_kelas:', wErr);
      }
      if (!isMountedRef.current) return;
      setWaliKelasList((wData as WaliKelasItem[]) || []);

      // 3. Fetch data_kelas with defensive schema cache fallback
      let fetchedDbClasses: any[] = [];
      try {
        const { data: kData, error: kErr } = await supabase
          .from('data_kelas')
          .select('id, nama_kelas, tingkat, jurusan, sekolah_id')
          .eq('sekolah_id', sekolahId)
          .order('nama_kelas', { ascending: true });

        if (!kErr && kData) {
          fetchedDbClasses = kData;
          if (isMountedRef.current) setDbClasses(kData);
        } else {
          if (isMountedRef.current) setDbClasses([]);
        }
      } catch (err) {
        if (!isSchemaCacheOrMissingTableError(err)) {
          console.warn('[AdminKelasView] Optional data_kelas table unavailable:', err);
        }
        if (isMountedRef.current) setDbClasses([]);
      }

      // 4. Self-healing: Prune foreign/stale customClasses that have no students, no DB record, and no wali kelas
      setCustomClasses(prev => {
        const activeStudentClasses = new Set((sData || []).map(s => (s.kelas || '').trim()).filter(Boolean));
        const dbClassNames = new Set(fetchedDbClasses.map(k => (k.nama_kelas || '').trim()).filter(Boolean));
        const waliClassNames = new Set(((wData as any[]) || []).map(w => (w.kelas || '').trim()).filter(Boolean));
        const validCustom = prev.filter(c => activeStudentClasses.has(c) || dbClassNames.has(c) || waliClassNames.has(c));
        if (validCustom.length !== prev.length && typeof window !== 'undefined' && sekolahId) {
          try {
            localStorage.setItem(`sipjam_custom_classes_${sekolahId}`, JSON.stringify(validCustom));
          } catch (_) {}
        }
        return validCustom;
      });
    } catch (err: any) {
      console.error('[AdminKelasView] Error loading data:', err);
      if (isMountedRef.current) {
        setErrorMsg(err.message || 'Gagal memuat data direktori kelas.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [sekolahId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Sync custom classes & metadata to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && sekolahId) {
      try {
        localStorage.setItem(`sipjam_custom_classes_${sekolahId}`, JSON.stringify(customClasses));
        localStorage.setItem(`sipjam_custom_classes_meta_${sekolahId}`, JSON.stringify(customClassesMeta));
      } catch (_) {}
    }
  }, [customClasses, customClassesMeta, sekolahId]);

  // Listen to external class updates (e.g. from AdminDataView CSV import)
  useEffect(() => {
    const handleExternalClassUpdate = () => {
      if (typeof window !== 'undefined' && sekolahId) {
        try {
          const saved = localStorage.getItem(`sipjam_custom_classes_${sekolahId}`);
          if (saved) setCustomClasses(JSON.parse(saved));
          const savedMeta = localStorage.getItem(`sipjam_custom_classes_meta_${sekolahId}`);
          if (savedMeta) setCustomClassesMeta(JSON.parse(savedMeta));
        } catch (_) {}
      }
      loadAllData(true);
    };
    window.addEventListener('sipjam:kelas-updated', handleExternalClassUpdate);
    return () => {
      window.removeEventListener('sipjam:kelas-updated', handleExternalClassUpdate);
    };
  }, [loadAllData, sekolahId]);

  // Derived: List of Unassigned / Unallocated Active Students
  const unassignedStudents = useMemo(() => {
    return allStudents.filter(s => {
      if (s.status === 'Lulus') return false;
      return isUnassignedClass(s.kelas);
    });
  }, [allStudents]);

  // Derived: Consolidated Class Directory
  const consolidatedClasses = useMemo<ClassDirectoryItem[]>(() => {
    const classMap = new Map<string, ClassDirectoryItem>();

    // Seed from dbClasses
    dbClasses.forEach(c => {
      const name = (c.nama_kelas || '').trim();
      if (!name) return;
      classMap.set(name, {
        id: c.id || name,
        nama_kelas: name,
        tingkat: (c.tingkat as any) || parseTingkat(name),
        jurusan: c.jurusan || null,
        wali_kelas: null,
        totalSiswa: 0,
        siswaLaki: 0,
        siswaPerempuan: 0,
        students: [],
        isDbRecord: true
      });
    });

    // Seed from custom in-memory created classes
    customClasses.forEach(name => {
      const clean = (name || '').trim();
      if (!clean || classMap.has(clean)) return;
      const meta = customClassesMeta[clean];
      classMap.set(clean, {
        id: clean,
        nama_kelas: clean,
        tingkat: (meta?.tingkat as any) || parseTingkat(clean),
        jurusan: meta?.jurusan || null,
        wali_kelas: null,
        totalSiswa: 0,
        siswaLaki: 0,
        siswaPerempuan: 0,
        students: [],
        isDbRecord: false
      });
    });

    // Aggregate active students
    allStudents.forEach(s => {
      if (s.status === 'Lulus') return;
      if (isUnassignedClass(s.kelas)) return;
      const k = s.kelas!.trim();

      if (!classMap.has(k)) {
        classMap.set(k, {
          id: k,
          nama_kelas: k,
          tingkat: parseTingkat(k),
          jurusan: null,
          wali_kelas: null,
          totalSiswa: 0,
          siswaLaki: 0,
          siswaPerempuan: 0,
          students: [],
          isDbRecord: false
        });
      }

      const item = classMap.get(k)!;
      item.students.push(s);
      item.totalSiswa++;
      const g = (s.gender || '').toUpperCase().trim();
      if (g.startsWith('L')) {
        item.siswaLaki++;
      } else if (g.startsWith('P')) {
        item.siswaPerempuan++;
      }
    });

    // Attach Homeroom Teachers (Wali Kelas) and seed classes from wali_kelas (including fallback-imported classes when data_kelas table is absent)
    waliKelasList.forEach(w => {
      const k = (w.kelas || '').trim();
      if (!k) return;
      const meta = customClassesMeta[k];
      if (!classMap.has(k)) {
        classMap.set(k, {
          id: w.id || k,
          nama_kelas: k,
          tingkat: (meta?.tingkat as any) || parseTingkat(k),
          jurusan: meta?.jurusan || null,
          wali_kelas: w,
          totalSiswa: 0,
          siswaLaki: 0,
          siswaPerempuan: 0,
          students: [],
          isDbRecord: true
        });
      } else {
        classMap.get(k)!.wali_kelas = w;
        if (meta?.jurusan && !classMap.get(k)!.jurusan) {
          classMap.get(k)!.jurusan = meta.jurusan;
        }
      }
    });

    // Sort: Grade 10 -> 11 -> 12 -> Lainnya, then alphanumerically
    return Array.from(classMap.values()).sort((a, b) => {
      const weight = (t: string) => (t === '10' ? 1 : t === '11' ? 2 : t === '12' ? 3 : 4);
      if (weight(a.tingkat) !== weight(b.tingkat)) {
        return weight(a.tingkat) - weight(b.tingkat);
      }
      return a.nama_kelas.localeCompare(b.nama_kelas, undefined, { numeric: true });
    });
  }, [dbClasses, customClasses, customClassesMeta, allStudents, waliKelasList]);

  // Keep active workspace drawer updated when students or directory mutate
  useEffect(() => {
    if (selectedClassForWorkspace) {
      const current = consolidatedClasses.find(c => c.nama_kelas === selectedClassForWorkspace.nama_kelas);
      if (current) {
        setSelectedClassForWorkspace(current);
      }
    }
  }, [consolidatedClasses, selectedClassForWorkspace?.nama_kelas]);

  // Filtered Class Directory Cards
  const filteredClasses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return consolidatedClasses.filter(c => {
      const matchTingkat = filterTingkat === 'ALL' || c.tingkat === filterTingkat;
      const matchSearch =
        !q ||
        c.nama_kelas.toLowerCase().includes(q) ||
        (c.wali_kelas?.nama_guru && c.wali_kelas.nama_guru.toLowerCase().includes(q)) ||
        (c.jurusan && c.jurusan.toLowerCase().includes(q));
      return matchTingkat && matchSearch;
    });
  }, [consolidatedClasses, filterTingkat, searchQuery]);

  // Executive Statistics
  const stats = useMemo(() => {
    const totalClasses = consolidatedClasses.length;
    const totalAllocated = allStudents.filter(s => {
      if (s.status === 'Lulus') return false;
      return !isUnassignedClass(s.kelas);
    }).length;
    const totalUnassigned = unassignedStudents.length;
    return { totalClasses, totalAllocated, totalUnassigned };
  }, [consolidatedClasses, allStudents, unassignedStudents]);

  // Available class names for dropdown targets
  const allClassNames = useMemo(() => {
    return consolidatedClasses.map(c => c.nama_kelas);
  }, [consolidatedClasses]);

  // ==========================================
  // ACTION HANDLERS & MUTATIONS
  // ==========================================

  // CSV Template Download for Data Kelas
  const handleDownloadClassTemplate = () => {
    const content = '\uFEFF' + [
      'nama_kelas,tingkat,jurusan',
      'X Merdeka,10,Umum',
      'XI Merdeka,11,IPA',
      'XII Merdeka,12,IPS'
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Data_Kelas.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV Export for Data Kelas
  const handleExportClassCsv = () => {
    const isFilterApplied = Boolean((searchQuery && searchQuery.trim()) || filterTingkat !== 'ALL');
    const listToExport = isFilterApplied ? filteredClasses : (consolidatedClasses && consolidatedClasses.length > 0 ? consolidatedClasses : filteredClasses);
    if (!listToExport || listToExport.length === 0) {
      showToast('Info', isFilterApplied ? 'Tidak ada kelas yang sesuai filter untuk diekspor.' : 'Belum ada data kelas untuk diekspor.', 'info');
      return;
    }
    const result = downloadMasterDataCsv('Data_Kelas', listToExport);
    showToast('Berhasil', `Data Kelas (${result.rowCount} kelas) berhasil diekspor ke CSV!`, 'success');
  };

  // CSV File Upload & Import for Data Kelas
  const handleClassFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya Admin yang dapat mengunggah data kelas.', 'error');
      return;
    }

    if (file.size === 0) {
      showToast('Berkas Kosong', `Berkas "${file.name}" tidak memiliki data (0 bytes).`, 'error');
      e.target.value = '';
      return;
    }

    setIsClassUploading(true);
    setClassUploadProgress(0);
    setClassUploadStage('Mempersiapkan berkas CSV...');
    setClassBatchInfo(null);
    setActionLoading(true);
    try {
      const text = await file.text();

      // Smart CSV header detection: check if uploading student records or class records
      const firstLine = text.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/).find(l => l.trim() && !l.toLowerCase().startsWith('sep='));
      const lowerHeader = (firstLine || '').toLowerCase();
      const isStudentCsv = lowerHeader.includes('nama_siswa') || (lowerHeader.includes('nisn') && lowerHeader.includes('kelas'));

      if (isStudentCsv) {
        // Auto-route student CSV: importMasterDataFromCsv(supabase, text, 'data_siswa', user)
        const { count, rows } = await importMasterDataFromCsv(
          supabase,
          text,
          'data_siswa',
          user,
          (p) => {
            setClassUploadProgress(p.percentage);
            setClassUploadStage(p.stage);
            if (p.totalBatches > 0) {
              setClassBatchInfo({
                currentBatch: p.currentBatch,
                totalBatches: p.totalBatches,
                processedRows: p.processedRows,
                totalRows: p.totalRows
              });
            }
          }
        );

        // Reflect student classes in customClasses and customClassesMeta
        if (Array.isArray(rows) && rows.length > 0) {
          setAllStudents(prev => {
            const existingMap = new Map(prev.map(s => [s.id, s]));
            rows.forEach(r => existingMap.set(r.id, r as StudentItem));
            return Array.from(existingMap.values());
          });
          const studentClasses = Array.from(new Set(rows.map(r => String(r.kelas || '').trim()).filter(Boolean)));
          const meta: Record<string, { tingkat?: string; jurusan?: string | null }> = {};
          studentClasses.forEach(k => {
            meta[k] = {
              tingkat: parseTingkat(k),
              jurusan: null
            };
          });
          if (studentClasses.length > 0) {
            setCustomClasses(prev => Array.from(new Set([...prev, ...studentClasses])));
            setCustomClassesMeta(prev => ({ ...prev, ...meta }));
            const schoolId = sekolahId || user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
            const existingStored = getStorageCache('Data_Siswa', schoolId) || [];
            const mergedCacheMap = new Map();
            existingStored.forEach((s: any) => { if (s?.id) mergedCacheMap.set(s.id, s); });
            rows.forEach((r: any) => { if (r?.id) mergedCacheMap.set(r.id, r); });
            setStorageCache('Data_Siswa', schoolId, Array.from(mergedCacheMap.values()));
            try {
              const existingClasses = JSON.parse(localStorage.getItem(`sipjam_custom_classes_${schoolId}`) || '[]');
              const existingMeta = JSON.parse(localStorage.getItem(`sipjam_custom_classes_meta_${schoolId}`) || '{}');
              const mergedClasses = Array.from(new Set([...existingClasses, ...studentClasses]));
              const mergedMeta = { ...existingMeta, ...meta };
              localStorage.setItem(`sipjam_custom_classes_${schoolId}`, JSON.stringify(mergedClasses));
              localStorage.setItem(`sipjam_custom_classes_meta_${schoolId}`, JSON.stringify(mergedMeta));
            } catch (_) {}
          }
        }

        // Reset filters and search so newly uploaded students and classes are immediately visible
        setFilterTingkat('ALL');
        setSearchQuery('');

        showToast(
          'Unggah Berhasil',
          `Berhasil mengimpor dan memperbarui ${count} data siswa ke dalam kelas!`,
          'success'
        );
        window.dispatchEvent(new CustomEvent('sipjam:kelas-updated'));
        await loadAllData(true);
        return;
      }

      const { count, rows } = await importMasterDataFromCsv(
        supabase,
        text,
        'data_kelas',
        user,
        (p) => {
          setClassUploadProgress(p.percentage);
          setClassUploadStage(p.stage);
          if (p.totalBatches > 0) {
            setClassBatchInfo({
              currentBatch: p.currentBatch,
              totalBatches: p.totalBatches,
              processedRows: p.processedRows,
              totalRows: p.totalRows
            });
          }
        }
      );

      // Immediately reflect imported classes in local state
      if (Array.isArray(rows) && rows.length > 0) {
        const importedNames = rows.map(r => String(r.nama_kelas || '').trim()).filter(Boolean);
        const meta: Record<string, { tingkat?: string; jurusan?: string | null }> = {};
        rows.forEach(r => {
          const k = String(r.nama_kelas || '').trim();
          if (k) {
            meta[k] = {
              tingkat: r.tingkat || parseTingkat(k),
              jurusan: r.jurusan || null
            };
          }
        });
        if (importedNames.length > 0) {
          setCustomClasses(prev => Array.from(new Set([...prev, ...importedNames])));
          setCustomClassesMeta(prev => ({ ...prev, ...meta }));
        }
      }

      // Reset filters and search so newly uploaded classes are immediately visible
      setFilterTingkat('ALL');
      setSearchQuery('');

      showToast(
        'Unggah Berhasil',
        `Berhasil mengimpor dan memperbarui ${count} data kelas ke sistem!`,
        'success'
      );
      await loadAllData(true);
    } catch (err: any) {
      const errorMsg = err.message || 'Terjadi kesalahan saat memproses CSV kelas.';
      showToast('Gagal Impor CSV', errorMsg, 'error');
      showMasterDataDiagnosticModal(err);
    } finally {
      setActionLoading(false);
      setTimeout(() => {
        setIsClassUploading(false);
        setClassUploadProgress(0);
        setClassUploadStage('');
        setClassBatchInfo(null);
      }, 600);
      if (classFileInputRef.current) classFileInputRef.current.value = '';
      if (e?.target) e.target.value = '';
    }
  };

  // 1. Create New Class
  const handleAddClass = async () => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat menambah kelas.', 'error');
    }

    const { value: formValues } = await Swal.fire({
      title: 'Tambah Kelas Baru',
      html: `
        <div class="space-y-3 text-left">
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Nama Kelas <span class="text-red-500">*</span></label>
            <input id="swal-nama-kelas" class="swal2-input !m-0 !w-full !text-sm" placeholder="Contoh: X Merdeka 1, XI IPA 2" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Tingkat</label>
            <select id="swal-tingkat" class="swal2-select !m-0 !w-full !text-sm">
              <option value="10">Tingkat 10 / X</option>
              <option value="11">Tingkat 11 / XI</option>
              <option value="12">Tingkat 12 / XII</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 mb-1">Jurusan / Konsentrasi (Opsional)</label>
            <input id="swal-jurusan" class="swal2-input !m-0 !w-full !text-sm" placeholder="Contoh: Umum, IPA, Rekayasa Perangkat Lunak" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-plus mr-1"></i> Simpan Kelas',
      confirmButtonColor: '#7C3AED',
      cancelButtonText: 'Batal',
      focusConfirm: false,
      preConfirm: () => {
        const nama = (document.getElementById('swal-nama-kelas') as HTMLInputElement)?.value?.trim();
        const tingkat = (document.getElementById('swal-tingkat') as HTMLSelectElement)?.value;
        const jurusan = (document.getElementById('swal-jurusan') as HTMLInputElement)?.value?.trim() || null;

        if (!nama) {
          Swal.showValidationMessage('Nama kelas wajib diisi!');
          return false;
        }

        const exists = consolidatedClasses.some(c => c.nama_kelas.toLowerCase() === nama.toLowerCase());
        if (exists) {
          Swal.showValidationMessage(`Kelas "${nama}" sudah terdaftar!`);
          return false;
        }

        return { nama_kelas: nama, tingkat, jurusan };
      }
    });

    if (!formValues) return;

    setActionLoading(true);
    try {
      // Attempt insert into data_kelas if available
      try {
        const { error: insErr } = await supabase.from('data_kelas').insert({
          sekolah_id: sekolahId,
          nama_kelas: formValues.nama_kelas,
          tingkat: formValues.tingkat,
          jurusan: formValues.jurusan
        });
        if (insErr && !isSchemaCacheOrMissingTableError(insErr)) {
          console.warn('[AdminKelasView] Error inserting data_kelas:', insErr);
        }
      } catch (e) {
        console.warn('[AdminKelasView] data_kelas table unavailable, storing in memory:', e);
      }

      setCustomClasses(prev => (prev.includes(formValues.nama_kelas) ? prev : [...prev, formValues.nama_kelas]));
      setCustomClassesMeta(prev => ({
        ...prev,
        [formValues.nama_kelas]: { tingkat: formValues.tingkat, jurusan: formValues.jurusan }
      }));
      showToast('Berhasil', `Kelas "${formValues.nama_kelas}" berhasil ditambahkan!`, 'success');
      await loadAllData();
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Gagal menambahkan kelas.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Cascading Class Rename
  const handleRenameClass = async (oldName: string) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat mengubah nama kelas.', 'error');
    }

    const { value: newName } = await Swal.fire({
      title: 'Ubah Nama Kelas',
      input: 'text',
      inputValue: oldName,
      inputLabel: 'Masukkan nama kelas baru:',
      showCancelButton: true,
      confirmButtonText: 'Simpan Perubahan',
      confirmButtonColor: '#7C3AED',
      cancelButtonText: 'Batal',
      inputValidator: val => {
        if (!val || !val.trim()) return 'Nama kelas tidak boleh kosong!';
        if (val.trim().toLowerCase() === oldName.toLowerCase()) return 'Nama kelas baru harus berbeda!';
        const exists = consolidatedClasses.some(c => c.nama_kelas.toLowerCase() === val.trim().toLowerCase());
        if (exists) return `Kelas "${val.trim()}" sudah ada!`;
        return null;
      }
    });

    if (!newName) return;
    const targetName = newName.trim();

    setActionLoading(true);
    try {
      // 1. Cascade update on data_siswa
      const { error: errSiswa } = await supabase
        .from('data_siswa')
        .update({ kelas: targetName, updated_at: new Date().toISOString() })
        .eq('sekolah_id', sekolahId)
        .eq('kelas', oldName);

      if (errSiswa) throw errSiswa;

      // 2. Cascade update on wali_kelas
      try {
        const { data: existingWali } = await supabase
          .from('wali_kelas')
          .select('id')
          .eq('sekolah_id', sekolahId)
          .eq('kelas', targetName)
          .maybeSingle();

        if (!existingWali) {
          await supabase
            .from('wali_kelas')
            .update({ kelas: targetName })
            .eq('sekolah_id', sekolahId)
            .eq('kelas', oldName);
        }
      } catch (wErr) {
        console.warn('[AdminKelasView] Error cascading wali_kelas rename:', wErr);
      }

      // 3. Cascade update on jadwal_pelajaran
      try {
        await supabase
          .from('jadwal_pelajaran')
          .update({ kelas: targetName })
          .eq('sekolah_id', sekolahId)
          .eq('kelas', oldName);
      } catch (jErr) {
        console.warn('[AdminKelasView] Error cascading jadwal_pelajaran rename:', jErr);
      }

      // 4. Update data_kelas if table exists
      try {
        await supabase
          .from('data_kelas')
          .update({ nama_kelas: targetName, tingkat: parseTingkat(targetName) })
          .eq('sekolah_id', sekolahId)
          .eq('nama_kelas', oldName);
      } catch (_) {}

      // Update in-memory state
      setCustomClasses(prev => prev.map(c => (c === oldName ? targetName : c)));
      setCustomClassesMeta(prev => {
        const next = { ...prev };
        if (next[oldName]) {
          next[targetName] = { ...next[oldName], tingkat: parseTingkat(targetName) };
          delete next[oldName];
        }
        return next;
      });
      setAllStudents(prev =>
        prev.map(s => (s.kelas === oldName ? { ...s, kelas: targetName } : s))
      );

      showToast('Berhasil', `Nama kelas berhasil diubah dari "${oldName}" menjadi "${targetName}".`, 'success');
      await loadAllData();
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Gagal mengubah nama kelas.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Delete Class (Guarded by 0 students)
  const handleDeleteClass = async (cls: ClassDirectoryItem) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat menghapus kelas.', 'error');
    }

    if (cls.totalSiswa > 0) {
      return Swal.fire({
        icon: 'warning',
        title: 'Kelas Tidak Dapat Dihapus',
        html: `Kelas <b>${cls.nama_kelas}</b> masih memiliki <b>${cls.totalSiswa} siswa</b> aktif.<br/><br/>Harap pindahkan seluruh siswa ke kelas lain terlebih dahulu sebelum menghapus kelas ini.`,
        confirmButtonColor: '#7C3AED'
      });
    }

    const confirm = await Swal.fire({
      title: 'Hapus Kelas?',
      html: `Apakah Anda yakin ingin menghapus kelas <b>${cls.nama_kelas}</b>? Tindakan ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-trash-can mr-1"></i> Ya, Hapus',
      confirmButtonColor: '#DC2626',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    try {
      try {
        await supabase
          .from('data_kelas')
          .delete()
          .eq('sekolah_id', sekolahId)
          .eq('nama_kelas', cls.nama_kelas);
      } catch (_) {}

      try {
        await supabase
          .from('wali_kelas')
          .delete()
          .eq('sekolah_id', sekolahId)
          .eq('kelas', cls.nama_kelas);
      } catch (_) {}

      setCustomClasses(prev => prev.filter(c => c !== cls.nama_kelas));
      setCustomClassesMeta(prev => {
        const next = { ...prev };
        delete next[cls.nama_kelas];
        return next;
      });
      showToast('Berhasil', `Kelas "${cls.nama_kelas}" berhasil dihapus.`, 'success');
      await loadAllData();
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Gagal menghapus kelas.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Batch Transfer Students Out of a Class to a Target Class
  const handleBatchTransfer = async (studentIds: string[], targetClass: string) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat memindahkan siswa.', 'error');
    }

    if (!studentIds || studentIds.length === 0) {
      return showToast('Peringatan', 'Pilih minimal 1 siswa untuk dipindahkan.', 'warning');
    }

    if (!targetClass || !targetClass.trim()) {
      return showToast('Peringatan', 'Pilih kelas tujuan pemindahan.', 'warning');
    }

    const isLulus = targetClass.trim().toLowerCase() === 'lulus';
    const isUnassignedTarget = isUnassignedClass(targetClass);
    const targetLabel = isLulus ? 'Kelulusan (Alumni)' : isUnassignedTarget ? 'Tanpa Kelas (Unassigned)' : `Kelas ${targetClass}`;

    const confirm = await Swal.fire({
      title: 'Konfirmasi Pemindahan',
      html: `Pindahkan <b>${studentIds.length} siswa</b> ke <b>${targetLabel}</b>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Pindahkan',
      confirmButtonColor: '#059669',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    setActionLoading(true);
    const previousStudents = [...allStudents];

    try {
      const newStatus = isLulus ? 'Lulus' : 'Aktif';
      const newKelas = isLulus ? 'Lulus' : isUnassignedTarget ? null : targetClass.trim();

      // Immediate in-memory reactive update for zero-reload responsiveness
      setAllStudents(prev =>
        prev.map(s => {
          if (studentIds.includes(s.id)) {
            return {
              ...s,
              kelas: newKelas,
              status: newStatus
            };
          }
          return s;
        })
      );
      setSelectedRosterStudentIds([]);

      // Database mutation
      const { error } = await supabase
        .from('data_siswa')
        .update({
          kelas: newKelas,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', studentIds)
        .eq('sekolah_id', sekolahId);

      if (error) {
        // Rollback on failure
        setAllStudents(previousStudents);
        throw error;
      }

      showToast('Berhasil', `${studentIds.length} siswa berhasil dipindahkan ke ${targetLabel}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Gagal memindahkan siswa.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Inbound Batch Allocation to Class
  const handleInboundAllocate = async (studentIds: string[], destClass: string) => {
    if (!isAdmin) {
      return showToast('Akses Ditolak', 'Hanya Admin yang dapat mengalokasikan siswa.', 'error');
    }

    if (!studentIds || studentIds.length === 0) {
      return showToast('Peringatan', 'Pilih minimal 1 siswa untuk dialokasikan.', 'warning');
    }

    if (!destClass || !destClass.trim()) {
      return showToast('Peringatan', 'Kelas tujuan tidak valid.', 'warning');
    }

    setActionLoading(true);
    const previousStudents = [...allStudents];

    try {
      // Optimistic in-memory update
      setAllStudents(prev =>
        prev.map(s => {
          if (studentIds.includes(s.id)) {
            return {
              ...s,
              kelas: destClass.trim(),
              status: 'Aktif'
            };
          }
          return s;
        })
      );
      setSelectedInboundStudentIds([]);
      setSelectedUnassignedStudentIds([]);

      // Database update
      const { error } = await supabase
        .from('data_siswa')
        .update({
          kelas: destClass.trim(),
          status: 'Aktif',
          updated_at: new Date().toISOString()
        })
        .in('id', studentIds)
        .eq('sekolah_id', sekolahId);

      if (error) {
        setAllStudents(previousStudents);
        throw error;
      }

      showToast('Berhasil', `${studentIds.length} siswa berhasil dialokasikan ke kelas ${destClass}.`, 'success');
      await loadAllData();
    } catch (err: any) {
      Swal.fire('Gagal', err.message || 'Gagal mengalokasikan siswa.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // If user is not admin, show locked access banner
  if (!isAdmin) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900/40 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3">
          <i className="fa-solid fa-lock text-xl"></i>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          Sub menu <strong>Kelas & Alokasi Siswa</strong> secara eksklusif hanya dapat diakses oleh Administrator untuk mengelola direktori kelas dan penempatan siswa.
        </p>
      </div>
    );
  }

  return (
    <div id="sub-menu-kelas" className="space-y-4 fade-in">
      {/* ======================================================== */}
      {/* 1. EXECUTIVE STATISTICS & HEADER BANNER */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/20 border-2 border-purple-200/80 dark:border-purple-800/60 shadow-xs">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <i className="fa-solid fa-chalkboard-user text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-2">
                <span>Manajemen Direktori & Alokasi Kelas Siswa</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-300/60">
                  Terpusat
                </span>
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                Kelola direktori rombongan belajar dan lakukan alokasi, mutasi, serta pemindahan siswa antar kelas secara terpusat dari sub menu ini.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={refreshing || loading || actionLoading}
              className="clay-btn px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Segarkan data kelas dan alokasi siswa"
            >
              <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'animate-spin' : ''}`}></i>
              <span>{refreshing ? 'Menyegarkan...' : 'Tarik / Segarkan Data'}</span>
            </button>
          </div>
        </div>

        {/* Executive Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-purple-200/60 dark:border-purple-800/40">
          <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-2 rounded-xl border border-purple-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-school text-purple-600 dark:text-purple-400 text-xs"></i>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Total Kelas</span>
            </div>
            <span className="text-xs font-black text-purple-900 dark:text-purple-300">{stats.totalClasses}</span>
          </div>

          <div className="bg-white/80 dark:bg-gray-800/80 px-3 py-2 rounded-xl border border-purple-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-user-check text-emerald-600 dark:text-emerald-400 text-xs"></i>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Siswa Teralokasi</span>
            </div>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{stats.totalAllocated}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsUnassignedDrawerOpen(true)}
            className={`col-span-2 sm:col-span-1 px-3 py-2 rounded-xl border flex items-center justify-between transition text-left cursor-pointer ${
              stats.totalUnassigned > 0
                ? 'bg-amber-100/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/70 hover:bg-amber-200/80'
                : 'bg-white/80 dark:bg-gray-800/80 border-purple-100 dark:border-gray-700'
            }`}
            title="Klik untuk meninjau siswa tanpa kelas"
          >
            <div className="flex items-center gap-2">
              <i className={`fa-solid fa-user-xmark text-xs ${stats.totalUnassigned > 0 ? 'text-amber-600 dark:text-amber-400 animate-pulse' : 'text-gray-400'}`}></i>
              <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">Siswa Tanpa Kelas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-black ${stats.totalUnassigned > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500'}`}>
                {stats.totalUnassigned}
              </span>
              {stats.totalUnassigned > 0 && (
                <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold underline">Alokasikan</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. UNALLOCATED STUDENTS ALERT WARNING BANNER */}
      {/* ======================================================== */}
      {unassignedStudents.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300/80 dark:border-amber-800/60 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <i className="fa-solid fa-triangle-exclamation text-base"></i>
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Perhatian: Terdapat {unassignedStudents.length} Siswa Belum Memiliki Kelas!
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-tight mt-0.5">
                Siswa tanpa rombel tidak akan muncul pada daftar presensi harian maupun jurnal kelas guru mata pelajaran.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsUnassignedDrawerOpen(true)}
            className="shrink-0 clay-btn px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-user-check"></i>
            <span>Alokasikan Sekarang ({unassignedStudents.length})</span>
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. TOOLBAR: SEARCH, TINGKAT FILTER, & ACTION BUTTONS */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama kelas, wali kelas, atau jurusan..."
              className="input-premium w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Filter Tingkat Pills */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0">
            {(['ALL', '10', '11', '12'] as TingkatFilter[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTingkat(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterTingkat === t
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'Semua' : `Tingkat ${t}`}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          <input
            type="file"
            ref={classFileInputRef}
            accept=".csv,text/csv,text/plain"
            onChange={handleClassFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleDownloadClassTemplate}
            className="clay-btn px-2.5 sm:px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Unduh format template CSV Data Kelas"
          >
            <i className="fa-solid fa-file-csv text-green-600 dark:text-green-400"></i>
            <span>Template CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportClassCsv}
            disabled={loading}
            className="clay-btn px-2.5 sm:px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-white border border-gray-200 dark:border-gray-700 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Ekspor seluruh Data Kelas ke berkas CSV"
            aria-label="Ekspor seluruh Data Kelas ke berkas CSV"
          >
            <i className="fa-solid fa-file-export text-purple-600 dark:text-purple-400"></i>
            <span>Export CSV</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => classFileInputRef.current?.click()}
              disabled={actionLoading}
              className="clay-btn px-2.5 sm:px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Unggah berkas CSV Data Kelas"
            >
              <i className="fa-solid fa-upload"></i>
              <span>Impor CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAddClass}
            disabled={actionLoading}
            className="clay-btn px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Tambah Kelas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNaikKelasOpen(true)}
            className="clay-btn px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            title="Buka panduan kenaikan kelas dan kelulusan satu angkatan"
          >
            <i className="fa-solid fa-graduation-cap"></i>
            <span>Naik Kelas</span>
          </button>
        </div>
      </div>

      {/* Animated Class Upload Progress Bar */}
      {isClassUploading && (
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-notch fa-spin text-purple-600 dark:text-purple-400 text-sm"></i>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {classUploadStage || 'Sedang memproses unggahan kelas...'}
              </span>
            </div>
            <span className="text-xs font-black text-purple-700 dark:text-purple-300 font-mono">
              {classUploadProgress}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
            <div
              className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, classUploadProgress))}%` }}
            />
          </div>

          {classBatchInfo && classBatchInfo.totalRows > 0 && (
            <div className="flex justify-between items-center mt-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>Batch {classBatchInfo.currentBatch} dari {classBatchInfo.totalBatches}</span>
              <span>{classBatchInfo.processedRows} dari {classBatchInfo.totalRows} baris</span>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. RESPONSIVE GRID OF CLASS DIRECTORY CARDS */}
      {/* ======================================================== */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
          <i className="fa-solid fa-circle-notch fa-spin text-purple-600 text-2xl mb-2"></i>
          <p className="text-xs text-gray-500 dark:text-gray-400">Memuat data direktori kelas...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-school text-xl"></i>
          </div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
            {searchQuery || filterTingkat !== 'ALL' ? 'Tidak Ada Kelas yang Cocok' : 'Belum Ada Data Kelas'}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
            {searchQuery || filterTingkat !== 'ALL'
              ? 'Coba sesuaikan kata kunci pencarian atau ubah filter tingkat kelas.'
              : 'Tambahkan kelas baru atau alokasikan siswa ke kelas untuk memulai.'}
          </p>
          {!searchQuery && filterTingkat === 'ALL' && (
            <button
              type="button"
              onClick={handleAddClass}
              className="clay-btn px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Buat Kelas Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredClasses.map(cls => {
            const hasWali = Boolean(cls.wali_kelas?.nama_guru);
            return (
              <div
                key={cls.nama_kelas}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Card Top: Title & Badges */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <span>{cls.nama_kelas}</span>
                      </h4>
                      {cls.jurusan && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          {cls.jurusan}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        cls.tingkat === '10'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          : cls.tingkat === '11'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : cls.tingkat === '12'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}
                    >
                      {cls.tingkat === 'Lainnya' ? 'Umum' : `Kelas ${cls.tingkat}`}
                    </span>
                  </div>

                  {/* Homeroom Teacher */}
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 mb-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                        hasWali
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                      }`}
                    >
                      <i className={`fa-solid ${hasWali ? 'fa-user-tie' : 'fa-user-xmark'}`}></i>
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider leading-none">
                        Wali Kelas
                      </div>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mt-0.5" title={cls.wali_kelas?.nama_guru || 'Belum ditentukan'}>
                        {cls.wali_kelas?.nama_guru || <span className="text-gray-400 italic">Belum ditentukan</span>}
                      </div>
                    </div>
                  </div>

                  {/* Student Count & Gender Metrics */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-[11px]">Total Siswa: </span>
                      <strong className="text-gray-900 dark:text-white font-bold">{cls.totalSiswa}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold" title="Siswa Laki-laki">
                        <i className="fa-solid fa-mars mr-1"></i>{cls.siswaLaki}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold" title="Siswa Perempuan">
                        <i className="fa-solid fa-venus mr-1"></i>{cls.siswaPerempuan}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Primary & Quick Actions */}
                <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassForWorkspace(cls);
                      setWorkspaceTab('roster');
                      setSelectedRosterStudentIds([]);
                      setSelectedInboundStudentIds([]);
                      setRosterSearch('');
                      setRosterMapelFilter('ALL');
                      setInboundSearch('');
                      setTargetTransferClass('');
                    }}
                    className="w-full clay-btn py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <i className="fa-solid fa-users-rectangle"></i>
                    <span>Kelola Siswa & Roster ({cls.totalSiswa})</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      onClick={() => handleRenameClass(cls.nama_kelas)}
                      disabled={actionLoading}
                      className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      title="Ubah nama kelas ini dan perbarui data siswa serta jadwal otomatis"
                    >
                      <i className="fa-solid fa-pen-to-square"></i>
                      <span>Ubah Nama</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClass(cls)}
                      disabled={actionLoading}
                      className={`flex items-center gap-1 font-semibold cursor-pointer ${
                        cls.totalSiswa > 0
                          ? 'text-gray-400 dark:text-gray-600 hover:text-gray-500'
                          : 'text-red-600 dark:text-red-400 hover:underline'
                      }`}
                      title={cls.totalSiswa > 0 ? 'Kelas hanya dapat dihapus jika memiliki 0 siswa' : 'Hapus kelas ini'}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. CENTRALIZED ALLOCATION WORKSPACE SLIDE-OVER DRAWER   */}
      {/* ======================================================== */}
      {selectedClassForWorkspace && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slideLeft">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Kelas {selectedClassForWorkspace.nama_kelas}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    Tingkat {selectedClassForWorkspace.tingkat}
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>
                    <i className="fa-solid fa-user-tie mr-1 text-purple-600"></i>
                    Wali: {selectedClassForWorkspace.wali_kelas?.nama_guru || 'Belum ditentukan'}
                  </span>
                  <span>•</span>
                  <span>
                    Total: <b>{selectedClassForWorkspace.totalSiswa} Siswa</b> (L: {selectedClassForWorkspace.siswaLaki}, P: {selectedClassForWorkspace.siswaPerempuan})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassForWorkspace(null)}
                className="w-8 h-8 rounded-xl bg-white/80 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Workspace Drawer Tabs */}
            <div className="flex items-center border-b border-gray-200 dark:border-gray-800 px-4 bg-gray-50 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={() => setWorkspaceTab('roster')}
                className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  workspaceTab === 'roster'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <i className="fa-solid fa-users"></i>
                <span>Roster Siswa Kelas Ini</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-bold">
                  {selectedClassForWorkspace.students.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceTab('inbound')}
                className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                  workspaceTab === 'inbound'
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <i className="fa-solid fa-user-plus"></i>
                <span>+ Alokasikan Siswa Masuk</span>
                {unassignedStudents.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold">
                    {unassignedStudents.length} Tanpa Rombel
                  </span>
                )}
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* ======================================================== */}
              {/* TAB 1: ROSTER SISWA KELAS INI */}
              {/* ======================================================== */}
              {workspaceTab === 'roster' && (
                <div className="space-y-3">
                  {/* Search and Batch Move Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={rosterSearch}
                        onChange={e => setRosterSearch(e.target.value)}
                        placeholder="Cari siswa di kelas ini..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                    <div className="w-full sm:w-56 shrink-0">
                      <select
                        value={rosterMapelFilter}
                        onChange={e => setRosterMapelFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-medium"
                        title="Filter Berdasarkan Mata Pelajaran / Agama"
                      >
                        <option value="ALL">Semua Mapel</option>
                        <option value="Pendidikan Agama Islam">Pendidikan Agama Islam (PAI)</option>
                        <option value="Pendidikan Agama Kristen">Pendidikan Agama Kristen (PAK)</option>
                      </select>
                    </div>
                  </div>

                  {/* Batch Selection Action Bar */}
                  {selectedRosterStudentIds.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                      <div className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-check-double"></i>
                        <span>{selectedRosterStudentIds.length} Siswa Dipilih</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={targetTransferClass}
                          onChange={e => setTargetTransferClass(e.target.value)}
                          className="text-xs py-1.5 px-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        >
                          <option value="">-- Pilih Kelas Tujuan --</option>
                          <option value="Tanpa Kelas">Keluarkan (Jadikan Tanpa Kelas)</option>
                          <option value="Lulus">Luluskan (Alumni)</option>
                          <optgroup label="Pindah ke Kelas Lain">
                            {allClassNames
                              .filter(c => c !== selectedClassForWorkspace.nama_kelas)
                              .map(c => (
                                <option key={c} value={c}>
                                  Kelas {c}
                                </option>
                              ))}
                          </optgroup>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleBatchTransfer(selectedRosterStudentIds, targetTransferClass)}
                          disabled={!targetTransferClass || actionLoading}
                          className="clay-btn px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        >
                          Pindahkan
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Roster Table */}
                  {(() => {
                    const filteredRoster = selectedClassForWorkspace.students.filter(s => {
                      if (rosterMapelFilter !== 'ALL' && !isStudentEligibleForSubject(s, rosterMapelFilter)) {
                        return false;
                      }
                      const q = rosterSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        s.nama_siswa.toLowerCase().includes(q) ||
                        (s.nisn && s.nisn.toLowerCase().includes(q))
                      );
                    });

                    if (filteredRoster.length === 0) {
                      return (
                        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                          {rosterSearch ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Belum ada siswa yang terdaftar di kelas ini.'}
                        </div>
                      );
                    }

                    const allFilteredIds = filteredRoster.map(s => s.id);
                    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedRosterStudentIds.includes(id));

                    return (
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                          <thead className="bg-gray-50 dark:bg-gray-800/80 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="p-2.5 w-8 text-center">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedRosterStudentIds(Array.from(new Set([...selectedRosterStudentIds, ...allFilteredIds])));
                                    } else {
                                      setSelectedRosterStudentIds(selectedRosterStudentIds.filter(id => !allFilteredIds.includes(id)));
                                    }
                                  }}
                                  className="rounded text-purple-600 cursor-pointer"
                                />
                              </th>
                              <th className="p-2.5">Siswa</th>
                              <th className="p-2.5">L/P</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {filteredRoster.map(s => {
                              const isChecked = selectedRosterStudentIds.includes(s.id);
                              return (
                                <tr
                                  key={s.id}
                                  className={`hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition ${
                                    isChecked ? 'bg-purple-50/70 dark:bg-purple-950/30' : ''
                                  }`}
                                >
                                  <td className="p-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedRosterStudentIds([...selectedRosterStudentIds, s.id]);
                                        } else {
                                          setSelectedRosterStudentIds(selectedRosterStudentIds.filter(id => id !== s.id));
                                        }
                                      }}
                                      className="rounded text-purple-600 cursor-pointer"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-gray-900 dark:text-white">{s.nama_siswa}</span>
                                      {s.agama && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                          {s.agama}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-400">NISN: {s.nisn || '-'}</div>
                                  </td>
                                  <td className="p-2.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        (s.gender || '').toUpperCase().startsWith('L')
                                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                      }`}
                                    >
                                      {s.gender || '-'}
                                    </span>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      {s.status || 'Aktif'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const { value: target } = await Swal.fire({
                                          title: 'Pindahkan Siswa',
                                          text: `Pindahkan "${s.nama_siswa}" ke kelas mana?`,
                                          input: 'select',
                                          inputOptions: {
                                            'Tanpa Kelas': 'Keluarkan (Jadikan Tanpa Kelas)',
                                            'Lulus': 'Luluskan (Alumni)',
                                            ...Object.fromEntries(
                                              allClassNames
                                                .filter(c => c !== selectedClassForWorkspace.nama_kelas)
                                                .map(c => [c, `Kelas ${c}`])
                                            )
                                          },
                                          showCancelButton: true,
                                          confirmButtonText: 'Pindahkan',
                                          confirmButtonColor: '#059669',
                                          cancelButtonText: 'Batal'
                                        });
                                        if (target) {
                                          handleBatchTransfer([s.id], target);
                                        }
                                      }}
                                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
                                    >
                                      Pindah
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ======================================================== */}
              {/* TAB 2: INBOUND ALLOCATION (+ MASUKKAN SISWA KE KELAS INI) */}
              {/* ======================================================== */}
              {workspaceTab === 'inbound' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200">
                    Pilih siswa dari kelompok tanpa rombel atau dari kelas lain untuk dimasukkan langsung ke <b>Kelas {selectedClassForWorkspace.nama_kelas}</b>.
                  </div>

                  {/* Filter source */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      <select
                        value={inboundSourceClass}
                        onChange={e => {
                          setInboundSourceClass(e.target.value);
                          setSelectedInboundStudentIds([]);
                        }}
                        className="text-xs py-1.5 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      >
                        <option value="UNASSIGNED">Siswa Tanpa Kelas ({unassignedStudents.length})</option>
                        <option value="ALL_OTHER">Semua Siswa Dari Kelas Lain</option>
                        <optgroup label="Filter Per Kelas Asal">
                          {allClassNames
                            .filter(c => c !== selectedClassForWorkspace.nama_kelas)
                            .map(c => (
                              <option key={c} value={c}>
                                Dari Kelas {c}
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="relative flex-1">
                      <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={inboundSearch}
                        onChange={e => setInboundSearch(e.target.value)}
                        placeholder="Cari siswa masuk..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      />
                    </div>
                  </div>

                  {/* Candidate list evaluation */}
                  {(() => {
                    const candidates = allStudents.filter(s => {
                      if (s.status === 'Lulus') return false;
                      // Exclude current class students
                      if (s.kelas === selectedClassForWorkspace.nama_kelas) return false;

                      // Filter by source
                      if (inboundSourceClass === 'UNASSIGNED') {
                        if (!isUnassignedClass(s.kelas)) return false;
                      } else if (inboundSourceClass === 'ALL_OTHER') {
                        // includes unassigned or other classes
                      } else {
                        if (s.kelas !== inboundSourceClass) return false;
                      }

                      // Search filter
                      const q = inboundSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        s.nama_siswa.toLowerCase().includes(q) ||
                        (s.nisn && s.nisn.toLowerCase().includes(q))
                      );
                    });

                    if (candidates.length === 0) {
                      return (
                        <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                          Tidak ada siswa yang sesuai kriteria sumber atau pencarian.
                        </div>
                      );
                    }

                    const candidateIds = candidates.map(s => s.id);
                    const isAllCandidatesSelected = candidateIds.length > 0 && candidateIds.every(id => selectedInboundStudentIds.includes(id));

                    return (
                      <div className="space-y-2">
                        {/* Batch Action Confirmation Bar */}
                        {selectedInboundStudentIds.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-purple-600 text-white flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
                            <span className="text-xs font-bold">
                              {selectedInboundStudentIds.length} Siswa Terpilih
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInboundAllocate(selectedInboundStudentIds, selectedClassForWorkspace.nama_kelas)}
                              disabled={actionLoading}
                              className="px-3 py-1.5 rounded-lg bg-white text-purple-700 text-xs font-black shadow-xs hover:bg-purple-50 transition cursor-pointer"
                            >
                              <i className="fa-solid fa-arrow-down mr-1"></i>
                              Masukkan ke {selectedClassForWorkspace.nama_kelas}
                            </button>
                          </div>
                        )}

                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-800/80 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                              <tr>
                                <th className="p-2.5 w-8 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAllCandidatesSelected}
                                    onChange={e => {
                                      if (e.target.checked) {
                                        setSelectedInboundStudentIds(Array.from(new Set([...selectedInboundStudentIds, ...candidateIds])));
                                      } else {
                                        setSelectedInboundStudentIds(selectedInboundStudentIds.filter(id => !candidateIds.includes(id)));
                                      }
                                    }}
                                    className="rounded text-purple-600 cursor-pointer"
                                  />
                                </th>
                                <th className="p-2.5">Siswa</th>
                                <th className="p-2.5">Kelas Saat Ini</th>
                                <th className="p-2.5">L/P</th>
                                <th className="p-2.5 text-right">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {candidates.map(s => {
                                const isChecked = selectedInboundStudentIds.includes(s.id);
                                return (
                                  <tr
                                    key={s.id}
                                    className={`hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition ${
                                      isChecked ? 'bg-purple-50/70 dark:bg-purple-950/30' : ''
                                    }`}
                                  >
                                    <td className="p-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setSelectedInboundStudentIds([...selectedInboundStudentIds, s.id]);
                                          } else {
                                            setSelectedInboundStudentIds(selectedInboundStudentIds.filter(id => id !== s.id));
                                          }
                                        }}
                                        className="rounded text-purple-600 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-2.5">
                                      <div className="font-bold text-gray-900 dark:text-white">{s.nama_siswa}</div>
                                      <div className="text-[10px] text-gray-400">NISN: {s.nisn || '-'}</div>
                                    </td>
                                    <td className="p-2.5">
                                      {isUnassignedClass(s.kelas) ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                          Tanpa Rombel
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                          {s.kelas}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5">
                                      <span className="text-[10px] font-bold text-gray-500">
                                        {s.gender || '-'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleInboundAllocate([s.id], selectedClassForWorkspace.nama_kelas)}
                                        className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                                      >
                                        + Masukkan
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. STANDALONE UNALLOCATED STUDENTS DRAWER / MODAL       */}
      {/* ======================================================== */}
      {isUnassignedDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-800 animate-slideLeft">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-amber-50 dark:bg-amber-950/40 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Alokasi Siswa Tanpa Kelas
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Total {unassignedStudents.length} siswa aktif belum terdaftar di rombel manapun.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnassignedDrawerOpen(false);
                  setSelectedUnassignedStudentIds([]);
                }}
                className="w-8 h-8 rounded-xl bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700 cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <div className="relative flex-1">
                <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  value={unassignedSearch}
                  onChange={e => setUnassignedSearch(e.target.value)}
                  placeholder="Cari nama siswa atau NISN..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            {/* Target Class Selection & Batch Button */}
            {selectedUnassignedStudentIds.length > 0 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border-b border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
                  {selectedUnassignedStudentIds.length} Siswa Dipilih
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={unassignedTargetClass}
                    onChange={e => setUnassignedTargetClass(e.target.value)}
                    className="text-xs py-1.5 px-2.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800"
                  >
                    <option value="">-- Pilih Kelas Target --</option>
                    {allClassNames.map(c => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleInboundAllocate(selectedUnassignedStudentIds, unassignedTargetClass)}
                    disabled={!unassignedTargetClass || actionLoading}
                    className="clay-btn px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    Alokasikan
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filtered = unassignedStudents.filter(s => {
                  const q = unassignedSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    s.nama_siswa.toLowerCase().includes(q) ||
                    (s.nisn && s.nisn.toLowerCase().includes(q))
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-gray-500">
                      {unassignedSearch ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Seluruh siswa telah memiliki kelas!'}
                    </div>
                  );
                }

                const filteredIds = filtered.map(s => s.id);
                const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedUnassignedStudentIds.includes(id));

                return (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-[11px] uppercase font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="p-2.5 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedUnassignedStudentIds(Array.from(new Set([...selectedUnassignedStudentIds, ...filteredIds])));
                                } else {
                                  setSelectedUnassignedStudentIds(selectedUnassignedStudentIds.filter(id => !filteredIds.includes(id)));
                                }
                              }}
                              className="rounded text-purple-600 cursor-pointer"
                            />
                          </th>
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5">Gender</th>
                          <th className="p-2.5 text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filtered.map(s => {
                          const isChecked = selectedUnassignedStudentIds.includes(s.id);
                          return (
                            <tr key={s.id} className={`hover:bg-purple-50/50 ${isChecked ? 'bg-purple-50/70' : ''}`}>
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedUnassignedStudentIds([...selectedUnassignedStudentIds, s.id]);
                                    } else {
                                      setSelectedUnassignedStudentIds(selectedUnassignedStudentIds.filter(id => id !== s.id));
                                    }
                                  }}
                                  className="rounded text-purple-600 cursor-pointer"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-gray-900 dark:text-white">{s.nama_siswa}</div>
                                <div className="text-[10px] text-gray-400">NISN: {s.nisn || '-'}</div>
                              </td>
                              <td className="p-2.5">
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400">
                                  {s.gender || '-'}
                                </span>
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const { value: target } = await Swal.fire({
                                      title: 'Alokasikan Siswa',
                                      text: `Tentukan kelas untuk "${s.nama_siswa}":`,
                                      input: 'select',
                                      inputOptions: Object.fromEntries(
                                        allClassNames.map(c => [c, `Kelas ${c}`])
                                      ),
                                      showCancelButton: true,
                                      confirmButtonText: 'Tetapkan',
                                      confirmButtonColor: '#7C3AED',
                                      cancelButtonText: 'Batal'
                                    });
                                    if (target) {
                                      handleInboundAllocate([s.id], target);
                                    }
                                  }}
                                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                                >
                                  Pilih Kelas
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. NAIK KELAS / COHORT ADVANCEMENT MODAL                 */}
      {/* ======================================================== */}
      {isNaikKelasOpen && (
        <NaikKelasModal
          isOpen={isNaikKelasOpen}
          onClose={() => setIsNaikKelasOpen(false)}
          onSuccess={async () => {
            setIsNaikKelasOpen(false);
            await loadAllData();
          }}
          students={allStudents}
          sekolahId={sekolahId}
          role={user?.role}
        />
      )}
    </div>
  );
}
