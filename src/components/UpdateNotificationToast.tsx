'use client';

import { useEffect, useState } from 'react';

export default function UpdateNotificationToast() {
  const [show, setShow] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.ready
      .then((reg) => {
        // 1. If an updated worker is already waiting in background
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setShow(true);
        }

        // 2. Listen for new incoming updates
        const handleUpdateFound = () => {
          const installingWorker = reg.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (
              installingWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(installingWorker);
              setShow(true);
            }
          });
        };

        reg.addEventListener('updatefound', handleUpdateFound);

        // 3. Optional periodic check when window regains focus (without extra serverless calls)
        const handleFocus = () => {
          reg.update().catch(() => {});
        };
        window.addEventListener('focus', handleFocus);

        return () => {
          reg.removeEventListener('updatefound', handleUpdateFound);
          window.removeEventListener('focus', handleFocus);
        };
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  if (!show) return null;

  return (
    <aside
      role="alert"
      aria-live="polite"
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 text-sm">
          <i className="fa-solid fa-cloud-arrow-down animate-bounce"></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
            Pembaruan Tersedia
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
            Versi baru SIPJAM siap dimuat.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1"
        >
          <i className="fa-solid fa-rotate-right text-[10px]"></i>
          Muat Ulang
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          title="Tutup pemberitahuan"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs transition cursor-pointer"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </aside>
  );
}
