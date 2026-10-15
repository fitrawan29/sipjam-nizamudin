'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[SIPJAM ErrorBoundary] Unhandled client exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-950 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shadow-inner">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            Terjadi Kendala Memuat Halaman
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {error?.message && !error.message.includes('digest')
              ? error.message
              : 'Terjadi sedikit kendala saat sinkronisasi data halaman. Silakan muat ulang atau kembali ke beranda.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
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
            className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold transition cursor-pointer"
          >
            Halaman Utama
          </button>
        </div>
      </div>
    </div>
  );
}
