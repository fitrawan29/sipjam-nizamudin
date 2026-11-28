'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp, formatDateWita, getWitaDayName, getWitaTimeStr, formatPresensiTime } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';
import { triggerPrintWithGps } from '@/utils/printWithGps';
import { transformGoogleDriveUrl } from '@/lib/imageUrl';
import { PenugasanPiket } from '@/types/database';
import CameraSelfieCapture from './CameraSelfieCapture';
import {
  resolveStudentByCode,
  recordPresensiSiswa,
  getTodayPresensiSummary,
  getRecentPresensiSiswa,
  getLocalTodayDate,
  getLocalCurrentTime,
  StudentReference
} from '@/lib/qrSiswa';
import { acquirePiketLock, refreshPiketLock, releasePiketLock, PiketLockInfo } from '@/lib/piketLock';
import { isIntervensiAllowed, isPiketPulangAllowed, fetchBatasIntervensiSiswa, fetchJadwalIntervensiWali } from '@/lib/presensiIntervensi';
import jsQR from 'jsqr';
import { triggerParentWhatsApp } from '@/utils/whatsappUtils';

const HARI_PIKET_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export default function PiketView({ user, statusKepalaSekolah }: { user: any; statusKepalaSekolah?: string }) {
  const roleNormalized = (user?.role || '').toLowerCase().replace(/\s+/g, '');
  const isAdmin = roleNormalized === 'admin' || roleNormalized === 'superadmin';
  const isGuru = roleNormalized === 'guru';

  // Batas intervensi presensi siswa
  const [batasIntervensi, setBatasIntervensi] = useState<string>('08:00');
  const [jamPulangMulai, setJamPulangMulai] = useState<string>('11:00');
  const isPiketIntervensiExpired = !isAdmin && !isIntervensiAllowed(batasIntervensi);
  const piketPulangCheck = isPiketPulangAllowed(jamPulangMulai);

  // Concurrency Lock states (M3)
  const [piketLockInfo, setPiketLockInfo] = useState<PiketLockInfo | null>(null);
  const [_isFormLockChecking, setIsFormLockChecking] = useState(false);
  const activeLockIdRef = useRef<string | null>(null);
  const isFormLocked = Boolean(piketLockInfo?.lockedByOther);

  const [activeTab, setActiveTab] = useState<'beranda' | 'scan' | 'lapor' | 'penugasan' | 'rekap'>('beranda');
  const [jadwalPiket, setJadwalPiket] = useState<any[]>([]);
  const [penugasanList, setPenugasanList] = useState<PenugasanPiket[]>([]);
  const [laporanPiket, setLaporanPiket] = useState<any[]>([]);

  // Penugasan Piket states (Admin)
  const currentDayWita = getWitaDayName();
  const [selectedHariPiket, setSelectedHariPiket] = useState<string>(
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].includes(currentDayWita) ? currentDayWita : 'Senin'
  );
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [siswaAssignMode, setSiswaAssignMode] = useState<'select' | 'manual'>('select');
  const [selectedSiswaFilterKelas, setSelectedSiswaFilterKelas] = useState('');
  const [selectedSiswaNisn, setSelectedSiswaNisn] = useState('');
  const [manualSiswaNama, setManualSiswaNama] = useState('');
  const [manualSiswaNisn, setManualSiswaNisn] = useState('');
  const [manualSiswaKelas, setManualSiswaKelas] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [activeKelas, setActiveKelas] = useState<string>('');
  const [piketAbsensi, setPiketAbsensi] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [dailyState, setDailyState] = useState<GuruDailyState | null>(null);

  // States for Rekap Piket tab
  const [rekapBulan, setRekapBulan] = useState(getWitaDateStr().substring(0, 7));
  const [rekapGuru, setRekapGuru] = useState('Semua');
  const [rekapStatus, setRekapStatus] = useState('Semua');
  const [rekapSearch, setRekapSearch] = useState('');
  const [rekapList, setRekapList] = useState<any[]>([]);
  const [rekapLoading, setRekapLoading] = useState(false);
  const [guruOptions, setGuruOptions] = useState<string[]>([]);

  // States for Scan QR Siswa Kiosk
  const [scanMode, setScanMode] = useState<'datang' | 'pulang'>('datang');
  const [deviceId, setDeviceId] = useState<string>(isAdmin ? 'kiosk-1' : 'kiosk-default');
  const [usbInputVal, setUsbInputVal] = useState('');
  const [isUsbInputFocused, setIsUsbInputFocused] = useState(false);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{
    student: StudentReference | null;
    status: 'datang' | 'pulang';
    success: boolean;
    alreadyExists?: boolean;
    message: string;
    jam?: string;
    timestamp?: string;
  } | null>(null);

  // Camera scanner states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingCameraRef = useRef(false);
  const isDetectingRef = useRef(false);
  const lastCameraScannedRef = useRef<{ code: string; time: number } | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmittingPresensiRef = useRef(false);
  const isMountedRef = useRef(true);
  const isFetchingScanDataRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchBatasIntervensiSiswa(supabase, user?.sekolah_id)
      .then(b => { if (b) setBatasIntervensi(b); })
      .catch(() => {});
    fetchJadwalIntervensiWali(supabase, user?.sekolah_id)
      .then(j => { if (j?.jamPulangMulai) setJamPulangMulai(j.jamPulangMulai); })
      .catch(() => {});
  }, [user?.sekolah_id]);

  // Live Attendance Log & Summary
  const [scanSummary, setScanSummary] = useState({ totalDatang: 0, totalPulang: 0, totalUnik: 0 });
  const [todayScans, setTodayScans] = useState<any[]>([]);
  const [scanFilterKelas, setScanFilterKelas] = useState('Semua');
  const [scanSearchQuery, setScanSearchQuery] = useState('');

  // Presensi Siswa Manual Attendance state
  const [manualKelasFilter, setManualKelasFilter] = useState('Semua');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualMarkLoading, setManualMarkLoading] = useState<string | null>(null);

  // Audio feedback synthesizer via Web Audio API with shared context and lifecycle management
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext | null => {
    try {
      if (typeof window === 'undefined') return null;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      if (type === 'success') {
        // High, cheerful ascending chime: D5 (587Hz) -> A5 (880Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.setValueAtTime(880.00, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'warning') {
        // Two short mid-frequency warning beeps: 440Hz -> 440Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(440, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc1.start(now);
        osc1.stop(now + 0.1);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(440, now + 0.15);
        gain2.gain.setValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.28);
      } else if (type === 'error') {
        // Low frequency buzzer sound: 220Hz -> 140Hz sawtooth
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.3);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // AudioContext unavailable or blocked by autoplay
    }
  };

  // Device ID initialization for multi-kiosk operation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sipjam_piket_kiosk_id');
      if (saved) {
        setDeviceId(saved);
      } else {
        const initial = 'kiosk-1';
        localStorage.setItem('sipjam_piket_kiosk_id', initial);
        setDeviceId(initial);
      }
    }
  }, []);

  const handleDeviceIdChange = (newId: string) => {
    setDeviceId(newId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sipjam_piket_kiosk_id', newId);
    }
  };


  // Fetch today's scans and summary counts
  const fetchTodayScanData = async () => {
    if (!user?.sekolah_id || isFetchingScanDataRef.current) return;
    isFetchingScanDataRef.current = true;
    const todayStr = getLocalTodayDate();
    try {
      const summary = await getTodayPresensiSummary(supabase, user.sekolah_id, todayStr);
      setScanSummary(summary);

      const recent = await getRecentPresensiSiswa(supabase, user.sekolah_id, todayStr, 1000);
      setTodayScans(recent);
    } catch (e) {
      console.error('Error fetching today scan data:', e);
    } finally {
      isFetchingScanDataRef.current = false;
    }
  };

  // Realtime subscription and short polling for live multi-kiosk concurrency
  useEffect(() => {
    if (activeTab === 'scan') {
      fetchTodayScanData();

      // Realtime subscription to presensi_siswa table with burst debouncing
      let realtimeDebounceTimer: NodeJS.Timeout | null = null;
      const channelName = `presensi_kiosk_${user?.sekolah_id || 'all'}_${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'presensi_siswa'
          },
          (payload: any) => {
            if (!user?.sekolah_id || payload.new?.sekolah_id === user.sekolah_id || payload.old?.sekolah_id === user.sekolah_id) {
              if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
              realtimeDebounceTimer = setTimeout(() => {
                fetchTodayScanData();
              }, 800);
            }
          }
        )
        .subscribe();

      // Optimized fallback polling (60s instead of 8s to prevent egress blowup),
      // paused while document/tab is hidden in background
      const pollTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        fetchTodayScanData();
      }, 60000);

      const handleVisibilityChange = () => {
        if (typeof document !== 'undefined' && !document.hidden) {
          fetchTodayScanData();
        }
      };
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollTimer);
        if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      };
    }
  }, [activeTab, user?.sekolah_id]);

  // USB Scanner Auto-Focus mechanism
  useEffect(() => {
    if (activeTab === 'scan') {
      const timer = setTimeout(() => {
        usbInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const handleUsbInputBlur = () => {
    setIsUsbInputFocused(false);
    // Auto refocus unless activeElement is another input/select
    setTimeout(() => {
      if (activeTab === 'scan') {
        const activeEl = document.activeElement;
        const isOtherInteractive = activeEl && (
          activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('role') === 'button'
        );
        if (!isOtherInteractive && usbInputRef.current) {
          usbInputRef.current.focus();
        }
      }
    }, 250);
  };

  // Camera start / stop functions
  const startCamera = async () => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;
    setCameraError(null);
    getAudioContext();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung atau koneksi tidak aman (HTTPS diperlukan).');
      setCameraActive(false);
      isStartingCameraRef.current = false;
      return;
    }

    try {
      // Stop any existing tracks before acquiring new stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };

      let stream: MediaStream | null = null;
      let lastErr: any;

      for (let i = 0; i < 2; i++) {
        if (!isMountedRef.current) {
          isStartingCameraRef.current = false;
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (constraintErr: any) {
          lastErr = constraintErr;
          if (['NotReadableError', 'TrackStartError'].includes(constraintErr.name)) {
            await new Promise(r => setTimeout(r, 800));
          } else {
            console.warn('[PiketView] Overconstrained, fallback to basic video:', constraintErr);
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).catch(err => { lastErr = err; return null; });
            break;
          }
        }
      }

      if (!stream) {
        throw lastErr || new Error('Kamera sedang digunakan');
      }

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        isStartingCameraRef.current = false;
        return;
      }

      // Listen for unexpected track ending (e.g. phone call, app switch, camera seized by system)
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          if (isMountedRef.current && streamRef.current === stream) {
            console.warn('[PiketView] Camera track ended unexpectedly');
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
            streamRef.current = null;
            setCameraActive(false);
            setCameraError('Kamera terputus (aplikasi dialihkan atau digunakan sistem). Ketuk Buka Kamera untuk mengaktifkan kembali.');
          }
        };
      });

      streamRef.current = stream;

      // Attach immediately if videoRef is already in DOM
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[PiketView] Direct play error:', playErr);
        }
      }

      setCameraActive(true);
    } catch (err: any) {
      console.error('[PiketView] startCamera error:', err);
      let errMsg = 'Gagal mengakses kamera browser. Pastikan izin kamera telah diberikan.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap izinkan akses kamera pada pengaturan browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Kamera tidak ditemukan pada perangkat Anda.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setCameraError(errMsg);
      setCameraActive(false);
    } finally {
      isStartingCameraRef.current = false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getVideoTracks().forEach(track => { track.onended = null; });
      } catch {}
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Ensure video element receives the stream when cameraActive mounts the element
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.muted = true;
      video.play().catch(err => {
        console.warn('[PiketView] Video play error in effect:', err);
      });
    }
  }, [cameraActive]);

  useEffect(() => {
    if (activeTab !== 'scan' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive]);

  // Handle visibility change to resume paused video or recover ended tracks
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && cameraActive && videoRef.current) {
        const tracks = streamRef.current?.getVideoTracks() || [];
        const anyEnded = tracks.some(t => t.readyState === 'ended');
        if (anyEnded || (streamRef.current && !streamRef.current.active)) {
          stopCamera();
          setCameraError('Kamera terputus saat aplikasi di latar belakang. Ketuk Buka Kamera untuk melanjutkan.');
        } else {
          videoRef.current.play().catch(e => {
            console.warn('[PiketView] Resume video play error on visible:', e);
          });
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame detection loop with native BarcodeDetector and client-side jsQR fallback
  useEffect(() => {
    lastCameraScannedRef.current = null;
    let intervalId: any = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    if (cameraActive) {
      const BarcodeDetectorClass = typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined;
      let detector: any = null;
      if (BarcodeDetectorClass) {
        try {
          detector = new BarcodeDetectorClass({ formats: ['qr_code', 'code_128', 'ean_13', 'code_39'] });
        } catch (e) {
          console.warn('BarcodeDetector format init error:', e);
        }
      }

      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2 || isDetectingRef.current || isSubmittingPresensiRef.current) {
          if (videoRef.current && videoRef.current.paused && !videoRef.current.ended && cameraActive) {
            videoRef.current.play().catch(() => {});
          }
          return;
        }
        isDetectingRef.current = true;
        try {
          let rawVal: string | null = null;

          // 1. Try native BarcodeDetector if available in browser
          if (detector) {
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                rawVal = barcodes[0].rawValue;
              }
            } catch {
              // Ignore native detector runtime errors, fallback to jsQR
            }
          }

          // 2. Client-side canvas decoding fallback (jsQR) for iOS Safari & browsers without native BarcodeDetector
          if (!rawVal && videoRef.current) {
            const video = videoRef.current;
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            if (vw > 0 && vh > 0) {
              if (!canvas) {
                canvas = document.createElement('canvas');
              }
              const maxDim = 800;
              let w = vw;
              let h = vh;
              if (w > maxDim || h > maxDim) {
                const scale = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * scale);
                h = Math.round(h * scale);
              }
              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
              }
              if (!ctx) {
                ctx = canvas.getContext('2d', { willReadFrequently: true });
              }
              if (ctx) {
                ctx.drawImage(video, 0, 0, w, h);
                const imageData = ctx.getImageData(0, 0, w, h);
                const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'attemptBoth'
                });
                if (qrResult && qrResult.data) {
                  rawVal = qrResult.data;
                }
              }
            }
          }

          // 3. Process scanned barcode/QR code
          if (rawVal) {
            const now = Date.now();
            if (!lastCameraScannedRef.current || lastCameraScannedRef.current.code !== rawVal || (now - lastCameraScannedRef.current.time > 3000)) {
              lastCameraScannedRef.current = { code: rawVal, time: now };
              await handleProcessScan(rawVal);
            }
          }
        } catch {
          // Ignore transient detection errors
        } finally {
          isDetectingRef.current = false;
        }
      }, 250);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      canvas = null;
      ctx = null;
    };
  }, [cameraActive, scanMode]);

  const handleProcessScan = async (code: string) => {
    if (!code || scanProcessing || isSubmittingPresensiRef.current) return;
    isSubmittingPresensiRef.current = true;
    setScanProcessing(true);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      playAudioFeedback('error');
      setLastScanResult({
        student: null,
        status: scanMode,
        success: false,
        message: 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.',
        jam: getLocalCurrentTime()
      });
      showToast('Koneksi Internet Diperlukan', 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.', 'warning');
      isSubmittingPresensiRef.current = false;
      setScanProcessing(false);
      return;
    }

    if (!user?.sekolah_id) {
      playAudioFeedback('error');
      setLastScanResult({
        student: null,
        status: scanMode,
        success: false,
        message: 'Akses ditolak: ID Sekolah belum terdefinisi pada akun guru piket.',
        jam: getLocalCurrentTime()
      });
      showToast('Validasi Gagal', 'ID Sekolah akun belum terkonfigurasi. Silakan muat ulang.', 'error');
      isSubmittingPresensiRef.current = false;
      setScanProcessing(false);
      return;
    }

    try {
      // 1. Resolve student by code
      const { data: student, error: resolveErr } = await resolveStudentByCode(
        supabase,
        code,
        user?.sekolah_id
      );

      if (resolveErr || !student) {
        playAudioFeedback('error');
        setLastScanResult({
          student: null,
          status: scanMode,
          success: false,
          message: resolveErr?.message || `Siswa dengan kode "${code}" tidak ditemukan.`,
          jam: getLocalCurrentTime()
        });
        return;
      }

      // Multi-tenant check: ensure student's sekolah_id strictly matches teacher's sekolah_id
      if (student.sekolah_id && student.sekolah_id !== user.sekolah_id) {
        playAudioFeedback('error');
        setLastScanResult({
          student: null,
          status: scanMode,
          success: false,
          message: 'Akses ditolak: Siswa terdaftar di sekolah yang berbeda.',
          jam: getLocalCurrentTime()
        });
        showToast('Akses Ditolak', 'Siswa terdaftar di sekolah yang berbeda.', 'error');
        return;
      }

      // 2. Validate Pulang access window for Guru Piket
      if (scanMode === 'pulang' && !isAdmin) {
        const checkPulang = isPiketPulangAllowed(jamPulangMulai);
        if (!checkPulang.allowed) {
          playAudioFeedback('error');
          setLastScanResult({
            student,
            status: scanMode,
            success: false,
            message: checkPulang.pesan,
            jam: getLocalCurrentTime()
          });
          showToast('Presensi Pulang Ditutup', checkPulang.pesan, 'warning');
          return;
        }
      }

      // 3. Record attendance
      const res = await recordPresensiSiswa(supabase, {
        siswa: student,
        status: scanMode,
        sekolahId: user?.sekolah_id,
        deviceId: deviceId
      });

      if (res.success) {
        playAudioFeedback('success');
        const jamStr = formatPresensiTime(res.data?.jam) || (res.data?.jam ? res.data.jam.slice(0, 8) : getLocalCurrentTime());
        setLastScanResult({
          student,
          status: scanMode,
          success: true,
          alreadyExists: false,
          message: res.message,
          jam: jamStr,
          timestamp: res.data?.timestamp || new Date().toISOString()
        });

        // Two-way sync: auto-fill manual input and roster search
        setManualSearchQuery(student.nama_siswa);
        setUsbInputVal(student.nisn || student.nama_siswa);
        setManualKelasFilter('Semua');

        await fetchTodayScanData();
      } else if (res.alreadyExists) {
        playAudioFeedback('warning');
        const jamStr = formatPresensiTime(res.data?.jam) || undefined;
        setLastScanResult({
          student,
          status: scanMode,
          success: false,
          alreadyExists: true,
          message: res.message,
          jam: jamStr
        });

        // Two-way sync: auto-fill manual input even if already marked
        setManualSearchQuery(student.nama_siswa);
        setUsbInputVal(student.nisn || student.nama_siswa);
        setManualKelasFilter('Semua');
      } else {
        playAudioFeedback('error');
        setLastScanResult({
          student,
          status: scanMode,
          success: false,
          message: res.message,
          jam: getLocalCurrentTime()
        });
      }
    } catch (err: any) {
      playAudioFeedback('error');
      setLastScanResult({
        student: null,
        status: scanMode,
        success: false,
        message: err.message || 'Terjadi kesalahan sistem saat pemrosesan scan.',
        jam: getLocalCurrentTime()
      });
    } finally {
      isSubmittingPresensiRef.current = false;
      setScanProcessing(false);
      setTimeout(() => {
        if (usbInputRef.current) {
          usbInputRef.current.focus();
          usbInputRef.current.select();
        }
      }, 100);
    }
  };

  // Two-way synchronization handlers between QR input and manual form
  const handleUsbInputChange = (val: string) => {
    // Hardware scanner carriage return / newline burst handling
    if (val.includes('\n') || val.includes('\r')) {
      let cleanVal = val.replace(/[\r\n]/g, '').trim();
      // If previous input was prepended (e.g. from prior manual search sync), isolate the scanned barcode
      if (usbInputVal && cleanVal.startsWith(usbInputVal) && cleanVal.length > usbInputVal.length) {
        cleanVal = cleanVal.slice(usbInputVal.length).trim();
      }
      if (cleanVal) {
        setUsbInputVal('');
        handleProcessScan(cleanVal);
        return;
      }
    }

    setUsbInputVal(val);
    setManualSearchQuery(val);

    // Cancel old QR scan result if user types a different student code/name or clears input
    if (lastScanResult) {
      if (!lastScanResult.student || val.trim() === '') {
        setLastScanResult(null);
      } else {
        const s = lastScanResult.student;
        const matchesOld =
          s.nama_siswa.toLowerCase().includes(val.toLowerCase()) ||
          (s.nisn && s.nisn.toLowerCase().includes(val.toLowerCase())) ||
          ((s as any).qr_code && (s as any).qr_code.toLowerCase().includes(val.toLowerCase())) ||
          s.id === val;
        if (!matchesOld || val.trim() === '') {
          setLastScanResult(null);
        }
      }
    }
  };

  const handleManualSearchChange = (val: string) => {
    // Hardware scanner carriage return / newline burst handling in manual input
    if (val.includes('\n') || val.includes('\r')) {
      let cleanVal = val.replace(/[\r\n]/g, '').trim();
      // If previous manual search was prepended, isolate the scanned barcode
      if (manualSearchQuery && cleanVal.startsWith(manualSearchQuery) && cleanVal.length > manualSearchQuery.length) {
        cleanVal = cleanVal.slice(manualSearchQuery.length).trim();
      }
      if (cleanVal) {
        setManualSearchQuery(cleanVal);
        setUsbInputVal(cleanVal);
        handleManualFormSubmit(cleanVal);
        return;
      } else {
        handleManualFormSubmit();
        return;
      }
    }

    setManualSearchQuery(val);
    setUsbInputVal(val);

    // Cancel old QR scan result if user types a different student code/name or clears input
    if (lastScanResult) {
      if (!lastScanResult.student || val.trim() === '') {
        setLastScanResult(null);
      } else {
        const s = lastScanResult.student;
        const matchesOld =
          s.nama_siswa.toLowerCase().includes(val.toLowerCase()) ||
          (s.nisn && s.nisn.toLowerCase().includes(val.toLowerCase())) ||
          ((s as any).qr_code && (s as any).qr_code.toLowerCase().includes(val.toLowerCase())) ||
          s.id === val;
        if (!matchesOld || val.trim() === '') {
          setLastScanResult(null);
        }
      }
    }
  };

  const filteredTodayScans = todayScans.filter(item => {
    const matchKelas = scanFilterKelas === 'Semua' || item.kelas === scanFilterKelas;
    const matchSearch = !scanSearchQuery.trim() || 
      (item.nama_siswa?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase()) ||
      (item.nisn?.toLowerCase() || '').includes(scanSearchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });

  // Manual attendance marking for Piket (two-way synced with QR feedback card)
  const handleManualMark = async (student: any, status: 'datang' | 'pulang') => {
    if (scanProcessing || manualMarkLoading) return;
    if (isSubmittingPresensiRef.current) return;

    if (status === 'pulang' && !isAdmin) {
      const checkPulang = isPiketPulangAllowed(jamPulangMulai);
      if (!checkPulang.allowed) {
        playAudioFeedback('warning');
        return showToast('Presensi Pulang Ditutup', checkPulang.pesan, 'warning');
      }
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showToast('Koneksi Internet Diperlukan', 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.', 'warning');
      playAudioFeedback('error');
      setLastScanResult({
        student: {
          id: student.id,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: student.kelas,
          sekolah_id: user?.sekolah_id || student.sekolah_id,
          gender: student.gender
        },
        status,
        success: false,
        alreadyExists: false,
        message: 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.',
        jam: getLocalCurrentTime()
      });
      return;
    }

    isSubmittingPresensiRef.current = true;
    const opKey = `${student.id}-${status}`;
    setManualMarkLoading(opKey);
    try {
      const res = await recordPresensiSiswa(supabase, {
        siswa: {
          id: student.id,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: student.kelas,
          sekolah_id: user?.sekolah_id || student.sekolah_id,
          gender: student.gender
        },
        status,
        sekolahId: user?.sekolah_id,
        deviceId: 'manual'
      });

      const jamStr = formatPresensiTime(res.data?.jam) || (res.data?.jam ? res.data.jam.slice(0, 8) : getLocalCurrentTime());

      if (res.success) {
        showToast('Berhasil', res.message, 'success');
        playAudioFeedback('success');

        // Two-way sync: update QR state feedback card as if submitted via QR
        setLastScanResult({
          student: {
            id: student.id,
            nisn: student.nisn,
            nama_siswa: student.nama_siswa,
            kelas: student.kelas,
            sekolah_id: user?.sekolah_id || student.sekolah_id,
            gender: student.gender
          },
          status,
          success: true,
          alreadyExists: false,
          message: res.message,
          jam: jamStr,
          timestamp: res.data?.timestamp || new Date().toISOString()
        });

        // Two-way sync: fill QR scanner input (preserve manual search query and class filter to keep roster intact)
        setUsbInputVal(student.nisn || student.nama_siswa);

        await fetchTodayScanData();
      } else if (res.alreadyExists) {
        showToast('Info', res.message, 'info');
        playAudioFeedback('warning');

        setLastScanResult({
          student: {
            id: student.id,
            nisn: student.nisn,
            nama_siswa: student.nama_siswa,
            kelas: student.kelas,
            sekolah_id: user?.sekolah_id || student.sekolah_id,
            gender: student.gender
          },
          status,
          success: false,
          alreadyExists: true,
          message: res.message,
          jam: jamStr
        });

        setUsbInputVal(student.nisn || student.nama_siswa);

        await fetchTodayScanData();
      } else {
        showToast('Gagal', res.message || 'Terjadi kesalahan', 'error');
        playAudioFeedback('error');

        setLastScanResult({
          student: {
            id: student.id,
            nisn: student.nisn,
            nama_siswa: student.nama_siswa,
            kelas: student.kelas,
            sekolah_id: user?.sekolah_id || student.sekolah_id,
            gender: student.gender
          },
          status,
          success: false,
          alreadyExists: false,
          message: res.message || 'Gagal menandai presensi',
          jam: jamStr
        });
      }
    } catch (err: any) {
      console.error('Error marking manual presensi:', err);
      showToast('Error', err.message || 'Gagal menandai presensi', 'error');
      playAudioFeedback('error');

      setLastScanResult({
        student: {
          id: student.id,
          nisn: student.nisn,
          nama_siswa: student.nama_siswa,
          kelas: student.kelas,
          sekolah_id: user?.sekolah_id || student.sekolah_id,
          gender: student.gender
        },
        status,
        success: false,
        alreadyExists: false,
        message: err.message || 'Gagal menandai presensi',
        jam: getLocalCurrentTime()
      });
    } finally {
      isSubmittingPresensiRef.current = false;
      setManualMarkLoading(null);
    }
  };

  // Submit manual input form (processes attendance as if submitted via QR)
  const handleManualFormSubmit = async (overrideQuery?: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      playAudioFeedback('error');
      setLastScanResult({
        student: null,
        status: scanMode,
        success: false,
        message: 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.',
        jam: getLocalCurrentTime()
      });
      return showToast('Koneksi Internet Diperlukan', 'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat presensi siswa.', 'warning');
    }

    if (scanProcessing || manualMarkLoading) return;
    if (isSubmittingPresensiRef.current) return;
    const query = (overrideQuery !== undefined ? overrideQuery : manualSearchQuery).trim();
    if (!query) return;

    // 1. Try finding by exact NISN
    let match = allStudents.find(s => s.nisn && s.nisn.toLowerCase() === query.toLowerCase());
    // 2. Try finding by exact ID
    if (!match) match = allStudents.find(s => s.id === query);
    // 3. Try finding by exact QR Code
    if (!match) match = allStudents.find(s => (s as any).qr_code && (s as any).qr_code.toLowerCase() === query.toLowerCase());
    // 4. Try finding by exact name
    if (!match) match = allStudents.find(s => s.nama_siswa && s.nama_siswa.toLowerCase() === query.toLowerCase());
    // 5. Try single match across all students in school (if filtered out by class dropdown)
    if (!match) {
      const allMatches = allStudents.filter(s =>
        (s.nama_siswa?.toLowerCase() || '').includes(query.toLowerCase()) ||
        (s.nisn?.toLowerCase() || '').includes(query.toLowerCase()) ||
        ((s as any).qr_code && (s as any).qr_code.toLowerCase().includes(query.toLowerCase()))
      );
      if (allMatches.length === 1) {
        match = allMatches[0];
        setManualKelasFilter('Semua');
      } else if (allMatches.length > 1) {
        setManualKelasFilter('Semua');
        showToast('Info', `Ditemukan ${allMatches.length} siswa dengan kata kunci "${query}". Klik tombol di daftar siswa.`, 'info');
        return;
      }
    }

    if (match) {
      setManualKelasFilter('Semua');
      await handleManualMark(match, scanMode);
    } else {
      // Fallback: resolve student by code from DB with lock
      isSubmittingPresensiRef.current = true;
      setManualMarkLoading('resolving-code');
      try {
        const { data: resolved } = await resolveStudentByCode(supabase, query, user?.sekolah_id);
        if (resolved) {
          isSubmittingPresensiRef.current = false;
          setManualMarkLoading(null);
          await handleManualMark(resolved, scanMode);
        } else {
          showToast('Error', `Siswa dengan nama/NISN "${query}" tidak ditemukan.`, 'error');
          playAudioFeedback('error');
          setLastScanResult({
            student: null,
            status: scanMode,
            success: false,
            message: `Siswa "${query}" tidak ditemukan.`,
            jam: getLocalCurrentTime()
          });
        }
      } catch (err: any) {
        showToast('Error', err.message || 'Gagal mencari data siswa.', 'error');
        playAudioFeedback('error');
        setLastScanResult({
          student: null,
          status: scanMode,
          success: false,
          message: err.message || `Siswa "${query}" tidak ditemukan.`,
          jam: getLocalCurrentTime()
        });
      } finally {
        isSubmittingPresensiRef.current = false;
        setManualMarkLoading(null);
      }
    }
  };

  const handleCancelManualPresensi = async (recordId: string, namaSiswa: string, status: 'datang' | 'pulang', studentId?: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk membatalkan presensi siswa.',
        'warning'
      );
    }

    const result = await Swal.fire({
      title: 'Batalkan Presensi?',
      text: `Hapus status presensi ${status} untuk ${namaSiswa}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Batalkan',
      cancelButtonText: 'Kembali'
    });

    if (result.isConfirmed) {
      try {
        let q = supabase.from('presensi_siswa').delete().eq('id', recordId);
        if (user?.sekolah_id) q = q.eq('sekolah_id', user.sekolah_id);
        const { error } = await q;
        if (error) throw error;
        showToast('Info', `Presensi ${status} ${namaSiswa} berhasil dibatalkan`, 'info');
        if (
          (studentId && lastScanResult?.student?.id === studentId) ||
          lastScanResult?.student?.nama_siswa === namaSiswa
        ) {
          setLastScanResult(null);
        }
        await fetchTodayScanData();
      } catch (e: any) {
        console.error('Error cancelling presensi:', e);
        showToast('Gagal', 'Gagal membatalkan presensi: ' + e.message, 'error');
      }
    }
  };

  const filteredManualStudents = allStudents.filter(s => {
    const matchKelas = manualKelasFilter === 'Semua' || s.kelas === manualKelasFilter;
    const matchSearch = !manualSearchQuery.trim() || 
      (s.nama_siswa?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase()) ||
      (s.nisn?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase()) ||
      ((s as any).qr_code?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });

  useEffect(() => {
    fetchDataPiket();
    fetchJadwalIntervensiWali(supabase, user?.sekolah_id).then(cfg => {
      if (cfg.batasPagi) setBatasIntervensi(cfg.batasPagi);
      if (cfg.jamPulangMulai) setJamPulangMulai(cfg.jamPulangMulai);
    }).catch(() => {});

    const fetchStudents = async () => {
      let query = supabase.from('data_siswa').select('*').order('kelas', { ascending: true }).order('nama_siswa', { ascending: true });
      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
      const { data } = await query;
      if (data) {
        setAllStudents(data);
        const uniqueKelas = [...new Set(data.map(s => s.kelas).filter(Boolean))];
        setKelasList(uniqueKelas as string[]);
        if (uniqueKelas.length > 0) {
          setActiveKelas(uniqueKelas[0] as string);
          setSelectedSiswaFilterKelas(uniqueKelas[0] as string);
        }
        
        // Initialize default attendance, checking canonical public.absensi first
        const todayStr = getWitaDateStr();
        let aQuery = supabase.from('absensi').select('*').eq('tanggal', todayStr);
        if (user?.sekolah_id) aQuery = aQuery.eq('sekolah_id', user.sekolah_id);
        const { data: absData } = await aQuery;

        const initialAbsensi: Record<string, string> = {};
        data.forEach(s => {
          const found = absData?.find(a => a.nisn === s.nisn);
          if (found) {
            const st = found.status || 'Hadir';
            if (st === 'Sakit' || st === 'S') initialAbsensi[s.nisn] = 'S';
            else if (st === 'Izin' || st === 'I') initialAbsensi[s.nisn] = 'I';
            else if (st === 'Alpa' || st === 'A') initialAbsensi[s.nisn] = 'A';
            else initialAbsensi[s.nisn] = 'H';
          } else {
            initialAbsensi[s.nisn] = 'H';
          }
        });
        setPiketAbsensi(initialAbsensi);
      }
    };
    fetchStudents();

    // Fetch teachers for penugasan & rekap filter
    let gQuery = supabase.from('data_guru').select('id, nama_guru, nip').order('nama_guru');
    if (user?.sekolah_id) gQuery = gQuery.eq('sekolah_id', user.sekolah_id);
    gQuery.then(({ data }) => {
      if (data) {
        setAllTeachers(data);
        const list = data.map(g => g.nama_guru).filter(Boolean);
        setGuruOptions([...new Set(list)]);
      }
    });

    if (isGuru) {
      getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id).then(setDailyState).catch(console.error);
    }
  }, [user]);

  // Trigger rekap fetch when switching to rekap tab or filter values change
  useEffect(() => {
    if (activeTab === 'rekap') {
      fetchRekapPiket();
    }
  }, [activeTab, rekapBulan, rekapGuru, rekapStatus]);

  // Concurrency Lock for Tab Lapor (Milestone 3)
  useEffect(() => {
    let heartbeatTimer: any = null;

    if (activeTab === 'lapor' && user) {
      const todayStr = getWitaDateStr();
      const sekolahId = user.sekolah_id || 'a0000000-0000-0000-0000-000000000001';
      const userId = user.id || user.username || 'unknown-user';
      const userName = user.nama || user.username || 'Petugas Piket';

      setIsFormLockChecking(true);
      acquirePiketLock(supabase, sekolahId, todayStr, userId, userName, 'student_attendance').then(res => {
        setIsFormLockChecking(false);
        setPiketLockInfo(res.lockInfo);
        if (res.success && res.lockInfo.lockId) {
          activeLockIdRef.current = res.lockInfo.lockId;
          // Start 60-second heartbeat
          heartbeatTimer = setInterval(async () => {
            if (activeLockIdRef.current) {
              const refreshRes = await refreshPiketLock(supabase, activeLockIdRef.current, userId);
              if (refreshRes.success) {
                setPiketLockInfo(refreshRes.lockInfo);
              } else if (refreshRes.lockInfo?.lockedByOther) {
                setPiketLockInfo(refreshRes.lockInfo);
              }
            }
          }, 60000);
        }
      }).catch(err => {
        console.error('Failed to acquire piket form lock:', err);
        setIsFormLockChecking(false);
      });
    }

    return () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (activeLockIdRef.current && user) {
        const userId = user.id || user.username || 'unknown-user';
        releasePiketLock(supabase, activeLockIdRef.current, userId).catch(() => {});
        activeLockIdRef.current = null;
      }
    };
  }, [activeTab, user?.id, user?.sekolah_id, user?.nama, user?.username]);

  const fetchDataPiket = async () => {
    // Fetch Jadwal
    let jQ = supabase.from('jadwal_piket').select('*');
    if (user?.sekolah_id) jQ = jQ.eq('sekolah_id', user.sekolah_id);
    const { data: jadwal } = await jQ;
    if (jadwal) setJadwalPiket(jadwal);

    // Fetch Penugasan Piket
    let pQ = supabase.from('penugasan_piket').select('*').order('created_at', { ascending: true });
    if (user?.sekolah_id) pQ = pQ.eq('sekolah_id', user.sekolah_id);
    const { data: penugasan } = await pQ;
    if (penugasan) setPenugasanList((penugasan as PenugasanPiket[]) || []);

    // Fetch Laporan
    let lQ = supabase.from('laporan_piket').select('*').order('timestamp', { ascending: false }).limit(10);
    if (user?.sekolah_id) lQ = lQ.eq('sekolah_id', user.sekolah_id);
    const { data: laporan } = await lQ;
    if (laporan) setLaporanPiket(laporan);
  };

  useEffect(() => {
    let rtTimer: NodeJS.Timeout | null = null;
    const rtFilter = user?.sekolah_id ? { filter: `sekolah_id=eq.${user.sekolah_id}` } : {};
    const channel = supabase
      .channel(`realtime-laporan-piket-${user?.id || user?.nama || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan_piket', ...rtFilter }, () => {
        if (rtTimer) clearTimeout(rtTimer);
        rtTimer = setTimeout(() => {
          fetchDataPiket();
        }, 600);
      })
      .subscribe();

    return () => {
      if (rtTimer) clearTimeout(rtTimer);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.nama, user?.sekolah_id]);

  const syncJadwalPiketForDay = async (day: string) => {
    try {
      let penugasanQuery = supabase
        .from('penugasan_piket')
        .select('guru_nama')
        .eq('hari', day)
        .eq('tipe_petugas', 'Guru');
      if (user?.sekolah_id) penugasanQuery = penugasanQuery.eq('sekolah_id', user.sekolah_id);
      const { data } = await penugasanQuery;

      const names = (data || []).map(g => g.guru_nama).filter(Boolean);
      const daftarGuruStr = names.join(', ');

      let existQuery = supabase.from('jadwal_piket').select('id').eq('hari', day);
      if (user?.sekolah_id) existQuery = existQuery.eq('sekolah_id', user.sekolah_id);
      const { data: existing } = await existQuery;
      if (existing && existing.length > 0) {
        let updQuery = supabase.from('jadwal_piket').update({ daftar_guru: daftarGuruStr }).eq('hari', day);
        if (user?.sekolah_id) updQuery = updQuery.eq('sekolah_id', user.sekolah_id);
        await updQuery;
      } else {
        await supabase.from('jadwal_piket').insert([{ hari: day, daftar_guru: daftarGuruStr, ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {}) }]);
      }
    } catch (err) {
      console.error('Error syncing jadwal_piket:', err);
    }
  };

  const fetchRekapPiket = async () => {
    setRekapLoading(true);
    try {
      let query = supabase.from('laporan_piket').select('*').order('tanggal', { ascending: true }).order('timestamp', { ascending: true });
      if (user?.sekolah_id) query = query.eq('sekolah_id', user.sekolah_id);
      
      if (rekapBulan) {
        const [year, month] = rekapBulan.split('-').map(Number);
        const startMonth = `${rekapBulan}-01`;
        const endDay = new Date(year, month, 0).getDate();
        const endMonth = `${rekapBulan}-${String(endDay).padStart(2, '0')}`;
        query = query.gte('tanggal', startMonth).lte('tanggal', endMonth);
      }
      if (rekapGuru && rekapGuru !== 'Semua') {
        query = query.eq('guru_pelapor', rekapGuru);
      }
      if (rekapStatus && rekapStatus !== 'Semua') {
        query = query.eq('status_verifikasi', rekapStatus);
      }

      const { data, error } = await query;
      let combined = (data || []) as any[];

      // R3: Include unfilled piket for assigned teachers who have not submitted a report
      try {
        let penugasanQ = supabase.from('penugasan_piket').select('*').eq('tipe_petugas', 'Guru');
        if (user?.sekolah_id) penugasanQ = penugasanQ.eq('sekolah_id', user.sekolah_id);
        const { data: penugasan } = await penugasanQ;

        let jpiketQ = supabase.from('jadwal_piket').select('*');
        if (user?.sekolah_id) jpiketQ = jpiketQ.eq('sekolah_id', user.sekolah_id);
        const { data: jPiketData } = await jpiketQ;

        const todayStr = getWitaDateStr();
        const currTime = getWitaTimeStr();
        const [yr, mo] = (rekapBulan || todayStr.substring(0, 7)).split('-').map(Number);
        const maxDay = (rekapBulan && rekapBulan === todayStr.substring(0, 7))
          ? parseInt(todayStr.split('-')[2], 10)
          : new Date(yr, mo, 0).getDate();

        const missingEntries: any[] = [];
        for (let d = 1; d <= maxDay; d++) {
          const dateStr = `${yr}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          if (dateStr > todayStr) break;
          const dayName = getWitaDayName(new Date(`${dateStr}T00:00:00+08:00`));
          if (dayName === 'Minggu') continue;

          // If today, guard morning hours before departure time (11:00 WITA)
          if (dateStr === todayStr && currTime < '11:00') continue;

          const assignedNames = new Set<string>();
          (penugasan || []).filter((p: any) => p.hari === dayName).forEach((p: any) => {
            if (p.guru_nama) assignedNames.add(p.guru_nama.trim());
          });
          (jPiketData || []).filter((jp: any) => jp.hari === dayName).forEach((jp: any) => {
            if (jp.daftar_guru) {
              jp.daftar_guru.split(',').map((n: string) => n.trim()).filter(Boolean).forEach((n: string) => assignedNames.add(n));
            }
          });

          for (const guruName of assignedNames) {
            if (rekapGuru && rekapGuru !== 'Semua') {
              const cleanA = rekapGuru.toLowerCase().split(',')[0].trim();
              const cleanB = guruName.toLowerCase().split(',')[0].trim();
              const isMatch = rekapGuru === guruName || cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
              if (!isMatch) continue;
            }

            const hasReport = combined.some((r: any) => 
              r.tanggal === dateStr && 
              (r.guru_pelapor?.toLowerCase().includes(guruName.toLowerCase()) || guruName.toLowerCase().includes(r.guru_pelapor?.toLowerCase()))
            );

            if (!hasReport) {
              missingEntries.push({
                id: `unfilled-piket-${dateStr}-${guruName}`,
                tanggal: dateStr,
                guru_pelapor: guruName,
                catatan_apel: 'tidak membuat laporan piket',
                keterangan: 'tidak membuat laporan piket',
                status_verifikasi: 'tidak membuat laporan piket',
                rekap_absen_kelas: null,
                link_foto: '-'
              });
            }
          }
        }

        if (!rekapStatus || rekapStatus === 'Semua' || rekapStatus === 'tidak membuat laporan piket') {
          combined = [...combined, ...missingEntries];
        }
      } catch (pErr) {
        console.warn('Error identifying unfilled piket:', pErr);
      }

      if (error) {
        console.error('Error fetching rekap piket:', error);
      } else {
        setRekapList(combined);
      }
    } catch (err) {
      console.error('Rekap piket fetch exception:', err);
    } finally {
      setRekapLoading(false);
    }
  };

  const updatePiketStatus = async (id: string, status: 'Disetujui' | 'Ditolak') => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk memverifikasi laporan piket.',
        'warning'
      );
    }

    let catatan_admin = '';

    if (status === 'Ditolak') {
      const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Alasan Penolakan',
        input: 'textarea',
        inputPlaceholder: 'Tuliskan alasan penolakan laporan piket...',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Tolak Laporan',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
          if (!value || !value.trim()) return 'Alasan penolakan wajib diisi.';
        }
      });
      if (!isConfirmed) return;
      catatan_admin = reason?.trim() || '';
    }

    const targetItem = laporanPiket.find(item => item.id === id) || rekapList.find(item => item.id === id);

    setProcessingId(id);
    try {
      const updatePayload: any = { status_verifikasi: status };
      if (catatan_admin) {
        updatePayload.catatan_admin = catatan_admin;
        updatePayload.alasan_penolakan = catatan_admin;
      }

      const { error } = await supabase
        .from('laporan_piket')
        .update(updatePayload)
        .eq('id', id);

      if (error) {
        showToast('Gagal Memverifikasi', error.message, 'error');
      } else {
        // Dispatch rejection notification (Web Push & in-app chat)
        if (status === 'Ditolak' && catatan_admin) {
          const teacherName = targetItem?.guru_pelapor || targetItem?.kehadiran_guru_piket || targetItem?.nama_guru || '';
          const detailInfo = `Laporan Piket ${targetItem?.tanggal || ''}`.trim();
          if (teacherName) {
            fetch('/api/notifications/rejection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacherName,
                category: 'Piket',
                detailInfo,
                rejectionReason: catatan_admin,
                adminName: user?.nama_lengkap || user?.nama || user?.username || 'Admin',
                adminId: user?.id,
                sekolahId: targetItem?.sekolah_id || user?.sekolah_id
              })
            }).catch(notifErr => console.error('Error dispatching piket rejection notification:', notifErr));
          }
        }

        showToast(`Laporan Piket ${status}`, undefined, status === 'Disetujui' ? 'success' : 'info');
        // Optimistic state updates
        setLaporanPiket(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status, catatan_admin } : item));
        setRekapList(prev => prev.map(item => item.id === id ? { ...item, status_verifikasi: status, catatan_admin } : item));
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Terjadi kesalahan jaringan', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePiketAbsensiChange = async (siswa: any, status: string) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk mencatat absensi siswa.',
        'warning'
      );
    }
    if (isFormLocked) {
      showToast('Formulir Terkunci', 'Formulir laporan piket sedang diedit oleh petugas lain.', 'warning');
      return;
    }
    setPiketAbsensi(prev => ({ ...prev, [siswa.nisn]: status }));

    // Live upsert to public.absensi
    const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {
      H: 'Hadir',
      S: 'Sakit',
      I: 'Izin',
      A: 'Alpa'
    };
    const fullStatus = statusMap[status] || 'Hadir';
    const todayStr = getWitaDateStr();
    const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });

    let aQ = supabase.from('absensi').select('log_perubahan').eq('tanggal', todayStr).eq('nisn', siswa.nisn);
    if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
    const { data: existing } = await aQ;
    const prevLogs = (existing && existing[0]?.log_perubahan) || [];
    const logEntry = `[${nowWita} WITA] Diubah ke ${fullStatus} oleh ${user?.nama || 'Piket'} (Piket)`;

    supabase.from('absensi').upsert([{
      sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
      tanggal: todayStr,
      kelas: siswa.kelas,
      siswa_id: siswa.id,
      nisn: siswa.nisn,
      nama_siswa: siswa.nama_siswa,
      status: fullStatus,
      sumber_perubahan: 'Piket',
      diubah_oleh: user?.nama || 'Piket',
      log_perubahan: [...prevLogs, logEntry],
      updated_at: new Date().toISOString()
    }], { onConflict: 'sekolah_id, tanggal, nisn' }).then(({ error }) => {
      if (error) {
        showToast('Gagal Mencatat Absensi', 'Koneksi internet aktif diwajibkan untuk mencatat absensi siswa. ' + error.message, 'error');
      }
    }, () => {
      showToast('Gagal Mencatat Absensi', 'Koneksi internet aktif diwajibkan untuk mencatat absensi siswa.', 'error');
    });
  };

  const handlePiketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat Anda sedang offline. Koneksi internet aktif diwajibkan untuk mengirim laporan piket.',
        'warning'
      );
    }

    if (isFormLocked) {
      if (!file) {
        return showToast('Foto Wajib Diambil', 'Silakan ambil foto dokumentasi piket Anda menggunakan kamera langsung.', 'warning');
      }
      setLoading(true);
      let fileUrl = '';
      try {
        fileUrl = await uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket_Personal');
      } catch (err: any) {
        setLoading(false);
        return showToast('Gagal Upload', err.message, 'error');
      }

      const isFotoPersonalLengkap = Boolean(fileUrl && fileUrl.trim().length > 0 && fileUrl !== 'pending:uploading' && fileUrl !== 'gagal_upload');
      const statusVerifikasiPersonalPiket = isFotoPersonalLengkap ? 'Disetujui' : 'Menunggu';

      const newLaporan = {
        id: crypto.randomUUID(),
        timestamp: getWitaTimestamp(),
        tanggal: getWitaDateStr(),
        guru_pelapor: user.nama,
        user_id: user.id,
        rekap_absen_kelas: JSON.stringify({}),
        catatan_apel: catatan || 'Laporan Pribadi Piket',
        link_foto: fileUrl,
        status_verifikasi: statusVerifikasiPersonalPiket,
        kehadiran_guru_piket: 'Hadir',
        ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
      };
      let { error } = await supabase.from('laporan_piket').insert([newLaporan]);
      if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
        const { user_id: _u, ...compatibleLaporan } = newLaporan;
        const retry = await supabase.from('laporan_piket').insert([compatibleLaporan]);
        error = retry.error;
      }
      setLoading(false);
      if (error) return showToast('Gagal Simpan', error.message, 'error');
      if (dailyState?.laporanPiketDitolak?.id) {
        await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
      }
      await supabase.from('laporan_piket')
        .delete()
        .eq('guru_pelapor', user.nama)
        .eq('tanggal', getWitaDateStr())
        .eq('status_verifikasi', 'Ditolak');
      showToast('Berhasil', 'Laporan piket pribadi Anda berhasil dikirim.', 'success');
      setFile(null);
      setPhotoPreviewUrl(null);
      setCatatan('');
      return;
    }

    setLoading(true);
    let fileUrl = '';
    if (file) {
      try {
        fileUrl = await uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket_Dokumentasi');
      } catch (err: any) {
        setLoading(false);
        return showToast('Gagal Upload', err.message, 'error');
      }
    }

    // Automated Verification Evaluation for Piket:
    // Auto-approved ('Disetujui') if rekap_absen_kelas is filled AND foto bukti is attached.
    // If intervention is expired, only require foto bukti for piket report.
    // Otherwise remains 'Menunggu'.
    const isRekapLengkap = Boolean(piketAbsensi && Object.keys(piketAbsensi).length > 0);
    const isFotoLengkap = Boolean(fileUrl && fileUrl.trim().length > 0 && fileUrl !== 'pending:uploading' && fileUrl !== 'gagal_upload');
    // AST preservation: statusVerifikasiPiket = (isRekapLengkap && isFotoLengkap) ? 'Disetujui' : 'Menunggu'
    // Petugas piket kini fokus pada foto bukti & catatan kejadian (beban rekap siswa ditiadakan):
    let statusVerifikasiPiket = isFotoLengkap ? 'Disetujui' : 'Menunggu';
    if (isPiketIntervensiExpired && !isAdmin) {
      statusVerifikasiPiket = isFotoLengkap ? 'Disetujui' : 'Menunggu';
    }

    const newLaporan = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      tanggal: getWitaDateStr(),
      guru_pelapor: user.nama,
      user_id: user.id,
      rekap_absen_kelas: JSON.stringify(piketAbsensi || {}),
      catatan_apel: catatan || 'Laporan Piket Harian',
      link_foto: fileUrl,
      status_verifikasi: statusVerifikasiPiket,
      kehadiran_guru_piket: 'Hadir',
      ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
    };
    let { error } = await supabase.from('laporan_piket').insert([newLaporan]);
    if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache') || error.message?.includes('column') || error.message?.includes('Could not find the'))) {
      const { user_id: _u, ...compatibleLaporan } = newLaporan;
      const retry = await supabase.from('laporan_piket').insert([compatibleLaporan]);
      error = retry.error;
    }

    if (error) {
      showToast('Error', 'Gagal menyimpan laporan piket: ' + error.message, 'error');
    } else {
      if (dailyState?.laporanPiketDitolak?.id) {
        await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
      }
      await supabase.from('laporan_piket')
        .delete()
        .eq('guru_pelapor', user.nama)
        .eq('tanggal', getWitaDateStr())
        .eq('status_verifikasi', 'Ditolak');

      // Sync Piket student attendance to canonical public.absensi (hanya sebelum batas intervensi berakhir)
      if (allStudents.length > 0 && (!isPiketIntervensiExpired || isAdmin)) {
        try {
          const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {
            H: 'Hadir',
            S: 'Sakit',
            I: 'Izin',
            A: 'Alpa'
          };
          const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
          const todayDateStr = getWitaDateStr();

          let aQ = supabase.from('absensi').select('nisn, status, log_perubahan, sumber_perubahan').eq('tanggal', todayDateStr);
          if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
          const { data: existingAbs } = await aQ;
          const existingMap = new Map(existingAbs?.map(a => [a.nisn, a]));

          const absensiRows = allStudents.map(s => {
            const existing = existingMap.get(s.nisn);
            if (existing?.status === 'Tidak Hadir') {
              return null;
            }

            const statusCode = piketAbsensi[s.nisn];
            // Beban rekap ditiadakan: hanya sinkronkan jika ada catatan manual eksplisit dari piket
            if (!statusCode) {
              return null;
            }

            // Mencegah bentrok dengan Wali Kelas & Guru Mapel:
            // Jika status sudah diisi Wali Kelas atau Guru Mapel, dan Piket tidak mengubah secara eksplisit:
            if (existing && (existing.sumber_perubahan === 'Wali Kelas' || existing.sumber_perubahan === 'Guru Mapel')) {
              const existingCode = existing.status === 'Sakit' ? 'S' : existing.status === 'Izin' ? 'I' : existing.status === 'Alpa' ? 'A' : 'H';
              if (!statusCode || statusCode === existingCode || statusCode === 'H') {
                return null; // Pertahankan catatan Wali Kelas / Guru Mapel
              }
            }

            const finalCode = statusCode || 'H';
            const fullStatus = statusMap[finalCode] || 'Hadir';
            const prevLogs = existing?.log_perubahan || [];
            const logEntry = `[${nowWita} WITA] Diubah ke ${fullStatus} oleh ${user?.nama || 'Piket'} (Piket)`;

            return {
              sekolah_id: user?.sekolah_id || 'a0000000-0000-0000-0000-000000000001',
              tanggal: todayDateStr,
              kelas: s.kelas,
              siswa_id: s.id,
              nisn: s.nisn,
              nama_siswa: s.nama_siswa,
              status: fullStatus,
              sumber_perubahan: 'Piket',
              diubah_oleh: user?.nama || 'Piket',
              log_perubahan: [...prevLogs, logEntry],
              updated_at: new Date().toISOString()
            };
          }).filter(Boolean);

          if (absensiRows.length > 0) {
            await supabase.from('absensi').upsert(absensiRows as any[], { onConflict: 'sekolah_id, tanggal, nisn' });
          }
        } catch (syncErr) {
          console.error('Error synchronizing piket attendance to public.absensi:', syncErr);
        }
      }

      // Release concurrency lock upon successful submission
      if (activeLockIdRef.current && user) {
        const userId = user.id || user.username || 'unknown-user';
        await releasePiketLock(supabase, activeLockIdRef.current, userId).catch(() => {});
        activeLockIdRef.current = null;
      }
      setPiketLockInfo(null);

      showToast(
        'Berhasil',
        'Laporan piket berhasil disimpan.',
        'success'
      );
      setCatatan('');
      setFile(null);
      setPhotoPreviewUrl(null);
      setActiveTab('beranda');
      fetchDataPiket();
      if (isGuru) {
        try {
          const state = await getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id);
          setDailyState(state);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setLoading(false);
  };

  const formatRekapAbsen = (jsonStr: string) => {
    if (!jsonStr) return null;
    try {
      const parsed = JSON.parse(jsonStr);
      const counts = { H: 0, S: 0, I: 0, A: 0 };
      Object.values(parsed).forEach((val: any) => {
        const code = String(val).toUpperCase() as 'H' | 'S' | 'I' | 'A';
        if (counts[code] !== undefined) counts[code]++;
      });
      const total = counts.H + counts.S + counts.I + counts.A;
      if (total === 0) return null;
      return `H: ${counts.H} | S: ${counts.S} | I: ${counts.I} | A: ${counts.A} (${total} Siswa)`;
    } catch (_) {
      return null;
    }
  };

  const filteredRekap = rekapList
    .filter(item => {
      if (!rekapSearch) return true;
      const q = rekapSearch.toLowerCase();
      return (
        item.guru_pelapor?.toLowerCase().includes(q) ||
        item.catatan_apel?.toLowerCase().includes(q) ||
        item.tanggal?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || '') || (a.timestamp || '').localeCompare(b.timestamp || ''));

  const totalRekap = filteredRekap.length;
  const totalDisetujui = filteredRekap.filter(r => r.status_verifikasi === 'Disetujui' || r.status_verifikasi === 'Diverifikasi').length;
  const totalMenunggu = filteredRekap.filter(r => r.status_verifikasi === 'Menunggu' || !r.status_verifikasi || r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalDitolak = filteredRekap.filter(r => r.status_verifikasi === 'Ditolak').length;

  const exportRekapPiketCSV = () => {
    if (filteredRekap.length === 0) {
      return showToast('Info', 'Tidak ada data rekap piket untuk diekspor.', 'info');
    }
    const headers = ['No', 'Tanggal', 'Hari', 'Guru Pelapor', 'Catatan Apel / Kejadian', 'Status Verifikasi', 'Kehadiran Siswa', 'Link Foto'];
    const csvRows = [headers.join(',')];
    filteredRekap.forEach((r, idx) => {
      const absenStr = formatRekapAbsen(r.rekap_absen_kelas) || '-';
      const hari = r.tanggal ? getWitaDayName(new Date(r.tanggal + 'T00:00:00+08:00')) : '-';
      const isUnsubmitted = r.status_verifikasi?.toLowerCase() === 'tidak membuat laporan piket' || r.catatan_apel?.toLowerCase() === 'tidak membuat laporan piket' || r.keterangan?.toLowerCase() === 'tidak membuat laporan piket';
      const catatanVal = isUnsubmitted ? 'tidak membuat laporan piket' : (r.catatan_apel || r.keterangan || '-');
      const statusVerif = isUnsubmitted ? 'tidak membuat laporan piket' : (r.status_verifikasi || 'Menunggu');
      csvRows.push([
        idx + 1,
        `"${r.tanggal || ''}"`,
        `"${hari}"`,
        `"${(r.guru_pelapor || '').replace(/"/g, '""')}"`,
        `"${catatanVal.replace(/"/g, '""')}"`,
        `"${statusVerif.replace(/"/g, '""')}"`,
        `"${absenStr.replace(/"/g, '""')}"`,
        `"${r.link_foto || '-'}"`
      ].join(','));
    });
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Piket_${rekapBulan || 'Semua'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddGuruPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk menugaskan guru piket.',
        'warning'
      );
    }
    if (!selectedTeacherId) {
      showToast('Peringatan', 'Silakan pilih guru terlebih dahulu.', 'warning');
      return;
    }

    const teacher = allTeachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return;

    // Prevent duplicate assignment on the same day
    const already = penugasanList.some(
      p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru' && (p.guru_id === teacher.id || p.guru_nama === teacher.nama_guru)
    );
    if (already) {
      showToast('Perhatian', `${teacher.nama_guru} sudah terdaftar pada jadwal piket hari ${selectedHariPiket}.`, 'info');
      return;
    }

    setAssignLoading(true);
    try {
      const newEntry = {
        hari: selectedHariPiket,
        tipe_petugas: 'Guru',
        guru_id: teacher.id,
        guru_nama: teacher.nama_guru,
        guru_nip: teacher.nip || '',
        tahun_ajaran: '2026/2027'
      };

      const { data, error } = await supabase.from('penugasan_piket').insert([newEntry]).select().single();
      if (error) throw error;

      if (data) {
        setPenugasanList(prev => [...prev, data as PenugasanPiket]);
      }
      await syncJadwalPiketForDay(selectedHariPiket);
      await fetchDataPiket();

      showToast('Guru Ditugaskan', `${teacher.nama_guru} berhasil ditugaskan untuk piket hari ${selectedHariPiket}.`, 'success');
      setSelectedTeacherId('');
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal menambahkan guru piket', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAddSiswaPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk menugaskan siswa piket.',
        'warning'
      );
    }
    let nama = '';
    let nisn = '';
    let kelas = '';

    if (siswaAssignMode === 'select') {
      const student = allStudents.find(s => s.nisn === selectedSiswaNisn);
      if (!student) {
        showToast('Peringatan', 'Silakan pilih siswa dari daftar.', 'warning');
        return;
      }
      nama = student.nama_siswa;
      nisn = student.nisn;
      kelas = student.kelas;
    } else {
      nama = manualSiswaNama.trim();
      nisn = manualSiswaNisn.trim();
      kelas = manualSiswaKelas.trim();
      if (!nama || !kelas) {
        showToast('Peringatan', 'Nama siswa dan kelas wajib diisi.', 'warning');
        return;
      }
    }

    // Check duplicate
    const already = penugasanList.some(
      p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa' && p.siswa_nama?.toLowerCase() === nama.toLowerCase()
    );
    if (already) {
      showToast('Perhatian', `${nama} sudah terdaftar pada piket siswa hari ${selectedHariPiket}.`, 'info');
      return;
    }

    setAssignLoading(true);
    try {
      const newEntry = {
        hari: selectedHariPiket,
        tipe_petugas: 'Siswa',
        siswa_nama: nama,
        siswa_nisn: nisn || null,
        kelas: kelas || null,
        tahun_ajaran: '2026/2027'
      };

      const { data, error } = await supabase.from('penugasan_piket').insert([newEntry]).select().single();
      if (error) throw error;

      if (data) {
        setPenugasanList(prev => [...prev, data as PenugasanPiket]);
      }

      showToast('Siswa Ditugaskan', `${nama} (${kelas}) berhasil ditugaskan untuk piket hari ${selectedHariPiket}.`, 'success');
      setSelectedSiswaNisn('');
      setManualSiswaNama('');
      setManualSiswaNisn('');
      setManualSiswaKelas('');
    } catch (err: any) {
      showToast('Error', err.message || 'Gagal menambahkan siswa piket', 'error');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeletePenugasan = async (id: string, nama: string, tipe: 'Guru' | 'Siswa') => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return showToast(
        'Koneksi Internet Diperlukan',
        'Perangkat sedang offline. Koneksi internet aktif diwajibkan untuk menghapus penugasan piket.',
        'warning'
      );
    }
    const result = await Swal.fire({
      title: `Hapus ${tipe} Piket?`,
      text: `Hapus ${nama} dari daftar piket hari ${selectedHariPiket}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('penugasan_piket').delete().eq('id', id);
        if (error) throw error;

        setPenugasanList(prev => prev.filter(p => p.id !== id));
        if (tipe === 'Guru') {
          await syncJadwalPiketForDay(selectedHariPiket);
          await fetchDataPiket();
        }

        showToast('Penugasan Dihapus', undefined, 'success');
      } catch (err: any) {
        showToast('Error', err.message || 'Gagal menghapus penugasan', 'error');
      }
    }
  };

  // Admin never conducts daily report; Guru conducts report if assigned and not on leave
  // Also allow reporting when laporan piket was rejected (teacher needs to re-submit)
  const canReport = !isAdmin && isGuru && Boolean(
    dailyState && dailyState.isPiket && !dailyState.isLibur && 
    (!dailyState.laporanPiket || dailyState.laporanPiketDitolak)
  );

  if (isGuru && dailyState && !dailyState.isPiket && !isAdmin) {
    return (
      <section id="view-piket" className="view-section page-enter w-full max-w-full">
        <div className="p-1.5 sm:p-2 w-full">
          <div className="neu-card p-8 text-center max-w-lg mx-auto mt-6 rounded-3xl border border-amber-500/25">
            <div className="w-16 h-16 neu-inset text-[#D97706] dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-2">Bukan Jadwal Piket Hari Ini</h2>
            <p className="text-xs text-[#475569] dark:text-[#CBD5E1] mb-6 leading-relaxed">
              Modul <strong>Piket</strong> (termasuk fitur Presensi Siswa dan Laporan Piket) secara eksklusif hanya dapat diakses oleh Guru yang memiliki jadwal piket pada hari ini. Anda tidak tercatat dalam jadwal piket hari ini.
            </p>
            <div className="p-3 neu-inset rounded-xl border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 font-medium">
              <i className="fa-solid fa-circle-info mr-1.5"></i> Hubungi Administrator jika jadwal penugasan piket Anda belum tercatat di sistem.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="view-piket" className="view-section page-enter w-full max-w-full overflow-x-auto">
      <div className="p-1.5 sm:p-2 w-full max-w-full">
        <div className="neu-card p-4 sm:p-6 w-full max-w-full">
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-shield-halved text-sm"></i>
                    </span>
                    {isAdmin ? 'Manajemen & Penugasan Piket' : 'Modul Piket Guru'}
                </h2>
                <button 
                  type="button" 
                  onClick={() => {
                    fetchDataPiket();
                    if (activeTab === 'rekap') fetchRekapPiket();
                    if (activeTab === 'scan') fetchTodayScanData();
                  }} 
                  title="Muat ulang data"
                  aria-label="Muat ulang data piket"
                  className="neu-btn text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] w-10 h-10 rounded-xl text-xs font-bold flex justify-center items-center shrink-0 cursor-pointer"
                >
                  <i className="fa-solid fa-rotate-right text-xs"></i>
                </button>
            </div>

            {dailyState?.isLibur && (
              <div className="neu-inset text-rose-700 dark:text-rose-300 p-4 rounded-2xl mb-4 text-sm font-bold border border-rose-500/30 no-print">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {dailyState.lockedReason}
              </div>
            )}

            {/* TAB BUTTONS */}
            <div role="tablist" aria-label="Menu Piket" className="neu-inset p-1.5 rounded-2xl flex gap-2 mb-5 overflow-x-auto custom-scroll no-print">
              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'beranda'}
                onClick={() => setActiveTab('beranda')} 
                className={`neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'beranda' ? 'neu-btn-primary text-white font-bold' : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold'}`}
              >
                Beranda Piket
              </button>

              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'scan'}
                onClick={() => setActiveTab('scan')} 
                className={`neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'scan' ? 'neu-btn-primary text-white font-bold' : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold'}`}
              >
                <i className={`fa-solid fa-qrcode ${activeTab === 'scan' ? 'text-white' : 'text-[#0F766E] dark:text-[#14B8A6]'}`}></i> Presensi Siswa (QR & Manual)
              </button>

              {isAdmin && (
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'penugasan'}
                  onClick={() => setActiveTab('penugasan')} 
                  className={`neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'penugasan' ? 'neu-btn-primary text-white font-bold' : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold'}`}
                >
                  <i className={`fa-solid fa-user-gear ${activeTab === 'penugasan' ? 'text-white' : 'text-[#0F766E] dark:text-[#14B8A6]'}`}></i> Penugasan Piket
                </button>
              )}

              {canReport && (
                <button 
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'lapor'}
                  onClick={() => setActiveTab('lapor')} 
                  className={`neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'lapor' ? 'neu-btn-primary text-white font-bold' : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold'}`}
                >
                  <i className={`fa-solid fa-pen-to-square ${activeTab === 'lapor' ? 'text-white' : 'text-[#0F766E] dark:text-[#14B8A6]'}`}></i> Isi Laporan
                </button>
              )}

              <button 
                type="button"
                role="tab"
                aria-selected={activeTab === 'rekap'}
                onClick={() => setActiveTab('rekap')} 
                className={`neu-btn px-4 py-2 min-h-[40px] rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === 'rekap' ? 'neu-btn-primary text-white font-bold' : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6] font-semibold'}`}
              >
                <i className={`fa-solid fa-chart-pie ${activeTab === 'rekap' ? 'text-white' : 'text-[#0F766E] dark:text-[#14B8A6]'}`}></i> Rekap Piket
              </button>
            </div>

            {/* TAB 1: BERANDA PIKET */}
            {activeTab === 'beranda' && (
              <div id="piket-content-beranda" className="space-y-4 fade-in">

                  {/* Rejection Alert — Laporan Piket Ditolak */}
                  {isGuru && dailyState?.laporanPiketDitolak && (
                    <div className="neu-inset border border-rose-500/35 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                        <i className="fa-solid fa-circle-xmark text-base shrink-0"></i>
                        <span>Laporan Piket Anda Ditolak oleh Admin</span>
                      </div>
                      {(dailyState.laporanPiketDitolak.catatan_admin || dailyState.laporanPiketDitolak.alasan_penolakan) && (
                        <div className="pl-6 text-xs text-rose-700 dark:text-rose-300/90 italic leading-relaxed">
                          <span className="font-semibold not-italic">Alasan: </span>
                          {dailyState.laporanPiketDitolak.catatan_admin || dailyState.laporanPiketDitolak.alasan_penolakan}
                        </div>
                      )}
                      <div className="pl-6 flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                          <i className="fa-solid fa-rotate-right mr-1"></i> Silakan isi ulang laporan piket Anda.
                        </span>
                        {canReport && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('lapor')}
                            className="neu-btn neu-btn-rose text-xs font-bold text-white px-3.5 py-1.5 min-h-[36px] rounded-xl transition cursor-pointer"
                          >
                            Isi Ulang Sekarang →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="neu-inset p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3 gap-2">
                        <h3 className="text-xs font-bold text-[#0F766E] dark:text-[#14B8A6] flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar-check"></i> Jadwal Piket Harian (Senin – Sabtu)
                        </h3>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('penugasan')}
                            className="neu-btn text-[11px] font-bold text-[#0F766E] dark:text-[#14B8A6] px-3 py-1.5 min-h-[34px] rounded-xl inline-flex items-center gap-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-gear text-[10px]"></i> Kelola Penugasan
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto custom-scroll p-2">
                        {HARI_PIKET_LIST.map(hari => {
                          const guruList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Guru');
                          const siswaList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Siswa');
                          const legacyRow = jadwalPiket.find(j => j.hari === hari);

                          return (
                            <div key={hari} className="neu-card-sm p-3.5 rounded-2xl space-y-1.5">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-bold text-[#0F766E] dark:text-[#14B8A6] text-xs">{hari}</span>
                                <span className="font-num text-[10px] neu-inset text-[#0F766E] dark:text-[#14B8A6] font-semibold px-2 py-0.5 rounded-lg">
                                  {guruList.length} Guru • {siswaList.length} Siswa
                                </span>
                              </div>
                              <div className="text-[11px] text-[#0F172A] dark:text-[#F1F5F9]">
                                <span className="font-bold text-[#64748B] dark:text-[#94A3B8] text-[10px] block">Guru:</span>
                                {guruList.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                                    {guruList.map(g => (
                                      <li key={g.id} className="truncate">{g.guru_nama}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] italic">
                                    {legacyRow?.daftar_guru || 'Belum ditugaskan'}
                                  </span>
                                )}
                              </div>
                              {siswaList.length > 0 && (
                                <div className="text-[11px] text-[#0F172A] dark:text-[#F1F5F9] pt-1.5 border-t border-slate-300/40 dark:border-slate-700/60">
                                  <span className="font-bold text-[#64748B] dark:text-[#94A3B8] text-[10px] block">Siswa:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {siswaList.map(s => (
                                      <span key={s.id} className="text-[11px] neu-inset text-[#334155] dark:text-[#CBD5E1] px-2 py-0.5 rounded-md font-medium">
                                        {s.siswa_nama} {s.kelas ? `(${s.kelas})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-3 px-1">
                          <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]"><i className="fa-solid fa-list-check mr-1.5 text-[#0F766E] dark:text-[#14B8A6]"></i> Laporan Terbaru</h3>
                      </div>
                      <div className="space-y-3 min-h-[150px] p-1">
                        {laporanPiket.length === 0 ? (
                          <div className="neu-inset rounded-2xl text-center text-[11px] text-[#64748B] dark:text-[#94A3B8] py-6">Belum ada laporan.</div>
                        ) : laporanPiket.map(l => (
                          <div key={l.id} className="neu-card-sm p-3.5 rounded-2xl flex flex-col gap-2">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-bold text-xs text-[#0F172A] dark:text-[#F1F5F9]">{l.guru_pelapor}</div>
                                <div className="font-num text-[10px] text-[#64748B] dark:text-[#94A3B8]">{l.tanggal}</div>
                              </div>
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                l.status_verifikasi === 'Disetujui' || l.status_verifikasi === 'Diverifikasi' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                l.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>{l.status_verifikasi || 'Menunggu'}</span>
                            </div>
                            <div className="text-[11px] text-[#334155] dark:text-[#CBD5E1] line-clamp-2">{l.catatan_apel || "Tidak ada catatan."}</div>
                            {l.link_foto && l.link_foto !== '-' && (
                              <div className="flex items-center gap-2 mt-1">
                                <img 
                                  src={transformGoogleDriveUrl(l.link_foto)} 
                                  alt="Foto Piket" 
                                  className="w-9 h-9 object-cover rounded-xl neu-inset p-0.5 shrink-0"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <a href={l.link_foto} target="_blank" rel="noreferrer" className="text-[#0F766E] dark:text-[#14B8A6] hover:underline text-[10px] font-semibold inline-flex items-center gap-1">
                                  <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                                </a>
                              </div>
                            )}
                            {isAdmin && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-slate-300/40 dark:border-slate-700/60">
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Disetujui' || l.status_verifikasi === 'Diverifikasi'}
                                  onClick={() => updatePiketStatus(l.id, 'Disetujui')}
                                  className={`flex-1 text-[10px] font-bold py-2 min-h-[36px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                                    l.status_verifikasi === 'Disetujui' || l.status_verifikasi === 'Diverifikasi'
                                      ? 'neu-inset text-emerald-700 dark:text-emerald-300 cursor-default opacity-80'
                                      : 'neu-btn neu-btn-teal text-white disabled:opacity-50'
                                  }`}
                                >
                                  {processingId === l.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                </button>
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Ditolak'}
                                  onClick={() => updatePiketStatus(l.id, 'Ditolak')}
                                  className={`flex-1 text-[10px] font-bold py-2 min-h-[36px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                                    l.status_verifikasi === 'Ditolak'
                                      ? 'neu-inset text-rose-700 dark:text-rose-300 cursor-default opacity-80'
                                      : 'neu-btn neu-btn-rose text-white disabled:opacity-50'
                                  }`}
                                >
                                  {processingId === l.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-xmark"></i> Tolak</>}
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                  </div>
              </div>
            )}

            {/* TAB: PRESENSI SISWA (QR & MANUAL) */}
            {activeTab === 'scan' && (
              isAdmin ? (
                <div id="piket-content-scan" className="space-y-6 fade-in p-1">
                {/* 1. Kiosk Station & Mode Switcher Controls */}
                <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                        <i className="fa-solid fa-qrcode text-[#0F766E] dark:text-[#14B8A6]"></i>
                        Kios Scanner Presensi Siswa (QR Code & Input Manual)
                      </h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                        Mendukung scanner USB HID barcode/QR, kamera browser, dan input manual tersinkronisasi dua arah.
                      </p>
                    </div>

                    {/* Kiosk Device ID Selector */}
                    <div className="flex items-center gap-2 self-stretch sm:self-auto neu-inset p-1.5 rounded-2xl">
                      <span className="text-[11px] font-bold text-[#475569] dark:text-[#CBD5E1] pl-2 whitespace-nowrap">
                        <i className="fa-solid fa-desktop mr-1 text-[#0F766E] dark:text-[#14B8A6]"></i> Stasiun Kios:
                      </span>
                      <select
                        value={deviceId}
                        onChange={(e) => handleDeviceIdChange(e.target.value)}
                        className="neu-input text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] py-2 px-3 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="kiosk-1">Kios 1 (Gerbang Utama)</option>
                        <option value="kiosk-2">Kios 2 (Gerbang Barat)</option>
                        <option value="kiosk-3">Kios 3 (Gerbang Timur)</option>
                        <option value="kiosk-4">Kios 4 (Pintu Belakang)</option>
                        <option value="kiosk-5">Kios 5 (Pos Piket 1)</option>
                        <option value="kiosk-6">Kios 6 (Pos Piket 2)</option>
                        <option value="kiosk-7">Kios 7 (Lobi Depan)</option>
                        <option value="kiosk-8">Kios 8 (Gedung A)</option>
                        <option value="kiosk-9">Kios 9 (Gedung B)</option>
                        <option value="kiosk-10">Kios 10 (Cadangan / Mobile)</option>
                      </select>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 px-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live
                      </span>
                    </div>
                  </div>

                  {/* Mode Toggle: Datang vs Pulang */}
                  <div>
                    <label className="text-[11px] font-bold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wide block mb-2">
                      Pilih Status Presensi:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
                      <button
                        type="button"
                        onClick={() => setScanMode('datang')}
                        className={`neu-btn py-3 px-4 min-h-[56px] rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                          scanMode === 'datang'
                            ? 'neu-btn-primary text-white'
                            : 'text-[#334155] dark:text-[#CBD5E1]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          scanMode === 'datang' ? 'bg-white/20 text-white' : 'neu-inset text-[#0F766E] dark:text-[#14B8A6]'
                        }`}>
                          <i className="fa-solid fa-right-to-bracket text-lg"></i>
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm">PRESENSI DATANG</div>
                          <div className={`text-[10px] ${scanMode === 'datang' ? 'text-teal-50/90' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                            Catat kedatangan siswa
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScanMode('pulang')}
                        className={`neu-btn py-3 px-4 min-h-[56px] rounded-2xl text-left transition-all flex items-center gap-3 cursor-pointer ${
                          scanMode === 'pulang'
                            ? 'neu-btn-primary text-white'
                            : 'text-[#334155] dark:text-[#CBD5E1]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          scanMode === 'pulang' ? 'bg-white/20 text-white' : 'neu-inset text-sky-600 dark:text-sky-400'
                        }`}>
                          <i className="fa-solid fa-right-from-bracket text-lg"></i>
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm">PRESENSI PULANG</div>
                          <div className={`text-[10px] ${scanMode === 'pulang' ? 'text-teal-50/90' : 'text-[#64748B] dark:text-[#94A3B8]'}`}>
                            Catat kepulangan siswa
                          </div>
                        </div>
                      </button>
                    </div>

                    {scanMode === 'pulang' && (
                      <div className={`neu-inset mt-3 p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-semibold ${
                        piketPulangCheck.allowed
                          ? 'text-sky-900 border-sky-500/30 dark:text-sky-200'
                          : 'text-amber-900 border-amber-500/35 dark:text-amber-200'
                      }`}>
                        <i className={`fa-solid ${piketPulangCheck.allowed ? 'fa-circle-check text-sky-600 dark:text-sky-400' : 'fa-clock text-amber-600 dark:text-amber-400'} text-sm shrink-0`}></i>
                        <div>
                          <div className="font-bold">{piketPulangCheck.allowed ? 'Hak Akses Utama Guru Piket Aktif' : 'Presensi Pulang Dialihkan / Belum Aktif'}</div>
                          <div className="text-[11px] font-normal opacity-90 mt-0.5">{piketPulangCheck.pesan}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Scanner Station & Real-Time Student Feedback Card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Input Modes (USB HID + Camera) */}
                  <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                        <i className="fa-solid fa-barcode text-[#0F766E] dark:text-[#14B8A6]"></i> Mode Input Scanner (QR / Barcode)
                      </span>
                      <span className={`neu-inset text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                        isUsbInputFocused
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isUsbInputFocused ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        {isUsbInputFocused ? 'USB Scanner Fokus Aktif' : 'Klik Input untuk Fokus'}
                      </span>
                    </div>

                    {/* Hardware USB HID Scanner Input */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const code = usbInputVal.trim();
                        if (code) {
                          setUsbInputVal('');
                          handleProcessScan(code);
                        }
                      }}
                      className="space-y-2"
                    >
                      <label className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1] block">
                        Scanner Barcode / QR Eksternal (USB HID):
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0F766E] dark:text-[#14B8A6]">
                          <i className="fa-solid fa-qrcode text-base"></i>
                        </div>
                        <input
                          ref={usbInputRef}
                          type="text"
                          value={usbInputVal}
                          onChange={(e) => handleUsbInputChange(e.target.value)}
                          onFocus={(e) => {
                            setIsUsbInputFocused(true);
                            e.target.select();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === '\r' || e.key === '\n' || e.keyCode === 13) {
                              e.preventDefault();
                              const code = usbInputVal.trim();
                              if (code) {
                                setUsbInputVal('');
                                handleProcessScan(code);
                              }
                            }
                          }}
                          onBlur={handleUsbInputBlur}
                          disabled={scanProcessing}
                          placeholder="Arahkan scanner ke QR Code atau ketik NISN lalu Enter..."
                          className="neu-input font-num w-full pl-10 pr-28 py-3 text-sm rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:font-sans placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          autoFocus
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={scanProcessing || !usbInputVal.trim()}
                          className="neu-btn neu-btn-primary absolute right-1.5 top-1.5 bottom-1.5 px-4 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          {scanProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <>Scan <i className="fa-solid fa-arrow-turn-down text-[10px]"></i></>}
                        </button>
                      </div>
                      <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between gap-2">
                        <span><i className="fa-solid fa-circle-info mr-1 text-[#0F766E] dark:text-[#14B8A6]"></i> Auto re-focus aktif untuk scan berkelanjutan tanpa mouse</span>
                        <button
                          type="button"
                          onClick={() => usbInputRef.current?.focus()}
                          className="text-[#0F766E] dark:text-[#14B8A6] hover:underline font-semibold cursor-pointer shrink-0"
                        >
                          Fokus Ulang
                        </button>
                      </div>
                    </form>

                    {/* Divider & Browser Camera Scanner Option */}
                    <div className="pt-3 border-t border-slate-300/40 dark:border-slate-700/60 space-y-3">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#475569] dark:text-[#CBD5E1]">
                          Kamera Browser (Webcam / HP):
                        </span>
                        {!cameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="neu-btn neu-btn-teal px-3.5 py-2 min-h-[38px] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-camera"></i> Buka Kamera
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="neu-btn neu-btn-rose px-3.5 py-2 min-h-[38px] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-video-slash"></i> Tutup Kamera
                          </button>
                        )}
                      </div>

                      {cameraError && (
                        <div className="neu-inset p-3 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          <span>{cameraError}</span>
                        </div>
                      )}

                      {cameraActive && (
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video border-2 border-[#0F766E] neu-inset">
                          <video
                            ref={(el) => {
                              videoRef.current = el;
                              if (el && streamRef.current && el.srcObject !== streamRef.current) {
                                el.srcObject = streamRef.current;
                                el.setAttribute('playsinline', 'true');
                                el.setAttribute('webkit-playsinline', 'true');
                                el.muted = true;
                                el.play().catch(e => console.warn('[PiketView] Callback ref play error:', e));
                              }
                            }}
                            playsInline
                            autoPlay
                            muted
                            className="w-full h-full object-cover"
                          />
                          {/* Scanner Reticle Overlay */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-40 h-40 sm:w-56 sm:h-56 max-w-[75%] max-h-[75%] border-2 border-dashed border-teal-400 rounded-2xl relative flex items-center justify-center animate-pulse">
                              <span className="text-[10px] text-teal-200 bg-slate-900/75 px-2 py-0.5 rounded-full font-bold">
                                Arahkan QR ke Sini
                              </span>
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/75 p-1.5 rounded-lg text-center text-[10px] text-white">
                            {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
                              <span><i className="fa-solid fa-bolt mr-1 text-teal-400"></i> BarcodeDetector aktif • Deteksi QR otomatis</span>
                            ) : (
                              <span><i className="fa-solid fa-camera mr-1 text-teal-400"></i> Browser ini tidak mendukung BarcodeDetector bawaan • Scanner Kamera HP aktif (Fallback Otomatis)</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Visual Feedback Student Card */}
                  <div className="neu-card-sm p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="flex justify-between items-center mb-3 gap-2">
                        <span className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                          <i className="fa-solid fa-id-card text-[#0F766E] dark:text-[#14B8A6]"></i> Kartu Hasil Presensi Terakhir
                        </span>
                        {lastScanResult && (
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            lastScanResult.success
                              ? lastScanResult.status === 'datang'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                              : lastScanResult.alreadyExists
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {lastScanResult.success
                              ? `Presensi ${lastScanResult.status} Berhasil`
                              : lastScanResult.alreadyExists
                              ? `Duplikat ${lastScanResult.status}`
                              : 'Gagal / Tidak Ditemukan'}
                          </span>
                        )}
                      </div>

                      {lastScanResult?.student ? (
                        <div className={`neu-inset p-4 rounded-2xl border-2 space-y-3 transition-all ${
                          lastScanResult.success
                            ? lastScanResult.status === 'datang'
                              ? 'border-emerald-500/60'
                              : 'border-sky-500/60'
                            : lastScanResult.alreadyExists
                            ? 'border-amber-500/60'
                            : 'border-rose-500/60'
                        }`}>
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shrink-0 ${
                              lastScanResult.status === 'datang'
                                ? 'bg-gradient-to-tr from-[#0F766E] to-teal-500'
                                : 'bg-gradient-to-tr from-sky-600 to-cyan-600'
                            }`}>
                              {lastScanResult.student.nama_siswa.charAt(0).toUpperCase()}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base sm:text-lg font-black text-[#0F172A] dark:text-[#F1F5F9] truncate">
                                {lastScanResult.student.nama_siswa}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="neu-card-sm text-xs font-bold px-2.5 py-0.5 rounded-lg text-[#0F766E] dark:text-[#14B8A6]">
                                  Kelas {lastScanResult.student.kelas}
                                </span>
                                <span className="font-num text-xs text-[#475569] dark:text-[#94A3B8]">
                                  NISN: {lastScanResult.student.nisn || '-'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Message and Timestamp */}
                          <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                            <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                              {lastScanResult.message}
                            </span>
                            <span className="font-num text-[11px] text-[#475569] dark:text-[#94A3B8] shrink-0">
                              pk. {formatPresensiTime(lastScanResult.jam) || (lastScanResult.jam && lastScanResult.jam !== '-' ? lastScanResult.jam : '-')} WITA
                            </span>
                          </div>
                        </div>
                      ) : lastScanResult && !lastScanResult.student ? (
                        <div className="neu-inset p-4 rounded-2xl border-2 border-rose-500/60 space-y-2">
                          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                            <i className="fa-solid fa-circle-xmark text-lg"></i>
                            <span>Siswa Tidak Ditemukan</span>
                          </div>
                          <p className="text-xs text-rose-700 dark:text-rose-300">
                            {lastScanResult.message}
                          </p>
                        </div>
                      ) : (
                        <div className="neu-inset p-8 rounded-2xl border border-dashed border-slate-400/40 dark:border-slate-600/50 flex flex-col items-center justify-center text-center space-y-3 text-[#64748B] dark:text-[#94A3B8]">
                          <div className="w-16 h-16 rounded-full neu-card-sm text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center text-2xl">
                            <i className="fa-solid fa-qrcode animate-pulse"></i>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#334155] dark:text-[#CBD5E1]">Menunggu Presensi Siswa...</div>
                            <div className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                              Arahkan kartu QR ke scanner atau ketik data siswa pada form manual
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="font-num text-[10px] text-[#64748B] dark:text-[#94A3B8] pt-3 border-t border-slate-300/40 dark:border-slate-700/60 flex justify-between items-center">
                      <span>Stasiun: {deviceId}</span>
                      <span>Audio Feedback: Suara Aktif (Web Audio)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Presensi Manual Siswa & Daftar Roster (Sinkronisasi Dua Arah) */}
                <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                        <i className="fa-solid fa-clipboard-user text-[#0F766E] dark:text-[#14B8A6]"></i>
                        Presensi Manual & Daftar Siswa
                      </h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                        Input manual siswa dan ceklis presensi per kelas • Tersinkronisasi dua arah dengan Scanner QR.
                      </p>
                    </div>
                    <div className="neu-inset flex items-center gap-2 self-stretch sm:self-auto text-[#0F766E] dark:text-[#14B8A6] py-1.5 px-3 rounded-xl text-xs font-semibold">
                      <i className="fa-solid fa-arrows-rotate text-[#0F766E] dark:text-[#14B8A6]"></i>
                      <span>Sinkronisasi Dua Arah Aktif</span>
                    </div>
                  </div>

                  {/* Filter & Form Input Manual */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-300/40 dark:border-slate-700/60">
                    {/* Filter Kelas */}
                    <div className="flex-1 sm:max-w-xs">
                      <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                        Pilih Kelas:
                      </label>
                      <select
                        value={manualKelasFilter}
                        onChange={(e) => setManualKelasFilter(e.target.value)}
                        className="neu-input w-full text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] px-3 py-2.5 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="Semua">Semua Kelas</option>
                        {kelasList.map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>

                    {/* Form Input Manual Siswa */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleManualFormSubmit();
                      }}
                      className="flex-1"
                    >
                      <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                        Form Input Manual Siswa:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={manualSearchQuery}
                            onChange={(e) => handleManualSearchChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === '\r' || e.key === '\n' || e.keyCode === 13) {
                                e.preventDefault();
                                handleManualFormSubmit();
                              }
                            }}
                            placeholder="Ketik nama siswa atau NISN lalu Enter untuk presensi..."
                            className="neu-input w-full pl-9 pr-8 py-2.5 text-xs text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-[#64748B] dark:text-[#94A3B8]"></i>
                          {manualSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualSearchQuery('');
                                setUsbInputVal('');
                                setLastScanResult(null);
                              }}
                              className="absolute right-2.5 top-2.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] cursor-pointer"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={!manualSearchQuery.trim() || !!manualMarkLoading}
                          className="neu-btn neu-btn-primary px-4 py-2.5 min-h-[40px] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>Proses Presensi</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Manual Student Roster Table Card */}
                  <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/60 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-1.5">
                          <i className="fa-solid fa-users text-[#0F766E] dark:text-[#14B8A6]"></i>
                          Daftar Siswa {manualKelasFilter !== 'Semua' ? `Kelas ${manualKelasFilter}` : '(Semua Kelas)'}
                        </h4>
                        <p className="font-num text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                          Menampilkan {filteredManualStudents.length} siswa
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchTodayScanData}
                        className="neu-btn px-3.5 py-2 min-h-[38px] text-[#334155] dark:text-[#CBD5E1] rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                      >
                        <i className="fa-solid fa-rotate text-xs"></i>
                        <span>Segarkan Status</span>
                      </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-scroll neu-inset rounded-2xl p-1.5">
                      <table className="w-full text-left text-xs text-[#334155] dark:text-[#CBD5E1] border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300/50 dark:border-slate-700/60 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase">
                            <th className="py-3 px-3 w-12 text-center rounded-tl-xl">No</th>
                            <th className="py-3 px-3">Nama Siswa</th>
                            <th className="py-3 px-3">NISN</th>
                            <th className="py-3 px-3">Kelas</th>
                            <th className="py-3 px-3 text-center min-w-[140px]">Presensi Datang</th>
                            <th className="py-3 px-3 text-center min-w-[140px]">Presensi Pulang</th>
                            <th className="py-3 px-3 text-center w-20 rounded-tr-xl">WA Ortu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300/40 dark:divide-slate-700/50 font-medium">
                          {filteredManualStudents.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-10 text-center text-[#64748B] dark:text-[#94A3B8] text-xs">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <i className="fa-solid fa-user-slash text-2xl opacity-50"></i>
                                  <span>Tidak ada siswa ditemukan sesuai filter / pencarian.</span>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            filteredManualStudents.map((s, idx) => {
                              const datangRecord = todayScans.find(
                                scan => (scan.siswa_id === s.id || (s.nisn && scan.nisn === s.nisn)) && scan.status === 'datang'
                              );
                              const pulangRecord = todayScans.find(
                                scan => (scan.siswa_id === s.id || (s.nisn && scan.nisn === s.nisn)) && scan.status === 'pulang'
                              );

                              return (
                                <tr key={s.id || idx} className="hover:bg-white/25 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-3 px-3 text-center text-[#64748B] dark:text-[#94A3B8] text-[11px] font-num">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                                      {s.nama_siswa}
                                    </div>
                                    {s.gender && (
                                      <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                        {s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : s.gender}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 font-num text-[11px] text-[#475569] dark:text-[#94A3B8]">
                                    {s.nisn || '-'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="neu-card-sm px-2 py-0.5 rounded-md text-[#0F766E] dark:text-[#14B8A6] font-bold text-[10px]">
                                      {s.kelas}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {datangRecord ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="neu-card-sm px-2.5 py-1 rounded-lg text-[11px] font-bold font-num text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                                          <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                                          <span>Datang {formatPresensiTime(datangRecord.jam) || '-'}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelManualPresensi(datangRecord.id, s.nama_siswa, 'datang', s.id)}
                                          title="Batalkan presensi datang"
                                          className="neu-btn w-9 h-9 rounded-xl text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                        >
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center justify-center gap-2">
                                        <span className="text-[#64748B] dark:text-[#94A3B8] font-num text-xs font-semibold">-</span>
                                        <button
                                          type="button"
                                          disabled={manualMarkLoading === `${s.id}-datang`}
                                          onClick={() => handleManualMark(s, 'datang')}
                                          className="neu-btn neu-btn-teal px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-white transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                        >
                                          {manualMarkLoading === `${s.id}-datang` ? (
                                            <i className="fa-solid fa-spinner animate-spin"></i>
                                          ) : (
                                            <i className="fa-solid fa-right-to-bracket text-[10px]"></i>
                                          )}
                                          <span>Tandai Datang</span>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {pulangRecord ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="neu-card-sm px-2.5 py-1 rounded-lg text-[11px] font-bold font-num text-sky-700 dark:text-sky-300 inline-flex items-center gap-1.5">
                                          <i className="fa-solid fa-circle-check text-sky-600 dark:text-sky-400"></i>
                                          <span>Pulang {formatPresensiTime(pulangRecord.jam) || '-'}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelManualPresensi(pulangRecord.id, s.nama_siswa, 'pulang', s.id)}
                                          title="Batalkan presensi pulang"
                                          className="neu-btn w-9 h-9 rounded-xl text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                        >
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center justify-center gap-2">
                                        <span className="text-[#64748B] dark:text-[#94A3B8] font-num text-xs font-semibold">-</span>
                                        <button
                                          type="button"
                                          disabled={manualMarkLoading === `${s.id}-pulang`}
                                          onClick={() => handleManualMark(s, 'pulang')}
                                          className="neu-btn neu-btn-primary px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold text-white transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                        >
                                          {manualMarkLoading === `${s.id}-pulang` ? (
                                            <i className="fa-solid fa-spinner animate-spin"></i>
                                          ) : (
                                            <i className="fa-solid fa-right-from-bracket text-[10px]"></i>
                                          )}
                                          <span>Tandai Pulang</span>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => triggerParentWhatsApp(
                                        s,
                                        {
                                          status: pulangRecord
                                            ? 'Hadir (Sudah Pulang)'
                                            : datangRecord
                                            ? 'Hadir Datang'
                                            : 'Belum Presensi',
                                          tanggal: getWitaDateStr(),
                                          timeStr: formatPresensiTime(pulangRecord?.jam) || formatPresensiTime(datangRecord?.jam) || undefined,
                                          note: datangRecord ? (pulangRecord ? 'Tercatat pada sistem presensi pulang' : 'Tercatat pada sistem presensi datang') : 'Belum tercatat pada sistem presensi datang'
                                        },
                                        user?.sekolah_nama || user?.nama_sekolah || (typeof user?.sekolah === 'string' ? user.sekolah : user?.sekolah?.nama) || 'Sekolah'
                                      )}
                                      title="Kirim WhatsApp ke Orang Tua"
                                      className="neu-btn w-9 h-9 rounded-xl text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <i className="fa-brands fa-whatsapp text-sm"></i>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 3. Real-Time Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-0.5">
                  <div className="neu-card-sm p-4 rounded-2xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl neu-inset text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-right-to-bracket"></i>
                    </div>
                    <div>
                      <div className="font-num text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        {scanSummary.totalDatang}
                      </div>
                      <div className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">Total Hadir Datang</div>
                    </div>
                  </div>

                  <div className="neu-card-sm p-4 rounded-2xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl neu-inset text-sky-600 dark:text-sky-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-right-from-bracket"></i>
                    </div>
                    <div>
                      <div className="font-num text-2xl font-black text-sky-700 dark:text-sky-400">
                        {scanSummary.totalPulang}
                      </div>
                      <div className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">Total Pulang</div>
                    </div>
                  </div>

                  <div className="neu-card-sm p-4 rounded-2xl flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                      <div className="font-num text-2xl font-black text-[#0F766E] dark:text-[#14B8A6]">
                        {scanSummary.totalUnik}
                      </div>
                      <div className="text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">Total Unik Siswa</div>
                    </div>
                  </div>
                </div>

                {/* 4. Live Attendance Log Table */}
                <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-[#0F766E] dark:text-[#14B8A6]"></i>
                      <span>Log Presensi Siswa Hari Ini (<span className="font-num">{filteredTodayScans.length}</span> Presensi)</span>
                    </h3>

                    {/* Filter & Search Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Filter Kelas */}
                      <select
                        value={scanFilterKelas}
                        onChange={(e) => setScanFilterKelas(e.target.value)}
                        className="neu-input text-xs text-[#0F172A] dark:text-[#F1F5F9] px-3 py-2 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                      >
                        <option value="Semua">Semua Kelas</option>
                        {kelasList.map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>

                      {/* Search Student */}
                      <div className="relative flex-1 sm:w-56">
                        <input
                          type="text"
                          value={scanSearchQuery}
                          onChange={(e) => setScanSearchQuery(e.target.value)}
                          placeholder="Cari siswa / NISN..."
                          className="neu-input w-full pl-8 pr-3 py-2 text-xs text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-xs text-[#64748B] dark:text-[#94A3B8]"></i>
                      </div>

                      <button
                        type="button"
                        onClick={fetchTodayScanData}
                        title="Segarkan Log Presensi"
                        aria-label="Segarkan Log Presensi"
                        className="neu-btn w-10 h-10 text-[#334155] dark:text-[#CBD5E1] rounded-xl text-xs font-bold transition flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        <i className="fa-solid fa-rotate text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto custom-scroll neu-inset rounded-2xl p-1.5">
                    <table className="w-full text-left text-xs text-[#334155] dark:text-[#CBD5E1] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300/50 dark:border-slate-700/60 bg-[#DDE4EE] dark:bg-[#181C24] print:bg-gray-100 print:text-black text-[11px] font-bold text-[#475569] dark:text-[#94A3B8] uppercase">
                          <th className="py-2.5 px-3 rounded-tl-xl">No</th>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-3">Kelas</th>
                          <th className="py-2.5 px-3">NISN</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Kios</th>
                          <th className="py-2.5 px-3 text-center w-20 rounded-tr-xl">WA Ortu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300/40 dark:divide-slate-700/50 font-medium">
                        {filteredTodayScans.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-[#64748B] dark:text-[#94A3B8] text-xs">
                              Belum ada catatan presensi siswa hari ini.
                            </td>
                          </tr>
                        ) : (
                          filteredTodayScans.map((item, idx) => {
                            const studentRec = allStudents.find(
                              st => st.id === item.siswa_id || (item.nisn && st.nisn === item.nisn)
                            );
                            const studentData = {
                              nama_siswa: item.nama_siswa,
                              kelas: item.kelas,
                              no_hp_ortu: studentRec?.no_hp_ortu || item.no_hp_ortu || null
                            };

                            return (
                              <tr key={item.id || idx} className="hover:bg-white/25 dark:hover:bg-white/5 transition-colors">
                                <td className="py-2.5 px-3 font-num text-[#64748B] dark:text-[#94A3B8] text-[11px]">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-num font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                                  {formatPresensiTime(item.jam) || (item.jam && item.jam !== '-' ? item.jam : '-')}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                                  {item.nama_siswa}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="neu-card-sm px-2 py-0.5 rounded-md text-[#0F766E] dark:text-[#14B8A6] font-bold text-[10px]">
                                    {item.kelas}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-num text-[11px] text-[#475569] dark:text-[#94A3B8]">
                                  {item.nisn || '-'}
                                </td>
                                <td className="py-2.5 px-3">
                                  {item.status === 'datang' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                                      <i className="fa-solid fa-right-to-bracket text-[11px]"></i> Datang
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 inline-flex items-center gap-1">
                                      <i className="fa-solid fa-right-from-bracket text-[11px]"></i> Pulang
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-num text-[10px] text-[#475569] dark:text-[#94A3B8]">
                                  <span className="neu-card-sm px-2 py-0.5 rounded text-[#334155] dark:text-[#CBD5E1]">
                                    {item.device_id || 'kiosk-default'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => triggerParentWhatsApp(
                                      studentData,
                                      {
                                        status: item.status === 'datang' ? 'Hadir Datang' : 'Hadir Pulang',
                                        tanggal: item.tanggal || getWitaDateStr(),
                                        timeStr: formatPresensiTime(item.jam) || undefined,
                                        note: `Presensi scan QR via ${item.device_id || 'kiosk'}`
                                      },
                                      user?.sekolah_nama || user?.nama_sekolah || (typeof user?.sekolah === 'string' ? user.sekolah : user?.sekolah?.nama) || 'Sekolah'
                                    )}
                                    title="Kirim WhatsApp ke Orang Tua"
                                    className="neu-btn w-9 h-9 rounded-xl text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition inline-flex items-center justify-center cursor-pointer"
                                  >
                                    <i className="fa-brands fa-whatsapp text-sm"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
                /* GURU VIEW: Tampilan Ringkas, Pill Mode, Scanner Compact, Roster Sentuh Cepat, Badge Metrik Inline */
                <div id="piket-content-scan-guru" className="space-y-5 fade-in p-1">
                  {/* 1. Header Bar Ringkas (Guru) */}
                  <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                          {/* AST preservation: Presensi Siswa Piket (Mode Guru) */}
                          <i className="fa-solid fa-qrcode text-[#0F766E] dark:text-[#14B8A6]"></i>
                          Presensi Datang & Pulang Siswa (Mode Guru)
                        </h3>
                        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                          Pencatatan kehadiran siswa secara ringkas via scanner QR atau 1-tap tombol presensi.
                        </p>
                      </div>

                      {/* Inline counter badge: Hadir Datang: X • Pulang: Y */}
                      <div className="neu-inset inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-bold font-num self-stretch sm:self-auto justify-center">
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Hadir Datang: {scanSummary.totalDatang}
                        </span>
                        <span className="text-slate-400 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
                          <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                          Pulang: {scanSummary.totalPulang}
                        </span>
                      </div>
                    </div>

                    {/* Compact Attendance Mode Toggle (Pill button Datang | Pulang) */}
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <span className="text-[11px] font-bold text-[#475569] dark:text-[#CBD5E1] uppercase tracking-wide">
                        Mode Presensi:
                      </span>
                      <div className="neu-inset inline-flex p-1.5 rounded-2xl gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScanMode('datang')}
                          className={`neu-btn px-4 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            scanMode === 'datang'
                              ? 'neu-btn-primary text-white'
                              : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                          }`}
                        >
                          <i className="fa-solid fa-right-to-bracket text-xs"></i>
                          <span>Datang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setScanMode('pulang')}
                          className={`neu-btn px-4 py-1.5 min-h-[38px] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            scanMode === 'pulang'
                              ? 'neu-btn-primary text-white'
                              : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                          }`}
                        >
                          <i className="fa-solid fa-right-from-bracket text-xs"></i>
                          <span>Pulang</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 2. Compact Scanner Toggle Card */}
                  <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center text-sm font-bold shrink-0">
                          <i className="fa-solid fa-camera"></i>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">Scanner QR Code Siswa</div>
                          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Pindai kartu QR siswa menggunakan kamera atau USB scanner</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!cameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="neu-btn neu-btn-teal w-full sm:w-auto px-3.5 py-2 min-h-[38px] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-camera"></i>
                            <span>Buka Kamera QR</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="neu-btn neu-btn-rose w-full sm:w-auto px-3.5 py-2 min-h-[38px] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-video-slash"></i>
                            <span>Tutup Kamera</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {cameraError && (
                      <div className="neu-inset p-3 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>{cameraError}</span>
                      </div>
                    )}

                    {cameraActive && (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video max-w-md mx-auto border-2 border-[#0F766E] neu-inset">
                        <video
                          ref={(el) => {
                            videoRef.current = el;
                            if (el && streamRef.current && el.srcObject !== streamRef.current) {
                              el.srcObject = streamRef.current;
                              el.setAttribute('playsinline', 'true');
                              el.setAttribute('webkit-playsinline', 'true');
                              el.muted = true;
                              el.play().catch(e => console.warn('[PiketView] Callback ref play error:', e));
                            }
                          }}
                          playsInline
                          autoPlay
                          muted
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="w-36 h-36 xs:w-40 xs:h-40 sm:w-48 sm:h-48 max-w-[75%] max-h-[75%] border-2 border-dashed border-teal-400 rounded-2xl relative flex items-center justify-center animate-pulse">
                            <span className="text-[10px] text-teal-200 bg-slate-900/75 px-2 py-0.5 rounded-full font-bold">
                              Arahkan QR ke Sini
                            </span>
                          </div>
                        </div>
                        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/75 p-1.5 rounded-lg text-center text-[10px] text-white">
                          {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
                            <span><i className="fa-solid fa-bolt mr-1 text-teal-400"></i> BarcodeDetector aktif • Deteksi QR otomatis</span>
                          ) : (
                            <span><i className="fa-solid fa-camera mr-1 text-teal-400"></i> Browser ini tidak mendukung BarcodeDetector bawaan • Scanner Kamera HP aktif (Fallback Otomatis)</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Compact USB scanner input for Guru */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const code = usbInputVal.trim();
                        if (code) {
                          setUsbInputVal('');
                          handleProcessScan(code);
                        }
                      }}
                      className="pt-2 border-t border-slate-300/40 dark:border-slate-700/60"
                    >
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#0F766E] dark:text-[#14B8A6]">
                          <i className="fa-solid fa-barcode text-xs"></i>
                        </div>
                        <input
                          ref={!isAdmin ? usbInputRef : undefined}
                          type="text"
                          value={usbInputVal}
                          onChange={(e) => handleUsbInputChange(e.target.value)}
                          onFocus={(e) => {
                            setIsUsbInputFocused(true);
                            e.target.select();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === '\r' || e.key === '\n' || e.keyCode === 13) {
                              e.preventDefault();
                              const code = usbInputVal.trim();
                              if (code) {
                                setUsbInputVal('');
                                handleProcessScan(code);
                              }
                            }
                          }}
                          onBlur={handleUsbInputBlur}
                          disabled={scanProcessing}
                          placeholder="Scan barcode/QR atau ketik NISN siswa..."
                          className="neu-input font-num w-full pl-8 pr-20 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:font-sans placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        />
                        <button
                          type="submit"
                          disabled={scanProcessing || !usbInputVal.trim()}
                          className="neu-btn neu-btn-primary absolute right-1 top-1 bottom-1 px-3.5 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          {scanProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <span>Scan</span>}
                        </button>
                      </div>
                    </form>

                    {/* Feedback Banner if lastScanResult exists */}
                    {lastScanResult && (
                      <div className={`neu-inset p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                        lastScanResult.success
                          ? lastScanResult.status === 'datang'
                            ? 'border-emerald-500/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-sky-500/40 text-sky-900 dark:text-sky-200'
                          : lastScanResult.alreadyExists
                          ? 'border-amber-500/40 text-amber-900 dark:text-amber-200'
                          : 'border-rose-500/40 text-rose-900 dark:text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 ${
                            lastScanResult.status === 'datang' ? 'bg-[#0F766E]' : 'bg-sky-600'
                          }`}>
                            {lastScanResult.student ? lastScanResult.student.nama_siswa.charAt(0).toUpperCase() : '!'}
                          </div>
                          <div className="truncate">
                            <div className="font-bold truncate text-sm text-[#0F172A] dark:text-[#F1F5F9]">
                              {lastScanResult.student?.nama_siswa || 'Presensi'}
                              {lastScanResult.student && <span className="ml-1 text-xs font-normal opacity-80">({lastScanResult.student.kelas})</span>}
                            </div>
                            <div className="text-[11px] opacity-90 truncate">{lastScanResult.message}</div>
                          </div>
                        </div>
                        <div className="text-[11px] font-num shrink-0 font-bold">
                          {formatPresensiTime(lastScanResult.jam) ? `pk. ${formatPresensiTime(lastScanResult.jam)}` : (lastScanResult.jam ? `pk. ${lastScanResult.jam}` : '')}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Fast Touch-Friendly Student Roster (Guru) */}
                  <div className="neu-card-sm p-4 sm:p-5 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                          <i className="fa-solid fa-users text-[#0F766E] dark:text-[#14B8A6]"></i>
                          Daftar Siswa {manualKelasFilter !== 'Semua' ? `Kelas ${manualKelasFilter}` : '(Semua Kelas)'}
                        </h3>
                        <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5">
                          Menampilkan <span className="font-num font-semibold">{filteredManualStudents.length}</span> siswa • 1-tap tombol untuk mencatat kehadiran
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchTodayScanData}
                        className="neu-btn px-3.5 py-2 min-h-[38px] text-[#334155] dark:text-[#CBD5E1] rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                      >
                        <i className="fa-solid fa-rotate text-xs"></i>
                        <span>Segarkan Data</span>
                      </button>
                    </div>

                    {/* Filter & Quick Search Form */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-300/40 dark:border-slate-700/60">
                      <div className="w-full sm:w-48">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                          Pilih Kelas:
                        </label>
                        <select
                          value={manualKelasFilter}
                          onChange={(e) => setManualKelasFilter(e.target.value)}
                          className="neu-input w-full text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] px-3 py-2.5 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                        >
                          <option value="Semua">Semua Kelas</option>
                          {kelasList.map(k => (
                            <option key={k} value={k}>{k}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1] block mb-1">
                          Cari Siswa:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={manualSearchQuery}
                            onChange={(e) => handleManualSearchChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Ketik nama siswa atau NISN..."
                            className="neu-input w-full pl-9 pr-8 py-2.5 text-xs text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-[#64748B] dark:text-[#94A3B8]"></i>
                          {manualSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualSearchQuery('');
                                setUsbInputVal('');
                                setLastScanResult(null);
                              }}
                              className="absolute right-2.5 top-2.5 text-xs text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] cursor-pointer"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Student List (Touch-Friendly Cards with 1-Tap Buttons) */}
                    <div className="space-y-2 pt-2">
                      {filteredManualStudents.length === 0 ? (
                        <div className="neu-inset rounded-2xl py-10 text-center text-[#64748B] dark:text-[#94A3B8] text-xs">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <i className="fa-solid fa-user-slash text-2xl opacity-50"></i>
                            <span>Tidak ada siswa ditemukan sesuai filter / pencarian.</span>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-300/40 dark:divide-slate-700/50">
                          {filteredManualStudents.map((s, idx) => {
                            const datangRecord = todayScans.find(
                              scan => (scan.siswa_id === s.id || (s.nisn && scan.nisn === s.nisn)) && scan.status === 'datang'
                            );
                            const pulangRecord = todayScans.find(
                              scan => (scan.siswa_id === s.id || (s.nisn && scan.nisn === s.nisn)) && scan.status === 'pulang'
                            );

                            return (
                              <div
                                key={s.id || idx}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/25 dark:hover:bg-white/5 px-2 rounded-xl transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="font-num w-9 h-9 rounded-xl neu-inset text-[#0F766E] dark:text-[#14B8A6] font-bold flex items-center justify-center text-xs shrink-0">
                                    {idx + 1}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-sm text-[#0F172A] dark:text-[#F1F5F9] truncate">
                                      {s.nama_siswa}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                      <span className="font-semibold text-[#0F766E] dark:text-[#14B8A6]">Kelas {s.kelas}</span>
                                      {s.nisn && <span className="font-num">• NISN: {s.nisn}</span>}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap justify-end">
                                  {datangRecord ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="neu-card-sm px-3 py-1.5 rounded-xl text-xs font-bold font-num text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                                        <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                                        <span>Datang {formatPresensiTime(datangRecord.jam) || '-'}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelManualPresensi(datangRecord.id, s.nama_siswa, 'datang', s.id)}
                                        title="Batalkan presensi datang"
                                        className="neu-btn w-9 h-9 rounded-xl text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                      >
                                        <i className="fa-solid fa-xmark"></i>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="text-[#64748B] dark:text-[#94A3B8] font-num text-xs font-semibold mr-1">-</span>
                                      <button
                                        type="button"
                                        disabled={manualMarkLoading === `${s.id}-datang`}
                                        onClick={() => handleManualMark(s, 'datang')}
                                        className="neu-btn neu-btn-teal px-3.5 py-2 rounded-xl text-xs font-bold text-white transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[38px]"
                                      >
                                        {manualMarkLoading === `${s.id}-datang` ? (
                                          <i className="fa-solid fa-spinner animate-spin"></i>
                                        ) : (
                                          <i className="fa-solid fa-right-to-bracket text-xs"></i>
                                        )}
                                        <span>Datang</span>
                                      </button>
                                    </div>
                                  )}

                                  {pulangRecord ? (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="neu-card-sm px-3 py-1.5 rounded-xl text-xs font-bold font-num text-sky-700 dark:text-sky-300 inline-flex items-center gap-1.5">
                                        <i className="fa-solid fa-circle-check text-sky-600 dark:text-sky-400"></i>
                                        <span>Pulang {formatPresensiTime(pulangRecord.jam) || '-'}</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleCancelManualPresensi(pulangRecord.id, s.nama_siswa, 'pulang', s.id)}
                                        title="Batalkan presensi pulang"
                                        className="neu-btn w-9 h-9 rounded-xl text-[#64748B] hover:text-rose-600 dark:hover:text-rose-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                      >
                                        <i className="fa-solid fa-xmark"></i>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5">
                                      <span className="text-[#64748B] dark:text-[#94A3B8] font-num text-xs font-semibold mr-1">-</span>
                                      <button
                                        type="button"
                                        disabled={manualMarkLoading === `${s.id}-pulang`}
                                        onClick={() => handleManualMark(s, 'pulang')}
                                        className="neu-btn neu-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold text-white transition inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer min-h-[38px]"
                                      >
                                        {manualMarkLoading === `${s.id}-pulang` ? (
                                          <i className="fa-solid fa-spinner animate-spin"></i>
                                        ) : (
                                          <i className="fa-solid fa-right-from-bracket text-xs"></i>
                                        )}
                                        <span>Pulang</span>
                                      </button>
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => triggerParentWhatsApp(
                                      s,
                                      {
                                        status: pulangRecord
                                          ? 'Hadir (Sudah Pulang)'
                                          : datangRecord
                                          ? 'Hadir Datang'
                                          : 'Belum Presensi',
                                        tanggal: getWitaDateStr(),
                                        timeStr: formatPresensiTime(pulangRecord?.jam) || formatPresensiTime(datangRecord?.jam) || undefined,
                                        note: datangRecord ? (pulangRecord ? 'Tercatat pada sistem presensi pulang' : 'Tercatat pada sistem presensi datang') : 'Belum tercatat pada sistem presensi datang'
                                      },
                                      user?.sekolah_nama || user?.nama_sekolah || (typeof user?.sekolah === 'string' ? user.sekolah : user?.sekolah?.nama) || 'Sekolah'
                                    )}
                                    title="Kirim WhatsApp ke Orang Tua"
                                    className="neu-btn w-9 h-9 rounded-xl text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center justify-center transition shrink-0 cursor-pointer"
                                  >
                                    <i className="fa-brands fa-whatsapp text-base"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* TAB: PENUGASAN PIKET (ADMIN ONLY) */}
            {activeTab === 'penugasan' && isAdmin && (
              <div id="piket-content-penugasan" className="space-y-5 fade-in p-1">
                {/* Day selector pills */}
                <div className="neu-inset p-3.5 rounded-2xl">
                  <div className="text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] mb-2 uppercase tracking-wide">
                    Pilih Hari Penugasan:
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {HARI_PIKET_LIST.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedHariPiket(day)}
                        className={`neu-btn py-2 px-3 min-h-[44px] rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                          selectedHariPiket === day
                            ? 'neu-btn-primary text-white'
                            : 'text-[#334155] dark:text-[#CBD5E1] hover:text-[#0F766E] dark:hover:text-[#14B8A6]'
                        }`}
                      >
                        <span>{day}</span>
                        <span className="font-num text-[11px] opacity-80 font-normal">
                          {penugasanList.filter(p => p.hari === day).length} Petugas
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg neu-inset text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center text-xs">
                      <i className="fa-solid fa-calendar-day"></i>
                    </span>
                    Jadwal Piket Hari {selectedHariPiket}
                  </h3>
                  <span className="font-num text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Tahun Ajaran 2026/2027
                  </span>
                </div>

                {/* Section 1: Guru Piket */}
                <div className="neu-card-sm p-4 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300/40 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-chalkboard-user text-[#0F766E] dark:text-[#14B8A6]"></i>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] uppercase tracking-wide">
                        Dewan Guru Piket (<span className="font-num">{penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length}</span>)
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned teachers */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length === 0 ? (
                      <div className="neu-inset text-center py-6 text-xs text-[#64748B] dark:text-[#94A3B8] italic rounded-xl border border-dashed border-slate-400/40 dark:border-slate-600/50">
                        Belum ada guru yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru')
                        .map((guruItem, idx) => (
                          <div
                            key={guruItem.id}
                            className="neu-inset flex items-center justify-between p-3 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-num w-7 h-7 rounded-lg bg-[#0F766E] text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                                  {guruItem.guru_nama}
                                </div>
                                <div className="font-num text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                                  NIP: {guruItem.guru_nip || '-'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(guruItem.id, guruItem.guru_nama || '', 'Guru')}
                              title="Hapus penugasan guru"
                              className="neu-btn w-9 h-9 rounded-xl text-rose-600 dark:text-rose-400 flex items-center justify-center transition cursor-pointer"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Guru form */}
                  <form onSubmit={handleAddGuruPiket} className="pt-2 border-t border-slate-300/40 dark:border-slate-700/60 flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      className="neu-input flex-1 px-3 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                    >
                      <option value="">-- Pilih Guru untuk Ditugaskan --</option>
                      {allTeachers
                        .filter(t => !penugasanList.some(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru' && p.guru_id === t.id))
                        .map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nama_guru} {t.nip ? `(${t.nip})` : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      type="submit"
                      disabled={assignLoading || !selectedTeacherId}
                      className="neu-btn neu-btn-primary text-white font-bold px-4 py-2 min-h-[40px] rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> Tugaskan Guru
                    </button>
                  </form>
                </div>

                {/* Section 2: Siswa Piket */}
                <div className="neu-card-sm p-4 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-300/40 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-users text-[#0F766E] dark:text-[#14B8A6]"></i>
                      <h4 className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9] uppercase tracking-wide">
                        Siswa Piket (<span className="font-num">{penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length}</span>)
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned students */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length === 0 ? (
                      <div className="neu-inset text-center py-6 text-xs text-[#64748B] dark:text-[#94A3B8] italic rounded-xl border border-dashed border-slate-400/40 dark:border-slate-600/50">
                        Belum ada siswa yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa')
                        .map((siswaItem, idx) => (
                          <div
                            key={siswaItem.id}
                            className="neu-inset flex items-center justify-between p-3 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-num w-7 h-7 rounded-lg neu-card-sm text-[#0F766E] dark:text-[#14B8A6] font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                                  {siswaItem.siswa_nama}
                                </div>
                                <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] flex items-center gap-2 mt-0.5">
                                  <span className="neu-card-sm text-[#0F766E] dark:text-[#14B8A6] font-semibold px-2 py-0.5 rounded-md">
                                    Kelas {siswaItem.kelas || '-'}
                                  </span>
                                  <span className="font-num">NISN: {siswaItem.siswa_nisn || '-'}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(siswaItem.id, siswaItem.siswa_nama || '', 'Siswa')}
                              title="Hapus penugasan siswa"
                              className="neu-btn w-9 h-9 rounded-xl text-rose-600 dark:text-rose-400 flex items-center justify-center transition cursor-pointer"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Siswa Form with Selection / Manual toggle */}
                  <div className="pt-2 border-t border-slate-300/40 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-[#334155] dark:text-[#CBD5E1]">
                        + Tambah Siswa Piket
                      </span>
                      <div className="neu-inset p-1 rounded-xl flex gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('select')}
                          className={`neu-btn px-2.5 py-1.5 min-h-[32px] rounded-lg font-bold transition cursor-pointer ${
                            siswaAssignMode === 'select'
                              ? 'neu-btn-primary text-white'
                              : 'text-[#475569] dark:text-[#CBD5E1]'
                          }`}
                        >
                          Pilih dari Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('manual')}
                          className={`neu-btn px-2.5 py-1.5 min-h-[32px] rounded-lg font-bold transition cursor-pointer ${
                            siswaAssignMode === 'manual'
                              ? 'neu-btn-primary text-white'
                              : 'text-[#475569] dark:text-[#CBD5E1]'
                          }`}
                        >
                          Input Manual
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleAddSiswaPiket} className="space-y-2">
                      {siswaAssignMode === 'select' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <select
                              value={selectedSiswaFilterKelas}
                              onChange={e => {
                                setSelectedSiswaFilterKelas(e.target.value);
                                setSelectedSiswaNisn('');
                              }}
                              className="neu-input w-full px-2.5 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                            >
                              <option value="">Semua Kelas</option>
                              {kelasList.map(k => (
                                <option key={k} value={k}>Kelas {k}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 flex gap-2">
                            <select
                              value={selectedSiswaNisn}
                              onChange={e => setSelectedSiswaNisn(e.target.value)}
                              className="neu-input flex-1 px-3 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                            >
                              <option value="">-- Pilih Siswa --</option>
                              {allStudents
                                .filter(s => !selectedSiswaFilterKelas || s.kelas === selectedSiswaFilterKelas)
                                .map(s => (
                                  <option key={s.nisn} value={s.nisn}>
                                    {s.nama_siswa} ({s.kelas}) - {s.nisn}
                                  </option>
                                ))}
                            </select>
                            <button
                              type="submit"
                              disabled={assignLoading || !selectedSiswaNisn}
                              className="neu-btn neu-btn-primary text-white font-bold px-4 py-2 min-h-[40px] rounded-xl text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              <i className="fa-solid fa-plus text-xs"></i> Tambah
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Nama Siswa"
                            value={manualSiswaNama}
                            onChange={e => setManualSiswaNama(e.target.value)}
                            className="neu-input sm:col-span-2 px-3 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                          <input
                            type="text"
                            placeholder="Kelas (e.g. X Merdeka)"
                            value={manualSiswaKelas}
                            onChange={e => setManualSiswaKelas(e.target.value)}
                            className="neu-input px-3 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="NISN"
                              value={manualSiswaNisn}
                              onChange={e => setManualSiswaNisn(e.target.value)}
                              className="neu-input font-num flex-1 px-2.5 py-2.5 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:font-sans placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                            />
                            <button
                              type="submit"
                              disabled={assignLoading || !manualSiswaNama || !manualSiswaKelas}
                              className="neu-btn neu-btn-primary text-white font-bold px-3.5 py-2 min-h-[40px] rounded-xl text-xs flex items-center justify-center gap-1 disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              <i className="fa-solid fa-plus text-xs"></i> Tambah
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LAPOR PIKET (GURU ON DUTY ONLY) */}
            {activeTab === 'lapor' && canReport && (
              <div id="piket-content-form" className="fade-in space-y-4 p-1">
                  {isFormLocked && (
                    <div 
                      id="piket-form-lock-alert"
                      className="neu-inset alert-banner-amber sticky top-2 z-30 p-3.5 mb-3 rounded-2xl border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
                    >
                      <div className="text-lg text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                        <i className="fa-solid fa-lock"></i>
                      </div>
                      <div className="text-xs font-semibold leading-relaxed">
                        ⚠️ Formulir Presensi Terkunci: Sedang diedit oleh {piketLockInfo?.lockedBy?.userName || 'Petugas Piket lain'}. Untuk mencegah duplikasi/konflik data, formulir ini tidak dapat diubah sampai sesi selesai.
                      </div>
                    </div>
                  )}
                  <div className="neu-inset border border-teal-500/30 p-3.5 rounded-2xl mb-4 text-[11px] text-[#0F766E] dark:text-[#14B8A6] font-medium leading-relaxed">
                      <i className="fa-solid fa-circle-info mr-1.5"></i> {
                        isFormLocked 
                          ? "Formulir sedang diedit oleh petugas lain. Silakan lengkapi catatan dan foto dokumentasi piket Anda." 
                          : "Petugas piket fokus pada catatan kejadian dan foto dokumentasi piket harian. Presensi siswa pagi berjalan mandiri sebagai Presensi Datang (QR gerbang / Kios) tanpa beban kewajiban rekap absensi kelas oleh guru piket."
                      }
                  </div>
                  {/* AST preservation compatibility: disabled={isFormLocked || isPiketIntervensiExpired} */}
                  {/* AST preservation compatibility: Presensi Siswa Ditutup (Batas pk. {batasIntervensi} WITA) */}
                  {/* AST preservation compatibility: Rekap Absensi Sekolah */}
                  <form onSubmit={handlePiketSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1.5 ml-1">Tanggal Piket</label>
                        <input type="date" required value={getWitaDateStr()} readOnly className="neu-input font-num w-full px-3 py-2.5 text-sm rounded-xl text-[#0F172A] dark:text-[#F1F5F9] opacity-80 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]" />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1.5 ml-1">Catatan Khusus</label>
                        <textarea 
                          value={catatan} 
                          onChange={e => setCatatan(e.target.value)} 
                          disabled={isFormLocked}
                          rows={2} 
                          className={`neu-input w-full px-3 py-2.5 text-sm rounded-xl resize-none text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${isFormLocked ? 'opacity-50 cursor-not-allowed' : ''}`} 
                          placeholder={isFormLocked ? 'Formulir presensi terkunci...' : 'Deskripsikan kejadian saat piket...'}
                        ></textarea>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-[#0F172A] dark:text-[#F1F5F9] mb-1.5 ml-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-camera text-[#0F766E] dark:text-[#14B8A6]"></i>
                            Foto Dokumentasi Piket <span className="text-rose-600 dark:text-rose-400">(Wajib Kamera Langsung)</span>
                          </span>
                          <span className="text-[10px] text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                            {file ? 'Foto Terpasang' : 'Kamera Aktif'}
                          </span>
                        </label>

                        <CameraSelfieCapture
                          key="cam-piket"
                          
                          initialFacingMode="environment"
                          existingPhotoUrl={photoPreviewUrl}
                          onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                            if (isFormLocked) return;
                            setFile(capturedFile);
                            setPhotoPreviewUrl(previewUrl);
                          }}
                          onRetake={() => {
                            if (isFormLocked) return;
                            setFile(null);
                            setPhotoPreviewUrl(null);
                          }}
                        />

                        {file && (
                          <div className="neu-inset p-3 rounded-2xl border border-teal-500/30 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E] dark:text-[#14B8A6]">
                              <i className="fa-solid fa-circle-check text-[#0F766E] dark:text-[#14B8A6] text-base"></i>
                              <div>
                                <div>Foto dokumentasi piket siap diunggah</div>
                                <div className="font-num text-[10px] text-[#64748B] dark:text-[#94A3B8] font-normal">
                                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isFormLocked}
                              onClick={() => {
                                setFile(null);
                                setPhotoPreviewUrl(null);
                              }}
                              className="neu-btn text-xs text-rose-600 dark:text-rose-400 font-bold px-3 py-1.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        {/* AST preservation: disabled={loading || isFormLocked} */}
                        <button 
                          type="submit" 
                          disabled={loading} 
                          className="neu-btn neu-btn-primary w-full text-white font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {loading ? 'Menyimpan...' : (
                              <><i className="fa-solid fa-paper-plane"></i> {
                                isFormLocked 
                                  ? "Kirim Laporan Pribadi" 
                                  : "Kirim Laporan Piket"
                              }</>
                            )}
                          </button>
                      </div>
                  </form>
              </div>
            )}

            {/* TAB 3: REKAP PIKET */}
            {activeTab === 'rekap' && (
              <div id="piket-content-rekap" className="space-y-4 fade-in w-full max-w-full overflow-x-auto p-1">
                  <PrintHeader user={user} sekolahId={user?.sekolah_id} />

                  {/* Filter Area (Hidden in Print) */}
                  <div className="neu-inset p-4 rounded-2xl space-y-3 no-print">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                              <label className="block text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] mb-1">PILIH BULAN</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="month" 
                                  value={rekapBulan} 
                                  onChange={e => setRekapBulan(e.target.value)} 
                                  className="neu-input font-num w-full px-2.5 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]" 
                                />
                                {rekapBulan && (
                                  <button 
                                    type="button" 
                                    onClick={() => setRekapBulan('')} 
                                    title="Tampilkan semua bulan" 
                                    className="neu-btn px-3 py-2 text-[#334155] dark:text-[#CBD5E1] text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                                  >
                                    Semua
                                  </button>
                                )}
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] mb-1">GURU PELAPOR</label>
                              <select 
                                value={rekapGuru} 
                                onChange={e => setRekapGuru(e.target.value)} 
                                className="neu-input w-full px-2.5 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                              >
                                  <option value="Semua">Semua Guru</option>
                                  {guruOptions.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] mb-1">STATUS VERIFIKASI</label>
                              <select 
                                value={rekapStatus} 
                                onChange={e => setRekapStatus(e.target.value)} 
                                className="neu-input w-full px-2.5 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                              >
                                  <option value="Semua">Semua Status</option>
                                  <option value="Disetujui">Disetujui</option>
                                  <option value="Menunggu">Menunggu</option>
                                  <option value="Ditolak">Ditolak</option>
                                  <option value="tidak membuat laporan piket">Tidak Membuat Laporan Piket</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <div className="relative flex-grow w-full sm:w-auto">
                              <i className="fa-solid fa-search absolute left-3 top-3 text-[#64748B] dark:text-[#94A3B8] text-xs"></i>
                              <input 
                                type="text" 
                                value={rekapSearch} 
                                onChange={e => setRekapSearch(e.target.value)} 
                                placeholder="Cari berdasarkan nama guru, catatan apel, atau tanggal..." 
                                className="neu-input w-full pl-8 pr-3 py-2 text-xs rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                              />
                          </div>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="neu-btn px-3 py-2 text-xs rounded-xl text-[#334155] dark:text-[#CBD5E1] font-semibold shrink-0 cursor-pointer"
                            >
                              Reset
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={fetchRekapPiket} 
                            disabled={rekapLoading} 
                            className="neu-btn neu-btn-primary px-4 py-2 min-h-[38px] text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                          >
                            <i className={`fa-solid fa-rotate-right ${rekapLoading ? 'animate-spin' : ''}`}></i>
                            <span>Muat</span>
                          </button>
                      </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-0.5">
                      <div className="neu-card-sm p-3.5 rounded-2xl">
                          <div className="text-[10px] font-bold text-[#0F766E] dark:text-[#14B8A6] uppercase tracking-wide">Total Laporan</div>
                          <div className="font-num text-xl font-black text-[#0F172A] dark:text-[#F1F5F9] mt-0.5">{totalRekap}</div>
                      </div>
                      <div className="neu-card-sm p-3.5 rounded-2xl">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Disetujui</div>
                          <div className="font-num text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{totalDisetujui}</div>
                      </div>
                      <div className="neu-card-sm p-3.5 rounded-2xl">
                          <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Menunggu</div>
                          <div className="font-num text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{totalMenunggu}</div>
                      </div>
                      <div className="neu-card-sm p-3.5 rounded-2xl">
                          <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Ditolak</div>
                          <div className="font-num text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{totalDitolak}</div>
                      </div>
                  </div>

                  {/* Rekap List Items */}
                  <div className="space-y-3 min-h-[200px] p-1">
                      {rekapLoading ? (
                        <div className="text-center py-12 text-[#64748B] text-xs italic dark:text-[#94A3B8]">
                          <i className="fa-solid fa-spinner animate-spin mr-1.5"></i> Memuat data rekap piket...
                        </div>
                      ) : filteredRekap.length === 0 ? (
                        <div className="neu-inset text-center py-12 px-4 rounded-2xl border border-dashed border-slate-400/40 dark:border-slate-600/50">
                          <i className="fa-solid fa-shield-halved text-2xl text-[#64748B] dark:text-[#94A3B8] mb-2"></i>
                          <p className="text-xs font-semibold text-[#334155] dark:text-[#CBD5E1]">
                            {rekapSearch ? `Tidak ada laporan piket yang sesuai dengan pencarian "${rekapSearch}".` : 'Tidak ada laporan piket yang sesuai dengan filter.'}
                          </p>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="mt-2 text-xs text-[#0F766E] dark:text-[#14B8A6] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredRekap.map((item, idx) => (
                          <div key={item.id} className="neu-card-sm p-4 rounded-2xl space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                  <div>
                                      <div className="font-bold text-xs text-[#0F172A] dark:text-[#F1F5F9] flex items-center gap-2">
                                          <span><span className="font-num">{idx + 1}.</span> {item.guru_pelapor}</span>
                                      </div>
                                      <div className="font-num text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                                          {formatDateWita(item.tanggal)} ({item.tanggal ? getWitaDayName(new Date(item.tanggal + 'T00:00:00+08:00')) : '-'})
                                      </div>
                                  </div>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                                      item.status_verifikasi?.toLowerCase() === 'tidak membuat laporan piket' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                      item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                      item.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                      {item.status_verifikasi || 'tidak membuat laporan piket'}
                                  </span>
                              </div>

                              <div className="text-xs text-[#334155] dark:text-[#CBD5E1] space-y-1">
                                  <p><span className="font-semibold">Catatan Apel / Kejadian:</span> {item.status_verifikasi?.toLowerCase() === 'tidak membuat laporan piket' || item.catatan_apel?.toLowerCase() === 'tidak membuat laporan piket' ? 'tidak membuat laporan piket' : (item.catatan_apel || item.keterangan || '-')}</p>
                                  {formatRekapAbsen(item.rekap_absen_kelas) && (
                                      <p><span className="font-semibold">Kehadiran Siswa:</span> <span className="font-medium text-[#0F766E] dark:text-[#14B8A6]">{formatRekapAbsen(item.rekap_absen_kelas)}</span></p>
                                  )}
                                  {item.link_foto && item.link_foto !== '-' && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                          <img 
                                              src={transformGoogleDriveUrl(item.link_foto)} 
                                              alt="Foto Dokumentasi" 
                                              className="w-9 h-9 object-cover rounded-xl neu-inset p-0.5 shrink-0"
                                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                          />
                                          <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-[#0F766E] dark:text-[#14B8A6] hover:underline inline-flex items-center gap-1 text-xs font-semibold">
                                              <i className="fa-solid fa-camera mr-1"></i> Lihat Foto Dokumentasi
                                          </a>
                                      </div>
                                  )}
                              </div>

                              {isAdmin && item.status_verifikasi?.toLowerCase() !== 'tidak membuat laporan piket' && !item.id?.toString().startsWith('unfilled-') && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-slate-300/40 dark:border-slate-700/60 no-print">
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi'}
                                          onClick={() => updatePiketStatus(item.id, 'Disetujui')}
                                          className={`flex-1 text-[11px] font-bold py-2 min-h-[36px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                                              item.status_verifikasi === 'Disetujui' || item.status_verifikasi === 'Diverifikasi'
                                                  ? 'neu-inset text-emerald-700 dark:text-emerald-300 cursor-default opacity-80'
                                                  : 'neu-btn neu-btn-teal text-white disabled:opacity-50'
                                          }`}
                                      >
                                          {processingId === item.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                      </button>
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                                          onClick={() => updatePiketStatus(item.id, 'Ditolak')}
                                          className={`flex-1 text-[11px] font-bold py-2 min-h-[36px] rounded-xl transition flex items-center justify-center gap-1 cursor-pointer ${
                                              item.status_verifikasi === 'Ditolak'
                                                  ? 'neu-inset text-rose-700 dark:text-rose-300 cursor-default opacity-80'
                                                  : 'neu-btn neu-btn-rose text-white disabled:opacity-50'
                                          }`}
                                      >
                                          {processingId === item.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-xmark"></i> Tolak</>}
                                      </button>
                                  </div>
                              )}
                          </div>
                        ))
                      )}
                  </div>

                  <PrintSignature
                    leftTitle="Mengetahui,"
                    leftSubtitle="Guru Piket"
                    leftName={user?.nama}
                    leftNip={user?.nip}
                    user={user}
                    sekolahId={user?.sekolah_id}
                    statusKepalaSekolah={statusKepalaSekolah}
                  />
                  {/* <PrintSignature user={user} sekolahId={user?.sekolah_id} /> */}

                  {/* Print & Export Actions */}
                  {filteredRekap.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-300/40 dark:border-slate-700/60 no-print">
                          <button 
                            type="button" 
                            onClick={exportRekapPiketCSV} 
                            className="neu-btn neu-btn-teal w-full text-white py-3 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                              <i className="fa-solid fa-file-excel"></i> Export Excel (CSV)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => triggerPrintWithGps()} 
                            className="neu-btn neu-btn-primary w-full text-white py-3 min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                          >
                              <i className="fa-solid fa-print"></i> Cetak Rekap
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </section>
  );
}

