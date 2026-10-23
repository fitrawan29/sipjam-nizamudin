'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { PrintHeader, PrintSignature, formatPeriodHeader } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import { isIntervensiAllowed, fetchBatasIntervensiSiswa, isWaliKelasIntervensiAllowed, fetchJadwalIntervensiWali, JadwalIntervensiWali, findLastKbmJournal, resolveDailyStudentAttendance } from '@/lib/presensiIntervensi';
import { getWitaDateStr } from '@/lib/wita';
import { triggerParentWhatsApp } from '@/utils/whatsappUtils';

export default function RekapSiswaView({ 
  user, 
  assignedKelas: propAssignedKelas,
  isReadOnly: propReadOnly
}: { 
  user: any; 
  assignedKelas?: string | null; 
  isReadOnly?: boolean;
}) {
  const isSuperadmin = (user?.role || '').toLowerCase().replace(/\s+/g, '') === 'superadmin';
  const isAdmin = isSuperadmin || (user?.role || '').toLowerCase() === 'admin' || user?.role === 'Admin';
  const isKepalaSekolah = Boolean(
    (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'kepalasekolah' ||
    (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '') === 'kepsek' ||
    user?.is_kepala_sekolah === true ||
    user?.isKepalaSekolah === true
  );
  const isGlobalReadOnly = propReadOnly !== undefined ? propReadOnly : (!isAdmin && !isSuperadmin && isKepalaSekolah);

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
  const [gerbangFilterStatus, setGerbangFilterStatus] = useState<'semua' | 'datang' | 'pulang' | 'belum' | 'bolos'>('semua');
  const [waliGateLogs, setWaliGateLogs] = useState<Record<string, { datang?: any; pulang?: any }>>({});

  // Wali Kelas feature states
  const [waliKelasList, setWaliKelasList] = useState<any[]>([]);
  const [activeWaliKelas, setActiveWaliKelas] = useState<any | null>(null);
  const userAssignedKelas = propAssignedKelas || user?.penugasan?.kelas_binaan || (typeof user?.wali_kelas === 'string' ? user.wali_kelas : user?.wali_kelas?.kelas);
  const isOwnHomeroomClass = Boolean(userAssignedKelas && activeWaliKelas?.kelas && activeWaliKelas.kelas === userAssignedKelas);
  const isReadOnly = isGlobalReadOnly && !isOwnHomeroomClass;
  const [showWaliInput, setShowWaliInput] = useState(false);
  const [waliTanggal, setWaliTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [waliStudents, setWaliStudents] = useState<any[]>([]);
  const [waliAttendance, setWaliAttendance] = useState<Record<string, { status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Bolos' | ''; keterangan: string; logs: string[] }>>({});
  const [waliLoading, setWaliLoading] = useState(false);
  const [waliSaving, setWaliSaving] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [jadwalWali, setJadwalWali] = useState<JadwalIntervensiWali>({
    batasPagi: '12:00',
    jamPulangMulai: '11:00',
    jamPulangPiketAkhir: '12:00',
    jamBatasMalam: '12:00'
  });

  const todayWita = getWitaDateStr();
  const waliIntervensiStatus = isWaliKelasIntervensiAllowed(
    jadwalWali.batasPagi,
    jadwalWali.jamPulangMulai,
    jadwalWali.jamBatasMalam
  );
  const isIntervensiExpired = !isAdmin && (
    waliTanggal < todayWita ||
    (waliTanggal === todayWita && !waliIntervensiStatus.allowed)
  );

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

        // Fetch jadwal intervensi presensi siswa bagi Wali Kelas (Pagi s.d. 12:00 WITA & alokasi pulang 1 jam setelah jam pulang mulai)
        const jadwal = await fetchJadwalIntervensiWali(supabase, user?.sekolah_id);
        setJadwalWali(jadwal);

        // Fetch Wali Kelas assignments
        let wQuery = supabase.from('wali_kelas').select('*');
        if (user?.sekolah_id) wQuery = wQuery.eq('sekolah_id', user.sekolah_id);
        const { data: wData } = await wQuery;
        let resolvedWaliKelas = '';
        let userWalis: any[] = [];
        if (wData && wData.length > 0) {
          userWalis = (isAdmin || isKepalaSekolah || isReadOnly)
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

        // Fallback assignment: ensure Wali Kelas with assigned prop or profile gets access
        const fallbackKelas = typeof propAssignedKelas === 'string' ? propAssignedKelas :
          (typeof user?.penugasan?.kelas_binaan === 'string' ? user?.penugasan?.kelas_binaan :
          (typeof user?.wali_kelas === 'string' ? user?.wali_kelas : (user?.wali_kelas?.kelas || '')));

        if ((!userWalis || userWalis.length === 0) && fallbackKelas) {
          const synthesized = [{ id: 'fallback-' + fallbackKelas, kelas: fallbackKelas, nama_guru: user?.nama || 'Wali Kelas' }];
          setWaliKelasList(synthesized);
          setActiveWaliKelas(synthesized[0]);
          resolvedWaliKelas = fallbackKelas;
        }

        // Automatic filter for Wali Kelas: prioritize assigned class from propAssignedKelas, penugasan.kelas_binaan, or wali_kelas
        const assignedWali = propAssignedKelas || user?.penugasan?.kelas_binaan || user?.wali_kelas || resolvedWaliKelas;
        if (!isAdmin && !isKepalaSekolah && !isReadOnly && assignedWali) {
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

          let jQ = supabase
            .from('jurnal_pembelajaran')
            .select('jam_ke, mapel, absensi_siswa, detail_absen, kehadiran_murid, tanggal')
            .eq('kelas', activeWaliKelas.kelas)
            .eq('tanggal', waliTanggal);
          if (user?.sekolah_id) jQ = jQ.eq('sekolah_id', user.sekolah_id);
          const { data: dayJournals } = await jQ;
          const lastJurnal = findLastKbmJournal(dayJournals || []);

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

          const map: Record<string, { status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Bolos' | ''; keterangan: string; logs: string[] }> = {};
          studentsData.forEach(s => {
            const found = absensiData?.find(a => (a.siswa_id && s.id && a.siswa_id === s.id) || (a.nisn && a.nisn === s.nisn) || (a.nama_siswa && s.nama_siswa && a.nama_siswa.trim().toLowerCase() === s.nama_siswa.trim().toLowerCase()));
            const hasGate = Boolean(gateMap[s.nisn]?.datang || (s.id && gateMap[s.id]?.datang));
            const resolved = resolveDailyStudentAttendance(s, found, hasGate, lastJurnal);

            map[s.nisn] = {
              status: resolved.status,
              keterangan: found?.keterangan || resolved.keterangan || '',
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

        let aQ = supabase
          .from('absensi')
          .select('*')
          .eq('kelas', gerbangKelas)
          .eq('tanggal', gerbangTanggal);
        if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
        const { data: absensiLogs } = await aQ;

        let jQ = supabase
          .from('jurnal_pembelajaran')
          .select('jam_ke, mapel, absensi_siswa, tanggal')
          .eq('kelas', gerbangKelas)
          .eq('tanggal', gerbangTanggal)
          .order('jam_ke', { ascending: false });
        if (user?.sekolah_id) jQ = jQ.eq('sekolah_id', user.sekolah_id);
        const { data: dayJournals } = await jQ;

        if (studentsData) {
          const lastJurnal = findLastKbmJournal(dayJournals || []);

          const combined = studentsData.map(siswa => {
            const datang = (gateLogs || []).find(p => 
              (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'datang'
            );
            let pulang = (gateLogs || []).find(p => 
              (p.siswa_id === siswa.id || (siswa.nisn && p.nisn === siswa.nisn)) && p.status === 'pulang'
            );

            const classLog = absensiLogs?.find(a => (a.siswa_id && siswa.id && a.siswa_id === siswa.id) || (a.nisn && a.nisn === siswa.nisn) || (a.nama_siswa && siswa.nama_siswa && a.nama_siswa.trim().toLowerCase() === siswa.nama_siswa.trim().toLowerCase()));
            const isDailyBolos = classLog?.status === 'Bolos' || classLog?.status === 'B';
            const resolvedDaily = resolveDailyStudentAttendance(siswa, classLog, Boolean(datang), lastJurnal);
            const isResolvedBolos = resolvedDaily.status === 'Bolos';

            let lastMapelStatus: string | null = null;
            if (lastJurnal?.absensi_siswa) {
              try {
                const parsed = typeof lastJurnal.absensi_siswa === 'string'
                  ? JSON.parse(lastJurnal.absensi_siswa)
                  : lastJurnal.absensi_siswa;
                lastMapelStatus = parsed[siswa.nisn] || (siswa.nama_siswa && parsed[siswa.nama_siswa]) || (siswa.id && parsed[siswa.id]) || null;
                if (!lastMapelStatus && siswa.nama_siswa) {
                  const lower = siswa.nama_siswa.trim().toLowerCase();
                  const foundKey = Object.keys(parsed).find(k => k.trim().toLowerCase() === lower);
                  if (foundKey) lastMapelStatus = parsed[foundKey];
                }
              } catch {}
            }

            const isExcused = classLog?.status === 'Sakit' || classLog?.status === 'Izin' || classLog?.status === 'S' || classLog?.status === 'I';
            const isMorningHadir = !isExcused && (Boolean(datang) || classLog?.status === 'Hadir' || classLog?.status === 'H');

            const normMapel = lastMapelStatus ? String(lastMapelStatus).trim().toUpperCase() : null;
            const isMapelAlfa = normMapel === 'A' || normMapel === 'ALFA' || normMapel === 'ALPA' || normMapel === 'BOLOS' || normMapel === 'B';
            const isMapelHadir = normMapel === 'H' || normMapel === 'HADIR';

            // Auto-fallback to mapel presensi & validasi bolos (Rule 3)
            let isBolosPulang = isDailyBolos || isResolvedBolos;
            if (!pulang) {
              if (isBolosPulang || (isMapelAlfa && isMorningHadir)) {
                isBolosPulang = true;
                pulang = { jam: '-', status: 'bolos', device_id: 'Auto Fallback: Bolos' };
              } else if (isMapelHadir || isMorningHadir) {
                pulang = { jam: 'Sistem Mapel Auto', status: 'pulang', device_id: 'Auto Fallback: Mapel' };
              } else if (classLog && classLog.logs && classLog.logs.length > 0) {
                const latestLog = classLog.logs[classLog.logs.length - 1];
                const timeMatch = latestLog.match(/\[(\d{2}:\d{2})/);
                if (timeMatch && timeMatch[1]) {
                  pulang = { jam: timeMatch[1] + ':00', device_id: 'Sistem Mapel Auto' };
                }
              }
            } else if (isDailyBolos || isResolvedBolos) {
              isBolosPulang = true;
            }

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
              hasPulang: Boolean(pulang && pulang.status !== 'bolos'),
              isBolos: isBolosPulang,
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
      const statusStr = s.isBolos ? 'Pulang: Bolos' : s.hasPulang ? 'Sudah Pulang' : s.hasDatang ? 'Hadir Datang' : 'Belum Presensi';
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

  const handleSetWaliStatus = (nisn: string, status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Bolos') => {
    if (isReadOnly) return;
    setWaliAttendance(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || { keterangan: '', logs: [] }),
        status
      }
    }));
  };

  const handleSetWaliKeterangan = (nisn: string, keterangan: string) => {
    if (isReadOnly) return;
    setWaliAttendance(prev => ({
      ...prev,
      [nisn]: {
        ...(prev[nisn] || { status: '', logs: [] }),
        keterangan
      }
    }));
  };

  const handleSetAllWaliStatus = (status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Bolos') => {
    if (isReadOnly) return;
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
    if (isReadOnly) {
      return Swal.fire({
        icon: 'info',
        title: 'Mode Monitoring',
        text: 'Aksi simpan presensi dinonaktifkan dalam mode pemantauan Kepala Sekolah.',
        confirmButtonColor: '#0d9488'
      });
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return Swal.fire({
        icon: 'warning',
        title: 'Koneksi Internet Diperlukan',
        text: 'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk menyimpan presensi siswa.',
        confirmButtonColor: '#0d9488'
      });
    }
    if (!activeWaliKelas || waliStudents.length === 0) return;

    // Guard: Batas intervensi presensi siswa bagi Wali Kelas (Pagi s.d. 12:00 & Pulang 1 jam pasca jam pulang WITA)
    if (isIntervensiExpired && !isAdmin) {
      const alertTitle = waliIntervensiStatus.phase === 'kbm'
        ? 'Presensi Dikelola Guru Mapel (KBM)'
        : 'Intervensi Presensi Terkunci';
      return Swal.fire({
        icon: 'warning',
        title: alertTitle,
        text: waliIntervensiStatus.pesan,
        confirmButtonColor: '#0d9488'
      });
    }

    setWaliSaving(true);
    try {
      const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
      const rowsToUpsert = waliStudents
        .map(s => {
          const record = waliAttendance[s.nisn];
          if (!record || !record.status) return null;
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
        })
        .filter(Boolean);

      if (rowsToUpsert.length === 0) {
        setWaliSaving(false);
        return Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Data',
          text: 'Pilih status presensi siswa terlebih dahulu sebelum menyimpan.',
          confirmButtonColor: '#0d9488'
        });
      }

      const { error } = await supabase.from('absensi').upsert(rowsToUpsert as any[], {
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
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Presensi',
        text: 'Koneksi internet aktif diwajibkan untuk menyimpan presensi siswa. ' + (err?.message || 'Silakan periksa koneksi Anda dan coba lagi.'),
        confirmButtonColor: '#dc2626'
      });
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
  const allowedClasses = (isAdmin || user?.role === 'Admin' || isKepalaSekolah || isReadOnly)
    ? (kelasList.length > 0 ? kelasList : (Array.from(new Set(rawAllowed)) as string[]))
    : (Array.from(new Set(rawAllowed)) as string[]);

  const tarikRekap = async () => {
    const targetKelas = (!isAdmin && !isKepalaSekolah && !isReadOnly) && allowedClasses.length > 0 
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

    if (!isAdmin && !isKepalaSekolah && !isReadOnly && allowedClasses.length > 0 && !allowedClasses.includes(targetKelas)) {
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

      // Process rekap: initialize with hadir: 0
      const rekapMap: Record<string, any> = {};
      siswa?.forEach(s => {
        rekapMap[s.nama_siswa] = {
          ...s,
          hadir: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          bolos: 0,
          total: 0,
          persentase: 0
        };
      });

      if (!mapel) {
        // =========================================================================
        // DOMAIN 1: PRESENSI SISWA (ABSENSI KELAS HARIAN MEREKA)
        // Sumber data: tabel public.absensi (dicatat oleh Wali Kelas & Piket)
        // Fallback dinamis: jurnal KBM jam pelajaran terakhir jika wali kelas belum mengisi
        // Preservasi Aturan Bolos: hadir pagi + alfa jam KBM terakhir -> Bolos (B)
        // Opsi Status Resmi: Hadir (H), Sakit (S), Izin (I), Alfa (A), Bolos (B)
        // =========================================================================
        let absensiQuery = supabase
          .from('absensi')
          .select('tanggal, siswa_id, nisn, nama_siswa, status, keterangan')
          .eq('kelas', targetKelas);
        if (user?.sekolah_id) absensiQuery = absensiQuery.eq('sekolah_id', user.sekolah_id);
        if (startDate) absensiQuery = absensiQuery.gte('tanggal', startDate);
        if (endDate) absensiQuery = absensiQuery.lte('tanggal', endDate);
        const { data: directAbsensi, error: absErr } = await absensiQuery;

        if (absErr) {
          console.error('Error fetching class absensi:', absErr);
        }

        // Fetch journals for this class & date range to support dynamic fallback from last KBM
        let journalQuery = supabase
          .from('jurnal_pembelajaran')
          .select('tanggal, jam_ke, mapel, absensi_siswa, detail_absen, kehadiran_murid')
          .eq('kelas', targetKelas);
        if (user?.sekolah_id) journalQuery = journalQuery.eq('sekolah_id', user.sekolah_id);
        if (startDate) journalQuery = journalQuery.gte('tanggal', startDate);
        if (endDate) journalQuery = journalQuery.lte('tanggal', endDate);
        const { data: allJournals } = await journalQuery;

        // Fetch morning gate attendance to support morning hadir check
        let gateQuery = supabase
          .from('presensi_siswa')
          .select('tanggal, siswa_id, nisn, status')
          .eq('kelas', targetKelas)
          .eq('status', 'datang');
        if (user?.sekolah_id) gateQuery = gateQuery.eq('sekolah_id', user.sekolah_id);
        if (startDate) gateQuery = gateQuery.gte('tanggal', startDate);
        if (endDate) gateQuery = gateQuery.lte('tanggal', endDate);
        const { data: gateLogs } = await gateQuery;

        // Collect all dates from all available sources
        const dateSet = new Set<string>();
        directAbsensi?.forEach(a => { if (a.tanggal) dateSet.add(a.tanggal); });
        allJournals?.forEach(j => { if (j.tanggal) dateSet.add(j.tanggal); });
        gateLogs?.forEach(g => { if (g.tanggal) dateSet.add(g.tanggal); });
        const allDates = Array.from(dateSet).sort();

        allDates.forEach(d => {
          const dateJournals = (allJournals || []).filter(j => j.tanggal === d);
          const lastJurnal = findLastKbmJournal(dateJournals);

          const dateGateDatang = new Set<string>();
          (gateLogs || []).filter(g => g.tanggal === d).forEach(g => {
            if (g.nisn) dateGateDatang.add(g.nisn);
            if (g.siswa_id) dateGateDatang.add(g.siswa_id);
          });

          siswa?.forEach(s => {
            const target = rekapMap[s.nama_siswa];
            if (!target) return;

            const absRecord = directAbsensi?.find(a => a.tanggal === d && ((a.siswa_id && s.id && a.siswa_id === s.id) || (a.nisn && a.nisn === s.nisn) || (a.nama_siswa && s.nama_siswa && a.nama_siswa.trim().toLowerCase() === s.nama_siswa.trim().toLowerCase())));
            const hasGate = Boolean((s.nisn && dateGateDatang.has(s.nisn)) || (s.id && dateGateDatang.has(s.id)));

            const resolved = resolveDailyStudentAttendance(s, absRecord, hasGate, lastJurnal);
            const st = String(resolved.status || '').trim().toLowerCase();
            if (st === 'hadir' || st === 'h') target.hadir++;
            else if (st === 'sakit' || st === 's') target.sakit++;
            else if (st === 'izin' || st === 'i') target.izin++;
            else if (st === 'alpa' || st === 'a' || st === 'alfa') target.alpa++;
            else if (st === 'bolos' || st === 'b') target.bolos++;
          });
        });
      } else {
        // =========================================================================
        // DOMAIN 2: PRESENSI MAPEL (ABSENSI SESI MATA PELAJARAN TERSEBUT)
        // Sumber data: tabel public.jurnal_pembelajaran (dicatat oleh Guru Mapel)
        // =========================================================================
        let query = supabase
          .from('jurnal_pembelajaran')
          .select('absensi_siswa, detail_absen, tanggal, kehadiran_murid')
          .eq('kelas', targetKelas)
          .eq('mapel', mapel)
          .order('tanggal', { ascending: true });

        if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
        if (startDate) query = query.gte('tanggal', startDate);
        if (endDate) query = query.lte('tanggal', endDate);

        const { data: jurnal, error: jurErr } = await query;
        if (jurErr) {
          console.error('Error fetching jurnal mapel:', jurErr);
        }

        // Parse multi-format student attendance from journals
        jurnal?.forEach(j => {
          let absensiJson: Record<string, string> | null = null;
          if (j.absensi_siswa) {
            if (typeof j.absensi_siswa === 'object' && j.absensi_siswa !== null) {
              absensiJson = j.absensi_siswa;
            } else if (typeof j.absensi_siswa === 'string' && j.absensi_siswa.trim().startsWith('{')) {
              try {
                absensiJson = JSON.parse(j.absensi_siswa);
              } catch (_) {
                absensiJson = null;
              }
            }
          }

          const combinedText = `${j.kehadiran_murid || ''} ${typeof j.absensi_siswa === 'string' ? j.absensi_siswa : ''} ${j.detail_absen || ''}`.toLowerCase();
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
      }

      // Compute total sessions and attendance percentage per student: (total_present / total_students) * 100
      const result = Object.values(rekapMap).map(s => {
        const total = !mapel
          ? s.hadir + s.sakit + s.izin + s.alpa + (s.bolos || 0)
          : s.hadir + s.alpa;
        // Formula: (total_present / total_sessions) * 100 with zero division guard
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

  // Calculate summary metrics for Rekap KBM & Absensi Kelas Harian
  const totalSiswa = rekapData ? rekapData.length : 0;
  const totalHadir = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.hadir || 0), 0) : 0;
  const totalSakit = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.sakit || 0), 0) : 0;
  const totalIzin = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.izin || 0), 0) : 0;
  const totalAlpa = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.alpa || 0), 0) : 0;
  const totalBolos = rekapData ? rekapData.reduce((acc, curr) => acc + (curr.bolos || 0), 0) : 0;
  const totalAllSessions = !mapel
    ? totalHadir + totalSakit + totalIzin + totalAlpa + totalBolos
    : totalHadir + totalAlpa;
  const avgKehadiran = totalAllSessions > 0 ? Math.round((totalHadir / totalAllSessions) * 100) : 0;

  // Calculate summary metrics for Gerbang Presensi
  const totalGerbangSiswa = gerbangStudents.length;
  const totalGerbangDatang = gerbangStudents.filter(s => s.hasDatang).length;
  const totalGerbangPulang = gerbangStudents.filter(s => s.hasPulang && !s.isBolos).length;
  const totalGerbangBolos = gerbangStudents.filter(s => s.isBolos).length;
  const totalGerbangBelumPresensi = totalGerbangSiswa - totalGerbangDatang;
  // Backward compatibility alias for legacy tests and metrics (Belum Scan / Belum Presensi)
  const totalGerbangBelumScan = totalGerbangBelumPresensi;

  const filteredGerbangStudents = gerbangStudents.filter(s => {
    if (gerbangFilterStatus === 'datang' && !s.hasDatang) return false;
    if (gerbangFilterStatus === 'pulang' && (!s.hasPulang || s.isBolos)) return false;
    if (gerbangFilterStatus === 'bolos' && !s.isBolos) return false;
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

  const isWaliKelasUser = isAdmin || user?.role === 'Admin' || isKepalaSekolah || isReadOnly || Boolean(
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
        <div className="clay-card p-4 sm:p-5 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
            {isGlobalReadOnly && (
              <div data-testid="readonly-notice" className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200 no-print">
                <i className="fa-solid fa-eye text-amber-600 text-sm"></i>
                <span>
                  {isOwnHomeroomClass ? (
                    <><strong>Mode Penugasan Wali Kelas ({activeWaliKelas?.kelas}):</strong> Anda dapat mengelola presensi siswa kelas binaan Anda. Untuk kelas lainnya, akses Anda adalah peninjauan (read-only).</>
                  ) : (
                    <><strong>Mode Monitoring:</strong> Anda masuk sebagai pemantau (Kepala Sekolah). Data presensi siswa bersifat hanya-baca (read-only).</>
                  )}
                </span>
              </div>
            )}
            <PrintHeader user={user} sekolahId={user?.sekolah_id} />
            {/* Document Print Subheader */}
            <div className="text-center my-3 print:my-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white print:text-black uppercase tracking-wider">
                {activeTab === 'gerbang' 
                  ? 'Laporan Presensi Gerbang Piket Siswa' 
                  : mapel 
                    ? `Rekapitulasi Presensi Mata Pelajaran: ${mapel}` 
                    : 'Rekapitulasi Absensi Kelas (Harian)'}
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
                    <span>{mapel ? 'Guru Mapel' : 'Wali Kelas'}: <strong>{user?.nama || '-'}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* TAB NAVIGATION: Dedicated Panel / Tab for Presensi Gerbang Piket vs Rekap Absen Siswa */}
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 no-print">
              <button
                type="button"
                onClick={() => setActiveTab('gerbang')}
                className={`clay-btn btn-click px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'gerbang'
                    ? 'clay-btn-mint bg-emerald-600 text-white shadow-md'
                    : 'clay-btn-secondary text-gray-700 hover:bg-gray-200 dark:text-gray-300'
                }`}
              >
                <i className="fa-solid fa-school-flag"></i>
                <span>Presensi Gerbang Piket</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rekap')}
                className={`clay-btn btn-click px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'rekap'
                    ? 'clay-btn-mint bg-teal-600 text-white shadow-md'
                    : 'clay-btn-secondary text-gray-700 hover:bg-gray-200 dark:text-gray-300'
                }`}
              >
                <i className="fa-solid fa-users-viewfinder"></i>
                <span>Rekap Absen Siswa</span>
              </button>
            </div>

            {/* WALI KELAS BANNER & TOGGLE */}
            {waliKelasList.length > 0 && (
              <div className="clay-card clay-card-mint border-2 border-white/90 dark:border-emerald-800/60 p-4 rounded-3xl mb-5 no-print shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shadow-sm shrink-0">
                      <i className="fa-solid fa-user-shield"></i>
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 flex-wrap">
                        <span>Penugasan Wali Kelas</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 text-[10px]">
                          {activeWaliKelas?.kelas || 'Kelas'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIntervensiExpired 
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        }`}>
                          <i className={`fa-solid ${isIntervensiExpired ? 'fa-lock' : 'fa-clock'} mr-1`}></i>
                          {waliIntervensiStatus.label}
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
                    {isIntervensiExpired ? (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                        <i className="fa-solid fa-triangle-exclamation text-amber-600 text-base shrink-0"></i>
                        <div>
                          <div className="font-bold">{waliIntervensiStatus.label}</div>
                          <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                            {waliIntervensiStatus.pesan}
                          </div>
                        </div>
                      </div>
                    ) : waliIntervensiStatus.phase === 'pulang' ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-3 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                        <i className="fa-solid fa-clock-rotate-left text-emerald-600 text-base shrink-0"></i>
                        <div>
                          <div className="font-bold">Presensi Pulang Siswa (Alokasi 1 Jam)</div>
                          <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                            {waliIntervensiStatus.pesan}
                          </div>
                        </div>
                      </div>
                    ) : null}
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
                          disabled={isIntervensiExpired || isReadOnly}
                          onClick={() => handleSetAllWaliStatus('Hadir')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Semua Hadir
                        </button>
                        <button
                          type="button"
                          disabled={isIntervensiExpired || isReadOnly}
                          onClick={() => handleSetAllWaliStatus('Sakit')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Semua Sakit
                        </button>
                        <button
                          type="button"
                          disabled={isIntervensiExpired || isReadOnly}
                          onClick={() => handleSetAllWaliStatus('Izin')}
                          className="btn-click px-2 py-1 rounded-md text-[10px] font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                          const currentRec = waliAttendance[siswa.nisn] || { status: '', keterangan: '', logs: [] };
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
                                  {(['Hadir', 'Izin', 'Sakit', 'Alpa', 'Bolos'] as const).map(st => {
                                    const isSelected = currentRec.status === st;
                                    const colorClasses = 
                                      st === 'Hadir' ? (isSelected ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      st === 'Izin' ? (isSelected ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      st === 'Sakit' ? (isSelected ? 'bg-yellow-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      st === 'Alpa' ? (isSelected ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300') :
                                      (isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300');

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        disabled={isIntervensiExpired || isReadOnly}
                                        onClick={() => handleSetWaliStatus(siswa.nisn, st)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${colorClasses} ${(isIntervensiExpired || isReadOnly) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                      >
                                        {st}
                                      </button>
                                    );
                                  })}
                                </div>

                                <input
                                  type="text"
                                  disabled={isIntervensiExpired || isReadOnly}
                                  placeholder={isReadOnly ? "Mode monitoring (hanya lihat)..." : isIntervensiExpired ? "Intervensi terkunci..." : "Keterangan / alasan (opsional)..."}
                                  value={currentRec.keterangan || ''}
                                  onChange={e => handleSetWaliKeterangan(siswa.nisn, e.target.value)}
                                  className={`w-full md:w-56 px-2.5 py-1 text-[11px] rounded-lg input-premium text-gray-900 dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${(isIntervensiExpired || isReadOnly) ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''}`}
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
                        disabled={waliSaving || waliLoading || waliStudents.length === 0 || isIntervensiExpired || isReadOnly}
                        onClick={handleSaveWaliAttendance}
                        className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                        KELAS {!isAdmin && !isKepalaSekolah && !isReadOnly && user?.role !== 'Admin' && <span className="text-emerald-600 dark:text-emerald-400 font-normal">(Binaan)</span>}
                      </label>
                      {(user?.role === 'Admin' || isAdmin || isKepalaSekolah || isReadOnly) ? (
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

                {/* Summary Metric Cards: Total Siswa, Hadir Datang, Pulang, Bolos, Belum Presensi */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 no-print">
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

                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-3 rounded-xl text-center shadow-sm">
                    <div className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center justify-center gap-1.5 mb-1">
                      <i className="fa-solid fa-triangle-exclamation text-purple-500"></i>
                      <span>Bolos</span>
                    </div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalGerbangBolos}</div>
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
                      onClick={() => setGerbangFilterStatus('bolos')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        gerbangFilterStatus === 'bolos'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300'
                      }`}
                    >
                      Bolos ({totalGerbangBolos})
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
                          <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:hidden text-center w-20">WA Ortu</th>
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
                              {siswa.isBolos ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  <i className="fa-solid fa-triangle-exclamation text-[9px]"></i> Pulang: Bolos
                                </span>
                              ) : siswa.hasPulang ? (
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
                            <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:hidden text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const statusStr = siswa.isBolos
                                    ? 'Bolos (Tidak Presensi Pulang)'
                                    : siswa.hasPulang
                                    ? 'Sudah Pulang'
                                    : siswa.hasDatang
                                    ? 'Hadir Datang'
                                    : 'Belum Presensi';
                                  const timeStr = siswa.jamPulang || siswa.jamDatang || undefined;
                                  triggerParentWhatsApp(
                                    {
                                      nama_siswa: siswa.nama_siswa,
                                      kelas: siswa.kelas || gerbangKelas,
                                      no_hp_ortu: siswa.no_hp_ortu
                                    },
                                    {
                                      status: statusStr,
                                      tanggal: gerbangTanggal || getWitaDateStr(),
                                      timeStr,
                                      note: siswa.isBolos ? 'Catatan: Terindikasi meninggalkan sekolah tanpa izin' : undefined
                                    },
                                    user?.sekolah_nama || user?.nama_sekolah || (typeof user?.sekolah === 'string' ? user.sekolah : user?.sekolah?.nama) || 'Sekolah'
                                  );
                                }}
                                title="Kirim WhatsApp ke Orang Tua"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 transition inline-flex items-center justify-center cursor-pointer"
                              >
                                <i className="fa-brands fa-whatsapp text-sm text-emerald-600"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredGerbangStudents.length === 0 && (
                          <tr>
                            <td colSpan={7} className="text-center py-8 italic text-gray-500 dark:text-gray-400 text-xs">
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
                  leftName={isOwnHomeroomClass ? user?.nama : (activeWaliKelas?.nama_guru || user?.nama)}
                  leftNip={isOwnHomeroomClass ? user?.nip : (activeWaliKelas?.nip || user?.nip)}
                  user={user}
                  sekolahId={user?.sekolah_id}
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
                  <i className="fa-solid fa-users-viewfinder text-teal-500 dark:text-teal-400 text-base"></i> {mapel ? `Rekap Presensi Mata Pelajaran (${mapel})` : 'Rekap Absensi Kelas (Harian)'}
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
                        {!isAdmin && !isKepalaSekolah && !isReadOnly && user?.role !== 'Admin' && <span className="text-emerald-600 dark:text-emerald-400 font-normal ml-1">(Binaan)</span>}
                      </label>
                      {(user?.role === 'Admin' || isAdmin || isKepalaSekolah || isReadOnly) ? (
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
                        <option value="" className="text-gray-900 dark:text-white dark:bg-gray-800">Semua Mapel (Rekap Absensi Kelas Harian)</option>
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
                  <div className={`grid grid-cols-2 sm:grid-cols-4 ${!mapel ? 'md:grid-cols-7' : 'md:grid-cols-4'} gap-2 no-print`}>
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-teal-800 dark:text-teal-300">Total Siswa</div>
                          <div className="text-lg font-black text-teal-600 dark:text-teal-400">{totalSiswa}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-green-800 dark:text-green-300">{mapel ? '% Keaktifan KBM' : '% Kehadiran'}</div>
                          <div className="text-lg font-black text-green-600 dark:text-green-400">{avgKehadiran}%</div>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 p-2.5 rounded-xl text-center">
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total Hadir</div>
                          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{totalHadir}</div>
                      </div>
                      {!mapel ? (
                        <>
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
                          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 p-2.5 rounded-xl text-center">
                              <div className="text-xs font-bold text-purple-800 dark:text-purple-300">Bolos</div>
                              <div className="text-lg font-black text-purple-600 dark:text-purple-400">{totalBolos}</div>
                          </div>
                        </>
                      ) : (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 p-2.5 rounded-xl text-center">
                            <div className="text-xs font-bold text-red-800 dark:text-red-300">Total Alfa</div>
                            <div className="text-lg font-black text-red-600 dark:text-red-400">{totalAlpa}</div>
                        </div>
                      )}
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
                      
                  </div>

                  <div className="overflow-x-auto w-full border border-gray-300 dark:border-gray-700 print:border-black rounded-xl print:overflow-visible shadow-sm">
                      <table className="w-full text-xs text-left border-collapse border border-gray-300 dark:border-gray-700 print:border-black print:text-[8pt]">
                          <thead className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-bold border-b border-gray-300 dark:border-gray-700 print:bg-gray-100 print:text-black print:border-black">
                            <tr>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-10">No</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black w-28">NISN</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black">Nama Siswa</th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-emerald-700 dark:text-emerald-400 print:text-black">Hadir</th>
                              {!mapel && (
                                <>
                                  <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-yellow-700 dark:text-yellow-400 print:text-black">Sakit</th>
                                  <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-orange-700 dark:text-orange-400 print:text-black">Izin</th>
                                </>
                              )}
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-red-700 dark:text-red-400 print:text-black">{mapel ? 'Alfa' : 'Alpa'}</th>
                              {!mapel && (
                                <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-16 text-purple-700 dark:text-purple-400 print:text-black">Bolos</th>
                              )}
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:border-black text-center w-24 text-blue-700 dark:text-blue-400 print:text-black">
                                {mapel ? '% Keaktifan KBM' : '% Kehadiran'}
                              </th>
                              <th className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 print:hidden text-center w-20">WA Ortu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((s, i) => (
                              <tr key={i} className="border-b border-gray-200 dark:border-gray-700 print:border-black hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-900 dark:text-white">
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center">{i + 1}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-mono text-[11px] print:text-[8pt]">{s.nisn || '-'}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black font-semibold">{s.nama_siswa}</td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-emerald-700 dark:text-emerald-400 print:text-black">{s.hadir > 0 ? s.hadir : '-'}</td>
                                {!mapel && (
                                  <>
                                    <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-yellow-700 dark:text-yellow-400 print:text-black">{s.sakit > 0 ? s.sakit : '-'}</td>
                                    <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-orange-700 dark:text-orange-400 print:text-black">{s.izin > 0 ? s.izin : '-'}</td>
                                  </>
                                )}
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-red-700 dark:text-red-400 print:text-black">{s.alpa > 0 ? s.alpa : '-'}</td>
                                {!mapel && (
                                  <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-medium text-purple-700 dark:text-purple-400 print:text-black">{s.bolos > 0 ? s.bolos : '-'}</td>
                                )}
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:border-black text-center font-bold text-blue-700 dark:text-blue-400 print:text-black">
                                  {s.total > 0 ? `${s.persentase}%` : '-'}
                                </td>
                                <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 print:hidden text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const summaryNote = `Rekap kehadiran: Hadir: ${s.hadir}, Sakit: ${s.sakit || 0}, Izin: ${s.izin || 0}, Alpa: ${s.alpa || 0}${s.bolos ? `, Bolos: ${s.bolos}` : ''} (Tingkat kehadiran: ${s.total > 0 ? s.persentase + '%' : '-'})`;
                                      triggerParentWhatsApp(
                                        {
                                          nama_siswa: s.nama_siswa,
                                          kelas: s.kelas || kelas,
                                          no_hp_ortu: s.no_hp_ortu
                                        },
                                        {
                                          status: `Rekap Presensi (${s.total > 0 ? s.persentase + '%' : 'Belum Ada Data'})`,
                                          tanggal: getWitaDateStr(),
                                          note: summaryNote
                                        },
                                        user?.sekolah_nama || user?.nama_sekolah || (typeof user?.sekolah === 'string' ? user.sekolah : user?.sekolah?.nama) || 'Sekolah'
                                      );
                                    }}
                                    title="Kirim Rekap WhatsApp ke Orang Tua"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 transition inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <i className="fa-brands fa-whatsapp text-sm text-emerald-600"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredData.length === 0 && (
                              <tr>
                                <td colSpan={!mapel ? 10 : 7} className="text-center py-6 italic text-gray-500 dark:text-gray-400 text-xs">
                                  {search ? 'Tidak ada siswa yang cocok dengan kata kunci pencarian.' : 'Tidak ada data siswa untuk kelas tersebut.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                      </table>
                  </div>
                  
                  <PrintSignature
                    leftTitle="Mengetahui,"
                    leftSubtitle={user?.role === 'guru' ? (mapel ? 'Guru Mata Pelajaran' : 'Wali Kelas') : 'Wali Kelas'}
                    leftName={mapel ? user?.nama : (isOwnHomeroomClass ? user?.nama : (activeWaliKelas?.nama_guru || user?.nama))}
                    leftNip={mapel ? user?.nip : (isOwnHomeroomClass ? user?.nip : (activeWaliKelas?.nip || user?.nip))}
                    user={user}
                    sekolahId={user?.sekolah_id}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 no-print">
                      <button type="button" onClick={() => {
                        if (!rekapData || rekapData.length === 0) return;
                        const headers = !mapel
                          ? ['No', 'NISN', 'Nama Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Bolos', '% Kehadiran']
                          : ['No', 'NISN', 'Nama Siswa', 'Hadir', 'Alfa', '% Keaktifan KBM'];
                        const csvRows = [headers.join(',')];
                        rekapData.forEach((r: any, i: number) => {
                          const persentaseStr = r.total > 0 ? `${r.persentase}%` : '0%';
                          if (!mapel) {
                            csvRows.push([i+1, r.nisn||'', `"${r.nama_siswa}"`, r.hadir||0, r.sakit||0, r.izin||0, r.alpa||0, r.bolos||0, `"${persentaseStr}"`].join(','));
                          } else {
                            csvRows.push([i+1, r.nisn||'', `"${r.nama_siswa}"`, r.hadir||0, r.alpa||0, `"${persentaseStr}"`].join(','));
                          }
                        });
                        const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = mapel ? `Rekap_Presensi_Mapel_${mapel}_${kelas}.csv` : `Rekap_Absensi_Kelas_${kelas}.csv`;
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

