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
 * Evaluates attendance submissions for a given date against the school's jam_pulang_akhir cutoff.
 * If unresubmitted rejections are detected after cutoff, mutates their status in the database to 'Alpa'.
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

  return {
    affectedCount: details.length,
    details,
    cutoffTime,
    evaluatedDate
  };
}
