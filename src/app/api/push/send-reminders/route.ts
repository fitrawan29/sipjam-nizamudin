import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { sendWebPush, PushNotificationPayload } from '@/lib/vapid';
import { getWitaDateStr, getWitaDayName } from '@/lib/wita';

export interface ReminderItem {
  guru_id: string;
  guru_nama: string;
  sekolah_id: string;
  category: 'presensi' | 'jurnal' | 'piket';
  title: string;
  body: string;
  url: string;
}

export async function checkMissingTasks(targetDateStr?: string, targetDayName?: string, filterSekolahId?: string) {
  const todayStr = targetDateStr || getWitaDateStr();
  const todayDay = targetDayName || getWitaDayName();

  const reminders: ReminderItem[] = [];

  // 1. Fetch schools to process
  let schoolQuery = supabase.from('sekolah').select('id, nama');
  if (filterSekolahId) {
    schoolQuery = schoolQuery.eq('id', filterSekolahId);
  }
  const { data: schools, error: schoolErr } = await schoolQuery;
  if (schoolErr) {
    console.error('[send-reminders] Error fetching schools:', schoolErr);
    return { reminders, todayStr, todayDay, error: schoolErr.message };
  }

  const schoolList = schools || [{ id: '00000000-0000-0000-0000-000000000000', nama: 'Default' }];

  for (const school of schoolList) {
    const sekolahId = school.id;

    // A. Fetch data_guru for this school
    let guruQuery = supabase.from('data_guru').select('*');
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      guruQuery = guruQuery.eq('sekolah_id', sekolahId);
    }
    const { data: teachers } = await guruQuery;
    if (!teachers || teachers.length === 0) continue;

    // Query school attendance policy & exempt teachers list from pengaturan
    let pengaturanQuery = supabase.from('pengaturan').select('key, value, aturan_kehadiran_guru');
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      pengaturanQuery = pengaturanQuery.eq('sekolah_id', sekolahId);
    }
    const { data: pengaturanRows } = await pengaturanQuery;
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

    const isExemptTeacher = (t: any) => {
      if (!t) return false;
      if (t.wajib_hadir_hanya_mengajar) return true;
      if (isGlobalHariMengajarSaja) return true;
      if (guruHanyaMengajarList.includes(t.id) || guruHanyaMengajarList.includes(t.nama_guru) || (t.nip && guruHanyaMengajarList.includes(t.nip))) return true;
      return false;
    };

    // B. Fetch schedule for today
    let scheduleQuery = supabase.from('jadwal_pelajaran').select('*').eq('hari', todayDay);
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      scheduleQuery = scheduleQuery.eq('sekolah_id', sekolahId);
    }
    const { data: schedules } = await scheduleQuery;
    const scheduleList = schedules || [];

    // C. Fetch presensi for today (Datang)
    let presensiQuery = supabase
      .from('presensi_guru')
      .select('*')
      .ilike('timestamp', `${todayStr}%`)
      .eq('tipe_absen', 'Datang');
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      presensiQuery = presensiQuery.eq('sekolah_id', sekolahId);
    }
    const { data: presensiList } = await presensiQuery;
    const checkedInSet = new Set((presensiList || []).map(p => (p.nama_guru || '').toLowerCase().trim()));

    // D. Fetch journals for today
    let jurnalQuery = supabase.from('jurnal_pembelajaran').select('*').eq('tanggal', todayStr);
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      jurnalQuery = jurnalQuery.eq('sekolah_id', sekolahId);
    }
    const { data: journals } = await jurnalQuery;
    const journalList = journals || [];

    // E. Fetch piket assignment and reports for today
    let penugasanQuery = supabase
      .from('penugasan_piket')
      .select('*')
      .eq('hari', todayDay)
      .eq('tipe_petugas', 'Guru');
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      penugasanQuery = penugasanQuery.eq('sekolah_id', sekolahId);
    }
    const { data: piketAssigned } = await penugasanQuery;
    const assignedPiketList = piketAssigned || [];

    let piketLaporanQuery = supabase.from('laporan_piket').select('*').eq('tanggal', todayStr);
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      piketLaporanQuery = piketLaporanQuery.eq('sekolah_id', sekolahId);
    }
    const { data: piketReports } = await piketLaporanQuery;
    const reportedPiketSet = new Set(
      (piketReports || []).map(r => (r.guru_pelapor || r.kehadiran_guru_piket || '').toLowerCase().trim())
    );

    // F. Fetch active sistem_blok for this school and today
    let blokQuery = supabase
      .from('sistem_blok')
      .select('*')
      .lte('tanggal_mulai', todayStr)
      .gte('tanggal_selesai', todayStr)
      .order('created_at', { ascending: false });
    if (sekolahId && sekolahId !== '00000000-0000-0000-0000-000000000000') {
      blokQuery = blokQuery.eq('sekolah_id', sekolahId);
    }
    const { data: activeBloks } = await blokQuery;
    const activeBlok = activeBloks && activeBloks.length > 0 ? activeBloks[0] : null;

    // -------------------------------------------------------------
    // Task 1: Check Datang Presensi
    // -------------------------------------------------------------
    for (const teacher of teachers) {
      const tName = (teacher.nama_guru || '').trim();
      const tNameLower = tName.toLowerCase();
      const hasCheckedIn = checkedInSet.has(tNameLower);

      if (!hasCheckedIn) {
        // If teacher is exempt on non-teaching days, check if they have schedule today
        if (teacher.wajib_hadir_hanya_mengajar) {
          const hasTeachingToday = scheduleList.some(s => {
            const sName = (s.nama_guru || '').toLowerCase().trim();
            return sName === tNameLower || tNameLower.includes(sName) || sName.includes(tNameLower);
          });
          if (!hasTeachingToday) {
            // Teacher is exempt today, skip reminder
            continue;
          }
        } else if (isExemptTeacher(teacher)) {
          const hasTeachingToday = scheduleList.some(s => {
            const sName = (s.nama_guru || '').toLowerCase().trim();
            return sName === tNameLower || tNameLower.includes(sName) || sName.includes(tNameLower);
          });
          if (!hasTeachingToday) {
            continue;
          }
        }

        reminders.push({
          guru_id: teacher.id,
          guru_nama: tName,
          sekolah_id: sekolahId,
          category: 'presensi',
          title: 'Pengingat Presensi Datang',
          body: `Halo ${tName}, Anda belum melakukan Presensi Datang untuk hari ${todayDay}. Harap segera melakukan presensi selfie.`,
          url: '/?view=view-guru-presensi'
        });
      }
    }

    // -------------------------------------------------------------
    // Task 2: Check Journals (KBM vs Sistem Blok)
    // -------------------------------------------------------------
    for (const teacher of teachers) {
      const tName = (teacher.nama_guru || '').trim();
      const tNameLower = tName.toLowerCase();

      if (activeBlok) {
        // Teachers exempt on non-teaching days do not need to fill block journals if they have no classes today
        if (teacher.wajib_hadir_hanya_mengajar) {
          const hasTeachingToday = scheduleList.some(s => {
            const sName = (s.nama_guru || '').toLowerCase().trim();
            return sName === tNameLower || tNameLower.includes(sName) || sName.includes(tNameLower);
          });
          if (!hasTeachingToday) {
            continue;
          }
        } else if (isExemptTeacher(teacher)) {
          const hasTeachingToday = scheduleList.some(s => {
            const sName = (s.nama_guru || '').toLowerCase().trim();
            return sName === tNameLower || tNameLower.includes(sName) || sName.includes(tNameLower);
          });
          if (!hasTeachingToday) {
            continue;
          }
        }

        // On a block day, regular KBM is replaced with special activity.
        // Teacher needs to submit 1 Jurnal Kegiatan.
        const hasSubmittedBlokJurnal = journalList.some(j => {
          const jName = (j.nama_guru || '').toLowerCase().trim();
          const isThisTeacher = jName === tNameLower || tNameLower.includes(jName) || jName.includes(tNameLower);
          if (!isThisTeacher) return false;
          if (j.status_verifikasi === 'Ditolak') return false;
          return j.keterangan === 'Jurnal Kegiatan' || j.mapel === 'Jurnal Kegiatan' || (!j.kelas || j.kelas === '-');
        });

        if (!hasSubmittedBlokJurnal) {
          reminders.push({
            guru_id: teacher.id,
            guru_nama: tName,
            sekolah_id: sekolahId,
            category: 'jurnal',
            title: 'Pengingat Jurnal Kegiatan (Sistem Blok)',
            body: `Halo ${tName}, hari ini berlaku Sistem Blok (${activeBlok.nama_kegiatan}). Mohon lengkapi Jurnal Kegiatan Anda.`,
            url: '/?view=view-guru-jurnal'
          });
        }
      } else {
        // Find scheduled classes for this teacher today
        const teacherSchedules = scheduleList.filter(s => {
          const sName = (s.nama_guru || '').toLowerCase().trim();
          return sName === tNameLower || tNameLower.includes(sName) || sName.includes(tNameLower);
        });

        if (teacherSchedules.length > 0) {
          // Teacher has classes today! Check if journals exist
          const submittedCount = journalList.filter(j => {
            const jName = (j.nama_guru || '').toLowerCase().trim();
            if (j.status_verifikasi === 'Ditolak') return false;
            return jName === tNameLower || tNameLower.includes(jName) || jName.includes(tNameLower);
          }).length;

          if (submittedCount < teacherSchedules.length) {
            reminders.push({
              guru_id: teacher.id,
              guru_nama: tName,
              sekolah_id: sekolahId,
              category: 'jurnal',
              title: 'Pengingat Jurnal Mengajar',
              body: `Halo ${tName}, Anda memiliki ${teacherSchedules.length} jam mengajar hari ini (${submittedCount} selesai). Mohon lengkapi jurnal KBM Anda.`,
              url: '/?view=view-guru-jurnal'
            });
          }
        }
      }
    }

    // -------------------------------------------------------------
    // Task 3: Check Piket Reports
    // -------------------------------------------------------------
    for (const assigned of assignedPiketList) {
      const pName = (assigned.guru_nama || '').trim();
      const pNameLower = pName.toLowerCase();

      const hasReported = Array.from(reportedPiketSet).some(
        rep => rep === pNameLower || rep.includes(pNameLower) || pNameLower.includes(rep)
      );

      if (!hasReported) {
        if (activeBlok) {
          const teacherObj = teachers.find(t => (t.nama_guru || '').toLowerCase().trim() === pNameLower);
          if (teacherObj?.wajib_hadir_hanya_mengajar || (teacherObj && isExemptTeacher(teacherObj))) {
            const hasTeachingToday = scheduleList.some(s => {
              const sName = (s.nama_guru || '').toLowerCase().trim();
              return sName === pNameLower || pNameLower.includes(sName) || sName.includes(pNameLower);
            });
            if (!hasTeachingToday) {
              continue;
            }
          }
        }

        reminders.push({
          guru_id: assigned.guru_id || assigned.id,
          guru_nama: pName,
          sekolah_id: sekolahId,
          category: 'piket',
          title: 'Pengingat Laporan Piket',
          body: `Halo ${pName}, Anda bertugas piket hari ini (${todayDay}). Mohon lengkapi dan kirimkan laporan piket harian Anda.`,
          url: '/?view=view-piket'
        });
      }
    }
  }

  return { reminders, todayStr, todayDay };
}

export async function GET(req: NextRequest) {
  try {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date') || undefined;
    const dayParam = searchParams.get('day') || undefined;
    const sekolahParam = searchParams.get('sekolah_id') || undefined;
    const dryRun = searchParams.get('dry_run') === 'true';

    const result = await checkMissingTasks(dateParam, dayParam, sekolahParam);
    const { reminders, todayStr, todayDay } = result;

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        date: todayStr,
        day: todayDay,
        totalReminders: reminders.length,
        reminders
      });
    }

    // Dispatch Web Push Notifications
    let sentCount = 0;
    let failCount = 0;

    // Fetch active push subscriptions
    let subQuery = supabase.from('push_subscriptions').select('*');
    if (sekolahParam) {
      subQuery = subQuery.eq('sekolah_id', sekolahParam);
    }
    const { data: subscriptions } = await subQuery;
    const subList = subscriptions || [];

    for (const reminder of reminders) {
      // Find matching subscriptions by user_id or user_nama
      const matchedSubs = subList.filter(s => {
        if (s.sekolah_id && s.sekolah_id !== reminder.sekolah_id) return false;
        if (s.user_id && s.user_id === reminder.guru_id) return true;
        if (s.user_nama && s.user_nama.toLowerCase().trim() === reminder.guru_nama.toLowerCase().trim()) return true;
        return false;
      });

      for (const sub of matchedSubs) {
        const pushPayload: PushNotificationPayload = {
          title: reminder.title,
          body: reminder.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          url: reminder.url,
          data: {
            category: reminder.category,
            guru_id: reminder.guru_id,
            timestamp: new Date().toISOString()
          }
        };

        try {
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload
          );
          sentCount++;
        } catch (err: any) {
          console.error(`[send-reminders] Push failed for ${reminder.guru_nama}:`, err.message);
          failCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      day: todayDay,
      summary: {
        totalMissingTasks: reminders.length,
        presensiReminders: reminders.filter(r => r.category === 'presensi').length,
        jurnalReminders: reminders.filter(r => r.category === 'jurnal').length,
        piketReminders: reminders.filter(r => r.category === 'piket').length,
        pushesSent: sentCount,
        pushErrors: failCount
      },
      reminders
    });
  } catch (err: any) {
    console.error('[API /api/push/send-reminders] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

    const body = await req.json().catch(() => ({}));
    const { date, day, sekolah_id, dry_run } = body;

    const result = await checkMissingTasks(date, day, sekolah_id);
    const { reminders, todayStr, todayDay } = result;

    if (dry_run) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        date: todayStr,
        day: todayDay,
        totalReminders: reminders.length,
        reminders
      });
    }

    // Dispatch Web Push Notifications
    let sentCount = 0;
    let failCount = 0;

    let subQuery = supabase.from('push_subscriptions').select('*');
    if (sekolah_id) {
      subQuery = subQuery.eq('sekolah_id', sekolah_id);
    }
    const { data: subscriptions } = await subQuery;
    const subList = subscriptions || [];

    for (const reminder of reminders) {
      const matchedSubs = subList.filter(s => {
        if (s.sekolah_id && s.sekolah_id !== reminder.sekolah_id) return false;
        if (s.user_id && s.user_id === reminder.guru_id) return true;
        if (s.user_nama && s.user_nama.toLowerCase().trim() === reminder.guru_nama.toLowerCase().trim()) return true;
        return false;
      });

      for (const sub of matchedSubs) {
        const pushPayload: PushNotificationPayload = {
          title: reminder.title,
          body: reminder.body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          url: reminder.url,
          data: {
            category: reminder.category,
            guru_id: reminder.guru_id,
            timestamp: new Date().toISOString()
          }
        };

        try {
          await sendWebPush(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            pushPayload
          );
          sentCount++;
        } catch (err: any) {
          console.error(`[send-reminders] Push failed for ${reminder.guru_nama}:`, err.message);
          failCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: todayStr,
      day: todayDay,
      summary: {
        totalMissingTasks: reminders.length,
        presensiReminders: reminders.filter(r => r.category === 'presensi').length,
        jurnalReminders: reminders.filter(r => r.category === 'jurnal').length,
        piketReminders: reminders.filter(r => r.category === 'piket').length,
        pushesSent: sentCount,
        pushErrors: failCount
      },
      reminders
    });
  } catch (err: any) {
    console.error('[API /api/push/send-reminders] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

