import { supabase } from '@/lib/supabaseClient';
import { 
  getWitaDateStr, 
  getWitaTimeStr, 
  getWitaStartOfDay, 
  getWitaEndOfDay 
} from '@/lib/wita';

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
    // Check if teacher has approved leave (Sakit, Izin, Dinas Luar with status_verifikasi === 'Disetujui') (F6-B3)
    const hasApprovedLeave = teacherRecs.some(
      r => ['Sakit', 'Izin', 'Dinas Luar'].includes(r.jenis_presensi) && r.status_verifikasi === 'Disetujui'
    );
    if (hasApprovedLeave) {
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

  // Guard: skip hari libur dari kalender_pendidikan
  const kalenderQuery = supabase
    .from('kalender_pendidikan')
    .select('id')
    .eq('tanggal', evaluatedDate)
    .eq('tipe', 'Libur')
    .limit(1);
  // ponytail: no sekolah_id filter here — libur nasional tidak perlu scope sekolah
  const { data: kalenderLibur } = await kalenderQuery;
  if (kalenderLibur && kalenderLibur.length > 0) {
    return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
  }

  // Guard: skip Sabtu jika sekolah 5 hari kerja, dan load aturan kehadiran guru
  let pengaturanQuery = supabase
    .from('pengaturan')
    .select('key, value, aturan_kehadiran_guru');
  if (sekolahId) {
    pengaturanQuery = pengaturanQuery.eq('sekolah_id', sekolahId);
  }
  const { data: pengaturanRows } = await pengaturanQuery;

  const hsCfg = (pengaturanRows || []).find((p: any) => p.key === 'hari_sekolah');
  if (parseInt(hsCfg?.value || '6', 10) === 5 && hariEvaluasi === 'Sabtu') {
    return { affectedCount: details.length, details, cutoffTime, evaluatedDate };
  }

  const isGlobalHariMengajarSaja = (pengaturanRows || []).some(
    (p: any) => (p.key === 'aturan_kehadiran_guru' && p.value === 'Hari_Mengajar_Saja') || p.aturan_kehadiran_guru === 'Hari_Mengajar_Saja'
  );
  const ghmRow = (pengaturanRows || []).find((p: any) => p.key === 'guru_hanya_mengajar');
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

  // Fetch semua guru aktif
  let guruQuery = supabase
    .from('data_guru')
    .select('nama_guru, user_id, wajib_hadir_hanya_mengajar, sekolah_id')
    .eq('status', 'Aktif');
  if (sekolahId) {
    guruQuery = guruQuery.eq('sekolah_id', sekolahId);
  }
  const { data: guruList } = await guruQuery;

  for (const guru of guruList || []) {
    if (!guru.nama_guru) continue;

    const namaNorm = guru.nama_guru.toLowerCase().trim();

    // Skip jika sudah ada record hari ini (match by nama atau user_id)
    const hasRecord = presensiRecords.some(r =>
      (r.nama_guru || '').toLowerCase().trim() === namaNorm
      || (guru.user_id && r.user_id === guru.user_id)
    );
    if (hasRecord) continue;

    // Guru wajib_hadir_hanya_mengajar / exempt: cek apakah ada jadwal hari ini
    const isTeacherExempt = Boolean(guru.wajib_hadir_hanya_mengajar) ||
      isGlobalHariMengajarSaja ||
      guruHanyaMengajarList.includes(guru.nama_guru) ||
      (guru.user_id && guruHanyaMengajarList.includes(guru.user_id));

    if (isTeacherExempt) {
      const { data: jadwal } = await supabase
        .from('jadwal_pelajaran')
        .select('id')
        .eq('hari', hariEvaluasi)
        .ilike('nama_guru', `%${guru.nama_guru}%`)
        .limit(1);
      if (!jadwal || jadwal.length === 0) continue; // Tidak wajib hadir, bebas Alpa
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
