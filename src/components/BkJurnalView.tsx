'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Swal from 'sweetalert2';
import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import CameraSelfieCapture from './CameraSelfieCapture';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimeStr } from '@/lib/wita';
import { evaluate7DayRepairWindow } from '@/lib/workflow';
import { transformGoogleDriveUrl, getGoogleDriveThumbnailUrl, isGoogleDriveUrl } from '@/lib/imageUrl';
import { generateCsvString, triggerCsvDownload } from '@/lib/csvExport';

export interface BkJurnalViewProps {
  user: any;
  isReadOnly?: boolean;
  initialTab?: string;
  statusKepalaSekolah?: string;
}

export interface PesertaDidikItem {
  id?: string;
  nisn?: string;
  nama_siswa: string;
  kelas: string;
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
  detail_layanan?: Record<string, any> | null;
  peserta_didik?: PesertaDidikItem[] | null;
  status_verifikasi?: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Dispensasi' | 'Diverifikasi' | string;
  catatan_admin?: string | null;
  alasan_penolakan?: string | null;
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

export interface DynamicFieldDef {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export const BK_SERVICE_CONFIGS: Record<string, {
  name: string;
  description: string;
  defaultBidang: 'Pribadi' | 'Sosial' | 'Belajar' | 'Karir';
  fields: DynamicFieldDef[];
}> = {
  'Layanan Orientasi': {
    name: 'Layanan Orientasi',
    description: 'Pengenalan lingkungan sekolah, fasilitas, aturan, dan staf bagi siswa baru/adaptasi.',
    defaultBidang: 'Sosial',
    fields: [
      { key: 'sasaran_orientasi', label: 'Sasaran Orientasi', placeholder: 'Contoh: Siswa Baru Kelas VII / Siswa Pindahan', type: 'text', required: true },
      { key: 'materi_orientasi', label: 'Materi / Topik Orientasi', placeholder: 'Contoh: Tata Tertib Sekolah, Fasilitas Belajar, Program BK', type: 'text', required: true },
      { key: 'pihak_terlibat', label: 'Pihak / Narasumber yang Dilibatkan', placeholder: 'Contoh: Kepala Sekolah, Wali Kelas, OSIS', type: 'text' }
    ]
  },
  'Layanan Informasi': {
    name: 'Layanan Informasi',
    description: 'Pemberian pemahaman dan data penting (pendidikan lanjutan, karier, beasiswa, pergaulan).',
    defaultBidang: 'Karir',
    fields: [
      { key: 'topik_informasi', label: 'Topik / Pokok Informasi', placeholder: 'Contoh: Jalur Masuk Perguruan Tinggi, Beasiswa, Bahaya Bullying', type: 'text', required: true },
      { key: 'media_layanan', label: 'Media / Format Penyampaian', placeholder: 'Contoh: Slide Presentasi, Brosur, Diskusi Klasikal', type: 'text' }
    ]
  },
  'Layanan Pembelajaran': {
    name: 'Layanan Pembelajaran',
    description: 'Pengembangan sikap, kebiasaan belajar efektif, dan mengatasi kesulitan belajar.',
    defaultBidang: 'Belajar',
    fields: [
      { key: 'kesulitan_belajar', label: 'Fokus Masalah / Kebiasaan Belajar', placeholder: 'Contoh: Kesulitan Konsentrasi, Manajemen Waktu, Motivasi Rendah', type: 'text', required: true },
      { key: 'mapel_terkait', label: 'Mata Pelajaran Terkait (Opsional)', placeholder: 'Contoh: Matematika, Bahasa Inggris', type: 'text' },
      { key: 'strategi_solusi', label: 'Strategi / Teknik Belajar yang Dilatih', placeholder: 'Contoh: Jadwal Belajar Terstruktur, Teknik Pomodoro', type: 'text' }
    ]
  },
  'Layanan Penempatan dan Penyaluran': {
    name: 'Layanan Penempatan dan Penyaluran',
    description: 'Penempatan siswa sesuai bakat dan kemampuan (kelas, peminatan, ekstrakurikuler, karier).',
    defaultBidang: 'Karir',
    fields: [
      { key: 'jenis_penempatan', label: 'Jenis Penempatan / Penyaluran', placeholder: 'Contoh: Peminatan IPA/IPS, Ekstrakurikuler Robotik, Posisi Duduk', type: 'text', required: true },
      { key: 'potensi_minat', label: 'Potensi / Minat yang Teridentifikasi', placeholder: 'Contoh: Bakat Logika-Matematis, Minat Olahraga', type: 'text' },
      { key: 'rekomendasi_penempatan', label: 'Rekomendasi Penempatan Final', placeholder: 'Contoh: Disalurkan ke Ekskul Pramuka & Kelas Peminatan Terfokus', type: 'text', required: true }
    ]
  },
  'Layanan Penguasaan Konten': {
    name: 'Layanan Penguasaan Konten',
    description: 'Penguasaan keterampilan/kompetensi tertentu (komunikasi asertif, manajemen emosi, etika).',
    defaultBidang: 'Pribadi',
    fields: [
      { key: 'konten_kompetensi', label: 'Kompetensi / Konten yang Dilatihkan', placeholder: 'Contoh: Keterampilan Asertif, Manajemen Stres, Etika Bermedsos', type: 'text', required: true },
      { key: 'metode_latihan', label: 'Metode Pelatihan / Latihan', placeholder: 'Contoh: Bermain Peran (Role Play), Simulasi, Lembar Kerja', type: 'text' }
    ]
  },
  'Layanan Konseling Perorangan (Individual)': {
    name: 'Layanan Konseling Perorangan (Individual)',
    description: 'Bantuan tatap muka intensif dan rahasia antara guru BK dan siswa untuk mengatasi masalah pribadi.',
    defaultBidang: 'Pribadi',
    fields: [
      { key: 'gejala_masalah', label: 'Gejala / Pokok Masalah Siswa', placeholder: 'Contoh: Kecemasan Berlebih, Konflik Keluarga, Penurunan Emosi', type: 'text', required: true },
      { key: 'pendekatan_konseling', label: 'Pendekatan / Teknik Konseling', placeholder: 'Contoh: Cognitive Behavior Therapy (CBT), Person-Centered', type: 'text' },
      { key: 'komitmen_konseli', label: 'Komitmen / Kontrak Konseli', placeholder: 'Contoh: Berkomitmen tidur tepat waktu dan berkonsultasi mingguan', type: 'text' }
    ]
  },
  'Layanan Bimbingan Kelompok': {
    name: 'Layanan Bimbingan Kelompok',
    description: 'Dinamika kelompok kecil (6-10 siswa) membahas topik umum preventif dan pengembangan diri.',
    defaultBidang: 'Sosial',
    fields: [
      { key: 'topik_kelompok', label: 'Topik Bahasan Kelompok', placeholder: 'Contoh: Membangun Percaya Diri di Depan Umum, Solidaritas Kelas', type: 'text', required: true },
      { key: 'daftar_anggota', label: 'Anggota Kelompok / Jumlah Peserta', placeholder: 'Contoh: 8 Siswa Perwakilan Kelas 8A', type: 'text' },
      { key: 'dinamika_kelompok', label: 'Catatan Dinamika & Partisipasi Kelompok', placeholder: 'Contoh: Semua anggota aktif mengemukakan pendapat secara terbuka', type: 'text' }
    ]
  },
  'Layanan Konseling Kelompok': {
    name: 'Layanan Konseling Kelompok',
    description: 'Dinamika kelompok untuk pemecahan masalah pribadi bersama dalam suasana saling percaya.',
    defaultBidang: 'Pribadi',
    fields: [
      { key: 'fokus_masalah_kelompok', label: 'Masalah Bersama yang Dibahas', placeholder: 'Contoh: Mengatasi Rasa Takut Gagal dalam Ujian Sekolah', type: 'text', required: true },
      { key: 'keterbukaan_anggota', label: 'Tingkat Keterbukaan & Kerahasiaan', placeholder: 'Contoh: Disepakati janji kerahasiaan bersama antar anggota', type: 'text' },
      { key: 'solusi_kelompok', label: 'Kesepakatan Solusi Bersama', placeholder: 'Contoh: Saling memberi umpan balik dan pendampingan sebaya', type: 'text' }
    ]
  },
  'Layanan Konsultasi': {
    name: 'Layanan Konsultasi',
    description: 'Konsultasi pihak ketiga (orang tua / guru mata pelajaran) kepada guru BK terkait siswa.',
    defaultBidang: 'Pribadi',
    fields: [
      { key: 'pihak_konsulti', label: 'Pihak yang Berkonsultasi (Konsulti)', placeholder: 'Contoh: Orang Tua / Wali Siswa, Guru Matematika, Wali Kelas', type: 'text', required: true },
      { key: 'nama_konsulti', label: 'Nama Lengkap Konsulti & Kontak', placeholder: 'Contoh: Ibu Rina (Orang Tua Siswa) / No. HP: 0812xxxx', type: 'text' },
      { key: 'arahan_rekomendasi', label: 'Arahan / Saran bagi Konsulti', placeholder: 'Contoh: Mengurangi screen time di rumah dan memberi apresiasi bertahap', type: 'text', required: true }
    ]
  },
  'Layanan Mediasi': {
    name: 'Layanan Mediasi',
    description: 'Guru BK bertindak sebagai penengah untuk menyelesaikan konflik antar siswa atau pihak lain.',
    defaultBidang: 'Sosial',
    fields: [
      { key: 'pihak_berkonflik', label: 'Pihak-Pihak yang Berselisih', placeholder: 'Contoh: Siswa A (Kelas 7B) dan Siswa B (Kelas 7C)', type: 'text', required: true },
      { key: 'akar_konflik', label: 'Akar Permasalahan / Pemicu Konflik', placeholder: 'Contoh: Kesalahpahaman perkataan di grup percakapan online', type: 'text', required: true },
      { key: 'kesepakatan_damai', label: 'Poin-Poin Kesepakatan Damai', placeholder: 'Contoh: Saling memaafkan, menghapus postingan, berjabat tangan', type: 'text', required: true }
    ]
  },
  'Layanan Advokasi': {
    name: 'Layanan Advokasi',
    description: 'Upaya guru BK melindungi hak-hak siswa yang terlanggar atau terhambat perkembangannya.',
    defaultBidang: 'Pribadi',
    fields: [
      { key: 'hak_terancam', label: 'Bentuk Hak Siswa yang Memerlukan Pembelaan', placeholder: 'Contoh: Hak Mengikuti Ujian yang Tertahan Masalah Administrasi', type: 'text', required: true },
      { key: 'pihak_terkait_advokasi', label: 'Pihak Terkait / Lembaga yang Dihubungi', placeholder: 'Contoh: Bagian Keuangan Sekolah, Komite Sekolah', type: 'text' },
      { key: 'tindakan_advokasi', label: 'Langkah Advokasi yang Dilakukan Guru BK', placeholder: 'Contoh: Mengajukan rekomendasi dispensasi resmi dengan jaminan BK', type: 'text', required: true }
    ]
  }
};

export function getCanonicalServiceName(layanan: string): string {
  if (!layanan) return '';
  const trimmed = layanan.trim();
  if (trimmed === 'Konseling Individual') return 'Layanan Konseling Perorangan (Individual)';
  if (trimmed === 'Konseling Kelompok') return 'Layanan Konseling Kelompok';
  if (trimmed === 'Bimbingan Kelompok') return 'Layanan Bimbingan Kelompok';
  if (trimmed === 'Konsultasi') return 'Layanan Konsultasi';
  if (trimmed === 'Mediasi') return 'Layanan Mediasi';
  return trimmed;
}

export const MULTI_STUDENT_SERVICES = new Set([
  'Layanan Bimbingan Kelompok',
  'Layanan Konseling Kelompok',
  'Layanan Mediasi',
  'Bimbingan Kelompok',
  'Konseling Kelompok',
  'Mediasi',
  'Konferensi Kasus'
]);

export function isMultiStudentService(layanan: string): boolean {
  if (!layanan) return false;
  const trimmed = layanan.trim();
  const canonical = getCanonicalServiceName(trimmed);
  const lower = trimmed.toLowerCase();
  return (
    MULTI_STUDENT_SERVICES.has(trimmed) ||
    MULTI_STUDENT_SERVICES.has(canonical) ||
    lower.includes('kelompok') ||
    lower.includes('mediasi')
  );
}

export const BIDANG_BIMBINGAN_OPTIONS: Array<'Pribadi' | 'Sosial' | 'Belajar' | 'Karir'> = [
  'Pribadi',
  'Sosial',
  'Belajar',
  'Karir'
];

export const RAW_JENIS_LAYANAN_OPTIONS: string[] = [
  'Layanan Orientasi',
  'Layanan Informasi',
  'Layanan Pembelajaran',
  'Layanan Penempatan dan Penyaluran',
  'Layanan Penguasaan Konten',
  'Layanan Konseling Perorangan (Individual)',
  'Layanan Bimbingan Kelompok',
  'Layanan Konseling Kelompok',
  'Layanan Konsultasi',
  'Layanan Mediasi',
  'Layanan Advokasi'
];

export const JENIS_LAYANAN_OPTIONS: string[] = RAW_JENIS_LAYANAN_OPTIONS.filter(opt =>
  opt.trim().toLowerCase().startsWith('layanan')
);

const STATUS_OPTIONS: Array<'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus'> = [
  'Dalam Penanganan',
  'Selesai',
  'Alih Tangan Kasus'
];

export default function BkJurnalView({
  user,
  isReadOnly = false,
  initialTab = 'riwayat',
  statusKepalaSekolah
}: BkJurnalViewProps) {
  const sekolahId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
  const userId = user?.id || '';
  const counselorName = (user?.nama || user?.name || 'Guru BK').trim();

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
  const todayStr = useMemo(() => getWitaDateStr(), []);
  const nowTimeStr = useMemo(() => getWitaTimeStr(), []);

  const [selectedStudents, setSelectedStudents] = useState<SiswaOption[]>([]);

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
    detail_layanan: Record<string, any>;
    catatan: string;
    tindak_lanjut: string;
    status: 'Dalam Penanganan' | 'Selesai' | 'Alih Tangan Kasus';
    link_dokumen: string;
  }>({
    siswa_id: '',
    nisn: '',
    nama_siswa: '',
    kelas: '',
    tanggal: todayStr,
    waktu: nowTimeStr,
    bidang_bimbingan: 'Pribadi',
    jenis_layanan: 'Layanan Konseling Perorangan (Individual)',
    tempat_layanan: 'Ruang BK',
    detail_layanan: {},
    catatan: '',
    tindak_lanjut: '',
    status: 'Dalam Penanganan',
    link_dokumen: ''
  });

  // Active dynamic service config
  const activeServiceConfig = useMemo(() => {
    return BK_SERVICE_CONFIGS[formData.jenis_layanan] || BK_SERVICE_CONFIGS[getCanonicalServiceName(formData.jenis_layanan)];
  }, [formData.jenis_layanan]);

  // Documentation States (Live Camera & File Upload)
  const [docMode, setDocMode] = useState<'none' | 'camera' | 'upload'>('none');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<boolean>(false);

  const handleDocConfirm = async (file: File, preview: string) => {
    setDocFile(file);
    setDocPreviewUrl(preview);
    setDocMode('none');
    setFormData(prev => ({ ...prev, link_dokumen: preview }));
  };

  // Student Search / Selection in Form
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentClassFilter, setStudentClassFilter] = useState<string>('all');
  const [isSelectingStudent, setIsSelectingStudent] = useState<boolean>(false);

  // Filters in 'riwayat'
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterBidang, setFilterBidang] = useState<string>('all');
  const [filterLayanan, setFilterLayanan] = useState<string>('all');
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
            if (Array.isArray(parsed._selectedStudents)) {
              setSelectedStudents(parsed._selectedStudents);
            }
          }
        } catch (_) {}
      }
    }
  }, [draftKey, isReadOnly, loadEntries, loadStudents]);

  // Realtime sync for jurnal_bk so Admin verification/rejection updates immediately for Guru BK
  useEffect(() => {
    let rtTimer: NodeJS.Timeout | null = null;
    const rtFilter = user?.sekolah_id ? { filter: `sekolah_id=eq.${user.sekolah_id}` } : {};
    const channel = supabase
      .channel(`realtime-bk-jurnal-${user?.id || user?.nama || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_bk', ...rtFilter }, () => {
        if (rtTimer) clearTimeout(rtTimer);
        rtTimer = setTimeout(() => {
          loadEntries();
        }, 600);
      })
      .subscribe();

    const handleBkUpdated = () => loadEntries();
    if (typeof window !== 'undefined') {
      window.addEventListener('sipjam:jurnal_bk_updated', handleBkUpdated);
    }

    return () => {
      if (rtTimer) clearTimeout(rtTimer);
      supabase.removeChannel(channel);
      if (typeof window !== 'undefined') {
        window.removeEventListener('sipjam:jurnal_bk_updated', handleBkUpdated);
      }
    };
  }, [user?.id, user?.nama, user?.sekolah_id, loadEntries]);

  // Auto-save form draft
  useEffect(() => {
    if (isReadOnly || editingId || typeof window === 'undefined') return;
    const hasDetail = formData.detail_layanan && Object.values(formData.detail_layanan).some(v => v && String(v).trim());
    const isTouched = formData.nama_siswa || formData.catatan || formData.tindak_lanjut || hasDetail || selectedStudents.length > 0;
    if (isTouched) {
      localStorage.setItem(draftKey, JSON.stringify({ ...formData, _selectedStudents: selectedStudents }));
    }
  }, [formData, selectedStudents, isReadOnly, editingId, draftKey]);

  // Synchronize selectedStudents to formData
  useEffect(() => {
    if (selectedStudents.length > 0) {
      const isMulti = isMultiStudentService(formData.jenis_layanan);
      if (isMulti) {
        const names = selectedStudents.map(s => s.nama_siswa).join(', ');
        const uniqueClasses = Array.from(new Set(selectedStudents.map(s => s.kelas).filter(Boolean))).join(', ');
        const nisns = selectedStudents.map(s => s.nisn).filter(Boolean).join(', ');
        setFormData(prev => ({
          ...prev,
          nama_siswa: names,
          kelas: uniqueClasses,
          nisn: nisns,
          siswa_id: selectedStudents[0]?.id || ''
        }));
      } else {
        const primary = selectedStudents[0];
        setFormData(prev => ({
          ...prev,
          nama_siswa: primary?.nama_siswa || '',
          kelas: primary?.kelas || '',
          nisn: primary?.nisn || '',
          siswa_id: primary?.id || ''
        }));
      }
    }
  }, [selectedStudents, formData.jenis_layanan]);

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
      if (filterLayanan !== 'all') {
        const canonical = getCanonicalServiceName(e.jenis_layanan);
        if (e.jenis_layanan !== filterLayanan && canonical !== filterLayanan) return false;
      }
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
  }, [entries, filterStartDate, filterEndDate, filterBidang, filterLayanan, filterStatus, filterCounselor, filterSearch]);

  // Export Filtered Entries to CSV
  const handleExportCsv = useCallback(() => {
    if (filteredEntries.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Data',
        text: 'Tidak ada data jurnal BK yang sesuai dengan filter aktif untuk diekspor.'
      });
      return;
    }

    const headers = [
      'No',
      'Tanggal',
      'Waktu',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Bidang Bimbingan',
      'Jenis Layanan',
      'Sasaran',
      'Tempat Layanan',
      'Detail Layanan',
      'Catatan Kasus',
      'Rencana Tindak Lanjut',
      'Status',
      'Status Verifikasi',
      'Guru BK',
      'Dokumentasi'
    ];

    const rows = filteredEntries.map((e, idx) => {
      let detailStr = '';
      if (e.detail_layanan && typeof e.detail_layanan === 'object') {
        detailStr = Object.entries(e.detail_layanan)
          .filter(([k, v]) => k !== 'peserta_didik' && typeof v === 'string' && Boolean(v.trim()))
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join('; ');
      }

      return [
        idx + 1,
        e.tanggal || '',
        e.waktu || '',
        e.nama_siswa || '',
        e.nisn ? `'${e.nisn}` : '',
        e.kelas || '',
        e.bidang_bimbingan || '',
        e.jenis_layanan || '',
        e.sasaran || (e.jenis_layanan.toLowerCase().includes('kelompok') ? 'Kelompok' : 'Individu'),
        e.tempat_layanan || 'Ruang BK',
        detailStr,
        e.catatan || '',
        e.tindak_lanjut || '',
        e.status || '',
        e.status_verifikasi || 'Menunggu',
        e.nama_guru || '',
        e.link_dokumen || ''
      ];
    });

    const csvContent = generateCsvString(headers, rows);
    const filename =
      filterStartDate || filterEndDate
        ? `Jurnal_BK_${filterStartDate || 'Awal'}_sd_${filterEndDate || 'Akhir'}.csv`
        : 'Jurnal_BK_Semua_Periode.csv';

    triggerCsvDownload(filename, csvContent);
  }, [filteredEntries, filterStartDate, filterEndDate]);

  // Multi-student selection handlers
  const handleToggleStudent = (s: SiswaOption) => {
    setSelectedStudents(prev => {
      const exists = prev.some(item => item.id === s.id);
      if (exists) {
        const next = prev.filter(item => item.id !== s.id);
        if (next.length === 0) {
          setFormData(f => ({ ...f, siswa_id: '', nisn: '', nama_siswa: '', kelas: '' }));
        }
        return next;
      } else {
        return [...prev, s];
      }
    });
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const next = prev.filter(item => item.id !== studentId);
      if (next.length === 0) {
        setFormData(f => ({ ...f, siswa_id: '', nisn: '', nama_siswa: '', kelas: '' }));
      }
      return next;
    });
  };

  // Handle student select
  const handleSelectStudent = (s: SiswaOption) => {
    const isMulti = isMultiStudentService(formData.jenis_layanan);
    if (isMulti) {
      handleToggleStudent(s);
    } else {
      setSelectedStudents([s]);
      setFormData(prev => ({
        ...prev,
        siswa_id: s.id,
        nisn: s.nisn || '',
        nama_siswa: s.nama_siswa,
        kelas: s.kelas
      }));
      setIsSelectingStudent(false);
      setStudentSearch('');
    }
  };

  const handleClearStudent = () => {
    setSelectedStudents([]);
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
    setSelectedStudents([]);
    setFormData({
      siswa_id: '',
      nisn: '',
      nama_siswa: '',
      kelas: '',
      tanggal: todayStr,
      waktu: nowTimeStr,
      bidang_bimbingan: 'Pribadi',
      jenis_layanan: 'Layanan Konseling Perorangan (Individual)',
      tempat_layanan: 'Ruang BK',
      detail_layanan: {},
      catatan: '',
      tindak_lanjut: '',
      status: 'Dalam Penanganan',
      link_dokumen: ''
    });
    setEditingId(null);
    setIsSelectingStudent(false);
    setStudentSearch('');
    setDocFile(null);
    setDocPreviewUrl(null);
    setDocMode('none');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(draftKey);
    }
  };

  // Handle Document Upload (image, pdf, doc)
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'Ukuran Berkas Terlalu Besar',
        text: 'Ukuran berkas maksimal adalah 10 MB.'
      });
      return;
    }

    setDocFile(file);
    if (file.type.startsWith('image/')) {
      const preview = URL.createObjectURL(file);
      setDocPreviewUrl(preview);
      setFormData(prev => ({ ...prev, link_dokumen: preview }));
    } else {
      setDocPreviewUrl(null);
      setFormData(prev => ({ ...prev, link_dokumen: file.name }));
    }
  };

  // View Document in Modal or New Tab
  const handleViewDocument = (item: JurnalBkEntry) => {
    if (!item.link_dokumen) return;
    const url = item.link_dokumen;
    const isImage = url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(url);
    if (isImage) {
      Swal.fire({
        title: `Dokumentasi: ${item.nama_siswa}`,
        text: `${item.tanggal} • ${item.jenis_layanan}`,
        imageUrl: url,
        imageAlt: 'Dokumentasi BK',
        imageWidth: 500,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#e11d48',
        showDenyButton: !url.startsWith('data:'),
        denyButtonText: 'Buka di Tab Baru'
      }).then(res => {
        if (res.isDenied && !url.startsWith('data:')) {
          window.open(url, '_blank');
        }
      });
    } else {
      window.open(url, '_blank');
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
        text: isMultiStudentService(formData.jenis_layanan)
          ? 'Silakan cari dan pilih minimal satu siswa untuk bimbingan kelompok.'
          : 'Pilih siswa dari daftar siswa terlebih dahulu!'
      });
      return;
    }

    if (!formData.catatan.trim()) {
      // Catatan is now optional
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

    let finalDocUrl: string | null = formData.link_dokumen?.trim() || null;
    if (docFile) {
      setIsUploadingDoc(true);
      try {
        const driveUrl = await uploadToDrive(docFile, counselorName, 'Jurnal BK', 'BK');
        if (driveUrl && !driveUrl.startsWith('gagal')) {
          finalDocUrl = driveUrl;
        }
      } catch (uploadErr) {
        console.warn('[BkJurnalView] uploadToDrive error, using local fallback:', uploadErr);
        if (docFile.type.startsWith('image/')) {
          finalDocUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsDataURL(docFile);
          });
        } else {
          finalDocUrl = `file:${docFile.name}`;
        }
      } finally {
        setIsUploadingDoc(false);
      }
    }

    const isMulti = isMultiStudentService(formData.jenis_layanan);
    const structuredPesertaDidik: PesertaDidikItem[] = selectedStudents.length > 0
      ? selectedStudents.map(s => ({
          id: s.id,
          nisn: s.nisn || '',
          nama_siswa: s.nama_siswa,
          kelas: s.kelas
        }))
      : [
          {
            id: formData.siswa_id || undefined,
            nisn: formData.nisn || '',
            nama_siswa: formData.nama_siswa,
            kelas: formData.kelas
          }
        ];

    const derivedSasaran = isMulti || formData.jenis_layanan.toLowerCase().includes('kelompok')
      ? 'Kelompok'
      : 'Individu';

    const detailLayananWithPeserta: Record<string, any> = {
      ...(formData.detail_layanan || {})
    };
    if (isMulti || structuredPesertaDidik.length > 1) {
      detailLayananWithPeserta.peserta_didik = structuredPesertaDidik;
    }

    const recordPayload: Partial<JurnalBkEntry> & { peserta_didik?: any } = {
      sekolah_id: sekolahId,
      guru_id: userId || null,
      user_id: userId || null,
      nama_guru: counselorName,
      siswa_id: formData.siswa_id || selectedStudents[0]?.id || null,
      nisn: formData.nisn || null,
      nama_siswa: formData.nama_siswa,
      kelas: formData.kelas,
      tanggal: formData.tanggal,
      waktu: formData.waktu,
      bidang_bimbingan: formData.bidang_bimbingan,
      jenis_layanan: formData.jenis_layanan,
      sasaran: derivedSasaran,
      tempat_layanan: formData.tempat_layanan || 'Ruang BK',
      detail_layanan: detailLayananWithPeserta,
      peserta_didik: structuredPesertaDidik,
      catatan: formData.catatan.trim(),
      tindak_lanjut: formData.tindak_lanjut.trim(),
      status: formData.status,
      link_dokumen: finalDocUrl,
      updated_at: nowIso
    };

    const editingEntry = editingId ? entries.find(e => e.id === editingId) : null;
    const isAutoVerifBkLengkap = Boolean(
      formData.bidang_bimbingan?.trim() &&
      formData.jenis_layanan?.trim() &&
      formData.catatan?.trim() &&
      formData.tindak_lanjut?.trim()
    );
    const autoVerifStatusBk: 'Disetujui' | 'Menunggu' = isAutoVerifBkLengkap ? 'Disetujui' : 'Menunggu';
    const shouldResetVerif = !editingId || editingEntry?.status_verifikasi === 'Ditolak';
    const verifPayload = shouldResetVerif
      ? { status_verifikasi: autoVerifStatusBk, catatan_admin: null, alasan_penolakan: null }
      : {};
    const payloadWithVerif = { ...recordPayload, ...verifPayload };
    const isMissingOptionalCol = (err: any) => {
      if (!err) return false;
      const code = String(err.code || '');
      const msg = String(err.message || '').toLowerCase();
      return (
        code === 'PGRST204' ||
        code === '42703' ||
        msg.includes('peserta_didik') ||
        msg.includes('detail_layanan') ||
        msg.includes('status_verifikasi') ||
        msg.includes('catatan_admin') ||
        msg.includes('alasan_penolakan')
      );
    };

    const recordPayloadNoPeserta = { ...recordPayload };
    delete recordPayloadNoPeserta.peserta_didik;
    const payloadWithVerifNoPeserta = { ...payloadWithVerif };
    delete payloadWithVerifNoPeserta.peserta_didik;

    const recordPayloadNoDetail = { ...recordPayloadNoPeserta };
    delete recordPayloadNoDetail.detail_layanan;
    const payloadWithVerifNoDetail = { ...payloadWithVerifNoPeserta };
    delete payloadWithVerifNoDetail.detail_layanan;

    try {
      if (editingId) {
        // UPDATE
        let { error } = await supabase
          .from('jurnal_bk')
          .update(payloadWithVerif)
          .eq('id', editingId);

        if (error && isMissingOptionalCol(error)) {
          let retryRes = await supabase
            .from('jurnal_bk')
            .update(payloadWithVerifNoPeserta)
            .eq('id', editingId);
          if (retryRes.error && isMissingOptionalCol(retryRes.error)) {
            retryRes = await supabase
              .from('jurnal_bk')
              .update(payloadWithVerifNoDetail)
              .eq('id', editingId);
            if (retryRes.error && isMissingOptionalCol(retryRes.error)) {
              retryRes = await supabase
                .from('jurnal_bk')
                .update(recordPayloadNoDetail)
                .eq('id', editingId);
            }
          }
          error = retryRes.error;
        }

        const savedLocallyOnly = Boolean(error && isSchemaCacheOrMissingTableError(error));
        if (error && !savedLocallyOnly) {
          throw error;
        }

        // Update local state & cache
        const updatedEntries = entries.map(item =>
          item.id === editingId ? { ...item, ...payloadWithVerif, id: editingId } : item
        );
        setEntries(updatedEntries);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(updatedEntries));
          window.dispatchEvent(new CustomEvent('sipjam:jurnal_bk_updated'));
        }

        if (savedLocallyOnly) {
          Swal.fire({
            icon: 'warning',
            title: 'Tersimpan di Cache Lokal',
            text: 'Tabel jurnal_bk belum tersedia di server sekolah ini sehingga pembaruan baru tersimpan sementara di perangkat Anda dan belum dapat dibaca Admin.'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Diperbarui',
            text: 'Data jurnal konseling BK berhasil diperbarui.',
            timer: 1600,
            showConfirmButton: false
          });
        }
      } else {
        // CREATE
        const newId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `bk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const insertRecord: JurnalBkEntry = {
          ...(payloadWithVerif as JurnalBkEntry),
          id: newId,
          created_at: nowIso
        };

        let { error } = await supabase.from('jurnal_bk').insert([insertRecord]);
        if (error && isMissingOptionalCol(error)) {
          const fallbackWithVerifNoPeserta: any = { ...insertRecord };
          delete fallbackWithVerifNoPeserta.peserta_didik;
          let retryRes = await supabase.from('jurnal_bk').insert([fallbackWithVerifNoPeserta]);
          if (retryRes.error && isMissingOptionalCol(retryRes.error)) {
            const fallbackWithVerif: any = { ...fallbackWithVerifNoPeserta };
            delete fallbackWithVerif.detail_layanan;
            retryRes = await supabase.from('jurnal_bk').insert([fallbackWithVerif]);
            if (retryRes.error && isMissingOptionalCol(retryRes.error)) {
              const fallbackRecordPayload: any = {
                ...recordPayloadNoDetail,
                id: newId,
                created_at: nowIso
              };
              retryRes = await supabase.from('jurnal_bk').insert([fallbackRecordPayload]);
            }
          }
          error = retryRes.error;
        }
        const savedLocallyOnly = Boolean(error && isSchemaCacheOrMissingTableError(error));
        if (error && !savedLocallyOnly) {
          throw error;
        }

        const updatedEntries = [insertRecord, ...entries];
        setEntries(updatedEntries);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(updatedEntries));
          window.dispatchEvent(new CustomEvent('sipjam:jurnal_bk_updated'));
        }

        if (savedLocallyOnly) {
          Swal.fire({
            icon: 'warning',
            title: 'Tersimpan di Cache Lokal',
            text: 'Tabel jurnal_bk belum tersedia di server sekolah ini sehingga catatan baru tersimpan di perangkat Anda dan belum dapat terbaca di akun Admin.'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan',
            text: 'Catatan bimbingan konseling berhasil disimpan.',
            timer: 1600,
            showConfirmButton: false
          });
        }
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
    if (entry.status_verifikasi === 'Ditolak') {
      const win = evaluate7DayRepairWindow(entry.updated_at || entry.tanggal);
      if (!win.isWithinWindow) {
        Swal.fire({
          icon: 'warning',
          title: 'Masa Perbaikan Berakhir',
          text: `Batas waktu perbaikan 7 hari berjalan setelah penolakan (s/d ${win.deadlineDate}) telah berakhir. Hubungi Admin untuk Dispensasi.`
        });
        return;
      }
    }
    setEditingId(entry.id);
    const canonicalService = getCanonicalServiceName(entry.jenis_layanan) || entry.jenis_layanan;

    // Reconstruct selectedStudents
    let reconstructedStudents: SiswaOption[] = [];
    if (Array.isArray(entry.peserta_didik) && entry.peserta_didik.length > 0) {
      reconstructedStudents = entry.peserta_didik.map((p, idx) => ({
        id: p.id || `reconstructed-${idx}-${p.nama_siswa}`,
        nama_siswa: p.nama_siswa,
        kelas: p.kelas || '',
        nisn: p.nisn || ''
      }));
    } else if (entry.detail_layanan?.peserta_didik && Array.isArray(entry.detail_layanan.peserta_didik) && entry.detail_layanan.peserta_didik.length > 0) {
      reconstructedStudents = (entry.detail_layanan.peserta_didik as any[]).map((p, idx) => ({
        id: p.id || `reconstructed-${idx}-${p.nama_siswa}`,
        nama_siswa: p.nama_siswa,
        kelas: p.kelas || '',
        nisn: p.nisn || ''
      }));
    } else if (isMultiStudentService(entry.jenis_layanan) && entry.nama_siswa && entry.nama_siswa.includes(',')) {
      const names = entry.nama_siswa.split(',').map(n => n.trim()).filter(Boolean);
      const classes = entry.kelas ? entry.kelas.split(',').map(c => c.trim()).filter(Boolean) : [];
      const nisns = entry.nisn ? entry.nisn.split(',').map(n => n.trim()).filter(Boolean) : [];
      reconstructedStudents = names.map((name, idx) => {
        const matched = students.find(s => s.nama_siswa.toLowerCase() === name.toLowerCase());
        if (matched) return matched;
        return {
          id: idx === 0 && entry.siswa_id ? entry.siswa_id : `legacy-${idx}-${name}`,
          nama_siswa: name,
          kelas: classes[idx] || classes[0] || entry.kelas || '',
          nisn: nisns[idx] || (idx === 0 ? entry.nisn || '' : '')
        };
      });
    } else if (entry.nama_siswa) {
      const matched = students.find(s => (entry.siswa_id && s.id === entry.siswa_id) || s.nama_siswa.toLowerCase() === entry.nama_siswa.toLowerCase());
      reconstructedStudents = [
        matched || {
          id: entry.siswa_id || 'manual',
          nama_siswa: entry.nama_siswa,
          kelas: entry.kelas,
          nisn: entry.nisn || ''
        }
      ];
    }
    setSelectedStudents(reconstructedStudents);

    setFormData({
      siswa_id: entry.siswa_id || (reconstructedStudents[0]?.id || ''),
      nisn: entry.nisn || (reconstructedStudents[0]?.nisn || ''),
      nama_siswa: entry.nama_siswa,
      kelas: entry.kelas,
      tanggal: entry.tanggal,
      waktu: entry.waktu,
      bidang_bimbingan: entry.bidang_bimbingan,
      jenis_layanan: canonicalService,
      tempat_layanan: entry.tempat_layanan || 'Ruang BK',
      detail_layanan: entry.detail_layanan && typeof entry.detail_layanan === 'object' ? { ...entry.detail_layanan } : {},
      catatan: entry.catatan,
      tindak_lanjut: entry.tindak_lanjut,
      status: entry.status,
      link_dokumen: entry.link_dokumen || ''
    });
    setDocFile(null);
    setDocPreviewUrl(entry.link_dokumen || null);
    setDocMode(entry.link_dokumen ? 'upload' : 'none');
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
        window.dispatchEvent(new CustomEvent('sipjam:jurnal_bk_updated'));
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
      Pribadi: 'bg-teal-500/15 text-[#0F766E] dark:text-teal-300 border-teal-500/30',
      Sosial: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300/60',
      Belajar: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300/60',
      Karir: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors[bidang] || 'bg-slate-400/15 text-[#334155] dark:text-[#CBD5E1]'}`}>
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
          className="mb-4 p-3 rounded-2xl neu-inset border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
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
      <div className="neu-card-sm p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center shrink-0">
            <i className="fa-solid fa-heart-pulse text-lg"></i>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
              <span>Jurnal Bimbingan Konseling (BK)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20 dark:border-[#14B8A6]/25">
                Bebas Rombel & Jadwal
              </span>
            </h2>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
              Pencatatan layanan konseling individual, kelompok, mediasi, dan tindak lanjut perkembangan siswa.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div role="tablist" aria-label="Menu Jurnal Bimbingan Konseling" className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 neu-inset p-2 rounded-2xl max-w-full">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'riwayat'}
            onClick={() => setActiveTab('riwayat')}
            className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'riwayat'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-clock-rotate-left text-[11px]"></i>
            <span>Riwayat & Rekap</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-num ${activeTab === 'riwayat' ? 'bg-white/20 text-white' : 'neu-inset text-[#0F766E] dark:text-[#14B8A6]'}`}>
              {entries.length}
            </span>
          </button>

          {!isReadOnly && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'input'}
              onClick={() => setActiveTab('input')}
              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'input'
                  ? 'neu-btn neu-btn-primary text-white'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
              }`}
            >
              <i className={`fa-solid ${editingId ? 'fa-pen-to-square' : 'fa-plus'} text-[11px]`}></i>
              <span>{editingId ? 'Edit Jurnal' : 'Catat Bimbingan'}</span>
            </button>
          )}

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'cetak'}
            onClick={() => setActiveTab('cetak')}
            className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cetak'
                ? 'neu-btn neu-btn-primary text-white'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <i className="fa-solid fa-print text-[11px]"></i>
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FORM INPUT / EDIT */}
      {activeTab === 'input' && !isReadOnly && (
        <div className="neu-card p-5 sm:p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-300/50 dark:border-slate-700/50 pb-3">
            <h3 className="font-bold text-sm text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
              <i className="fa-solid fa-clipboard-user text-[#0F766E] dark:text-[#14B8A6]"></i>
              <span>{editingId ? 'Ubah Catatan Konseling BK' : 'Formulir Catat Bimbingan Konseling'}</span>
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={handleResetForm}
                className="text-xs text-[#0F766E] dark:text-[#14B8A6] hover:underline font-semibold min-h-[36px] px-2"
              >
                Batal Edit / Tambah Baru
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            {/* Universal Student Selector */}
            {(() => {
              const isMultiStudent = isMultiStudentService(formData.jenis_layanan);
              return (
                <div className="p-4 rounded-2xl neu-inset space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                      <i className={`fa-solid ${isMultiStudent ? 'fa-users text-[#0F766E] dark:text-[#14B8A6]' : 'fa-user-graduate text-[#0F766E] dark:text-[#14B8A6]'}`}></i>
                      <span>
                        {isMultiStudent ? 'Siswa yang Dibimbing (Multi-Siswa / Kelompok)' : 'Siswa yang Dibimbing'}{' '}
                        <span className="text-rose-500">*</span>
                      </span>
                    </label>
                    {(selectedStudents.length > 0 || formData.nama_siswa) && (
                      <button
                        type="button"
                        onClick={handleClearStudent}
                        className="text-[11px] text-[#0F766E] dark:text-[#14B8A6] hover:underline font-bold flex items-center gap-1 cursor-pointer min-h-[36px] px-2"
                      >
                        <i className="fa-solid fa-arrows-rotate text-[10px]"></i>
                        <span>{isMultiStudent ? 'Reset Pilihan Siswa' : 'Ganti Siswa'}</span>
                      </button>
                    )}
                  </div>

                  {isMultiStudent ? (
                    // Multi-Student Mode UI
                    <div className="space-y-2.5">
                      {/* Selected Students Chips Display */}
                      {selectedStudents.length > 0 ? (
                        <div className="p-3 neu-card-sm rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                              Siswa Terpilih (<span className="font-num">{selectedStudents.length}</span>):
                            </span>
                            <span className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                              Dapat memilih lintas kelas
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedStudents.map(s => (
                              <div
                                key={s.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg neu-inset text-xs"
                              >
                                <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{s.nama_siswa}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6] font-semibold font-num">
                                  {s.kelas}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStudent(s.id)}
                                  className="text-[#475569] hover:text-rose-600 dark:text-[#94A3B8] dark:hover:text-rose-400 ml-0.5 transition cursor-pointer p-1"
                                  title={`Hapus ${s.nama_siswa}`}
                                >
                                  <i className="fa-solid fa-xmark text-xs"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 neu-card-sm rounded-xl border border-dashed border-slate-400/50 dark:border-slate-600/50 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
                          Belum ada siswa dipilih. Gunakan pencarian di bawah untuk memilih siswa bimbingan kelompok.
                        </div>
                      )}

                      {/* Multi-Student Picker & Live Search */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <select
                            value={studentClassFilter}
                            onChange={e => setStudentClassFilter(e.target.value)}
                            className="neu-input px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                          >
                            <option value="all">Semua Kelas</option>
                            {availableClasses.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>

                          <div className="relative flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
                            <input
                              type="text"
                              value={studentSearch}
                              onChange={e => {
                                setStudentSearch(e.target.value);
                                setIsSelectingStudent(true);
                              }}
                              onFocus={() => setIsSelectingStudent(true)}
                              placeholder="Cari nama atau NISN siswa untuk ditambahkan ke kelompok..."
                              className="neu-input w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        {/* Multi-Student List Dropdown */}
                        {(isSelectingStudent || selectedStudents.length === 0) && (
                          <div className="max-h-48 overflow-y-auto rounded-xl neu-card-sm p-2 space-y-1 custom-scroll">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.slice(0, 30).map(s => {
                                const isSelected = selectedStudents.some(item => item.id === s.id);
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => handleToggleStudent(s)}
                                    className={`p-2.5 min-h-[40px] rounded-lg hover:bg-[#0F766E]/10 dark:hover:bg-[#14B8A6]/15 cursor-pointer flex items-center justify-between text-xs transition ${
                                      isSelected ? 'bg-[#0F766E]/15 dark:bg-[#14B8A6]/20' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        className="rounded accent-[#0F766E] dark:accent-[#14B8A6] h-4 w-4 pointer-events-none"
                                      />
                                      <div>
                                        <span className={`font-bold ${isSelected ? 'text-[#0F766E] dark:text-[#14B8A6]' : 'text-[#0F172A] dark:text-[#F1F5F9]'}`}>
                                          {s.nama_siswa}
                                        </span>
                                        <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] ml-2 font-num">
                                          NISN: {s.nisn || '-'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold font-num px-2 py-0.5 rounded-md neu-inset text-[#334155] dark:text-[#CBD5E1]">
                                        {s.kelas}
                                      </span>
                                      {isSelected && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                          Dipilih
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="p-3 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
                                Tidak ditemukan siswa yang cocok.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Single-Student Mode UI
                    formData.nama_siswa && !isSelectingStudent ? (
                      // Selected Student Card
                      <div className="p-3 neu-card-sm rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center font-bold text-xs">
                            {formData.nama_siswa.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                              {formData.nama_siswa}
                            </div>
                            <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-num">
                              Kelas: <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{formData.kelas}</span> &bull; NISN: {formData.nisn || '-'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
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
                            className="neu-input px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                          >
                            <option value="all">Semua Kelas</option>
                            {availableClasses.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>

                          <div className="relative flex-1">
                            <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
                            <input
                              type="text"
                              value={studentSearch}
                              onChange={e => {
                                setStudentSearch(e.target.value);
                                setIsSelectingStudent(true);
                              }}
                              onFocus={() => setIsSelectingStudent(true)}
                              placeholder="Ketik nama atau NISN siswa dari seluruh kelas..."
                              className="neu-input w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl text-xs"
                            />
                          </div>
                        </div>

                        {/* Student Search Dropdown */}
                        {isSelectingStudent && (
                          <div className="max-h-48 overflow-y-auto rounded-xl neu-card-sm p-2 space-y-1 custom-scroll">
                            {filteredStudents.length > 0 ? (
                              filteredStudents.slice(0, 30).map(s => (
                                <div
                                  key={s.id}
                                  onClick={() => handleSelectStudent(s)}
                                  className="p-2.5 min-h-[40px] rounded-lg hover:bg-[#0F766E]/10 dark:hover:bg-[#14B8A6]/15 cursor-pointer flex items-center justify-between text-xs transition"
                                >
                                  <div>
                                    <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">{s.nama_siswa}</span>
                                    <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] ml-2 font-num">
                                      NISN: {s.nisn || '-'}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold font-num px-2 py-0.5 rounded-md neu-inset text-[#334155] dark:text-[#CBD5E1]">
                                    {s.kelas}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
                                Tidak ditemukan siswa yang cocok.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            })()}

            {/* Date, Time, Bidang, Layanan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Tanggal Bimbingan *
                </label>
                <input
                  type="date"
                  required
                  value={formData.tanggal}
                  onChange={e => setFormData(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold font-num"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Waktu Pelaksanaan *
                </label>
                <input
                  type="text"
                  required
                  value={formData.waktu}
                  onChange={e => setFormData(prev => ({ ...prev, waktu: e.target.value }))}
                  placeholder="Contoh: 09:30 atau 09:30 - 10:15"
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-num"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Bidang Bimbingan *
                </label>
                <select
                  value={formData.bidang_bimbingan}
                  onChange={e => setFormData(prev => ({ ...prev, bidang_bimbingan: e.target.value as any }))}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                >
                  {BIDANG_BIMBINGAN_OPTIONS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Jenis Layanan *
                </label>
                <select
                  value={formData.jenis_layanan}
                  onChange={e => {
                    const selected = e.target.value;
                    const cfg = BK_SERVICE_CONFIGS[selected] || BK_SERVICE_CONFIGS[getCanonicalServiceName(selected)];
                    const newlyMulti = isMultiStudentService(selected);
                    const previouslyMulti = isMultiStudentService(formData.jenis_layanan);

                    if (!newlyMulti && previouslyMulti && selectedStudents.length > 1) {
                      setSelectedStudents(prev => prev.slice(0, 1));
                    }

                    // Auto-fill dynamic group field if empty
                    const updatedDetail = { ...formData.detail_layanan };
                    if (selected === 'Layanan Bimbingan Kelompok' && !updatedDetail.daftar_anggota && selectedStudents.length > 0) {
                      updatedDetail.daftar_anggota = selectedStudents.map(s => `${s.nama_siswa} (${s.kelas})`).join(', ');
                    }
                    if (selected === 'Layanan Mediasi' && !updatedDetail.pihak_berkonflik && selectedStudents.length > 0) {
                      updatedDetail.pihak_berkonflik = selectedStudents.map(s => `${s.nama_siswa} (${s.kelas})`).join(' dan ');
                    }

                    setFormData(prev => ({
                      ...prev,
                      jenis_layanan: selected,
                      bidang_bimbingan: cfg?.defaultBidang || prev.bidang_bimbingan,
                      detail_layanan: updatedDetail
                    }));
                  }}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
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
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Tempat Layanan
                </label>
                <input
                  type="text"
                  value={formData.tempat_layanan}
                  onChange={e => setFormData(prev => ({ ...prev, tempat_layanan: e.target.value }))}
                  placeholder="Contoh: Ruang BK, Kelas, Gazebo..."
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Status Penanganan *
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Fields for 11 BK Services */}
            {activeServiceConfig && activeServiceConfig.fields.length > 0 && (
              <div className="p-4 rounded-2xl neu-inset space-y-3">
                <div className="flex items-center justify-between border-b border-slate-300/50 dark:border-slate-700/50 pb-2">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                    <i className="fa-solid fa-sliders text-[#0F766E] dark:text-[#14B8A6]"></i>
                    <span>Detail Khusus Layanan: {activeServiceConfig.name}</span>
                  </label>
                  <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] italic hidden sm:inline">
                    {activeServiceConfig.description}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {activeServiceConfig.fields.map(f => (
                    <div
                      key={f.key}
                      className={
                        f.key === 'dinamika_kelompok' ||
                        f.key === 'komitmen_konseli' ||
                        f.key === 'solusi_kelompok' ||
                        f.key === 'tindakan_advokasi' ||
                        f.key === 'kesepakatan_damai' ||
                        f.key === 'arahan_rekomendasi'
                          ? 'sm:col-span-2 lg:col-span-3'
                          : ''
                      }
                    >
                      <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                        {f.label} {f.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.detail_layanan?.[f.key] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            detail_layanan: {
                              ...(prev.detail_layanan || {}),
                              [f.key]: val
                            }
                          }));
                        }}
                        placeholder={f.placeholder}
                        className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Catatan Kasus & Permasalahan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Catatan Kasus / Uraian Bimbingan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.catatan}
                  onChange={e => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                  placeholder="Uraikan gambaran permasalahan, keluhan siswa, latar belakang kasus, atau temuan konseling..."
                  className="neu-input w-full p-3 rounded-xl text-xs leading-relaxed"
                ></textarea>
              </div>

              {/* Documentation Section */}
              <div>
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                  Dokumentasi
                </label>
                <div className="flex gap-2 mb-2 neu-inset p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setDocMode('camera')}
                    className={`flex-1 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition ${
                      docMode === 'camera'
                        ? 'neu-btn neu-btn-primary text-white'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    <i className="fa-solid fa-camera mr-2"></i> Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocMode('upload')}
                    className={`flex-1 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition ${
                      docMode === 'upload'
                        ? 'neu-btn neu-btn-primary text-white'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                    }`}
                  >
                    <i className="fa-solid fa-upload mr-2"></i> Unggah
                  </button>
                </div>

                {docMode === 'camera' && (
                  <div className="mb-2">
                    <CameraSelfieCapture
                      onPhotoConfirmed={handleDocConfirm}
                      onCancel={() => setDocMode('none')}
                      orientation="landscape"
                    />
                  </div>
                )}

                {docMode === 'upload' && (
                  <div className="mb-2 p-3 rounded-xl neu-inset border border-dashed border-slate-400/50 dark:border-slate-600/50">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleDocUpload}
                      className="text-xs text-[#475569] dark:text-[#94A3B8] w-full"
                    />
                  </div>
                )}
                
                {docPreviewUrl && (
                  <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
                    <i className="fa-solid fa-check-circle"></i> Berkas terpilih: {docFile?.name || 'Foto'}
                  </div>
                )}
              </div>
            </div>

            {/* Rencana Tindak Lanjut */}
            <div>
              <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                Rencana Tindak Lanjut / Kesepakatan <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.tindak_lanjut}
                onChange={e => setFormData(prev => ({ ...prev, tindak_lanjut: e.target.value }))}
                placeholder="Tuliskan kesepakatan bimbingan, komitmen siswa, jadwal sesi lanjutan, atau koordinasi dengan orang tua/wali kelas..."
                className="neu-input w-full p-3 rounded-xl text-xs leading-relaxed"
              ></textarea>
            </div>

            {/* Dokumentasi Bimbingan Konseling (Live Camera & Upload Dokumen) */}
            <div className="space-y-2 pt-2 border-t border-slate-300/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1.5">
                  <i className="fa-solid fa-camera-retro text-[#0F766E] dark:text-[#14B8A6]"></i>
                  <span>Dokumentasi Layanan BK</span>
                  <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-normal">(Foto Live atau Upload Dokumen)</span>
                </label>
                {formData.link_dokumen && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <i className="fa-solid fa-circle-check"></i> Berkas Terlampir
                  </span>
                )}
              </div>

              {/* Mode Selector Toggle */}
              <div className="flex rounded-2xl neu-inset p-1.5 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDocMode(prev => prev === 'camera' ? 'none' : 'camera')}
                  className={`flex-1 py-2 min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                    docMode === 'camera'
                      ? 'neu-btn neu-btn-primary text-white'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <i className="fa-solid fa-camera"></i> Kamera Live
                </button>
                <button
                  type="button"
                  onClick={() => setDocMode(prev => prev === 'upload' ? 'none' : 'upload')}
                  className={`flex-1 py-2 min-h-[40px] rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                    docMode === 'upload'
                      ? 'neu-btn neu-btn-primary text-white'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                  }`}
                >
                  <i className="fa-solid fa-file-arrow-up"></i> Upload Dokumen / Foto
                </button>
              </div>

              {/* Kamera Live Mode */}
              {docMode === 'camera' && (
                <div className="rounded-2xl overflow-hidden neu-inset p-2">
                  <CameraSelfieCapture
                    key="cam-jurnal-bk"
                    initialFacingMode="environment"
                    orientation="landscape"
                    existingPhotoUrl={docPreviewUrl}
                    onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                      setDocFile(capturedFile);
                      setDocPreviewUrl(previewUrl);
                      setFormData(prev => ({ ...prev, link_dokumen: previewUrl }));
                    }}
                    onRetake={() => {
                      setDocFile(null);
                      setDocPreviewUrl(null);
                      setFormData(prev => ({ ...prev, link_dokumen: '' }));
                    }}
                    onCancel={() => setDocMode('none')}
                  />
                </div>
              )}

              {/* Upload Dokumen Mode */}
              {docMode === 'upload' && (
                <div className="space-y-2">
                  <label
                    htmlFor="jurnal-bk-doc-file-input"
                    className="neu-inset border-2 border-dashed border-slate-400/50 dark:border-slate-600/50 hover:border-[#0F766E] dark:hover:border-[#14B8A6] rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[120px]"
                  >
                    <input
                      id="jurnal-bk-doc-file-input"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      onClick={e => { (e.target as HTMLInputElement).value = ''; }}
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                    {docFile ? (
                      <div className="space-y-1.5">
                        {docPreviewUrl && docFile.type.startsWith('image/') ? (
                          <img
                            src={docPreviewUrl}
                            alt="Preview Dokumentasi BK"
                            className="max-h-36 mx-auto rounded-lg object-contain shadow-xs mb-2 border border-slate-300/60 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl neu-card-sm text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto text-xl mb-1">
                            <i className="fa-solid fa-file-lines"></i>
                          </div>
                        )}
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                          {docFile.name}
                        </p>
                        <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-num">
                          {(docFile.size / 1024).toFixed(0)} KB &bull; Klik untuk ganti berkas
                        </p>
                      </div>
                    ) : docPreviewUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={docPreviewUrl}
                          alt="Dokumentasi Tersimpan"
                          className="max-h-36 mx-auto rounded-lg object-contain shadow-xs mb-2 border border-slate-300/60 dark:border-slate-700"
                        />
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Dokumentasi Terlampir</p>
                        <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">Klik untuk memilih file baru pengganti</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-10 h-10 rounded-xl neu-card-sm text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto text-base">
                          <i className="fa-solid fa-cloud-arrow-up"></i>
                        </div>
                        <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                          Pilih Dokumen / Foto dari Perangkat
                        </p>
                        <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                          Mendukung gambar (JPG, PNG, WebP) dan dokumen (PDF, Word) maks. 10MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Active File / Preview Bar */}
              {(docFile || docPreviewUrl || formData.link_dokumen) && (
                <div className="flex items-center justify-between p-2.5 rounded-xl neu-inset text-xs">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <i className="fa-solid fa-paperclip text-[#0F766E] dark:text-[#14B8A6] shrink-0"></i>
                    <span className="truncate text-[11px] font-medium text-[#334155] dark:text-[#CBD5E1]">
                      {docFile ? docFile.name : formData.link_dokumen ? 'Dokumentasi terlampir' : 'Foto siap'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDocFile(null);
                      setDocPreviewUrl(null);
                      setFormData(prev => ({ ...prev, link_dokumen: '' }));
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline shrink-0 ml-2 min-h-[36px] px-2"
                  >
                    <i className="fa-solid fa-trash-can mr-1"></i> Hapus
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-300/50 dark:border-slate-700/50">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={saving || isUploadingDoc}
                className="neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] transition disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving || isUploadingDoc}
                className="neu-btn neu-btn-primary px-5 py-2 min-h-[40px] rounded-xl text-white text-xs font-bold flex items-center gap-2 transition disabled:opacity-50"
              >
                <i className={`fa-solid ${saving || isUploadingDoc ? 'fa-spinner animate-spin' : 'fa-floppy-disk'}`}></i>
                <span>{isUploadingDoc ? 'Mengunggah Berkas...' : saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Jurnal BK'}</span>
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
            <div className="neu-card-sm p-3 rounded-2xl flex items-center gap-2.5">
              <div className="neu-inset w-9 h-9 rounded-xl text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center shrink-0">
                <i className="fa-solid fa-list-check"></i>
              </div>
              <div>
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] block font-medium">Total Sesi</span>
                <span className="text-sm font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">{entries.length}</span>
              </div>
            </div>

            <div className="neu-card-sm p-3 rounded-2xl flex items-center gap-2.5">
              <div className="neu-inset w-9 h-9 rounded-xl text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-hourglass-half"></i>
              </div>
              <div>
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] block font-medium">Penanganan</span>
                <span className="text-sm font-black font-num text-amber-600 dark:text-amber-400">
                  {entries.filter(e => e.status === 'Dalam Penanganan').length}
                </span>
              </div>
            </div>

            <div className="neu-card-sm p-3 rounded-2xl flex items-center gap-2.5">
              <div className="neu-inset w-9 h-9 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] block font-medium">Selesai</span>
                <span className="text-sm font-black font-num text-emerald-600 dark:text-emerald-400">
                  {entries.filter(e => e.status === 'Selesai').length}
                </span>
              </div>
            </div>

            <div className="neu-card-sm p-3 rounded-2xl flex items-center gap-2.5">
              <div className="neu-inset w-9 h-9 rounded-xl text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-share-from-square"></i>
              </div>
              <div>
                <span className="text-[10px] text-[#475569] dark:text-[#94A3B8] block font-medium">Alih Tangan</span>
                <span className="text-sm font-black font-num text-sky-700 dark:text-sky-400">
                  {entries.filter(e => e.status === 'Alih Tangan Kasus').length}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="neu-card-sm p-3.5 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {/* Search */}
              <div className="relative sm:col-span-2">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-[#475569] dark:text-[#94A3B8] text-xs"></i>
                <input
                  type="text"
                  value={filterSearch}
                  onChange={e => setFilterSearch(e.target.value)}
                  placeholder="Cari nama siswa, NISN, kelas, atau kata kunci kasus..."
                  className="neu-input w-full pl-9 pr-3 py-2 min-h-[40px] rounded-xl text-xs"
                />
              </div>

              {/* Layanan */}
              <div>
                <select
                  value={filterLayanan}
                  onChange={e => setFilterLayanan(e.target.value)}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                >
                  <option value="all">Semua Layanan</option>
                  {JENIS_LAYANAN_OPTIONS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Bidang */}
              <div>
                <select
                  value={filterBidang}
                  onChange={e => setFilterBidang(e.target.value)}
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
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
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
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
                  className="neu-input w-full px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold"
                >
                  <option value="all">Semua Guru BK</option>
                  {counselorOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300/50 dark:border-slate-700/50 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">Rentang Tanggal:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="neu-input px-2.5 py-1.5 min-h-[40px] rounded-xl text-xs font-num"
                />
                <span className="text-[#475569] dark:text-[#94A3B8]">-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="neu-input px-2.5 py-1.5 min-h-[40px] rounded-xl text-xs font-num"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const today = getWitaDateStr();
                      setFilterStartDate(today);
                      setFilterEndDate(today);
                    }}
                    className="neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-[11px] font-semibold text-[#334155] dark:text-[#CBD5E1] transition"
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = getWitaDateStr();
                      const [year, month] = today.split('-');
                      const startOfMonth = `${year}-${month}-01`;
                      const lastDay = new Date(Number(year), Number(month), 0).getDate();
                      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
                      setFilterStartDate(startOfMonth);
                      setFilterEndDate(endOfMonth);
                    }}
                    className="neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-[11px] font-semibold text-[#334155] dark:text-[#CBD5E1] transition"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDate('');
                      setFilterEndDate('');
                    }}
                    className="neu-btn px-3 py-1.5 min-h-[36px] rounded-xl text-[11px] font-semibold text-[#334155] dark:text-[#CBD5E1] transition"
                  >
                    Semua
                  </button>
                </div>
                {(filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold ml-1 min-h-[36px] px-1.5"
                  >
                    Reset Tanggal
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="neu-btn neu-btn-teal inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold transition"
                  title="Unduh data sesuai filter aktif ke format CSV / Excel"
                >
                  <i className="fa-solid fa-file-excel"></i>
                  <span>Ekspor CSV</span>
                </button>
                <div className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-medium">
                  Menampilkan <strong className="font-num text-[#0F172A] dark:text-[#F1F5F9]">{filteredEntries.length}</strong> dari <strong className="font-num text-[#0F172A] dark:text-[#F1F5F9]">{entries.length}</strong> entri
                </div>
              </div>
            </div>
          </div>

          {/* Entries Table */}
          <div className="neu-card rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#475569] dark:text-[#94A3B8]">
                <i className="fa-solid fa-spinner animate-spin mr-2 text-[#0F766E] dark:text-[#14B8A6]"></i>
                Memuat catatan jurnal bimbingan konseling...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <div className="w-12 h-12 rounded-full neu-inset text-[#475569] dark:text-[#94A3B8] flex items-center justify-center mx-auto text-lg">
                  <i className="fa-solid fa-folder-open"></i>
                </div>
                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Belum ada catatan jurnal BK yang sesuai
                </div>
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] max-w-sm mx-auto">
                  {!isReadOnly
                    ? 'Klik tab "Catat Bimbingan" di atas untuk menambahkan sesi konseling siswa baru.'
                    : 'Tidak ada data bimbingan konseling pada filter yang dipilih.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="neu-inset border-b border-slate-300/50 dark:border-slate-700/50 text-[#475569] dark:text-[#94A3B8] font-bold text-[11px]">
                      <th className="py-2.5 px-3">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3">Siswa & Kelas</th>
                      <th className="py-2.5 px-3">Layanan & Bidang</th>
                      <th className="py-2.5 px-3">Catatan Kasus / Bimbingan</th>
                      <th className="py-2.5 px-3">Rencana Tindak Lanjut</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Dokumen</th>
                      <th className="py-2.5 px-3">Guru BK</th>
                      {!isReadOnly && <th className="py-2.5 px-3 text-center">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300/40 dark:divide-slate-700/50">
                    {filteredEntries.map(item => (
                      <tr key={item.id} className="hover:bg-[#0F766E]/5 dark:hover:bg-[#14B8A6]/10 transition">
                        <td className="py-2.5 px-3 align-top whitespace-nowrap">
                          <div className="font-bold text-[#0F172A] dark:text-[#F1F5F9] font-num text-[11px]">
                            {item.tanggal}
                          </div>
                          <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] font-num">
                            {item.waktu} &bull; {item.tempat_layanan || 'Ruang BK'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-[220px]">
                          <div className="font-bold text-[#0F172A] dark:text-[#F1F5F9] break-words">
                            {item.nama_siswa}
                          </div>
                          <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] break-words mt-0.5">
                            Kelas: <span className="font-bold text-[#0F172A] dark:text-[#F1F5F9] font-num">{item.kelas}</span>
                            {item.nisn && <span className="font-num"> &bull; {item.nisn}</span>}
                          </div>
                          {((Array.isArray(item.peserta_didik) && item.peserta_didik.length > 1) ||
                            (Array.isArray(item.detail_layanan?.peserta_didik) && item.detail_layanan.peserta_didik.length > 1) ||
                            item.sasaran === 'Kelompok' ||
                            isMultiStudentService(item.jenis_layanan)) && (
                            <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:bg-[#14B8A6]/15 dark:text-[#14B8A6] text-[9px] font-bold font-num border border-[#0F766E]/20 dark:border-[#14B8A6]/25">
                              <i className="fa-solid fa-users text-[8px]"></i>
                              <span>
                                Kelompok ({
                                  (Array.isArray(item.peserta_didik) && item.peserta_didik.length) ||
                                  (Array.isArray(item.detail_layanan?.peserta_didik) && (item.detail_layanan.peserta_didik as any[]).length) ||
                                  (item.nama_siswa ? item.nama_siswa.split(',').length : 1)
                                } Siswa)
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap space-y-1">
                          <div className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] text-[11px]">
                            {item.jenis_layanan}
                          </div>
                          <div>{renderBidangBadge(item.bidang_bimbingan)}</div>
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <p className="text-[#334155] dark:text-[#CBD5E1] leading-relaxed text-[11px] line-clamp-3 hover:line-clamp-none">
                            {item.catatan}
                          </p>
                          {item.detail_layanan && typeof item.detail_layanan === 'object' && Object.keys(item.detail_layanan).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {Object.entries(item.detail_layanan)
                                .filter(([k, v]) => k !== 'peserta_didik' && typeof v === 'string' && Boolean(v.trim()))
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="inline-block px-1.5 py-0.5 rounded neu-inset text-[10px] text-[#475569] dark:text-[#CBD5E1] font-mono"
                                  >
                                    <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                                      {k.replace(/_/g, ' ')}:
                                    </span>{' '}
                                    {v}
                                  </span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top max-w-xs">
                          <p className="text-[#334155] dark:text-[#CBD5E1] leading-relaxed text-[11px] line-clamp-3 hover:line-clamp-none">
                            {item.tindak_lanjut}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            {renderStatusBadge(item.status)}
                            {item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-300">
                                Terverifikasi
                              </span>
                            ) : item.status_verifikasi === 'Ditolak' ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 border border-rose-500/30 dark:text-rose-300"
                                title={item.alasan_penolakan || item.catatan_admin || 'Ditolak admin'}
                              >
                                Ditolak
                              </span>
                            ) : item.status_verifikasi === 'Dispensasi' ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-700 border border-sky-500/30 dark:text-sky-300">
                                Dispensasi
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-300">
                                Menunggu Verifikasi
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                          {item.link_dokumen ? (
                            <button
                              type="button"
                              onClick={() => handleViewDocument(item)}
                              className="neu-btn inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-[#0F766E] dark:text-[#14B8A6] text-[11px] font-semibold transition"
                              title="Lihat berkas dokumentasi"
                            >
                              <i className="fa-solid fa-paperclip text-xs"></i>
                              <span>Lihat</span>
                            </button>
                          ) : (
                            <span className="text-[#475569] dark:text-[#94A3B8] text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 align-top whitespace-nowrap text-[11px] text-[#475569] dark:text-[#94A3B8]">
                          {item.nama_guru}
                        </td>
                        {!isReadOnly && (
                          <td className="py-2.5 px-3 align-top text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="neu-btn btn-click p-2 min-w-[36px] min-h-[36px] rounded-lg text-[#0F766E] dark:text-teal-400 text-xs transition"
                                title="Edit jurnal BK"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item)}
                                className="neu-btn neu-btn-rose btn-click p-2 min-w-[36px] min-h-[36px] rounded-lg text-xs transition"
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
        <div className="space-y-4 max-w-full overflow-hidden print:overflow-visible">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 neu-card p-3.5 sm:p-4 rounded-2xl no-print">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h4 className="font-bold text-xs text-[#0F172A] dark:text-[#F1F5F9]">
                  Pratinjau Cetak Laporan Bimbingan Konseling
                </h4>
                <p className="text-[11px] text-[#475569] dark:text-[#94A3B8]">
                  Dokumen resmi rekapitulasi layanan BK sekolah untuk arsip dan pengesahan Kepala Sekolah.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">Periode:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="neu-input px-2.5 py-1.5 min-h-[40px] rounded-xl text-xs font-num"
                />
                <span className="text-[#475569] dark:text-[#94A3B8]">-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="neu-input px-2.5 py-1.5 min-h-[40px] rounded-xl text-xs font-num"
                />
                {(filterStartDate || filterEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                    className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-semibold min-h-[36px] px-1.5"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleExportCsv}
                className="neu-btn neu-btn-teal px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Ekspor data jurnal BK ke format CSV / Excel"
              >
                <i className="fa-solid fa-file-excel"></i>
                <span>Ekspor CSV</span>
              </button>
              <button
                type="button"
                onClick={() => triggerPrintWithGps()}
                className="neu-btn neu-btn-primary px-4 py-2 min-h-[40px] rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <i className="fa-solid fa-print"></i>
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>

          {/* Printable Layout Container */}
          <div className="neu-card text-[#0F172A] dark:text-[#F1F5F9] p-3.5 sm:p-6 md:p-8 rounded-2xl max-w-full overflow-hidden print:bg-white print:text-black print:overflow-visible print:border-none print:shadow-none print:p-0 print:rounded-none">
            <PrintHeader user={user} sekolahId={user?.sekolah_id || sekolahId} />

            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2 px-1">
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] print:text-black uppercase tracking-wider">
                JURNAL KEGIATAN BIMBINGAN DAN KONSELING (BK)
              </h3>
              <div className="text-xs text-[#475569] dark:text-[#94A3B8] print:text-black mt-1 flex flex-wrap justify-center gap-2 sm:gap-6 font-medium">
                <span>Guru BK: <strong>{filterCounselor !== 'all' ? filterCounselor : counselorName}</strong></span>
                {filterStartDate || filterEndDate ? (
                  <span>Periode: <strong className="font-num">{filterStartDate || '...'} s/d {filterEndDate || '...'}</strong></span>
                ) : (
                  <span>Periode: <strong>Semua Periode</strong></span>
                )}
                {filterBidang !== 'all' && <span>Bidang: <strong>{filterBidang}</strong></span>}
                {filterLayanan !== 'all' && <span>Layanan: <strong>{filterLayanan}</strong></span>}
                {filterStatus !== 'all' && <span>Status: <strong>{filterStatus}</strong></span>}
              </div>
            </div>

            {/* Mobile Swipe Hint */}
            <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-[#94A3B8] mb-1 sm:hidden no-print">
              <span className="inline-flex items-center gap-1 text-[10px]">
                <i className="fa-solid fa-table"></i>
                Pratinjau Tabel Laporan
              </span>
              <span className="inline-flex items-center gap-1 text-[#0F766E] dark:text-[#14B8A6] font-semibold text-[10px]">
                <i className="fa-solid fa-arrows-left-right text-[9px] animate-pulse"></i>
                Geser tabel ke samping
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-slate-300/60 dark:border-slate-700/60 print:border-none print:overflow-visible my-2 print:my-2 custom-scroll">
              <table className="w-full text-left border-collapse border border-slate-400/70 dark:border-slate-600 print:border-black text-xs min-w-[760px] sm:min-w-full print:min-w-0">
                <thead>
                  <tr className="bg-slate-200/70 dark:bg-slate-800/70 print:bg-gray-100 border-b border-slate-400/70 dark:border-slate-600 print:border-black text-center font-bold">
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-8 text-center print:w-8">No</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-24 print:w-24">Tanggal / Waktu</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-36 print:w-36">Nama Siswa / Kelas</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-32 print:w-32">Bidang / Layanan</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 min-w-[140px] print:min-w-0">Catatan Kasus / Bimbingan</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 min-w-[140px] print:min-w-0">Rencana Tindak Lanjut</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-24 print:w-24 text-center">Status</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-24 text-center print:w-24">Dokumentasi</th>
                    <th className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 w-28 print:w-28">Guru BK</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((e, idx) => (
                    <tr key={e.id} className="border-b border-slate-400/70 dark:border-slate-600 print:border-black align-top">
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 text-center font-num">{idx + 1}</td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2">
                        <div className="font-bold font-num">{e.tanggal}</div>
                        <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] print:text-gray-600 font-num">{e.waktu}</div>
                      </td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2">
                        {(() => {
                          const multiList: Array<{ nama_siswa: string; kelas?: string; nisn?: string }> =
                            (Array.isArray(e.peserta_didik) && e.peserta_didik.length > 0)
                              ? e.peserta_didik
                              : (Array.isArray(e.detail_layanan?.peserta_didik) && e.detail_layanan.peserta_didik.length > 0)
                              ? (e.detail_layanan.peserta_didik as any[])
                              : (isMultiStudentService(e.jenis_layanan) && e.nama_siswa.includes(','))
                              ? e.nama_siswa.split(',').map((name, i) => ({
                                  nama_siswa: name.trim(),
                                  kelas: e.kelas.split(',')[i]?.trim() || e.kelas.split(',')[0]?.trim() || '',
                                  nisn: e.nisn ? e.nisn.split(',')[i]?.trim() : ''
                                }))
                              : [];

                          if (multiList.length > 1) {
                            return (
                              <div>
                                <div className="font-bold text-[10px] text-[#0F172A] dark:text-[#F1F5F9] print:text-gray-800 underline mb-0.5 font-num">
                                  Kelompok ({multiList.length} Siswa):
                                </div>
                                <ol className="list-decimal list-inside text-[10px] space-y-0.5">
                                  {multiList.map((s, sIdx) => (
                                    <li key={sIdx} className="leading-tight">
                                      <span className="font-semibold">{s.nama_siswa}</span>
                                      <span className="text-[9px] text-[#475569] dark:text-[#94A3B8] print:text-gray-600 font-num"> ({s.kelas}{s.nisn ? ` • ${s.nisn}` : ''})</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            );
                          }

                          return (
                            <div>
                              <div className="font-bold">{e.nama_siswa}</div>
                              <div className="text-[10px] font-num">Kelas: {e.kelas}</div>
                              {e.nisn && <div className="text-[9px] text-[#475569] dark:text-[#94A3B8] print:text-gray-600 font-num">NISN: {e.nisn}</div>}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2">
                        <div className="font-semibold">{e.jenis_layanan}</div>
                        <div className="text-[10px] text-[#475569] dark:text-[#94A3B8] print:text-gray-600">({e.bidang_bimbingan})</div>
                      </td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 text-[11px] leading-tight">{e.catatan}</td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 text-[11px] leading-tight">{e.tindak_lanjut}</td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 text-center text-[10px] font-bold">{e.status}</td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-1 text-center align-middle">
                        {(() => {
                          const docUrl = e.link_dokumen?.trim();
                          if (!docUrl || docUrl === '-') {
                            return <span className="text-[#475569] dark:text-[#94A3B8] print:text-gray-400 text-[10px] italic">-</span>;
                          }
                          const isImg = docUrl.startsWith('data:image') ||
                            /\.(jpg|jpeg|png|webp|gif|bmp)($|\?)/i.test(docUrl) ||
                            isGoogleDriveUrl(docUrl);

                          if (isImg) {
                            const thumb = getGoogleDriveThumbnailUrl(docUrl, 400) || transformGoogleDriveUrl(docUrl);
                            return (
                              <div className="flex flex-col items-center justify-center">
                                <img
                                  src={thumb}
                                  alt={`Dokumentasi ${e.nama_siswa}`}
                                  loading="eager"
                                  referrerPolicy="no-referrer"
                                  className="w-16 h-16 object-cover rounded border border-gray-300 mx-auto bg-white print:w-16 print:h-16 print:object-cover print:rounded-none print:border-none print:bg-transparent print:m-0 print:block"
                                  onError={(ev) => {
                                    const target = ev.target as HTMLImageElement;
                                    if (target.src !== transformGoogleDriveUrl(docUrl)) {
                                      target.src = transformGoogleDriveUrl(docUrl);
                                    } else {
                                      target.style.display = 'none';
                                    }
                                  }}
                                />
                              </div>
                            );
                          }

                          return (
                            <div className="text-[9px] text-[#334155] dark:text-[#CBD5E1] print:text-gray-700 italic max-w-[100px] mx-auto truncate" title={docUrl.replace(/^file:/, '')}>
                              <i className="fa-solid fa-file-lines text-xs block mb-0.5 text-[#475569] dark:text-[#94A3B8] print:text-gray-500"></i>
                              <span>{docUrl.replace(/^file:/, '')}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border border-slate-400/70 dark:border-slate-600 print:border-black p-2 text-[10px]">{e.nama_guru}</td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-xs italic">
                        Tidak ada entri data bimbingan konseling pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <PrintSignature
              leftTitle="Mengetahui,"
              leftSubtitle="Guru Bimbingan Konseling (BK)"
              leftName={filterCounselor !== 'all' ? filterCounselor : counselorName}
              leftNip={user?.nip || '-'}
              user={user ? { ...user, role: 'bk' } : { role: 'bk' }}
              sekolahId={user?.sekolah_id || sekolahId}
              statusKepalaSekolah={statusKepalaSekolah}
            />
          </div>
        </div>
      )}
    </div>
  );
}
