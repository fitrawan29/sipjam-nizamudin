'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getWitaTimeStr, 
  getWitaDayName, 
  getWitaDateStr, 
  extractWitaDateStr,
  formatPresensiTime 
} from '@/lib/wita';
import { supabase } from '@/lib/supabaseClient';
import { renderUserAvatar } from '@/lib/avatars';
import { AppUser } from '@/types/user';

export interface HomeViewTUProps {
  user: AppUser;
  setView: (view: string) => void;
  menuItems?: any[];
  onOpenAccountSettings?: () => void;
  schoolName?: string;
}

export interface TUDailyState {
  tanggal: string;
  isLibur: boolean;
  keteranganLibur: string | null;
  presensiDatang: any | null;
  presensiPulang: any | null;
  presensiDatangDitolak: any | null;
  presensiPulangDitolak: any | null;
  jurnalKegiatan: any | null;
  jurnalDitolak: any[];
  isPiket?: boolean;
  laporanPiket?: any | null;
  laporanPiketDitolak?: any | null;
  isIzinSakit: boolean;
  isDinasLuar: boolean;
  isAlpa: boolean;
  canPresensiPulang: boolean;
}

export default function HomeViewTU({
  user,
  setView,
  menuItems: _menuItems = [],
  onOpenAccountSettings,
  schoolName: propSchoolName,
}: HomeViewTUProps) {
  const [timeStr, setTimeStr] = useState<string>(() => getWitaTimeStr());
  const hariIni = getWitaDayName();
  const dateParts = getWitaDateStr().split('-'); // [YYYY, MM, DD]
  const dashboardDateStr = `${hariIni}, ${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

  // Live WITA clock ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getWitaTimeStr());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // School name resolution with local storage and database fallback
  const [schoolName, setSchoolName] = useState<string>(() => {
    if (propSchoolName) return propSchoolName;
    if (typeof window !== 'undefined') {
      try {
        const syncRaw = localStorage.getItem('sipjam_config_sync');
        if (syncRaw) {
          const parsed = JSON.parse(syncRaw);
          if (parsed?.config?.kop_sekolah) return parsed.config.kop_sekolah;
          if (parsed?.config?.NAMA_SEKOLAH) return parsed.config.NAMA_SEKOLAH;
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
  }, [user?.sekolah_id]);

  // Operational State & Stats
  const [dailyState, setDailyState] = useState<TUDailyState | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    hadir: 0,
    dinasLuar: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => getWitaDateStr().substring(0, 7));
  const [monthlyJurnalCount, setMonthlyJurnalCount] = useState<number>(0);
  const [akumulasiTelat, setAkumulasiTelat] = useState({ detik: 0, alpa: 0 });
  const [telatConfig, setTelatConfig] = useState({ aktif: true, batasJam: 4, penaltiHari: 1 });
  const [configSyncTick, setConfigSyncTick] = useState(0);

  // Multi-format WITA month matcher
  const matchWitaMonth = (ts: string | null | undefined, targetMonth: string): boolean => {
    if (!ts) return false;
    if (ts.startsWith(targetMonth)) return true;
    const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const month = String(slashMatch[1]).padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}` === targetMonth;
    }
    try {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return getWitaDateStr(d).startsWith(targetMonth);
      }
    } catch (_) {}
    return false;
  };

  // Main daily workflow & attendance stats fetcher
  const loadTuData = useCallback(async () => {
    if (!user?.nama) return;
    const cleanName = (user.nama || '').split(',')[0].trim();
    const todayStr = getWitaDateStr();
    setLoadingState(true);

    try {
      // 1. Check Holiday from kalender_pendidikan & weekend rules
      let isLibur = false;
      let keteranganLibur: string | null = null;

      if (hariIni === 'Minggu') {
        isLibur = true;
        keteranganLibur = 'Hari Minggu (Libur Akhir Pekan)';
      }

      // Check school 5-day setting & holiday calendar
      let pengaturanQuery = supabase
        .from('pengaturan')
        .select('key, value, sekolah_id');
      if (user?.sekolah_id) {
        pengaturanQuery = pengaturanQuery.eq('sekolah_id', user.sekolah_id);
      }
      const { data: cfgRows } = await pengaturanQuery;

      let hariSekolah = 6;
      let aktifTelat = true;
      let batasJamTelat = 4;
      let penaltiHariTelat = 1;

      if (cfgRows && cfgRows.length > 0) {
        const hs = cfgRows.find((r: any) => r.key === 'hari_sekolah')?.value;
        if (hs) hariSekolah = parseInt(hs, 10) || 6;

        const akt = cfgRows.find((r: any) => r.key === 'akumulasi_telat_aktif')?.value;
        if (akt !== undefined && akt !== null && akt !== '') {
          aktifTelat = String(akt) !== 'false';
        }
        const bj = cfgRows.find((r: any) => r.key === 'batas_jam_penalti_telat')?.value;
        if (Number(bj) > 0) batasJamTelat = Number(bj);

        const ph = cfgRows.find((r: any) => r.key === 'jumlah_hari_penalti_telat')?.value;
        if (Number(ph) > 0) penaltiHariTelat = Math.floor(Number(ph));
      }

      setTelatConfig({ aktif: aktifTelat, batasJam: batasJamTelat, penaltiHari: penaltiHariTelat });

      if (hariSekolah === 5 && hariIni === 'Sabtu') {
        isLibur = true;
        keteranganLibur = 'Hari Sabtu (Libur 5 Hari Kerja)';
      }

      if (!isLibur) {
        let calQuery = supabase.from('kalender_pendidikan').select('*').eq('tanggal', todayStr);
        if (user?.sekolah_id) {
          calQuery = calQuery.or(`sekolah_id.eq.${user.sekolah_id},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000`);
        }
        const { data: cal } = await calQuery;
        if (cal && cal.length > 0) {
          const relevant = cal.filter((c: any) =>
            !c.sekolah_id || !user?.sekolah_id || c.sekolah_id === user.sekolah_id || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
          );
          const liburItem = relevant.find((c: any) => c.tipe === 'Libur');
          if (liburItem) {
            isLibur = true;
            keteranganLibur = liburItem.keterangan || 'Hari Libur Kalender Pendidikan';
          }
        }
      }

      // 2. Fetch Presensi TU from presensi_guru
      let presensiQuery = supabase
        .from('presensi_guru')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (user?.sekolah_id) {
        presensiQuery = presensiQuery.eq('sekolah_id', user.sekolah_id);
      }

      if (user?.id) {
        presensiQuery = presensiQuery.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanName}%"`);
      } else {
        presensiQuery = presensiQuery.ilike('nama_guru', `%${cleanName}%`);
      }

      const { data: presensiList } = await presensiQuery;

      // Extract today's records
      const todayPresensi = (presensiList || []).filter((p: any) => {
        const ts = p.timestamp || '';
        if (extractWitaDateStr(ts) === todayStr) return true;
        if (ts.startsWith(todayStr)) return true;
        const slashMatch = ts.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          const m = slashMatch[1].padStart(2, '0');
          const d = slashMatch[2].padStart(2, '0');
          const y = slashMatch[3];
          if (`${y}-${m}-${d}` === todayStr) return true;
        }
        if (ts.includes('T') && ts.substring(0, 10) === todayStr) return true;
        return false;
      });

      const acceptedToday = todayPresensi.filter((p: any) => p.status_verifikasi !== 'Ditolak');
      const rejectedToday = todayPresensi.filter((p: any) => p.status_verifikasi === 'Ditolak');

      const presensiDatang = acceptedToday.find((p: any) => p.tipe_absen === 'Datang') || null;
      const presensiPulang = acceptedToday.find((p: any) => p.tipe_absen === 'Pulang') || null;
      const presensiDatangDitolak = rejectedToday.find((p: any) => p.tipe_absen === 'Datang') || null;
      const presensiPulangDitolak = rejectedToday.find((p: any) => p.tipe_absen === 'Pulang') || null;

      // Multi-day leave check
      const multiDayLeave = (presensiList || []).find((p: any) => {
        if (p.status_verifikasi === 'Ditolak') return false;
        const isLeave = (p.jenis_presensi === 'Izin' || p.jenis_presensi === 'Sakit' || p.detail_izin === 'Sakit' || (Boolean(p.detail_izin) && p.detail_izin.includes('Izin')));
        if (!isLeave) return false;
        if (p.tanggal_mulai && p.tanggal_selesai) {
          return todayStr >= p.tanggal_mulai && todayStr <= p.tanggal_selesai;
        }
        const match = p.detail_izin?.match(/(\d{4}-\d{2}-\d{2})\s*s\/d\s*(\d{4}-\d{2}-\d{2})/);
        if (match) {
          return todayStr >= match[1] && todayStr <= match[2];
        }
        return false;
      });

      const effectivePresensiDatang = presensiDatang || multiDayLeave || null;
      const jp = effectivePresensiDatang?.jenis_presensi || '';
      const isIzinSakit = jp === 'Izin' || jp === 'Sakit' || Boolean(multiDayLeave);
      const isDinasLuar = jp === 'Dinas Luar';
      const isAlpa = jp === 'Alpa' || effectivePresensiDatang?.status_verifikasi === 'Alpa';

      // 3. Fetch Jurnal Kegiatan from jurnal_pembelajaran
      let jurnalQuery = supabase
        .from('jurnal_pembelajaran')
        .select('*')
        .eq('tanggal', todayStr);

      if (user?.sekolah_id) {
        jurnalQuery = jurnalQuery.eq('sekolah_id', user.sekolah_id);
      }

      if (user?.id) {
        jurnalQuery = jurnalQuery.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanName}%"`);
      } else {
        jurnalQuery = jurnalQuery.ilike('nama_guru', `%${cleanName}%`);
      }

      const { data: jurnalTodayList } = await jurnalQuery;

      const acceptedJurnal = (jurnalTodayList || []).filter((j: any) => j.status_verifikasi !== 'Ditolak');
      const rejectedJurnal = (jurnalTodayList || []).filter((j: any) => j.status_verifikasi === 'Ditolak');

      // TU logs Jurnal Kegiatan (keterangan === 'Jurnal Kegiatan' or mapel === 'Jurnal Kegiatan', or any valid journal by this TU user)
      const jurnalKegiatan = acceptedJurnal.find((j: any) =>
        j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan'
      ) || acceptedJurnal[0] || null;

      // 3.5 Check Piket duty today (penugasan_piket and jadwal_piket fallback)
      let isPiket = false;
      let laporanPiket: any = null;
      let laporanPiketDitolak: any = null;

      try {
        let penugasanQuery = supabase
          .from('penugasan_piket')
          .select('*')
          .eq('hari', hariIni);
        if (user?.sekolah_id) {
          penugasanQuery = penugasanQuery.eq('sekolah_id', user.sekolah_id);
        }
        const { data: penugasanList } = await penugasanQuery;

        const cleanStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
        const uClean = cleanStr(cleanName);

        const isTuPiketMatch = (p: any): boolean => {
          if (p.guru_id && user?.id && String(p.guru_id) === String(user.id)) return true;
          if (p.guru_nip && user?.username && String(p.guru_nip).trim() === String(user.username).trim()) return true;
          const pName = cleanStr(p.guru_nama);
          if (!pName || !uClean) return false;
          if (pName === uClean) return true;
          if ((uClean.length >= 3 && pName.includes(uClean)) || (pName.length >= 3 && uClean.includes(pName))) return true;
          const t1 = pName.split(/\s+/).filter(w => w.length > 2);
          const t2 = uClean.split(/\s+/).filter(w => w.length > 2);
          if (t1.length > 0 && t2.length > 0 && t1[0] === t2[0]) return true;
          return false;
        };

        if (penugasanList && penugasanList.length > 0) {
          isPiket = penugasanList.some(isTuPiketMatch);
        }

        // Fallback: jadwal_piket
        if (!isPiket) {
          let jpQuery = supabase.from('jadwal_piket').select('*').eq('hari', hariIni);
          if (user?.sekolah_id) jpQuery = jpQuery.eq('sekolah_id', user.sekolah_id);
          const { data: jpiket } = await jpQuery;
          if (jpiket && jpiket.length > 0) {
            const piketHariIni = jpiket[0];
            if (piketHariIni.daftar_guru) {
              const daftarArr = piketHariIni.daftar_guru.split(',').map((n: string) => n.trim().toLowerCase());
              isPiket = daftarArr.some((n: string) => n === cleanName || cleanName.includes(n) || n.includes(cleanName));
            }
          }
        }

        // If assigned piket, fetch laporan_piket
        if (isPiket) {
          let lpQuery = supabase
            .from('laporan_piket')
            .select('*')
            .eq('tanggal', todayStr);
          if (user?.sekolah_id) lpQuery = lpQuery.eq('sekolah_id', user.sekolah_id);
          if (user?.id) {
            lpQuery = lpQuery.or(`guru_id.eq.${user.id},guru_pelapor.ilike."%${cleanName}%"`);
          } else {
            lpQuery = lpQuery.ilike('guru_pelapor', `%${cleanName}%`);
          }
          const { data: lpList } = await lpQuery;
          if (lpList && lpList.length > 0) {
            laporanPiketDitolak = lpList.find((lp: any) => lp.status_verifikasi === 'Ditolak') || null;
            laporanPiket = lpList.find((lp: any) => lp.status_verifikasi !== 'Ditolak') || null;
          }
        }
      } catch (piketErr) {
        console.warn('[HomeViewTU] Error checking piket duty:', piketErr);
      }

      // Determine canPresensiPulang: requires Datang, Jurnal Kegiatan, and (if on duty) Laporan Piket
      const isPiketDone = !isPiket || (Boolean(laporanPiket) && !laporanPiketDitolak);
      const canPresensiPulang = Boolean(effectivePresensiDatang) && !isIzinSakit && !isAlpa && !isLibur && Boolean(jurnalKegiatan) && isPiketDone;

      setDailyState({
        tanggal: todayStr,
        isLibur,
        keteranganLibur,
        presensiDatang: effectivePresensiDatang,
        presensiPulang,
        presensiDatangDitolak,
        presensiPulangDitolak,
        jurnalKegiatan,
        jurnalDitolak: rejectedJurnal,
        isPiket,
        laporanPiket,
        laporanPiketDitolak,
        isIzinSakit,
        isDinasLuar,
        isAlpa,
        canPresensiPulang,
      });

      // 4. Compute Monthly Attendance Stats & Accumulated Tardiness
      let h = 0;
      let dl = 0;
      let iz = 0;
      let sk = 0;
      let al = 0;
      let totalDetik = 0;

      (presensiList || []).forEach((p: any) => {
        if (!matchWitaMonth(p.timestamp, selectedMonth)) return;
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

      const batasDetik = Math.round(batasJamTelat * 3600);
      const alpaPenalti = aktifTelat && batasDetik > 0
        ? Math.floor(totalDetik / batasDetik) * penaltiHariTelat
        : 0;

      setAkumulasiTelat({ detik: totalDetik, alpa: alpaPenalti });

      // 5. Fetch Monthly Jurnal Count for TU
      let monthlyJurnalQ = supabase
        .from('jurnal_pembelajaran')
        .select('id, tanggal, keterangan, mapel, status_verifikasi')
        .gte('tanggal', `${selectedMonth}-01`)
        .lte('tanggal', `${selectedMonth}-31`);

      if (user?.sekolah_id) {
        monthlyJurnalQ = monthlyJurnalQ.eq('sekolah_id', user.sekolah_id);
      }
      if (user?.id) {
        monthlyJurnalQ = monthlyJurnalQ.or(`user_id.eq.${user.id},nama_guru.ilike."%${cleanName}%"`);
      } else {
        monthlyJurnalQ = monthlyJurnalQ.ilike('nama_guru', `%${cleanName}%`);
      }

      const { data: monthlyJurnalRows } = await monthlyJurnalQ;
      const validMonthlyJurnal = (monthlyJurnalRows || []).filter((j: any) => j.status_verifikasi !== 'Ditolak');
      setMonthlyJurnalCount(validMonthlyJurnal.length);

    } catch (err) {
      console.error('Failed to load Tata Usaha dashboard data:', err);
    } finally {
      setLoadingState(false);
    }
  }, [user?.nama, user?.id, user?.sekolah_id, selectedMonth, hariIni]);

  // Initial and reactive sync
  useEffect(() => {
    loadTuData();
  }, [loadTuData, configSyncTick]);

  // Realtime subscription & storage event listeners
  useEffect(() => {
    if (!user?.nama) return;

    const channelName = `realtime-tu-state-${user?.id || user?.nama || 'anon'}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presensi_guru' }, () => {
        loadTuData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jurnal_pembelajaran' }, () => {
        loadTuData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan' }, () => {
        loadTuData();
      })
      .subscribe();

    const handleWindowConfigSync = (e?: any) => {
      if (e?.detail?.config?.kop_sekolah) {
        setSchoolName(e.detail.config.kop_sekolah);
      }
      loadTuData();
    };

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'sipjam_config_sync') {
        loadTuData();
      }
    };

    let lastResumeSync = 0;
    const handleResumeOrOnline = () => {
      const now = Date.now();
      if (now - lastResumeSync > 1500) {
        lastResumeSync = now;
        loadTuData();
      }
    };

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        handleResumeOrOnline();
      }
    };

    window.addEventListener('sipjam:config_updated', handleWindowConfigSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleResumeOrOnline);
    window.addEventListener('online', handleResumeOrOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      try {
        (supabase as any).realtime?._remove?.(channel);
        channel.unsubscribe();
      } catch (_) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('sipjam:config_updated', handleWindowConfigSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleResumeOrOnline);
      window.removeEventListener('online', handleResumeOrOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.nama, user?.id, loadTuData]);

  // Build Workflow Steps for Tata Usaha
  const getWorkflowSteps = () => {
    if (!dailyState) return [];
    const steps: { label: string; status: 'done' | 'active' | 'locked' | 'skipped'; detail: string; icon: string; targetView?: string }[] = [];

    // Step 1: Presensi Datang
    if (dailyState.isLibur) {
      steps.push({
        label: 'Hari Libur',
        status: 'skipped',
        detail: dailyState.keteranganLibur || 'Libur Resmi',
        icon: 'fa-calendar-xmark'
      });
      return steps;
    }

    if (dailyState.presensiDatangDitolak) {
      steps.push({
        label: 'Presensi Datang',
        status: 'active',
        detail: '⚠️ Ditolak Admin — Silakan isi ulang',
        icon: 'fa-right-to-bracket',
        targetView: 'view-guru-presensi'
      });
      return steps;
    } else if (dailyState.presensiDatang) {
      const jp = dailyState.presensiDatang.jenis_presensi;
      const ts = dailyState.presensiDatang.timestamp || '';
      const timeOnly = formatPresensiTime(ts) || (ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : '');
      if (jp === 'Alpa' || dailyState.isAlpa) {
        steps.push({
          label: 'Presensi Datang',
          status: 'skipped',
          detail: 'Tercatat Alpa (Tidak Melakukan Presensi)',
          icon: 'fa-user-xmark'
        });
        return steps;
      }
      steps.push({
        label: 'Presensi Datang',
        status: 'done',
        detail: `${jp} · ${timeOnly} WITA`,
        icon: 'fa-right-to-bracket'
      });
    } else {
      steps.push({
        label: 'Presensi Datang',
        status: 'active',
        detail: 'Belum presensi hari ini',
        icon: 'fa-right-to-bracket',
        targetView: 'view-guru-presensi'
      });
      return steps;
    }

    if (dailyState.isIzinSakit) {
      const statusLabel = dailyState.presensiDatang?.detail_izin || dailyState.presensiDatang?.jenis_presensi || 'Izin/Sakit';
      steps.push({
        label: 'Izin/Sakit',
        status: 'skipped',
        detail: `Status: ${statusLabel}`,
        icon: 'fa-bed'
      });
      return steps;
    }

    // Step 2: Laporan Piket (jika ditugaskan piket hari ini)
    if (dailyState.isPiket) {
      if (dailyState.laporanPiketDitolak) {
        steps.push({
          label: 'Laporan Piket',
          status: 'active',
          detail: '⚠️ Ditolak Admin — Silakan isi ulang',
          icon: 'fa-shield-halved',
          targetView: 'view-guru-piket'
        });
      } else if (dailyState.laporanPiket) {
        steps.push({
          label: 'Laporan Piket',
          status: 'done',
          detail: 'Laporan piket selesai dilaporkan',
          icon: 'fa-shield-halved'
        });
      } else {
        steps.push({
          label: 'Laporan Piket',
          status: 'active',
          detail: 'Belum mengisi laporan piket hari ini',
          icon: 'fa-shield-halved',
          targetView: 'view-guru-piket'
        });
      }
    }

    // Step 3: Jurnal Kegiatan TU
    const hasJurnalDitolak = (dailyState.jurnalDitolak?.length ?? 0) > 0;
    if (hasJurnalDitolak) {
      steps.push({
        label: 'Jurnal Kegiatan',
        status: 'active',
        detail: `⚠️ Ditolak Admin — Silakan isi ulang (${dailyState.jurnalDitolak.length} entri)`,
        icon: 'fa-book-journal-whills',
        targetView: 'view-guru-jurnal'
      });
    } else if (dailyState.jurnalKegiatan) {
      const judul = dailyState.jurnalKegiatan.materi || dailyState.jurnalKegiatan.kegiatan || 'Jurnal Kegiatan Selesai';
      steps.push({
        label: 'Jurnal Kegiatan',
        status: 'done',
        detail: `Selesai diisi: ${judul}`,
        icon: 'fa-book-journal-whills'
      });
    } else {
      const isWaitingPiket = dailyState.isPiket && !dailyState.laporanPiket;
      steps.push({
        label: 'Jurnal Kegiatan',
        status: isWaitingPiket ? 'locked' : 'active',
        detail: isWaitingPiket ? 'Selesaikan laporan piket dahulu' : 'Belum mengisi jurnal kegiatan administrasi hari ini',
        icon: 'fa-book-journal-whills',
        targetView: isWaitingPiket ? undefined : 'view-guru-jurnal'
      });
    }

    // Step 4: Presensi Pulang
    if (dailyState.presensiPulangDitolak) {
      steps.push({
        label: 'Presensi Pulang',
        status: 'active',
        detail: '⚠️ Ditolak Admin — Silakan isi ulang',
        icon: 'fa-right-from-bracket',
        targetView: 'view-guru-presensi'
      });
    } else if (dailyState.presensiPulang) {
      const ts = dailyState.presensiPulang.timestamp || '';
      const timeOnly = formatPresensiTime(ts) || (ts.includes(' ') ? ts.split(' ')[1]?.substring(0, 5) : (ts.includes('T') ? ts.split('T')[1]?.substring(0, 5) : ''));
      const isPulangCepat = dailyState.presensiPulang.status_verifikasi === 'Pulang Cepat' || dailyState.presensiPulang.jenis_presensi === 'Pulang Cepat';
      const isAuto = dailyState.presensiPulang.is_auto_checkout || dailyState.presensiPulang.status_verifikasi === 'Lupa Checkout';
      if (isPulangCepat) {
        steps.push({
          label: 'Presensi Pulang',
          status: 'active',
          detail: `⚠️ Pulang Cepat · ${timeOnly} WITA`,
          icon: 'fa-person-walking-dashed-line-arrow-right',
          targetView: 'view-guru-presensi'
        });
      } else {
        steps.push({
          label: 'Presensi Pulang',
          status: 'done',
          detail: isAuto ? `Lupa Checkout · ${timeOnly} WITA` : `Pulang · ${timeOnly} WITA`,
          icon: isAuto ? 'fa-clock-rotate-left' : 'fa-right-from-bracket'
        });
      }
    } else if (dailyState.canPresensiPulang) {
      steps.push({
        label: 'Presensi Pulang',
        status: 'active',
        detail: 'Tugas administrasi dan piket selesai, silakan absen pulang',
        icon: 'fa-right-from-bracket',
        targetView: 'view-guru-presensi'
      });
    } else {
      const missingParts: string[] = [];
      if (dailyState.isPiket && !dailyState.laporanPiket) missingParts.push('laporan piket');
      if (!dailyState.jurnalKegiatan) missingParts.push('jurnal kegiatan');
      steps.push({
        label: 'Presensi Pulang',
        status: 'locked',
        detail: `Selesaikan ${missingParts.join(' dan ') || 'tugas harian'} terlebih dahulu`,
        icon: 'fa-right-from-bracket'
      });
    }

    return steps;
  };

  const steps = getWorkflowSteps();

  const getNextAction = () => {
    if (!dailyState) return null;
    if (dailyState.isLibur) {
      return { text: `Hari ini libur: ${dailyState.keteranganLibur || 'Tidak ada jam kerja'}`, color: 'text-blue-600 dark:text-blue-400' };
    }
    if (dailyState.isIzinSakit) {
      return { text: `Anda sedang ${dailyState.presensiDatang?.detail_izin || dailyState.presensiDatang?.jenis_presensi || 'Izin/Sakit'}. Tidak perlu mengisi tugas presensi/jurnal.`, color: 'text-blue-600 dark:text-blue-400' };
    }
    if (dailyState.isAlpa && dailyState.presensiDatang) {
      return { text: '⚠️ Anda tercatat Alpa hari ini (tidak melakukan presensi datang).', color: 'text-red-600 dark:text-red-400' };
    }
    if (dailyState.presensiDatangDitolak) {
      return { text: '⚠️ Presensi Datang Anda ditolak admin. Silakan kirim ulang di menu Presensi TU.', color: 'text-red-600 dark:text-red-400' };
    }
    if (!dailyState.presensiDatang) {
      return { text: 'Silakan lakukan Presensi Datang terlebih dahulu.', color: 'text-amber-600 dark:text-amber-400' };
    }
    if (dailyState.isPiket && dailyState.laporanPiketDitolak) {
      return { text: '⚠️ Laporan Piket Anda ditolak admin. Silakan periksa di menu Piket.', color: 'text-red-600 dark:text-red-400' };
    }
    if (dailyState.isPiket && !dailyState.laporanPiket) {
      return { text: 'Presensi datang berhasil. Anda memiliki tugas piket hari ini, silakan isi Laporan Piket.', color: 'text-amber-600 dark:text-amber-400' };
    }
    if ((dailyState.jurnalDitolak?.length ?? 0) > 0) {
      return { text: `⚠️ ${dailyState.jurnalDitolak.length} entri Jurnal Kegiatan ditolak admin. Silakan periksa di menu Jurnal Kegiatan.`, color: 'text-red-600 dark:text-red-400' };
    }
    if (dailyState.presensiPulangDitolak) {
      return { text: '⚠️ Presensi Pulang Anda ditolak admin. Silakan kirim ulang di menu Presensi TU.', color: 'text-red-600 dark:text-red-400' };
    }
    if (dailyState.presensiPulang && (dailyState.presensiPulang.status_verifikasi === 'Pulang Cepat' || dailyState.presensiPulang.jenis_presensi === 'Pulang Cepat')) {
      return { text: '⚠️ Anda tercatat Pulang Cepat hari ini karena tidak melakukan presensi pulang.', color: 'text-orange-600 dark:text-orange-400' };
    }
    if (!dailyState.jurnalKegiatan) {
      return { text: 'Presensi datang berhasil. Silakan isi Jurnal Kegiatan administrasi hari ini.', color: 'text-amber-600 dark:text-amber-400' };
    }
    if (dailyState.canPresensiPulang && !dailyState.presensiPulang) {
      return { text: 'Jurnal kegiatan dan piket telah lengkap! Silakan lakukan Presensi Pulang sebelum meninggalkan sekolah.', color: 'text-green-600 dark:text-green-400' };
    }
    if (dailyState.presensiPulang) {
      return { text: 'Seluruh tugas administrasi dan presensi hari ini telah selesai. Terima kasih atas dedikasi Anda!', color: 'text-green-600 dark:text-green-400' };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <section id="view-home" className="fade-in block space-y-4">
      {/* Header Banner - Matching Guru Design with Gold Accents */}
      <div className="clay-card bg-gradient-to-br from-[#0B4619] via-[#0F5A22] to-[#17732D] rounded-3xl p-4 sm:p-5 text-white relative overflow-hidden border-2 border-white/30 shadow-[8px_8px_20px_rgba(11,70,25,0.3),-4px_-4px_12px_rgba(255,255,255,0.9),inset_2px_2px_4px_rgba(255,255,255,0.35),inset_-2px_-2px_4px_rgba(0,0,0,0.25)]">
        <i className="fa-solid fa-mosque absolute -right-4 -bottom-4 text-7xl text-white opacity-5 rotate-[-15deg] pointer-events-none"></i>
        
        <div className="relative z-10 flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shrink-0 overflow-hidden">
              {renderUserAvatar(user?.avatar, 'w-10 h-10 sm:w-11 sm:h-11')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base leading-tight truncate">{user?.nama || 'Staf Tata Usaha'}</h2>
                <span className="bg-nizamudin-gold/90 text-green-900 px-2 py-0.5 rounded-full font-bold text-[8px] sm:text-[9px] uppercase shadow-sm shrink-0">
                  Tata Usaha
                </span>
              </div>
              <p className="text-[10px] text-green-100/80 font-mono mt-0.5 tracking-wider truncate flex items-center gap-1.5">
                <span>{user?.username || ''}</span>
                <span className="truncate font-sans font-medium">{schoolName}</span>
              </p>
            </div>
          </div>

          {onOpenAccountSettings && (
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/20 flex items-center gap-1.5 transition ml-auto shrink-0 shadow-sm cursor-pointer"
              title="Ubah Username & Password"
            >
              <i className="fa-solid fa-gear text-xs"></i>
              <span className="hidden sm:inline">Edit Akun</span>
            </button>
          )}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/10">
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Status</p>
            <p className="text-[10px] sm:text-xs font-bold text-white truncate">Aktif</p>
          </div>
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Tanggal</p>
            <p className="text-[10px] sm:text-xs font-bold text-white leading-tight break-words whitespace-normal">{dashboardDateStr}</p>
          </div>
          <div className="bg-white/10 px-2 py-1.5 rounded-lg backdrop-blur-sm">
            <p className="text-[8px] sm:text-[9px] text-green-200/80 uppercase font-bold tracking-wider mb-0.5">Jam</p>
            <p className="text-xs sm:text-sm font-black text-nizamudin-gold font-mono tracking-tight leading-none pt-0.5">{timeStr}</p>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards for TU */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-2">
        <div className="clay-card clay-card-mint p-2.5 rounded-2xl border-2 border-white/90 dark:border-emerald-900/40 flex flex-col items-center text-center shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Presensi TU</span>
          <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
            {attendanceStats.hadir} <span className="text-[10px] sm:text-xs text-emerald-500 dark:text-emerald-600 font-bold">Hari</span>
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Kehadiran Bulan Ini</span>
        </div>
        <div className="clay-card clay-card-blue p-2.5 rounded-2xl border-2 border-white/90 dark:border-indigo-900/40 flex flex-col items-center text-center shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wide">Jurnal Kegiatan</span>
          <span className="text-base sm:text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
            {monthlyJurnalCount} <span className="text-[10px] sm:text-xs text-indigo-500 dark:text-indigo-600 font-bold">Laporan</span>
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Agenda Administrasi</span>
        </div>
        <div className="clay-card clay-card-purple p-2.5 rounded-2xl border-2 border-white/90 dark:border-teal-900/40 flex flex-col items-center text-center shadow-sm">
          <span className="text-[9px] sm:text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide">Status Kerja</span>
          <span className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-300 mt-0.5">
            {attendanceStats.alpa === 0 ? 'Tertib' : `${attendanceStats.alpa} Alpa`}
          </span>
          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Disiplin Tenaga TU</span>
        </div>
      </div>

      {/* Section 1: Personal Attendance Stat Cards (H, DL, Izin, Sakit, Alpa) */}
      <div className="clay-card p-4 sm:p-5 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-emerald-600 dark:text-emerald-400"></i> Statistik Presensi Pribadi
          </h3>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-[8px] sm:text-[11px] font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 sm:px-2.5 py-1 rounded-full outline-none border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0 w-auto min-w-[100px] max-w-[140px]"
            title="Pilih Bulan"
          />
        </div>

        {/* 5 Personal Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          {/* Hadir (H) */}
          <div className="clay-card-mint p-3 rounded-2xl border-2 border-white/90 dark:border-emerald-800/50 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-user-check"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Hadir (H)</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.hadir}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Kehadiran kantor</p>
            </div>
          </div>

          {/* Dinas Luar (DL) */}
          <div className="clay-card-purple p-3 rounded-2xl border-2 border-white/90 dark:border-indigo-800/50 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-briefcase"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Dinas Luar (DL)</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.dinasLuar}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Tugas kedinasan</p>
            </div>
          </div>

          {/* Izin (I) */}
          <div className="clay-card-blue p-3 rounded-2xl border-2 border-white/90 dark:border-sky-800/50 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-envelope-open-text"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-sky-800 dark:text-sky-300 uppercase tracking-wider">Izin (I)</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.izin}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Izin resmi</p>
            </div>
          </div>

          {/* Sakit (S) */}
          <div className="clay-card-rose p-3 rounded-2xl border-2 border-white/90 dark:border-rose-800/50 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-heart-pulse"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Sakit (S)</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.sakit}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Dengan surat</p>
            </div>
          </div>

          {/* Alpa (A) */}
          <div className="clay-card-rose p-3 rounded-2xl border-2 border-white/90 dark:border-red-800/50 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center justify-center text-lg shrink-0">
              <i className="fa-solid fa-user-xmark"></i>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">Alpa (A)</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">{attendanceStats.alpa}</p>
              <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Tanpa keterangan</p>
            </div>
          </div>
        </div>

        {/* Akumulasi Keterlambatan Info */}
        <div className="mt-3 clay-inset rounded-2xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-white">
              <i className="fa-solid fa-stopwatch text-sm"></i>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-600 dark:text-white">
                Akumulasi Keterlambatan Bulan Ini{' '}
                <span className="font-normal text-slate-500 dark:text-slate-300">
                  ({telatConfig.aktif ? `Penalti: ${telatConfig.batasJam} Jam = ${telatConfig.penaltiHari} Hari Alpa` : 'Penalti Alpa Nonaktif'})
                </span>
              </p>
              <p className="text-xs font-black text-gray-900 dark:text-white">
                {Math.floor(akumulasiTelat.detik / 3600)} Jam {Math.floor((akumulasiTelat.detik % 3600) / 60)} Menit {akumulasiTelat.detik % 60} Detik
              </p>
            </div>
          </div>
          {akumulasiTelat.alpa > 0 && (
            <div className="text-right">
              <p className="text-[9px] font-bold text-red-500 uppercase">Potongan Alpa</p>
              <p className="text-sm font-black text-red-600">{akumulasiTelat.alpa} Hari</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Status Tugas Hari Ini (Workflow Status Tracker) */}
      <div className="clay-card p-4 sm:p-5 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <i className="fa-solid fa-list-check text-emerald-500"></i> Status Tugas Hari Ini
        </h3>

        {loadingState ? (
          <div className="flex items-center justify-center py-6 text-gray-500 dark:text-white">
            <i className="fa-solid fa-circle-notch fa-spin text-lg mr-2"></i>
            <span className="text-xs">Memeriksa status tugas administrasi...</span>
          </div>
        ) : steps.length === 0 ? (
          <div className="text-center py-4 text-gray-500 dark:text-white text-xs italic">
            Tidak ada data status hari ini.
          </div>
        ) : (
          <div className="space-y-1">
            {steps.map((step, idx) => {
              const isClickable = step.status === 'active' && Boolean(step.targetView);

              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 relative rounded-xl p-2 transition-all ${
                    isClickable 
                      ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99] border-2 border-amber-300/80 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/30 shadow-[4px_4px_10px_rgba(230,200,160,0.35),inset_1px_1px_2px_rgba(255,255,255,0.9)] rounded-2xl' 
                      : 'border border-transparent'
                  }`}
                  onClick={() => {
                    if (isClickable && step.targetView) {
                      setView(step.targetView);
                    }
                  }}
                >
                  {idx < steps.length - 1 && (
                    <div className={`absolute left-[19px] top-[34px] w-0.5 h-[calc(100%-8px)] ${
                      step.status === 'done' ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                  
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs z-10 mt-0.5 ${
                    step.status === 'done' ? 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' :
                    step.status === 'active' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 ring-2 ring-amber-300 dark:ring-amber-700' :
                    step.status === 'skipped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                    'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {step.status === 'done' ? <i className="fa-solid fa-check" /> :
                     step.status === 'active' ? <i className={`fa-solid ${step.icon}`} /> :
                     step.status === 'skipped' ? <i className="fa-solid fa-minus" /> :
                     <i className="fa-solid fa-lock text-[9px]" />}
                  </div>

                  <div className="flex-grow min-w-0 pb-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[11px] font-bold ${
                        step.status === 'done' ? 'text-green-700 dark:text-green-400' :
                        step.status === 'active' ? 'text-amber-800 dark:text-amber-300' :
                        step.status === 'skipped' ? 'text-blue-600 dark:text-blue-400' :
                        'text-gray-500 dark:text-white'
                      }`}>
                        {step.label}
                      </p>

                      {isClickable && step.targetView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setView(step.targetView!);
                          }}
                          className="btn-click text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-200/70 hover:bg-amber-300 dark:bg-amber-900/60 dark:hover:bg-amber-800 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1 shrink-0 shadow-sm transition"
                        >
                          Buka <i className="fa-solid fa-arrow-right text-[8px]"></i>
                        </button>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${
                      step.status === 'done' ? 'text-green-600 dark:text-green-400' :
                      step.status === 'active' ? 'text-amber-700 dark:text-amber-300' :
                      step.status === 'skipped' ? 'text-blue-500 dark:text-blue-400' :
                      'text-gray-500 dark:text-white'
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
          <div className={`mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2 ${nextAction.color}`}>
            <i className="fa-solid fa-circle-info text-xs mt-0.5 shrink-0"></i>
            <p className="text-[11px] font-semibold leading-snug">{nextAction.text}</p>
          </div>
        )}
      </div>

      {/* Section 3: Aktivitas & Layanan Administrasi Tata Usaha */}
      <div className="clay-card p-4 sm:p-5 rounded-3xl border-2 border-white/90 dark:border-gray-700/80 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shadow-sm">
              <i className="fa-solid fa-briefcase"></i>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-none">
                Layanan & Aktivitas Administrasi Hari Ini
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {dashboardDateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {dailyState?.jurnalKegiatan ? (
              <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <i className="fa-solid fa-circle-check text-[9px]"></i> Jurnal Terisi
              </span>
            ) : (
              <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <i className="fa-solid fa-clock text-[9px]"></i> Menunggu Pengisian
              </span>
            )}
          </div>
        </div>

        {/* Today's Jurnal Kegiatan Status Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm shrink-0 mt-0.5">
                <i className="fa-solid fa-book-journal-whills"></i>
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  Jurnal Kegiatan Administrasi
                </h4>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                  {dailyState?.jurnalKegiatan
                    ? `Sudah dicatat: "${dailyState.jurnalKegiatan.materi || dailyState.jurnalKegiatan.kegiatan || 'Aktivitas administrasi harian'}"`
                    : 'Dokumentasikan pekerjaan administrasi, persuratan, verifikasi data, atau layanan sekolah hari ini.'}
                </p>
                {dailyState?.jurnalKegiatan?.jam_ke && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                    <i className="fa-solid fa-clock mr-1"></i> Jam: {dailyState.jurnalKegiatan.jam_ke}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {dailyState?.jurnalKegiatan ? (
                <button
                  type="button"
                  onClick={() => setView('view-guru-jurnal')}
                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <i className="fa-solid fa-eye"></i> Tinjau Jurnal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setView('view-guru-jurnal')}
                  className="btn-click bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <i className="fa-solid fa-pen-to-square"></i> Isi Jurnal Sekarang
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Access to Tata Usaha Operational Modules */}
        <h4 className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <i className="fa-solid fa-shapes text-emerald-600 text-[10px]"></i> Modul Operasional Tata Usaha
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* Module 1: Presensi TU */}
          <div 
            onClick={() => setView('view-guru-presensi')}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-clock"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Presensi TU</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Datang, pulang & riwayat</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Buka Presensi <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>

          {/* Module 2: Jurnal Kegiatan */}
          <div 
            onClick={() => setView('view-guru-jurnal')}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-book-open"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Jurnal Kegiatan</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Laporan aktivitas TU</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Buka Jurnal <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>

          {/* Module 3: Asesmen */}
          <div 
            onClick={() => setView('view-gradebook')}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Asesmen</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Rekap nilai & CP (Tinjau)</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Tinjau Nilai <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>

          {/* Module 4: Rapor Siswa */}
          <div 
            onClick={() => setView('view-rapor')}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-sky-400 dark:hover:border-sky-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-file-lines"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Rapor Siswa</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Cetak & kelengkapan rapor</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-sky-600 dark:text-sky-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Buka Rapor <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>

          {/* Module 5: Informasi Sekolah */}
          <div 
            onClick={() => setView('view-informasi')}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-bullhorn"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Informasi Sekolah</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Siaran & pengumuman</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Buka Info <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>

          {/* Module 6: Pengaturan Akun */}
          <div 
            onClick={() => {
              if (onOpenAccountSettings) onOpenAccountSettings();
              else setView('view-pengaturan-akun');
            }}
            className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-sm cursor-pointer transition flex flex-col justify-between gap-2"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-sm shrink-0">
                <i className="fa-solid fa-user-gear"></i>
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">Pengaturan Akun</h5>
                <p className="text-[9px] text-gray-500 dark:text-gray-400 truncate">Profil & kata sandi</p>
              </div>
            </div>
            <div className="text-[9px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-end gap-1 pt-1 border-t border-gray-100 dark:border-gray-700/60">
              Kelola Akun <i className="fa-solid fa-arrow-right text-[7px]"></i>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
