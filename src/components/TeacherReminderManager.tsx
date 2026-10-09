'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getGuruDailyState, isJurnalMatchJadwal, GuruDailyState } from '../lib/workflow';
import { getWitaTimeStr, getWitaDayName } from '../lib/wita';

export const REMINDER_INTERVAL_MS = 300_000; // 5 minutes in milliseconds
export const SNOOZE_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Storage key helper for 30-minute reminder snooze per teacher
 */
export function getSnoozeKey(userId?: string): string {
  return `sipjam_reminder_snooze_until_${userId || 'default'}`;
}

/**
 * Checks whether reminder notifications are currently snoozed for the user
 */
export function isReminderSnoozed(userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(getSnoozeKey(userId));
    if (!val) return false;
    const expiry = parseInt(val, 10);
    if (isNaN(expiry)) return false;
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

/**
 * Activates notification snooze for specified minutes (default 30 min)
 */
export function setReminderSnooze(minutes = 30, userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const expiry = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(getSnoozeKey(userId), String(expiry));
    return expiry;
  } catch {
    return 0;
  }
}

/**
 * Cancels active notification snooze early
 */
export function clearReminderSnooze(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getSnoozeKey(userId));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns remaining milliseconds of snooze if active, 0 otherwise
 */
export function getReminderSnoozeRemainingMs(userId?: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(getSnoozeKey(userId));
    if (!val) return 0;
    const expiry = parseInt(val, 10);
    if (isNaN(expiry)) return 0;
    const remaining = expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export interface ReminderItem {
  id: 'presensi_datang' | 'jurnal' | 'piket' | 'presensi_pulang';
  category: 'presensi' | 'jurnal' | 'piket' | 'presensi_pulang';
  title: string;
  message: string;
  targetView: string;
  urgency?: 'normal' | 'warning' | 'urgent';
}

export interface ReminderConfig {
  jam_datang_mulai?: string;
  jam_datang_batas?: string;
  jam_datang_akhir?: string;
  jam_pulang_mulai?: string;
  jam_pulang_jumat?: string;
  jam_pulang_akhir?: string;
  [key: string]: any;
}

export interface TeacherReminderManagerProps {
  user: any;
  onNavigate: (viewId: string) => void;
}

/**
 * Pure helper to parse HH:MM (or HH.MM) into minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace('.', ':');
  const [h, m] = clean.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Pure evaluation function of the 4 conditions:
 * 1. Belum presensi datang (considering school check-in / late hours)
 * 2. Belum mengisi jurnal mengajar (KBM or Blok)
 * 3. Belum mengisi laporan piket (specifically for teachers assigned piket duty today)
 * 4. Belum presensi pulang (considering check-out hours)
 */
export function evaluateReminderConditions(
  dailyState: GuruDailyState,
  config: ReminderConfig,
  now: Date = new Date(),
  teacherObj?: any
): ReminderItem[] {
  const reminders: ReminderItem[] = [];

  // If the day is a holiday or teacher is on approved sick/permission leave, skip all reminders
  if (dailyState.isLibur || dailyState.isIzinSakit) {
    return reminders;
  }

  const isExempt = dailyState.isNonTeachingDay || Boolean(teacherObj?.wajib_hadir_hanya_mengajar);
  const hasClassesToday = Boolean(dailyState.jadwalKBM && dailyState.jadwalKBM.length > 0);

  const currentWitaTime = getWitaTimeStr(now);
  const currentMinutes = parseTimeToMinutes(currentWitaTime);
  const isJumat = getWitaDayName(now) === 'Jumat';

  const datangMulai = parseTimeToMinutes(config.jam_datang_mulai || '06:00');
  const datangBatas = parseTimeToMinutes(config.jam_datang_batas || '07:15');
  const datangAkhir = parseTimeToMinutes(config.jam_datang_akhir || '12:00');

  const pulangMulaiStr = isJumat
    ? (config.jam_pulang_jumat || config.jam_pulang_mulai || '11:00')
    : (config.jam_pulang_mulai || '14:00');
  const pulangMulai = parseTimeToMinutes(pulangMulaiStr);
  const pulangAkhir = parseTimeToMinutes(config.jam_pulang_akhir || '18:00');

  // Condition 1: Presensi Datang
  const needsDatang = !dailyState.presensiDatang || Boolean(dailyState.presensiDatangDitolak);
  if (needsDatang && (!isExempt || hasClassesToday)) {
    if (currentMinutes >= datangMulai && currentMinutes <= datangAkhir) {
      const isPastBatas = currentMinutes > datangBatas;
      reminders.push({
        id: 'presensi_datang',
        category: 'presensi',
        title: 'Pengingat Presensi Datang',
        message: isPastBatas
          ? `Waktu presensi telah melewati batas masuk (${config.jam_datang_batas || '07:15'} WITA). Harap segera lakukan presensi selfie.`
          : `Harap segera melakukan Presensi Datang selfie sebelum batas waktu (${config.jam_datang_batas || '07:15'} WITA).`,
        targetView: 'view-guru-presensi',
        urgency: isPastBatas ? 'warning' : 'normal',
      });
    }
  }

  // Condition 2: Jurnal Mengajar
  if (!isExempt || hasClassesToday) {
    if (dailyState.isBlok) {
      // In block system, 1 Jurnal Kegiatan is required
      if (!dailyState.jurnalKegiatan) {
        reminders.push({
          id: 'jurnal',
          category: 'jurnal',
          title: 'Pengingat Jurnal Kegiatan (Sistem Blok)',
          message: `Hari ini berlaku Sistem Blok (${dailyState.blokInfo?.nama_kegiatan || 'Khusus'}). Mohon lengkapi Jurnal Kegiatan Anda.`,
          targetView: 'view-guru-jurnal',
          urgency: 'normal',
        });
      }
    } else if (hasClassesToday) {
      // Regular teaching day: verify if all scheduled classes have matching journals
      const missingSchedules = dailyState.jadwalKBM.filter(
        jk => !(dailyState.jurnalKBM || []).some(j => isJurnalMatchJadwal(j, jk))
      );
      if (missingSchedules.length > 0) {
        const total = dailyState.jadwalKBM.length;
        const missing = missingSchedules.length;
        const done = total - missing;
        reminders.push({
          id: 'jurnal',
          category: 'jurnal',
          title: 'Pengingat Jurnal Mengajar',
          message: `Anda memiliki ${total} jam mengajar hari ini (${done} selesai, ${missing} belum terisi). Mohon lengkapi jurnal mengajar Anda.`,
          targetView: 'view-guru-jurnal',
          urgency: 'normal',
        });
      }
    }
  }

  // Condition 3: Laporan Piket (specifically for teachers assigned piket duty today)
  if (dailyState.isPiket) {
    const needsPiketReport = !dailyState.laporanPiket || Boolean(dailyState.laporanPiketDitolak);
    if (needsPiketReport) {
      // If block system active and teacher is exempt with no teaching today, don't require piket
      if (!(dailyState.isBlok && isExempt && !hasClassesToday)) {
        reminders.push({
          id: 'piket',
          category: 'piket',
          title: 'Pengingat Laporan Piket',
          message: 'Anda bertugas piket hari ini dan belum mengirimkan laporan piket harian.',
          targetView: 'view-piket',
          urgency: 'normal',
        });
      }
    }
  }

  // Condition 4: Presensi Pulang
  const needsPulang = !dailyState.presensiPulang || Boolean(dailyState.presensiPulangDitolak);
  if (needsPulang && (!isExempt || hasClassesToday)) {
    // Only remind if within or past the checkout window
    if (currentMinutes >= pulangMulai && currentMinutes <= pulangAkhir) {
      reminders.push({
        id: 'presensi_pulang',
        category: 'presensi_pulang',
        title: 'Pengingat Presensi Pulang',
        message: `Jam pulang telah tiba (${pulangMulaiStr} WITA). Harap lakukan presensi pulang sebelum meninggalkan sekolah.`,
        targetView: 'view-guru-presensi',
        urgency: 'warning',
      });
    }
  }

  return reminders;
}

/**
 * Positive role verification helper: Active ONLY for teachers (guru / teacher)
 */
export function computeRoleFlags(user?: { role?: string; [key: string]: unknown } | null) {
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isAdmin = isSuperadmin || normRole === 'admin' || normRole === 'administrator';
  const isGuru = Boolean(user && !isAdmin && !isSuperadmin && (normRole === 'guru' || normRole === 'teacher'));
  return { isSuperadmin, isAdmin, isGuru };
}

export function TeacherReminderManager({ user, onNavigate }: TeacherReminderManagerProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const lastCheckTimestampRef = useRef<number>(0);

  const [reminderConfig, setReminderConfig] = useState({ enabled: true, intervalMs: 300_000 });

  // Read config on mount and when tab becomes visible
  const loadReminderConfig = useCallback(() => {
    if (!user?.id) return { enabled: true, intervalMs: 300_000 };
    try {
      const storedEnabled = localStorage.getItem(`sipjam_reminder_enabled_${user.id}`);
      const enabled = storedEnabled !== null ? storedEnabled === 'true' : true;
      const storedInterval = localStorage.getItem(`sipjam_reminder_interval_${user.id}`);
      const intervalMs = storedInterval ? parseInt(storedInterval, 10) * 60 * 1000 : 300_000;
      return { enabled, intervalMs: isNaN(intervalMs) || intervalMs < 60000 ? 300_000 : intervalMs };
    } catch {
      return { enabled: true, intervalMs: 300_000 };
    }
  }, [user?.id]);

  useEffect(() => {
    setReminderConfig(loadReminderConfig());
  }, [loadReminderConfig]);

  // Positive role verification: Active ONLY for teachers (guru / teacher)
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isAdmin = isSuperadmin || normRole === 'admin' || normRole === 'administrator';
  const isGuru = Boolean(user && !isAdmin && !isSuperadmin && (normRole === 'guru' || normRole === 'teacher'));

  const checkReminders = useCallback(async () => {
    if (!isGuru || !user) return;
    
    // Check if user disabled auto reminders entirely
    const currentConfig = loadReminderConfig();
    if (!currentConfig.enabled) {
      setReminders([]);
      return;
    }

    // 0. Check snooze status before evaluating or firing notifications
    if (isReminderSnoozed(user?.id)) {
      setReminders([]);
      return;
    }

    try {
      // 1. Fetch school hours configuration
      const { data: configData } = await supabase
        .from('pengaturan')
        .select('*')
        .in('key', [
          'jam_datang_mulai',
          'jam_datang_batas',
          'jam_datang_akhir',
          'jam_pulang_mulai',
          'jam_pulang_jumat',
          'jam_pulang_akhir',
        ]);

      const config: ReminderConfig = {
        jam_datang_mulai: '06:00',
        jam_datang_batas: '07:15',
        jam_datang_akhir: '12:00',
        jam_pulang_mulai: '14:00',
        jam_pulang_jumat: '11:00',
        jam_pulang_akhir: '18:00',
      };

      if (configData) {
        configData.forEach((item: any) => {
          if (item.key && item.value) {
            config[item.key] = item.value;
          }
        });
      }

      // 2. Fetch daily state via workflow engine
      const teacherName = user.nama || user.name || '';
      const dailyState = await getGuruDailyState(teacherName, user.username, user.id, user.sekolah_id);

      // 3. Evaluate the 4 conditions
      const activeReminders = evaluateReminderConditions(dailyState, config, new Date(), user);
      setReminders(activeReminders);
      setCurrentIndex(0);
      setIsDismissed(false); // Reset dismissal on each periodic check so new/unsolved warnings surface
      lastCheckTimestampRef.current = Date.now();

      // 4. Multi-channel delivery: Dispatch Web Notification if permission granted
      if (activeReminders.length > 0 && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          for (const item of activeReminders) {
            try {
              if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                await reg.showNotification(item.title, {
                  body: item.message,
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: `sipjam-reminder-${item.id}`,
                  data: { url: `/?view=${item.targetView}` },
                });
              } else {
                new Notification(item.title, {
                  body: item.message,
                  icon: '/favicon.ico',
                });
              }
            } catch (err) {
              console.warn('Native notification spawn failed:', err);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error evaluating teacher reminders:', err);
    }
  }, [isGuru, user, loadReminderConfig]);

  useEffect(() => {
    if (!isGuru) return;
    if (!reminderConfig.enabled) {
      setReminders([]);
      return;
    }

    // Run initial check shortly after mount
    const initialTimer = setTimeout(() => {
      checkReminders();
    }, 2500);

    // Setup dynamic recurring evaluation interval
    const intervalId = setInterval(() => {
      checkReminders();
    }, reminderConfig.intervalMs);

    // Also re-evaluate when tab becomes visible if at least 1 minute elapsed
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentConfig = loadReminderConfig();
        setReminderConfig(currentConfig); // Update state if changed in another tab
        const elapsed = Date.now() - lastCheckTimestampRef.current;
        if (elapsed > 60_000) {
          checkReminders();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isGuru, user, checkReminders, reminderConfig.enabled, reminderConfig.intervalMs, loadReminderConfig]);

  if (!isGuru) {
    return null;
  }

  if (reminders.length === 0 || isDismissed) {
    return null;
  }

  const activeItem = reminders[currentIndex] || reminders[0];
  const hasMultiple = reminders.length > 1;

  const handleAction = () => {
    if (activeItem?.targetView) {
      onNavigate(activeItem.targetView);
    }
    setIsDismissed(true);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % reminders.length);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  const handleSnooze = () => {
    setReminderSnooze(30, user?.id);
    setReminders([]);
    setIsDismissed(true);
  };

  return (
    <div
      role="region"
      aria-label="Pengingat Tugas Harian Guru"
      className="fixed bottom-20 left-4 sm:left-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-600/50 rounded-2xl shadow-2xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
          <i className="fa-solid fa-bell text-lg animate-bounce"></i>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pengingat Otomatis
            </span>
            {hasMultiple && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                {currentIndex + 1} dari {reminders.length}
              </span>
            )}
          </div>

          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
            {activeItem.title}
          </h4>

          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {activeItem.message}
          </p>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleAction}
              className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 min-w-[90px]"
            >
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
              Buka Menu
            </button>

            <button
              type="button"
              onClick={handleSnooze}
              title="Tunda pengingat selama 30 menit"
              className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/70 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-800 dark:text-amber-200 text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
            >
              <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
              Tunda 30 Menit
            </button>

            {hasMultiple && (
              <button
                type="button"
                onClick={handleNext}
                title="Lihat pengingat berikutnya"
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all shrink-0"
              >
                Lanjut
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              title="Tutup pengingat untuk 5 menit"
              className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs transition-all shrink-0"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherReminderManager;
