import { supabase } from '@/lib/supabaseClient';
import { 
  getWitaDateStr, 
  getWitaTimeStr, 
  getWitaStartOfDay, 
  getWitaEndOfDay 
} from '@/lib/wita';
import { isGuruDiPiket } from '@/lib/workflow';

export interface AutoAlpaResult {
  affectedCount: number;
  details: {
    id: string;
    nama_guru: string;
    previousStatus: string;
    newStatus: string;
    sekolah_id?: string;
  }[];
  cutoffTime?: string;
  evaluatedDate?: string;
  reason?: string;
}

export interface EvaluateAutoAlpaOptions {
  force?: boolean;
}

/**
 * Safely compares two time strings (HH:MM or HH.MM).
 * Returns true if currentTime is strictly before cutoffTime.
 */
export function isBeforeCutoff(currentTime: string, cutoffTime: string): boolean {
  const normCurrent = (currentTime || '').replace('.', ':').trim();
  const normCutoff = (cutoffTime || '').replace('.', ':').trim();
  return normCurrent < normCutoff;
}

/**
 * Mendapatkan nama hari Indonesia dari string YYYY-MM-DD (WITA-aware, pakai jam 12:00).
 */
function getDayNameFromDate(dateStr: string): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date(dateStr + 'T12:00:00+08:00').getDay()];
}

/**
 * Evaluates attendance submissions for a given date against the school's jam_pulang_akhir cutoff.
 * - Converts rejected-but-unresubmitted records to 'Alpa'.
 * - Inserts new 'Alpa' records for teachers with no attendance record at all on that day.
 */
export async function evaluateAndApplyAutoAlpa(
  targetDateStr?: string,
  sekolahId?: string,
  options?: EvaluateAutoAlpaOptions
): Promise<AutoAlpaResult> {
  const evaluatedDate = targetDateStr || getWitaDateStr();
  const todayWita = getWitaDateStr();
  const currentTimeWita = getWitaTimeStr();

  // 1. Fetch jam_pulang_akhir from pengaturan
  let configQuery = supabase.from('pengaturan').select('*').eq('key', 'jam_pulang_akhir');
  if (sekolahId) {
    configQuery = configQuery.eq('sekolah_id', sekolahId);
  }
  const { data: configData } = await configQuery.maybeSingle();
  const cutoffTime = configData?.value || '22:00';

  // 2. Pre-cutoff early exit (F6-B2)
  // If target date is today and current time is before cutoff, exit without changes unless forced
  if (evaluatedDate === todayWita && !options?.force) {
    if (isBeforeCutoff(currentTimeWita, cutoffTime)) {
      return {
        affectedCount: 0,
        details: [],
        cutoffTime,
        evaluatedDate,
        reason: `Cutoff time (${cutoffTime} WITA) has not been reached yet for today (${currentTimeWita} WITA).`
      };
    }
  }

  // 3. Query all presensi_guru records for the evaluated date
  const startOfDay = getWitaStartOfDay(evaluatedDate);
  const endOfDay = getWitaEndOfDay(evaluatedDate);

  let query = supabase
    .from('presensi_guru')
    .select('*')
    .gte('timestamp', startOfDay)
    .lte('timestamp', endOfDay);

  if (sekolahId) {
    query = query.eq('sekolah_id', sekolahId);
  }

  const { data: records, error } = await query;
  if (error) {
    console.error('[attendanceAlpa] Error fetching attendance records:', error.message);
    throw new Error(`Failed to query attendance for ${evaluatedDate}: ${error.message}`);
  }

  const presensiRecords = (records || []).filter(rec => {
    const ts = rec.timestamp || '';
    return ts.startsWith(evaluatedDate) || (ts >= startOfDay && ts <= endOfDay);
  });

  // 3b. Query approved or pending multi-day leave records covering evaluatedDate
  // Multi-day leave spans [tanggal_mulai, tanggal_selesai] where status_verifikasi !== 'Ditolak'
  let multiDayQuery = supabase
    .from('presensi_guru')
    .select('*')
    .lte('tanggal_mulai', evaluatedDate)
    .gte('tanggal_selesai', evaluatedDate)
    .neq('status_verifikasi', 'Ditolak');

  if (sekolahId) {
    multiDayQuery = multiDayQuery.eq('sekolah_id', sekolahId);
  }

  const { data: multiDayRecords, error: multiDayError } = await multiDayQuery;
  if (multiDayError) {
    console.error('[attendanceAlpa] Error fetching multi-day leave records:', multiDayError.message);
  }

  const activeMultiDayLeaves = (multiDayRecords || []).filter(rec => {
    if (rec.status_verifikasi === 'Ditolak') return false;
    const isLeaveType = ['Sakit', 'Izin', 'Dinas Luar'].includes(rec.jenis_presensi) ||
      rec.detail_izin === 'Sakit' || (rec.detail_izin && rec.detail_izin.includes('Izin'));
    if (!isLeaveType) return false;
    if (rec.tanggal_mulai && rec.tanggal_selesai) {
      return evaluatedDate >= rec.tanggal_mulai && evaluatedDate <= rec.tanggal_selesai;
    }
    return false;
  });

  // 4. Identify unresubmitted rejected records
  // Group all records by teacher name (normalized)
  const teacherRecordsMap = new Map<string, typeof presensiRecords>();
  for (const rec of presensiRecords) {
    const teacherKey = (rec.nama_guru || '').toLowerCase().trim();
    if (!teacherKey) continue;
    if (!teacherRecordsMap.has(teacherKey)) {
      teacherRecordsMap.set(teacherKey, []);
    }
    teacherRecordsMap.get(teacherKey)!.push(rec);
  }

  const details: AutoAlpaResult['details'] = [];

  for (const [teacherKey, teacherRecs] of teacherRecordsMap.entries()) {
    // Check if teacher has approved leave or active multi-day leave
    const hasApprovedLeave = teacherRecs.some(
      r => ['Sakit', 'Izin', 'Dinas Luar'].includes(r.jenis_presensi) && (r.status_verifikasi === 'Disetujui' || r.status_verifikasi === 'Diverifikasi')
    );
    const hasActiveMultiDay = activeMultiDayLeaves.some(
      l => (l.nama_guru || '').toLowerCase().trim() === teacherKey
    );
    if (hasApprovedLeave || hasActiveMultiDay) {
      continue; // Protected from Alpa
    }

    // Check if teacher has resubmitted attendance (status_verifikasi !== 'Ditolak' and !== 'Alpa') (F6-B1)
    const hasValidResubmission = teacherRecs.some(
      r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
    );

    if (hasValidResubmission) {
      continue; // Resubmission already present, skip conversion
    }

    // Find rejected Datang records for this teacher
    const rejectedDatangRecords = teacherRecs.filter(
      r => r.tipe_absen === 'Datang' && r.status_verifikasi === 'Ditolak'
    );

    for (const rejectedRec of rejectedDatangRecords) {
      // Mutate in database to Alpa (F6.2, F6.5)
      const { error: updateErr } = await supabase
        .from('presensi_guru')
        .update({
          status_verifikasi: 'Alpa',
          jenis_presensi: 'Alpa',
          catatan_admin: 'Status diubah menjadi Alpa karena tidak mengisi ulang presensi hingga batas waktu pulang.'
        })
        .eq('id', rejectedRec.id);

      if (updateErr) {
        console.error(`[attendanceAlpa] Failed to update record ${rejectedRec.id} to Alpa:`, updateErr.message);
      } else {
        details.push({
          id: rejectedRec.id,
          nama_guru: rejectedRec.nama_guru,
          previousStatus: rejectedRec.status_verifikasi,
          newStatus: 'Alpa',
          sekolah_id: rejectedRec.sekolah_id
        });
      }
    }
  }

  // 5. INSERT Alpa untuk guru yang tidak punya record sama sekali hari ini
  const hariEvaluasi = getDayNameFromDate(evaluatedDate);

  // Guard: skip Minggu
  if (hariEvaluasi === 'Minggu') {
    return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
  }

  // Guard: cek hari libur dari kalender_pendidikan
  let kalenderQuery = supabase
    .from('kalender_pendidikan')
    .select('id, sekolah_id, tipe, keterangan')
    .eq('tanggal', evaluatedDate);
  if (sekolahId) {
    kalenderQuery = kalenderQuery.or(`sekolah_id.eq.${sekolahId},sekolah_id.is.null,sekolah_id.eq.00000000-0000-0000-0000-000000000000`);
  }
  const { data: kalenderRows } = await kalenderQuery;

  // Jika evaluasi untuk satu sekolah spesifik, cek apakah hari ini libur bagi sekolah tersebut
  if (sekolahId) {
    const relevantCal = (kalenderRows || []).filter((c: any) =>
      !c.sekolah_id || c.sekolah_id === sekolahId || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
    );
    const isExplicitMasuk = relevantCal.some((c: any) => c.tipe === 'Masuk' || c.tipe === 'Efektif');
    const isHoliday = !isExplicitMasuk && relevantCal.some((c: any) => c.tipe === 'Libur');
    if (isHoliday) {
      return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
    }
  } else {
    // Jika evaluasi batch semua sekolah, cek apakah hari ini Libur Nasional universal
    const universalCal = (kalenderRows || []).filter((c: any) =>
      !c.sekolah_id || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
    );
    const isExplicitMasuk = universalCal.some((c: any) => c.tipe === 'Masuk' || c.tipe === 'Efektif');
    const isUniversalHoliday = !isExplicitMasuk && universalCal.some((c: any) => c.tipe === 'Libur');
    if (isUniversalHoliday) {
      return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
    }
  }

  // Guard: skip Sabtu jika sekolah 5 hari kerja, dan load aturan kehadiran guru
  let pengaturanQuery = supabase
    .from('pengaturan')
    .select('key, value, aturan_kehadiran_guru, sekolah_id');
  if (sekolahId) {
    pengaturanQuery = pengaturanQuery.eq('sekolah_id', sekolahId);
  }
  const { data: pengaturanRows } = await pengaturanQuery;

  // Global Saturday check if evaluating single school
  if (sekolahId) {
    const hsCfg = (pengaturanRows || []).find((p: any) => p.key === 'hari_sekolah');
    if (parseInt(hsCfg?.value || '6', 10) === 5 && hariEvaluasi === 'Sabtu') {
      return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
    }
  }

  // Fetch active sistem_blok for evaluatedDate
  let blokQuery = supabase
    .from('sistem_blok')
    .select('id, sekolah_id')
    .lte('tanggal_mulai', evaluatedDate)
    .gte('tanggal_selesai', evaluatedDate);
  if (sekolahId) blokQuery = blokQuery.eq('sekolah_id', sekolahId);
  const { data: activeBloks } = await blokQuery;

  // Fetch penugasan piket today
  let penugasanQuery = supabase
    .from('penugasan_piket')
    .select('guru_nama, guru_nip, guru_id, sekolah_id')
    .eq('hari', hariEvaluasi)
    .eq('tipe_petugas', 'Guru');
  if (sekolahId) penugasanQuery = penugasanQuery.eq('sekolah_id', sekolahId);
  const { data: penugasanList } = await penugasanQuery;

  // Fetch jadwal piket today fallback
  let jadwalPiketQuery = supabase
    .from('jadwal_piket')
    .select('daftar_guru, sekolah_id')
    .eq('hari', hariEvaluasi);
  if (sekolahId) jadwalPiketQuery = jadwalPiketQuery.eq('sekolah_id', sekolahId);
  const { data: jadwalPiketList } = await jadwalPiketQuery;

  // Fetch all schedules today
  let allJadwalQuery = supabase
    .from('jadwal_pelajaran')
    .select('id, nama_guru, user_id, sekolah_id')
    .eq('hari', hariEvaluasi);
  if (sekolahId) allJadwalQuery = allJadwalQuery.eq('sekolah_id', sekolahId);
  const { data: allJadwalToday } = await allJadwalQuery;

  // Fetch semua guru aktif
  let guruQuery = supabase
    .from('data_guru')
    .select('id, nip, nama_guru, user_id, wajib_hadir_hanya_mengajar, sekolah_id')
    .eq('status', 'Aktif');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: guruList } = await guruQuery;

  for (const guru of guruList || []) {
    if (!guru.nama_guru) continue;

    // Per-school Saturday check if batch evaluating across schools
    const schoolPengaturan = (pengaturanRows || []).filter((p: any) =>
      !guru.sekolah_id || !p.sekolah_id || p.sekolah_id === guru.sekolah_id
    );
    const hsCfg = schoolPengaturan.find((p: any) => p.key === 'hari_sekolah');
    if (parseInt(hsCfg?.value || '6', 10) === 5 && hariEvaluasi === 'Sabtu') {
      continue;
    }

    // Per-school holiday check if batch evaluating across schools
    const guruCal = (kalenderRows || []).filter((c: any) =>
      !c.sekolah_id || !guru.sekolah_id || c.sekolah_id === guru.sekolah_id || c.sekolah_id === '00000000-0000-0000-0000-000000000000'
    );
    const isGuruExplicitMasuk = guruCal.some((c: any) => c.tipe === 'Masuk' || c.tipe === 'Efektif');
    const isGuruSchoolHoliday = !isGuruExplicitMasuk && guruCal.some((c: any) => c.tipe === 'Libur');
    if (isGuruSchoolHoliday) {
      continue;
    }

    const namaNorm = guru.nama_guru.toLowerCase().trim();

    // Skip jika guru memiliki izin/sakit multi-hari aktif yang mencakup tanggal ini dan belum/tidak ditolak
    const hasActiveMultiDayLeave = activeMultiDayLeaves.some(leave => {
      if (guru.sekolah_id && leave.sekolah_id && leave.sekolah_id !== guru.sekolah_id) return false;
      const matchName = (leave.nama_guru || '').toLowerCase().trim() === namaNorm;
      const matchUser = Boolean(guru.user_id && leave.user_id === guru.user_id);
      return matchName || matchUser;
    });
    if (hasActiveMultiDayLeave) {
      continue; // Dilindungi dari Alpa karena cuti/izin multi-hari yang valid
    }

    // Skip jika sudah ada record hari ini (match by nama atau user_id)
    const hasRecord = presensiRecords.some(r => {
      if (guru.sekolah_id && r.sekolah_id && r.sekolah_id !== guru.sekolah_id) return false;
      return (r.nama_guru || '').toLowerCase().trim() === namaNorm
        || (guru.user_id && r.user_id === guru.user_id);
    });
    if (hasRecord) continue;

    // Evaluasi aturan kehadiran guru berbasis sekolahnya
    const isSchoolHariMengajarSaja = schoolPengaturan.some(
      (p: any) => (p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja') || p.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
    );
    const ghmRow = schoolPengaturan.find((p: any) => p.key === 'guru_hanya_mengajar');
    let guruHanyaMengajarList: string[] = [];
    if (ghmRow && ghmRow.value) {
      try {
        const parsed = JSON.parse(ghmRow.value);
        if (Array.isArray(parsed)) guruHanyaMengajarList = parsed;
        else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.ids)) guruHanyaMengajarList.push(...parsed.ids);
          if (Array.isArray(parsed.names)) guruHanyaMengajarList.push(...parsed.names);
        }
      } catch {
        guruHanyaMengajarList = [ghmRow.value];
      }
    }

    // Normalisasi nilai string boolean agar evaluasi aman dan konsisten
    if (guru.wajib_hadir_hanya_mengajar === 'false' || guru.wajib_hadir_hanya_mengajar === '0') {
      guru.wajib_hadir_hanya_mengajar = false;
    } else if (guru.wajib_hadir_hanya_mengajar === 'true' || guru.wajib_hadir_hanya_mengajar === '1') {
      guru.wajib_hadir_hanya_mengajar = true;
    }

    // Guru wajib_hadir_hanya_mengajar / exempt: cek apakah ada jadwal hari ini atau tugas piket
    const hasExplicitTeacherSetting = guru.wajib_hadir_hanya_mengajar !== null && guru.wajib_hadir_hanya_mengajar !== undefined;
    const isTeacherInLegacyList = (guru.id && guruHanyaMengajarList.includes(guru.id)) ||
      (guru.nip && guruHanyaMengajarList.includes(guru.nip)) ||
      guruHanyaMengajarList.includes(guru.nama_guru) ||
      (guru.user_id && guruHanyaMengajarList.includes(guru.user_id));

    const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar) ||
      (!hasExplicitTeacherSetting && (isTeacherInLegacyList || isSchoolHariMengajarSaja));

    if (isTeacherExempt) {
      const cleanName = (guru.nama_guru || '').split(',')[0].trim().toLowerCase();

      const hasTeachingToday = (allJadwalToday || []).some((j: any) => {
        if (guru.sekolah_id && j.sekolah_id && j.sekolah_id !== guru.sekolah_id) return false;
        if (guru.user_id && j.user_id && String(j.user_id) === String(guru.user_id)) return true;
        const jNama = (j.nama_guru || '').toLowerCase().trim();
        if (!jNama || !cleanName) return false;
        return jNama === namaNorm || jNama === cleanName || (cleanName.length >= 3 && jNama.includes(cleanName)) || (jNama.length >= 3 && cleanName.includes(jNama));
      });

      const inPenugasan = (penugasanList || []).some((p: any) => {
        if (guru.sekolah_id && p.sekolah_id && p.sekolah_id !== guru.sekolah_id) return false;
        if (p.guru_id && ((guru.user_id && String(p.guru_id) === String(guru.user_id)) || (guru.id && String(p.guru_id) === String(guru.id)))) return true;
        if (guru.nip && p.guru_nip && String(p.guru_nip).trim() === String(guru.nip).trim()) return true;
        const pNama = (p.guru_nama || '').toLowerCase().trim();
        if (!pNama || !cleanName) return false;
        return pNama === namaNorm || pNama === cleanName || (cleanName.length >= 3 && pNama.includes(cleanName)) || (pNama.length >= 3 && cleanName.includes(pNama));
      });

      const inJadwalPiket = (jadwalPiketList || []).some((jp: any) => {
        if (guru.sekolah_id && jp.sekolah_id && jp.sekolah_id !== guru.sekolah_id) return false;
        return isGuruDiPiket(jp.daftar_guru, guru.nama_guru) || isGuruDiPiket(jp.daftar_guru, cleanName);
      });

      const isBlokActive = Boolean((activeBloks || []).some((b: any) =>
        !guru.sekolah_id || !b.sekolah_id || b.sekolah_id === guru.sekolah_id
      ));

      const hasPiketDuty = (inPenugasan || inJadwalPiket) && (!isBlokActive || hasTeachingToday);

      if (!hasTeachingToday && !hasPiketDuty) {
        continue; // Tidak wajib hadir, bebas Alpa
      }
    }

    // INSERT record Alpa baru
    const { error: insErr } = await supabase.from('presensi_guru').insert({
      id: crypto.randomUUID(),
      timestamp: `${evaluatedDate}T23:59:00+08:00`,
      nama_guru: guru.nama_guru,
      user_id: guru.user_id || null,
      tipe_absen: 'Datang',
      jenis_presensi: 'Alpa',
      status_verifikasi: 'Alpa',
      catatan_admin: 'Alpa otomatis: tidak melakukan presensi datang hingga batas waktu.',
      sekolah_id: guru.sekolah_id,
    });

    if (insErr) {
      console.error(`[attendanceAlpa] Failed to insert Alpa for ${guru.nama_guru}:`, insErr.message);
    } else {
      details.push({
        id: '(inserted)',
        nama_guru: guru.nama_guru,
        previousStatus: 'Tidak Ada Record',
        newStatus: 'Alpa',
        sekolah_id: guru.sekolah_id,
      });
    }
  }

  return {
    affectedCount: details.length,
    details,
    cutoffTime,
    evaluatedDate
  };
}

export interface AutoCheckoutResult {
  affectedCount: number;
  details: {
    id: string;
    nama_guru: string;
    user_id?: string | null;
    sekolah_id?: string;
    previousStatus?: string;
    newStatus: string;
  }[];
  cutoffTime?: string;
  evaluatedDate?: string;
  reason?: string;
}

/**
 * Evaluates attendance on targetDate past jam_pulang_akhir cutoff for teachers who checked in
 * but forgot to check out (no 'Pulang' record).
 * Automatically inserts an explicit auto-checkout record with:
 * is_auto_checkout = true, status_verifikasi = 'Lupa Checkout',
 * catatan_admin = 'Auto-checkout: Guru tidak melakukan presensi pulang'
 */
export async function evaluateAndApplyAutoCheckout(
  targetDateStr?: string,
  sekolahId?: string,
  options?: EvaluateAutoAlpaOptions
): Promise<AutoCheckoutResult> {
  const evaluatedDate = targetDateStr || getWitaDateStr();
  const todayWita = getWitaDateStr();
  const currentTimeWita = getWitaTimeStr();

  // 1. Fetch jam_pulang_akhir from pengaturan
  let configQuery = supabase.from('pengaturan').select('*').eq('key', 'jam_pulang_akhir');
  if (sekolahId) {
    configQuery = configQuery.eq('sekolah_id', sekolahId);
  }
  const { data: configData } = await configQuery.maybeSingle();
  const cutoffTime = configData?.value || '22:00';

  // 2. Pre-cutoff early exit
  if (evaluatedDate === todayWita && !options?.force) {
    if (isBeforeCutoff(currentTimeWita, cutoffTime)) {
      return {
        affectedCount: 0,
        details: [],
        cutoffTime,
        evaluatedDate,
        reason: `Cutoff time (${cutoffTime} WITA) has not been reached yet for today (${currentTimeWita} WITA).`
      };
    }
  }

  // 3. Query all presensi_guru records for the evaluated date
  const startOfDay = getWitaStartOfDay(evaluatedDate);
  const endOfDay = getWitaEndOfDay(evaluatedDate);

  let query = supabase
    .from('presensi_guru')
    .select('*')
    .gte('timestamp', startOfDay)
    .lte('timestamp', endOfDay);

  if (sekolahId) {
    query = query.eq('sekolah_id', sekolahId);
  }

  const { data: records, error } = await query;
  if (error) {
    console.error('[attendanceAlpa] Error fetching attendance records for auto-checkout:', error.message);
    throw new Error(`Failed to query attendance for ${evaluatedDate}: ${error.message}`);
  }

  const presensiRecords = (records || []).filter(rec => {
    const ts = rec.timestamp || '';
    return ts.startsWith(evaluatedDate) || (ts >= startOfDay && ts <= endOfDay);
  });

  // Group by teacher
  const teacherRecordsMap = new Map<string, typeof presensiRecords>();
  for (const rec of presensiRecords) {
    const teacherKey = rec.user_id ? `uid:${rec.user_id}` : (rec.nama_guru || '').toLowerCase().trim();
    if (!teacherKey) continue;
    if (!teacherRecordsMap.has(teacherKey)) {
      teacherRecordsMap.set(teacherKey, []);
    }
    teacherRecordsMap.get(teacherKey)!.push(rec);
  }

  const details: AutoCheckoutResult['details'] = [];

  for (const [_, teacherRecs] of teacherRecordsMap.entries()) {
    // Check if teacher has valid Datang
    const validDatang = teacherRecs.find(
      r => r.tipe_absen === 'Datang' && r.status_verifikasi !== 'Ditolak' && r.status_verifikasi !== 'Alpa'
    );
    if (!validDatang) continue;

    // Skip teachers on full-day leave
    const isLeave = ['Izin', 'Sakit'].includes(validDatang.jenis_presensi || '') ||
      ['Izin', 'Sakit'].includes(validDatang.detail_izin || '');
    if (isLeave) continue;

    // Check if teacher already has any Pulang record
    const hasPulang = teacherRecs.some(r => r.tipe_absen === 'Pulang');
    if (hasPulang) continue;

    // Insert explicit auto-checkout record
    const autoCheckoutId = crypto.randomUUID();
    const formattedCutoff = cutoffTime.replace('.', ':');
    const autoRecord = {
      id: autoCheckoutId,
      timestamp: `${evaluatedDate}T${formattedCutoff}:00+08:00`,
      nama_guru: validDatang.nama_guru,
      user_id: validDatang.user_id || null,
      tipe_absen: 'Pulang',
      jenis_presensi: 'Auto-Checkout',
      status_verifikasi: 'Lupa Checkout',
      catatan_admin: 'Auto-checkout: Guru tidak melakukan presensi pulang',
      sekolah_id: validDatang.sekolah_id,
      lokasi: 'Sistem Otomatis (Lupa Checkout)',
      jarak: '0 m',
      is_auto_checkout: true
    };

    let { error: insErr } = await supabase.from('presensi_guru').insert(autoRecord);
    if (insErr && (insErr.message.includes('schema cache') || insErr.message.includes('column'))) {
      const { is_auto_checkout: _, ...baseAutoRecord } = autoRecord;
      const retry = await supabase.from('presensi_guru').insert(baseAutoRecord);
      if (!retry.error) {
        insErr = null;
      }
    }

    if (insErr) {
      console.error(`[attendanceAlpa] Failed to insert auto-checkout for ${validDatang.nama_guru}:`, insErr.message);
    } else {
      details.push({
        id: autoCheckoutId,
        nama_guru: validDatang.nama_guru,
        user_id: validDatang.user_id,
        sekolah_id: validDatang.sekolah_id,
        previousStatus: 'Belum Pulang',
        newStatus: 'Lupa Checkout'
      });
    }
  }

  return {
    affectedCount: details.length,
    details,
    cutoffTime,
    evaluatedDate
  };
}
