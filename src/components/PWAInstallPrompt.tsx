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
    } catch (e) {
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
      } catch (e) {}
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
          } catch (e) {}
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
      } catch (e) {}
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('sipjam_pwa_dismissed', 'true');
    } catch (e) {}
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
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 print:hidden no-print animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-emerald-300 dark:border-emerald-700/80 shadow-2xl rounded-2xl p-4 flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-nizamudin-green to-emerald-600 flex items-center justify-center text-white text-xl shadow-md shrink-0">
          <i className="fa-solid fa-mobile-screen-button"></i>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white leading-tight">
            Install Aplikasi SIPJAM
          </h4>
          <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 mt-0.5 leading-snug">
            Pasang aplikasi untuk akses cepat dan pengalaman terbaik di perangkat Anda.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="btn-click px-3 py-1.5 bg-nizamudin-green hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <i className="fa-solid fa-download text-[10px]"></i> Install
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="btn-click px-2.5 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xs font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
