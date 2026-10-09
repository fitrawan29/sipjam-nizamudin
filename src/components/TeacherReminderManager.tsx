'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getGuruDailyState, isJurnalMatchJadwal, GuruDailyState } from '../lib/workflow';
import { getWitaTimeStr, getWitaDayName } from '../lib/wita';

export const REMINDER_INTERVAL_MS = 300_000; // 5 minutes in milliseconds
export const SNOOZE_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

const memoryStorage = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
  } catch {}
  return null;
}

export function safeGetStorageItem(key: string): string | null {
  try {
    const storage = getStorage();
    if (storage) {
      const val = storage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return memoryStorage.get(key) ?? null;
}

export function safeSetStorageItem(key: string, value: string): void {
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(key, value);
    }
  } catch {}
  memoryStorage.set(key, value);
}

export function safeRemoveStorageItem(key: string): void {
  try {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(key);
    }
  } catch {}
  memoryStorage.delete(key);
}

/**
 * Storage key helper for 30-minute reminder snooze per teacher
 */
export function getSnoozeKey(userId?: string): string {
  return `sipjam_reminder_snooze_until_${userId || 'default'}`;
}

export function getReminderEnabledKey(userId?: string): string {
  return `sipjam_reminder_enabled_${userId || 'default'}`;
}

export function getReminderIntervalKey(userId?: string): string {
  return `sipjam_reminder_interval_${userId || 'default'}`;
}

/**
 * Checks whether reminder notifications are currently snoozed for the user
 */
export function isReminderSnoozed(userId?: string): boolean {
  if (typeof window === 'undefined' && typeof localStorage === 'undefined') return false;
  try {
    const val = safeGetStorageItem(getSnoozeKey(userId));
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
  try {
    const expiry = Date.now() + minutes * 60 * 1000;
    safeSetStorageItem(getSnoozeKey(userId), String(expiry));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new Event('sipjam_reminder_config_changed'));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
    return expiry;
  } catch {
    return 0;
  }
}

/**
 * Cancels active notification snooze early
 */
export function clearReminderSnooze(userId?: string): void {
  try {
    safeRemoveStorageItem(getSnoozeKey(userId));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new Event('sipjam_reminder_config_changed'));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns remaining milliseconds of snooze if active, 0 otherwise
 */
export function getReminderSnoozeRemainingMs(userId?: string): number {
  try {
    const val = safeGetStorageItem(getSnoozeKey(userId));
    if (!val) return 0;
    const expiry = parseInt(val, 10);
    if (isNaN(expiry)) return 0;
    const remaining = expiry - Date.now();
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}

export function getReminderConfig(userId?: string): { enabled: boolean; intervalMs: number; intervalMinutes: number } {
  try {
    const storedEnabled = safeGetStorageItem(getReminderEnabledKey(userId));
    const enabled = storedEnabled !== null ? storedEnabled === 'true' : true;
    const storedInterval = safeGetStorageItem(getReminderIntervalKey(userId));
    const intervalMinutes = storedInterval ? parseInt(storedInterval, 10) : 5;
    const validMinutes = isNaN(intervalMinutes) || intervalMinutes < 1 ? 5 : intervalMinutes;
    return {
      enabled,
      intervalMs: validMinutes * 60 * 1000,
      intervalMinutes: validMinutes,
    };
  } catch {
    return { enabled: true, intervalMs: 300_000, intervalMinutes: 5 };
  }
}

export function setReminderConfig(
  userId: string | undefined,
  enabled: boolean,
  intervalMinutes?: number
): void {
  try {
    safeSetStorageItem(getReminderEnabledKey(userId), String(enabled));
    if (intervalMinutes !== undefined) {
      safeSetStorageItem(getReminderIntervalKey(userId), String(intervalMinutes));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new Event('sipjam_reminder_config_changed'));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  } catch {}
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
  // Positive role verification: Active ONLY for teachers (guru / teacher)
  const normRole = (user?.role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isSuperadmin = normRole === 'superadmin';
  const isAdmin = isSuperadmin || normRole === 'admin' || normRole === 'administrator';
  const isGuru = Boolean(user && !isAdmin && !isSuperadmin && (normRole === 'guru' || normRole === 'teacher'));

  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSnoozed, setIsSnoozed] = useState<boolean>(() => isReminderSnoozed(user?.id));
  const lastCheckTimestampRef = useRef<number>(0);

  const [reminderConfig, setReminderConfig] = useState(() => getReminderConfig(user?.id));

  // Read config on mount and when tab becomes visible
  const loadReminderConfig = useCallback(() => {
    return getReminderConfig(user?.id);
  }, [user?.id]);

  // Reset all states cleanly when user changes (multi-user isolation)
  useEffect(() => {
    setReminders([]);
    setCurrentIndex(0);
    setIsDismissed(false);
    setIsSnoozed(isReminderSnoozed(user?.id));
    setReminderConfig(getReminderConfig(user?.id));
  }, [user?.id]);

  const checkReminders = useCallback(async () => {
    if (!isGuru || !user) return;
    
    // Check if user disabled auto reminders entirely
    const currentConfig = getReminderConfig(user?.id);
    if (!currentConfig.enabled) {
      setReminders([]);
      return;
    }

    // 0. Check snooze status before evaluating or firing notifications
    if (isReminderSnoozed(user?.id)) {
      setIsSnoozed(true);
      setReminders([]);
      return;
    }
    setIsSnoozed(false);

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
  }, [isGuru, user]);

  // Effect 1: Persistent event listeners for real-time config/snooze changes across tabs & modal
  useEffect(() => {
    if (!isGuru) return;

    const handleConfigChange = () => {
      const cfg = getReminderConfig(user?.id);
      setReminderConfig(cfg);
      if (!cfg.enabled) {
        setReminders([]);
        return;
      }
      if (isReminderSnoozed(user?.id)) {
        setIsSnoozed(true);
        setReminders([]);
      } else {
        setIsSnoozed(false);
        checkReminders();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentConfig = getReminderConfig(user?.id);
        setReminderConfig(currentConfig);
        if (!currentConfig.enabled) {
          setReminders([]);
          return;
        }
        if (isReminderSnoozed(user?.id)) {
          setIsSnoozed(true);
          setReminders([]);
        } else {
          setIsSnoozed(false);
          const elapsed = Date.now() - lastCheckTimestampRef.current;
          if (elapsed > 60_000) {
            checkReminders();
          }
        }
      }
    };

    window.addEventListener('sipjam_reminder_config_changed', handleConfigChange);
    window.addEventListener('storage', handleConfigChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('sipjam_reminder_config_changed', handleConfigChange);
      window.removeEventListener('storage', handleConfigChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isGuru, user?.id, checkReminders]);

  // Effect 2: Recurring evaluation intervals and exact 30-min snooze expiration timer
  useEffect(() => {
    if (!isGuru) return;

    if (!reminderConfig.enabled) {
      setReminders([]);
      return;
    }

    const snoozed = isReminderSnoozed(user?.id);
    setIsSnoozed(snoozed);

    let snoozeTimer: NodeJS.Timeout | null = null;
    let initialTimer: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;

    if (snoozed) {
      setReminders([]);
      // Precision wake-up timer when 30-minute snooze window ends (+100ms safety buffer)
      const remainingMs = getReminderSnoozeRemainingMs(user?.id);
      if (remainingMs > 0) {
        snoozeTimer = setTimeout(() => {
          setIsSnoozed(false);
          checkReminders();
        }, remainingMs + 100);
      }
    } else {
      // Run initial check shortly after mount
      initialTimer = setTimeout(() => {
        checkReminders();
      }, 2500);

      // Setup dynamic recurring evaluation interval
      intervalId = setInterval(() => {
        checkReminders();
      }, reminderConfig.intervalMs);
    }

    return () => {
      if (snoozeTimer) clearTimeout(snoozeTimer);
      if (initialTimer) clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isGuru, user?.id, checkReminders, reminderConfig.enabled, reminderConfig.intervalMs, isSnoozed]);

  if (!isGuru) {
    return null;
  }

  // If user disabled auto reminders entirely, render nothing
  if (!reminderConfig.enabled) {
    return null;
  }

  // Cancel / early toggle off snooze handler
  const handleCancelSnooze = () => {
    clearReminderSnooze(user?.id);
    setIsSnoozed(false);
    setIsDismissed(false);
    checkReminders();
  };

  // When snoozed, floating reminder is completely hidden and will not reappear during the 30-minute duration
  const currentlySnoozed = isReminderSnoozed(user?.id);
  if (isSnoozed || isReminderSnoozed(user?.id)) {
    if (currentlySnoozed) {
      return (
        <div
          role="status"
          aria-label="Status Pengingat Ditunda"
          style={{ display: 'none' }}
          className="hidden max-w-[calc(100vw-2rem)] sm:max-w-xs"
        >
          <span>Pengingat ditunda 30m</span>
          <button
            type="button"
            onClick={handleCancelSnooze}
            title="Batalkan tunda pengingat"
          >
            Batalkan
          </button>
        </div>
      );
    }
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
    setIsSnoozed(true);
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
