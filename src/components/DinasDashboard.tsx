'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { masterSupabase } from '@/lib/supabaseClient';
import type { SatelliteSchool } from '@/lib/supabaseClient';
import type { AppUser } from '@/types/user';
import ClayCard from './ClayCard';
import ClayButton from './ClayButton';
import { getWitaDateStr, getWitaDateLong, getWitaStartOfDay, getWitaEndOfDay } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';

export interface DinasDashboardProps {
  user: AppUser;
  onSelectSchool?: (school: SatelliteSchool) => void;
  onSelectTargetSchool?: (school: SatelliteSchool) => void;
  satelliteSchools?: SatelliteSchool[];
  schools?: SatelliteSchool[];
  setView?: (viewId: string) => void;
}

export interface SchoolAttendanceMetrics {
  school: SatelliteSchool;
  totalGuru: number;
  hadirGuru: number;
  guruPct: number;
  totalSiswa: number;
  hadirSiswa: number;
  siswaPct: number;
  alpaSiswa: number;
  alpaPct: number;
  jurnalCount: number;
  needsAttention: boolean;
  attentionReason?: string;
  isOnline: boolean;
}

export const DinasDashboard: React.FC<DinasDashboardProps> = ({
  user,
  onSelectSchool,
  onSelectTargetSchool,
  satelliteSchools: propSatelliteSchools,
  schools: propSchools,
  setView: _setView,
}) => {
  const userRegion = useMemo(() => {
    return (user?.kota_kabupaten || '').trim();
  }, [user?.kota_kabupaten]);
  const assignedRegion = userRegion;

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [scopedSchools, setScopedSchools] = useState<SatelliteSchool[]>([]);
  const [schoolMetrics, setSchoolMetrics] = useState<SchoolAttendanceMetrics[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'aktif' | 'perhatian' | 'nonaktif'>('semua');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const handleDrilldown = useCallback((school: SatelliteSchool) => {
    if (onSelectSchool) {
      onSelectSchool(school);
    } else if (onSelectTargetSchool) {
      onSelectTargetSchool(school);
    }
  }, [onSelectSchool, onSelectTargetSchool]);

  const fetchDashboardData = useCallback(async () => {
    if (!assignedRegion) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // 1. Resolve schools in assigned region
      let rawSchools: SatelliteSchool[] = [];

      const providedSchools = propSatelliteSchools || propSchools;
      if (providedSchools && providedSchools.length > 0) {
        rawSchools = providedSchools;
      } else {
        try {
          const { data: regData, error: regErr } = await masterSupabase
            .from('sekolah_registry')
            .select('*')
            .order('nama', { ascending: true });
          if (!regErr && regData && regData.length > 0) {
            rawSchools = regData as SatelliteSchool[];
          }
        } catch (_) {}

        if (rawSchools.length === 0) {
          try {
            const { data: schData } = await masterSupabase
              .from('sekolah')
              .select('*')
              .order('nama', { ascending: true });
            if (schData && schData.length > 0) {
              rawSchools = schData.map((s: any) => ({
                id: s.id,
                nama: s.nama,
                npsn: s.npsn,
                kota_kabupaten: s.kota_kabupaten,
                provinsi: s.provinsi,
                vercel_url: s.vercel_url || s.website || null,
                supabase_url: s.supabase_url || null,
                supabase_anon_key: s.supabase_anon_key || null,
                status: s.status || 'aktif',
              }));
            }
          } catch (_) {}
        }
      }

      // Strict client-side region scoping (Zero leakage to or from other regions)
      const normalizedAssigned = assignedRegion.toLowerCase();
      const regionFilteredSchools = rawSchools.filter((s) => {
        const schRegion = (s.kota_kabupaten || '').trim().toLowerCase();
        return schRegion === normalizedAssigned;
      });

      setScopedSchools(regionFilteredSchools);

      if (regionFilteredSchools.length === 0) {
        setSchoolMetrics([]);
        setLoading(false);
        setRefreshing(false);
        setLastRefreshed(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        return;
      }

      const schoolIds = regionFilteredSchools.map((s) => s.id);
      const todayStr = getWitaDateStr();
      const todayStart = getWitaStartOfDay(todayStr);
      const todayEnd = getWitaEndOfDay(todayStr);

      // 2. Query transactional attendance & school data in parallel across all schools
      const [
        guruRes,
        siswaRes,
        presensiGuruRes,
        presensiSiswaRes,
        absensiRes,
        jurnalRes,
      ] = await Promise.all([
        // Teachers per school
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('data_guru')
              .select('id, nama_guru, sekolah_id')
              .in('sekolah_id', schoolIds);
            return data || [];
          } catch (_) {
            return [];
          }
        })(),

        // Students per school
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('data_siswa')
              .select('id, nama_siswa, nisn, sekolah_id')
              .in('sekolah_id', schoolIds);
            return data || [];
          } catch (_) {
            return [];
          }
        })(),

        // Presensi Guru today (approved or verified)
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('presensi_guru')
              .select('id, nama_guru, sekolah_id, jenis_presensi, status_verifikasi, timestamp')
              .in('sekolah_id', schoolIds)
              .gte('timestamp', todayStart)
              .lte('timestamp', todayEnd)
              .in('status_verifikasi', ['Disetujui', 'Diverifikasi']);
            return data || [];
          } catch (_) {
            return [];
          }
        })(),

        // Presensi Siswa Gate / QR today (status datang)
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('presensi_siswa')
              .select('id, siswa_id, nisn, sekolah_id, status, tanggal')
              .in('sekolah_id', schoolIds)
              .eq('tanggal', todayStr)
              .eq('status', 'datang');
            return data || [];
          } catch (_) {
            return [];
          }
        })(),

        // Absensi Siswa Kelas today (detecting Alpa / Bolos)
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('absensi')
              .select('id, siswa_id, sekolah_id, status, tanggal')
              .in('sekolah_id', schoolIds)
              .eq('tanggal', todayStr);
            return data || [];
          } catch (_) {
            return [];
          }
        })(),

        // Class Journals recorded today
        (async () => {
          try {
            const { data } = await masterSupabase
              .from('jurnal_pembelajaran')
              .select('id, nama_guru, sekolah_id, kelas, mapel, tanggal')
              .in('sekolah_id', schoolIds)
              .eq('tanggal', todayStr);
            return data || [];
          } catch (_) {
            return [];
          }
        })(),
      ]);

      // 3. Aggregate metrics per school
      const computed: SchoolAttendanceMetrics[] = regionFilteredSchools.map((school) => {
        const schoolTeachers = (guruRes as any[]).filter((g) => g.sekolah_id === school.id);
        const schoolStudents = (siswaRes as any[]).filter((s) => s.sekolah_id === school.id);

        const schoolTeacherPresensi = (presensiGuruRes as any[]).filter((p) => p.sekolah_id === school.id);
        const distinctHadirGuru = new Set(
          schoolTeacherPresensi
            .filter((p) => !p.jenis_presensi || ['Sekolah', 'Hadir', 'Dinas Luar', 'Tepat Waktu', 'Terlambat'].includes(p.jenis_presensi))
            .map((p) => (p.nama_guru || '').trim().toLowerCase())
        ).size;

        const schoolStudentPresensi = (presensiSiswaRes as any[]).filter((p) => p.sekolah_id === school.id);
        const distinctHadirSiswa = new Set(
          schoolStudentPresensi.map((p) => p.siswa_id || p.nisn)
        ).size;

        const schoolAbsensi = (absensiRes as any[]).filter((a) => a.sekolah_id === school.id);
        const alpaSiswaCount = schoolAbsensi.filter(
          (a) => a.status === 'Alpa' || a.status === 'Bolos' || a.status === 'A'
        ).length;

        const schoolJurnal = (jurnalRes as any[]).filter((j) => j.sekolah_id === school.id);

        const totalGuru = schoolTeachers.length;
        const totalSiswa = schoolStudents.length;
        const guruPct = totalGuru > 0 ? Math.round((distinctHadirGuru / totalGuru) * 100) : 0;
        const siswaPct = totalSiswa > 0 ? Math.round((distinctHadirSiswa / totalSiswa) * 100) : 0;
        const alpaPct = totalSiswa > 0 ? Math.round((alpaSiswaCount / totalSiswa) * 100) : 0;

        const isOnline = (school.status || 'aktif').toLowerCase() !== 'nonaktif';

        // Attention needed rule:
        // 1. High student absence (> 10%)
        // 2. Low teacher attendance (< 70%) on non-zero teachers
        // 3. School status inactive
        const isNonaktif = (school.status || '').toLowerCase() === 'nonaktif';
        const hasHighAlpa = alpaPct >= 10;
        const hasLowGuru = totalGuru > 0 && guruPct < 70;
        const needsAttention = isNonaktif || hasHighAlpa || hasLowGuru;

        let attentionReason = '';
        if (isNonaktif) {
          attentionReason = 'Sekolah Nonaktif';
        } else if (hasHighAlpa) {
          attentionReason = `Alpa Siswa Tinggi (${alpaPct}%)`;
        } else if (hasLowGuru) {
          attentionReason = `Kehadiran Guru Rendah (${guruPct}%)`;
        }

        return {
          school,
          totalGuru,
          hadirGuru: distinctHadirGuru,
          guruPct,
          totalSiswa,
          hadirSiswa: distinctHadirSiswa,
          siswaPct,
          alpaSiswa: alpaSiswaCount,
          alpaPct,
          jurnalCount: schoolJurnal.length,
          needsAttention,
          attentionReason,
          isOnline,
        };
      });

      setSchoolMetrics(computed);
      setLastRefreshed(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('[DinasDashboard] Error fetching cross-school regional data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignedRegion, propSatelliteSchools]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const handlePrintSummary = async () => {
    await triggerPrintWithGps({
      onErrorAlert: () => {
        window.print();
      },
    });
  };

  // Aggregated Overall Totals
  const aggregates = useMemo(() => {
    const totalSekolah = scopedSchools.length;
    const activeSekolahCount = scopedSchools.filter(
      (s) => (s.status || 'aktif').toLowerCase() !== 'nonaktif'
    ).length;
    const nonActiveSekolahCount = totalSekolah - activeSekolahCount;

    let totalSemuaGuru = 0;
    let totalHadirGuru = 0;
    let totalSemuaSiswa = 0;
    let totalHadirSiswa = 0;
    let totalAlpaSiswa = 0;
    let totalJurnal = 0;
    let onlineSatelitCount = 0;
    let attentionSchoolsCount = 0;

    for (const m of schoolMetrics) {
      totalSemuaGuru += m.totalGuru;
      totalHadirGuru += m.hadirGuru;
      totalSemuaSiswa += m.totalSiswa;
      totalHadirSiswa += m.hadirSiswa;
      totalAlpaSiswa += m.alpaSiswa;
      totalJurnal += m.jurnalCount;
      if (m.isOnline) onlineSatelitCount++;
      if (m.needsAttention) attentionSchoolsCount++;
    }

    const aggregateGuruPct =
      totalSemuaGuru > 0 ? Math.round((totalHadirGuru / totalSemuaGuru) * 100) : 0;
    const aggregateSiswaPct =
      totalSemuaSiswa > 0 ? Math.round((totalHadirSiswa / totalSemuaSiswa) * 100) : 0;

    return {
      totalSekolah,
      activeSekolahCount,
      nonActiveSekolahCount,
      totalSemuaGuru,
      totalHadirGuru,
      aggregateGuruPct,
      totalSemuaSiswa,
      totalHadirSiswa,
      aggregateSiswaPct,
      totalAlpaSiswa,
      totalJurnal,
      onlineSatelitCount,
      attentionSchoolsCount,
    };
  }, [scopedSchools, schoolMetrics]);

  // Filtered List based on Search & Status
  const filteredMetrics = useMemo(() => {
    return schoolMetrics.filter((m) => {
      // 1. Search Query (Nama Sekolah / NPSN)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (m.school.nama || '').toLowerCase().includes(q);
        const matchesNpsn = (m.school.npsn || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNpsn) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'aktif') {
        return m.isOnline;
      }
      if (statusFilter === 'perhatian') {
        return m.needsAttention;
      }
      if (statusFilter === 'nonaktif') {
        return !m.isOnline;
      }

      return true;
    });
  }, [schoolMetrics, searchQuery, statusFilter]);

  const todayLong = useMemo(() => getWitaDateLong(), []);

  // If no region assigned by Superadmin
  if (!assignedRegion) {
    return (
      <div className="w-full max-w-4xl mx-auto py-10 px-4">
        <ClayCard variant="rose" rounded="3xl" className="p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 mx-auto flex items-center justify-center text-2xl shadow-inner">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-rose-950 dark:text-rose-100">
            Wilayah Binaan Belum Ditetapkan
          </h2>
          <p className="text-sm text-rose-800 dark:text-rose-200 max-w-lg mx-auto leading-relaxed">
            Akun <b>Dinas Pendidikan</b> Anda belum memiliki penugasan daerah binaan (<code>kota_kabupaten</code>). 
            Silakan hubungi <b>Superadmin SIPJAM</b> untuk menetapkan daerah binaan pada akun Anda agar dapat memantau sekolah.
          </p>
        </ClayCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP EXECUTIVE HEADER BANNER (SCREEN ONLY)                          */}
      {/* --------------------------------------------------------------------- */}
      <ClayCard variant="default" rounded="3xl" className="p-5 sm:p-6 no-print">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#EDE9FE] text-[#5B21B6] border border-[#C4B5FD] shadow-xs">
                <i className="fa-solid fa-building-columns text-[11px]"></i>
                Dinas Pendidikan
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 shadow-xs">
                <i className="fa-solid fa-map-location-dot text-emerald-600 text-[11px]"></i>
                Wilayah Binaan: <strong>{assignedRegion}</strong>
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Dashboard Eksekutif Pemantauan Wilayah
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium flex items-center gap-2 mt-0.5">
                <span>{todayLong}</span>
                {lastRefreshed && (
                  <>
                    <span>&bull;</span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      Diperbarui {lastRefreshed} WITA
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
            <ClayButton
              variant="mint"
              size="sm"
              icon="fa-arrows-rotate"
              loading={refreshing}
              onClick={handleRefresh}
              title="Perbarui data kehadiran satelit sekarang"
            >
              Segarkan
            </ClayButton>
            <ClayButton
              variant="primary"
              size="sm"
              icon="fa-print"
              onClick={handlePrintSummary}
              title="Cetak laporan rekapitulasi resmi dinas wilayah binaan"
            >
              Cetak Rekap Wilayah
            </ClayButton>
          </div>
        </div>
      </ClayCard>

      {/* --------------------------------------------------------------------- */}
      {/* 2. 5 KEY AGGREGATE METRIC CARDS (SCREEN ONLY)                        */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 no-print">
        {/* Card 1: Total Sekolah Binaan */}
        <ClayCard variant="mint" rounded="2xl" className="p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                Total Sekolah
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                {aggregates.totalSekolah}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg shadow-xs border border-white/60">
              <i className="fa-solid fa-school"></i>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
            <span>{aggregates.activeSekolahCount} Aktif</span> &bull;{' '}
            <span>{aggregates.nonActiveSekolahCount} Nonaktif</span>
          </div>
        </ClayCard>

        {/* Card 2: Kehadiran Guru Hari Ini */}
        <ClayCard variant="blue" rounded="2xl" className="p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                Hadir Guru Hari Ini
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-blue-950 dark:text-blue-100 mt-1">
                {aggregates.aggregateGuruPct}%
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-lg shadow-xs border border-white/60">
              <i className="fa-solid fa-chalkboard-user"></i>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="w-full bg-blue-200/70 dark:bg-blue-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, aggregates.aggregateGuruPct)}%` }}
              ></div>
            </div>
            <p className="text-[11px] font-medium text-blue-900 dark:text-blue-300">
              {aggregates.totalHadirGuru} dari {aggregates.totalSemuaGuru} Guru
            </p>
          </div>
        </ClayCard>

        {/* Card 3: Kehadiran Siswa Hari Ini */}
        <ClayCard variant="purple" rounded="2xl" className="p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                Hadir Siswa Hari Ini
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-purple-950 dark:text-purple-100 mt-1">
                {aggregates.aggregateSiswaPct}%
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg shadow-xs border border-white/60">
              <i className="fa-solid fa-user-graduate"></i>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="w-full bg-purple-200/70 dark:bg-purple-950 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, aggregates.aggregateSiswaPct)}%` }}
              ></div>
            </div>
            <p className="text-[11px] font-medium text-purple-900 dark:text-purple-300">
              {aggregates.totalHadirSiswa} dari {aggregates.totalSemuaSiswa} Siswa
            </p>
          </div>
        </ClayCard>

        {/* Card 4: Kesehatan Satelit */}
        <ClayCard variant="peach" rounded="2xl" className="p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Kesehatan Satelit
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100 mt-1">
                {aggregates.onlineSatelitCount}/{aggregates.totalSekolah}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-lg shadow-xs border border-white/60">
              <i className="fa-solid fa-satellite-dish"></i>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-amber-200/60 dark:border-amber-800/40 text-[11px] font-medium text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                aggregates.onlineSatelitCount === aggregates.totalSekolah
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            ></span>
            <span>
              {aggregates.onlineSatelitCount === aggregates.totalSekolah
                ? 'Semua Satelit Terhubung'
                : `${aggregates.totalSekolah - aggregates.onlineSatelitCount} Perlu Perhatian`}
            </span>
          </div>
        </ClayCard>

        {/* Card 5: Sekolah Perlu Perhatian */}
        <ClayCard variant="rose" rounded="2xl" className="p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                Perlu Perhatian
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-100 mt-1">
                {aggregates.attentionSchoolsCount}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/70 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg shadow-xs border border-white/60">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-rose-200/60 dark:border-rose-800/40 text-[11px] font-medium text-rose-900 dark:text-rose-300 truncate">
            {aggregates.attentionSchoolsCount === 0
              ? 'Seluruh Sekolah Terkendali'
              : 'Alpa Tinggi / Guru Rendah'}
          </div>
        </ClayCard>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. SEARCH & FILTERS BAR (STRICTLY SCOPED TO REGION) (SCREEN ONLY)     */}
      {/* --------------------------------------------------------------------- */}
      <ClayCard variant="default" rounded="2xl" className="p-4 no-print space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari nama sekolah / NPSN di ${assignedRegion}...`}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                <i className="fa-solid fa-circle-xmark"></i>
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('semua')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'semua'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              Semua ({schoolMetrics.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('aktif')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'aktif'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 border border-emerald-200 dark:border-emerald-800/40'
              }`}
            >
              Aktif ({aggregates.activeSekolahCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('perhatian')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'perhatian'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white/80 dark:bg-gray-800 text-rose-800 dark:text-rose-300 hover:bg-rose-50 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              Perlu Perhatian ({aggregates.attentionSchoolsCount})
            </button>
            {aggregates.nonActiveSekolahCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('nonaktif')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === 'nonaktif'
                    ? 'bg-gray-700 text-white shadow-xs'
                    : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
                }`}
              >
                Nonaktif ({aggregates.nonActiveSekolahCount})
              </button>
            )}
          </div>
        </div>
      </ClayCard>

      {/* --------------------------------------------------------------------- */}
      {/* 4. SCHOOL BREAKDOWN TABLE (SCREEN ONLY)                                */}
      {/* --------------------------------------------------------------------- */}
      <ClayCard variant="default" rounded="3xl" className="p-4 sm:p-6 no-print space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              Daftar Satuan Pendidikan Binaan
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Menampilkan {filteredMetrics.length} sekolah terdaftar di wilayah {assignedRegion}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-block animate-spin text-indigo-600 text-3xl">
              <i className="fa-solid fa-circle-notch"></i>
            </div>
            <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
              Memuat data kehadiran sekolah binaan di {assignedRegion}...
            </p>
          </div>
        ) : filteredMetrics.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center text-xl">
              <i className="fa-solid fa-school-circle-xmark"></i>
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Tidak ada data sekolah yang cocok
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Periksa kembali kata kunci pencarian atau ganti filter status.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-amber-900/10 dark:border-white/10 text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Satuan Pendidikan</th>
                  <th className="py-3 px-3">Satelit</th>
                  <th className="py-3 px-3">Kehadiran Guru</th>
                  <th className="py-3 px-3">Kehadiran Siswa</th>
                  <th className="py-3 px-3 text-center">Jurnal KBM</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {filteredMetrics.map((item, idx) => (
                  <tr
                    key={item.school.id}
                    className="hover:bg-amber-50/40 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3 font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-gray-900 dark:text-white leading-tight">
                        {item.school.nama}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        NPSN: {item.school.npsn || '-'}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.isOnline
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        <i
                          className={`fa-solid fa-circle text-[6px] ${
                            item.isOnline ? 'text-emerald-600 animate-pulse' : 'text-rose-600'
                          }`}
                        ></i>
                        {item.isOnline ? 'Online' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.guruPct >= 70 ? 'bg-blue-600' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, item.guruPct)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {item.guruPct}%
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.hadirGuru}/{item.totalGuru} Hadir
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.siswaPct >= 75 ? 'bg-purple-600' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, item.siswaPct)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {item.siswaPct}%
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.hadirSiswa}/{item.totalSiswa} Hadir{' '}
                        {item.alpaSiswa > 0 && (
                          <span className="text-rose-600 dark:text-rose-400">
                            ({item.alpaSiswa} Alpa)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
                        {item.jurnalCount} KBM
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      {item.needsAttention ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300/50"
                          title={item.attentionReason}
                        >
                          <i className="fa-solid fa-triangle-exclamation text-rose-600 text-[9px]"></i>
                          {item.attentionReason || 'Perlu Perhatian'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300/50">
                          <i className="fa-solid fa-circle-check text-emerald-600 text-[9px]"></i>
                          Aman
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <ClayButton
                        variant="primary"
                        size="sm"
                        icon="fa-arrow-right"
                        iconPosition="right"
                        onClick={() => handleDrilldown(item.school)}
                        title={`Tinjau rekap presensi dan jurnal ${item.school.nama}`}
                      >
                        Tinjau
                      </ClayButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ClayCard>

      {/* --------------------------------------------------------------------- */}
      {/* 5. OFFICIAL PRINT-ONLY EXECUTIVE REGIONAL SUMMARY                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="print-only hidden print:block text-black bg-white p-6 max-w-4xl mx-auto">
        <PrintHeader user={user} />

        <div className="text-center my-4 border-b-2 border-black pb-3">
          <h2 className="text-base font-black uppercase tracking-wider text-black">
            Laporan Eksekutif Pemantauan Kehadiran Satuan Pendidikan
          </h2>
          <p className="text-xs font-semibold text-gray-800 mt-1">
            Daerah Penugasan: <strong>{assignedRegion}</strong> &bull; Tanggal: <strong>{todayLong}</strong>
          </p>
        </div>

        {/* Print Summary Table */}
        <table className="w-full text-left text-[9pt] border-collapse border border-black my-4">
          <thead>
            <tr className="bg-gray-100 text-black border-b border-black font-bold">
              <th className="border border-black p-1.5 text-center w-8">No</th>
              <th className="border border-black p-1.5 w-24">NPSN</th>
              <th className="border border-black p-1.5">Nama Satuan Pendidikan</th>
              <th className="border border-black p-1.5 text-center w-28">Guru Hadir / Total (%)</th>
              <th className="border border-black p-1.5 text-center w-28">Siswa Hadir / Total (%)</th>
              <th className="border border-black p-1.5 text-center w-16">Alpa</th>
              <th className="border border-black p-1.5 text-center w-16">Jurnal</th>
              <th className="border border-black p-1.5 w-24">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {schoolMetrics.map((item, idx) => (
              <tr key={item.school.id} className="border-b border-black">
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5 font-mono text-[8pt]">
                  {item.school.npsn || '-'}
                </td>
                <td className="border border-black p-1.5 font-bold">
                  {item.school.nama}
                </td>
                <td className="border border-black p-1.5 text-center">
                  {item.hadirGuru}/{item.totalGuru} ({item.guruPct}%)
                </td>
                <td className="border border-black p-1.5 text-center">
                  {item.hadirSiswa}/{item.totalSiswa} ({item.siswaPct}%)
                </td>
                <td className="border border-black p-1.5 text-center">
                  {item.alpaSiswa}
                </td>
                <td className="border border-black p-1.5 text-center">
                  {item.jurnalCount}
                </td>
                <td className="border border-black p-1.5 text-[8pt]">
                  {item.needsAttention ? item.attentionReason : 'Terkendali'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td colSpan={3} className="border border-black p-1.5 text-center">
                TOTAL AKUMULASI WILAYAH ({aggregates.totalSekolah} SEKOLAH)
              </td>
              <td className="border border-black p-1.5 text-center">
                {aggregates.totalHadirGuru}/{aggregates.totalSemuaGuru} ({aggregates.aggregateGuruPct}%)
              </td>
              <td className="border border-black p-1.5 text-center">
                {aggregates.totalHadirSiswa}/{aggregates.totalSemuaSiswa} ({aggregates.aggregateSiswaPct}%)
              </td>
              <td className="border border-black p-1.5 text-center">
                {aggregates.totalAlpaSiswa}
              </td>
              <td className="border border-black p-1.5 text-center">
                {aggregates.totalJurnal}
              </td>
              <td className="border border-black p-1.5 text-[8pt]">
                {aggregates.onlineSatelitCount}/{aggregates.totalSekolah} Online
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Print Signature Block */}
        <PrintSignature
          user={user}
          singleColumn={true}
          rightTitle="Pengawas Pembina / Pejabat Dinas"
          rightName={user.nama}
          rightNip={user.nip || '-'}
        />
      </div>
    </div>
  );
};

export default DinasDashboard;
