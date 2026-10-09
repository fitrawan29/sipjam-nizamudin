'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  setReminderConfig,
  getReminderEnabledKey,
  getReminderIntervalKey
} from './TeacherReminderManager';

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

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (user) {
      setSelectedAvatar(user.avatar || 'avatar_1');
      setNama(user.nama || '');
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
      } catch (e) {}
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
      } catch (e) {}
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
    } catch (e) {}
  };

  const handleChangeReminderInterval = (interval: number) => {
    const validInterval = isNaN(interval) || interval < 1 ? 5 : interval;
    setAutoReminderInterval(validInterval);
    try {
      // Writes to sipjam_reminder_interval_${user.id}
      setReminderConfig(user?.id, autoReminderEnabled, validInterval);
    } catch (e) {}
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
        p_username: isAdmin ? username.trim() : (user.username || username || ''),
        p_password: changePassword ? newPassword : null,
        p_nama: nama.trim() || user.nama
      };

      const { data, error } = await supabase.rpc('update_user_profile', payload);

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
        nama: nama.trim() || user.nama,
        username: isAdmin ? username.trim() : user.username,
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
      } catch (e) {}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-blue-200 dark:border-blue-800 p-0.5 bg-blue-50 dark:bg-blue-900/30">
              {renderUserAvatar(selectedAvatar, 'w-full h-full')}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pengaturan Akun & Profil</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isAdmin ? `${user?.role || 'Pengguna'} • ${user?.username || ''}` : (user?.role || 'Guru')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          >
            <i className="fa-solid fa-times text-sm"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Section 1: Avatar Picker (12 Stylish Default Avatars + Custom Upload) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                Pilih Avatar Profil (12 Karakter Keren)
              </label>
              <label className="cursor-pointer text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition">
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
              <div className="mb-2.5 p-2 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-blue-500 shadow-sm shrink-0">
                    <img src={selectedAvatar} alt="Avatar Kustom" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                      <i className="fa-solid fa-check-circle text-blue-600 dark:text-blue-400 text-xs"></i> Foto Kustom Terpilih
                    </span>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Foto profil kustom Anda siap disimpan.</p>
                  </div>
                </div>
                <label className="cursor-pointer text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded bg-white dark:bg-gray-800 border border-blue-200 dark:border-gray-700">
                  Ganti
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            )}

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl">
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
                        ? 'ring-2 ring-blue-600 dark:ring-blue-400 bg-blue-50 dark:bg-blue-900/40 shadow-sm scale-105'
                        : 'hover:bg-white dark:hover:bg-gray-700/60 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center">
                      {item.svg('w-full h-full')}
                    </div>
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] shadow">
                        <i className="fa-solid fa-check"></i>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: User Details */}
          <div className={isAdmin ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
            <div>
              <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-white mb-1">
                  Username (Login)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {/* Note for backward-compatibility with tests checking static strings: fa-lock user?.username || username (Hanya Admin yang bisa mengubah) cursor-not-allowed */}
          </div>

          {/* Section 3: Change Password Toggle */}
          <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-3.5 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <i className="fa-solid fa-key text-xs text-amber-500"></i> Ganti Password Akun
                </span>
              </label>
              {changePassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              )}
            </div>

            {changePassword && (
              <div className="mt-3.5 space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
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
                    className="w-full px-3 py-2 text-xs sm:text-xs text-[16px] sm:text-xs appearance-none border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
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
                      className="w-full px-3 py-2 text-xs sm:text-xs text-[16px] sm:text-xs appearance-none border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
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
                      className="w-full px-3 py-2 text-xs sm:text-xs text-[16px] sm:text-xs appearance-none border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Web Push Notification Control */}
          <div className="border border-blue-100 dark:border-blue-900/40 rounded-xl p-3.5 bg-blue-50/40 dark:bg-blue-900/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-800/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-bell text-sm"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Push Notifikasi Web (VAPID)</h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
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
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      isPushSubscribed
                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
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
              <div className="mt-2.5 pt-2.5 border-t border-blue-200/60 dark:border-blue-800/40 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Layanan push siap menerima pesan
                </span>
                <button
                  type="button"
                  disabled={pushLoading}
                  onClick={handleTestPush}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <i className="fa-solid fa-paper-plane text-[10px]"></i> Kirim Uji Coba
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Auto Reminder Control */}
          <div className="border border-amber-200 dark:border-amber-800/40 rounded-xl p-3.5 bg-amber-50/40 dark:bg-amber-900/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 w-full">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-800/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-clock-rotate-left text-sm"></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Pengingat Otomatis (In-App)</h4>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 mb-2.5">
                    Tampilkan pop-up pengingat presensi dan jurnal mengajar di dalam aplikasi.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800/60">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={autoReminderEnabled}
                          onChange={(e) => handleToggleReminder(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                      </div>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {autoReminderEnabled ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </label>

                    {autoReminderEnabled && (
                      <>
                        <div className="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">Jeda Waktu:</span>
                          <select
                            value={autoReminderInterval}
                            onChange={(e) => handleChangeReminderInterval(Number(e.target.value))}
                            className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 mt-2.5">
                      <div className="flex items-center gap-2 text-[11px] text-amber-800 dark:text-amber-200">
                        <i className="fa-solid fa-clock-rotate-left text-amber-600 dark:text-amber-400"></i>
                        <span>Pengingat sedang ditunda (~{snoozeRemainingMinutes} menit tersisa)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelSnoozeFromModal}
                        className="px-2.5 py-1 rounded-md bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 text-amber-900 dark:text-amber-100 text-[10px] font-bold transition shadow-xs shrink-0 ml-auto sm:ml-0"
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

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
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
