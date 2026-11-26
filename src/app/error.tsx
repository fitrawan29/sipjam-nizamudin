'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    (typeof error?.message === 'string' &&
      (error.message.includes('Loading chunk') ||
        error.message.includes('Failed to fetch dynamically imported module')));

  useEffect(() => {
    console.error('[SIPJAM ErrorBoundary] Unhandled client exception:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 bg-[#E6ECF2] dark:bg-[#1F242D] font-sans">
      <div className="neu-card max-w-md w-full rounded-3xl p-6 text-center space-y-4">
        <div className={`neu-inset w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl ${
          isChunkError
            ? 'text-[#0F766E] dark:text-teal-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}>
          <i className={`fa-solid ${isChunkError ? 'fa-arrows-rotate animate-spin' : 'fa-triangle-exclamation'}`}></i>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9]">
            {isChunkError ? 'Pembaruan Aplikasi Tersedia' : 'Terjadi Kendala Memuat Halaman'}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            {isChunkError
              ? 'Sistem SIPJAM telah diperbarui dengan versi terbaru. Silakan muat ulang untuk memuat pembaruan terkini.'
              : error?.message && !error.message.includes('digest')
              ? error.message
              : 'Terjadi sedikit kendala saat sinkronisasi data halaman. Silakan muat ulang atau kembali ke beranda.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleReload}
            className="neu-btn neu-btn-primary flex-1 py-2.5 px-4 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-rotate-right text-xs"></i>
            <span>Muat Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="neu-btn neu-btn-secondary py-2.5 px-4 min-h-[44px] rounded-xl text-xs font-semibold"
          >
            Halaman Utama
          </button>
        </div>
      </div>
    </div>
  );
}
