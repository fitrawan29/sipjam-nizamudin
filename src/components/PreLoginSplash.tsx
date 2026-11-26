'use client';

import { useState, useEffect } from 'react';

interface PreLoginSplashProps {
  onFinish: () => void;
  durationMs?: number;
}

export default function PreLoginSplash({ onFinish, durationMs = 1800 }: PreLoginSplashProps) {
  const [progress, setProgress] = useState(15);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Gradual progress animation
    const progressTimer1 = setTimeout(() => setProgress(55), durationMs * 0.25);
    const progressTimer2 = setTimeout(() => setProgress(85), durationMs * 0.6);
    const progressTimer3 = setTimeout(() => setProgress(100), durationMs * 0.85);

    // Fade-out trigger
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 300, 500));

    // Finish callback
    const finishTimer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      id="pre-login-splash"
      data-testid="pre-login-splash"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#E6ECF2] dark:bg-[#1F242D] text-[#0F172A] dark:text-[#F1F5F9] overflow-hidden select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={(e) => {
        // Prevent accidental state changes during animation
        e.stopPropagation();
      }}
    >
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Extruded Neumorphic Brand Emblem */}
        <div className="relative mb-7">
          <div className="neu-card w-24 h-24 rounded-3xl flex items-center justify-center">
            <div className="neu-inset w-16 h-16 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-graduation-cap text-3xl text-[#0F766E] dark:text-teal-400"></i>
            </div>
          </div>
        </div>

        {/* Brand Title with Wide Tracking */}
        <h1 className="text-4xl font-extrabold tracking-widest text-[#0F172A] dark:text-[#F1F5F9] mb-2 fade-in">
          SIPJAM
        </h1>

        {/* Educational Domain Subtitle */}
        <p className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-400 max-w-xs text-center fade-in">
          Sistem Informasi Presensi &amp; Jurnal Mengajar
        </p>

        {/* Recessed Concave Neumorphic Progress Track */}
        <div className="w-52 neu-inset rounded-full h-2.5 p-0.5 overflow-hidden mt-8">
          <div
            className="bg-gradient-to-r from-[#0F766E] to-[#14B8A6] h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-widest uppercase mt-3">
          Memuat Sistem...
        </p>
      </div>
    </div>
  );
}
