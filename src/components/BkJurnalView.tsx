'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import { PrintHeader } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';

export interface BkJurnalViewProps {
  user: any;
  isReadOnly?: boolean;
  initialTab?: string;
}

export interface JurnalBkEntry {
  id: string;
  sekolah_id: string;
  guru_id?: string | null;
  user_id?: string | null;
  nama_guru: string;
  siswa_id?: string | null;
  nisn?: string | null;
  nama_siswa: string;
  kelas: string;
  tanggal: string;
  waktu: string;
  bidang_bimbingan: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
  jenis_layanan: string;
  sasaran?: string;
  tempat_layanan?: string;
  catatan: string;
  tindak_lanjut: string;
  status: 'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus';
  link_dokumen?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SiswaOption {
  id: string;
  nisn: string;
  nama_siswa: string;
  kelas: string;
  gender?: string;
}

const BIDANG_BIMBINGAN_OPTIONS: Array<'Pribadi' | 'Sosial' | 'Belajar' | 'Karir'> = [
  'Pribadi',
  'Sosial',
  'Belajar',
  'Karir'
];

const JENIS_LAYANAN_OPTIONS = [
  'Konseling Individual',
  'Konseling Kelompok',
  'Bimbingan Kelompok',
  'Konsultasi',
  'Mediasi',
  'Konferensi Kasus',
  'Kunjungan Rumah (Home Visit)',
  'Alih Tangan Kasus (Referral)',
  'Lainnya'
];

const STATUS_OPTIONS: Array<'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus'> = [
  'Dalam Penanganan',
  'Selesai',
  'Alih Tangan Kasus'
];

export default function BkJurnalView({
  user,
  isReadOnly = false,
  initialTab = 'riwayat'
}: BkJurnalViewProps) {
  const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
  const userId = user?.id || '';
  const counselorName = user?.nama || user?.name || 'Guru BK';

  const cacheKey = `sipjam_jurnal_bk_cache_${sekolahId}`;
  const draftKey = `sipjam_jurnal_bk_draft_${userId}`;

  // Tabs: 'riwayat' | 'input' | 'cetak'
  const [activeTab, setActiveTab] = useState<'riwayat' | 'input' | 'cetak'>(() => {
    if (isReadOnly) return 'riwayat';
    if (initialTab === 'input') return 'input';
    if (initialTab === 'cetak') return 'cetak';
    return 'riwayat';
  });

  // Data states
  const [entries, setEntries] = useState<JurnalBkEntry[]>([]);
  const [students, setStudents] = useState<SiswaOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const nowTimeStr = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  const [formData, setFormData] = useState<{
    siswa_id: string;
    nisn: string;
    nama_siswa: string;
    kelas: string;
    tanggal: string;
    waktu: string;
    bidang_bimbingan: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
    jenis_layanan: string;
    tempat_layanan: string;
    catatan: string;
    tindak_lanjut: string;
    status: 'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus';
  }>({
    siswa_id: '',
    nisn: '',
    nama_siswa: '',
    kelas: '',
    tanggal: todayStr,
    waktu: nowTimeStr,
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Konseling Individual',
    tempat_layanan: 'Ruang BK',
    catatan: '',
    tindak_lanjut: '',
    status: 'Dalam Penanganan'
  });

  // Student Search / Selection in Form
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [isSelectingStudent, setIsSelectingStudent] = useState<boolean>(false);

  // Filters in 'riwayat'
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterBidang, setFilterBidang] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCounselor, setFilterCounselor] = useState<string>('all');

  // Load entries from Supabase & fallback cache
  const loadEntries = useCallback(async () => {
    setLoading(true);
    let loaded: JurnalBkEntry[] = [];
    try {
      const { data, error } = await supabase
        .from('jurnal_bk')
        .select('*')
        .eq('sekolah_id', sekolahId)
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        if (isSchemaCacheOrMissingTableError(error)) {
          console.warn('[BkJurnalView] Table jurnal_bk not yet migrated/cached, reading localStorage cache:', error.message);
        } else {
          console.warn('[BkJurnalView] Error loading entries:', error.message);
        }
        // Fallback to local storage
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try { loaded = JSON.parse(cached); } catch (_) {}
          }
        }
      } else if (data) {
        loaded = data as JurnalBkEntry[];
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(loaded));
        }
      }
    } catch (err: any) {
      console.warn('[BkJurnalView] Exception loading entries:', err.message);
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try { loaded = JSON.parse(cached); } catch (_) {}
        }
      }
    } finally {
      setEntries(loaded);
      setLoading(false);
    }
  }, [cacheKey, sekolahId]);

  // Load students from data_siswa
  const loadStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('data_siswa')
        .select('id, nisn, nama_siswa, kelas, gender, status')
        .eq('sekolah_id', sekolahId)
        .order('kelas', { ascending: true })
        .order('nama_siswa', { ascending: true });

      if (!error && data) {
        setStudents(data as SiswaOption[]);
      }
    } catch (err) {
      console.warn('[BkJurnalView] Error loading data_siswa:', err);
    }
  }, [sekolahId]);

  // Initial load & Draft restoration
  useEffect(() => {
    loadEntries();
    loadStudents();

    // Restore draft if any and not editing
    if (!isReadOnly && typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && typeof parsed === 'object') {
            setFormData(prev => ({ ...prev, ...parsed }));
          }
        } catch (_) {}
      }
    }
  }, [draftKey, isReadOnly, loadEntries, loadStudents]);

  // Auto-save form draft
  useEffect(() => {
    if (isReadOnly || editingId || typeof window === 'undefined') return;
    const isTouched = formData.nama_siswa || formData.catatan || formData.tindak_lanjut;
    if (isTouched) {
      localStorage.setItem(draftKey, JSON.stringify(formData));
    }
  }, [formData, isReadOnly, editingId, draftKey]);

  // Available class list from students
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach(s => {
      if (s.kelas && s.kelas.trim()) set.add(s.kelas.trim());
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered student list for selector
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter(s => {
      const matchClass = studentClassFilter === 'all' || s.kelas === studentClassFilter;
      const matchSearch =
        !q ||
        (s.nama_siswa && s.nama_siswa.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.toLowerCase().includes(q));
      return matchClass && matchSearch;
    });
  }, [students, studentClassFilter, studentSearch]);

  // Unique counselors for filter
  const counselorOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.nama_guru) set.add(e.nama_guru.trim());
    });
    return Array.from(set).sort();
  }, [entries]);

  // Filtered Entries in 'riwayat'
  const filteredEntries = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    return entries.filter(e => {
      if (filterStartDate && e.tanggal < filterStartDate) return false;
      if (filterEndDate && e.tanggal > filterEndDate) return false;
      if (filterBidang !== 'all' && e.bidang_bimbingan !== filterBidang) return false;
      if (filterStatus !== 'all' && e.status !== filterStatus) return false;
      if (filterCounselor !== 'all' && e.nama_guru !== filterCounselor) return false;

      if (q) {
        const inStudent = (e.nama_siswa || '').toLowerCase().includes(q);
        const inNisn = (e.nisn || '').toLowerCase().includes(q);
        const inCatatan = (e.catatan || '').toLowerCase().includes(q);
        const inTindakLanjut = (e.tindak_lanjut || '').toLowerCase().includes(q);
        const inKelas = (e.kelas || '').toLowerCase().includes(q);
        return inStudent || inNisn || inCatatan || inTindakLanjut || inKelas;
      }
      return true;
    });
  }, [entries, filterStartDate, filterEndDate, filterBidang, filterStatus, filterCounselor, filterSearch]);

  // Handle student select
  const handleSelectStudent = (s: SiswaOption) => {
    setFormData(prev => ({
      ...prev,
      siswa_id: s.id,
      nisn: s.nisn || '',
      nama_siswa: s.nama_siswa,
      kelas: s.kelas
    }));
    setIsSelectingStudent(false);
    setStudentSearch('');
  };

  const handleClearStudent = () => {
    setFormData(prev => ({
      ...prev,
      siswa_id: '',
      nisn: '',
      nama_siswa: '',
      kelas: ''
    }));
    setIsSelectingStudent(true);
  };

  // Reset form
  const handleResetForm = () => {
    setFormData({
      siswa_id: '',
      nisn: '',
      nama_siswa: '',
      kelas: '',
      tanggal: todayStr,
      waktu: nowTimeStr,
      bidang_bimbingan: 'Pribadi',
      jenis_layanan: 'Konseling Individual',
      tempat_layanan: 'Ruang BK',
      catatan: '',
      tindak_lanjut: '',
      status: 'Dalam Penanganan'
    });
    setEditingId(null);
    setIsSelectingStudent(false);
    setStudentSearch('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }
  };

  // Submit Form (Create / Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      Swal.fire({
        icon: 'warning',
        title: 'Mode Peninjau',
        text: 'Aksi dinonaktifkan: Anda dalam mode peninjauan (read-only).'
      });
      return;
    }

    if (!formData.nama_siswa || !formData.kelas) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Siswa Belum Dipilih',
        text: 'Pilih siswa dari daftar siswa terlebih dahulu!'
      });
      return;
    }

    if (!formData.catatan.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Catatan Kasus Wajib Diisi',
        text: 'Tuliskan deskripsi permasalahan atau catatan layanan konseling.'
      });
      return;
    }

    if (!formData.tindak_lanjut.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Rencana Tindak Lanjut Wajib Diisi',
        text: 'Tuliskan rencana tindak lanjut atau kesepakatan bimbingan.'
      });
      return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();

    const recordPayload: Partial<JurnalBkEntry> = {
      sekolah_id: sekolahId,
      guru_id: userId || null,
      user_id: userId || null,
      nama_guru: counselorName,
      siswa_id: formData.siswa_id || null,
      nisn: formData.nisn || null,
      nama_siswa: formData.nama_siswa,
      kelas: formData.kelas,
      tanggal: formData.tanggal,
      waktu: formData.waktu,
      bidang_bimbingan: formData.bidang_bimbingan,
      jenis_layanan: formData.jenis_layanan,
      sasaran: formData.jenis_layanan.toLowerCase().includes('kelompok') ? 'Kelompok' : 'Individu',
      tempat_layanan: formData.tempat_layanan || 'Ruang BK',
      catatan: formData.catatan.trim(),
      tindak_lanjut: formData.tindak_lanjut.trim(),
      status: formData.status,
      updated_at: nowIso
    };

    try {
      if (editingId) {
        // UPDATE
        const { error } = await supabase
          .from('jurnal_bk')
          .update(recordPayload)
          .eq('id', editingId);

        if (error && !isSchemaCacheOrMissingTableError(error)) {
          throw error;
        }

        // Update local state & cache
        const updatedEntries = entries.map(item =>
          item.id === editingId ? { ...item, ...recordPayload, id: editingId } : item
        );
        setEntries(updatedEntries);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(updatedEntries));
        }

        Swal.fire({
          icon: 'success',
          title: 'Berhasil Diperbarui',
          text: 'Data jurnal konseling BK berhasil diperbarui.',
          timer: 1600,
          showConfirmButton: false
        });
      } else {
        // CREATE
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const insertRecord: JurnalBkEntry = {
          ...(recordPayload as JurnalBkEntry),
          id: newId,
          created_at: nowIso
        };

        const { error } = await supabase.from('jurnal_bk').insert([insertRecord]);
        if (error && !isSchemaCacheOrMissingTableError(error)) {
          throw error;
        }

        const updatedEntries = [insertRecord, ...entries];
        setEntries(updatedEntries);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(updatedEntries));
        }

        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan',
          text: 'Catatan bimbingan konseling berhasil disimpan.',
          timer: 1600,
          showConfirmButton: false
        });
      }

      handleResetForm();
      setActiveTab('riwayat');
    } catch (err: any) {
      console.error('[BkJurnalView] Save error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan jurnal BK.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Start Edit
  const handleStartEdit = (entry: JurnalBkEntry) => {
    if (isReadOnly) return;
    setEditingId(entry.id);
    setFormData({
      siswa_id: entry.siswa_id || '',
      nisn: entry.nisn || '',
      nama_siswa: entry.nama_siswa,
      kelas: entry.kelas,
      tanggal: entry.tanggal,
      waktu: entry.waktu,
      bidang_bimbingan: entry.bidang_bimbingan,
      jenis_layanan: entry.jenis_layanan,
      tempat_layanan: entry.tempat_layanan || 'Ruang BK',
      catatan: entry.catatan,
      tindak_lanjut: entry.tindak_lanjut,
      status: entry.status
    });
    setIsSelectingStudent(false);
    setActiveTab('input');
  };

  // Delete Entry with SweetAlert2 confirmation
  const handleDeleteEntry = async (entry: JurnalBkEntry) => {
    if (isReadOnly) return;
    const confirm = await Swal.fire({
      title: 'Hapus Jurnal BK?',
      html: `Hapus catatan bimbingan untuk <strong>${entry.nama_siswa}</strong> (${entry.tanggal})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (!confirm.isConfirmed) return;

    try {
      const { error } = await supabase.from('jurnal_bk').delete().eq('id', entry.id);
      if (error && !isSchemaCacheOrMissingTableError(error)) {
        throw error;
      }

      const updated = entries.filter(e => e.id !== entry.id);
      setEntries(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(updated));
      }

      Swal.fire({
        icon: 'success',
        title: 'Dihapus',
        text: 'Catatan bimbingan konseling berhasil dihapus.',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: err.message || 'Gagal menghapus entri jurnal BK.'
      });
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    if (status === 'Selesai') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60">
          Selesai
        </span>
      );
    }
    if (status === 'Alih Tangan Kasus') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/60">
          Alih Tangan Kasus
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/60">
        Dalam Penanganan
      </span>
    );
  };

  // Bidang Badge Helper
  const renderBidangBadge = (bidang: string) => {
    const colors: Record<string, string> = {
      Pribadi: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300/60',
      Sosial: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/60',
      Belajar: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300/60',
      Karir: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300/60'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[bidang] || 'bg-gray-100 text-gray-700'}`}>
        {bidang}
      </span>
    );
  };

  return (
    <div className="space-y-4 fade-in pb-12">
      {/* Read-Only Notice Banner for Kepala Sekolah */}
      {isReadOnly && (
        <div
          data-testid="readonly-notice"
          className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 shadow-xs"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-eye text-xs"></i>
          </div>
          <div>
            <span className="font-bold block">Mode Peninjauan (Monitoring Read-Only)</span>
            <span className="text-[11px] opacity-90">
              Akses pemantauan bimbingan konseling aktif. Aksi penambahan, pengeditan, dan penghapusan data jurnal dinonaktifkan.
            </span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-indigo-50 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-indigo-950/20 border-2 border-rose-200/80 dark:border-rose-800/60 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <i className="fa-solid fa-heart-pulse text-lg"></i>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Jurnal Bimbingan Konseling (BK)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300/60">
                Bebas Rombel & Jadwal
              </span>
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              Pencatatan layanan konseling individual, kelompok, mediasi, dan tindak lanjut perkembangan siswa.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 p-1 rounded-xl border border-rose-200/60 dark:border-rose-900/40">
          <button
            type="button"
            onClick={() => setActiveTab('riwayat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'riwayat'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left text-[11px]"></i>
            <span>Riwayat & Rekap</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {entries.length}
            </span>
          </button>

          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'input'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fa-solid ${editingId ? 'fa-pen-to-square' : 'fa-plus'} text-[11px]`}></i>
              <span>{editingId ? 'Edit Jurnal' : 'Catat Bimbingan'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('cetak')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'cetak'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <i className="fa-solid fa-print text-[11px]"></i>
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FORM INPUT / EDIT */}
      {activeTab === 'input' && !isReadOnly && (
        <div className="glass-card p-5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              <i className="fa-solid fa-clipboard-user text-rose-600"></i>
              <span>{editingId ? 'Ubah Catatan Konseling BK' : 'Formulir Catat Bimbingan Konseling'}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Batal Edit / Tambah Baru
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Universal Student Selector */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <i className="fa-solid fa-user-graduate text-rose-600"></i>
                  <span>Siswa yang Dibimbing <span className="text-red-500">*</span></span>
                </label>
                {formData.nama_siswa && (
                  <button
                    type="button"
                    onClick={handleClearStudent}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                    <span>Ganti Siswa</span>
                  </button>
                )}
              </div>

              {formData.nama_siswa ? (
                // Selected Student Card
                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                      {formData.nama_siswa.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">
                        {formData.nama_siswa}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        Kelas: <span className="font-bold text-gray-700 dark:text-gray-300">{formData.kelas}</span> &bull; NISN: {formData.nisn || '-'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Terpilih
                  </span>
                </div>
              ) : (
                // Student Picker Trigger & Live Search
                <div className="space-y-2">
                  <div className="flex flex-wrap sm:flex-nowrap gap-2">
                    <select
                      value={studentClassFilter}
                      onChange={e => setStudentClassFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                    >
                      <option value="all">Semua Kelas</option>
                      {availableClasses.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => {
                          setStudentSearch(e.target.value);
                          setIsSelectingStudent(true);
                        }}
                        onFocus={() => setIsSelectingStudent(true)}
                        placeholder="Ketik nama atau NISN siswa dari seluruh kelas..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* Student Search Dropdown */}
                  {isSelectingStudent && (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.slice(0, 30).map(s => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectStudent(s)}
                            className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white">{s.nama_siswa}</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-2 font-mono">
                                NISN: {s.nisn || '-'}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {s.kelas}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-gray-500">
                          Tidak ditemukan siswa yang cocok.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date, Time, Bidang, Layanan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Tanggal Bimbingan *
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={e => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Waktu Pelaksanaan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.waktu}
                  onChange={e => setFormData(prev => ({ ...prev, waktu: e.target.value }))}
                  placeholder="Contoh: 09:30 atau 09:30 - 10:15"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Bidang Bimbingan *
                </label>
                <select
                  value={formData.bidang_bimbingan}
                  onChange={e => setFormData(prev => ({ ...prev, bidang_bimbingan: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  {BIDANG_BIMBINGAN_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Jenis Layanan *
                </label>
                <select
                  value={formData.jenis_layanan}
                  onChange={e => setFormData(prev => ({ ...prev, jenis_layanan: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  {JENIS_LAYANAN_OPTIONS.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tempat & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Tempat Layanan
                </label>
                <input
                  type="text"
                  value={formData.tempat_layanan}
                  onChange={e => setFormData(prev => ({ ...prev, tempat_layanan: e.target.value }))}
                  placeholder="Contoh: Ruang BK, Kelas, Gazebo..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Status Penanganan *
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Catatan Kasus & Permasalahan */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Catatan Kasus / Uraian Bimbingan <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.catatan}
                onChange={e => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                placeholder="Uraikan gambaran permasalahan, keluhan siswa, latar belakang kasus, atau temuan konseling..."
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs leading-relaxed"
              ></textarea>
            </div>

            {/* Rencana Tindak Lanjut */}
            <div>
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                Rencana Tindak Lanjut / Kesepakatan <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.tindak_lanjut}
                onChange={e => setFormData(prev => ({ ...prev, tindak_lanjut: e.target.value }))}
                placeholder="Tuliskan kesepakatan bimbingan, komitmen siswa, jadwal sesi lanjutan, atau koordinasi dengan orang tua/wali kelas..."
                className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs leading-relaxed"
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={saving}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="clay-btn px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                <i className={`fa-solid ${saving ? 'fa-spinner animate-spin' : 'fa-floppy-disk'}`}></i>
                <span>{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Jurnal BK'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: RIWAYAT & REKAP */}
      {activeTab === 'riwayat' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="glass-card p-3 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-list-check"></i>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Total Sesi</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{entries.length}</span>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Penanganan</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {entries.filter(e => e.status === 'Dalam Penanganan').length}
                </span>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Selesai</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {entries.filter(e => e.status === 'Selesai').length}
                </span>
              </div>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-gray-200 dark:border-gray-800 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-share-from-square"></i>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">Alih Tangan</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {entries.filter(e => e.status === 'Alih Tangan Kasus').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
              {/* Search */}
              <div className="relative sm:col-span-2">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Cari nama siswa, NISN, kelas, atau kata kunci kasus..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
              </div>

              {/* Bidang */}
              <div>
                <select
                  value={filterBidang}
                  onChange={e => setFilterBidang(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  <option value="all">Semua Bidang</option>
                  {BIDANG_BIMBINGAN_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  <option value="all">Semua Status</option>
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Counselor Filter (if multi-counselor) */}
              <div>
                <select
                  value={filterCounselor}
                  onChange={e => setFilterCounselor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                >
                  <option value="all">Semua Guru BK</option>
                  {counselorOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Rentang Tanggal:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs"
                />
                {(filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Reset Tanggal
                  </button>
                )}
              </div>

              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                Menampilkan <strong>{filteredEntries.length}</strong> dari <strong>{entries.length}</strong> entri
              </div>
            </div>
          </div>

          {/* Entries Table */}
          <div className="glass-card rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-gray-500">
                <i className="fa-solid fa-spinner animate-spin mr-2"></i>
                Memuat catatan jurnal bimbingan konseling...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto text-lg">
                  <i className="fa-solid fa-folder-open"></i>
                </div>
                <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Belum ada catatan jurnal BK yang sesuai
                </div>
                <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                  {!isReadOnly
                    ? 'Klik tab "Catat Bimbingan" di atas untuk menambahkan sesi konseling siswa baru.'
                    : 'Tidak ada data bimbingan konseling pada filter yang dipilih.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-[11px]">
                      <th className="py-2.5 px-3">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3">Siswa & Kelas</th>
                      <th className="py-2.5 px-3">Layanan & Bidang</th>
                      <th className="py-2.5 px-3">Catatan Kasus / Bimbingan</th>
                      <th className="py-2.5 px-3">Rencana Tindak Lanjut</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Guru BK</th>
                      {!isReadOnly && <th className="py-2.5 px-3 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredEntries.map(item => (
                      <tr key={item.id} className="hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition">
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white font-mono text-[11px]">
                            {item.tanggal}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {item.waktu} &bull; {item.tempat_layanan || 'Ruang BK'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {item.nama_siswa}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Kelas: <span className="font-bold text-gray-700 dark:text-gray-300">{item.kelas}</span>
                            {item.nisn && <span className="font-mono"> &bull; {item.nisn}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap space-y-1">
                          <div className="font-semibold text-gray-800 dark:text-gray-200 text-[11px]">
                            {item.jenis_layanan}
                          </div>
                          <div>{renderBidangBadge(item.bidang_bimbingan)}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[11px] line-clamp-3 hover:line-clamp-none">
                            {item.catatan}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[11px] line-clamp-3 hover:line-clamp-none">
                            {item.tindak_lanjut}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                          {renderStatusBadge(item.status)}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-400">
                          {item.nama_guru}
                        </td>
                        {!isReadOnly && (
                          <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="btn-click p-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 dark:bg-purple-900/40 dark:text-purple-300 text-xs transition"
                                title="Edit jurnal BK"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item)}
                                className="btn-click p-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300 text-xs transition"
                                title="Hapus jurnal BK"
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CETAK DOKUMEN RESMI */}
      {activeTab === 'cetak' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
            <div>
              <h4 className="font-bold text-xs text-gray-900 dark:text-white">
                Pratinjau Cetak Laporan Bimbingan Konseling
              </h4>
              <p className="text-[11px] text-gray-500">
                Dokumen resmi rekapitulasi layanan BK sekolah untuk arsip dan pengesahan Kepala Sekolah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => triggerPrintWithGps()}
              className="clay-btn px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <i className="fa-solid fa-print"></i>
              <span>Cetak Sekarang</span>
            </button>
          </div>

          {/* Printable Layout Container */}
          <div className="bg-white text-black p-8 rounded-2xl shadow-sm border border-gray-300 print:border-none print:shadow-none print:p-0">
            <PrintHeader user={user} sekolahId={sekolahId} />

            <div className="text-center my-4">
              <h2 className="text-base font-bold uppercase tracking-wider underline">
                JURNAL KEGIATAN BIMBINGAN DAN KONSELING (BK)
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Tahun Ajaran Aktif &bull; Sesi Bimbingan Siswa Bebas Rombel
              </p>
            </div>

            <table className="w-full text-left border-collapse border border-black text-xs my-4">
              <thead>
                <tr className="bg-gray-100 border-b border-black text-center font-bold">
                  <th className="border border-black p-2 w-8">No</th>
                  <th className="border border-black p-2 w-24">Tanggal / Waktu</th>
                  <th className="border border-black p-2 w-36">Nama Siswa / Kelas</th>
                  <th className="border border-black p-2 w-32">Bidang / Layanan</th>
                  <th className="border border-black p-2">Catatan Kasus / Bimbingan</th>
                  <th className="border border-black p-2">Rencana Tindak Lanjut</th>
                  <th className="border border-black p-2 w-24">Status</th>
                  <th className="border border-black p-2 w-28">Guru BK</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e, idx) => (
                  <tr key={e.id} className="border-b border-black align-top">
                    <td className="border border-black p-2 text-center">{idx + 1}</td>
                    <td className="border border-black p-2">
                      <div className="font-bold">{e.tanggal}</div>
                      <div className="text-[10px] text-gray-600">{e.waktu}</div>
                    </td>
                    <td className="border border-black p-2">
                      <div className="font-bold">{e.nama_siswa}</div>
                      <div className="text-[10px]">Kelas: {e.kelas}</div>
                      {e.nisn && <div className="text-[9px] text-gray-600">NISN: {e.nisn}</div>}
                    </td>
                    <td className="border border-black p-2">
                      <div className="font-semibold">{e.jenis_layanan}</div>
                      <div className="text-[10px] text-gray-600">({e.bidang_bimbingan})</div>
                    </td>
                    <td className="border border-black p-2 text-[11px] leading-tight">{e.catatan}</td>
                    <td className="border border-black p-2 text-[11px] leading-tight">{e.tindak_lanjut}</td>
                    <td className="border border-black p-2 text-center text-[10px] font-bold">{e.status}</td>
                    <td className="border border-black p-2 text-[10px]">{e.nama_guru}</td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-xs italic">
                      Tidak ada entri data bimbingan konseling pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Signature Block */}
            <div className="mt-8 pt-4 flex items-center justify-between text-xs break-inside-avoid">
              <div className="text-center w-64">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah</p>
                <div className="h-20"></div>
                <p className="font-bold underline">___________________________</p>
                <p className="text-[11px]">NIP. ........................................</p>
              </div>

              <div className="text-center w-64">
                <p>Kota/Kabupaten, {todayStr}</p>
                <p className="font-bold">Guru Bimbingan Konseling (BK)</p>
                <div className="h-20"></div>
                <p className="font-bold underline">{counselorName}</p>
                <p className="text-[11px]">NIP. {user?.nip || '........................................'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
