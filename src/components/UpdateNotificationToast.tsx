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
      className="neu-card fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] rounded-2xl p-3.5 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="neu-inset w-9 h-9 rounded-xl flex items-center justify-center text-[#0F766E] dark:text-teal-400 shrink-0 text-sm">
          <i className="fa-solid fa-cloud-arrow-down animate-bounce"></i>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] truncate">
            Pembaruan Tersedia
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
            Versi baru SIPJAM siap dimuat.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="neu-btn neu-btn-primary px-3 py-1.5 min-h-[36px] text-xs font-bold rounded-xl flex items-center gap-1"
        >
          <i className="fa-solid fa-rotate-right text-[10px]"></i>
          Muat Ulang
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          title="Tutup pemberitahuan"
          aria-label="Tutup pemberitahuan"
          className="neu-btn w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 text-xs"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>
    </aside>
  );
}
