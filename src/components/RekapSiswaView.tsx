'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';

export default function RekapSiswaView({ user }: { user: any }) {
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState('');
  const [mapel, setMapel] = useState('');
  const [search, setSearch] = useState('');

  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [rekapData, setRekapData] = useState<any[] | null>(null);

  // Wali Kelas feature states
  const [waliKelasList, setWaliKelasList] = useState<any[]>([]);
  const [activeWaliKelas, setActiveWaliKelas] = useState<any | null>(null);
  const [showWaliInput, setShowWaliInput] = useState(false);
  const [waliTanggal, setWaliTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [waliStudents, setWaliStudents] = useState<any[]>([]);
  const [waliAttendance, setWaliAttendance] = useState<Record<string, { status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'; keterangan: string; logs: string[] }>>({});
  const [waliLoading, setWaliLoading] = useState(false);
  const [waliSaving, setWaliSaving] = useState(false);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        let siswaQuery = supabase.from('data_siswa').select('kelas');
        if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
        const { data: siswa } = await siswaQuery;
        if (siswa) {
          const uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean))) as string[];
          setKelasList(uniqueKelas);
          if (uniqueKelas.length > 0) {
            setKelas(prev => prev || uniqueKelas[0]);
          }
        }

        let mapelQuery = supabase.from('data_mapel').select('nama_mata_pelajaran');
        if (user?.sekolah_id) mapelQuery = mapelQuery.eq('sekolah_id', user.sekolah_id);
        const { data: mData } = await mapelQuery;
        if (mData) {
          const uniqueMapel = Array.from(new Set(mData.map(m => m.nama_mata_pelajaran).filter(Boolean))) as string[];
          setMapelList(uniqueMapel);
        }

        // Fetch Wali Kelas assignments
        let wQuery = supabase.from('wali_kelas').select('*');
        if (user?.sekolah_id) wQuery = wQuery.eq('sekolah_id', user.sekolah_id);
        const { data: wData } = await wQuery;
        if (wData && wData.length > 0) {
          const userWalis = user?.role === 'Admin'
            ? wData
            : wData.filter(w => 
                (user?.id && w.guru_id === user.id) ||
                (user?.nama && w.nama_guru && w.nama_guru.toLowerCase().trim() === user.nama.toLowerCase().trim()) ||
                (user?.username && w.nip && w.nip === user.username)
              );
          setWaliKelasList(userWalis);
          if (userWalis.length > 0) {
            setActiveWaliKelas(userWalis[0]);
            setKelas(prev => prev || userWalis[0].kelas);
          }
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
      }
    };
    fetchMaster();
  }, [user]);

  // Load students and existing absensi when activeWaliKelas, waliTanggal, or showWaliInput changes
  useEffect(() => {
    if (!activeWaliKelas || !showWaliInput) return;

    const loadWaliData = async () => {
      setWaliLoading(true);
      try {
        let sQ = supabase
          .from('data_siswa')
          .select('*')
          .eq('kelas', activeWaliKelas.kelas)
          .order('nama_siswa', { ascending: true });
        if (user?.sekolah_id) sQ = sQ.eq('sekolah_id', user.sekolah_id);
        const { data: studentsData } = await sQ;

        if (studentsData) {
          setWaliStudents(studentsData);

          let aQ = supabase
            .from('absensi')
            .select('*')
            .eq('tanggal', waliTanggal)
            .eq('kelas', activeWaliKelas.kelas);
          if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
          const { data: absensiData } = await aQ;

          const map: Record<string, { status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'; keterangan: string; logs: string[] }> = {};
          studentsData.forEach(s => {
            const found = absensiData?.find(a => a.nisn === s.nisn);
            map[s.nisn] = {
              status: (found?.status as any) || 'Hadir',
              keterangan: found?.keterangan || '',
              logs: Array.isArray(found?.log_perubahan) ? (found.log_perubahan as string[]) : []
            };
          });
          setWaliAttendance(map);
        }
      } catch (err) {
        console.error('Error loading wali students and absensi:', err);
      } finally {
        setWaliLoading(false);
      }
    };

    loadWaliData();
  }, [activeWaliKelas, waliTanggal, showWaliInput, user?.sekolah_id]);

  const handleSetWaliStatus = (nisn: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    setWaliAttendance(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || { keterangan: '', logs: [] }),
        status
      }
    }));
  };

  const handleSetWaliKeterangan = (nisn: string, keterangan: string) => {
    setWaliAttendance(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || { status: 'Hadir', logs: [] }),
        keterangan
      }
    }));
  };

  const handleSetAllWaliStatus = (status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa') => {
    setWaliAttendance(prev => {
      const updated = { ...prev };
      waliStudents.forEach(s => {
        updated[s.nisn] = {
          ...(updated[s.nisn] || { keterangan: '', logs: [] }),
          status
        };
      });
      return updated;
    });
  };

  const handleSaveWaliAttendance = async () => {
    if (!activeWaliKelas || waliStudents.length === 0) return;
    setWaliSaving(true);
    try {
      const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      const rowsToUpsert = waliStudents.map(s => {
        const record = waliAttendance[s.nisn] || { status: 'Hadir', keterangan: '', logs: [] };
        const currentLogs = Array.isArray(record.logs) ? [...record.logs] : [];
        const logNote = record.keterangan ? `. Keterangan: ${record.keterangan}` : '';
        const logEntry = `[${nowWita} WITA] Diubah ke ${record.status} oleh ${user?.nama || 'Wali Kelas'} (Wali Kelas)${logNote}`;

        return {
          sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
          tanggal: waliTanggal,
          kelas: activeWaliKelas.kelas,
          siswa_id: s.id,
          nisn: s.nisn,
          nama_siswa: s.nama_siswa,
          status: record.status,
          keterangan: record.keterangan || null,
          sumber_perubahan: 'Wali Kelas',
          diubah_oleh: user?.nama || 'Wali Kelas',
          log_perubahan: [...currentLogs, logEntry],
          updated_at: new Date().toISOString()
        };
      });

      const { error } = await supabase.from('absensi').upsert(rowsToUpsert, {
        onConflict: 'sekolah_id, tanggal, nisn'
      });

      if (error) throw error;

      Swal.fire({
        icon: 'success',
        title: 'Presensi Tersimpan',
        text: `Presensi siswa kelas ${activeWaliKelas.kelas} tanggal ${waliTanggal} berhasil disimpan dan disinkronkan ke seluruh mapel!`,
        confirmButtonColor: '#0d9488'
      });

      // If viewing the same class, refresh recap
      if (kelas === activeWaliKelas.kelas) {
        tarikRekap();
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal menyimpan presensi', 'error');
    } finally {
      setWaliSaving(false);
    }
  };

  const tarikRekap = async () => {
    if (!kelas) {
      Swal.fire({
        icon: 'warning',
        title: 'Peringatan',
        text: 'Pilih kelas terlebih dahulu.',
        confirmButtonColor: '#0d9488'
      });
      return;
    }
    setLoading(true);

    try {
      // Fetch siswa for this class
      let siswaQuery = supabase
        .from('data_siswa')
        .select('*')
        .eq('kelas', kelas)
        .order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
      const { data: siswa } = await siswaQuery;

      // Fetch jurnal for this class & mapel within date
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('absensi_siswa, detail_absen, tanggal, kehadiran_murid')
        .eq('kelas', kelas)
        .order('tanggal', { ascending: true });

      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
      if (mapel) query = query.eq('mapel', mapel);
      if (startDate) query = query.gte('tanggal', startDate);
      if (endDate) query = query.lte('tanggal', endDate);

      const { data: jurnal } = await query;

      // Also fetch direct absensi (e.g. recorded by Wali Kelas)
      let absensiQuery = supabase
        .from('absensi')
        .select('*')
        .eq('kelas', kelas);
      if (user?.sekolah_id) absensiQuery = absensiQuery.eq('sekolah_id', user.sekolah_id);
      if (startDate) absensiQuery = absensiQuery.gte('tanggal', startDate);
      if (endDate) absensiQuery = absensiQuery.lte('tanggal', endDate);
      const { data: directAbsensi } = await absensiQuery;

      // Process rekap: initialize with hadir: 0
      const rekapMap: Record<string, any> = {};
      siswa?.forEach(s => {
        rekapMap[s.nama_siswa] = {
          ...s,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          total: 0,
          persentase: 0
        };
      });

      // Parse multi-format student attendance from journals
      jurnal?.forEach(j => {
        let absensiJson: Record<string, string> | null = null;
        if (j.absensi_siswa && typeof j.absensi_siswa === 'string' && j.absensi_siswa.trim().startsWith('{')) {
          try {
            absensiJson = JSON.parse(j.absensi_siswa);
          } catch (_) {
            absensiJson = null;
          }
        }

        const combinedText = `${j.kehadiran_murid || ''} ${j.absensi_siswa || ''} ${j.detail_absen || ''}`.toLowerCase();
        const isSemuaHadir = /semua\s*hadir|hadir\s*semua|semua\s*siswa\s*hadir/i.test(combinedText);

        if (isSemuaHadir) {
          siswa?.forEach(s => {
            const target = rekapMap[s.nama_siswa];
            if (target) target.hadir++;
          });
          return;
        }

        // Check if JSON has explicit entries
        if (absensiJson && Object.keys(absensiJson).length > 0) {
          const jsonValues = Object.values(absensiJson).map(v => String(v).trim().toUpperCase());
          const hasExplicitHadir = jsonValues.some(v => v === 'H' || v === 'HADIR');

          siswa?.forEach(s => {
            const target = rekapMap[s.nama_siswa];
            if (!target) return;
            const val = s.nisn && absensiJson![s.nisn] !== undefined 
              ? absensiJson![s.nisn] 
              : absensiJson![s.nama_siswa];

            if (val !== undefined) {
              const code = String(val).trim().toUpperCase();
              if (code === 'H' || code === 'HADIR') target.hadir++;
              else if (code === 'S' || code === 'SAKIT') target.sakit++;
              else if (code === 'I' || code === 'IZIN') target.izin++;
              else if (code === 'A' || code === 'ALPA') target.alpa++;
            } else if (!hasExplicitHadir) {
              // If JSON only listed absentees, unlisted students were present
              target.hadir++;
            }
          });
          return;
        }

        // Parse detail_absen and keywords for absentees
        const absentStatuses: Record<string, 'S' | 'I' | 'A' | 'H'> = {};
        const detail = `${j.detail_absen || ''} ${j.kehadiran_murid || ''}`;

        siswa?.forEach(s => {
          const nama = s.nama_siswa;
          const escaped = nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = detail.match(new RegExp(`${escaped}\\s*\\(([HSIAhsia])\\)`, 'i'));
          if (match) {
            absentStatuses[nama] = match[1].toUpperCase() as 'S' | 'I' | 'A' | 'H';
            return;
          }

          // Keyword check: "Sakit: Nama, Izin: Nama"
          const detailLower = detail.toLowerCase();
          const namaLower = nama.toLowerCase();
          if (detailLower.includes(namaLower)) {
            const idxNama = detailLower.indexOf(namaLower);
            const idxSakit = detailLower.lastIndexOf('sakit', idxNama);
            const idxIzin = detailLower.lastIndexOf('izin', idxNama);
            const idxAlpa = detailLower.lastIndexOf('alpa', idxNama);
            const idxHadir = detailLower.lastIndexOf('hadir', idxNama);

            const maxIdx = Math.max(idxSakit, idxIzin, idxAlpa, idxHadir);
            if (maxIdx === idxSakit && idxSakit !== -1) absentStatuses[nama] = 'S';
            else if (maxIdx === idxIzin && idxIzin !== -1) absentStatuses[nama] = 'I';
            else if (maxIdx === idxAlpa && idxAlpa !== -1) absentStatuses[nama] = 'A';
            else if (maxIdx === idxHadir && idxHadir !== -1) absentStatuses[nama] = 'H';
          }
        });

        // Credit students based on resolved status for this session
        siswa?.forEach(s => {
          const target = rekapMap[s.nama_siswa];
          if (!target) return;
          const st = absentStatuses[s.nama_siswa];

          if (st === 'S') target.sakit++;
          else if (st === 'I') target.izin++;
          else if (st === 'A') target.alpa++;
          else if (st === 'H') target.hadir++;
          else {
            // Unmentioned student: absent students were accounted for, remaining students were present
            target.hadir++;
          }
        });
      });

      // Integrate direct absensi if journals are not present or for additional dates
      if ((!jurnal || jurnal.length === 0) && directAbsensi && directAbsensi.length > 0) {
        directAbsensi.forEach(a => {
          siswa?.forEach(s => {
            if (s.nisn === a.nisn || s.nama_siswa === a.nama_siswa) {
              const target = rekapMap[s.nama_siswa];
              if (!target) return;
              const st = String(a.status).toLowerCase();
              if (st === 'hadir') target.hadir++;
              else if (st === 'sakit') target.sakit++;
              else if (st === 'izin') target.izin++;
              else if (st === 'alpa') target.alpa++;
            }
          });
        });
      }

      // Compute total sessions and attendance percentage per student: (total_present / total_students) * 100
      const result = Object.values(rekapMap).map(s => {
        const total = s.hadir + s.sakit + s.izin + s.alpa;
        // Formula: (total_present / total_students) * 100 with zero division guard
        const persentase = total > 0 ? Math.round((s.hadir / total) * 100) : 0;
        return {
          ...s,
          total,
          persentase
        };
      });

      setRekapData(result);
    } catch (error: any) {
      console.error('Error calculating student recap:', error);
      Swal.fire('Error', error?.message || 'Gagal memproses rekap data siswa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = (rekapData || []).filter(s => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (s.nama_siswa && s.nama_siswa.toLowerCase().includes(query)) ||
           (s.nisn && s.nisn.toLowerCase().includes(query));
  });

  // Calculate summary metrics
  const totalSiswa = rekapData ? rekapData.length : 0;
  const totalHadir = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.hadir || 0), 0) : 0;
  const totalSakit = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.sakit || 0), 0) : 0;
  const totalIzin = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.izin || 0), 0) : 0;
  const totalAlpa = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.alpa || 0), 0) : 0;
  const totalAllSessions = totalHadir + totalSakit + totalIzin + totalAlpa;
  const avgKehadiran = totalAllSessions > 0 ? Math.round((totalHadir / totalAllSessions) * 100) : 0;

  return (
    <section id="view-rekap-siswa" className="view-section fade-in">
        <div className="glass-card p-4">
            <PrintHeader />
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                Rekapitulasi Presensi Kehadiran Siswa
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
                <span>Kelas: <strong>{kelas || '-'}</strong></span>
                {mapel && <span>Mapel: <strong>{mapel}</strong></span>}
                <span><strong>{formatPeriodHeader('', startDate, endDate)}</strong></span>
                <span>Guru: <strong>{user?.nama || '-'}</strong></span>
              </div>
            </div>

            {/* WALI KELAS BANNER & TOGGLE */}
            {waliKelasList.length > 0 && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-2xl mb-5 no-print shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shadow-sm shrink-0">
                      <i className="fa-solid fa-user-shield"></i>
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <span>Penugasan Wali Kelas</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 text-[10px]">
                          {activeWaliKelas?.kelas || 'Kelas'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                        Input presensi harian siswa (Izin, Sakit, Alpa, Hadir) dengan sinkronisasi global otomatis ke jurnal semua guru mapel.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {waliKelasList.length > 1 && (
                      <select
                        value={activeWaliKelas?.id}
                        onChange={e => {
                          const w = waliKelasList.find(item => item.id === e.target.value);
                          if (w) {
                            setActiveWaliKelas(w);
                            setKelas(w.kelas);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-emerald-300 dark:border-emerald-700 font-semibold"
                      >
                        {waliKelasList.map(w => (
                          <option key={w.id} value={w.id}>Kelas {w.kelas}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowWaliInput(!showWaliInput)}
                      className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition shrink-0"
                    >
                      <i className={`fa-solid ${showWaliInput ? 'fa-xmark' : 'fa-pen-to-square'}`}></i>
                      {showWaliInput ? 'Tutup Form Presensi' : 'Input Presensi Kelas'}
                    </button>
                  </div>
                </div>

                {/* EXPANDED WALI KELAS INPUT PANEL */}
                {showWaliInput && (
                  <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800/60 space-y-4 fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Tanggal Presensi:</label>
                        <input
                          type="date"
                          value={waliTanggal}
                          onChange={e => setWaliTanggal(e.target.value)}
                          className="px-2.5 py-1.5 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-1">Tandai Cepat:</span>
                        <button
                          type="button"
                          onClick={() => handleSetAllWaliStatus('Hadir')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition"
                        >
                          Semua Hadir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllWaliStatus('Sakit')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 transition"
                        >
                          Semua Sakit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetAllWaliStatus('Izin')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 transition"
                        >
                          Semua Izin
                        </button>
                      </div>
                    </div>

                    {waliLoading ? (
                      <div className="text-center py-8 text-xs text-gray-500 dark:text-gray-400">
                        <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data siswa kelas {activeWaliKelas?.kelas}...
                      </div>
                    ) : waliStudents.length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-500 italic">
                        Tidak ada data siswa terdaftar di kelas {activeWaliKelas?.kelas}.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scroll pr-1">
                        {waliStudents.map((siswa, idx) => {
                          const currentRec = waliAttendance[siswa.nisn] || { status: 'Hadir', keterangan: '', logs: [] };
                          return (
                            <div
                              key={siswa.nisn || idx}
                              className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-2.5 min-w-[200px]">
                                <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                                    {siswa.nama_siswa}
                                  </div>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                    NISN: {siswa.nisn || '-'}
                                  </div>
                                  {currentRec.logs && currentRec.logs.length > 0 && (
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5 line-clamp-1">
                                      <i className="fa-solid fa-clock-rotate-left mr-1"></i>
                                      Terakhir: {currentRec.logs[currentRec.logs.length - 1]}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 md:justify-end flex-1">
                                <div className="flex gap-1">
                                  {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map(st => {
                                    const isSelected = currentRec.status === st;
                                    const colorClasses = 
                                      st === 'Hadir' ? (isSelected ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      st === 'Izin' ? (isSelected ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      st === 'Sakit' ? (isSelected ? 'bg-yellow-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      (isSelected ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300');

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleSetWaliStatus(siswa.nisn, st)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${colorClasses}`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}
                                </div>

                                <input
                                  type="text"
                                  placeholder="Keterangan / alasan (opsional)..."
                                  value={currentRec.keterangan || ''}
                                  onChange={e => handleSetWaliKeterangan(siswa.nisn, e.target.value)}
                                  className="w-full md:w-56 px-2.5 py-1 text-[11px] rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowWaliInput(false)}
                        className="btn-click px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                      >
                        Tutup
                      </button>
                      <button
                        type="button"
                        disabled={waliSaving || waliLoading || waliStudents.length === 0}
                        onClick={handleSaveWaliAttendance}
                        className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {waliSaving ? (
                          <>
                            <i className="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-cloud-arrow-up"></i> Simpan Presensi Kelas
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 no-print">
              <i className="fa-solid fa-users-viewfinder text-teal-500 dark:text-teal-400 text-base"></i> Rekap Absen Siswa
            </h2>
            <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl mb-4 space-y-3 no-print">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">DARI TANGGAL</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">SAMPAI TANGGAL</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800" />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">KELAS <span className="text-red-500 dark:text-red-400">*</span></label>
                      <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800">
                        <option value="" disabled className="text-gray-900 dark:text-white dark:bg-gray-800">Pilih...</option>
                        {kelasList.map((k, i) => <option key={i} value={k} className="text-gray-900 dark:text-white dark:bg-gray-800">{k}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">MATA PELAJARAN</label>
                      <select value={mapel} onChange={e => setMapel(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800">
                        <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">Semua Mapel</option>
                        {mapelList.map((m, i) => <option key={i} value={m} className="text-gray-900 dark:text-white dark:bg-gray-800">{m}</option>)}
                      </select>
                    </div>
                </div>
                <button type="button" onClick={tarikRekap} disabled={loading} className="btn-click w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-xs font-bold mt-2 shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
                  {loading ? <i className="fa-solid fa-circle-notch fa-spin text-sm"></i> : <i className="fa-solid fa-search text-sm"></i>} Tampilkan Rekap
                </button>
            </div>
            
            {rekapData ? (
              <div id="hasil-rekap-siswa" className="flex flex-col gap-4 fade-in">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 no-print">
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-teal-800 dark:text-teal-300">Total Siswa</div>
                          <div className="text-lg font-black text-teal-600 dark:text-teal-400">{totalSiswa}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-green-800 dark:text-green-300">% Kehadiran</div>
                          <div className="text-lg font-black text-green-600 dark:text-green-400">{avgKehadiran}%</div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Hadir</div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalHadir}</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-yellow-800 dark:text-yellow-300">Sakit</div>
                          <div className="text-lg font-black text-yellow-600 dark:text-yellow-400">{totalSakit}</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-orange-800 dark:text-orange-300">Izin</div>
                          <div className="text-lg font-black text-orange-600 dark:text-orange-400">{totalIzin}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-red-800 dark:text-red-300">Alpa</div>
                          <div className="text-lg font-black text-red-600 dark:text-red-400">{totalAlpa}</div>
                      </div>
                  </div>

                  {/* Student search input & Orientation Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 no-print">
                      <div className="relative flex-1 min-w-[200px]">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            placeholder="Cari nama atau NISN siswa..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                          />
                      </div>
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold"
                        >
                          Reset
                        </button>
                      )}
                      <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />
                  </div>

                  <div className="overflow-x-auto w-full border border-gray-300 dark:border-gray-700 print:border-black rounded-xl print:overflow-visible shadow-sm">
                      <table className="w-full text-xs text-left border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">
                          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                            <tr>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-10">No</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black w-28">NISN</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black">Nama Siswa</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-emerald-700 dark:text-emerald-400 print:text-black">Hadir</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-yellow-700 dark:text-yellow-400 print:text-black">Sakit</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-orange-700 dark:text-orange-400 print:text-black">Izin</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-red-700 dark:text-red-400 print:text-black">Alpa</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-24 text-blue-700 dark:text-blue-400 print:text-black">% Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((s, i) => (
                              <tr key={i} className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-900 dark:text-white">
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">{i + 1}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-mono text-[11px] print:text-[8pt]">{s.nisn || '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-semibold">{s.nama_siswa}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-emerald-700 dark:text-emerald-400 print:text-black">{s.hadir > 0 ? s.hadir : '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-yellow-700 dark:text-yellow-400 print:text-black">{s.sakit > 0 ? s.sakit : '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-orange-700 dark:text-orange-400 print:text-black">{s.izin > 0 ? s.izin : '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-red-700 dark:text-red-400 print:text-black">{s.alpa > 0 ? s.alpa : '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold text-blue-700 dark:text-blue-400 print:text-black">
                                  {s.total > 0 ? `${s.persentase}%` : '-'}
                                </td>
                              </tr>
                            ))}
                            {filteredData.length === 0 && (
                              <tr>
                                <td colSpan={8} className="text-center py-6 italic text-gray-500 dark:text-gray-400 text-xs">
                                  {search ? 'Tidak ada siswa yang cocok dengan kata kunci pencarian.' : 'Tidak ada data siswa untuk kelas tersebut.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                      </table>
                  </div>
                  
                  <PrintSignature
                    leftTitle="Mengetahui,"
                    leftSubtitle={user?.role === 'guru' ? 'Guru Mata Pelajaran' : 'Wali Kelas'}
                    leftName={user?.nama}
                    leftNip={user?.nip}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 no-print">
                      <button type="button" onClick={() => {
                        if (!rekapData || rekapData.length === 0) return;
                        const headers = ['No', 'NISN', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran'];
                        const csvRows = [headers.join(',')];
                        rekapData.forEach((r: any, i: number) => {
                          const persentaseStr = r.total > 0 ? `${r.persentase}%` : '0%';
                          csvRows.push([i+1, r.nisn||'', `"${r.nama_siswa}"`, r.hadir||0, r.sakit||0, r.izin||0, r.alpa||0, `"${persentaseStr}"`].join(','));
                        });
                        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Siswa_${kelas}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }} className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                        <i className="fa-solid fa-file-excel text-sm"></i> Excel
                      </button>
                      <button type="button" onClick={() => window.print()} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                        <i className="fa-solid fa-print text-sm"></i> Cetak Dokumen
                      </button>
                  </div>
              </div>
            ) : (
              <div id="rekap-siswa-kosong" className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic no-print">Silakan atur filter dan klik tampilkan.</div>
            )}
        </div>
    </section>
  );
}

