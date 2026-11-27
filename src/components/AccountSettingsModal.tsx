'use client';

import React, { useState, useEffect } from 'react';
import { supabase, masterSupabase } from '@/lib/supabaseClient';
import { showToast } from '@/lib/toast';
import { AVATAR_LIST, renderUserAvatar } from '@/lib/avatars';
import {
  isPushNotificationSupported,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestNotification
} from '@/lib/pushClient';
import {
  isReminderSnoozed,
  clearReminderSnooze,
  getReminderSnoozeRemainingMs,
  getReminderConfig,
  setReminderConfig
} from './TeacherReminderManager';
import { normalizeName, isForbiddenName, isDummyOrTestString } from '@/lib/dataIntegrityGuard';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onUserUpdated?: (updatedUser: any) => void;
}

export default function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onUserUpdated
}: AccountSettingsModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<string>(user?.avatar || 'avatar_1');
  const [nama, setNama] = useState<string>(user?.nama || '');
  const [username, setUsername] = useState<string>(user?.username || '');

  // Password fields
  const [changePassword, setChangePassword] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Push notification state
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);

  // Reminder state
  const [autoReminderEnabled, setAutoReminderEnabled] = useState<boolean>(true);
  const [autoReminderInterval, setAutoReminderInterval] = useState<number>(5);
  const [snoozeRemainingMinutes, setSnoozeRemainingMinutes] = useState<number>(0);

  // AI Assistant floating button visibility state
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return localStorage.getItem('sipjam_ai_assistant_visible') !== 'false';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    try {
      setShowAiAssistant(localStorage.getItem('sipjam_ai_assistant_visible') !== 'false');
    } catch {}

    const handleAiVis = (e: any) => {
      const v = e?.detail?.visible;
      if (typeof v === 'boolean') {
        setShowAiAssistant(v);
      }
    };
    window.addEventListener('sipjam:ai_assistant_visibility', handleAiVis);
    return () => window.removeEventListener('sipjam:ai_assistant_visibility', handleAiVis);
  }, [isOpen]);

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setSelectedAvatar(user.avatar || 'avatar_1');
      const initialNama = user.nama || '';
      setNama(initialNama);
      setUsername(user.username || '');
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      try {
        // Reads from sipjam_reminder_enabled_${user.id} and sipjam_reminder_interval_${user.id}
        const cfg = getReminderConfig(user.id);
        setAutoReminderEnabled(cfg.enabled);
        setAutoReminderInterval(cfg.intervalMinutes);
        if (isReminderSnoozed(user.id)) {
          const remMs = getReminderSnoozeRemainingMs(user.id);
          setSnoozeRemainingMinutes(Math.max(1, Math.ceil(remMs / 60000)));
        } else {
          setSnoozeRemainingMinutes(0);
        }
      } catch {}
    }
  }, [user, isOpen]);

  // Real-time sync for reminder settings and snooze status across tabs/components
  useEffect(() => {
    if (!user || !isOpen) return;

    const refreshReminderState = () => {
      try {
        // Reads from sipjam_reminder_enabled_${user.id} and sipjam_reminder_interval_${user.id}
        const cfg = getReminderConfig(user.id);
        setAutoReminderEnabled(cfg.enabled);
        setAutoReminderInterval(cfg.intervalMinutes);
        if (isReminderSnoozed(user.id)) {
          const remMs = getReminderSnoozeRemainingMs(user.id);
          setSnoozeRemainingMinutes(Math.max(1, Math.ceil(remMs / 60000)));
        } else {
          setSnoozeRemainingMinutes(0);
        }
      } catch {}
    };

    const ticker = setInterval(() => {
      if (user.id && isReminderSnoozed(user.id)) {
        const remMs = getReminderSnoozeRemainingMs(user.id);
        setSnoozeRemainingMinutes(Math.max(1, Math.ceil(remMs / 60000)));
      } else {
        setSnoozeRemainingMinutes(0);
      }
    }, 15000);

    window.addEventListener('sipjam_reminder_config_changed', refreshReminderState);
    window.addEventListener('storage', refreshReminderState);

    return () => {
      clearInterval(ticker);
      window.removeEventListener('sipjam_reminder_config_changed', refreshReminderState);
      window.removeEventListener('storage', refreshReminderState);
    };
  }, [user, isOpen]);

  const handleToggleReminder = (enabled: boolean) => {
    setAutoReminderEnabled(enabled);
    try {
      // Writes to sipjam_reminder_enabled_${user.id}
      setReminderConfig(user?.id, enabled, autoReminderInterval);
    } catch {}
  };

  const handleChangeReminderInterval = (interval: number) => {
    const validInterval = isNaN(interval) || interval < 1 ? 5 : interval;
    setAutoReminderInterval(validInterval);
    try {
      // Writes to sipjam_reminder_interval_${user.id}
      setReminderConfig(user?.id, autoReminderEnabled, validInterval);
    } catch {}
  };

  const handleCancelSnoozeFromModal = () => {
    clearReminderSnooze(user?.id);
    setSnoozeRemainingMinutes(0);
    try {
      window.dispatchEvent(new Event('sipjam_reminder_config_changed'));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    showToast('Tunda Dibatalkan', 'Pengingat otomatis akan aktif kembali.', 'info');
  };

  // Check push subscription on mount/open
  useEffect(() => {
    if (isOpen) {
      const supported = isPushNotificationSupported();
      setIsPushSupported(supported);
      if (supported) {
        getPushSubscription().then((sub) => {
          setIsPushSubscribed(!!sub);
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (isPushSubscribed) {
        const unsubscribed = await unsubscribeFromPushNotifications();
        if (unsubscribed) {
          setIsPushSubscribed(false);
          showToast('Notifikasi Dinonaktifkan', 'Perangkat ini tidak lagi menerima push notifikasi dari SIPJAM.', 'info');
        }
      } else {
        const result = await subscribeToPushNotifications(user);
        if (result.success) {
          setIsPushSubscribed(true);
          showToast('Push Notifikasi Aktif!', 'Perangkat Anda berhasil didaftarkan untuk menerima push notifikasi sistem.', 'success');
        } else {
          showToast('Gagal Mengaktifkan Notifikasi', result.error || 'Terjadi kesalahan.', 'error');
        }
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal mengubah status notifikasi', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      const result = await sendTestNotification();
      if (result.success) {
        showToast('Notifikasi Uji Coba Terkirim', 'Periksa baki notifikasi atau layar perangkat Anda.', 'success');
      } else {
        showToast('Gagal Mengirim Uji Coba', result.error || 'Terjadi kesalahan.', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message, 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const normalizedRole = (user?.role || '').toLowerCase();
  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'Admin' ||
    user?.role === 'superadmin' ||
    user?.role === 'Superadmin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'superadmin';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Format Salah', 'File yang diunggah harus berupa file gambar.', 'warning');
      return;
    }

    if (file.size > 1024 * 1024) {
      showToast('File Terlalu Besar', 'Maksimal ukuran foto adalah 1MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      showToast('Error', 'Data pengguna tidak valid.', 'error');
      return;
    }

    if (isAdmin && !username.trim()) {
      showToast('Validasi Gagal', 'Username tidak boleh kosong.', 'warning');
      return;
    }

    const effectiveCoreNama = (nama || '').trim();
    if (!effectiveCoreNama) {
      showToast('Validasi Gagal', 'Nama lengkap wajib diisi.', 'warning');
      return;
    }

    const cleanNama = normalizeName(effectiveCoreNama);
    const cleanUsername = (isAdmin ? username : (user.username || username || '')).trim();

    if (!cleanNama) {
      showToast('Validasi Gagal', 'Nama lengkap tidak boleh kosong.', 'warning');
      return;
    }

    if (cleanNama) {
      if (isForbiddenName(cleanNama)) {
        showToast(
          'Validasi Gagal',
          /\bFITRA[\s._-]+SURYAZANA[\s._-]+MAMONTO\b/.test(cleanNama)
            ? 'Gunakan format penulisan resmi Title Case: "Fitra Suryazana Mamonto".'
            : 'Nama tersebut telah dinonaktifkan dari sistem.',
          'warning'
        );
        return;
      }
      if (isDummyOrTestString(cleanNama)) {
        showToast('Validasi Gagal', 'Nama terdeteksi sebagai data percobaan/dummy.', 'warning');
        return;
      }
    }

    if (isAdmin && username) {
      if (isForbiddenName(cleanUsername)) {
        showToast('Validasi Gagal', 'Username tersebut telah dinonaktifkan dari sistem.', 'warning');
        return;
      }
      if (isDummyOrTestString(cleanUsername)) {
        showToast('Validasi Gagal', 'Username terdeteksi sebagai akun percobaan/dummy.', 'warning');
        return;
      }
    }

    // Password validation if requested
    if (changePassword) {
      if (!currentPassword) {
        showToast('Validasi Gagal', 'Password saat ini harus diisi.', 'warning');
        return;
      }

      // Check current password matches existing password in user object if available
      if (user.password && currentPassword !== user.password) {
        showToast('Validasi Gagal', 'Password saat ini tidak cocok dengan password lama.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showToast('Validasi Gagal', 'Password baru minimal 6 karakter.', 'warning');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('Validasi Gagal', 'Konfirmasi password baru tidak cocok.', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: {
        p_user_id: string;
        p_avatar: string;
        p_username: string;
        p_password: string | null;
        p_nama: string;
      } = {
        p_user_id: user.id,
        p_avatar: selectedAvatar,
        p_username: cleanUsername,
        p_password: changePassword ? newPassword : null,
        p_nama: cleanNama || user.nama
      };

      let { data, error } = await supabase.rpc('update_user_profile', payload);

      // Gracefully handle PostgREST schema cache error (e.g. PGRST202 or function not found)
      if (error && (
        error.code === 'PGRST202' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('Could not find the function')
      )) {
        console.warn('[AccountSettingsModal] RPC update_user_profile schema cache issue, attempting fallback:', error.message);

        // Fallback 1: Direct call to masterSupabase (bypassing any dynamic tenant / satellite rewriting)
        const masterRes = await masterSupabase.rpc('update_user_profile', payload);
        if (!masterRes.error) {
          data = masterRes.data;
          error = null;
        } else if (
          masterRes.error.code === 'PGRST202' ||
          masterRes.error.message?.includes('schema cache') ||
          masterRes.error.message?.includes('Could not find the function')
        ) {
          // Fallback 2: Direct update on users table via masterSupabase
          const directPayload: Record<string, any> = {
            avatar: selectedAvatar,
            nama: cleanNama || user.nama,
          };
          if (changePassword && newPassword) {
            directPayload.password = newPassword;
          }
          if (isAdmin && cleanUsername && cleanUsername !== user.username) {
            directPayload.username = cleanUsername;
          }

          const { error: directErr } = await masterSupabase
            .from('users')
            .update(directPayload)
            .eq('id', user.id);

          if (!directErr) {
            data = { success: true, message: 'Profil berhasil diperbarui.' };
            error = null;
          }
        }
      }

      if (error) {
        throw error;
      }

      const res = data as { success?: boolean; message?: string } | null;
      if (res && res.success === false) {
        showToast('Gagal Memperbarui', res.message || 'Terjadi kesalahan.', 'error');
        return;
      }

      // Update local storage
      const updatedUser = {
        ...user,
        avatar: selectedAvatar,
        nama: cleanNama || user.nama,
        username: cleanUsername,
      };

      try {
        localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
      } catch (storageErr) {
        console.warn('Failed to update localStorage:', storageErr);
      }

      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }

      try {
        // Persist sipjam_reminder_enabled_${user.id} and sipjam_reminder_interval_${user.id}
        setReminderConfig(user.id, autoReminderEnabled, autoReminderInterval);
      } catch {}

      showToast('Profil Berhasil Disimpan', 'Perubahan avatar, identitas, dan pengaturan akun telah disimpan.', 'success');

      onClose();
    } catch (err: any) {
      console.error('Update profile error:', err);
      showToast('Error', err.message || 'Gagal menyimpan perubahan profil.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 dark:bg-black/65 p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pengaturan Akun & Profil"
        onClick={(e) => e.stopPropagation()}
        className="clay-card neu-card bg-[#E6ECF2] dark:bg-[#1F242D] rounded-3xl w-full max-w-xl overflow-hidden my-auto max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-300/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full neu-inset p-0.5">
              {renderUserAvatar(selectedAvatar, 'w-full h-full')}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9]">Pengaturan Akun & Profil</h3>
              <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                {isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup pengaturan akun"
            onClick={onClose}
            className="neu-btn w-11 h-11 rounded-full flex items-center justify-center text-[#475569] dark:text-[#CBD5E1] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition shrink-0"
          >
            <i className="fa-solid fa-times text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Avatar Picker (12 Stylish Default Avatars + Custom Upload) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F172A] dark:text-[#F1F5F9]">
                Pilih Avatar Profil (12 Karakter Keren)
              </label>
              <label className="cursor-pointer neu-btn px-2.5 py-1 rounded-xl text-[11px] font-bold text-[#0F766E] dark:text-teal-400 flex items-center gap-1.5 transition">
                <i className="fa-solid fa-cloud-arrow-up text-xs"></i>
                <span>Unggah Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Custom Avatar preview card if image data URL or URL */}
            {selectedAvatar && (selectedAvatar.startsWith('data:image') || selectedAvatar.startsWith('http://') || selectedAvatar.startsWith('https://') || selectedAvatar.startsWith('/')) && (
              <div className="mb-2.5 p-2.5 neu-inset rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#0F766E] shrink-0">
                    <img src={selectedAvatar} alt="Avatar Kustom" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#0F766E] dark:text-teal-300 flex items-center gap-1">
                      <i className="fa-solid fa-check-circle text-[#0F766E] dark:text-teal-400 text-xs"></i> Foto Kustom Terpilih
                    </span>
                    <p className="text-[10px] text-[#475569] dark:text-[#94A3B8]">Foto profil kustom Anda siap disimpan.</p>
                  </div>
                </div>
                <label className="cursor-pointer neu-btn text-[10px] font-semibold text-[#0F766E] dark:text-teal-400 px-2.5 py-1 rounded-lg">
                  Ganti
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 p-3 neu-inset rounded-2xl">
              {AVATAR_LIST.map((item) => {
                const isSelected = selectedAvatar === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAvatar(item.id)}
                    title={item.name}
                    className={`relative p-1.5 rounded-xl flex flex-col items-center justify-center transition-all aspect-square ${
                      isSelected
                        ? 'neu-card-sm ring-2 ring-[#0F766E] dark:ring-teal-400 scale-[1.03]'
                        : 'hover:bg-white/35 dark:hover:bg-white/5 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
                      {item.svg('w-full h-full')}
                    </div>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0F766E] text-white rounded-full flex items-center justify-center text-[9px] shadow">
                        <i className="fa-solid fa-check"></i>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: User Details */}
          <div className="space-y-3">
            <div className={isAdmin ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
              <div>
                <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => {
                    setNama(e.target.value);
                  }}
                  placeholder="Contoh: Fitri Aprilia Dotulong"
                  required
                  className="neu-input w-full px-3 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                    Username (Login)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="neu-input w-full px-3 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Section 3: Change Password Toggle */}
          <div className="neu-inset rounded-2xl p-3.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="rounded border-slate-400 text-[#0F766E] focus:ring-[#0F766E] w-4 h-4"
                />
                <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                  <i className="fa-solid fa-key text-xs text-amber-600 dark:text-amber-400"></i> Ganti Password Akun
                </span>
              </label>
              {changePassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] flex items-center gap-1"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              )}
            </div>

            {changePassword && (
              <div className="mt-3.5 space-y-3 pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                    Password Saat Ini
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password lama Anda"
                    required={changePassword}
                    autoComplete="current-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="neu-input w-full px-3 py-2 text-[16px] sm:text-xs appearance-none rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                      Password Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required={changePassword}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="neu-input w-full px-3 py-2 text-[16px] sm:text-xs appearance-none rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required={changePassword}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="neu-input w-full px-3 py-2 text-[16px] sm:text-xs appearance-none rounded-xl text-[#0F172A] dark:text-[#F1F5F9]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Web Push Notification Control */}
          <div className="neu-card-sm rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="neu-inset w-9 h-9 rounded-xl text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-bell text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Push Notifikasi Web (VAPID)</h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
                    {isPushSupported
                      ? isPushSubscribed
                        ? 'Perangkat ini terhubung ke layanan push SIPJAM.'
                        : 'Dapatkan pemberitahuan jadwal, verifikasi, dan pengumuman sekolah secara instan.'
                      : 'Browser atau perangkat ini belum mendukung Web Push Notification.'}
                  </p>
                </div>
              </div>

              {isPushSupported && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={pushLoading}
                    onClick={handleTogglePush}
                    className={`neu-btn px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 ${
                      isPushSubscribed
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'neu-btn-primary text-white'
                    }`}
                  >
                    {pushLoading ? (
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    ) : isPushSubscribed ? (
                      <>
                        <i className="fa-solid fa-check text-xs"></i> Aktif
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-bell text-xs"></i> Aktifkan
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {isPushSubscribed && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-300/60 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Layanan push siap menerima pesan
                </span>
                <button
                  type="button"
                  disabled={pushLoading}
                  onClick={handleTestPush}
                  className="text-[11px] font-bold text-[#0F766E] dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-paper-plane text-[10px]"></i> Kirim Uji Coba
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Auto Reminder Control */}
          <div className="neu-card-sm rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 w-full">
                <div className="neu-inset w-9 h-9 rounded-xl text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Pengingat Otomatis (In-App)</h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5 mb-2.5">
                    Tampilkan pop-up pengingat presensi dan jurnal mengajar di dalam aplikasi.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 neu-inset p-2.5 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={autoReminderEnabled}
                          onChange={(e) => handleToggleReminder(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 neu-inset rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-slate-200 after:rounded-full after:h-4 after:w-4 after:shadow-xs after:transition-all peer-checked:bg-amber-600 dark:peer-checked:bg-amber-500"></div>
                      </div>
                      <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                        {autoReminderEnabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>

                    {autoReminderEnabled && (
                      <>
                        <div className="hidden sm:block w-px h-6 bg-slate-300/70 dark:bg-slate-700/70"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-[#334155] dark:text-[#CBD5E1]">Jeda Waktu:</span>
                          <select
                            value={autoReminderInterval}
                            onChange={(e) => handleChangeReminderInterval(Number(e.target.value))}
                            className="neu-input text-[11px] px-2.5 py-1 rounded-lg text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer"
                          >
                            <option value={1}>1 Menit</option>
                            <option value={3}>3 Menit</option>
                            <option value={5}>5 Menit (Default)</option>
                            <option value={10}>10 Menit</option>
                            <option value={15}>15 Menit</option>
                            <option value={30}>30 Menit</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  {snoozeRemainingMinutes > 0 && (
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-xl neu-inset border border-amber-500/25 mt-2.5">
                      <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                        <i className="fa-solid fa-clock-rotate-left text-amber-600 dark:text-amber-400"></i>
                        <span>Pengingat sedang ditunda (~{snoozeRemainingMinutes} menit tersisa)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSnoozeFromModal}
                        className="neu-btn neu-btn-amber px-2.5 py-1 rounded-lg text-[10px] font-bold transition shrink-0 ml-auto sm:ml-0"
                        title="Batalkan status tunda pengingat"
                      >
                        Batalkan Tunda
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: AI Assistant Display Preference */}
          <div className="neu-card-sm rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="neu-inset w-9 h-9 rounded-xl text-[#0F766E] dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-robot text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Tombol Asisten AI</h4>
                  <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
                    Tampilkan tombol mengambang Asisten AI di sudut kanan bawah aplikasi.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showAiAssistant}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowAiAssistant(checked);
                    try {
                      localStorage.setItem('sipjam_ai_assistant_visible', String(checked));
                    } catch {}
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('sipjam:ai_assistant_visibility', { detail: { visible: checked } }));
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 neu-inset rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:after:bg-slate-200 after:rounded-full after:h-4 after:w-4 after:shadow-xs after:transition-all peer-checked:bg-[#0F766E] dark:peer-checked:bg-teal-500"></div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-300/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={onClose}
              className="clay-btn clay-btn-secondary px-4 py-2 text-xs font-semibold rounded-2xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="clay-btn clay-btn-primary px-5 py-2 text-xs font-bold text-white rounded-2xl transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-xs"></i> Menyimpan...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-save text-xs"></i> Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
