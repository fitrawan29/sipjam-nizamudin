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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0B4619] via-[#072d10] to-[#041909] text-white overflow-hidden select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={(e) => {
        // Prevent accidental state changes during animation
        e.stopPropagation();
      }}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-nizamudin-gold/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Animated Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-pulse">
            <i className="fa-solid fa-graduation-cap text-4xl text-nizamudin-gold drop-shadow-md"></i>
          </div>
        </div>

        {/* Brand Title with Wide Tracking */}
        <h1 className="text-4xl font-extrabold tracking-widest text-white drop-shadow-md mb-2 fade-in">
          SIPJAM
        </h1>

        {/* Educational Domain Subtitle */}
        <p className="text-xs uppercase font-medium tracking-wider text-emerald-200/90 max-w-xs text-center fade-in">
          Sistem Informasi Presensi & Jurnal Mengajar
        </p>

        {/* Elegant Animated Progress Bar */}
        <div className="w-48 bg-white/15 rounded-full h-1.5 overflow-hidden mt-8 shadow-inner">
          <div
            className="bg-nizamudin-gold h-full rounded-full transition-all duration-300 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="text-[10px] text-emerald-100/50 tracking-widest uppercase mt-3">
          Memuat Sistem...
        </p>
      </div>
    </div>
  );
}
