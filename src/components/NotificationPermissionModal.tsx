'use client';

import { useState, useEffect } from 'react';
import { subscribeToPushNotifications } from '@/lib/pushClient';

interface NotificationPermissionModalProps {
  user?: any;
  onPermissionGranted?: () => void;
}

export default function NotificationPermissionModal({
  user,
  onPermissionGranted,
}: NotificationPermissionModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('granted');
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);

    // Suppress Escape key dismissals in blocking mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Check again whenever window gains focus (e.g. user toggled settings in another tab/popover)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const handleFocus = () => {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted' && onPermissionGranted) {
        onPermissionGranted();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [onPermissionGranted]);

  if (!mounted) {
    // Zero flicker server-side or pre-mount
    return null;
  }

  // Granted or Unsupported: completely suppressed, 0ms visual flicker
  if (permission === 'granted' || permission === 'unsupported') {
    return null;
  }

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    setIsProcessing(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        if (onPermissionGranted) {
          onPermissionGranted();
        }
        // Asynchronously register push subscription
        try {
          await subscribeToPushNotifications(user);
        } catch (err) {
          console.warn('[NotificationModal] Subscription error:', err);
        }
      }
    } catch (err) {
      console.error('[NotificationModal] Error requesting permission:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecheckPermission = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission;
      setPermission(current);
      if (current === 'granted' && onPermissionGranted) {
        onPermissionGranted();
      }
    }
  };

  const handleReloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div
      id="notification-permission-modal"
      data-testid="notification-permission-modal"
      className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none overflow-y-auto"
      onClick={(e) => {
        // Prevent click events from reaching underlying dashboard/form elements
        e.stopPropagation();
      }}
    >
      <div
        className="glass-card w-full max-w-md p-6 sm:p-8 border-t-4 border-emerald-600 dark:border-emerald-500 text-center relative z-10 shadow-2xl modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {permission === 'denied' ? (
          /* ========================================================
             DENIED STATE: Display Browser Unlock Instructions
             ======================================================== */
          <div>
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg border-2 border-amber-200 dark:border-amber-800">
              <i className="fa-solid fa-triangle-exclamation animate-pulse"></i>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              Izin Notifikasi Diblokir
            </h3>

            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-3">
              Buka pengaturan situs browser untuk mengaktifkan izin notifikasi
            </p>

            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 text-left mb-6 space-y-2.5 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Klik ikon pengaturan situs / gembok di sebelah URL bar browser Anda.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>Ubah pengaturan <strong>Notifikasi</strong> menjadi <strong>Izinkan</strong> (Allow).</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Klik tombol di bawah untuk memverifikasi atau memuat ulang halaman.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              <button
                type="button"
                data-testid="recheck-notification-btn"
                onClick={handleRecheckPermission}
                className="btn-click flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
              >
                <i className="fa-solid fa-rotate-right"></i> Periksa Ulang Izin
              </button>

              <button
                type="button"
                data-testid="reload-page-btn"
                onClick={handleReloadPage}
                className="btn-click flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <i className="fa-solid fa-arrow-rotate-right"></i> Muat Ulang Halaman
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================
             DEFAULT STATE: Full Blocking Permission Prompt
             ======================================================== */
          <div>
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg border-2 border-emerald-200 dark:border-emerald-800">
              <i className="fa-solid fa-bell animate-bounce"></i>
            </div>

            <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
              Izin Notifikasi Diperlukan
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Aplikasi SIPJAM mewajibkan izin notifikasi untuk mengirimkan pengingat presensi datang, jurnal harian, tugas piket, serta notifikasi verifikasi dan penolakan secara langsung ke perangkat Anda.
            </p>

            <button
              type="button"
              data-testid="grant-notification-btn"
              onClick={handleRequestPermission}
              disabled={isProcessing}
              className="btn-click w-full bg-nizamudin-green hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Meminta Izin...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-shield-halved"></i> Izinkan & Aktifkan Notifikasi
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
