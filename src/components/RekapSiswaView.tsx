'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { PrintHeader, PrintSignature, PrintOrientationToggle, formatPeriodHeader } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';

export default function RekapSiswaView({ 
  user, 
  assignedKelas: propAssignedKelas 
}: { 
  user: any; 
  assignedKelas?: string | null; 
}) {
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin' || user?.role === 'Admin';

  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('portrait');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [kelas, setKelas] = useState(propAssignedKelas || '');
  const [mapel, setMapel] = useState('');
  const [search, setSearch] = useState('');

  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [rekapData, setRekapData] = useState<any[] | null>(null);

  // Dedicated Tab state: 'gerbang' (Presensi Gerbang Piket) vs 'rekap' (Rekap Absen Siswa)
  const [activeTab, setActiveTab] = useState<'gerbang' | 'rekap'>('gerbang');

  // Gerbang (Gate Attendance) states
  const [gerbangTanggal, setGerbangTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [gerbangKelas, setGerbangKelas] = useState<string>(propAssignedKelas || '');
  const [gerbangStudents, setGerbangStudents] = useState<any[]>([]);
  const [gerbangLoading, setGerbangLoading] = useState(false);
  const [gerbangSearch, setGerbangSearch] = useState('');
  const [gerbangFilterStatus, setGerbangFilterStatus] = useState<'semua' | 'datang' | 'pulang' | 'belum'>('semua');
  const [waliGateLogs, setWaliGateLogs] = useState<Record<string, { datang?: any; pulang?: any }>>({});

  // Wali Kelas feature states
  const [waliKelasList, setWaliKelasList] = useState<any[]>([]);
  const [activeWaliKelas, setActiveWaliKelas] = useState<any | null>(null);
  const [showWaliInput, setShowWaliInput] = useState(false);
  const [waliTanggal, setWaliTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [waliStudents, setWaliStudents] = useState<any[]>([]);
  const [waliAttendance, setWaliAttendance] = useState<Record<string, { status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'; keterangan: string; logs: string[] }>>({});
  const [waliLoading, setWaliLoading] = useState(false);
  const [waliSaving, setWaliSaving] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        let siswaQuery = supabase.from('data_siswa').select('kelas');
        if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
        const { data: siswa } = await siswaQuery;
        let uniqueKelas: string[] = [];
        if (siswa) {
          uniqueKelas = Array.from(new Set(siswa.map(s => s.kelas).filter(Boolean))) as string[];
          setKelasList(uniqueKelas);
          if (uniqueKelas.length > 0 && isAdmin) {
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
        let resolvedWaliKelas = '';
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
            resolvedWaliKelas = userWalis[0].kelas;
          }
        }

        // Automatic filter for Wali Kelas: prioritize assigned class from propAssignedKelas, penugasan.kelas_binaan, or wali_kelas
        const assignedWali = propAssignedKelas || user?.penugasan?.kelas_binaan || user?.wali_kelas || resolvedWaliKelas;
        if (user?.role !== 'Admin' && assignedWali) {
          setGerbangKelas(assignedWali);
          setKelas(assignedWali);
        } else if (uniqueKelas.length > 0) {
          setGerbangKelas(prev => prev || uniqueKelas[0]);
          if (!propAssignedKelas) {
            setKelas(prev => prev || uniqueKelas[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching master data:', error);
      } finally {
        setMasterLoaded(true);
      }
    };
    fetchMaster();
  }, [user, propAssignedKelas, isAdmin]);

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

          let pQ = supabase
            .from('presensi_siswa')
            .select('*')
            .eq('tanggal', waliTanggal)
            .eq('kelas', activeWaliKelas.kelas);
          if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
          const { data: gateData } = await pQ;

          const gateMap: Record<string, { datang?: any; pulang?: any }> = {};
          if (gateData) {
            gateData.forEach((g: any) => {
              const k = g.nisn || g.siswa_id;
              if (!gateMap[k]) gateMap[k] = {};
              if (g.status === 'datang') gateMap[k].datang = g;
              if (g.status === 'pulang') gateMap[k].pulang = g;
            });
          }
          setWaliGateLogs(gateMap);

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

  // Effect to load Gate Attendance records from presensi_siswa for selected gerbangKelas & gerbangTanggal
  useEffect(() => {
    if (!gerbangKelas) return;

    const fetchGerbangAttendance = async () => {
      setGerbangLoading(true);
      try {
        let sQ = supabase
          .from('data_siswa')
          .select('*')
          .eq('kelas', gerbangKelas)
          .order('nama_siswa', { ascending: true });
        if (user?.sekolah_id) sQ = sQ.eq('sekolah_id', user.sekolah_id);
        const { data: studentsData } = await sQ;

        let pQ = supabase
          .from('presensi_siswa')
          .select('*')
          .eq('kelas', gerbangKelas)
          .eq('tanggal', gerbangTanggal);
        if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
        const { data: gateLogs } = await pQ;

        if (studentsData) {
          const combined = studentsData.map(siswa => {
            const datang = (gateLogs || []).find(p => 
              (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'datang'
            );
            const pulang = (gateLogs || []).find(p => 
              (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'pulang'
            );
            const rawJamDatang = datang?.jam ? String(datang.jam).trim() : null;
            const jamDatang = rawJamDatang ? (rawJamDatang.length > 5 ? rawJamDatang.slice(0, 5) : rawJamDatang) : null;
            const rawJamPulang = pulang?.jam ? String(pulang.jam).trim() : null;
            const jamPulang = rawJamPulang ? (rawJamPulang.length > 5 ? rawJamPulang.slice(0, 5) : rawJamPulang) : null;

            return {
              ...siswa,
              datang,
              pulang,
              jamDatang,
              jamPulang,
              hasDatang: !!datang,
              hasPulang: !!pulang,
              deviceDatang: datang?.device_id || null,
              devicePulang: pulang?.device_id || null
            };
          });
          setGerbangStudents(combined);
        } else {
          setGerbangStudents([]);
        }
      } catch (err) {
        console.error('Error fetching gerbang attendance:', err);
      } finally {
        setGerbangLoading(false);
      }
    };

    fetchGerbangAttendance();
  }, [gerbangKelas, gerbangTanggal, user?.sekolah_id]);

  const exportGerbangCsv = () => {
    if (gerbangStudents.length === 0) return;
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Tanggal', 'Jam Datang', 'Jam Pulang', 'Status'];
    const rows = [headers.join(',')];
    gerbangStudents.forEach((s, idx) => {
      const statusStr = s.hasPulang ? 'Sudah Pulang' : s.hasDatang ? 'Hadir Datang' : 'Belum Presensi';
      rows.push([
        idx + 1,
        s.nisn || '',
        `"${s.nama_siswa}"`,
        s.kelas || gerbangKelas,
        gerbangTanggal,
        s.jamDatang ? `${s.jamDatang} WITA` : '-',
        s.jamPulang ? `${s.jamPulang} WITA` : '-',
        `"${statusStr}"`
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Presensi_Gerbang_${gerbangKelas}_${gerbangTanggal}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const userWaliKelasString = typeof user?.wali_kelas === 'string' ? user.wali_kelas : user?.wali_kelas?.kelas;
  const rawAllowed = [
    propAssignedKelas,
    user?.penugasan?.kelas_binaan,
    userWaliKelasString,
    ...waliKelasList.map(w => w.kelas)
  ].filter(Boolean);
  const allowedClasses = (isAdmin || user?.role === 'Admin')
    ? kelasList
    : (Array.from(new Set(rawAllowed)) as string[]);

  const tarikRekap = async () => {
    const targetKelas = !isAdmin && allowedClasses.length > 0 
      ? (allowedClasses.includes(kelas) ? kelas : allowedClasses[0]) 
      : kelas;

    if (!targetKelas) {
      Swal.fire({
        icon: 'warning',
        title: 'Peringatan',
        text: 'Pilih kelas terlebih dahulu.',
        confirmButtonColor: '#0d9488'
      });
      return;
    }

    if (!isAdmin && allowedClasses.length > 0 && !allowedClasses.includes(targetKelas)) {
      Swal.fire({
        icon: 'warning',
        title: 'Akses Ditolak',
        text: 'Anda hanya dapat melihat rekapitulasi kehadiran untuk kelas binaan Anda.',
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
        .eq('kelas', targetKelas)
        .order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) siswaQuery = siswaQuery.eq('sekolah_id', user.sekolah_id);
      const { data: siswa } = await siswaQuery;

      // Fetch jurnal for this class & mapel within date
      let query = supabase
        .from('jurnal_pembelajaran')
        .select('absensi_siswa, detail_absen, tanggal, kehadiran_murid')
        .eq('kelas', targetKelas)
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
        .eq('kelas', targetKelas);
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
          const match = detail.match(new RegExp(`(?:\\b|^)${escaped}(?:\\b|$)\\s*\\(([HSIAhsia])\\)`, 'i'));
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

  // Calculate summary metrics for Rekap KBM
  const totalSiswa = rekapData ? rekapData.length : 0;
  const totalHadir = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.hadir || 0), 0) : 0;
  const totalSakit = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.sakit || 0), 0) : 0;
  const totalIzin = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.izin || 0), 0) : 0;
  const totalAlpa = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.alpa || 0), 0) : 0;
  const totalAllSessions = totalHadir + totalSakit + totalIzin + totalAlpa;
  const avgKehadiran = totalAllSessions > 0 ? Math.round((totalHadir / totalAllSessions) * 100) : 0;

  // Calculate summary metrics for Gerbang Presensi
  const totalGerbangSiswa = gerbangStudents.length;
  const totalGerbangDatang = gerbangStudents.filter(s => s.hasDatang).length;
  const totalGerbangPulang = gerbangStudents.filter(s => s.hasPulang).length;
  const totalGerbangBelumPresensi = totalGerbangSiswa - totalGerbangDatang;
  // Backward compatibility alias for legacy tests and metrics (Belum Scan / Belum Presensi)
  const totalGerbangBelumScan = totalGerbangBelumPresensi;

  const filteredGerbangStudents = gerbangStudents.filter(s => {
    if (gerbangFilterStatus === 'datang' && !s.hasDatang) return false;
    if (gerbangFilterStatus === 'pulang' && !s.hasPulang) return false;
    if (gerbangFilterStatus === 'belum' && s.hasDatang) return false;

    if (!gerbangSearch) return true;
    const q = gerbangSearch.toLowerCase();
    return (s.nama_siswa && s.nama_siswa.toLowerCase().includes(q)) ||
           (s.nisn && s.nisn.toLowerCase().includes(q));
  });

  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dStr;
  };

  const isWaliKelasUser = isAdmin || user?.role === 'Admin' || Boolean(
    propAssignedKelas || 
    user?.wali_kelas || 
    user?.penugasan?.kelas_binaan || 
    waliKelasList.length > 0
  );

  if (masterLoaded && !isWaliKelasUser) {
    return (
      <section id="view-rekap-siswa" className="view-section page-enter w-full max-w-full">
        <div className="glass-card p-8 text-center max-w-lg mx-auto mt-6 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 shadow-sm">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            <i className="fa-solid fa-lock"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Akses Terblokir</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Halaman <strong>Presensi Siswa</strong> secara eksklusif hanya dapat diakses oleh Administrator dan Guru yang ditugaskan sebagai <strong>Wali Kelas</strong>. Anda tidak memiliki hak akses untuk membuka halaman ini.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="view-rekap-siswa" className="view-section fade-in">
        <div className="glass-card p-4">
            <PrintHeader />
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                {activeTab === 'gerbang' ? 'Laporan Presensi Gerbang Piket Siswa' : 'Rekapitulasi Presensi Kehadiran Siswa'}
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 print:text-black mt-1 flex flex-wrap justify-center gap-3 sm:gap-6 font-medium">
                {activeTab === 'gerbang' ? (
                  <>
                    <span>Kelas: <strong>{gerbangKelas || '-'}</strong></span>
                    <span>Tanggal: <strong>{formatDisplayDate(gerbangTanggal)}</strong></span>
                    <span>Wali Kelas: <strong>{user?.nama || '-'}</strong></span>
                  </>
                ) : (
                  <>
                    <span>Kelas: <strong>{kelas || '-'}</strong></span>
                    {mapel && <span>Mapel: <strong>{mapel}</strong></span>}
                    <span><strong>{formatPeriodHeader('', startDate, endDate)}</strong></span>
                    <span>Guru: <strong>{user?.nama || '-'}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* TAB NAVIGATION: Dedicated Panel / Tab for Presensi Gerbang Piket vs Rekap Absen Siswa */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 no-print">
              <button
                type="button"
                onClick={() => setActiveTab('gerbang')}
                className={`btn-click px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'gerbang'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-school-flag"></i>
                <span>Presensi Gerbang Piket</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rekap')}
                className={`btn-click px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'rekap'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <i className="fa-solid fa-users-viewfinder"></i>
                <span>Rekap Absen Siswa</span>
              </button>
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
                                  {waliGateLogs[siswa.nisn || siswa.id]?.datang ? (
                                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                                      <i className="fa-solid fa-circle-check text-[8px]"></i>
                                      Piket: Hadir ({waliGateLogs[siswa.nisn || siswa.id].datang.jam ? (waliGateLogs[siswa.nisn || siswa.id].datang.jam.slice(0, 5)) : 'Masuk'})
                                    </div>
                                  ) : (
                                    <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 flex items-center gap-1">
                                      <i className="fa-solid fa-clock text-[8px]"></i>
                                      Piket: Belum Presensi
                                    </div>
                                  )}
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

            {/* DEDICATED PANEL: PRESENSI GERBANG PIKET */}
            {activeTab === 'gerbang' && (
              <div id="panel-presensi-gerbang-piket" className="space-y-4 fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-school-flag text-emerald-600 dark:text-emerald-400 text-base"></i>
                    <span>Presensi Gerbang Piket</span>
                  </h2>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Data kedatangan harian siswa tercatat melalui pos gerbang/piket.
                  </div>
                </div>

                {/* Filter bar for Gate Attendance */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl space-y-3 no-print">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                    {/* Class Selection: automatic for Wali Kelas, dropdown for Admin */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        KELAS {user?.role !== 'Admin' && <span className="text-emerald-600 dark:text-emerald-400 font-normal">(Binaan)</span>}
                      </label>
                      {user?.role === 'Admin' ? (
                        <select
                          value={gerbangKelas}
                          onChange={e => setGerbangKelas(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 font-semibold"
                        >
                          <option value="" disabled>Pilih Kelas...</option>
                          {kelasList.map(k => (
                            <option key={k} value={k}>Kelas {k}</option>
                          ))}
                        </select>
                      ) : allowedClasses.length > 1 ? (
                        <select
                          value={gerbangKelas}
                          onChange={e => setGerbangKelas(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 font-semibold"
                        >
                          {allowedClasses.map(k => (
                            <option key={k} value={k}>Kelas {k} (Binaan)</option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                          <span>Kelas {gerbangKelas || allowedClasses[0] || user?.penugasan?.kelas_binaan || user?.wali_kelas || '-'}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal flex items-center gap-1">
                            <i className="fa-solid fa-user-shield text-[9px]"></i> Wali Kelas
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Date Picker */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        TANGGAL PRESENSI
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={gerbangTanggal}
                          onChange={e => setGerbangTanggal(e.target.value)}
                          className="w-full px-2.5 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                        />
                        <button
                          type="button"
                          onClick={() => setGerbangTanggal(new Date().toISOString().split('T')[0])}
                          className="btn-click px-3 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shrink-0"
                          title="Kembali ke Hari Ini"
                        >
                          Hari Ini
                        </button>
                      </div>
                    </div>

                    {/* Search Student */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        CARI SISWA
                      </label>
                      <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                          type="text"
                          placeholder="Cari nama atau NISN..."
                          value={gerbangSearch}
                          onChange={e => setGerbangSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Metric Cards: Total Siswa, Hadir Datang, Pulang, Belum Presensi */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center justify-center gap-1.5 mb-1">
                      <i className="fa-solid fa-users text-blue-500"></i>
                      <span>Total Siswa</span>
                    </div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{totalGerbangSiswa}</div>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 mb-1">
                      <i className="fa-solid fa-door-open text-emerald-500"></i>
                      <span>Hadir Datang</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalGerbangDatang}</div>
                  </div>

                  <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs font-bold text-sky-800 dark:text-sky-300 flex items-center justify-center gap-1.5 mb-1">
                      <i className="fa-solid fa-person-walking-arrow-right text-sky-500"></i>
                      <span>Pulang</span>
                    </div>
                    <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{totalGerbangPulang}</div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5 mb-1" title="Belum Presensi / Belum Scan">
                      <i className="fa-solid fa-clock-rotate-left text-amber-500"></i>
                      <span>Belum Presensi</span>
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{totalGerbangBelumPresensi}</div>
                  </div>
                </div>

                {/* Quick filter pills & Orientation Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 no-print">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mr-1">Filter:</span>
                    <button
                      type="button"
                      onClick={() => setGerbangFilterStatus('semua')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        gerbangFilterStatus === 'semua'
                          ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      Semua ({totalGerbangSiswa})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGerbangFilterStatus('datang')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        gerbangFilterStatus === 'datang'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      Hadir ({totalGerbangDatang})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGerbangFilterStatus('pulang')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        gerbangFilterStatus === 'pulang'
                          ? 'bg-sky-600 text-white'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300'
                      }`}
                    >
                      Pulang ({totalGerbangPulang})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGerbangFilterStatus('belum')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        gerbangFilterStatus === 'belum'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}
                    >
                      Belum Presensi ({totalGerbangBelumPresensi})
                    </button>
                  </div>

                  <PrintOrientationToggle orientation={orientation} setOrientation={setOrientation} />
                </div>

                {/* Table of students */}
                {gerbangLoading ? (
                  <div className="text-center py-12 text-xs text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Memuat data presensi gerbang kelas {gerbangKelas}...
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full border border-gray-300 dark:border-gray-700 print:border-black rounded-xl print:overflow-visible shadow-sm">
                    <table className="w-full text-xs text-left border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">
                      <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                        <tr>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-10">No</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black w-28">NISN</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black">Nama Siswa</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-32">Jam Datang</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-32">Jam Pulang</th>
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-36">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGerbangStudents.map((siswa, idx) => (
                          <tr key={siswa.id || idx} className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-900 dark:text-white">
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">{idx + 1}</td>
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-mono text-[11px] print:text-[8pt]">{siswa.nisn || '-'}</td>
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-semibold">{siswa.nama_siswa}</td>
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">
                              {siswa.jamDatang ? (
                                <span className="font-mono text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                  {siswa.jamDatang} WITA
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">
                              {siswa.jamPulang ? (
                                <span className="font-mono text-sky-700 dark:text-sky-300 font-bold text-xs">
                                  {siswa.jamPulang} WITA
                                </span>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic text-[11px]">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">
                              {siswa.hasPulang ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                  <i className="fa-solid fa-person-walking-arrow-right text-[9px]"></i> Sudah Pulang
                                </span>
                              ) : siswa.hasDatang ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <i className="fa-solid fa-check text-[9px]"></i> Hadir Datang
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Belum Presensi / Belum Scan">
                                  <i className="fa-solid fa-clock text-[9px]"></i> Belum Presensi
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredGerbangStudents.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 italic text-gray-500 dark:text-gray-400 text-xs">
                              {gerbangSearch ? 'Tidak ada siswa yang cocok dengan pencarian.' : 'Tidak ada data siswa untuk kelas ini.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <PrintSignature
                  leftTitle="Mengetahui,"
                  leftSubtitle={user?.role === 'guru' ? 'Wali Kelas' : 'Kepala Sekolah / Admin'}
                  leftName={user?.nama}
                  leftNip={user?.nip}
                />

                {/* Export buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 no-print">
                  <button
                    type="button"
                    onClick={exportGerbangCsv}
                    disabled={gerbangStudents.length === 0}
                    className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    <i className="fa-solid fa-file-excel text-sm"></i> Unduh Excel / CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPrintWithGps()}
                    className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <i className="fa-solid fa-print text-sm"></i> Cetak Dokumen
                  </button>
                </div>
              </div>
            )}

            {/* PANEL: REKAP ABSEN SISWA */}
            {activeTab === 'rekap' && (
              <div id="panel-rekap-absen-siswa" className="space-y-4 fade-in">
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
                      <label className="block text-[10px] font-bold text-gray-700 dark:text-white mb-1">
                        KELAS <span className="text-red-500 dark:text-red-400">*</span>
                        {user?.role !== 'Admin' && <span className="text-emerald-600 dark:text-emerald-400 font-normal ml-1">(Binaan)</span>}
                      </label>
                      {user?.role === 'Admin' ? (
                        <select value={kelas} onChange={e => setKelas(e.target.value)} className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 font-semibold">
                          <option value="" disabled className="text-gray-900 dark:text-white dark:bg-gray-800">Pilih...</option>
                          {kelasList.map((k, i) => <option key={i} value={k} className="text-gray-900 dark:text-white dark:bg-gray-800">{k}</option>)}
                        </select>
                      ) : (
                        <select 
                          value={kelas} 
                          onChange={e => setKelas(e.target.value)} 
                          disabled={allowedClasses.length <= 1}
                          className="w-full px-2 py-2 text-xs rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 disabled:opacity-80 font-semibold"
                        >
                          {allowedClasses.length === 0 ? (
                            <option value="" disabled>Tidak ada kelas binaan</option>
                          ) : allowedClasses.length === 1 ? (
                            <option value={allowedClasses[0]}>Kelas {allowedClasses[0]} (Binaan Anda)</option>
                          ) : (
                            allowedClasses.map((k, i) => (
                              <option key={i} value={k}>Kelas {k} (Binaan)</option>
                            ))
                          )}
                        </select>
                      )}
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
                      <button type="button" onClick={() => triggerPrintWithGps()} className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition">
                        <i className="fa-solid fa-print text-sm"></i> Cetak Dokumen
                      </button>
                  </div>
              </div>
            ) : (
              <div id="rekap-siswa-kosong" className="text-center py-10 text-gray-500 dark:text-gray-400 text-[11px] italic no-print">Silakan atur filter dan klik tampilkan.</div>
            )}
            </div>
            )}
        </div>
    </section>
  );
}

