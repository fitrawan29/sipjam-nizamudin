'use client';

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import ClayCard from './ClayCard';
import ClayButton from './ClayButton';
import { AppUser } from '@/types/user';
import { useExamAntiCheat } from '@/hooks/useExamAntiCheat';
import {
  clearExamSecurityState,
  loadExamProgress,
  saveExamProgress,
  clearExamProgress
} from '@/lib/antiCheatGuard';

export interface ExamQuestion {
  id: number;
  pertanyaan: string;
  pilihan: { key: string; teks: string }[];
  jawabanBenar?: string;
  tipe: 'pilihan_ganda' | 'esai';
}

const SAMPLE_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    pertanyaan: 'Dalam Kurikulum Merdeka, dokumen yang memuat rumusan kompetensi holistik yang harus dicapai peserta didik pada akhir fase disebut...',
    tipe: 'pilihan_ganda',
    pilihan: [
      { key: 'A', teks: 'Alur Tujuan Pembelajaran (ATP)' },
      { key: 'B', teks: 'Capaian Pembelajaran (CP)' },
      { key: 'C', teks: 'Modul Ajar' },
      { key: 'D', teks: 'Kriteria Ketercapaian Tujuan Pembelajaran (KKTP)' }
    ],
    jawabanBenar: 'B'
  },
  {
    id: 2,
    pertanyaan: 'Sistem absensi berbasis geolokasi pada aplikasi sekolah berfungsi untuk memastikan integritas kehadiran dengan cara...',
    tipe: 'pilihan_ganda',
    pilihan: [
      { key: 'A', teks: 'Menghitung nilai ujian secara otomatis' },
      { key: 'B', teks: 'Memvalidasi bahwa posisi pengguna berada di dalam radius resmi sekolah' },
      { key: 'C', teks: 'Mengirimkan pesan singkat acak ke orang tua siswa' },
      { key: 'D', teks: 'Menyimpan berkas modul pembelajaran ke server' }
    ],
    jawabanBenar: 'B'
  },
  {
    id: 3,
    pertanyaan: 'Mengapa mode layar penuh (fullscreen) dan pembatasan perpindahan tab diterapkan secara ketat saat pelaksanaan ujian digital?',
    tipe: 'pilihan_ganda',
    pilihan: [
      { key: 'A', teks: 'Agar resolusi layar monitor bertambah tajam' },
      { key: 'B', teks: 'Mencegah siswa membuka tab pencarian, AI chatbot, atau materi contekan eksternal' },
      { key: 'C', teks: 'Mempercepat pengunduhan soal dari server database' },
      { key: 'D', teks: 'Menghemat konsumsi baterai perangkat ujian' }
    ],
    jawabanBenar: 'B'
  },
  {
    id: 4,
    pertanyaan: 'Tuliskan secara singkat menurut pemahaman Anda: apa saja hal yang harus diperhatikan siswa untuk menjaga integritas dan kejujuran akademik saat mengerjakan asesmen sumatif?',
    tipe: 'esai',
    pilihan: []
  }
];

export default function UjianSiswaView({
  user,
  onNavigate
}: {
  user: AppUser;
  onNavigate?: (view: string, tab?: string) => void;
}) {
  const [examStatus, setExamStatus] = useState<'lobby' | 'ongoing' | 'finished'>('lobby');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [doubtful, setDoubtful] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes in seconds
  const examContainerRef = useRef<HTMLDivElement>(null);

  const examId = 'penilaian_akhir_semester_2026';
  const studentId = user?.id || user?.username || 'siswa_01';

  // Anti-cheat hook integration
  const {
    securityState,
    isFullscreen,
    isBlocked,
    activeViolation,
    violationModalOpen,
    startExamFullscreen,
    resumeFullscreen,
    dismissModal,
    triggerExitFullscreen
  } = useExamAntiCheat({
    examId,
    studentId,
    isActive: examStatus === 'ongoing',
    maxViolations: 3,
    containerRef: examContainerRef,
    onViolation: (viol, nextState) => {
      console.warn('[UjianSiswaView] Violation logged:', viol.type, 'Total:', nextState.violationCount);
    },
    onLockout: (finalState) => {
      Swal.fire({
        icon: 'error',
        title: 'Ujian Terkunci Otomatis!',
        text: 'Anda telah mencapai batas maksimal 3 kali pelanggaran keamanan ujian. Jawaban Anda disimpan dan ujian diserahkan secara otomatis.',
        confirmButtonColor: '#DC2626',
        allowOutsideClick: false
      }).then(() => {
        handleFinishExam(true);
      });
    }
  });

  // Restore ongoing progress if existing
  useEffect(() => {
    const saved = loadExamProgress(examId, studentId);
    if (saved) {
      if (saved.answers) setAnswers(saved.answers);
      if (saved.doubtful) setDoubtful(saved.doubtful);
      if (typeof saved.currentQuestionIndex === 'number') setCurrentQuestionIndex(saved.currentQuestionIndex);
      if (typeof saved.timeRemaining === 'number' && saved.timeRemaining > 0) setTimeRemaining(saved.timeRemaining);
    }
  }, [examId, studentId]);

  // Persist progress during active exam to guard against accidental reloads
  useEffect(() => {
    if (examStatus !== 'ongoing') return;
    saveExamProgress({
      examId,
      studentId,
      currentQuestionIndex,
      answers,
      doubtful,
      timeRemaining,
      lastUpdatedAt: new Date().toISOString()
    });
  }, [examStatus, currentQuestionIndex, answers, doubtful, timeRemaining, examId, studentId]);

  // Countdown timer
  useEffect(() => {
    if (examStatus !== 'ongoing') return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examStatus]);

  // Handle starting exam
  const handleStartExam = async () => {
    // Check if previously locked
    if (securityState.isLocked) {
      Swal.fire({
        icon: 'error',
        title: 'Ujian Terkunci',
        text: 'Sesi ujian Anda telah terkunci karena pelanggaran keamanan sebelumnya. Silakan hubungi proktor/pengawas ujian.',
        confirmButtonColor: '#0B4619'
      });
      return;
    }

    try {
      await startExamFullscreen();
    } catch (_) {}

    setExamStatus('ongoing');
    setCurrentQuestionIndex(0);
  };

  // Handle submitting exam
  const handleFinishExam = async (forced = false) => {
    try {
      await triggerExitFullscreen();
    } catch (_) {}

    clearExamProgress(examId, studentId);
    setExamStatus('finished');

    if (!forced) {
      clearExamSecurityState(examId, studentId);
      Swal.fire({
        icon: 'success',
        title: 'Ujian Berhasil Diserahkan',
        text: 'Terima kasih telah menyelesaikan ujian dengan jujur dan mematuhi seluruh protokol keamanan.',
        confirmButtonColor: '#0B4619'
      });
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentQ = SAMPLE_EXAM_QUESTIONS[currentQuestionIndex];
  const totalQuestions = SAMPLE_EXAM_QUESTIONS.length;
  const answeredCount = Object.keys(answers).filter(k => (answers[Number(k)] || '').trim() !== '').length;

  return (
    <div
      ref={examContainerRef}
      id="student-exam-container"
      className="w-full flex-grow flex flex-col p-3 sm:p-6 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 select-none relative"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* ========================================================================= */}
      {/* 1. LOBBY VIEW (Pre-exam instructions & security briefing) */}
      {/* ========================================================================= */}
      {examStatus === 'lobby' && (
        <div className="max-w-3xl mx-auto w-full my-auto space-y-6">
          <div className="clay-card p-6 sm:p-8 rounded-3xl border-2 border-white/80 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0B4619] to-[#156E2A] flex items-center justify-center text-white text-2xl shadow-md shrink-0">
                <i className="fa-solid fa-graduation-cap text-yellow-300"></i>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Portal Ujian & Asesmen Siswa
                </h1>
                <p className="text-xs sm:text-sm text-gray-700 dark:text-white font-medium">
                  {user?.nama || 'Siswa'} &bull; Kelas: {user?.kelas || user?.wali_kelas || 'X-A'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 mb-6">
              <h2 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2 mb-2">
                <i className="fa-solid fa-shield-halved text-amber-600 dark:text-amber-400"></i>
                Protokol Keamanan & Anti-Kecurangan Aktif:
              </h2>
              <ul className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 space-y-2 list-disc list-inside">
                <li>
                  <span className="font-semibold">Mode Layar Penuh (Fullscreen):</span> Wajib aktif selama ujian berlangsung. Keluar dari fullscreen dihitung sebagai pelanggaran.
                </li>
                <li>
                  <span className="font-semibold">Larangan Berpindah Tab / Jendela:</span> Membuka tab lain, browser lain, atau aplikasi split-screen akan langsung terdeteksi.
                </li>
                <li>
                  <span className="font-semibold">Blokir Copy-Paste & Klik Kanan:</span> Seluruh tombol pintas penyalinan dan menu konteks dinonaktifkan.
                </li>
                <li>
                  <span className="font-semibold">Batas Toleransi Pelanggaran:</span> Maksimal 3 kali toleransi. Pelanggaran ke-3 menyebabkan ujian terkunci dan tersubmit otomatis.
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-700 dark:text-white block text-xs">Mata Uji:</span>
                <span className="font-bold text-gray-900 dark:text-white">Asesmen Pembelajaran & Integritas</span>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <span className="text-gray-700 dark:text-white block text-xs">Durasi:</span>
                <span className="font-bold text-gray-900 dark:text-white">30 Menit (4 Butir Soal)</span>
              </div>
            </div>

            {securityState.isLocked ? (
              <div className="p-4 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-center text-red-800 dark:text-red-200 font-bold text-sm">
                <i className="fa-solid fa-lock text-red-600 dark:text-red-400 text-xl block mb-1"></i>
                Sesi Ujian Ini Telah Terkunci Karena Pelanggaran Keamanan.
              </div>
            ) : (
              <ClayButton
                variant="primary"
                onClick={handleStartExam}
                className="w-full py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-expand"></i>
                Mulai Ujian & Aktifkan Layar Penuh
              </ClayButton>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ONGOING EXAM VIEW */}
      {/* ========================================================================= */}
      {examStatus === 'ongoing' && (
        <div className="max-w-5xl mx-auto w-full flex-grow flex flex-col space-y-4">
          {/* Top Security HUD Header */}
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Ujian Aktif
              </span>

              {/* Fullscreen indicator */}
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                  isFullscreen
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}
              >
                <i className={`fa-solid ${isFullscreen ? 'fa-expand' : 'fa-compress'}`}></i>
                {isFullscreen ? 'Layar Penuh: Aktif' : 'Layar Penuh: Keluar'}
              </span>

              {/* Violation Counter Badge */}
              <span
                id="violation-counter-badge"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border ${
                  securityState.violationCount === 0
                    ? 'bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-white border-gray-200 dark:border-gray-700'
                    : securityState.violationCount < 3
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                }`}
              >
                <i className="fa-solid fa-triangle-exclamation"></i>
                Pelanggaran: {securityState.violationCount} / 3
              </span>
            </div>

            {/* Timer Display */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-700 dark:text-white block font-medium">Sisa Waktu</span>
                <span className="font-mono text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  {formatTimer(timeRemaining)}
                </span>
              </div>
              <ClayButton
                variant="rose"
                size="sm"
                onClick={() => {
                  Swal.fire({
                    title: 'Serahkan Ujian?',
                    text: `Anda telah menjawab ${answeredCount} dari ${totalQuestions} soal. Apakah Anda yakin ingin mengakhiri ujian?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Ya, Serahkan',
                    cancelButtonText: 'Lanjutkan Mengerjakan',
                    confirmButtonColor: '#0B4619'
                  }).then((res) => {
                    if (res.isConfirmed) {
                      handleFinishExam(false);
                    }
                  });
                }}
              >
                Selesai
              </ClayButton>
            </div>
          </div>

          {/* Main Question Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-grow">
            {/* Question Content (Col 1-3) */}
            <div className="lg:col-span-3 flex flex-col">
              <ClayCard className="flex-grow flex flex-col justify-between p-4 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                <div>
                  <div className="flex justify-between items-center pb-3 mb-4 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm font-bold text-[#0B4619] dark:text-emerald-400">
                      Soal No. {currentQuestionIndex + 1} dari {totalQuestions}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDoubtful(prev => ({
                          ...prev,
                          [currentQuestionIndex]: !prev[currentQuestionIndex]
                        }));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-colors ${
                        doubtful[currentQuestionIndex]
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      <i className="fa-solid fa-flag"></i>
                      {doubtful[currentQuestionIndex] ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu-ragu'}
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="mb-6 select-none">
                    <p className="text-base sm:text-lg font-medium leading-relaxed text-gray-900 dark:text-white">
                      {currentQ.pertanyaan}
                    </p>
                  </div>

                  {/* Options / Answer Input */}
                  {currentQ.tipe === 'pilihan_ganda' ? (
                    <div className="space-y-3">
                      {currentQ.pilihan.map((opt) => {
                        const isSelected = answers[currentQuestionIndex] === opt.key;
                        return (
                          <label
                            key={opt.key}
                            className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#0B4619] bg-green-50/70 dark:bg-green-950/30 text-gray-900 dark:text-white shadow-sm'
                                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQuestionIndex}`}
                              value={opt.key}
                              checked={isSelected}
                              onChange={() => {
                                setAnswers(prev => ({ ...prev, [currentQuestionIndex]: opt.key }));
                              }}
                              className="mt-1 h-4 w-4 text-[#0B4619] focus:ring-[#0B4619]"
                            />
                            <div className="flex-grow text-sm sm:text-base font-normal">
                              <span className="font-bold mr-2">{opt.key}.</span>
                              {opt.teks}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-white mb-2">
                        Tuliskan Lembar Jawaban Esai Anda:
                      </label>
                      <textarea
                        rows={6}
                        value={answers[currentQuestionIndex] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAnswers(prev => ({ ...prev, [currentQuestionIndex]: val }));
                        }}
                        placeholder="Ketikkan jawaban Anda secara langsung di sini..."
                        className="w-full p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-[#0B4619] focus:outline-none transition-all select-text"
                      />
                      <p className="text-[11px] text-gray-700 dark:text-white mt-1 italic">
                        * Input jawaban esai dapat diketik secara bebas tanpa terpengaruh proteksi anti-kecurangan.
                      </p>
                    </div>
                  )}
                </div>

                {/* Question Navigation Controls */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
                  <ClayButton
                    variant="secondary"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  >
                    <i className="fa-solid fa-chevron-left mr-1"></i> Sebelumnya
                  </ClayButton>

                  <span className="text-xs text-gray-700 dark:text-white font-medium">
                    {answeredCount} Terjawab &bull; {totalQuestions - answeredCount} Belum
                  </span>

                  <ClayButton
                    variant="primary"
                    size="sm"
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    onClick={() => setCurrentQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                  >
                    Selanjutnya <i className="fa-solid fa-chevron-right ml-1"></i>
                  </ClayButton>
                </div>
              </ClayCard>
            </div>

            {/* Question Navigator Grid (Col 4) */}
            <div className="lg:col-span-1">
              <ClayCard className="p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-white mb-3">
                  Nomor Soal
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_EXAM_QUESTIONS.map((q, idx) => {
                    const isAnswered = Boolean(answers[idx] && answers[idx].trim() !== '');
                    const isCurrent = currentQuestionIndex === idx;
                    const isDoubt = Boolean(doubtful[idx]);

                    let btnClass = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
                    if (isDoubt) {
                      btnClass = 'bg-amber-500 text-white font-bold';
                    } else if (isAnswered) {
                      btnClass = 'bg-[#0B4619] text-white font-bold';
                    }

                    if (isCurrent) {
                      btnClass += ' ring-2 ring-offset-2 ring-[#0B4619] dark:ring-emerald-400';
                    }

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${btnClass}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-[11px] text-gray-700 dark:text-white">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-[#0B4619]"></span>
                    <span>Sudah dijawab</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-amber-500"></span>
                    <span>Ragu-ragu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700"></span>
                    <span>Belum dijawab</span>
                  </div>
                </div>
              </ClayCard>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FINISHED VIEW */}
      {/* ========================================================================= */}
      {examStatus === 'finished' && (
        <div className="max-w-2xl mx-auto w-full my-auto text-center space-y-6">
          <div className="clay-card p-8 rounded-3xl border-2 border-white/80 dark:border-gray-800 shadow-xl bg-white dark:bg-gray-900">
            {securityState.isLocked ? (
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-3xl mx-auto mb-4 border-2 border-red-300 dark:border-red-800">
                <i className="fa-solid fa-ban"></i>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl mx-auto mb-4 border-2 border-emerald-300 dark:border-emerald-800">
                <i className="fa-solid fa-check"></i>
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {securityState.isLocked ? 'Ujian Terkunci & Didiskualifikasi' : 'Ujian Telah Selesai'}
            </h1>
            <p className="text-sm text-gray-700 dark:text-white mb-6">
              {securityState.isLocked
                ? 'Sesi ujian Anda dihentikan otomatis karena telah mencapai batas maksimal pelanggaran protokol keamanan.'
                : 'Seluruh jawaban dan rekaman sesi pengerjaan telah berhasil disimpan ke database sekolah.'}
            </p>

            {/* Security Audit Summary */}
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-left mb-6 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-white">Nama Siswa:</span>
                <span className="font-bold text-gray-900 dark:text-white">{user?.nama}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-white">Status Integritas:</span>
                <span className={`font-bold ${
                  securityState.isLocked
                    ? 'text-red-600 dark:text-red-400'
                    : securityState.violationCount === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {securityState.isLocked
                    ? `Didiskualifikasi (${securityState.violationCount} Pelanggaran)`
                    : securityState.violationCount === 0
                    ? 'Bersih (0 Pelanggaran)'
                    : `${securityState.violationCount} Peringatan Keamanan`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-white">Soal Terjawab:</span>
                <span className="font-bold text-gray-900 dark:text-white">{answeredCount} dari {totalQuestions} Soal</span>
              </div>
            </div>

            <ClayButton
              variant="primary"
              onClick={() => {
                setExamStatus('lobby');
                if (onNavigate) {
                  onNavigate('view-informasi');
                }
              }}
              className="w-full py-3 text-sm font-bold"
            >
              Kembali ke Menu Utama
            </ClayButton>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ANTI-CHEAT BLOCKING MODAL OVERLAY (Fullscreen exit or violation) */}
      {/* ========================================================================= */}
      {(violationModalOpen || isBlocked) && examStatus === 'ongoing' && (
        <div
          id="anti-cheat-violation-modal"
          className="fixed inset-0 z-[99999] w-screen h-screen bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="clay-card max-w-md w-full p-6 sm:p-8 rounded-3xl border-2 border-red-500/80 shadow-2xl bg-white dark:bg-gray-900 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center text-3xl mx-auto mb-4 border-2 border-red-300 dark:border-red-800 animate-pulse">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
              Peringatan Keamanan Ujian!
            </h2>

            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {activeViolation?.message || 'Aktivitas yang melanggar protokol ujian terdeteksi.'}
            </p>

            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 mb-6 text-xs text-red-800 dark:text-red-300 text-left space-y-1">
              <div className="flex justify-between font-bold">
                <span>Pelanggaran Ke:</span>
                <span>{securityState.violationCount} dari maksimal 3</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-700 dark:text-red-400">
                {securityState.violationCount >= 3
                  ? 'Batas maksimal pelanggaran telah habis. Sesi ujian Anda langsung dibekukan dan jawaban diserahkan otomatis.'
                  : `Tersisa ${3 - securityState.violationCount} kesempatan lagi sebelum sistem secara otomatis mengunci dan mendiskualifikasi ujian Anda.`}
              </p>
            </div>

            {securityState.isLocked ? (
              <ClayButton
                variant="rose"
                onClick={() => handleFinishExam(true)}
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-lock"></i>
                Kunci & Serahkan Ujian
              </ClayButton>
            ) : (
              <ClayButton
                variant="primary"
                onClick={resumeFullscreen}
                className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-lg"
              >
                <i className="fa-solid fa-expand"></i>
                Kembali ke Layar Penuh & Lanjutkan Ujian
              </ClayButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
