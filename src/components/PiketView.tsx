'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp, formatDateWita, getWitaDayName } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import { PenugasanPiket } from '@/types/database';

const HARI_PIKET_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export default function PiketView({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState<'beranda' | 'lapor' | 'penugasan' | 'rekap'>('beranda');
  const [jadwalPiket, setJadwalPiket] = useState<any[]>([]);
  const [penugasanList, setPenugasanList] = useState<PenugasanPiket[]>([]);
  const [laporanPiket, setLaporanPiket] = useState<any[]>([]);

  // Penugasan Piket states (Admin)
  const currentDayWita = getWitaDayName();
  const [selectedHariPiket, setSelectedHariPiket] = useState<string>(
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(currentDayWita) ? currentDayWita : 'Senin'
  );
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [siswaAssignMode, setSiswaAssignMode] = useState<'select' | 'manual'>('select');
  const [selectedSiswaFilterKelas, setSelectedSiswaFilterKelas] = useState('');
  const [selectedSiswaNisn, setSelectedSiswaNisn] = useState('');
  const [manualSiswaNama, setManualSiswaNama] = useState('');
  const [manualSiswaNisn, setManualSiswaNisn] = useState('');
  const [manualSiswaKelas, setManualSiswaKelas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [activeKelas, setActiveKelas] = useState<string>('');
  const [piketAbsensi, setPiketAbsensi] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  // States for Rekap Piket tab
  const [rekapBulan, setRekapBulan] = useState(getWitaDateStr().substring(0, 7));
  const [rekapGuru, setRekapGuru] = useState('Semua');
  const [rekapStatus, setRekapStatus] = useState('Semua');
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapList, setRekapList] = useState<any[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [guruOptions, setGuruOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchDataPiket();

    const fetchStudents = async () => {
      let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
      const { data } = await query;
      if (data) {
        setAllStudents(data);
        const uniqueKelas = [...new Set(data.map(s => s.kelas).filter(Boolean))];
        setKelasList(uniqueKelas as string[]);
        if (uniqueKelas.length > 0) {
          setActiveKelas(uniqueKelas[0] as string);
          setSelectedSiswaFilterKelas(uniqueKelas[0] as string);
        }
        
        // Initialize default attendance
        const initialAbsensi: Record<string, string> = {};
        data.forEach(s => {
          initialAbsensi[s.nisn] = 'H';
        });
        setPiketAbsensi(initialAbsensi);
      }
    };
    fetchStudents();

    // Fetch teachers for penugasan & rekap filter
    let gQuery = supabase.from('data_guru').select('id, nama_guru, nip').order('nama_guru');
    if (user?.sekolah_id) gQuery = gQuery.eq('sekolah_id', user.sekolah_id);
    gQuery.then(({ data }) => {
      if (data) {
        setAllTeachers(data);
        const list = data.map(g => g.nama_guru).filter(Boolean);
        setGuruOptions([...new Set(list)]);
      }
    });

    if (user?.role === 'Guru') {
      getGuruDailyState(user.nama, user.username).then(setDailyState).catch(console.error);
    }
  }, [user]);

  // Trigger rekap fetch when switching to rekap tab or filter values change
  useEffect(() => {
    if (activeTab === 'rekap') {
      fetchRekapPiket();
    }
  }, [activeTab, rekapBulan, rekapGuru, rekapStatus]);

  const fetchDataPiket = async () => {
    // Fetch Jadwal
    let jQ = supabase.from('jadwal_piket').select('*');
    if (user?.sekolah_id) jQ = jQ.eq('sekolah_id', user.sekolah_id);
    const { data: jadwal } = await jQ;
    if (jadwal) setJadwalPiket(jadwal);

    // Fetch Penugasan Piket
    let pQ = supabase.from('penugasan_piket').select('*').order('created_at', { ascending: true });
    if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
    const { data: penugasan } = await pQ;
    if (penugasan) setPenugasanList((penugasan as PenugasanPiket[]) || []);

    // Fetch Laporan
    let lQ = supabase.from('laporan_piket').select('*').order('timestamp', { ascending: false }).limit(10);
    if (user?.sekolah_id) lQ = lQ.eq('sekolah_id', user.sekolah_id);
    const { data: laporan } = await lQ;
    if (laporan) setLaporanPiket(laporan);
  };

  const syncJadwalPiketForDay = async (day: string) => {
    try {
      let penugasanQuery = supabase
        .from('penugasan_piket')
        .select('guru_nama')
        .eq('hari', day)
        .eq('tipe_petugas', 'Guru');
      if (user?.sekolah_id) penugasanQuery = penugasanQuery.eq('sekolah_id', user.sekolah_id);
      const { data } = await penugasanQuery;

      const names = (data || []).map(g => g.guru_nama).filter(Boolean);
      const daftarGuruStr = names.join(', ');

      let existQuery = supabase.from('jadwal_piket').select('id').eq('hari', day);
      if (user?.sekolah_id) existQuery = existQuery.eq('sekolah_id', user.sekolah_id);
      const { data: existing } = await existQuery;
      if (existing && existing.length > 0) {
        let updQuery = supabase.from('jadwal_piket').update({ daftar_guru: daftarGuruStr }).eq('hari', day);
        if (user?.sekolah_id) updQuery = updQuery.eq('sekolah_id', user.sekolah_id);
        await updQuery;
      } else {
        await supabase.from('jadwal_piket').insert([{ hari: day, daftar_guru: daftarGuruStr, ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {}) }]);
      }
    } catch (err) {
      console.error('Error syncing jadwal_piket:', err);
    }
  };

  const fetchRekapPiket = async () => {
    setRekapLoading(true);
    try {
      let query = supabase.from('laporan_piket').select('*').order('tanggal', { ascending: true }).order('timestamp', { ascending: true });
      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
      
      if (rekapBulan) {
        const [year, month] = rekapBulan.split('-').map(Number);
        const startMonth = `${rekapBulan}-01`;
        const endDay = new Date(year, month, 0).getDate();
        const endMonth = `${rekapBulan}-${String(endDay).padStart(2, '0')}`;
        query = query.gte('tanggal', startMonth).lte('tanggal', endMonth);
      }
      if (rekapGuru && rekapGuru !== 'Semua') {
        query = query.eq('guru_pelapor', rekapGuru);
      }
      if (rekapStatus && rekapStatus !== 'Semua') {
        query = query.eq('status_verifikasi', rekapStatus);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching rekap piket:', error);
      } else if (data) {
        setRekapList(data);
      }
    } catch (err) {
      console.error('Rekap piket fetch exception:', err);
    } finally {
      setRekapLoading(false);
    }
  };

  const updatePiketStatus = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('laporan_piket')
        .update({ status_verifikasi: status })
        .eq('id', id);

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Memverifikasi',
          text: error.message,
          confirmButtonColor: '#0B4619'
        });
      } else {
        Swal.fire({
          icon: status === 'Disetujui' ? 'success' : 'info',
          title: `Laporan Piket ${status}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800
        });
        // Optimistic state updates
        setLaporanPiket(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        setRekapList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePiketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let fileUrl = '';
    if (file) {
      try {
        fileUrl = await uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket');
      } catch (err: any) {
        setLoading(false);
        return Swal.fire('Gagal Upload', err.message, 'error');
      }
    }

    const newLaporan = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      tanggal: getWitaDateStr(),
      guru_pelapor: user.nama,
      rekap_absen_kelas: JSON.stringify(piketAbsensi),
      catatan_apel: catatan,
      link_foto: fileUrl,
      status_verifikasi: 'Menunggu',
      kehadiran_guru_piket: 'Hadir',
      ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
    };

    const { error } = await supabase.from('laporan_piket').insert([newLaporan]);

    if (error) {
      Swal.fire('Error', 'Gagal menyimpan laporan piket: ' + error.message, 'error');
    } else {
      Swal.fire('Berhasil', 'Laporan piket berhasil disimpan!', 'success');
      setCatatan('');
      setFile(null);
      setActiveTab('beranda');
      fetchDataPiket(); // Refresh data
      if (user?.role === 'Guru') getGuruDailyState(user.nama, user.username).then(setDailyState).catch(console.error);
    }
    setLoading(false);
  };

  const formatRekapAbsen = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      const counts = { H: 0, S: 0, I: 0, A: 0 };
      Object.values(parsed).forEach((val: any) => {
        const code = String(val).toUpperCase() as 'H' | 'S' | 'I' | 'A';
        if (counts[code] !== undefined) counts[code]++;
      });
      const total = counts.H + counts.S + counts.I + counts.A;
      if (total === 0) return null;
      return `H: ${counts.H} | S: ${counts.S} | I: ${counts.I} | A: ${counts.A} (${total} Siswa)`;
    } catch (_) {
      return null;
    }
  };

  const filteredRekap = rekapList
    .filter(item => {
      if (!rekapSearch) return true;
      const q = rekapSearch.toLowerCase();
      return (
        item.guru_pelapor?.toLowerCase().includes(q) ||
        item.catatan_apel?.toLowerCase().includes(q) ||
        item.tanggal?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.timestamp || '').localeCompare(b.timestamp || ''));

  const totalRekap = filteredRekap.length;
  const totalDisetujui = filteredRekap.filter(r => r.status_verifikasi === 'Disetujui').length;
  const totalMenunggu = filteredRekap.filter(r => r.status_verifikasi === 'Menunggu' || !r.status_verifikasi || r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalDitolak = filteredRekap.filter(r => r.status_verifikasi === 'Ditolak').length;

  const exportRekapPiketCSV = () => {
    if (filteredRekap.length === 0) {
      return Swal.fire('Info', 'Tidak ada data rekap piket untuk diekspor.', 'info');
    }
    const headers = ['No', 'Tanggal', 'Hari', 'Guru Pelapor', 'Catatan Apel / Kejadian', 'Status Verifikasi', 'Kehadiran Siswa', 'Link Foto'];
    const csvRows = [headers.join(',')];
    filteredRekap.forEach((r, idx) => {
      const absenStr = formatRekapAbsen(r.rekap_absen_kelas) || '-';
      const hari = r.tanggal ? getWitaDayName(new Date(r.tanggal + 'T00:00:00+08:00')) : '-';
      csvRows.push([
        idx + 1,
        `"${r.tanggal || ''}"`,
        `"${hari}"`,
        `"${(r.guru_pelapor || '').replace(/"/g, '""')}"`,
        `"${(r.catatan_apel || '-').replace(/"/g, '""')}"`,
        `"${r.status_verifikasi || 'Menunggu'}"`,
        `"${absenStr.replace(/"/g, '""')}"`,
        `"${r.link_foto || '-'}"`
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Piket_${rekapBulan || 'Semua'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddGuruPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      Swal.fire('Peringatan', 'Silakan pilih guru terlebih dahulu.', 'warning');
      return;
    }

    const teacher = allTeachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;

    // Prevent duplicate assignment on the same day
    const already = penugasanList.some(
      p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru' && (p.guru_id === teacher.id || p.guru_nama === teacher.nama_guru)
    );
    if (already) {
      Swal.fire('Perhatian', `${teacher.nama_guru} sudah terdaftar pada jadwal piket hari ${selectedHariPiket}.`, 'info');
      return;
    }

    setAssignLoading(true);
    try {
      const newEntry = {
        hari: selectedHariPiket,
        tipe_petugas: 'Guru',
        guru_id: teacher.id,
        guru_nama: teacher.nama_guru,
        guru_nip: teacher.nip || '',
        tahun_ajaran: '2026/2027'
      };

      const { data, error } = await supabase.from('penugasan_piket').insert([newEntry]).select().single();
      if (error) throw error;

      if (data) {
        setPenugasanList(prev => [...prev, data as PenugasanPiket]);
      }
      await syncJadwalPiketForDay(selectedHariPiket);
      await fetchDataPiket();

      Swal.fire({
        icon: 'success',
        title: 'Guru Ditugaskan',
        text: `${teacher.nama_guru} berhasil ditugaskan untuk piket hari ${selectedHariPiket}.`,
        timer: 1500,
        showConfirmButton: false
      });
      setSelectedTeacherId('');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menambahkan guru piket', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddSiswaPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    let nama = '';
    let nisn = '';
    let kelas = '';

    if (siswaAssignMode === 'select') {
      const student = allStudents.find(s => s.nisn === selectedSiswaNisn);
      if (!student) {
        Swal.fire('Peringatan', 'Silakan pilih siswa dari daftar.', 'warning');
        return;
      }
      nama = student.nama_siswa;
      nisn = student.nisn;
      kelas = student.kelas;
    } else {
      nama = manualSiswaNama.trim();
      nisn = manualSiswaNisn.trim();
      kelas = manualSiswaKelas.trim();
      if (!nama || !kelas) {
        Swal.fire('Peringatan', 'Nama siswa dan kelas wajib diisi.', 'warning');
        return;
      }
    }

    // Check duplicate
    const already = penugasanList.some(
      p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa' && p.siswa_nama?.toLowerCase() === nama.toLowerCase()
    );
    if (already) {
      Swal.fire('Perhatian', `${nama} sudah terdaftar pada piket siswa hari ${selectedHariPiket}.`, 'info');
      return;
    }

    setAssignLoading(true);
    try {
      const newEntry = {
        hari: selectedHariPiket,
        tipe_petugas: 'Siswa',
        siswa_nama: nama,
        siswa_nisn: nisn || null,
        kelas: kelas || null,
        tahun_ajaran: '2026/2027'
      };

      const { data, error } = await supabase.from('penugasan_piket').insert([newEntry]).select().single();
      if (error) throw error;

      if (data) {
        setPenugasanList(prev => [...prev, data as PenugasanPiket]);
      }

      Swal.fire({
        icon: 'success',
        title: 'Siswa Ditugaskan',
        text: `${nama} (${kelas}) berhasil ditugaskan untuk piket hari ${selectedHariPiket}.`,
        timer: 1500,
        showConfirmButton: false
      });
      setSelectedSiswaNisn('');
      setManualSiswaNama('');
      setManualSiswaNisn('');
      setManualSiswaKelas('');
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menambahkan siswa piket', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeletePenugasan = async (id: string, nama: string, tipe: 'Guru' | 'Siswa') => {
    const result = await Swal.fire({
      title: `Hapus ${tipe} Piket?`,
      text: `Hapus ${nama} dari daftar piket hari ${selectedHariPiket}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('penugasan_piket').delete().eq('id', id);
        if (error) throw error;

        setPenugasanList(prev => prev.filter(p => p.id !== id));
        if (tipe === 'Guru') {
          await syncJadwalPiketForDay(selectedHariPiket);
          await fetchDataPiket();
        }

        Swal.fire({
          icon: 'success',
          title: 'Penugasan Dihapus',
          timer: 1200,
          showConfirmButton: false
        });
      } catch (err: any) {
        Swal.fire('Error', err.message || 'Gagal menghapus penugasan', 'error');
      }
    }
  };

  const isGuru = user?.role === 'Guru';
  const isAdmin = user?.role === 'Admin';
  // Admin never conducts daily report; Guru conducts report if assigned and not on leave
  const canReport = !isAdmin && isGuru && Boolean(dailyState && dailyState.isPiket && !dailyState.isLibur);

  return (
    <section id="view-piket" className="view-section page-enter">
        <div className="glass-card p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <i className="fa-solid fa-shield-halved text-sm"></i>
                    </span>
                    {isAdmin ? 'Manajemen & Penugasan Piket' : 'Modul Piket Guru'}
                </h2>
                <button 
                  type="button" 
                  onClick={() => {
                    fetchDataPiket();
                    if (activeTab === 'rekap') fetchRekapPiket();
                  }} 
                  className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
                >
                  <i className="fa-solid fa-rotate-right text-xs"></i>
                </button>
            </div>

            {dailyState?.isLibur && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 no-print">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {dailyState.lockedReason}
              </div>
            )}

            {/* TAB BUTTONS */}
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1 no-print">
              <button 
                type="button"
                onClick={() => setActiveTab('beranda')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'beranda' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
              >
                Beranda Piket
              </button>

              {isAdmin && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('penugasan')} 
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'penugasan' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
                >
                  <i className="fa-solid fa-user-gear mr-1.5 text-teal-600 dark:text-teal-400"></i> Penugasan Piket
                </button>
              )}

              {canReport && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('lapor')} 
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'lapor' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
                >
                  <i className="fa-solid fa-pen-to-square mr-1.5 text-teal-600 dark:text-teal-400"></i> Isi Laporan
                </button>
              )}

              <button 
                type="button"
                onClick={() => setActiveTab('rekap')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'rekap' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
              >
                <i className="fa-solid fa-chart-pie mr-1.5 text-teal-600 dark:text-teal-400"></i> Rekap Piket
              </button>
            </div>

            {/* TAB 1: BERANDA PIKET */}
            {activeTab === 'beranda' && (
              <div id="piket-content-beranda" className="space-y-4 fade-in">
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar-check"></i> Jadwal Piket Harian (Senin – Sabtu)
                        </h3>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('penugasan')}
                            className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                          >
                            <i className="fa-solid fa-gear text-[10px]"></i> Kelola Penugasan
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto custom-scroll pr-1">
                        {HARI_PIKET_LIST.map(hari => {
                          const guruList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Guru');
                          const siswaList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Siswa');
                          const legacyRow = jadwalPiket.find(j => j.hari === hari);

                          return (
                            <div key={hari} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-teal-100 dark:border-teal-900 shadow-2xs space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-teal-700 dark:text-teal-400 text-xs">{hari}</span>
                                <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-semibold px-1.5 py-0.2 rounded">
                                  {guruList.length} Guru • {siswaList.length} Siswa
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-800 dark:text-gray-200">
                                <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] block">Guru:</span>
                                {guruList.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                                    {guruList.map(g => (
                                      <li key={g.id} className="truncate">{g.guru_nama}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">
                                    {legacyRow?.daftar_guru || 'Belum ditugaskan'}
                                  </span>
                                )}
                              </div>
                              {siswaList.length > 0 && (
                                <div className="text-[11px] text-gray-800 dark:text-gray-200 pt-1 border-t border-gray-100 dark:border-gray-700">
                                  <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] block">Siswa:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {siswaList.map(s => (
                                      <span key={s.id} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium">
                                        {s.siswa_nama} {s.kelas ? `(${s.kelas})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-3 px-1">
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white"><i className="fa-solid fa-list-check mr-1.5 text-teal-600 dark:text-teal-400"></i> Laporan Terbaru</h3>
                      </div>
                      <div className="space-y-3 min-h-[150px]">
                        {laporanPiket.length === 0 ? (
                          <div className="text-center text-[10px] text-gray-500 dark:text-white/80 py-4">Belum ada laporan.</div>
                        ) : laporanPiket.map(l => (
                          <div key={l.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-bold text-xs text-gray-900 dark:text-white">{l.guru_pelapor}</div>
                                <div className="text-[9px] text-gray-500 dark:text-gray-400">{l.tanggal}</div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                l.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                l.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>{l.status_verifikasi || 'Menunggu'}</span>
                            </div>
                            <div className="text-[10px] text-gray-700 dark:text-white/80 line-clamp-2">{l.catatan_apel || "Tidak ada catatan."}</div>
                            {l.link_foto && l.link_foto !== '-' && (
                              <div className="flex items-center gap-2 mt-1">
                                <img 
                                  src={transformGoogleDriveUrl(l.link_foto)} 
                                  alt="Foto Piket" 
                                  className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <a href={l.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-[10px] inline-flex items-center gap-1">
                                  <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                                </a>
                              </div>
                            )}
                            {user?.role === 'Admin' && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Disetujui'}
                                  onClick={() => updatePiketStatus(l.id, 'Disetujui')}
                                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                    l.status_verifikasi === 'Disetujui'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                                      : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                                  }`}
                                >
                                  {processingId === l.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                </button>
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Ditolak'}
                                  onClick={() => updatePiketStatus(l.id, 'Ditolak')}
                                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                    l.status_verifikasi === 'Ditolak'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                                      : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                                  }`}
                                >
                                  {processingId === l.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-xmark"></i> Tolak</>}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  </div>
              </div>
            )}

            {/* TAB: PENUGASAN PIKET (ADMIN ONLY) */}
            {activeTab === 'penugasan' && isAdmin && (
              <div id="piket-content-penugasan" className="space-y-5 fade-in">
                {/* Day selector pills */}
                <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-2xl border border-teal-100 dark:border-teal-900/50">
                  <div className="text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-2 uppercase tracking-wide">
                    Pilih Hari Penugasan:
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {HARI_PIKET_LIST.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedHariPiket(day)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all pill-interactive flex flex-col items-center justify-center ${
                          selectedHariPiket === day
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span>{day}</span>
                        <span className="text-[9px] opacity-75 font-normal">
                          {penugasanList.filter(p => p.hari === day).length} Petugas
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs">
                      <i className="fa-solid fa-calendar-day"></i>
                    </span>
                    Jadwal Piket Hari {selectedHariPiket}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tahun Ajaran 2026/2027
                  </span>
                </div>

                {/* Section 1: Guru Piket */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-chalkboard-user text-teal-600 dark:text-teal-400"></i>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        Dewan Guru Piket ({penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length})
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned teachers */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        Belum ada guru yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru')
                        .map((guruItem, idx) => (
                          <div
                            key={guruItem.id}
                            className="flex items-center justify-between p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {guruItem.guru_nama}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  NIP: {guruItem.guru_nip || '-'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(guruItem.id, guruItem.guru_nama || '', 'Guru')}
                              title="Hapus penugasan guru"
                              className="btn-click w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 flex items-center justify-center transition border border-red-200 dark:border-red-900"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Guru form */}
                  <form onSubmit={handleAddGuruPiket} className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                    >
                      <option value="">-- Pilih Guru untuk Ditugaskan --</option>
                      {allTeachers
                        .filter(t => !penugasanList.some(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru' && p.guru_id === t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nama_guru} {t.nip ? `(${t.nip})` : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      disabled={assignLoading || !selectedTeacherId}
                      className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> Tugaskan Guru
                    </button>
                  </form>
                </div>

                {/* Section 2: Siswa Piket */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-users text-teal-600 dark:text-teal-400"></i>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        Siswa Piket ({penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length})
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned students */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        Belum ada siswa yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa')
                        .map((siswaItem, idx) => (
                          <div
                            key={siswaItem.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {siswaItem.siswa_nama}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <span className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-semibold px-1.5 py-0.2 rounded">
                                    Kelas {siswaItem.kelas || '-'}
                                  </span>
                                  <span>NISN: {siswaItem.siswa_nisn || '-'}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(siswaItem.id, siswaItem.siswa_nama || '', 'Siswa')}
                              title="Hapus penugasan siswa"
                              className="btn-click w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 flex items-center justify-center transition border border-red-200 dark:border-red-900"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Siswa Form with Selection / Manual toggle */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        + Tambah Siswa Piket
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('select')}
                          className={`px-2 py-1 rounded-lg font-bold transition ${
                            siswaAssignMode === 'select'
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Pilih dari Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('manual')}
                          className={`px-2 py-1 rounded-lg font-bold transition ${
                            siswaAssignMode === 'manual'
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Input Manual
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleAddSiswaPiket} className="space-y-2">
                      {siswaAssignMode === 'select' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <select
                              value={selectedSiswaFilterKelas}
                              onChange={e => {
                                setSelectedSiswaFilterKelas(e.target.value);
                                setSelectedSiswaNisn('');
                              }}
                              className="w-full px-2.5 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                            >
                              <option value="">Semua Kelas</option>
                              {kelasList.map(k => (
                                <option key={k} value={k}>Kelas {k}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex gap-2">
                            <select
                              value={selectedSiswaNisn}
                              onChange={e => setSelectedSiswaNisn(e.target.value)}
                              className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                            >
                              <option value="">-- Pilih Siswa --</option>
                              {allStudents
                                .filter(s => !selectedSiswaFilterKelas || s.kelas === selectedSiswaFilterKelas)
                                .map(s => (
                                  <option key={s.nisn} value={s.nisn}>
                                    {s.nama_siswa} ({s.kelas}) - {s.nisn}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="submit"
                              disabled={assignLoading || !selectedSiswaNisn}
                              className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                            >
                              <i className="fa-solid fa-plus text-xs"></i> Tambah
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Nama Siswa"
                            value={manualSiswaNama}
                            onChange={e => setManualSiswaNama(e.target.value)}
                            className="sm:col-span-2 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                          />
                          <input
                            type="text"
                            placeholder="Kelas (e.g. X Merdeka)"
                            value={manualSiswaKelas}
                            onChange={e => setManualSiswaKelas(e.target.value)}
                            className="px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="NISN"
                              value={manualSiswaNisn}
                              onChange={e => setManualSiswaNisn(e.target.value)}
                              className="flex-1 px-2.5 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                            />
                            <button
                              type="submit"
                              disabled={assignLoading || !manualSiswaNama || !manualSiswaKelas}
                              className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 shrink-0"
                            >
                              <i className="fa-solid fa-plus text-xs"></i> Tambah
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LAPOR PIKET (GURU ON DUTY ONLY) */}
            {activeTab === 'lapor' && canReport && (
              <div id="piket-content-form" className="fade-in space-y-4">
                  <div className="bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400 p-3 rounded-xl mb-4 text-[10px] text-orange-800 font-medium leading-relaxed">
                      <i className="fa-solid fa-circle-info mr-1.5"></i> Silakan isi laporan karena Anda ditugaskan piket hari ini. Periksa seluruh kelas secara bergantian.
                  </div>
                  <form onSubmit={handlePiketSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tanggal Piket</label>
                        <input type="date" required value={getWitaDateStr()} readOnly className="w-full px-3 py-2.5 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed" />
                      </div>
                      
                      <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-900/50 rounded-xl p-3">
                        <label className="block text-[11px] font-bold text-teal-800 dark:text-teal-400 mb-2">
                          <i className="fa-solid fa-clipboard-check mr-1.5"></i> Rekap Absensi Sekolah
                        </label>
                        <div className="flex gap-2 overflow-x-auto custom-scroll pb-2 mb-2">
                          {kelasList.map(k => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setActiveKelas(k)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                                activeKelas === k 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                              }`}
                            >
                              Kelas {k}
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                          {allStudents.filter(s => s.kelas === activeKelas).map((siswa, idx) => (
                            <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-white/80 w-4">{idx + 1}.</span>
                                <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</div>
                                  <div className="text-[9px] text-gray-500 dark:text-white/80">{siswa.nisn}</div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {['H', 'S', 'I', 'A'].map(status => (
                                  <button 
                                    key={status}
                                    type="button"
                                    onClick={() => setPiketAbsensi(prev => ({...prev, [siswa.nisn]: status}))}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                                      piketAbsensi[siswa.nisn] === status 
                                      ? (status === 'H' ? 'bg-green-500 text-white shadow-sm' : 
                                         status === 'S' ? 'bg-blue-500 text-white shadow-sm' : 
                                         status === 'I' ? 'bg-orange-500 text-white shadow-sm' : 
                                         'bg-red-500 text-white shadow-sm') 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Catatan Khusus</label>
                        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-800" placeholder="Deskripsikan kejadian saat piket..."></textarea>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Upload Foto Dokumentasi Piket <span className="text-red-500 dark:text-red-400">(Wajib)</span></label>
                        <input type="file" accept="image/*" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="w-full px-3 py-2 text-sm rounded-xl input-premium bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={loading} className="btn-click w-full bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-teal-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                          {loading ? 'Menyimpan...' : <><i className="fa-solid fa-paper-plane"></i> Kirim Laporan</>}
                        </button>
                      </div>
                  </form>
              </div>
            )}

            {/* TAB 3: REKAP PIKET */}
            {activeTab === 'rekap' && (
              <div id="piket-content-rekap" className="space-y-4 fade-in">
                  <PrintHeader />

                  {/* Filter Area (Hidden in Print) */}
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl space-y-3 no-print">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">PILIH BULAN</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="month" 
                                  value={rekapBulan} 
                                  onChange={e => setRekapBulan(e.target.value)} 
                                  className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                />
                                {rekapBulan && (
                                  <button 
                                    type="button" 
                                    onClick={() => setRekapBulan('')} 
                                    title="Tampilkan semua bulan" 
                                    className="px-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl shrink-0"
                                  >
                                    Semua
                                  </button>
                                )}
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">GURU PELAPOR</label>
                              <select 
                                value={rekapGuru} 
                                onChange={e => setRekapGuru(e.target.value)} 
                                className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                  <option value="Semua">Semua Guru</option>
                                  {guruOptions.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">STATUS VERIFIKASI</label>
                              <select 
                                value={rekapStatus} 
                                onChange={e => setRekapStatus(e.target.value)} 
                                className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                  <option value="Semua">Semua Status</option>
                                  <option value="Disetujui">Disetujui</option>
                                  <option value="Menunggu">Menunggu</option>
                                  <option value="Ditolak">Ditolak</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <div className="relative flex-grow">
                              <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
                              <input 
                                type="text" 
                                value={rekapSearch} 
                                onChange={e => setRekapSearch(e.target.value)} 
                                placeholder="Cari berdasarkan nama guru, catatan apel, atau tanggal..." 
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                              />
                          </div>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold shrink-0"
                            >
                              Reset
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={fetchRekapPiket} 
                            disabled={rekapLoading} 
                            className="btn-click px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <i className={`fa-solid fa-rotate-right ${rekapLoading ? 'animate-spin' : ''}`}></i>
                            <span>Muat</span>
                          </button>
                      </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide">Total Laporan</div>
                          <div className="text-lg font-black text-teal-900 dark:text-white mt-0.5">{totalRekap}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-green-800 dark:text-green-400 uppercase tracking-wide">Disetujui</div>
                          <div className="text-lg font-black text-green-900 dark:text-white mt-0.5">{totalDisetujui}</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wide">Menunggu</div>
                          <div className="text-lg font-black text-yellow-900 dark:text-white mt-0.5">{totalMenunggu}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wide">Ditolak</div>
                          <div className="text-lg font-black text-red-900 dark:text-white mt-0.5">{totalDitolak}</div>
                      </div>
                  </div>

                  {/* Rekap List Items */}
                  <div className="space-y-3 min-h-[200px]">
                      {rekapLoading ? (
                        <div className="text-center py-12 text-gray-500 text-xs italic dark:text-gray-400">
                          <i className="fa-solid fa-spinner animate-spin mr-1.5"></i> Memuat data rekap piket...
                        </div>
                      ) : filteredRekap.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                          <i className="fa-solid fa-shield-halved text-2xl text-gray-400 dark:text-gray-500 mb-2"></i>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {rekapSearch ? `Tidak ada laporan piket yang sesuai dengan pencarian "${rekapSearch}".` : 'Tidak ada laporan piket yang sesuai dengan filter.'}
                          </p>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredRekap.map((item, idx) => (
                          <div key={item.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                                          <span>{idx + 1}. {item.guru_pelapor}</span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                          {formatDateWita(item.tanggal)} ({item.tanggal ? getWitaDayName(new Date(item.tanggal + 'T00:00:00+08:00')) : '-'})
                                      </div>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                      item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}>
                                      {item.status_verifikasi || 'Menunggu'}
                                  </span>
                              </div>

                              <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                                  <p><span className="font-semibold">Catatan Apel / Kejadian:</span> {item.catatan_apel || '-'}</p>
                                  {formatRekapAbsen(item.rekap_absen_kelas) && (
                                      <p><span className="font-semibold">Kehadiran Siswa:</span> <span className="font-medium text-teal-700 dark:text-teal-400">{formatRekapAbsen(item.rekap_absen_kelas)}</span></p>
                                  )}
                                  {item.link_foto && item.link_foto !== '-' && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                          <img 
                                              src={transformGoogleDriveUrl(item.link_foto)} 
                                              alt="Foto Dokumentasi" 
                                              className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                          />
                                          <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 text-xs">
                                              <i className="fa-solid fa-camera mr-1"></i> Lihat Foto Dokumentasi
                                          </a>
                                      </div>
                                  )}
                              </div>

                              {user?.role === 'Admin' && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 no-print">
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
                                          onClick={() => updatePiketStatus(item.id, 'Disetujui')}
                                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                              item.status_verifikasi === 'Disetujui'
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                                                  : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                                          }`}
                                      >
                                          {processingId === item.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                      </button>
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                                          onClick={() => updatePiketStatus(item.id, 'Ditolak')}
                                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                              item.status_verifikasi === 'Ditolak'
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                                                  : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                                          }`}
                                      >
                                          {processingId === item.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-xmark"></i> Tolak</>}
                                      </button>
                                  </div>
                              )}
                          </div>
                        ))
                      )}
                  </div>

                  <PrintSignature />

                  {/* Print & Export Actions */}
                  {filteredRekap.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 no-print">
                          <button 
                            type="button" 
                            onClick={exportRekapPiketCSV} 
                            className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
                          >
                              <i className="fa-solid fa-file-excel"></i> Export Excel (CSV)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => window.print()} 
                            className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
                          >
                              <i className="fa-solid fa-print"></i> Cetak Rekap
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>
    </section>
  );
}
