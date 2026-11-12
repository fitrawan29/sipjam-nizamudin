import { supabase, isSchemaCacheOrMissingTableError } from '@/lib/supabaseClient';
import {
  isBkAccount,
  isTeacherNameEquivalent,
  resolveLinkedUserForTeacher,
  isTeacherRecordMatch,
  hasJournalContent
} from '@/lib/workflow';
import { 
  getWitaDateStr, 
  getWitaDayName, extractWitaDateStr 
} from '@/lib/wita';
import { isInvalidMapel } from '@/lib/dataIntegrityGuard';

export interface DisciplineWarning {
  category: 'Presensi' | 'Jurnal' | 'Piket';
  type: 'berturut-turut' | 'akumulasi';
  count: number;
  dates: string[];
  message: string;
}

export interface TeacherWarningSummary {
  teacherId?: string;
  teacherName: string;
  hasWarning: boolean;
  warnings: DisciplineWarning[];
  stats?: {
    presensi: { filled: number; required: number };
    jurnal: { filled: number; required: number };
    piket: { filled: number; required: number };
  };
}

export function calculateStreak(history: boolean[]): number {
  let maxConsecutive = 0;
  let current = 0;
  for (const item of history) {
    if (item) {
      current++;
      if (current > maxConsecutive) maxConsecutive = current;
    } else {
      current = 0;
    }
  }
  return maxConsecutive;
}

export function buildEvaluationDates(
  todayStr: string = getWitaDateStr(),
  _lookbackDays: number = 30,
  hariSekolah: string = '6',
  holidaySet: Set<string> = new Set()
): { dateStr: string; dayName: string }[] {
  const evaluationDates: { dateStr: string; dayName: string }[] = [];
  const dateObj = new Date(todayStr + 'T12:00:00+08:00');
  const currentDayOfMonth = parseInt(todayStr.split('-')[2], 10);

  for (let i = currentDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(dateObj.getTime() - i * 86400000);
    const dateStr = getWitaDateStr(d);
    
    if (dateStr.substring(0, 7) !== todayStr.substring(0, 7)) continue;
    
    const dayName = getWitaDayName(d);
    if (dayName === 'Minggu') continue;
    if (hariSekolah === '5' && dayName === 'Sabtu') continue;
    if (holidaySet.has(dateStr)) continue;

    evaluationDates.push({ dateStr, dayName });
  }
  return evaluationDates;
}

export function evaluateTeacherWarningsSync(
  teacherId: string | undefined,
  teacherName: string,
  isExemptNonTeaching: boolean,
  resolvedSekolahId: string | undefined,
  configs: any[],
  holidaysData: any[],
  jadwalData: any[],
  penugasanData: any[],
  legacyPiketData: any[],
  penilaianOrPresensi: any[],
  jurnalRecords: any[],
  piketRecords: any[],
  targetMonth?: string,
  bkJurnalRecords: any[] = [],
  isBkTeacher: boolean = false
): TeacherWarningSummary {
  const presensiRecords = penilaianOrPresensi;
  const normName = (teacherName || '').trim();

  const configMap = new Map((configs || []).map(c => [c.key, c.value]));
  const hariSekolah = configMap.get('hari_sekolah') || '6';
  const aturanKehadiran = configMap.get('aturan_kehadiran_guru') || 'Semua_Hari';

  const holidaySet = new Set((holidaysData || []).map(h => h.tanggal));

  const teacherJadwal = (jadwalData || []).filter(j =>
    isTeacherNameEquivalent(j.nama_guru, normName, true)
  );

  const isAssignedPenugasan = (day: string) => (penugasanData || []).some(p => {
    if (p.hari !== day) return false;
    if (isTeacherNameEquivalent(p.guru_nama, normName, true)) return true;
    if (Array.isArray(p.daftar_guru)) {
      return p.daftar_guru.some((dg: any) => {
        const dName = typeof dg === 'string' ? dg : dg.nama || dg.nama_guru || '';
        return isTeacherNameEquivalent(dName, normName, true);
      });
    }
    return false;
  });

  const isAssignedLegacy = (day: string) => (legacyPiketData || []).some(lp =>
    lp.hari === day && isTeacherNameEquivalent(lp.nama_guru, normName, true)
  );

  const isTeacherPiketOnDay = (day: string) => isAssignedPenugasan(day) || isAssignedLegacy(day);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  }

  const evaluationDates = buildEvaluationDates(todayStr, 30, hariSekolah, holidaySet);

  const warnings: DisciplineWarning[] = [];
  const monthlyStats = {
    presensi: { filled: 0, required: 0 },
    jurnal: { filled: 0, required: 0 },
    piket: { filled: 0, required: 0 },
  };

  const presensiOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const hasTeachingClass = teacherJadwal.some(j => j.hari === dayName);
    const isPiketDay = isTeacherPiketOnDay(dayName);

    const isExempt = typeof isExemptNonTeaching === 'boolean'
      ? isExemptNonTeaching
      : (aturanKehadiran === 'Hari_Mengajar_Saja');

    if (isExempt) {
      if (!hasTeachingClass && !isPiketDay) {
        continue;
      }
    }

    const dayPresensi = presensiRecords.filter(p => {
      const ts = p.timestamp || '';
      const extracted = extractWitaDateStr(ts);
      return (extracted ? extracted === dateStr : ts.startsWith(dateStr)) && p.tipe_absen === 'Datang';
    });

    let isAbsent = false;

    if (dayPresensi.length === 0) {
      isAbsent = true;
    } else {
      const hasApprovedLeave = dayPresensi.some(
        p => ['Sakit', 'Izin', 'Dinas Luar'].includes(p.jenis_presensi) && (p.status_verifikasi === 'Disetujui' || p.status_verifikasi === 'Diverifikasi')
      );
      if (hasApprovedLeave) {
        isAbsent = false;
      } else {
        const hasValidPresence = dayPresensi.some(
          p => p.status_verifikasi !== 'Ditolak' && p.status_verifikasi !== 'Alpa' && p.jenis_presensi !== 'Alpa'
        );
        if (!hasValidPresence) {
          isAbsent = true;
        }
      }
    }

    monthlyStats.presensi.required++;
    if (!isAbsent) monthlyStats.presensi.filled++;
    presensiOperationalDays.push({ dateStr, isViolation: isAbsent });
  }

  const presensiViolationDates = presensiOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  let currentStreak = 0;
  let maxStreak = 0;
  let streakDates: string[] = [];
  let tempStreakDates: string[] = [];

  for (const item of presensiOperationalDays) {
    if (item.isViolation) {
      currentStreak++;
      tempStreakDates.push(item.dateStr);
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        streakDates = [...tempStreakDates];
      }
    } else {
      currentStreak = 0;
      tempStreakDates = [];
    }
  }

  if (maxStreak >= 3) {
    warnings.push({
      category: 'Presensi',
      type: 'berturut-turut',
      count: maxStreak,
      dates: streakDates,
      message: `Tidak absen ${maxStreak}x berturut-turut`
    });
  }

  if (presensiViolationDates.length >= 3) {
    warnings.push({
      category: 'Presensi',
      type: 'akumulasi',
      count: presensiViolationDates.length,
      dates: presensiViolationDates,
      message: `Akumulasi tidak absen ${presensiViolationDates.length}x`
    });
  }

  const jurnalOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const scheduledOnDay = teacherJadwal.filter(j => j.hari === dayName);
    const isPiketDay = isTeacherPiketOnDay(dayName);

    const isExempt = typeof isExemptNonTeaching === 'boolean'
      ? isExemptNonTeaching
      : (aturanKehadiran === 'Hari_Mengajar_Saja');

    if (isExempt) {
      if (scheduledOnDay.length === 0 && !isPiketDay) {
        continue;
      }
    }

    const uniqueTargets = new Set(scheduledOnDay.map(j => `${j.kelas}_${j.mata_pelajaran}`));
    const targetCount = uniqueTargets.size;
    const requiredJournals = targetCount > 0 ? targetCount : 1;

    const dayJournals = jurnalRecords.filter(
      j => j.tanggal === dateStr && j.status_verifikasi !== 'Ditolak'
    );
    const dayBkSeparate = (bkJurnalRecords || []).filter(
      j => j.tanggal === dateStr && j.status_verifikasi !== 'Ditolak'
    );
    const combinedDayJournals = [...dayJournals, ...dayBkSeparate];
    const dayBkCount = combinedDayJournals.filter(
      j => j.isJurnalBk || j._sourceTable === 'jurnal_bk' || Boolean(j.bidang_bimbingan || j.jenis_layanan)
    ).length;

    const hasJurnalKegiatan = combinedDayJournals.some(
      j => j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan' || (!j.kelas || j.kelas === '-')
    );

    let reqForDay = requiredJournals;
    let filledCount = 0;
    if (dayBkCount > 0 && targetCount === 0) {
      // Setiap sesi Jurnal BK yang tercatat dihitung dalam pengisian jurnal harian
      reqForDay = dayBkCount;
      filledCount = dayBkCount;
    } else if (isBkTeacher && targetCount === 0 && !hasJurnalKegiatan) {
      // Layanan BK tidak memiliki jadwal KBM tetap harian; hari tanpa sesi BK tidak dihitung pelanggaran jurnal KBM
      reqForDay = 0;
      filledCount = 0;
    } else if (targetCount === 0) {
      if (hasJurnalKegiatan) filledCount = 1;
    } else {
      if (hasJurnalKegiatan || dayBkCount > 0) {
        filledCount = requiredJournals;
      } else {
        const uniqueFilled = new Set();
        dayJournals.forEach(j => {
          if (j.kelas && j.mapel && j.kelas !== '-') {
            // Sesi yang baru diisi absensi siswa saja (materi dan kegiatan "-") tidak dihitung sebagai jurnal selesai
            if (!(j.materi === '-' && j.kegiatan === '-') || hasJournalContent(j)) {
              uniqueFilled.add(`${j.kelas}_${j.mapel}`);
            }
          }
        });
        filledCount = Math.min(uniqueFilled.size, requiredJournals);
      }
    }

    const isMissingJournal = filledCount < reqForDay;
    
    monthlyStats.jurnal.required += reqForDay;
    monthlyStats.jurnal.filled += filledCount;
    jurnalOperationalDays.push({ dateStr, isViolation: isMissingJournal });
  }

  const jurnalViolationDates = jurnalOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  let jStreak = 0;
  let maxJStreak = 0;
  let jStreakDates: string[] = [];
  let tempJStreakDates: string[] = [];

  for (const item of jurnalOperationalDays) {
    if (item.isViolation) {
      jStreak++;
      tempJStreakDates.push(item.dateStr);
      if (jStreak > maxJStreak) {
        maxJStreak = jStreak;
        jStreakDates = [...tempJStreakDates];
      }
    } else {
      jStreak = 0;
      tempJStreakDates = [];
    }
  }

  if (maxJStreak >= 3) {
    warnings.push({
      category: 'Jurnal',
      type: 'berturut-turut',
      count: maxJStreak,
      dates: jStreakDates,
      message: `Tidak isi jurnal ${maxJStreak}x berturut-turut`
    });
  }

  if (jurnalViolationDates.length >= 3) {
    warnings.push({
      category: 'Jurnal',
      type: 'akumulasi',
      count: jurnalViolationDates.length,
      dates: jurnalViolationDates,
      message: `Akumulasi tidak isi jurnal ${jurnalViolationDates.length}x`
    });
  }

  const piketOperationalDays: { dateStr: string; isViolation: boolean }[] = [];

  for (const { dateStr, dayName } of evaluationDates) {
    const isAssigned = isTeacherPiketOnDay(dayName);
    if (!isAssigned) continue;

    const dayReports = piketRecords.filter(
      p => p.tanggal === dateStr && p.status_verifikasi !== 'Ditolak'
    );

    const isMissingPiket = dayReports.length === 0;
    monthlyStats.piket.required++;
    if (!isMissingPiket) monthlyStats.piket.filled++;
    piketOperationalDays.push({ dateStr, isViolation: isMissingPiket });
  }

  const piketViolationDates = piketOperationalDays.filter(d => d.isViolation).map(d => d.dateStr);

  let pStreak = 0;
  let maxPStreak = 0;
  let pStreakDates: string[] = [];
  let tempPStreakDates: string[] = [];

  for (const item of piketOperationalDays) {
    if (item.isViolation) {
      pStreak++;
      tempPStreakDates.push(item.dateStr);
      if (pStreak > maxPStreak) {
        maxPStreak = pStreak;
        pStreakDates = [...tempPStreakDates];
      }
    } else {
      pStreak = 0;
      tempPStreakDates = [];
    }
  }

  if (maxPStreak >= 3) {
    warnings.push({
      category: 'Piket',
      type: 'berturut-turut',
      count: maxPStreak,
      dates: pStreakDates,
      message: `Tidak lapor piket ${maxPStreak}x berturut-turut`
    });
  }

  if (piketViolationDates.length >= 3) {
    warnings.push({
      category: 'Piket',
      type: 'akumulasi',
      count: piketViolationDates.length,
      dates: piketViolationDates,
      message: `Akumulasi tidak lapor piket ${piketViolationDates.length}x`
    });
  }

  return {
    teacherId,
    teacherName: normName,
    hasWarning: warnings.length > 0,
    warnings,
    stats: monthlyStats
  };
}

export async function getTeacherDisciplineWarnings(
  teacherName: string,
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary> {
  const normName = (teacherName || '').trim();

  let guruQuery = supabase.from('data_guru').select('*');
  let usersQuery = supabase.from('users').select('id, nama, username, role');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
    usersQuery = usersQuery.eq('sekolah_id', sekolahId);
  }
  const safeUsersPromise = Promise.resolve(usersQuery).then(
    (res: any) => (res?.error ? [] : res?.data || []),
    () => []
  );
  const [{ data: allGuruRows }, usersRows] = await Promise.all([guruQuery, safeUsersPromise]);

  const guruData =
    (allGuruRows || []).find((g: any) =>
      isTeacherRecordMatch({ nama_guru: normName }, g, resolveLinkedUserForTeacher(g, usersRows))
    ) || null;
  const teacherProfile = guruData || { nama_guru: normName };
  const linkedUser = resolveLinkedUserForTeacher(teacherProfile, usersRows);
  const teacherId = guruData?.id;
  const resolvedSekolahId = sekolahId || guruData?.sekolah_id;

  let configQuery = supabase.from('pengaturan').select('*');
  let calQuery = supabase.from('kalender_pendidikan').select('tanggal, tipe, keterangan');
  let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
  let penugasanQuery = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
  let legacyPiketQuery = supabase.from('jadwal_piket').select('*');

  if (resolvedSekolahId) {
    configQuery = configQuery.eq('sekolah_id', resolvedSekolahId);
    calQuery = calQuery.eq('sekolah_id', resolvedSekolahId);
    jadwalQuery = jadwalQuery.eq('sekolah_id', resolvedSekolahId);
    penugasanQuery = penugasanQuery.eq('sekolah_id', resolvedSekolahId);
    legacyPiketQuery = legacyPiketQuery.eq('sekolah_id', resolvedSekolahId);
  }

  const [
    { data: configs },
    { data: holidaysData },
    { data: jadwalData },
    { data: penugasanData },
    { data: legacyPiketData }
  ] = await Promise.all([
    configQuery, calQuery, jadwalQuery, penugasanQuery, legacyPiketQuery
  ]);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;
  let maxDate = currentWitaStr + 'T23:59:59+08:00';

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    maxDate = todayStr + 'T23:59:59+08:00';
  }

  const evaluationDates = buildEvaluationDates(todayStr, 30, '6', new Set());
  const minDate = evaluationDates.length > 0 ? evaluationDates[0].dateStr : todayStr;
  const minTimestamp = minDate + 'T00:00:00+08:00';

  let presensiQuery = supabase.from('presensi_guru').select('*').gte('timestamp', minTimestamp).lte('timestamp', maxDate);
  let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  let piketQuery = supabase.from('laporan_piket').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  let bkJurnalQuery = supabase.from('jurnal_bk').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  if (resolvedSekolahId) {
    presensiQuery = presensiQuery.eq('sekolah_id', resolvedSekolahId);
    jurnalQuery = jurnalQuery.eq('sekolah_id', resolvedSekolahId);
    piketQuery = piketQuery.eq('sekolah_id', resolvedSekolahId);
    bkJurnalQuery = bkJurnalQuery.eq('sekolah_id', resolvedSekolahId);
  }

  const safeBkPromise = Promise.resolve(bkJurnalQuery).then(
    (res: any) => (res?.error && isSchemaCacheOrMissingTableError(res.error) ? [] : res?.data || []),
    () => []
  );

  const [
    { data: presensiRaw },
    { data: jurnalRaw },
    { data: piketRaw },
    bkJurnalRaw
  ] = await Promise.all([
    presensiQuery, jurnalQuery, piketQuery, safeBkPromise
  ]);

  const presensiRes = (presensiRaw || []).filter((p: any) => isTeacherRecordMatch(p, teacherProfile, linkedUser));
  const jurnalRes = (jurnalRaw || []).filter((j: any) => isTeacherRecordMatch(j, teacherProfile, linkedUser));
  const piketRes = (piketRaw || []).filter((p: any) => {
    if (isTeacherRecordMatch(p, teacherProfile, linkedUser)) return true;
    return String(p.kehadiran_guru_piket || '')
      .split(/[,;|]+/)
      .some(part => isTeacherRecordMatch({ nama_guru: part }, teacherProfile, linkedUser));
  });
  const bkJurnalRes = (bkJurnalRaw || []).filter((b: any) => isTeacherRecordMatch(b, teacherProfile, linkedUser));

  const configMap = new Map((configs || []).map((c: any) => [c.key, c.value]));
  const aturanGlobal = configMap.get('aturan_kehadiran_guru') ||
    (configs || []).find((c: any) => c.aturan_kehadiran_guru)?.aturan_kehadiran_guru || 'Semua_Hari';
  const ghmRow = (configs || []).find((c: any) => c.key === 'guru_hanya_mengajar');
  let ghmList: string[] = [];
  if (ghmRow && ghmRow.value) {
    try {
      const p = JSON.parse(ghmRow.value);
      if (Array.isArray(p)) ghmList = p;
    } catch {}
  }

  const isValTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
  const isValFalse = (v: any) => v === false || v === 'false' || v === 0 || v === '0';
  const isExplicitExempt = isValTrue(guruData?.wajib_hadir_hanya_mengajar);
  const isExplicitNonExempt = isValFalse(guruData?.wajib_hadir_hanya_mengajar);
  const hasExplicitSetting = isExplicitExempt || isExplicitNonExempt;
  const isTeacherInLegacy = Boolean(
    guruData && (
      ghmList.includes(guruData.id) ||
      ghmList.includes(guruData.nama_guru) ||
      (guruData.nip && ghmList.includes(guruData.nip))
    )
  );

  const isExemptNonTeaching = hasExplicitSetting
    ? isExplicitExempt
    : (isTeacherInLegacy || aturanGlobal === 'Hari_Mengajar_Saja');

  const isSingleTeacherBk = isBkAccount(guruData?.mata_pelajaran, linkedUser?.role);

  return evaluateTeacherWarningsSync(
    teacherId,
    guruData?.nama_guru || normName,
    isExemptNonTeaching,
    resolvedSekolahId,
    configs || [],
    holidaysData || [],
    (jadwalData || []).filter((j: any) => !isInvalidMapel(j.mata_pelajaran || j.mapel)),
    penugasanData || [],
    legacyPiketData || [],
    presensiRes || [],
    jurnalRes || [],
    piketRes || [],
    targetMonth,
    bkJurnalRes || [],
    isSingleTeacherBk
  );
}

export async function getAllTeachersDisciplineWarnings(
  sekolahId?: string,
  targetMonth?: string
): Promise<TeacherWarningSummary[]> {
  let guruQuery = supabase.from('data_guru').select('*').order('nama_guru');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: teachers, error } = await guruQuery;
  if (error || !teachers) {
    console.error('[warningSystem] Error fetching teachers:', error?.message);
    return [];
  }

  if (teachers.length === 0) return [];

  let configQuery = supabase.from('pengaturan').select('*');
  let calQuery = supabase.from('kalender_pendidikan').select('tanggal, tipe, keterangan, sekolah_id');
  let jadwalQuery = supabase.from('jadwal_pelajaran').select('*');
  let penugasanQuery = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
  let legacyPiketQuery = supabase.from('jadwal_piket').select('*');
  let usersRoleQuery = supabase.from('users').select('id, nama, username, role');

  if (sekolahId) {
    configQuery = configQuery.eq('sekolah_id', sekolahId);
    calQuery = calQuery.eq('sekolah_id', sekolahId);
    jadwalQuery = jadwalQuery.eq('sekolah_id', sekolahId);
    penugasanQuery = penugasanQuery.eq('sekolah_id', sekolahId);
    legacyPiketQuery = legacyPiketQuery.eq('sekolah_id', sekolahId);
    usersRoleQuery = usersRoleQuery.eq('sekolah_id', sekolahId);
  }

  const safeUsersPromise = Promise.resolve(usersRoleQuery).then(
    (res: any) => (res?.error ? [] : res?.data || []),
    () => []
  );

  const [
    { data: configs },
    { data: holidaysData },
    { data: jadwalData },
    { data: penugasanData },
    { data: legacyPiketData },
    usersRoleList
  ] = await Promise.all([
    configQuery, calQuery, jadwalQuery, penugasanQuery, legacyPiketQuery, safeUsersPromise
  ]);

  const currentWitaStr = getWitaDateStr();
  let todayStr = currentWitaStr;
  let maxDate = currentWitaStr + 'T23:59:59+08:00';

  if (targetMonth && targetMonth !== currentWitaStr.substring(0, 7)) {
    const [year, month] = targetMonth.split('-');
    const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
    todayStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    maxDate = todayStr + 'T23:59:59+08:00';
  }

  const yearMonth = todayStr.substring(0, 7);
  const minDate = `${yearMonth}-01`;
  const minTimestamp = minDate + 'T00:00:00+08:00';

  let presensiQuery = supabase.from('presensi_guru').select('*').gte('timestamp', minTimestamp).lte('timestamp', maxDate);
  let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  let piketQuery = supabase.from('laporan_piket').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);
  let bkJurnalAllQuery = supabase.from('jurnal_bk').select('*').gte('tanggal', minDate).lte('tanggal', todayStr);

  if (sekolahId) {
    presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
    jurnalQuery = jurnalQuery.eq('sekolah_id', sekolahId);
    piketQuery = piketQuery.eq('sekolah_id', sekolahId);
    bkJurnalAllQuery = bkJurnalAllQuery.eq('sekolah_id', sekolahId);
  }

  const safeAllBkPromise = Promise.resolve(bkJurnalAllQuery).then(
    (res: any) => (res?.error && isSchemaCacheOrMissingTableError(res.error) ? [] : res?.data || []),
    () => []
  );

  const [
    { data: presensiRes },
    { data: jurnalRes },
    { data: piketRes },
    bkJurnalData
  ] = await Promise.all([
    presensiQuery, jurnalQuery, piketQuery, safeAllBkPromise
  ]);

  const presensiData = presensiRes || [];
  const jurnalData = jurnalRes || [];
  const piketData = piketRes || [];

  const linkedUserIds = new Set(
    teachers
      .map((t: any) => resolveLinkedUserForTeacher(t, usersRoleList || [])?.id)
      .filter(Boolean)
      .map((id: any) => String(id))
  );
  const unlinkedBkTeachers = (usersRoleList || [])
    .filter((u: any) => isBkAccount(u.role) && !linkedUserIds.has(String(u.id)))
    .map((u: any) => ({
      id: `bk-user-${u.id}`,
      user_id: u.id,
      username: u.username,
      nip: u.username || '-',
      nama_guru: (u.nama || u.username || 'Guru BK').trim(),
      mata_pelajaran: 'BK',
      sekolah_id: u.sekolah_id || sekolahId,
      wajib_hadir_hanya_mengajar: false
    }));

  const summaries: TeacherWarningSummary[] = [];

  for (const teacher of [...teachers, ...unlinkedBkTeachers]) {
    if (!teacher.nama_guru) continue;
    try {
      const resolvedSekolahId = teacher.sekolah_id || sekolahId;
      const linkedUser = resolveLinkedUserForTeacher(teacher, usersRoleList || []);
      const sameSchool = (r: any) => !r.sekolah_id || r.sekolah_id === resolvedSekolahId;
      const tConfigs = (configs || []).filter(c => c.sekolah_id === resolvedSekolahId || !c.sekolah_id);
      const configMap = new Map((tConfigs || []).map((c: any) => [c.key, c.value]));
      const aturanGlobal = configMap.get('aturan_kehadiran_guru') ||
        (tConfigs || []).find((c: any) => c.aturan_kehadiran_guru)?.aturan_kehadiran_guru || 'Semua_Hari';
      const ghmRow = (tConfigs || []).find((c: any) => c.key === 'guru_hanya_mengajar');
      let ghmList: string[] = [];
      if (ghmRow && ghmRow.value) {
        try {
          const p = JSON.parse(ghmRow.value);
          if (Array.isArray(p)) ghmList = p;
        } catch {}
      }

      const isValTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
      const isValFalse = (v: any) => v === false || v === 'false' || v === 0 || v === '0';
      const isExplicitExempt = isValTrue(teacher.wajib_hadir_hanya_mengajar);
      const isExplicitNonExempt = isValFalse(teacher.wajib_hadir_hanya_mengajar);
      const hasExplicitSetting = isExplicitExempt || isExplicitNonExempt;
      const isTeacherInLegacy = Boolean(
        ghmList.includes(teacher.id) ||
        ghmList.includes(teacher.nama_guru) ||
        (teacher.nip && ghmList.includes(teacher.nip)) ||
        (linkedUser?.id && ghmList.includes(linkedUser.id))
      );

      const isExemptNonTeaching = hasExplicitSetting
        ? isExplicitExempt
        : (isTeacherInLegacy || aturanGlobal === 'Hari_Mengajar_Saja');
      const tHolidays = (holidaysData || []).filter(h => h.sekolah_id === resolvedSekolahId || !h.sekolah_id);
      const tJadwal = (jadwalData || []).filter(j => (j.sekolah_id === resolvedSekolahId || !j.sekolah_id) && !isInvalidMapel(j.mata_pelajaran || j.mapel));
      const tPenugasan = (penugasanData || []).filter(p => p.sekolah_id === resolvedSekolahId || !p.sekolah_id);
      const tLegacyPiket = (legacyPiketData || []).filter(p => p.sekolah_id === resolvedSekolahId || !p.sekolah_id);

      const tPresensi = presensiData.filter(p => sameSchool(p) && isTeacherRecordMatch(p, teacher, linkedUser));
      const tJurnal = jurnalData.filter(j => sameSchool(j) && isTeacherRecordMatch(j, teacher, linkedUser));
      const tBkJurnal = (bkJurnalData || []).filter((b: any) => sameSchool(b) && isTeacherRecordMatch(b, teacher, linkedUser));
      const tPiket = piketData.filter(p => {
        if (!sameSchool(p)) return false;
        if (isTeacherRecordMatch(p, teacher, linkedUser)) return true;
        return String(p.kehadiran_guru_piket || '')
          .split(/[,;|]+/)
          .some(part => isTeacherRecordMatch({ nama_guru: part }, teacher, linkedUser));
      });

      const summary = evaluateTeacherWarningsSync(
        teacher.id,
        teacher.nama_guru,
        isExemptNonTeaching,
        resolvedSekolahId,
        tConfigs,
        tHolidays,
        tJadwal,
        tPenugasan,
        tLegacyPiket,
        tPresensi,
        tJurnal,
        tPiket,
        targetMonth,
        tBkJurnal,
        isBkAccount(teacher.mata_pelajaran, linkedUser?.role)
      );
      summaries.push(summary);
    } catch (err: any) {
      console.error(`[warningSystem] Error evaluating warnings for ${teacher.nama_guru}:`, err.message);
    }
  }

  return summaries;
}
