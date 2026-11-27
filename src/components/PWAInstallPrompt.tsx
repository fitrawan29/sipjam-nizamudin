'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // 1. Ensure <link rel="manifest" href="/manifest.json" /> is present in <head>
    if (typeof document !== 'undefined') {
      const existingManifest = document.querySelector('link[rel="manifest"]');
      if (!existingManifest) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.json';
        document.head.appendChild(link);
      }
    }

    // 2. Check standalone mode (app is already installed and running standalone)
    const checkIsStandalone = (): boolean => {
      if (typeof window === 'undefined') return false;
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone = (navigator as any)?.standalone === true;
      return Boolean(isDisplayStandalone || isNavStandalone);
    };

    if (checkIsStandalone()) {
      return;
    }

    // 3. Check persistent dismissal or installation in localStorage
    try {
      const isDismissed = localStorage.getItem('sipjam_pwa_dismissed') === 'true';
      const isInstalled = localStorage.getItem('sipjam_pwa_installed') === 'true';
      if (isDismissed || isInstalled) {
        return;
      }
    } catch {
      // Ignore localStorage access restrictions
    }

    // 4. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // 5. Listen for appinstalled event
    const handleAppInstalled = () => {
      try {
        localStorage.setItem('sipjam_pwa_installed', 'true');
      } catch {}
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          try {
            localStorage.setItem('sipjam_pwa_installed', 'true');
          } catch {}
        }
      } catch (err) {
        console.error('Error invoking PWA prompt:', err);
      }
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else {
      // Fallback for browsers that don't pass beforeinstallprompt object
      try {
        localStorage.setItem('sipjam_pwa_installed', 'true');
      } catch {}
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('sipjam_pwa_dismissed', 'true');
    } catch {}
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      id="pwa-install-banner"
      role="dialog"
      aria-label="Install SIPJAM"
      className="fixed bottom-24 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 print:hidden no-print animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="neu-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl neu-card-primary flex items-center justify-center text-white text-xl shrink-0">
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs sm:text-sm text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
              Install Aplikasi SIPJAM
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
              Pasang aplikasi untuk akses cepat dan pengalaman terbaik di perangkat Anda.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleInstall}
            className="neu-btn neu-btn-primary btn-click flex-1 sm:flex-none px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-download text-[10px]"></i> Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="neu-btn neu-btn-secondary btn-click flex-1 sm:flex-none px-3 py-2 min-h-[44px] text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
