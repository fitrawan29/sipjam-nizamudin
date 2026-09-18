'use client';

import { useState, useEffect } from 'react';
import { isPushNotificationSupported, subscribeToPushNotifications, registerServiceWorker } from '@/lib/pushClient';
import Swal from 'sweetalert2';

interface PushNotificationPromptProps {
  user: any;
}

export default function PushNotificationPrompt({ user }: PushNotificationPromptProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isPushNotificationSupported()) {
      return;
    }

    const currentPermission = Notification.permission;
    setPermission(currentPermission);

    // If permission is default (not yet requested or prompt dismissed in this session)
    const isDismissed = sessionStorage.getItem('sipjam_push_prompt_dismissed');
    if (currentPermission === 'default' && !isDismissed) {
      // Small timeout to allow initial page layout to render smoothly
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRequestPermission = async () => {
    setIsProcessing(true);
    try {
      const result = await subscribeToPushNotifications(user);
      const newPermission = Notification.permission;
      setPermission(newPermission);

      if (newPermission === 'granted') {
        Swal.fire({
          icon: 'success',
          title: 'Notifikasi Diaktifkan',
          text: 'Anda akan menerima pengingat presensi datang, jurnal harian, dan tugas piket secara tepat waktu.',
          confirmButtonColor: '#0B4619'
        });

        // Trigger an automatic welcome/simulation notification
        await triggerSimulatedNotification();
      } else if (newPermission === 'denied') {
        Swal.fire({
          icon: 'info',
          title: 'Izin Ditolak',
          text: 'Anda dapat mengaktifkan kembali notifikasi melalui pengaturan izin browser.',
          confirmButtonColor: '#0B4619'
        });
        setShowPrompt(false);
      }
    } catch (err: any) {
      console.error('[PushPrompt] Subscription error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerSimulatedNotification = async () => {
    try {
      if (!('Notification' in window)) return;

      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        setPermission(perm);
        if (perm !== 'granted') {
          Swal.fire('Izin Diperlukan', 'Harap izinkan notifikasi browser untuk menjalankan uji coba.', 'warning');
          return;
        }
      }

      // Ensure service worker is registered
      const reg = await registerServiceWorker();
      const notificationTitle = 'SIPJAM - Uji Coba Push Notifikasi';
      const notificationOptions: NotificationOptions = {
        body: 'Notifikasi simulasi dari sistem berhasil masuk! Pengingat presensi dan jurnal aktif.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'sipjam-test-simulated',
        data: { url: '/', test: true }
      };

      if (reg && reg.showNotification) {
        await reg.showNotification(notificationTitle, notificationOptions);
      } else {
        new Notification(notificationTitle, notificationOptions);
      }

      setTestSent(true);
      Swal.fire({
        icon: 'success',
        title: 'Notifikasi Terkirim',
        text: 'Notifikasi simulasi dari sistem berhasil masuk ke perangkat Anda.',
        confirmButtonColor: '#0B4619'
      });
    } catch (err: any) {
      console.error('[PushPrompt] Simulated notification error:', err);
      Swal.fire('Gagal Mengirim Uji Coba', err.message || 'Tidak dapat memicu notifikasi browser.', 'error');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sipjam_push_prompt_dismissed', 'true');
    }
  };

  if (!showPrompt && permission !== 'granted') {
    return null;
  }

  // If already granted, we don't need to show prompt banner on dashboard unless test button is requested
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-200 dark:border-emerald-800/60 p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0 shadow-xs">
          <i className="fa-solid fa-bell animate-bounce"></i>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Kirim Notifikasi (Push)
            </h4>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Aktifkan notifikasi pengingat otomatis untuk presensi datang/pulang, target jurnal harian, dan tugas piket sekolah.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={isProcessing}
              className="btn-click px-3 py-1.5 rounded-xl bg-nizamudin-green hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition disabled:opacity-60"
            >
              {isProcessing ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : (
                <i className="fa-solid fa-check"></i>
              )}
              Aktifkan Notifikasi
            </button>

            <button
              type="button"
              onClick={triggerSimulatedNotification}
              className="btn-click px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/40 transition"
            >
              <i className="fa-solid fa-paper-plane text-[10px]"></i>
              Kirim Notifikasi Uji Coba
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium text-[11px]"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
