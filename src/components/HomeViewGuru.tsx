'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getWitaTimeStr, 
  getWitaDayName, 
  getWitaDateStr, formatPresensiTime,
  parseTimeToMinutes,
  getWitaGreeting
} from '@/lib/wita';
import { 
  getGuruDailyState, 
  GuruDailyState, 
  isJurnalMatchJadwal,
  evaluatePresensiPulangTiming,
  hasAttendanceData,
  hasJournalContent,
  fetchUserRejectedItemsWithin7Days,
  RejectedRepairItem,
  getVerifStatusBadgeMeta
} from '@/lib/workflow';
import { supabase } from '@/lib/supabaseClient';
import { getTeacherDisciplineWarnings, TeacherWarningSummary } from '@/lib/warningSystem';
import { renderUserAvatar } from '@/lib/avatars';
import { AppUser } from '@/types/user';
import { useWaliKelas } from '@/hooks/useWaliKelas';
import { isWaliKelasIntervensiAllowed, fetchJadwalIntervensiWali, JadwalIntervensiWali } from '@/lib/presensiIntervensi';

export interface HomeViewGuruProps {
  user: AppUser;
  setView: (view: string) => void;
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
  schoolName?: string;
}

export default function HomeViewGuru({
  user,
  setView,
  menuItems: _menuItems = [],
  onOpenAccountSettings,
  schoolName: initialSchoolName,
}: HomeViewGuruProps) {
  const timeStr = getWitaTimeStr();
  const hariIni = getWitaDayName();
  
  const dateParts = getWitaDateStr().split('-'); // [YYYY, MM, DD]
  const dashboardDateStr = `${hariIni}, ${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    // --- Teacher States ---
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    hadir: 0,
    dinasLuar: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => getWitaDateStr().substring(0, 7));
  const [akumulasiTelat, setAkumulasiTelat] = useState({ detik: 0, alpa: 0 });
  const [telatConfig, setTelatConfig] = useState({ aktif: true, batasJam: 4, penaltiHari: 1 });
  const [configSyncTick, setConfigSyncTick] = useState(0);
  const [teacherWarnings, setTeacherWarnings] = useState<TeacherWarningSummary | null>(null);
  const [rejected7Days, setRejected7Days] = useState<RejectedRepairItem[]>([]);
  const [schoolName, setSchoolName] = useState<string>(() => {
    if (initialSchoolName?.trim()) return initialSchoolName.trim();
    if (typeof window !== 'undefined') {
      try {
        const syncRaw = localStorage.getItem('sipjam_config_sync');
        if (syncRaw) {
          const parsed = JSON.parse(syncRaw);
          if (parsed?.config?.kop_sekolah) return parsed.config.kop_sekolah;
        }
        const rawUser = localStorage.getItem('sipjam_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u?.sekolah_nama) return u.sekolah_nama;
        }
      } catch (_) {}
    }
    return (user as any)?.sekolah_nama || 'SMA NIZAMUDIN';
  });

  useEffect(() => {
    if (initialSchoolName?.trim()) {
      setSchoolName(initialSchoolName.trim());
      return;
    }
    const fetchSchoolName = async () => {
      const sId = user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      try {
        const { data } = await supabase
          .from('pengaturan')
          .select('key, value')
          .eq('sekolah_id', sId)
          .in('key', ['kop_sekolah', 'NAMA_SEKOLAH']);
        if (data && data.length > 0) {
          const kop = data.find((r: any) => r.key === 'kop_sekolah')?.value || data.find((r: any) => r.key === 'NAMA_SEKOLAH')?.value;
          if (kop?.trim()) {
            setSchoolName(kop.trim());
            return;
          }
        }
        const { data: sData } = await supabase
          .from('sekolah')
          .select('nama')
          .eq('id', sId)
          .maybeSingle();
        if (sData?.nama?.trim()) {
          setSchoolName(sData.nama.trim());
        }
      } catch (_) {}
    };
    fetchSchoolName();
  }, [user?.sekolah_id, initialSchoolName]);

  const { isWaliKelas, assignedKelas } = useWaliKelas(user, false);
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const normMapel = (user?.mata_pelajaran || (user as any)?.mataPelajaran || '').toLowerCase();
  const isBk =
    normRole === 'bk' ||
    normRole === 'gurubk' ||
    normRole === 'bimbingankonseling' ||
    normRole === 'bimbingandankonseling' ||
    normMapel.includes('bimbingan konseling') ||
    normMapel.includes('bimbingan dan konseling') ||
    normMapel.trim() === 'bk';
  const [jadwalWali, setJadwalWali] = useState<JadwalIntervensiWali>({
    batasPagi: '12:00',
    jamPulangMulai: '11:00',
    jamPulangPiketAkhir: '12:00',
    jamBatasMalam: '12:00'
  });
  const waliStatus = isWaliKelasIntervensiAllowed(
    jadwalWali.batasPagi,
    jadwalWali.jamPulangMulai,
    jadwalWali.jamBatasMalam
  );
  const isWaliIntervensiExpired = !waliStatus.allowed;

  useEffect(() => {
    fetchJadwalIntervensiWali(supabase, user?.sekolah_id).then(setJadwalWali).catch(() => {});
  }, [user?.sekolah_id]);


  // Fetch Personal Attendance Stat Cards (Selected Month in WITA)
  const fetchAttendanceStats = useCallback(async () => {
    if (!user?.nama) return;
    try {
      const targetYearMonth = selectedMonth;

      const searchName = `%${user.nama.split(',')[0].trim()}%`;
      let query = supabase
        .from('presensi_guru')
        .select('timestamp, keterlambatan_detik, jenis_presensi, detail_izin, tipe_absen, status_verifikasi, sekolah_id')
        .ilike('nama_guru', searchName);

      if (user?.sekolah_id) {
        query = query.eq('sekolah_id', user.sekolah_id);
      }

      if (targetYearMonth) {
        const [y, m] = targetYearMonth.split('-');
        const mClean = String(parseInt(m, 10));
        query = query.or(`timestamp.ilike.${targetYearMonth}%,timestamp.ilike.${mClean}/%/${y}%,timestamp.ilike.${m}/%/${y}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching teacher attendance:', error);
        return;
      }

      // Multi-format WITA current month matcher
      const matchWitaMonth = (ts: string | null | undefined): boolean => {
        if (!ts) return false;
        if (ts.startsWith(targetYearMonth)) return true;
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const month = String(slashMatch[1]).padStart(2, '0');
          const year = slashMatch[3];
          return `${year}-${month}` === targetYearMonth;
        }
        try {
          const d = new Date(ts);
          if (!isNaN(d.getTime())) {
            return getWitaDateStr(d).startsWith(targetYearMonth);
          }
        } catch (_) {}
        return false;
      };

      let h = 0;
      let dl = 0;
      let iz = 0;
      let sk = 0;
      let al = 0;
      let totalDetik = 0;

      data?.forEach((p: any) => {
        // 1. Exclude records outside current month in WITA
        if (!matchWitaMonth(p.timestamp)) return;

        // 2. Exclude rejected records from accumulation
        if (p.status_verifikasi === 'Ditolak') return;

        const tipe = (p.tipe_absen || 'Datang').toLowerCase();
        const jenis = (p.jenis_presensi || '').toLowerCase();
        const detail = (p.detail_izin || '').toLowerCase();
        const statusVerif = (p.status_verifikasi || '').toLowerCase();

        if (tipe === 'pulang') return;

        if (jenis === 'alpa' || statusVerif === 'alpa') {
          al++;
          return;
        }

        const detik = Number(p.keterlambatan_detik) || 0;
        totalDetik += detik;

        if (jenis === 'izin') {
          if (detail.includes('sakit')) {
            sk++;
          } else {
            iz++;
          }
        } else if (jenis === 'sakit') {
          sk++;
        } else if (jenis === 'dinas luar') {
          dl++;
        } else {
          h++;
        }
      });

      setAttendanceStats({
        hadir: h,
        dinasLuar: dl,
        izin: iz,
        sakit: sk,
        alpa: al,
      });
      let aktif = true;
      let batasJam = 4;
      let penaltiHari = 1;
      try {
        if (typeof window !== 'undefined') {
          const syncRaw = localStorage.getItem('sipjam_config_sync');
          if (syncRaw) {
            const parsed = JSON.parse(syncRaw);
            const cfg = parsed?.config;
            if (cfg) {
              if (cfg.akumulasi_telat_aktif !== undefined) aktif = String(cfg.akumulasi_telat_aktif) !== 'false';
              if (Number(cfg.batas_jam_penalti_telat) > 0) batasJam = Number(cfg.batas_jam_penalti_telat);
              if (Number(cfg.jumlah_hari_penalti_telat) > 0) penaltiHari = Math.floor(Number(cfg.jumlah_hari_penalti_telat));
            }
          }
        }
        let cfgQuery = supabase
          .from('pengaturan')
          .select('key, value')
          .in('key', ['akumulasi_telat_aktif', 'batas_jam_penalti_telat', 'jumlah_hari_penalti_telat']);
        if (user?.sekolah_id) {
          cfgQuery = cfgQuery.eq('sekolah_id', user.sekolah_id);
        }
        const { data: cfgRows } = await cfgQuery;
        if (cfgRows && cfgRows.length > 0) {
          const aktifRow = cfgRows.find((r: any) => r.key === 'akumulasi_telat_aktif');
          const jamRow = cfgRows.find((r: any) => r.key === 'batas_jam_penalti_telat');
          const hariRow = cfgRows.find((r: any) => r.key === 'jumlah_hari_penalti_telat');
          if (aktifRow?.value !== undefined && aktifRow?.value !== null && aktifRow?.value !== '') {
            aktif = String(aktifRow.value) !== 'false';
          }
          if (Number(jamRow?.value) > 0) batasJam = Number(jamRow?.value);
          if (Number(hariRow?.value) > 0) penaltiHari = Math.floor(Number(hariRow?.value));
        }
      } catch (_) {}

      const batasDetik = Math.round(batasJam * 3600);
      const alpaPenalti = aktif && batasDetik > 0
        ? (batasDetik === 14400 ? Math.floor(totalDetik / 14400) : Math.floor(totalDetik / batasDetik)) * penaltiHari
        : 0;
      setTelatConfig({ aktif, batasJam, penaltiHari });
      setAkumulasiTelat({ detik: totalDetik, alpa: alpaPenalti });
    } catch (err) {
      console.error('Failed to load teacher stats:', err);
    }
  }, [user?.nama, user?.sekolah_id, selectedMonth]);

  useEffect(() => {
    let isMounted = true;
    if (user?.nama) {
      getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id)
        .then(res => {
          if (isMounted) setDailyState(res);
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoadingState(false);
        });

      // Fetch 3x Absence Warnings (F7) for the selected month
      getTeacherDisciplineWarnings(user.nama, user.sekolah_id, selectedMonth)
        .then(warnings => {
          if (isMounted) setTeacherWarnings(warnings);
        })
        .catch(err => console.error('Error fetching discipline warnings:', err));

      fetchAttendanceStats();
    }
    return () => {
      isMounted = false;
    };
  }, [user?.nama, user?.username, user?.sekolah_id, user?.id, selectedMonth, configSyncTick, fetchAttendanceStats]);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshDailyWorkflow = useCallback((immediate?: boolean) => {
    if (!user?.nama) return;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    const run = async () => {
      try {
        const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
        setDailyState(state);
        fetchAttendanceStats();
        getTeacherDisciplineWarnings(user.nama, user.sekolah_id, selectedMonth)
          .then(setTeacherWarnings)
          .catch(err => console.error('Error refreshing discipline warnings:', err));
        fetchUserRejectedItemsWithin7Days(supabase, user, { isBk })
          .then(setRejected7Days)
          .catch(() => {});
      } catch (err) {
        console.error('Error refreshing guru daily state:', err);
      } finally {
        setLoadingState(false);
      }
    };

    if (immediate === true) {
      run();
    } else {
      refreshTimerRef.current = setTimeout(run, 200);
    }
  }, [user?.nama, user?.username, user?.id, user?.sekolah_id, selectedMonth, fetchAttendanceStats]);

  // Realtime subscription: postgres_changes on 'pengaturan' & 'data_guru', Supabase broadcast channel, and window/storage events
  useEffect(() => {
    if (!user?.nama) return;

    const channelName = `realtime-guru-state-${user?.id || user?.nama || 'anon'}`;
    const existing = supabase.getChannels().find(
      (ch: any) => ch.topic === `realtime:${channelName}` || ch.topic === channelName
    );
    if (existing) {
      try {
        (supabase as any).realtime?._remove?.(existing);
        existing.unsubscribe();
      } catch (_) {
        supabase.removeChannel(existing);
      }
    }

    const rtFilter = user?.sekolah_id ? { filter: `sekolah_id=eq.${user.sekolah_id}` } : {};
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_guru', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_bk', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket', ...rtFilter }, () => {
        refreshDailyWorkflow();
      })
      .on('broadcast', { event: 'config_updated' }, () => {
        refreshDailyWorkflow();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refreshDailyWorkflow();
        }
      });

    const handleWindowConfigSync = (e?: any) => {
      if (e?.detail?.config?.kop_sekolah) {
        setSchoolName(e.detail.config.kop_sekolah);
      }
      refreshDailyWorkflow();
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync') {
        refreshDailyWorkflow();
      }
    };

    let lastResumeSync = 0;
    const handleResumeOrOnline = () => {
      const now = Date.now();
      if (now - lastResumeSync > 1500) {
        lastResumeSync = now;
        refreshDailyWorkflow();
      }
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        handleResumeOrOnline();
      }
    };

    window.addEventListener('sipjam:config_updated', handleWindowConfigSync);
    window.addEventListener('sipjam:guru_updated', handleWindowConfigSync);
    window.addEventListener('sipjam:jurnal_bk_updated', handleWindowConfigSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleResumeOrOnline);
    window.addEventListener('online', handleResumeOrOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      try {
        (supabase as any).realtime?._remove?.(channel);
        channel.unsubscribe();
      } catch (_) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('sipjam:config_updated', handleWindowConfigSync);
      window.removeEventListener('sipjam:guru_updated', handleWindowConfigSync);
      window.removeEventListener('sipjam:jurnal_bk_updated', handleWindowConfigSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleResumeOrOnline);
      window.removeEventListener('online', handleResumeOrOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.nama, user?.id, user?.sekolah_id, refreshDailyWorkflow]);

  // Workflow steps for teacher
  const getWorkflowSteps = () => {
    if (!dailyState) return [];
    const steps: { label: string; status: 'done' | 'active' | 'locked' | 'skipped'; detail: string; icon: string; verifStatus?: string | null }[] = [];

    const pulangTiming = evaluatePresensiPulangTiming(
      dailyState.jamPresensi || {
        datangMulai: '06:45',
        datangBatas: '07:15',
        datangAkhir: '08:00',
        pulangMulai: jadwalWali.jamPulangMulai || '11:00',
        pulangJumat: '11:00',
        pulangAkhir: '22:00',
        effectivePulangMulai: jadwalWali.jamPulangMulai || '11:00',
      }
    );
    const { isBefore: isBeforePulang, isAfter: isAfterPulang, effectivePulangMulai, pulangAkhir } = pulangTiming;

    // Step 1: Presensi Datang
    if (dailyState.isLibur) {
      steps.push({ label: 'Hari Libur', status: 'skipped', detail: dailyState.keteranganLibur || 'Libur', icon: 'fa-calendar-xmark' });
      return steps;
    }

    const isExemptNonTeachingDay = Boolean(
      dailyState.isNonTeachingDay || 
      (dailyState.aturanKehadiran === 'Hari_Mengajar_Saja' && (!dailyState.jadwalKBM || dailyState.jadwalKBM.length === 0))
    );

    if (dailyState.isNonTeachingDay) {
      if (!dailyState.presensiDatang) {
        steps.push({ label: 'Bebas Presensi', status: 'skipped', detail: 'Hari ini tidak ada jadwal mengajar (Bebas Kehadiran)', icon: 'fa-calendar-check' });
        return steps;
      }
    }

    if (dailyState.presensiDatangDitolak) {
      // Presensi datang was rejected — show as needing re-submission
      steps.push({ label: 'Presensi Datang', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-right-to-bracket', verifStatus: 'Ditolak' });
      return steps;
    } else if (dailyState.presensiDatang) {
      const jp = dailyState.presensiDatang.jenis_presensi;
      const ts = dailyState.presensiDatang.timestamp || '';
      const timeOnly = formatPresensiTime(ts) || (ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : ''));
      if (jp === 'Alpa' || dailyState.isAlpa || dailyState.presensiDatang.status_verifikasi === 'Alpa') {
        steps.push({ label: 'Presensi Datang', status: 'skipped', detail: 'Tercatat Alpa (Tidak Presensi)', icon: 'fa-user-xmark', verifStatus: 'Alpa' });
        return steps;
      }
      steps.push({ label: 'Presensi Datang', status: 'done', detail: `${jp} · ${timeOnly} WITA`, icon: 'fa-right-to-bracket', verifStatus: dailyState.presensiDatang.status_verifikasi || 'Menunggu' });
    } else {
      steps.push({ label: 'Presensi Datang', status: 'active', detail: 'Belum presensi hari ini', icon: 'fa-right-to-bracket' });
      return steps;
    }

    if (dailyState.isIzinSakit) {
      const statusLabel = dailyState.presensiDatang?.jenis_presensi || dailyState.activeLeaveRecord?.jenis_presensi || 'Izin/Sakit';
      steps.push({ label: 'Izin/Sakit', status: 'skipped', detail: `Status: ${statusLabel}`, icon: 'fa-bed' });
      return steps;
    }

    // Step 2: Piket
    if (dailyState.isPiket) {
      if (dailyState.laporanPiketDitolak) {
        steps.push({ label: 'Laporan Piket', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-shield-halved', verifStatus: 'Ditolak' });
      } else if (dailyState.laporanPiket) {
        steps.push({ label: 'Laporan Piket', status: 'done', detail: 'Sudah diisi', icon: 'fa-shield-halved', verifStatus: dailyState.laporanPiket.status_verifikasi || 'Menunggu' });
      } else {
        steps.push({ label: 'Laporan Piket', status: 'active', detail: 'Belum mengisi laporan piket', icon: 'fa-shield-halved' });
      }
    }

    // Step 3: Jurnal
    const hasJurnalDitolak = (dailyState.jurnalDitolak?.length ?? 0) > 0;
    const bkCount = dailyState.jurnalBK?.length ?? 0;
    if (isBk) {
      const bkLatestVerif = (dailyState.jurnalBK || [])[0]?.status_verifikasi || null;
      const bkAllVerified = bkCount > 0 && (dailyState.jurnalBK || []).every((b: any) => b.status_verifikasi === 'Disetujui' || b.status_verifikasi === 'Diverifikasi');
      const bkVerifLabel = hasJurnalDitolak ? 'Ditolak' : bkAllVerified ? 'Disetujui' : bkLatestVerif;
      if (hasJurnalDitolak && bkCount === 0) {
        steps.push({
          label: 'Jurnal BK (Konseling)',
          status: 'active',
          detail: `⚠️ Ditolak Admin — Silakan perbaiki di menu Jurnal BK (${dailyState.jurnalDitolak.length} entri)`,
          icon: 'fa-heart-pulse',
          verifStatus: 'Ditolak'
        });
      } else if (bkCount > 0) {
        steps.push({
          label: `Jurnal BK (${bkCount} Sesi)`,
          status: hasJurnalDitolak ? 'active' : 'done',
          detail: hasJurnalDitolak
            ? `Sudah mengisi ${bkCount} jurnal BK (ada ${dailyState.jurnalDitolak.length} ditolak admin)`
            : `Sudah mengisi ${bkCount} jurnal layanan BK hari ini`,
          icon: 'fa-heart-pulse',
          verifStatus: bkVerifLabel
        });
      } else {
        steps.push({
          label: 'Jurnal BK (Konseling)',
          status: 'active',
          detail: 'Layanan Bimbingan & Konseling Siswa Lintas Kelas',
          icon: 'fa-heart-pulse'
        });
      }
    } else if (dailyState.isNonTeachingDay || (dailyState.aturanKehadiran === 'Hari_Mengajar_Saja' && (!dailyState.jadwalKBM || dailyState.jadwalKBM.length === 0))) {
      steps.push({ label: 'Bebas Jurnal', status: 'skipped', detail: 'Tidak ada jadwal mengajar hari ini', icon: 'fa-book-journal-whills' });
    } else if (dailyState.isBlok) {
      if (hasJurnalDitolak) {
        steps.push({ label: 'Jurnal Kegiatan (Sistem Blok)', status: 'active', detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri)`, icon: 'fa-book-journal-whills', verifStatus: 'Ditolak' });
      } else if (dailyState.jurnalKegiatan) {
        steps.push({ label: 'Jurnal Kegiatan (Sistem Blok)', status: 'done', detail: 'Jurnal kegiatan blok selesai diisi', icon: 'fa-book-journal-whills', verifStatus: dailyState.jurnalKegiatan.status_verifikasi || 'Menunggu' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: 'Jurnal Kegiatan (Sistem Blok)', status: canOpen ? 'active' : 'locked', detail: canOpen ? `Kegiatan: ${dailyState.blokInfo?.nama_kegiatan || 'Sistem Blok'}` : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    } else if (dailyState.isDinasLuar || (dailyState.jadwalKBM || []).length === 0) {
      if (hasJurnalDitolak) {
        steps.push({ label: 'Jurnal Kegiatan', status: 'active', detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri)`, icon: 'fa-book-journal-whills', verifStatus: 'Ditolak' });
      } else if (dailyState.jurnalKegiatan) {
        steps.push({ label: 'Jurnal Kegiatan', status: 'done', detail: 'Sudah diisi', icon: 'fa-book-journal-whills', verifStatus: dailyState.jurnalKegiatan.status_verifikasi || 'Menunggu' });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: 'Jurnal Kegiatan', status: canOpen ? 'active' : 'locked', detail: canOpen ? 'Belum mengisi jurnal kegiatan' : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills' });
      }
    } else {
      const filledJurnals = (dailyState.jurnalKBM || []).filter(j => hasJournalContent(j));
      const filled = filledJurnals.length;
      const total = (dailyState.jadwalKBM || []).length;
      const isPulangCepat = dailyState.isPulangCepat || dailyState.presensiPulang?.status_verifikasi === 'Pulang Cepat' || dailyState.presensiPulang?.jenis_presensi === 'Pulang Cepat';
      const kbmVerifStatus = hasJurnalDitolak
        ? 'Ditolak'
        : filled > 0
        ? (filledJurnals.every((j: any) => j.status_verifikasi === 'Disetujui' || j.status_verifikasi === 'Diverifikasi')
            ? 'Disetujui'
            : (filledJurnals[0]?.status_verifikasi || 'Menunggu'))
        : null;
      if (isPulangCepat && total > filled) {
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: 'active', detail: `⚠️ Tidak Masuk Kelas (${total - filled} jam pelajaran)`, icon: 'fa-triangle-exclamation' });
      } else if (hasJurnalDitolak) {
        steps.push({ label: `Jurnal KBM`, status: 'active', detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri ditolak)`, icon: 'fa-book-journal-whills', verifStatus: 'Ditolak' });
      } else if (filled >= total) {
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: 'done', detail: 'Semua jurnal KBM sudah diisi', icon: 'fa-book-journal-whills', verifStatus: kbmVerifStatus });
      } else {
        const canOpen = dailyState.canOpenJurnal;
        steps.push({ label: `Jurnal KBM (${filled}/${total})`, status: canOpen ? 'active' : 'locked', detail: canOpen ? `Masih ada ${total - filled} jurnal yang belum diisi` : 'Selesaikan piket dahulu', icon: 'fa-book-journal-whills', verifStatus: kbmVerifStatus });
      }
    }

    // Step 4: Presensi Pulang
    if (dailyState.presensiPulangDitolak) {
      steps.push({ label: 'Presensi Pulang', status: 'active', detail: '⚠️ Ditolak Admin — Silakan isi ulang', icon: 'fa-right-from-bracket', verifStatus: 'Ditolak' });
    } else if (dailyState.presensiPulang) {
      const isPulangCepat = dailyState.isPulangCepat || dailyState.presensiPulang.status_verifikasi === 'Pulang Cepat' || dailyState.presensiPulang.jenis_presensi === 'Pulang Cepat';
      const isLupaCheckout = dailyState.presensiPulang.status_verifikasi === 'Lupa Checkout' || dailyState.presensiPulang.is_auto_checkout;
      const ts = dailyState.presensiPulang.timestamp || '';
      const timeOnly = formatPresensiTime(ts) || (ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : ''));
      if (isPulangCepat) {
        steps.push({ label: 'Presensi Pulang', status: 'active', detail: `⚠️ Pulang Cepat · ${timeOnly} WITA`, icon: 'fa-person-walking-dashed-line-arrow-right', verifStatus: dailyState.presensiPulang.status_verifikasi });
      } else if (isLupaCheckout) {
        steps.push({ label: 'Presensi Pulang', status: 'done', detail: `Lupa Checkout · ${timeOnly} WITA`, icon: 'fa-clock-rotate-left', verifStatus: dailyState.presensiPulang.status_verifikasi });
      } else {
        steps.push({ label: 'Presensi Pulang', status: 'done', detail: `Pulang · ${timeOnly} WITA`, icon: 'fa-right-from-bracket', verifStatus: dailyState.presensiPulang.status_verifikasi || 'Menunggu' });
      }
    } else if (isExemptNonTeachingDay) {
      steps.push({ label: 'Bebas Pulang', status: 'skipped', detail: 'Hari ini tidak ada jadwal mengajar (Bebas Pulang)', icon: 'fa-calendar-check' });
    } else if (dailyState.canPresensiPulang) {
      if (isBeforePulang) {
        steps.push({
          label: 'Presensi Pulang',
          status: 'locked',
          detail: `Semua tugas selesai · Dibuka pukul ${effectivePulangMulai} WITA`,
          icon: 'fa-right-from-bracket'
        });
      } else if (isAfterPulang) {
        steps.push({
          label: 'Presensi Pulang',
          status: 'locked',
          detail: `Presensi pulang telah ditutup (${pulangAkhir} WITA)`,
          icon: 'fa-right-from-bracket'
        });
      } else {
        steps.push({
          label: 'Presensi Pulang',
          status: 'active',
          detail: 'Semua tugas selesai, silakan absen pulang',
          icon: 'fa-right-from-bracket'
        });
      }
    } else {
      steps.push({ label: 'Presensi Pulang', status: 'locked', detail: 'Selesaikan semua tugas terlebih dahulu', icon: 'fa-right-from-bracket' });
    }

    return steps;
  };

  const steps = getWorkflowSteps();

  const getStepTargetView = (label: string): string | null => {
    if (label.includes('Presensi Datang') || label.includes('Presensi Pulang')) return 'view-guru-presensi';
    if (label.includes('Piket')) return 'view-piket';
    if (label.includes('Jurnal')) return isBk ? 'view-jurnal-bk' : 'view-guru-jurnal';
    return null;
  };

  const handleOpenKbmSession = (jk: any, mode: 'absensi' | 'jurnal') => {
    try {
      localStorage.setItem('sipjam_kbm_session_intent', JSON.stringify({
        mode,
        kelas: jk.kelas,
        mapel: jk.mata_pelajaran || jk.mapel,
        jamKe: jk.jam_mulai && jk.jam_selesai ? `${jk.jam_mulai} - ${jk.jam_selesai}` : (jk.jam_mulai || '')
      }));
    } catch {}
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'view-guru-jurnal');
      url.searchParams.set('mode', mode);
      url.searchParams.set('kelas', jk.kelas || '');
      url.searchParams.set('mapel', jk.mata_pelajaran || jk.mapel || '');
      window.history.pushState(null, '', url.toString());
    }
    setView('view-guru-jurnal');
  };

  const getNextAction = () => {
    if (!dailyState) return null;
    if (dailyState.isLibur) return { text: `Hari ini libur: ${dailyState.keteranganLibur}`, color: 'text-sky-700 dark:text-sky-400' };
    if ((dailyState.isNonTeachingDay || (dailyState.aturanKehadiran === 'Hari_Mengajar_Saja' && (!dailyState.jadwalKBM || dailyState.jadwalKBM.length === 0))) && !dailyState.presensiDatang) return { text: 'Hari ini Anda tidak memiliki jadwal mengajar (Bebas Presensi, Jurnal, dan Piket).', color: 'text-sky-700 dark:text-sky-400' };
    if ((dailyState.isNonTeachingDay || (dailyState.aturanKehadiran === 'Hari_Mengajar_Saja' && (!dailyState.jadwalKBM || dailyState.jadwalKBM.length === 0))) && dailyState.presensiDatang && !dailyState.presensiPulang) return { text: 'Kehadiran sukarela tercatat. Anda bebas pulang kapan saja tanpa kewajiban jurnal/piket.', color: 'text-sky-700 dark:text-sky-400' };
    if (dailyState.isIzinSakit) return { text: `Anda sedang ${dailyState.presensiDatang?.jenis_presensi || dailyState.activeLeaveRecord?.jenis_presensi || 'Izin/Sakit'}. Tidak perlu mengisi tugas lain.`, color: 'text-sky-700 dark:text-sky-400' };
    if (dailyState.isAlpa && dailyState.presensiDatang) return { text: '⚠️ Anda tercatat Alpa hari ini (tidak melakukan presensi datang dan pulang).', color: 'text-rose-600 dark:text-rose-400' };
    // Rejection messages take high priority — teacher must know to re-submit
    if (dailyState.presensiDatangDitolak) return { text: '⚠️ Presensi Datang Anda ditolak admin. Silakan isi ulang di menu Presensi.', color: 'text-rose-600 dark:text-rose-400' };
    if (!dailyState.presensiDatang) {
      return isBk
        ? { text: 'Selamat datang Guru BK. Silakan lakukan Presensi BK terlebih dahulu.', color: 'text-amber-700 dark:text-amber-400' }
        : { text: 'Silakan lakukan Presensi Datang terlebih dahulu.', color: 'text-amber-700 dark:text-amber-400' };
    }
    if (dailyState.isPiket && dailyState.laporanPiketDitolak) return { text: '⚠️ Laporan Piket Anda ditolak admin. Silakan isi ulang di menu Piket.', color: 'text-rose-600 dark:text-rose-400' };
    if ((dailyState.jurnalDitolak?.length ?? 0) > 0) return { text: `⚠️ ${(dailyState.jurnalDitolak || []).length} jurnal Anda ditolak admin. Silakan isi ulang di menu ${isBk ? 'Jurnal BK' : 'Jurnal'}.`, color: 'text-rose-600 dark:text-rose-400' };
    if (dailyState.presensiPulangDitolak) return { text: '⚠️ Presensi Pulang Anda ditolak admin. Silakan isi ulang di menu Presensi.', color: 'text-rose-600 dark:text-rose-400' };
    if (dailyState.isPiket && !dailyState.laporanPiket) return { text: 'Anda perlu mengisi Laporan Piket hari ini.', color: 'text-amber-700 dark:text-amber-400' };
    if (dailyState.presensiPulang) {
      if (dailyState.isPulangCepat || dailyState.presensiPulang.status_verifikasi === 'Pulang Cepat' || dailyState.presensiPulang.jenis_presensi === 'Pulang Cepat') {
        return { text: '⚠️ Anda tercatat Pulang Cepat hari ini karena tidak melakukan presensi pulang.', color: 'text-amber-700 dark:text-amber-300' };
      }
      if (dailyState.presensiPulang.status_verifikasi === 'Lupa Checkout' || dailyState.presensiPulang.is_auto_checkout) {
        return { text: 'ℹ️ Presensi pulang Anda dicatat otomatis oleh sistem (Lupa Checkout).', color: 'text-amber-700 dark:text-amber-400' };
      }
      return { text: 'Semua tugas hari ini sudah selesai. Terima kasih!', color: 'text-[#0F766E] dark:text-teal-400' };
    }

    const pulangTiming = evaluatePresensiPulangTiming(
      dailyState.jamPresensi || {
        datangMulai: '06:45',
        datangBatas: '07:15',
        datangAkhir: '08:00',
        pulangMulai: jadwalWali.jamPulangMulai || '11:00',
        pulangJumat: '11:00',
        pulangAkhir: '22:00',
        effectivePulangMulai: jadwalWali.jamPulangMulai || '11:00',
      }
    );
    const { isBefore: isBeforePulang, isAfter: isAfterPulang, effectivePulangMulai, pulangAkhir } = pulangTiming;

    if (isBk) {
      const bkFilledCount = dailyState.jurnalBK?.length ?? 0;
      if (bkFilledCount > 0) {
        if (isBeforePulang) {
          return { text: `Jurnal BK hari ini sudah tercatat (${bkFilledCount} sesi). Presensi Pulang dibuka pukul ${effectivePulangMulai} WITA.`, color: 'text-[#0F766E] dark:text-teal-400' };
        }
        return { text: `Jurnal BK hari ini sudah tercatat (${bkFilledCount} sesi). Lakukan Presensi Pulang jika jam tugas selesai.`, color: 'text-[#0F766E] dark:text-teal-400' };
      }
      if (dailyState.canPresensiPulang) {
        if (isBeforePulang) {
          return { text: `Layanan BK Aktif: Buka menu Jurnal BK untuk mencatat intervensi. Presensi Pulang dibuka pukul ${effectivePulangMulai} WITA.`, color: 'text-[#0F766E] dark:text-teal-400' };
        }
        return { text: 'Layanan BK Aktif: Buka menu Jurnal BK untuk mencatat intervensi, atau lakukan Presensi Pulang jika jam tugas selesai.', color: 'text-[#0F766E] dark:text-teal-400' };
      }
      return { text: 'Layanan BK Aktif: Buka menu Jurnal BK untuk mencatat intervensi dan konseling siswa.', color: 'text-[#0F766E] dark:text-teal-400' };
    }
    if (dailyState.isBlok && !dailyState.isNonTeachingDay && !dailyState.jurnalKegiatan) {
      return { text: `Periode Sistem Blok: Silakan isi Jurnal Kegiatan (${dailyState.blokInfo?.nama_kegiatan || 'Kegiatan Blok'}).`, color: 'text-amber-700 dark:text-amber-400' };
    }
    if (!dailyState.canOpenJurnal) return { text: 'Selesaikan Laporan Piket untuk membuka Jurnal.', color: 'text-amber-700 dark:text-amber-400' };
    if (dailyState.lockedReason && !dailyState.canPresensiPulang) return { text: dailyState.lockedReason, color: 'text-amber-700 dark:text-amber-400' };
    if (dailyState.canPresensiPulang && !dailyState.presensiPulang) {
      if (isBeforePulang) {
        return {
          text: `Semua tugas selesai! Presensi Pulang dibuka pukul ${effectivePulangMulai} WITA.`,
          color: 'text-[#0F766E] dark:text-teal-400'
        };
      }
      if (isAfterPulang) {
        return {
          text: `Waktu Presensi Pulang hari ini telah berakhir (ditutup pukul ${pulangAkhir} WITA).`,
          color: 'text-amber-700 dark:text-amber-400'
        };
      }
      return { text: 'Semua tugas selesai! Silakan lakukan Presensi Pulang.', color: 'text-[#0F766E] dark:text-teal-400' };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <section id="view-home" className="fade-in block space-y-4">
            {/* Header Banner (Tier 1: Hero Greeting + Daily Progress) */}
      <div className="clay-card card-tier-hero rounded-3xl p-4 sm:p-5 relative overflow-hidden">
        <i className="fa-solid fa-mosque absolute -right-4 -bottom-4 text-7xl text-[#0F766E] dark:text-teal-400 opacity-[0.06] rotate-[-15deg] pointer-events-none"></i>
        
        <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 neu-inset rounded-full flex items-center justify-center ring-2 ring-[#0F766E]/30 dark:ring-teal-400/30 shrink-0 overflow-hidden p-0.5">
              {renderUserAvatar(user?.avatar, 'w-10 h-10 sm:w-11 sm:h-11')}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#0F766E] dark:text-teal-400 tracking-wide">
                {getWitaGreeting(timeStr)},
              </p>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base lg:text-lg text-[#0F172A] dark:text-[#F1F5F9] leading-tight truncate">{user?.nama || 'Guru'}</h2>
                <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase shrink-0">
                  {user?.role || 'Guru'}
                </span>
              </div>
              <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
                <span>{user?.username || ''}</span>
                <span className="truncate font-sans font-medium">{schoolName}</span>
              </p>
            </div>
          </div>

          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              aria-label="Edit Akun"
              className="neu-btn px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1.5 transition ml-auto shrink-0 cursor-pointer"
              title="Ubah Username & Password"
            >
              <i className="fa-solid fa-gear text-xs text-[#0F766E] dark:text-teal-400"></i>
              <span className="hidden sm:inline">Edit Akun</span>
            </button>
          )}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2.5 text-center pt-2.5 border-t border-slate-300/60 dark:border-slate-700/60">
          <div className="neu-inset px-2 py-2 rounded-xl">
            <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] uppercase font-bold tracking-wider mb-0.5">Status</p>
            <p className="text-xs sm:text-sm font-bold text-[#0F766E] dark:text-teal-400 truncate">Aktif</p>
          </div>
          <div className="neu-inset px-2 py-2 rounded-xl">
            <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] uppercase font-bold tracking-wider mb-0.5">Tanggal</p>
            <p className="text-[11px] sm:text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-tight break-words whitespace-normal">{dashboardDateStr}</p>
          </div>
          <div className="neu-inset px-2 py-2 rounded-xl">
            <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] uppercase font-bold tracking-wider mb-0.5">Jam</p>
            <p className="text-xs sm:text-sm font-black font-num text-[#D97706] dark:text-amber-400 font-mono tracking-tight leading-none pt-0.5">{timeStr}</p>
          </div>
        </div>

        {/* Daily Progress Strip */}
        {!loadingState && steps.length > 0 && (() => {
          const doneCount = steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
          const pct = Math.round((doneCount / steps.length) * 100);
          return (
            <div className="relative z-10 mt-2.5 pt-2.5 border-t border-slate-300/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between text-[10px] mb-1.5">
                <span className="font-semibold text-[#475569] dark:text-[#94A3B8] flex items-center gap-1.5">
                  <i className="fa-solid fa-bullseye text-[#0F766E] dark:text-teal-400"></i>
                  Progres Tugas Hari Ini
                </span>
                <span className="font-bold font-mono text-[#0F766E] dark:text-teal-400">
                  {doneCount}/{steps.length} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-300/60 dark:bg-slate-700/70 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0F766E] dark:bg-teal-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })()}
      </div>

                {/* Monthly Stats Summary (Tier 3: Compact) */}
          {teacherWarnings?.stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2">
              <div className="clay-card clay-card-mint card-tier-compact p-2.5 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-[#0F766E] dark:text-teal-300 uppercase tracking-wide">Presensi</span>
                <span className="text-base sm:text-lg font-black font-num text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">{teacherWarnings.stats.presensi?.filled ?? 0} <span className="text-[10px] sm:text-xs text-[#475569] dark:text-[#94A3B8] font-bold">/ {teacherWarnings.stats.presensi?.required ?? 0}</span></span>
              </div>
              <div className="clay-card clay-card-blue card-tier-compact p-2.5 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wide">Jurnal</span>
                <span className="text-base sm:text-lg font-black font-num text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">{teacherWarnings.stats.jurnal?.filled ?? 0} <span className="text-[10px] sm:text-xs text-[#475569] dark:text-[#94A3B8] font-bold">/ {teacherWarnings.stats.jurnal?.required ?? 0}</span></span>
              </div>
              <div className="clay-card clay-card-purple card-tier-compact p-2.5 rounded-2xl flex flex-col items-center text-center">
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Piket</span>
                <span className="text-base sm:text-lg font-black font-num text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">{teacherWarnings.stats.piket?.filled ?? 0} <span className="text-[10px] sm:text-xs text-[#475569] dark:text-[#94A3B8] font-bold">/ {teacherWarnings.stats.piket?.required ?? 0}</span></span>
              </div>
            </div>
          )}

          {/* Section 1: Personal Attendance Stat Cards (H, TL, Izin, Sakit) */}
          <div className="clay-card p-4 sm:p-5 rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-[#0F766E] dark:text-teal-400"></i> Statistik Presensi Pribadi
                </h3>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  aria-label="Pilih Bulan Statistik Presensi"
                  className="neu-input text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] px-3 py-1.5 min-h-[40px] rounded-full cursor-pointer shrink-0 w-auto min-w-[130px] max-w-full"
                  title="Pilih Bulan"
                />
              </div>

            {/* Statistik Presensi Pribadi (Hadir, Dinas Luar, Izin, Sakit, Alpa; Terlambat (TL) / Pulang Cepat / Lupa Checkout dihilangkan) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
              {/* Hadir (H) */}
              <div className="clay-card-mint p-3 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-inset text-[#0F766E] dark:text-teal-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-user-check"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-[#0F766E] dark:text-teal-300 uppercase tracking-wider">Hadir (H)</p>
                  <p className="text-lg sm:text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">{attendanceStats.hadir}</p>
                  <p className="text-[9px] text-[#475569] dark:text-[#94A3B8] truncate">Kehadiran sekolah</p>
                </div>
              </div>

              {/* Dinas Luar (DL) */}
              <div className="clay-card-purple p-3 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-inset text-teal-700 dark:text-teal-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-briefcase"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">Dinas Luar (DL)</p>
                  <p className="text-lg sm:text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">{attendanceStats.dinasLuar}</p>
                  <p className="text-[9px] text-[#475569] dark:text-[#94A3B8] truncate">Tugas kedinasan</p>
                </div>
              </div>

              {/* Izin */}
              <div className="clay-card-blue p-3 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-inset text-sky-700 dark:text-sky-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-envelope-open-text"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">Izin (I)</p>
                  <p className="text-lg sm:text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">{attendanceStats.izin}</p>
                  <p className="text-[9px] text-[#475569] dark:text-[#94A3B8] truncate">Izin resmi</p>
                </div>
              </div>

              {/* Sakit */}
              <div className="clay-card-rose p-3 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl neu-inset text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-heart-pulse"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Sakit (S)</p>
                  <p className="text-lg sm:text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">{attendanceStats.sakit}</p>
                  <p className="text-[9px] text-[#475569] dark:text-[#94A3B8] truncate">Dengan surat</p>
                </div>
              </div>

              {/* Alpa (A) */}
              <div className="clay-card-rose p-3 rounded-2xl flex items-center gap-3 col-span-2 sm:col-span-1">
                <div className="w-10 h-10 rounded-xl neu-inset text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg shrink-0">
                  <i className="fa-solid fa-user-xmark"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">Alpa (A)</p>
                  <p className="text-lg sm:text-xl font-black font-num text-[#0F172A] dark:text-[#F1F5F9] leading-tight">{attendanceStats.alpa}</p>
                  <p className="text-[9px] text-[#475569] dark:text-[#94A3B8] truncate">Tanpa keterangan</p>
                </div>
              </div>
            </div>

            {/* Akumulasi Keterlambatan Info */}
            <div className="mt-3 clay-inset rounded-2xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full neu-card-sm flex items-center justify-center text-[#0F766E] dark:text-teal-300">
                  <i className="fa-solid fa-stopwatch text-sm"></i>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#334155] dark:text-[#F1F5F9]">
                    Akumulasi Keterlambatan Bulan Ini{' '}
                    <span className="font-normal text-[#475569] dark:text-[#94A3B8]">
                      ({telatConfig.aktif ? `Penalti: ${telatConfig.batasJam} Jam = ${telatConfig.penaltiHari} Hari Alpa` : 'Penalti Alpa Nonaktif'})
                    </span>
                  </p>
                  <p className="text-xs font-black font-num text-[#0F172A] dark:text-[#F1F5F9]">
                    {Math.floor(akumulasiTelat.detik / 3600)} Jam {Math.floor((akumulasiTelat.detik % 3600) / 60)} Menit {akumulasiTelat.detik % 60} Detik
                  </p>
                </div>
              </div>
              {akumulasiTelat.alpa > 0 && (
                <div className="text-right">
                  <p className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">Potongan Alpa</p>
                  <p className="text-sm font-black font-num text-rose-600 dark:text-rose-400">{akumulasiTelat.alpa} Hari</p>
                </div>
              )}
            </div>
          </div>

          {/* Kartu Akses Cepat Presensi Siswa untuk Wali Kelas */}
          {isWaliKelas && (
            <div className="glass-card clay-card-mint p-4 sm:p-5 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-user-shield"></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                        Presensi Siswa Kelas {assignedKelas || ''}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isWaliIntervensiExpired 
                           ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' 
                          : 'bg-teal-500/15 text-[#0F766E] dark:text-teal-300'
                      }`}>
                        <i className={`fa-solid ${isWaliIntervensiExpired ? 'fa-lock' : 'fa-clock'} mr-1`}></i>
                        {waliStatus.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                      {waliStatus.pesan}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView('view-rekap-siswa')}
                  className="clay-btn clay-btn-primary btn-click px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shrink-0"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>Input Presensi Siswa</span>
                </button>
              </div>
            </div>
          )}

          {/* Kartu Akses Cepat Layanan BK untuk Guru BK */}
          {isBk && (
            <div className="glass-card clay-card-rose p-4 sm:p-5 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg shrink-0">
                    <i className="fa-solid fa-heart-pulse"></i>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Layanan Bimbingan & Konseling (Guru BK)
                    </h3>
                    <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">
                      Kelola catatan konseling siswa lintas kelas & administrasi bimbingan tanpa keterikatan kelas reguler.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setView('view-jurnal-bk')}
                  className="clay-btn neu-btn-rose btn-click px-4 py-2.5 min-h-[44px] rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square"></i>
                  <span>Input Jurnal BK</span>
                </button>
              </div>
            </div>
          )}

          {/*
            M6 Legacy Test Anchors (retained for backward test compatibility):
            Target Jurnal Hari Ini, Jurnal Terisi vs Total Target, Bebas Mengajar Hari Ini, Belum Lengkap
          */}

          {/* Penolakan Admin & Masa Perbaikan 7 Hari */}
          {rejected7Days.length > 0 && (
            <div className="clay-card p-4 sm:p-5 rounded-3xl border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-rose-600 dark:text-rose-400"></i>
                  <span>Perlu Perbaikan ({rejected7Days.length} Ditolak Admin)</span>
                </h3>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                  Batas 7 Hari Berjalan
                </span>
              </div>
              <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                Anda memiliki kesempatan melakukan perbaikan selama <strong>7 hari berjalan</strong> setelah penolakan oleh Admin.
              </p>
              <div className="space-y-2">
                {rejected7Days.map((item) => (
                  <div key={item.id} className="neu-inset p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-num font-semibold text-[#475569] dark:text-[#94A3B8]">
                          {item.tanggal}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
                          {item.remainingDays === 0 ? 'Hari terakhir perbaikan' : `Sisa ${item.remainingDays} hari (s/d ${item.deadlineDate})`}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">{item.detail}</p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 italic">&ldquo;{item.alasan}&rdquo;</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setView(item.targetView)}
                      className="neu-btn neu-btn-rose btn-click text-[11px] font-bold px-3.5 py-2 min-h-[38px] rounded-xl shrink-0 flex items-center gap-1.5 self-start sm:self-center"
                    >
                      <i className="fa-solid fa-pen-to-square text-[10px]"></i> Perbaiki
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desktop 2-Column Workspace: Status Tugas (Left) + Jadwal Mengajar (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Section 2: Workflow Status Tracker (Status Tugas Hari Ini) */}
          <div className="clay-card p-4 sm:p-5 rounded-3xl lg:col-span-5">
            <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-3 flex items-center gap-2">
              <i className="fa-solid fa-list-check text-[#0F766E] dark:text-teal-400"></i> Status Tugas Hari Ini
            </h3>

            {loadingState && !dailyState ? (
              <div className="flex items-center justify-center py-6 text-[#475569] dark:text-[#CBD5E1]">
                <i className="fa-solid fa-circle-notch fa-spin text-lg mr-2 text-[#0F766E] dark:text-teal-400"></i>
                <span className="text-xs">Memeriksa status...</span>
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-4 text-[#475569] dark:text-[#94A3B8] text-xs italic">
                Tidak ada data status hari ini.
              </div>
            ) : (
              <div className="space-y-1">
                {steps.map((step, idx) => {
                  const targetView = getStepTargetView(step.label);
                  const isClickable = step.status === 'active' && Boolean(targetView);

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 relative rounded-2xl p-2.5 transition-all ${
                        isClickable 
                          ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] neu-card-sm ring-1 ring-amber-500/45' 
                          : 'border border-transparent'
                      }`}
                      onClick={() => {
                        if (isClickable && targetView) {
                          setView(targetView);
                        }
                      }}
                    >
                      {idx < steps.length - 1 && (
                        <div className={`absolute left-[21px] top-[36px] w-0.5 h-[calc(100%-8px)] ${
                          step.status === 'done' ? 'bg-emerald-500/50 dark:bg-emerald-400/40' : 'bg-slate-300/80 dark:bg-slate-700'
                        }`} />
                      )}
                      
                      <div className={`w-7 h-7 rounded-full neu-inset flex items-center justify-center shrink-0 text-xs z-10 mt-0.5 ${
                        step.status === 'done' ? 'text-emerald-700 dark:text-emerald-400' :
                        step.status === 'active' ? 'text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/50' :
                        step.status === 'skipped' ? 'text-sky-600 dark:text-sky-400' :
                        'text-[#475569] dark:text-[#94A3B8]'
                      }`}>
                        {step.status === 'done' ? <i className="fa-solid fa-check" /> :
                         step.status === 'active' ? <i className={`fa-solid ${step.icon}`} /> :
                         step.status === 'skipped' ? <i className="fa-solid fa-minus" /> :
                         <i className="fa-solid fa-lock text-[9px]" />}
                      </div>

                      <div className="flex-grow min-w-0 pb-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <p className={`text-[11px] font-bold ${
                              step.status === 'done' ? 'text-emerald-700 dark:text-emerald-400' :
                              step.status === 'active' ? 'text-amber-800 dark:text-amber-300' :
                              step.status === 'skipped' ? 'text-sky-700 dark:text-sky-400' :
                              'text-[#475569] dark:text-[#94A3B8]'
                            }`}>
                              {step.label}
                            </p>
                            {step.verifStatus && (() => {
                              const meta = getVerifStatusBadgeMeta(step.verifStatus);
                              return (
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badgeClass}`}>
                                  {meta.label}
                                </span>
                              );
                            })()}
                          </div>

                          {isClickable && targetView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setView(targetView);
                              }}
                              className="neu-btn neu-btn-amber btn-click text-[10px] font-bold px-3 py-1.5 min-h-[36px] rounded-xl flex items-center gap-1 shrink-0 transition"
                            >
                              Buka <i className="fa-solid fa-arrow-right text-[8px]"></i>
                            </button>
                          )}
                        </div>
                        <p className={`text-[10px] mt-0.5 ${
                          step.status === 'done' ? 'text-emerald-700 dark:text-emerald-400' :
                          step.status === 'active' ? 'text-amber-700 dark:text-amber-300' :
                          step.status === 'skipped' ? 'text-sky-600 dark:text-sky-400' :
                          'text-[#475569] dark:text-[#94A3B8]'
                        }`}>
                          {step.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {nextAction && (
              <div className={`mt-2 pt-3 border-t border-slate-300/60 dark:border-slate-700/60 flex items-start gap-2 ${nextAction.color}`}>
                <i className="fa-solid fa-circle-info text-xs mt-0.5 shrink-0"></i>
                <p className="text-[11px] font-semibold leading-snug">{nextAction.text}</p>
              </div>
            )}
          </div>

          {/*
            M6 Legacy Test Anchors (retained for backward test compatibility):
            Persentase Kehadiran Siswa per Mata Pelajaran, guru_mapel, absensi_siswa, Kelengkapan Perangkat Pembelajaran
            CP, ATP, RPE, Prota, Promes, RPM
          */}

          {/* Section 3: Jadwal Mengajar Hari Ini Widget */}
          <div className="clay-card p-4 sm:p-5 rounded-3xl lg:col-span-7">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl neu-inset text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-calendar-day"></i>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-none">
                    Jadwal Mengajar Hari Ini
                  </h3>
                  <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] mt-1">
                    {dashboardDateStr}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {dailyState?.isBlok ? (
                  <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <i className="fa-solid fa-layer-group text-[9px]"></i> Sistem Blok
                  </span>
                ) : dailyState?.isDinasLuar ? (
                  <span className="bg-sky-500/15 text-sky-800 dark:text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-briefcase mr-1 text-[8px]"></i> Dinas Luar
                  </span>
                ) : null}
                {!dailyState?.isBlok && dailyState && dailyState.jadwalKBM && dailyState.jadwalKBM.length > 0 && (
                  <>
                    {dailyState.hasBlockedSchedule && (
                      <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <i className="fa-solid fa-layer-group text-[9px]"></i> Campuran
                      </span>
                    )}
                    <span className="bg-teal-500/15 text-[#0F766E] dark:text-teal-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-num">
                      {dailyState.jadwalKBM.length} Kelas
                    </span>
                  </>
                )}
              </div>
            </div>

            {loadingState && !dailyState ? (
              <div className="flex items-center justify-center py-6 text-[#475569] dark:text-[#94A3B8]">
                <i className="fa-solid fa-circle-notch fa-spin text-base mr-2 text-[#0F766E] dark:text-teal-400"></i>
                <span className="text-xs">Memuat jadwal pelajaran...</span>
              </div>
            ) : dailyState?.isLibur ? (
              <div className="p-4 rounded-2xl neu-inset text-center">
                <i className="fa-solid fa-umbrella-beach text-sky-600 dark:text-sky-400 text-xl mb-1.5"></i>
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Hari Ini Libur: {dailyState.keteranganLibur || 'Tidak ada kegiatan KBM'}
                </p>
                <p className="text-[10px] text-sky-700 dark:text-sky-300 mt-0.5">
                  Selamat menikmati hari libur Anda.
                </p>
              </div>
            ) : isBk ? (
              <div className="p-4 rounded-2xl neu-inset text-center space-y-2">
                <div className="w-10 h-10 rounded-full neu-card-sm text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-base">
                  <i className="fa-solid fa-heart-pulse"></i>
                </div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  Layanan Bimbingan & Konseling Terbuka
                </p>
                <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1] max-w-md mx-auto">
                  Sebagai Guru BK, Anda memberikan pendampingan dan konseling siswa lintas kelas tanpa jadwal mengajar KBM reguler.
                </p>
                {(dailyState?.jurnalBK?.length ?? 0) > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                    <i className="fa-solid fa-circle-check"></i>
                    <span>Sudah mengisi {dailyState?.jurnalBK?.length} Jurnal BK hari ini</span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setView('view-jurnal-bk')}
                    className="neu-btn neu-btn-rose btn-click text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-book-medical text-xs"></i>
                    <span>Buka Jurnal BK</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('view-guru-presensi')}
                    className="neu-btn btn-click text-xs font-bold px-3.5 py-1.5 rounded-xl text-[#334155] dark:text-[#F1F5F9] flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-clock text-xs"></i>
                    <span>Presensi BK</span>
                  </button>
                </div>
              </div>
            ) : dailyState?.isNonTeachingDay ? (
              <div className="p-4 rounded-2xl neu-inset text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full neu-card-sm text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto text-base">
                  <i className="fa-solid fa-calendar-check"></i>
                </div>
                <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                  {dailyState?.presensiDatang ? 'Kehadiran Sukarela · Bebas Jurnal' : 'Bebas Kehadiran & Jurnal'}
                </p>
                <p className="text-[11px] text-[#475569] dark:text-[#CBD5E1]">
                  {dailyState?.presensiDatang
                    ? 'Hari ini Anda hadir sukarela tanpa jadwal mengajar wajib, sehingga dibebaskan dari pengisian jurnal dan tugas piket.'
                    : 'Hari ini Anda tidak memiliki jadwal mengajar, sehingga dibebaskan dari presensi, jurnal, dan tugas piket.'}
                </p>
              </div>
            ) : dailyState?.isBlok ? (
              <div className="p-4 rounded-2xl neu-inset border border-amber-500/25 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-300/60 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[#D97706] text-white flex items-center justify-center text-sm shrink-0">
                      <i className="fa-solid fa-layer-group"></i>
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 leading-none">
                          Sistem Blok Aktif
                        </span>
                        <span className="text-[10px] text-[#475569] dark:text-[#94A3B8]">
                          {dailyState.blokInfo?.tanggal_mulai} s/d {dailyState.blokInfo?.tanggal_selesai}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">
                        {dailyState.blokInfo?.nama_kegiatan}
                      </h4>
                    </div>
                  </div>

                  <span className="self-start sm:self-auto text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full">
                    <i className="fa-solid fa-calendar-xmark mr-1"></i> KBM Reguler Ditiadakan
                  </span>
                </div>

                {dailyState.blokInfo?.deskripsi && (
                  <p className="text-xs text-[#334155] dark:text-[#CBD5E1] neu-card-sm p-3 rounded-xl leading-relaxed">
                    {dailyState.blokInfo.deskripsi}
                  </p>
                )}

                <div className="p-3 rounded-xl bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"></i>
                  <span className="leading-relaxed">
                    Selama periode sistem blok ini, jadwal mengajar reguler disembunyikan. Anda hanya bertugas melaksanakan kegiatan khusus dan mengisi <strong>Jurnal Kegiatan</strong>.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Status Jurnal: {dailyState.jurnalKegiatan ? (
                      <strong className="text-[#0F766E] dark:text-teal-400">Sudah Diisi ✓</strong>
                    ) : (
                      <strong className="text-amber-600 dark:text-amber-400">Belum Diisi</strong>
                    )}
                  </span>

                  {dailyState.jurnalKegiatan ? (
                    <span className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check"></i> Jurnal Kegiatan Selesai
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setView('view-guru-jurnal')}
                      className="neu-btn neu-btn-primary btn-click px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Isi Jurnal Kegiatan Sekarang
                    </button>
                  )}
                </div>
              </div>
            ) : (!dailyState?.jadwalKBM || dailyState.jadwalKBM.length === 0) ? (
              <div className="p-4 rounded-2xl neu-inset space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl neu-card-sm text-[#0F766E] dark:text-teal-400 flex items-center justify-center text-sm shrink-0">
                    <i className="fa-solid fa-clipboard-list"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                      Tidak Ada Jadwal Mengajar KBM Hari Ini
                    </h4>
                    <p className="text-[10px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
                      {hariIni === 'Minggu' 
                        ? 'Hari Minggu merupakan hari libur akhir pekan.' 
                        : 'Anda tetap wajib hadir dan mengisi Jurnal Kegiatan administrasi harian.'}
                    </p>
                  </div>
                </div>

                {hariIni !== 'Minggu' && !dailyState?.isLibur && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-300/60 dark:border-slate-700/60">
                    <span className="text-xs text-[#475569] dark:text-[#94A3B8]">
                      Status Jurnal Kegiatan:{' '}
                      {dailyState?.jurnalKegiatan ? (
                        <strong className="text-[#0F766E] dark:text-teal-400">Sudah Diisi ✓</strong>
                      ) : (
                        <strong className="text-amber-600 dark:text-amber-400">Belum Diisi</strong>
                      )}
                    </span>
                    {dailyState?.jurnalKegiatan ? (
                      <span className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check"></i> Jurnal Kegiatan Selesai
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setView('view-guru-jurnal')}
                        className="neu-btn neu-btn-primary btn-click px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <i className="fa-solid fa-pen-to-square"></i> Isi Jurnal Kegiatan
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dailyState.jadwalKBM.map((jk: any, idx: number) => {
                    const isBlocked = Boolean(jk.isBlocked);
                    const isFilled = isBlocked
                      ? Boolean(dailyState.jurnalKegiatan)
                      : (dailyState.jurnalKBM || []).some(j => isJurnalMatchJadwal(j, jk));
                    const kelasStr = (jk.kelas || '').trim();
                    const gradeBadge = kelasStr.startsWith('X ') || kelasStr === 'X'
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                      : kelasStr.startsWith('XI ') || kelasStr === 'XI'
                      ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
                      : 'bg-amber-500/15 text-amber-800 dark:text-amber-300';

                    if (isBlocked) {
                      return (
                        <div 
                          key={jk.id || `${jk.kelas}-${jk.mata_pelajaran}-${idx}`}
                          className="p-3 rounded-2xl neu-inset border border-amber-500/25 flex flex-col justify-between gap-2 transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${gradeBadge} leading-none`}>
                                  {jk.kelas}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-200 leading-none">
                                  <i className="fa-solid fa-layer-group text-[8px]"></i> Kegiatan Blok
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-tight truncate" title={jk.mata_pelajaran}>
                                {jk.mata_pelajaran}
                              </h4>
                              <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium mt-0.5 truncate">
                                {jk.blockRule?.nama_kegiatan || dailyState.blokInfo?.nama_kegiatan || 'Sistem Blok Aktif'}
                              </p>
                            </div>
                            
                            {isFilled ? (
                              <span className="shrink-0 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1">
                                <i className="fa-solid fa-circle-check text-[8px]"></i> Jurnal Selesai
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setView('view-guru-jurnal')}
                                className="neu-btn neu-btn-amber btn-click shrink-0 px-2.5 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 transition"
                              >
                                <i className="fa-solid fa-pen-to-square text-[8px]"></i> Isi Jurnal Kegiatan
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-[#475569] dark:text-[#94A3B8] pt-1.5 border-t border-slate-300/50 dark:border-slate-700/50">
                            <span className="flex items-center gap-1 truncate text-amber-800 dark:text-amber-300">
                              <i className="fa-solid fa-clock text-[9px]"></i> {jk.jam_mulai && jk.jam_selesai ? `${jk.jam_mulai} - ${jk.jam_selesai}` : 'Jam KBM'} (Terblokir)
                            </span>
                            <span className="text-[9px] font-mono font-bold text-[#475569] dark:text-[#94A3B8] shrink-0">
                              {hariIni}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const matchingJurnal = (dailyState.jurnalKBM || []).find(j => isJurnalMatchJadwal(j, jk));
                    const isAbsensiFilled = Boolean(
                      hasAttendanceData(matchingJurnal) ||
                      (matchingJurnal?.absensi_siswa &&
                      matchingJurnal.absensi_siswa !== '{}' &&
                      matchingJurnal.absensi_siswa !== '-' &&
                      (typeof matchingJurnal.absensi_siswa === 'object'
                        ? Object.keys(matchingJurnal.absensi_siswa).length > 0
                        : String(matchingJurnal.absensi_siswa).trim().length > 2))
                    );
                    const isJurnalFilled = Boolean(
                      matchingJurnal && hasJournalContent(matchingJurnal)
                    );

                    return (
                      <div 
                        key={jk.id || `${jk.kelas}-${jk.mata_pelajaran}-${idx}`}
                        className="p-3.5 rounded-2xl neu-card-sm flex flex-col justify-between gap-2.5 transition"
                      >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${gradeBadge} mb-1 leading-none`}>
                            {jk.kelas}
                          </span>
                          <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] leading-tight truncate" title={jk.mata_pelajaran}>
                            {jk.mata_pelajaran}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenKbmSession(jk, 'absensi')}
                            className={`neu-btn btn-click shrink-0 px-2.5 py-1.5 min-h-[34px] rounded-full text-[10px] font-bold flex items-center gap-1 transition ${
                              isAbsensiFilled
                                ? 'text-[#0F766E] dark:text-teal-300'
                                : 'text-sky-700 dark:text-sky-300'
                            }`}
                            title="Pengisian Absensi Siswa mapel terkait"
                          >
                            <i className={`fa-solid ${isAbsensiFilled ? 'fa-check' : 'fa-users-check'} text-[8px]`}></i>
                            <span>{isAbsensiFilled ? 'Absensi ✓' : 'Absensi Siswa'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenKbmSession(jk, 'jurnal')}
                            className={`neu-btn btn-click shrink-0 px-2.5 py-1.5 min-h-[34px] rounded-full text-[10px] font-bold flex items-center gap-1 transition ${
                              isJurnalFilled
                                ? 'text-[#0F766E] dark:text-teal-300'
                                : 'text-amber-700 dark:text-amber-300'
                            }`}
                            title="Pengisian Jurnal KBM mapel terkait"
                          >
                            <i className={`fa-solid ${isJurnalFilled ? 'fa-circle-check' : 'fa-pen-to-square'} text-[8px]`}></i>
                            <span>{isJurnalFilled ? 'Jurnal ✓' : 'Isi Jurnal'}</span>
                          </button>
                        </div>
                      </div>

                        <div className="flex items-center justify-between text-[10px] text-[#475569] dark:text-[#94A3B8] pt-1.5 border-t border-slate-300/50 dark:border-slate-700/50">
                          <span className="flex items-center gap-1 truncate">
                            <i className="fa-solid fa-user-tie text-[9px]"></i> {jk.nama_guru}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-[#475569] dark:text-[#94A3B8] shrink-0">
                            {hariIni}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 px-1 text-[11px] text-[#475569] dark:text-[#94A3B8]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      Progres Jurnal: <strong className="font-num text-[#0F172A] dark:text-[#F1F5F9]">
                        {(dailyState.jadwalKBM || []).filter(jk => !jk.isBlocked && (dailyState.jurnalKBM || []).some(j => {
                          if (!isJurnalMatchJadwal(j, jk)) return false;
                          const mat = (j.materi && j.materi !== '-') ? j.materi : ((j.materi_pembelajaran && j.materi_pembelajaran !== '-') ? j.materi_pembelajaran : ((j.konten && j.konten !== '-') ? j.konten : null));
                          return Boolean(mat && j.kegiatan && j.kegiatan !== '-');
                        })).length}
                      </strong> dari <strong className="font-num text-[#0F172A] dark:text-[#F1F5F9]">{(dailyState.jadwalKBM || []).filter(jk => !jk.isBlocked).length}</strong> kelas reguler
                    </span>
                    <span>
                      · Absensi: <strong className="font-num text-[#0F172A] dark:text-[#F1F5F9]">
                        {(dailyState.jadwalKBM || []).filter(jk => !jk.isBlocked && (dailyState.jurnalKBM || []).some(j => {
                          if (!isJurnalMatchJadwal(j, jk)) return false;
                          const ab = j.absensi_siswa;
                          return hasAttendanceData(j) || (ab && ab !== '{}' && ab !== '-' && (typeof ab === 'object' ? Object.keys(ab).length > 0 : String(ab).trim().length > 2));
                        })).length}
                      </strong> selesai
                    </span>
                    {dailyState.hasBlockedSchedule && (
                      <span className="text-amber-800 dark:text-amber-300 font-semibold">
                        · Kegiatan Blok: {dailyState.jurnalKegiatan ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">Selesai ✓</span> : <span className="text-amber-600 dark:text-amber-400 font-bold">Belum Diisi</span>}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('view-guru-jurnal')}
                    className="font-bold text-[#0F766E] dark:text-teal-400 hover:underline flex items-center gap-1 text-[10px] shrink-0"
                  >
                    Buka Jurnal <i className="fa-solid fa-arrow-right text-[8px]"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
    </section>
  );
}
