'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { 
  getWitaStartOfDay, 
  getWitaEndOfDay, 
  formatTimestampWita, 
  getWitaDateStr, 
  getWitaDayName 
} from '@/lib/wita';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import { isGuruDiPiket } from '@/lib/workflow';

export default function AdminVerifView({ user }: { user: any }) {
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Presensi' | 'Jurnal' | 'Piket'>('Presensi');
  
  // Reactive Dropdown Filters
  const [taskFilter, setTaskFilter] = useState<'Semua' | 'Sudah' | 'Belum'>('Semua');
  const [verifFilter, setVerifFilter] = useState<'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak'>('Semua');

  // Master & Schedule Data for Cross-Referencing
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [allPiketSchedule, setAllPiketSchedule] = useState<any[]>([]);
  const [allJadwalPelajaran, setAllJadwalPelajaran] = useState<any[]>([]);

  // Submissions Data
  const [presensiList, setPresensiList] = useState<any[]>([]);
  const [jurnalList, setJurnalList] = useState<any[]>([]);
  const [piketList, setPiketList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // Load Auxiliary Master Data once
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [teachersRes, piketRes, jadwalRes] = await Promise.all([
          supabase.from('data_guru').select('*').order('nama_guru', { ascending: true }),
          supabase.from('jadwal_piket').select('*'),
          supabase.from('jadwal_pelajaran').select('*'),
        ]);

        if (teachersRes.data) setAllTeachers(teachersRes.data);
        if (piketRes.data) setAllPiketSchedule(piketRes.data);
        if (jadwalRes.data) setAllJadwalPelajaran(jadwalRes.data);
      } catch (err) {
        console.error('Error loading master data for verification:', err);
      }
    };

    loadAuxData();
  }, []);

  // Load Submissions Data & Subscribe to Realtime Updates
  useEffect(() => {
    loadData();

    const channelPresensi = supabase
      .channel('verif-presensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        if (activeTab === 'Presensi') loadData();
      })
      .subscribe();

    const channelJurnal = supabase
      .channel('verif-jurnal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        if (activeTab === 'Jurnal') loadData();
      })
      .subscribe();

    const channelPiket = supabase
      .channel('verif-piket')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket' }, () => {
        if (activeTab === 'Piket') loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelPresensi);
      supabase.removeChannel(channelJurnal);
      supabase.removeChannel(channelPiket);
    };
  }, [date, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Presensi') {
        let query = supabase.from('presensi_guru').select('*');
        if (date) {
          const startOfDay = getWitaStartOfDay(date);
          const endOfDay = getWitaEndOfDay(date);
          query = query.gte('timestamp', startOfDay).lte('timestamp', endOfDay);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);
        
        const { data, error } = await query;
        if (error) console.error('Error loading presensi:', error);
        if (data) setPresensiList(data);
      } else if (activeTab === 'Jurnal') {
        let query = supabase.from('jurnal_pembelajaran').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);
        
        const { data, error } = await query;
        if (error) console.error('Error loading jurnal:', error);
        if (data) setJurnalList(data);
      } else if (activeTab === 'Piket') {
        let query = supabase.from('laporan_piket').select('*');
        if (date) {
          query = query.eq('tanggal', date);
        }
        query = query.order('timestamp', { ascending: false }).limit(200);

        const { data, error } = await query;
        if (error) console.error('Error loading piket:', error);
        if (data) setPiketList(data);
      }
    } catch (error) {
      console.error('Verif load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActiveConfig = () => {
    switch (activeTab) {
      case 'Presensi':
        return { table: 'presensi_guru', label: 'Presensi' };
      case 'Jurnal':
        return { table: 'jurnal_pembelajaran', label: 'Jurnal' };
      case 'Piket':
        return { table: 'laporan_piket', label: 'Laporan Piket' };
    }
  };

  const verifyItem = async (id: number | string, status: 'Disetujui' | 'Ditolak') => {
    const { table, label } = getActiveConfig();
    setProcessingId(id);

    try {
      const { error } = await supabase
        .from(table)
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
        // Optimistic update
        if (activeTab === 'Presensi') {
          setPresensiList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        } else if (activeTab === 'Jurnal') {
          setJurnalList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        } else {
          setPiketList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status } : item));
        }

        Swal.fire({
          icon: status === 'Disetujui' ? 'success' : 'info',
          title: `${label} ${status}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1800
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const bulkVerifyCurrent = async () => {
    if (taskFilter === 'Belum') return;
    const { table, label } = getActiveConfig();
    const pendingItems = displayList.filter(item => !item.isUnsubmitted && item.status_verifikasi !== 'Disetujui');

    if (pendingItems.length === 0) {
      return Swal.fire('Info', `Semua ${label} yang tampil sudah berstatus Disetujui.`, 'info');
    }

    const result = await Swal.fire({
      title: 'Setujui Semua Tampil?',
      text: `Anda akan menyetujui ${pendingItems.length} data ${label} sekaligus.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui Semua',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const pendingIds = pendingItems.map(item => item.id);
      let hasError = false;

      for (let i = 0; i < pendingIds.length; i += 100) {
        const batchIds = pendingIds.slice(i, i + 100);
        const { error } = await supabase
          .from(table)
          .update({ status_verifikasi: 'Disetujui' })
          .in('id', batchIds);

        if (error) {
          hasError = true;
          Swal.fire('Gagal Sebagian', error.message, 'error');
          break;
        }
      }

      if (!hasError) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disetujui',
          text: `${pendingIds.length} data ${label} berhasil disetujui.`,
          confirmButtonColor: '#0B4619'
        });
        loadData();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal memproses persetujuan massal', 'error');
    } finally {
      setLoading(false);
    }
  };

// Helper: Normalisasi nama guru untuk perbandingan presisi tanpa false substring collision
function normalizeTeacherName(name?: string | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/,.*$/, '') // Hapus gelar setelah koma (misal: ", S.Pd.")
    .replace(/\b(s\.?pd\.?i?|m\.?pd\.?|s\.?kom\.?|s\.?si\.?|s\.?ag\.?|s\.?e\.?|s\.?t\.?|gr\.?)\b/gi, '') // Hapus singkatan gelar
    .replace(/[^a-z0-9\s]/gi, ' ') // Ganti tanda baca dengan spasi
    .replace(/\s+/g, ' ') // Rapikan multi-spasi
    .trim();
}

function isTeacherMatch(teacherName?: string | null, candidateName?: string | null, nip?: string | null): boolean {
  if (!teacherName || !candidateName) return false;
  const normTeacher = normalizeTeacherName(teacherName);
  const normCandidate = normalizeTeacherName(candidateName);

  if (normTeacher && normCandidate && normTeacher === normCandidate) return true;

  if (nip) {
    const normNip = normalizeTeacherName(nip);
    if (normNip && (normNip === normTeacher || normNip === normCandidate)) return true;
  }

  return false;
}

  // Target date for cross-referencing
  const effectiveDate = useMemo(() => {
    return date || getWitaDateStr();
  }, [date]);

  // Day name for the target date
  const effectiveDayName = useMemo(() => {
    const d = new Date(effectiveDate + 'T12:00:00+08:00');
    return getWitaDayName(d);
  }, [effectiveDate]);

  // Compute Unsubmitted Teachers per Tab
  const unsubmittedPresensi = useMemo(() => {
    if (allTeachers.length === 0) return [];
    
    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = presensiList.filter(p => {
      if (!p.timestamp) return false;
      if (p.timestamp.includes(targetDate)) return true;
      try {
        return getWitaDateStr(new Date(p.timestamp)) === targetDate;
      } catch {
        return false;
      }
    });

    return allTeachers
      .filter(t => {
        const hasSubmitted = submittedList.some(p => 
          isTeacherMatch(t.nama_guru, p.nama_guru, t.nip)
        );
        return !hasSubmitted;
      })
      .map(t => ({
        id: `unsub-presensi-${t.id}`,
        nama_guru: t.nama_guru,
        nip: t.nip || '-',
        mata_pelajaran: t.mata_pelajaran || 'Guru',
        task_type: 'Presensi',
        pesan_belum: 'Belum melakukan presensi datang maupun pulang',
        tanggal: targetDate,
        isUnsubmitted: true
      }));
  }, [allTeachers, presensiList, date, effectiveDate]);

  const unsubmittedJurnal = useMemo(() => {
    if (allTeachers.length === 0) return [];

    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = jurnalList.filter(j => j.tanggal === targetDate);

    const normalizeName = (s: string) => (s || '').toLowerCase().trim().replace(/z/g, 's');

    return allTeachers
      .filter(t => {
        const hasSubmitted = submittedList.some(j => 
          isTeacherMatch(t.nama_guru, j.nama_guru, t.nip)
        );
        return !hasSubmitted;
      })
      .map(t => {
        // Check schedule on this day
        const namaNorm = normalizeName(t.nama_guru);
        const firstName = namaNorm.split(/\s+/)[0] || '';
        const nipNorm = normalizeName(t.nip);

        const scheduledClasses = allJadwalPelajaran.filter((j: any) => {
          if (j.hari !== effectiveDayName) return false;
          const jNorm = normalizeName(j.nama_guru);
          return (nipNorm && nipNorm === jNorm) || 
            (namaNorm === jNorm) || 
            (firstName.length >= 2 && (firstName === jNorm || firstName.startsWith(jNorm)));
        });

        return {
          id: `unsub-jurnal-${t.id}`,
          nama_guru: t.nama_guru,
          nip: t.nip || '-',
          mata_pelajaran: t.mata_pelajaran || 'Guru',
          scheduledInfo: scheduledClasses.length > 0 
            ? `${scheduledClasses.length} Kelas Terjadwal (${effectiveDayName})` 
            : `Bebas KBM (${effectiveDayName})`,
          task_type: 'Jurnal',
          pesan_belum: scheduledClasses.length > 0 
            ? `Belum mengisi jurnal KBM untuk ${scheduledClasses.length} kelas terjadwal pada hari ${effectiveDayName}` 
            : `Belum mengisi jurnal pembelajaran untuk tanggal ${targetDate}`,
          tanggal: targetDate,
          isUnsubmitted: true
        };
      });
  }, [allTeachers, jurnalList, date, effectiveDate, effectiveDayName, allJadwalPelajaran]);

  const unsubmittedPiket = useMemo(() => {
    if (allTeachers.length === 0) return [];

    const piketToday = allPiketSchedule.find((p: any) => p.hari === effectiveDayName);
    if (!piketToday) return [];

    // Always filter strictly by targetDate = date || effectiveDate
    const targetDate = date || effectiveDate;
    const submittedList = piketList.filter(p => p.tanggal === targetDate);

    // Only teachers assigned to picket today
    const assignedTeachers = allTeachers.filter(t => 
      isGuruDiPiket(piketToday.daftar_guru, t.nama_guru)
    );

    return assignedTeachers
      .filter(t => {
        const hasSubmitted = submittedList.some(p => 
          isTeacherMatch(t.nama_guru, p.guru_pelapor, t.nip)
        );
        return !hasSubmitted;
      })
      .map(t => ({
        id: `unsub-piket-${t.id}`,
        guru_pelapor: t.nama_guru,
        nama_guru: t.nama_guru,
        nip: t.nip || '-',
        mata_pelajaran: t.mata_pelajaran || 'Petugas Piket',
        task_type: 'Piket',
        pesan_belum: `Terjadwal sebagai petugas piket hari ${effectiveDayName}, belum melapor`,
        tanggal: targetDate,
        isUnsubmitted: true
      }));
  }, [allTeachers, allPiketSchedule, piketList, date, effectiveDate, effectiveDayName]);

  // Reactive Instant Client-side Filter Calculation (Zero flicker, zero reload)
  const displayList = useMemo(() => {
    const unsubmittedList = activeTab === 'Presensi' 
      ? unsubmittedPresensi 
      : activeTab === 'Jurnal' 
      ? unsubmittedJurnal 
      : unsubmittedPiket;

    const submittedList = activeTab === 'Presensi' 
      ? presensiList 
      : activeTab === 'Jurnal' 
      ? jurnalList 
      : piketList;

    // Filter unsubmitted items by search
    const filteredUnsubmitted = unsubmittedList.filter((item: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (item.nama_guru || '').toLowerCase().includes(q) ||
        (item.guru_pelapor || '').toLowerCase().includes(q) ||
        (item.nip || '').toLowerCase().includes(q) ||
        (item.mata_pelajaran || '').toLowerCase().includes(q) ||
        (item.pesan_belum || '').toLowerCase().includes(q)
      );
    });

    // Filter submitted items by verification status and search
    const filteredSubmitted = submittedList.filter((item: any) => {
      // Verification status filter
      if (verifFilter !== 'Semua') {
        const status = item.status_verifikasi || 'Menunggu';
        if (status !== verifFilter) return false;
      }

      // Search filter
      if (!search) return true;
      const q = search.toLowerCase();
      if (activeTab === 'Presensi') {
        return (
          (item.nama_guru || '').toLowerCase().includes(q) ||
          (item.tipe_absen || '').toLowerCase().includes(q) ||
          (item.jenis_presensi || '').toLowerCase().includes(q)
        );
      } else if (activeTab === 'Jurnal') {
        return (
          (item.nama_guru || '').toLowerCase().includes(q) ||
          (item.mapel || '').toLowerCase().includes(q) ||
          (item.kelas || '').toLowerCase().includes(q) ||
          (item.materi || '').toLowerCase().includes(q)
        );
      } else {
        return (
          (item.guru_pelapor || '').toLowerCase().includes(q) ||
          (item.catatan_apel || '').toLowerCase().includes(q)
        );
      }
    });

    // 1. If filtering for Belum Menyelesaikan
    if (taskFilter === 'Belum') {
      return filteredUnsubmitted;
    }

    // 2. If filtering for Sudah Menyelesaikan
    if (taskFilter === 'Sudah') {
      return filteredSubmitted;
    }

    // 3. If filtering for Semua (Sudah & Belum): Combine submitted items with unsubmitted items
    if (verifFilter !== 'Semua') {
      return filteredSubmitted;
    }
    return [...filteredSubmitted, ...filteredUnsubmitted];
  }, [
    taskFilter, 
    verifFilter, 
    activeTab, 
    search, 
    presensiList, 
    jurnalList, 
    piketList, 
    unsubmittedPresensi, 
    unsubmittedJurnal, 
    unsubmittedPiket
  ]);

  return (
    <section id="view-admin-verif" className="view-section fade-in">
      <div className="glass-card p-4">
        {/* View Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-clipboard-check text-green-600 dark:text-green-400"></i> Verifikasi Data
          </h2>
          <button 
            type="button" 
            onClick={loadData} 
            className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
            title="Muat ulang data"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        {/* Filter Bar Controls */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-200 dark:border-gray-800 mb-4 space-y-3">
          {/* Date Picker Row */}
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <i className="fa-regular fa-calendar absolute left-3 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)} 
                className="w-full pl-8 pr-3 py-2.5 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
              />
            </div>
            <button 
              type="button" 
              onClick={() => setDate(getWitaDateStr())} 
              className="btn-click px-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl shrink-0 border border-emerald-200 dark:border-emerald-800"
            >
              Hari Ini
            </button>
            <button 
              type="button" 
              onClick={() => setDate('')} 
              className="btn-click px-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-bold rounded-xl shrink-0 border border-gray-300 dark:border-gray-600"
            >
              Semua
            </button>
          </div>

          {/* Reactive Dropdown Filters (Sudah/Belum & Status Verifikasi) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {/* Filter 1: Penyelesaian Tugas */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 ml-1">
                Filter Penyelesaian Tugas
              </label>
              <select
                value={taskFilter}
                onChange={e => setTaskFilter(e.target.value as 'Semua' | 'Sudah' | 'Belum')}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 font-semibold"
              >
                <option value="Semua">Semua Guru (Sudah & Belum)</option>
                <option value="Sudah">Sudah Menyelesaikan (Ada Pengajuan)</option>
                <option value="Belum">Belum Menyelesaikan (Belum Ada Data)</option>
              </select>
            </div>

            {/* Filter 2: Status Verifikasi */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1 ml-1">
                Filter Status Verifikasi
              </label>
              <select
                value={verifFilter}
                onChange={e => setVerifFilter(e.target.value as 'Semua' | 'Menunggu' | 'Disetujui' | 'Ditolak')}
                disabled={taskFilter === 'Belum'}
                className="w-full px-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="Semua">Semua Status Verifikasi</option>
                <option value="Menunggu">Menunggu Verifikasi</option>
                <option value="Disetujui">Disetujui</option>
                <option value="Ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Bulk Action Button or Indicator */}
          {taskFilter !== 'Belum' ? (
            <button 
              type="button" 
              onClick={bulkVerifyCurrent} 
              className="btn-click w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 py-2.5 rounded-xl text-xs font-bold border border-green-200 dark:border-green-800 flex justify-center items-center gap-2 hover:bg-green-200 dark:hover:bg-green-900/50 transition"
            >
              <i className="fa-solid fa-check-double"></i> Setujui Semua Tampil
            </button>
          ) : (
            <div className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-amber-600"></i>
              <span>Menampilkan guru yang belum menyelesaikan tugas {activeTab} untuk tanggal {effectiveDate}.</span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1">
          <button 
            type="button" 
            onClick={() => setActiveTab('Presensi')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Presensi' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Presensi
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('Jurnal')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Jurnal' 
                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            Jurnal
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab('Piket')} 
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm border transition ${
              activeTab === 'Piket' 
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800' 
                : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            <i className="fa-solid fa-shield-halved mr-1.5"></i> Piket
          </button>
        </div>

        {/* Text Search Bar */}
        <div className="relative mb-4 flex items-center gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-search absolute left-3.5 top-3.5 text-gray-400 dark:text-gray-400 text-xs"></i>
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder={activeTab === 'Piket' ? 'Cari guru pelapor atau catatan apel...' : 'Cari nama guru, NIP, atau mapel...'} 
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-400" 
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-3 py-2.5 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold shrink-0"
            >
              Reset
            </button>
          )}
        </div>

        {/* Verification Items List Grid */}
        <div id="verif-list-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[300px]">
          {loading && displayList.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 text-xs italic dark:text-gray-400">
              <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data verifikasi...
            </div>
          ) : displayList.length === 0 ? (
            <div className="col-span-full text-center py-10 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 my-2">
              <i className={`text-2xl mb-2 ${taskFilter === 'Belum' ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-clipboard-check text-gray-400'}`}></i>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {taskFilter === 'Belum' 
                  ? `Semua guru telah menyelesaikan tugas ${activeTab} untuk tanggal ini!` 
                  : search 
                  ? `Tidak ada data yang cocok dengan pencarian "${search}".` 
                  : 'Tidak ada data untuk diverifikasi.'}
              </p>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                </button>
              )}
            </div>
          ) : displayList.map((item: any) => {
            // Render Unsubmitted Teacher Card
            if (item.isUnsubmitted) {
              return (
                <div 
                  key={item.id} 
                  className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-900/40 shadow-sm flex flex-col justify-between gap-2.5 transition hover:border-rose-400"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                          {item.nama_guru || item.guru_pelapor}
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">
                          {item.nip !== '-' && item.nip ? `NIP: ${item.nip}` : item.mata_pelajaran}
                        </p>
                      </div>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                        <i className="fa-solid fa-clock-rotate-left mr-1 text-[8px]"></i> Belum Selesai
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                      <p className="font-semibold leading-snug flex items-start gap-1.5">
                        <i className="fa-solid fa-circle-exclamation mt-0.5 text-rose-500 text-[10px] shrink-0"></i>
                        <span>{item.pesan_belum}</span>
                      </p>
                      {item.scheduledInfo && (
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 pl-4 font-medium">
                          Status: {item.scheduledInfo}
                        </p>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between pt-1">
                      <span>Tanggal: {item.tanggal}</span>
                      <span className="font-semibold text-rose-600 dark:text-rose-400">Belum Ada Data</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="py-1 px-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 text-center text-[10px] text-gray-500 dark:text-gray-400 font-medium italic">
                      Menunggu pengajuan dari guru
                    </div>
                  </div>
                </div>
              );
            }

            // Render Standard Submitted Verification Card
            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {activeTab === 'Piket' ? item.guru_pelapor : item.nama_guru}
                  </h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                      item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>{item.status_verifikasi || 'Menunggu'}</span>
                </div>

                {activeTab === 'Presensi' ? (
                  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-semibold">Waktu:</span> {formatTimestampWita(item.timestamp)}</p>
                    <p><span className="font-semibold">Tipe:</span> <span className="font-bold text-nizamudin-green dark:text-green-400">{item.tipe_absen}</span></p>
                    <p><span className="font-semibold">Jenis:</span> {item.jenis_presensi} {item.detail_izin && `(${item.detail_izin})`}</p>
                    {item.link_bukti && item.link_bukti !== '-' && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={transformGoogleDriveUrl(item.link_bukti)} 
                          alt="Bukti Presensi" 
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <a href={item.link_bukti} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                          <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                        </a>
                      </div>
                    )}
                  </div>
                ) : activeTab === 'Jurnal' ? (
                  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                    <p><span className="font-semibold">Kelas/Mapel:</span> {item.kelas} - {item.mapel}</p>
                    <p className="line-clamp-2"><span className="font-semibold">Materi:</span> {item.materi}</p>
                    {item.link_bukti_foto && item.link_bukti_foto !== '-' && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={transformGoogleDriveUrl(item.link_bukti_foto)} 
                          alt="Bukti Jurnal" 
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <a href={item.link_bukti_foto} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs block">
                          <i className="fa-solid fa-arrow-up-right-from-square mr-1"></i> Bukti Lampiran
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-semibold">Tanggal:</span> {item.tanggal}</p>
                    <p><span className="font-semibold">Guru Pelapor:</span> {item.guru_pelapor}</p>
                    <p className="line-clamp-2"><span className="font-semibold">Catatan Apel:</span> {item.catatan_apel || '-'}</p>
                    {item.link_foto && item.link_foto !== '-' && (
                      <div className="mt-2 flex items-center gap-2">
                        <img 
                          src={transformGoogleDriveUrl(item.link_foto)} 
                          alt="Foto Piket" 
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-xs block">
                          <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
                    onClick={() => verifyItem(item.id, 'Disetujui')} 
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      item.status_verifikasi === 'Disetujui'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                        : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                    }`}
                  >
                    {processingId === item.id ? (
                      <i className="fa-solid fa-spinner animate-spin"></i>
                    ) : (
                      <><i className="fa-solid fa-check"></i> Setujui</>
                    )}
                  </button>
                  <button 
                    disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                    onClick={() => verifyItem(item.id, 'Ditolak')} 
                    className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                      item.status_verifikasi === 'Ditolak'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                        : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
                    }`}
                  >
                    {processingId === item.id ? (
                      <i className="fa-solid fa-spinner animate-spin"></i>
                    ) : (
                      <><i className="fa-solid fa-xmark"></i> Tolak</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Summary */}
        <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-white/80 font-medium">
            {displayList.length} Data {taskFilter === 'Belum' ? 'Guru Belum Menyelesaikan' : taskFilter === 'Semua' ? 'Guru (Sudah & Belum)' : 'Diverifikasi'}
          </span>
        </div>
      </div>
    </section>
  );
}
