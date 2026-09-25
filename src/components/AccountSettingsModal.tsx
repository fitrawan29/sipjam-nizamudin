'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { AVATAR_LIST, renderUserAvatar } from '@/lib/avatars';
import {
  isPushNotificationSupported,
  getPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestNotification
} from '@/lib/pushClient';

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
    }
  }, [user, isOpen]);

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
          Swal.fire({
            icon: 'info',
            title: 'Notifikasi Dinonaktifkan',
            text: 'Perangkat ini tidak lagi menerima push notifikasi dari SIPJAM.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } else {
        const result = await subscribeToPushNotifications(user);
        if (result.success) {
          setIsPushSubscribed(true);
          Swal.fire({
            icon: 'success',
            title: 'Push Notifikasi Aktif!',
            text: 'Perangkat Anda berhasil didaftarkan untuk menerima push notifikasi sistem.',
            confirmButtonColor: '#2563EB'
          });
        } else {
          Swal.fire('Gagal Mengaktifkan Notifikasi', result.error || 'Terjadi kesalahan.', 'error');
        }
      }
    } catch (err: any) {
      Swal.fire('Error', err.message || 'Gagal mengubah status notifikasi', 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setPushLoading(true);
    try {
      const result = await sendTestNotification();
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Notifikasi Uji Coba Terkirim',
          text: 'Periksa baki notifikasi atau layar perangkat Anda.',
          timer: 2500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Gagal Mengirim Uji Coba', result.error || 'Terjadi kesalahan.', 'error');
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      Swal.fire('Error', 'Data pengguna tidak valid.', 'error');
      return;
    }

    if (!username.trim()) {
      Swal.fire('Validasi Gagal', 'Username tidak boleh kosong.', 'warning');
      return;
    }

    // Password validation if requested
    if (changePassword) {
      if (!currentPassword) {
        Swal.fire('Validasi Gagal', 'Password saat ini harus diisi.', 'warning');
        return;
      }

      // Check current password matches existing password in user object if available
      if (user.password && currentPassword !== user.password) {
        Swal.fire('Validasi Gagal', 'Password saat ini tidak cocok dengan password lama.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        Swal.fire('Validasi Gagal', 'Password baru minimal 6 karakter.', 'warning');
        return;
      }

      if (newPassword !== confirmPassword) {
        Swal.fire('Validasi Gagal', 'Konfirmasi password baru tidak cocok.', 'warning');
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
        p_username: username.trim(),
        p_password: changePassword ? newPassword : null,
        p_nama: nama.trim() || user.nama
      };

      const { data, error } = await supabase.rpc('update_user_profile', payload);

      if (error) {
        throw error;
      }

      const res = data as { success?: boolean; message?: string } | null;
      if (res && res.success === false) {
        Swal.fire('Gagal Memperbarui', res.message || 'Terjadi kesalahan.', 'error');
        return;
      }

      // Update local storage
      const updatedUser = {
        ...user,
        avatar: selectedAvatar,
        nama: nama.trim() || user.nama,
        username: username.trim(),
        
      };

      try {
        localStorage.setItem('sipjam_user', JSON.stringify(updatedUser));
      } catch (storageErr) {
        console.warn('Failed to update localStorage:', storageErr);
      }

      if (onUserUpdated) {
        onUserUpdated(updatedUser);
      }

      Swal.fire({
        icon: 'success',
        title: 'Profil Berhasil Disimpan',
        text: 'Perubahan avatar, identitas, dan pengaturan akun telah disimpan.',
        timer: 2000,
        showConfirmButton: false
      });

      onClose();
    } catch (err: any) {
      console.error('Update profile error:', err);
      Swal.fire('Error', err.message || 'Gagal menyimpan perubahan profil.', 'error');
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
                {user?.role || 'Pengguna'} • {user?.username || ''}
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
          {/* Section 1: Avatar Picker (12 Stylish Default Avatars) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-2 flex items-center justify-between">
              <span>Pilih Avatar Profil (12 Karakter Keren)</span>
              <span className="text-[11px] font-normal text-blue-600 dark:text-blue-400">
                {AVATAR_LIST.find((a) => a.id === selectedAvatar)?.name || 'Default'}
              </span>
            </label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
