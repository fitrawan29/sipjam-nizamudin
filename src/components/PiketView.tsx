'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Swal from 'sweetalert2';
import { showToast, Toast } from '@/lib/toast';
import { getGuruDailyState, GuruDailyState } from '@/lib/workflow';
import { uploadToDrive } from '@/lib/driveUpload';
import { getWitaDateStr, getWitaTimestamp, formatDateWita, getWitaDayName } from '@/lib/wita';
import { PrintHeader, PrintSignature } from './PrintHeader';
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

const HARI_PIKET_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;

export default function PiketView({ user }: { user: any }) {
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
  const [deviceId, setDeviceId] = useState<string>('kiosk-1');
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
  const isDetectingRef = useRef(false);
  const lastCameraScannedRef = useRef<{ code: string; time: number } | null>(null);
  const usbInputRef = useRef<HTMLInputElement | null>(null);

  // Live Attendance Log & Summary
  const [scanSummary, setScanSummary] = useState({ totalDatang: 0, totalPulang: 0, totalUnik: 0 });
  const [todayScans, setTodayScans] = useState<any[]>([]);
  const [scanFilterKelas, setScanFilterKelas] = useState('Semua');
  const [scanSearchQuery, setScanSearchQuery] = useState('');

  // Mode Presensi Siswa ('qr' | 'manual') per-sekolah & Manual Attendance state
  const [modePresensiSiswa, setModePresensiSiswa] = useState<'qr' | 'manual'>('qr');
  const [manualKelasFilter, setManualKelasFilter] = useState('Semua');
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualMarkLoading, setManualMarkLoading] = useState<string | null>(null);

  // Audio feedback synthesizer via Web Audio API
  const playAudioFeedback = (type: 'success' | 'warning' | 'error') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
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
    if (!user?.sekolah_id) return;
    const todayStr = getLocalTodayDate();
    try {
      const summary = await getTodayPresensiSummary(supabase, user.sekolah_id, todayStr);
      setScanSummary(summary);

      const recent = await getRecentPresensiSiswa(supabase, user.sekolah_id, todayStr, 1000);
      setTodayScans(recent);
    } catch (e) {
      console.error('Error fetching today scan data:', e);
    }
  };

  // Realtime subscription and short polling for live multi-kiosk concurrency
  useEffect(() => {
    if (activeTab === 'scan') {
      fetchTodayScanData();

      // Realtime subscription to presensi_siswa table
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
              fetchTodayScanData();
            }
          }
        )
        .subscribe();

      // Short polling fallback (8 seconds) for maximum multi-kiosk sync reliability
      const pollTimer = setInterval(() => {
        fetchTodayScanData();
      }, 8000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(pollTimer);
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
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      setCameraError(err.message || 'Gagal mengakses kamera browser. Pastikan izin kamera telah diberikan.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (activeTab !== 'scan' && cameraActive) {
      stopCamera();
    }
  }, [activeTab, cameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame detection loop with native BarcodeDetector
  useEffect(() => {
    let intervalId: any = null;
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
        if (!videoRef.current || videoRef.current.readyState < 2 || isDetectingRef.current) return;
        isDetectingRef.current = true;
        try {
          if (detector) {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                const now = Date.now();
                if (!lastCameraScannedRef.current || lastCameraScannedRef.current.code !== rawVal || (now - lastCameraScannedRef.current.time > 3000)) {
                  lastCameraScannedRef.current = { code: rawVal, time: now };
                  handleProcessScan(rawVal);
                }
              }
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
    };
  }, [cameraActive, scanMode]);

  // Main scan processor: resolves student and records attendance
  const handleProcessScan = async (code: string) => {
    if (!code || scanProcessing) return;
    setScanProcessing(true);

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

      // 2. Record attendance
      const res = await recordPresensiSiswa(supabase, {
        siswa: student,
        status: scanMode,
        sekolahId: user?.sekolah_id,
        deviceId: deviceId
      });

      if (res.success) {
        playAudioFeedback('success');
        const jamStr = res.data?.jam ? res.data.jam.slice(0, 8) : getLocalCurrentTime();
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
        const jamStr = res.data?.jam ? res.data.jam.slice(0, 8) : undefined;
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
      setScanProcessing(false);
      setTimeout(() => {
        usbInputRef.current?.focus();
      }, 100);
    }
  };

  // Two-way synchronization handlers between QR input and manual form
  const handleUsbInputChange = (val: string) => {
    setUsbInputVal(val);
    setManualSearchQuery(val);

    // Cancel old QR scan result if user types a different student code/name
    if (lastScanResult?.student) {
      const s = lastScanResult.student;
      const matchesOld =
        s.nama_siswa.toLowerCase().includes(val.toLowerCase()) ||
        (s.nisn && s.nisn.toLowerCase().includes(val.toLowerCase())) ||
        s.id === val;
      if (!matchesOld && val.trim() !== '') {
        setLastScanResult(null);
      }
    }
  };

  const handleManualSearchChange = (val: string) => {
    setManualSearchQuery(val);
    setUsbInputVal(val);

    // Cancel old QR scan result if user types a different student code/name
    if (lastScanResult?.student) {
      const s = lastScanResult.student;
      const matchesOld =
        s.nama_siswa.toLowerCase().includes(val.toLowerCase()) ||
        (s.nisn && s.nisn.toLowerCase().includes(val.toLowerCase())) ||
        s.id === val;
      if (!matchesOld && val.trim() !== '') {
        setLastScanResult(null);
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

      const jamStr = res.data?.jam ? res.data.jam.slice(0, 8) : getLocalCurrentTime();

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

        // Two-way sync: fill QR scanner input and manual search input
        setUsbInputVal(student.nisn || student.nama_siswa);
        setManualSearchQuery(student.nama_siswa);

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
        setManualSearchQuery(student.nama_siswa);

        await fetchTodayScanData();
      } else {
        showToast('Gagal', res.message || 'Terjadi kesalahan', 'error');
        playAudioFeedback('error');
      }
    } catch (err: any) {
      console.error('Error marking manual presensi:', err);
      showToast('Error', err.message || 'Gagal menandai presensi', 'error');
      playAudioFeedback('error');
    } finally {
      setManualMarkLoading(null);
    }
  };

  // Submit manual input form (processes attendance as if submitted via QR)
  const handleManualFormSubmit = async () => {
    const query = manualSearchQuery.trim();
    if (!query) return;

    // 1. Try finding by exact NISN
    let match = allStudents.find(s => s.nisn && s.nisn.toLowerCase() === query.toLowerCase());
    // 2. Try finding by exact ID
    if (!match) match = allStudents.find(s => s.id === query);
    // 3. Try finding by exact name
    if (!match) match = allStudents.find(s => s.nama_siswa && s.nama_siswa.toLowerCase() === query.toLowerCase());
    // 4. Try single filtered student
    if (!match && filteredManualStudents.length === 1) match = filteredManualStudents[0];

    if (match) {
      await handleManualMark(match, scanMode);
    } else if (filteredManualStudents.length > 1) {
      showToast('Info', `Ditemukan ${filteredManualStudents.length} siswa dengan kata kunci "${query}". Klik tombol di daftar siswa.`, 'info');
    } else {
      // Fallback: resolve student by code from DB
      const { data: resolved } = await resolveStudentByCode(supabase, query, user?.sekolah_id);
      if (resolved) {
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
    }
  };

  const handleCancelManualPresensi = async (recordId: string, namaSiswa: string, status: 'datang' | 'pulang') => {
    const result = await Swal.fire({
      title: 'Batalkan Presensi?',
      text: `Hapus status presensi ${status} untuk ${namaSiswa}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
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
        if (lastScanResult?.student?.nama_siswa === namaSiswa) {
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
      (s.nisn?.toLowerCase() || '').includes(manualSearchQuery.toLowerCase());
    return matchKelas && matchSearch;
  });

  useEffect(() => {
    fetchDataPiket();

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
          setManualKelasFilter(prev => prev === 'Semua' ? (uniqueKelas[0] as string) : prev);
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

    if (user?.role === 'Guru') {
      getGuruDailyState(user.nama, user.username, user.id, user.sekolah_id).then(setDailyState).catch(console.error);
    }
  }, [user]);

  // Trigger rekap fetch when switching to rekap tab or filter values change
  useEffect(() => {
    if (activeTab === 'rekap') {
      fetchRekapPiket();
    }
  }, [activeTab, rekapBulan, rekapGuru, rekapStatus]);

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
      if (error) {
        console.error('Error fetching rekap piket:', error);
      } else if (data) {
        setRekapList(data);
      }
    } catch (err) {
      console.error('Rekap piket fetch exception:', err);
    } finally {
      setRekapLoading(false);
    }
  };

  const updatePiketStatus = async (id: string, status: 'Disetujui' | 'Ditolak') => {
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
    }], { onConflict: 'sekolah_id, tanggal, nisn' }).then(null, console.error);
  };

  const handlePiketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      return showToast('Foto Wajib Diambil', 'Silakan ambil foto dokumentasi piket menggunakan kamera langsung.', 'warning');
    }

    setLoading(true);

    let fileUrl = '';
    try {
      fileUrl = await uploadToDrive(file, user.nama, 'Laporan_Piket', 'Piket');
    } catch (err: any) {
      setLoading(false);
      return showToast('Gagal Upload', err.message, 'error');
    }

    const newLaporan = {
      id: crypto.randomUUID(),
      timestamp: getWitaTimestamp(),
      tanggal: getWitaDateStr(),
      guru_pelapor: user.nama,
      user_id: user.id,
      rekap_absen_kelas: JSON.stringify(piketAbsensi),
      catatan_apel: catatan,
      link_foto: fileUrl,
      status_verifikasi: 'Menunggu',
      kehadiran_guru_piket: 'Hadir',
      ...(user?.sekolah_id ? { sekolah_id: user.sekolah_id } : {})
    };

    const { error } = await supabase.from('laporan_piket').insert([newLaporan]);

    if (error) {
      showToast('Error', 'Gagal menyimpan laporan piket: ' + error.message, 'error');
    } else {
      // If re-submitting after rejection: delete the old rejected laporan
      if (dailyState?.laporanPiketDitolak?.id) {
        await supabase.from('laporan_piket').delete().eq('id', dailyState.laporanPiketDitolak.id);
      }
      // Also ensure any rejected piket report for this teacher today is cleanly cleaned up
      await supabase.from('laporan_piket')
        .delete()
        .eq('guru_pelapor', user.nama)
        .eq('tanggal', getWitaDateStr())
        .eq('status_verifikasi', 'Ditolak');
      // Sync Piket student attendance to canonical public.absensi
      if (allStudents.length > 0) {
        try {
          const statusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa'> = {
            H: 'Hadir',
            S: 'Sakit',
            I: 'Izin',
            A: 'Alpa'
          };
          const nowWita = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' });
          const todayDateStr = getWitaDateStr();

          let aQ = supabase.from('absensi').select('nisn, status, log_perubahan').eq('tanggal', todayDateStr);
          if (user?.sekolah_id) aQ = aQ.eq('sekolah_id', user.sekolah_id);
          const { data: existingAbs } = await aQ;
          const existingMap = new Map(existingAbs?.map(a => [a.nisn, a]));

          const absensiRows = allStudents.map(s => {
            const existing = existingMap.get(s.nisn);
            if (existing?.status === 'Tidak Hadir') {
              return null;
            }

            const statusCode = piketAbsensi[s.nisn] || 'H';
            const fullStatus = statusMap[statusCode] || 'Hadir';
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

          await supabase.from('absensi').upsert(absensiRows as any[], { onConflict: 'sekolah_id, tanggal, nisn' });
        } catch (syncErr) {
          console.error('Error synchronizing piket attendance to public.absensi:', syncErr);
        }
      }

      showToast('Berhasil', 'Laporan piket berhasil disimpan dan presensi disinkronkan!', 'success', {
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false,
      });
      setCatatan('');
      setFile(null);
      setPhotoPreviewUrl(null);
      setActiveTab('beranda');
      fetchDataPiket(); // Refresh data
      if (user?.role === 'Guru') {
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
  const totalDisetujui = filteredRekap.filter(r => r.status_verifikasi === 'Disetujui').length;
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
      csvRows.push([
        idx + 1,
        `"${r.tanggal || ''}"`,
        `"${hari}"`,
        `"${(r.guru_pelapor || '').replace(/"/g, '""')}"`,
        `"${(r.catatan_apel || '-').replace(/"/g, '""')}"`,
        `"${r.status_verifikasi || 'Menunggu'}"`,
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

  const isGuru = user?.role === 'Guru';
  const isAdmin = user?.role === 'Admin';
  // Admin never conducts daily report; Guru conducts report if assigned and not on leave
  // Also allow reporting when laporan piket was rejected (teacher needs to re-submit)
  const canReport = !isAdmin && isGuru && Boolean(
    dailyState && dailyState.isPiket && !dailyState.isLibur && 
    (!dailyState.laporanPiket || dailyState.laporanPiketDitolak)
  );

  if (isGuru && dailyState && !dailyState.isPiket && !isAdmin) {
    return (
      <section id="view-piket" className="view-section page-enter w-full max-w-full">
        <div className="glass-card p-8 text-center max-w-lg mx-auto mt-6 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bukan Jadwal Piket Hari Ini</h2>
          <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            Modul <strong>Piket</strong> (termasuk fitur Presensi Siswa dan Laporan Piket) secara eksklusif hanya dapat diakses oleh Guru yang memiliki jadwal piket pada hari ini. Anda tidak tercatat dalam jadwal piket hari ini.
          </p>
          <div className="p-3 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <i className="fa-solid fa-circle-info mr-1.5"></i> Hubungi Administrator jika jadwal penugasan piket Anda belum tercatat di sistem.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="view-piket" className="view-section page-enter w-full max-w-full overflow-x-auto">
        <div className="glass-card p-4 sm:p-6 w-full max-w-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center">
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
                  className="btn-click bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white w-8 h-8 rounded-lg text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-700 flex justify-center items-center"
                >
                  <i className="fa-solid fa-rotate-right text-xs"></i>
                </button>
            </div>

            {dailyState?.isLibur && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-sm font-bold border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 no-print">
                <i className="fa-solid fa-lock mr-2"></i> Akses Terkunci: {dailyState.lockedReason}
              </div>
            )}

            {/* TAB BUTTONS */}
            <div className="flex gap-2 mb-4 overflow-x-auto custom-scroll pb-1 no-print">
              <button 
                type="button"
                onClick={() => setActiveTab('beranda')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'beranda' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
              >
                Beranda Piket
              </button>

              <button 
                type="button"
                onClick={() => setActiveTab('scan')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'scan' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
              >
                <i className="fa-solid fa-qrcode mr-1.5 text-teal-600 dark:text-teal-400"></i> Presensi Siswa (QR & Manual)
              </button>

              {isAdmin && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('penugasan')} 
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'penugasan' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
                >
                  <i className="fa-solid fa-user-gear mr-1.5 text-teal-600 dark:text-teal-400"></i> Penugasan Piket
                </button>
              )}

              {canReport && (
                <button 
                  type="button"
                  onClick={() => setActiveTab('lapor')} 
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'lapor' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
                >
                  <i className="fa-solid fa-pen-to-square mr-1.5 text-teal-600 dark:text-teal-400"></i> Isi Laporan
                </button>
              )}

              <button 
                type="button"
                onClick={() => setActiveTab('rekap')} 
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all pill-interactive ${activeTab === 'rekap' ? 'bg-teal-50 text-teal-700 border border-teal-200 font-bold dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' : 'bg-gray-50 text-gray-700 border border-transparent dark:bg-gray-800 dark:text-gray-200'}`}
              >
                <i className="fa-solid fa-chart-pie mr-1.5 text-teal-600 dark:text-teal-400"></i> Rekap Piket
              </button>
            </div>

            {/* TAB 1: BERANDA PIKET */}
            {activeTab === 'beranda' && (
              <div id="piket-content-beranda" className="space-y-4 fade-in">

                  {/* Rejection Alert — Laporan Piket Ditolak */}
                  {isGuru && dailyState?.laporanPiketDitolak && (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
                        <i className="fa-solid fa-circle-xmark text-base shrink-0"></i>
                        <span>Laporan Piket Anda Ditolak oleh Admin</span>
                      </div>
                      {(dailyState.laporanPiketDitolak.catatan_admin || dailyState.laporanPiketDitolak.alasan_penolakan) && (
                        <div className="pl-6 text-xs text-red-700 dark:text-red-300/90 italic leading-relaxed">
                          <span className="font-semibold not-italic">Alasan: </span>
                          {dailyState.laporanPiketDitolak.catatan_admin || dailyState.laporanPiketDitolak.alasan_penolakan}
                        </div>
                      )}
                      <div className="pl-6 flex items-center gap-3">
                        <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                          <i className="fa-solid fa-rotate-right mr-1"></i> Silakan isi ulang laporan piket Anda.
                        </span>
                        {canReport && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('lapor')}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-lg transition"
                          >
                            Isi Ulang Sekarang →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                          <i className="fa-regular fa-calendar-check"></i> Jadwal Piket Harian (Senin – Sabtu)
                        </h3>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('penugasan')}
                            className="text-[11px] font-bold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                          >
                            <i className="fa-solid fa-gear text-[10px]"></i> Kelola Penugasan
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto custom-scroll pr-1">
                        {HARI_PIKET_LIST.map(hari => {
                          const guruList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Guru');
                          const siswaList = penugasanList.filter(p => p.hari === hari && p.tipe_petugas === 'Siswa');
                          const legacyRow = jadwalPiket.find(j => j.hari === hari);

                          return (
                            <div key={hari} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-teal-100 dark:border-teal-900 shadow-2xs space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-teal-700 dark:text-teal-400 text-xs">{hari}</span>
                                <span className="text-[10px] bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 font-semibold px-1.5 py-0.2 rounded">
                                  {guruList.length} Guru • {siswaList.length} Siswa
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-800 dark:text-gray-200">
                                <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] block">Guru:</span>
                                {guruList.length > 0 ? (
                                  <ul className="list-disc list-inside space-y-0.5 mt-0.5">
                                    {guruList.map(g => (
                                      <li key={g.id} className="truncate">{g.guru_nama}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">
                                    {legacyRow?.daftar_guru || 'Belum ditugaskan'}
                                  </span>
                                )}
                              </div>
                              {siswaList.length > 0 && (
                                <div className="text-[11px] text-gray-800 dark:text-gray-200 pt-1 border-t border-gray-100 dark:border-gray-700">
                                  <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] block">Siswa:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {siswaList.map(s => (
                                      <span key={s.id} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-medium">
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
                          <h3 className="text-xs font-bold text-gray-900 dark:text-white"><i className="fa-solid fa-list-check mr-1.5 text-teal-600 dark:text-teal-400"></i> Laporan Terbaru</h3>
                      </div>
                      <div className="space-y-3 min-h-[150px]">
                        {laporanPiket.length === 0 ? (
                          <div className="text-center text-[10px] text-gray-500 dark:text-white/80 py-4">Belum ada laporan.</div>
                        ) : laporanPiket.map(l => (
                          <div key={l.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-start mb-1">
                              <div>
                                <div className="font-bold text-xs text-gray-900 dark:text-white">{l.guru_pelapor}</div>
                                <div className="text-[9px] text-gray-500 dark:text-gray-400">{l.tanggal}</div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                l.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                l.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}>{l.status_verifikasi || 'Menunggu'}</span>
                            </div>
                            <div className="text-[10px] text-gray-700 dark:text-white/80 line-clamp-2">{l.catatan_apel || "Tidak ada catatan."}</div>
                            {l.link_foto && l.link_foto !== '-' && (
                              <div className="flex items-center gap-2 mt-1">
                                <img 
                                  src={transformGoogleDriveUrl(l.link_foto)} 
                                  alt="Foto Piket" 
                                  className="w-8 h-8 object-cover rounded border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                                <a href={l.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline text-[10px] inline-flex items-center gap-1">
                                  <i className="fa-solid fa-camera mr-1"></i> Foto Piket
                                </a>
                              </div>
                            )}
                            {user?.role === 'Admin' && (
                              <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Disetujui'}
                                  onClick={() => updatePiketStatus(l.id, 'Disetujui')}
                                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                    l.status_verifikasi === 'Disetujui'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                                      : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                                  }`}
                                >
                                  {processingId === l.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                </button>
                                <button
                                  disabled={processingId === l.id || l.status_verifikasi === 'Ditolak'}
                                  onClick={() => updatePiketStatus(l.id, 'Ditolak')}
                                  className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                    l.status_verifikasi === 'Ditolak'
                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                                      : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
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
              <div id="piket-content-scan" className="space-y-6 fade-in">
                {/* 1. Kiosk Station & Mode Switcher Controls */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 p-4 sm:p-5 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                        <i className="fa-solid fa-qrcode text-teal-600 dark:text-teal-400"></i>
                        Kios Scanner Presensi Siswa (QR Code & Input Manual)
                      </h3>
                      <p className="text-xs text-teal-700 dark:text-teal-400/80 mt-0.5">
                        Mendukung scanner USB HID barcode/QR, kamera browser, dan input manual tersinkronisasi dua arah.
                      </p>
                    </div>

                    {/* Kiosk Device ID Selector */}
                    <div className="flex items-center gap-2 self-stretch sm:self-auto bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-teal-200 dark:border-teal-800">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 pl-2 whitespace-nowrap">
                        <i className="fa-solid fa-desktop mr-1 text-teal-600"></i> Stasiun Kios:
                      </span>
                      <select
                        value={deviceId}
                        onChange={(e) => handleDeviceIdChange(e.target.value)}
                        className="text-xs font-bold text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 py-1.5 px-2.5 rounded-lg border-0 focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                    <label className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide block mb-2">
                      Pilih Status Presensi:
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-w-xl">
                      <button
                        type="button"
                        onClick={() => setScanMode('datang')}
                        className={`py-3 px-4 rounded-xl text-left transition-all border flex items-center gap-3 ${
                          scanMode === 'datang'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/50'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          scanMode === 'datang' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        }`}>
                          <i className="fa-solid fa-right-to-bracket text-lg"></i>
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm">PRESENSI DATANG</div>
                          <div className={`text-[10px] ${scanMode === 'datang' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            Catat kedatangan siswa
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScanMode('pulang')}
                        className={`py-3 px-4 rounded-xl text-left transition-all border flex items-center gap-3 ${
                          scanMode === 'pulang'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/50'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          scanMode === 'pulang' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        }`}>
                          <i className="fa-solid fa-right-from-bracket text-lg"></i>
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm">PRESENSI PULANG</div>
                          <div className={`text-[10px] ${scanMode === 'pulang' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            Catat kepulangan siswa
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Scanner Station & Real-Time Student Feedback Card */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Input Modes (USB HID + Camera) */}
                  <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-barcode text-teal-600"></i> Mode Input Scanner (QR / Barcode)
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isUsbInputFocused
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400'
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
                      <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 block">
                        Scanner Barcode / QR Eksternal (USB HID):
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-teal-600 dark:text-teal-400">
                          <i className="fa-solid fa-qrcode text-base"></i>
                        </div>
                        <input
                          ref={usbInputRef}
                          type="text"
                          value={usbInputVal}
                          onChange={(e) => handleUsbInputChange(e.target.value)}
                          onFocus={() => setIsUsbInputFocused(true)}
                          onBlur={handleUsbInputBlur}
                          disabled={scanProcessing}
                          placeholder="Arahkan scanner ke QR Code atau ketik NISN lalu Enter..."
                          className="w-full pl-10 pr-28 py-3 text-sm bg-gray-50 dark:bg-gray-900 border-2 border-teal-500 dark:border-teal-600 rounded-xl focus:outline-none focus:ring-4 focus:ring-teal-500/20 text-gray-900 dark:text-white font-mono placeholder:font-sans placeholder:text-gray-400"
                          autoFocus
                          autoComplete="off"
                        />
                        <button
                          type="submit"
                          disabled={scanProcessing || !usbInputVal.trim()}
                          className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          {scanProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <>Scan <i className="fa-solid fa-arrow-turn-down text-[10px]"></i></>}
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span><i className="fa-solid fa-circle-info mr-1 text-teal-600"></i> Auto re-focus aktif untuk scan berkelanjutan tanpa mouse</span>
                        <button
                          type="button"
                          onClick={() => usbInputRef.current?.focus()}
                          className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                        >
                          Fokus Ulang
                        </button>
                      </div>
                    </form>

                    {/* Divider & Browser Camera Scanner Option */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          Kamera Browser (Webcam / HP):
                        </span>
                        {!cameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-teal-200 dark:border-teal-800 cursor-pointer"
                          >
                            <i className="fa-solid fa-camera"></i> Buka Kamera
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-red-200 dark:border-red-800 cursor-pointer"
                          >
                            <i className="fa-solid fa-video-slash"></i> Tutup Kamera
                          </button>
                        )}
                      </div>

                      {cameraError && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          <span>{cameraError}</span>
                        </div>
                      )}

                      {cameraActive && (
                        <div className="relative rounded-xl overflow-hidden bg-black aspect-video border-2 border-teal-500 shadow-inner">
                          <video
                            ref={videoRef}
                            playsInline
                            autoPlay
                            muted
                            className="w-full h-full object-cover"
                          />
                          {/* Scanner Reticle Overlay */}
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-teal-400 rounded-2xl relative flex items-center justify-center animate-pulse">
                              <span className="text-[10px] text-teal-200 bg-black/60 px-2 py-0.5 rounded-full font-bold">
                                Arahkan QR ke Sini
                              </span>
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs p-1.5 rounded-lg text-center text-[10px] text-white">
                            <i className="fa-solid fa-bolt mr-1 text-teal-400"></i> BarcodeDetector aktif • Deteksi QR otomatis
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Visual Feedback Student Card */}
                  <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <i className="fa-solid fa-id-card text-teal-600"></i> Kartu Hasil Presensi Terakhir
                        </span>
                        {lastScanResult && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            lastScanResult.success
                              ? lastScanResult.status === 'datang'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : lastScanResult.alreadyExists
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
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
                        <div className={`p-4 rounded-xl border-2 space-y-3 transition-all ${
                          lastScanResult.success
                            ? lastScanResult.status === 'datang'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500'
                              : 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                            : lastScanResult.alreadyExists
                            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500'
                            : 'bg-red-50 dark:bg-red-950/20 border-red-500'
                        }`}>
                          <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-md shrink-0 ${
                              lastScanResult.status === 'datang'
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                                : 'bg-gradient-to-tr from-blue-600 to-indigo-500'
                            }`}>
                              {lastScanResult.student.nama_siswa.charAt(0).toUpperCase()}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                                {lastScanResult.student.nama_siswa}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 shadow-2xs">
                                  Kelas {lastScanResult.student.kelas}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  NISN: {lastScanResult.student.nisn || '-'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Message and Timestamp */}
                          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {lastScanResult.message}
                            </span>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono shrink-0">
                              pk. {lastScanResult.jam || '-'} WITA
                            </span>
                          </div>
                        </div>
                      ) : lastScanResult && !lastScanResult.student ? (
                        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border-2 border-red-500 space-y-2">
                          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm">
                            <i className="fa-solid fa-circle-xmark text-lg"></i>
                            <span>Siswa Tidak Ditemukan</span>
                          </div>
                          <p className="text-xs text-red-600 dark:text-red-300">
                            {lastScanResult.message}
                          </p>
                        </div>
                      ) : (
                        <div className="p-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-3 text-gray-400 dark:text-gray-500">
                          <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl shadow-inner">
                            <i className="fa-solid fa-qrcode animate-pulse"></i>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-700 dark:text-gray-300">Menunggu Presensi Siswa...</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Arahkan kartu QR ke scanner atau ketik data siswa pada form manual
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <span>Stasiun: {deviceId}</span>
                      <span>Audio Feedback: Suara Aktif (Web Audio)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Presensi Manual Siswa & Daftar Roster (Sinkronisasi Dua Arah) */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                        <i className="fa-solid fa-clipboard-user text-teal-600 dark:text-teal-400"></i>
                        Presensi Manual & Daftar Siswa
                      </h3>
                      <p className="text-xs text-teal-700 dark:text-teal-400/80 mt-0.5">
                        Input manual siswa dan ceklis presensi per kelas • Tersinkronisasi dua arah dengan Scanner QR.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 py-1.5 px-3 rounded-xl text-xs font-semibold">
                      <i className="fa-solid fa-arrows-rotate text-teal-600"></i>
                      <span>Sinkronisasi Dua Arah Aktif</span>
                    </div>
                  </div>

                  {/* Filter & Form Input Manual */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-teal-200/50 dark:border-teal-800/50">
                    {/* Filter Kelas */}
                    <div className="flex-1 sm:max-w-xs">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Pilih Kelas:
                      </label>
                      <select
                        value={manualKelasFilter}
                        onChange={(e) => setManualKelasFilter(e.target.value)}
                        className="w-full text-xs font-semibold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2.5 rounded-xl border border-teal-300 dark:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer shadow-2xs"
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
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Form Input Manual Siswa:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={manualSearchQuery}
                            onChange={(e) => handleManualSearchChange(e.target.value)}
                            placeholder="Ketik nama siswa atau NISN lalu Enter untuk presensi..."
                            className="w-full pl-9 pr-8 py-2.5 text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl border border-teal-300 dark:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                          />
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-gray-400"></i>
                          {manualSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualSearchQuery('');
                                setUsbInputVal('');
                              }}
                              className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={!manualSearchQuery.trim() || !!manualMarkLoading}
                          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <i className="fa-solid fa-check"></i>
                          <span>Proses Presensi</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Manual Student Roster Table Card */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <i className="fa-solid fa-users text-teal-600"></i>
                          Daftar Siswa {manualKelasFilter !== 'Semua' ? `Kelas ${manualKelasFilter}` : '(Semua Kelas)'}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Menampilkan {filteredManualStudents.length} siswa
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchTodayScanData}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                      >
                        <i className="fa-solid fa-rotate text-xs"></i>
                        <span>Segarkan Status</span>
                      </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto custom-scroll">
                      <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200 border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                            <th className="py-3 px-3 w-12 text-center">No</th>
                            <th className="py-3 px-3">Nama Siswa</th>
                            <th className="py-3 px-3">NISN</th>
                            <th className="py-3 px-3">Kelas</th>
                            <th className="py-3 px-3 text-center min-w-[140px]">Presensi Datang</th>
                            <th className="py-3 px-3 text-center min-w-[140px]">Presensi Pulang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                          {filteredManualStudents.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-gray-500 text-xs">
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <i className="fa-solid fa-user-slash text-2xl text-gray-300 dark:text-gray-600"></i>
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
                                <tr key={s.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                  <td className="py-3 px-3 text-center text-gray-400 text-[11px] font-mono">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <div className="font-bold text-gray-900 dark:text-white">
                                      {s.nama_siswa}
                                    </div>
                                    {s.gender && (
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                        {s.gender === 'L' ? 'Laki-laki' : s.gender === 'P' ? 'Perempuan' : s.gender}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                    {s.nisn || '-'}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 font-bold text-[10px]">
                                      {s.kelas}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {datangRecord ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                                          <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400"></i>
                                          <span>Datang {datangRecord.jam ? datangRecord.jam.slice(0, 5) : ''}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelManualPresensi(datangRecord.id, s.nama_siswa, 'datang')}
                                          title="Batalkan presensi datang"
                                          className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                        >
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={manualMarkLoading === `${s.id}-datang`}
                                        onClick={() => handleManualMark(s, 'datang')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                                      >
                                        {manualMarkLoading === `${s.id}-datang` ? (
                                          <i className="fa-solid fa-spinner animate-spin"></i>
                                        ) : (
                                          <i className="fa-solid fa-right-to-bracket text-[10px]"></i>
                                        )}
                                        <span>Tandai Datang</span>
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    {pulangRecord ? (
                                      <div className="inline-flex items-center gap-1.5">
                                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 inline-flex items-center gap-1.5 shadow-2xs">
                                          <i className="fa-solid fa-circle-check text-blue-600 dark:text-blue-400"></i>
                                          <span>Pulang {pulangRecord.jam ? pulangRecord.jam.slice(0, 5) : ''}</span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleCancelManualPresensi(pulangRecord.id, s.nama_siswa, 'pulang')}
                                          title="Batalkan presensi pulang"
                                          className="w-6 h-6 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition inline-flex items-center justify-center text-xs cursor-pointer"
                                        >
                                          <i className="fa-solid fa-xmark"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={manualMarkLoading === `${s.id}-pulang`}
                                        onClick={() => handleManualMark(s, 'pulang')}
                                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                                      >
                                        {manualMarkLoading === `${s.id}-pulang` ? (
                                          <i className="fa-solid fa-spinner animate-spin"></i>
                                        ) : (
                                          <i className="fa-solid fa-right-from-bracket text-[10px]"></i>
                                        )}
                                        <span>Tandai Pulang</span>
                                      </button>
                                    )}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-xs flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-right-to-bracket"></i>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                        {scanSummary.totalDatang}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total Hadir Datang</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-xs flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-right-from-bracket"></i>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                        {scanSummary.totalPulang}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total Pulang</div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/50 shadow-xs flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl shrink-0">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-teal-700 dark:text-teal-400">
                        {scanSummary.totalUnik}
                      </div>
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Total Unik Siswa</div>
                    </div>
                  </div>
                </div>

                {/* 4. Live Attendance Log Table */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-teal-600"></i>
                      Log Presensi Siswa Hari Ini ({filteredTodayScans.length} Presensi)
                    </h3>

                    {/* Filter & Search Controls */}
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {/* Filter Kelas */}
                      <select
                        value={scanFilterKelas}
                        onChange={(e) => setScanFilterKelas(e.target.value)}
                        className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                          className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-xs text-gray-400"></i>
                      </div>

                      <button
                        type="button"
                        onClick={fetchTodayScanData}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <i className="fa-solid fa-rotate text-xs"></i>
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto custom-scroll">
                    <table className="w-full text-left text-xs text-gray-700 dark:text-gray-200 border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Waktu</th>
                          <th className="py-2.5 px-3">Nama Siswa</th>
                          <th className="py-2.5 px-3">Kelas</th>
                          <th className="py-2.5 px-3">NISN</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Kios</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                        {filteredTodayScans.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                              Belum ada catatan presensi siswa hari ini.
                            </td>
                          </tr>
                        ) : (
                          filteredTodayScans.map((item, idx) => (
                            <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                              <td className="py-2.5 px-3 text-gray-400 text-[11px]">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-mono font-semibold text-gray-900 dark:text-white">
                                {item.jam ? item.jam.slice(0, 8) : '-'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                                {item.nama_siswa}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 font-bold text-[10px]">
                                  {item.kelas}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                {item.nisn || '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                {item.status === 'datang' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 inline-flex items-center gap-1">
                                    <i className="fa-solid fa-right-to-bracket text-[9px]"></i> Datang
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 inline-flex items-center gap-1">
                                    <i className="fa-solid fa-right-from-bracket text-[9px]"></i> Pulang
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  {item.device_id || 'kiosk-default'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PENUGASAN PIKET (ADMIN ONLY) */}
            {activeTab === 'penugasan' && isAdmin && (
              <div id="piket-content-penugasan" className="space-y-5 fade-in">
                {/* Day selector pills */}
                <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-2xl border border-teal-100 dark:border-teal-900/50">
                  <div className="text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-2 uppercase tracking-wide">
                    Pilih Hari Penugasan:
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {HARI_PIKET_LIST.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedHariPiket(day)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all pill-interactive flex flex-col items-center justify-center ${
                          selectedHariPiket === day
                            ? 'bg-teal-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <span>{day}</span>
                        <span className="text-[9px] opacity-75 font-normal">
                          {penugasanList.filter(p => p.hari === day).length} Petugas
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs">
                      <i className="fa-solid fa-calendar-day"></i>
                    </span>
                    Jadwal Piket Hari {selectedHariPiket}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Tahun Ajaran 2026/2027
                  </span>
                </div>

                {/* Section 1: Guru Piket */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-chalkboard-user text-teal-600 dark:text-teal-400"></i>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        Dewan Guru Piket ({penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length})
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned teachers */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru').length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        Belum ada guru yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Guru')
                        .map((guruItem, idx) => (
                          <div
                            key={guruItem.id}
                            className="flex items-center justify-between p-3 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {guruItem.guru_nama}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  NIP: {guruItem.guru_nip || '-'}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(guruItem.id, guruItem.guru_nama || '', 'Guru')}
                              title="Hapus penugasan guru"
                              className="btn-click w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 flex items-center justify-center transition border border-red-200 dark:border-red-900"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Guru form */}
                  <form onSubmit={handleAddGuruPiket} className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedTeacherId}
                      onChange={e => setSelectedTeacherId(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
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
                      className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                    >
                      <i className="fa-solid fa-plus text-xs"></i> Tugaskan Guru
                    </button>
                  </form>
                </div>

                {/* Section 2: Siswa Piket */}
                <div className="bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-users text-teal-600 dark:text-teal-400"></i>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                        Siswa Piket ({penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length})
                      </h4>
                    </div>
                  </div>

                  {/* List of assigned students */}
                  <div className="space-y-2">
                    {penugasanList.filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa').length === 0 ? (
                      <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        Belum ada siswa yang ditugaskan piket pada hari {selectedHariPiket}.
                      </div>
                    ) : (
                      penugasanList
                        .filter(p => p.hari === selectedHariPiket && p.tipe_petugas === 'Siswa')
                        .map((siswaItem, idx) => (
                          <div
                            key={siswaItem.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="text-xs font-bold text-gray-900 dark:text-white">
                                  {siswaItem.siswa_nama}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <span className="bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 font-semibold px-1.5 py-0.2 rounded">
                                    Kelas {siswaItem.kelas || '-'}
                                  </span>
                                  <span>NISN: {siswaItem.siswa_nisn || '-'}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeletePenugasan(siswaItem.id, siswaItem.siswa_nama || '', 'Siswa')}
                              title="Hapus penugasan siswa"
                              className="btn-click w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 flex items-center justify-center transition border border-red-200 dark:border-red-900"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Add Siswa Form with Selection / Manual toggle */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        + Tambah Siswa Piket
                      </span>
                      <div className="flex gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('select')}
                          className={`px-2 py-1 rounded-lg font-bold transition ${
                            siswaAssignMode === 'select'
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          Pilih dari Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setSiswaAssignMode('manual')}
                          className={`px-2 py-1 rounded-lg font-bold transition ${
                            siswaAssignMode === 'manual'
                              ? 'bg-teal-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
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
                              className="w-full px-2.5 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
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
                              className="flex-1 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
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
                              className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
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
                            className="sm:col-span-2 px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                          />
                          <input
                            type="text"
                            placeholder="Kelas (e.g. X Merdeka)"
                            value={manualSiswaKelas}
                            onChange={e => setManualSiswaKelas(e.target.value)}
                            className="px-3 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="NISN"
                              value={manualSiswaNisn}
                              onChange={e => setManualSiswaNisn(e.target.value)}
                              className="flex-1 px-2.5 py-2 text-xs rounded-xl input-premium text-gray-900 dark:text-white dark:bg-gray-800"
                            />
                            <button
                              type="submit"
                              disabled={assignLoading || !manualSiswaNama || !manualSiswaKelas}
                              className="btn-click bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 shrink-0"
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
              <div id="piket-content-form" className="fade-in space-y-4">
                  <div className="bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400 p-3 rounded-xl mb-4 text-[10px] text-orange-800 font-medium leading-relaxed">
                      <i className="fa-solid fa-circle-info mr-1.5"></i> Silakan isi laporan karena Anda ditugaskan piket hari ini. Periksa seluruh kelas secara bergantian.
                  </div>
                  <form onSubmit={handlePiketSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Tanggal Piket</label>
                        <input type="date" required value={getWitaDateStr()} readOnly className="w-full px-3 py-2.5 text-sm rounded-xl input-premium bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed" />
                      </div>
                      
                      <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-900/50 rounded-xl p-3">
                        <label className="block text-[11px] font-bold text-teal-800 dark:text-teal-400 mb-2">
                          <i className="fa-solid fa-clipboard-check mr-1.5"></i> Rekap Absensi Sekolah
                        </label>
                        <div className="flex gap-2 overflow-x-auto custom-scroll pb-2 mb-2">
                          {kelasList.map(k => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => setActiveKelas(k)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                                activeKelas === k 
                                ? 'bg-teal-600 text-white shadow-md' 
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
                              }`}
                            >
                              Kelas {k}
                            </button>
                          ))}
                        </div>
                        
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scroll pr-1">
                          {allStudents.filter(s => s.kelas === activeKelas).map((siswa, idx) => (
                            <div key={siswa.nisn} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-500 dark:text-white/80 w-4">{idx + 1}.</span>
                                <div>
                                  <div className="text-xs font-bold text-gray-900 dark:text-white">{siswa.nama_siswa}</div>
                                  <div className="text-[9px] text-gray-500 dark:text-white/80">{siswa.nisn}</div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {['H', 'S', 'I', 'A'].map(status => (
                                  <button 
                                    key={status}
                                    type="button"
                                    onClick={() => handlePiketAbsensiChange(siswa, status)}
                                    className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${
                                      piketAbsensi[siswa.nisn] === status 
                                      ? (status === 'H' ? 'bg-green-500 text-white shadow-sm' : 
                                         status === 'S' ? 'bg-blue-500 text-white shadow-sm' : 
                                         status === 'I' ? 'bg-orange-500 text-white shadow-sm' : 
                                         'bg-red-500 text-white shadow-sm') 
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1">Catatan Khusus</label>
                        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} className="w-full px-3 py-2.5 text-sm rounded-xl input-premium resize-none text-gray-900 dark:text-white bg-white dark:bg-gray-800" placeholder="Deskripsikan kejadian saat piket..."></textarea>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-gray-900 dark:text-white mb-1.5 ml-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-camera text-teal-600 dark:text-teal-400"></i>
                            Foto Dokumentasi Piket <span className="text-red-500 dark:text-red-400">(Wajib Kamera Langsung)</span>
                          </span>
                          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                            {file ? 'Foto Terpasang' : 'Kamera Aktif'}
                          </span>
                        </label>

                        <CameraSelfieCapture
                          key="cam-piket"
                          orientation="landscape"
                          initialFacingMode="environment"
                          existingPhotoUrl={photoPreviewUrl}
                          onPhotoConfirmed={(capturedFile: File, previewUrl: string) => {
                            setFile(capturedFile);
                            setPhotoPreviewUrl(previewUrl);
                          }}
                          onRetake={() => {
                            setFile(null);
                            setPhotoPreviewUrl(null);
                          }}
                        />

                        {file && (
                          <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between transition-all">
                            <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-200">
                              <i className="fa-solid fa-circle-check text-teal-600 dark:text-teal-400 text-base"></i>
                              <div>
                                <div>Foto dokumentasi piket siap diunggah</div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFile(null);
                                setPhotoPreviewUrl(null);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 font-bold px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <button type="submit" disabled={loading} className="btn-click w-full bg-teal-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-teal-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                          {loading ? 'Menyimpan...' : <><i className="fa-solid fa-paper-plane"></i> Kirim Laporan</>}
                        </button>
                      </div>
                  </form>
              </div>
            )}

            {/* TAB 3: REKAP PIKET */}
            {activeTab === 'rekap' && (
              <div id="piket-content-rekap" className="space-y-4 fade-in w-full max-w-full overflow-x-auto">
                  <PrintHeader />

                  {/* Filter Area (Hidden in Print) */}
                  <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/50 p-4 rounded-2xl space-y-3 no-print">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">PILIH BULAN</label>
                              <div className="flex gap-1.5">
                                <input 
                                  type="month" 
                                  value={rekapBulan} 
                                  onChange={e => setRekapBulan(e.target.value)} 
                                  className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                />
                                {rekapBulan && (
                                  <button 
                                    type="button" 
                                    onClick={() => setRekapBulan('')} 
                                    title="Tampilkan semua bulan" 
                                    className="px-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl shrink-0"
                                  >
                                    Semua
                                  </button>
                                )}
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">GURU PELAPOR</label>
                              <select 
                                value={rekapGuru} 
                                onChange={e => setRekapGuru(e.target.value)} 
                                className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                  <option value="Semua">Semua Guru</option>
                                  {guruOptions.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-bold text-teal-800 dark:text-teal-400 mb-1">STATUS VERIFIKASI</label>
                              <select 
                                value={rekapStatus} 
                                onChange={e => setRekapStatus(e.target.value)} 
                                className="w-full px-2.5 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              >
                                  <option value="Semua">Semua Status</option>
                                  <option value="Disetujui">Disetujui</option>
                                  <option value="Menunggu">Menunggu</option>
                                  <option value="Ditolak">Ditolak</option>
                              </select>
                          </div>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap gap-2">
                          <div className="relative flex-grow w-full sm:w-auto">
                              <i className="fa-solid fa-search absolute left-3 top-3 text-gray-400 dark:text-gray-400 text-xs"></i>
                              <input 
                                type="text" 
                                value={rekapSearch} 
                                onChange={e => setRekapSearch(e.target.value)} 
                                placeholder="Cari berdasarkan nama guru, catatan apel, atau tanggal..." 
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl input-premium bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                              />
                          </div>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="px-3 py-2 text-xs rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white font-semibold shrink-0"
                            >
                              Reset
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={fetchRekapPiket} 
                            disabled={rekapLoading} 
                            className="btn-click px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                          >
                            <i className={`fa-solid fa-rotate-right ${rekapLoading ? 'animate-spin' : ''}`}></i>
                            <span>Muat</span>
                          </button>
                      </div>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide">Total Laporan</div>
                          <div className="text-lg font-black text-teal-900 dark:text-white mt-0.5">{totalRekap}</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-green-800 dark:text-green-400 uppercase tracking-wide">Disetujui</div>
                          <div className="text-lg font-black text-green-900 dark:text-white mt-0.5">{totalDisetujui}</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 uppercase tracking-wide">Menunggu</div>
                          <div className="text-lg font-black text-yellow-900 dark:text-white mt-0.5">{totalMenunggu}</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl">
                          <div className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-wide">Ditolak</div>
                          <div className="text-lg font-black text-red-900 dark:text-white mt-0.5">{totalDitolak}</div>
                      </div>
                  </div>

                  {/* Rekap List Items */}
                  <div className="space-y-3 min-h-[200px]">
                      {rekapLoading ? (
                        <div className="text-center py-12 text-gray-500 text-xs italic dark:text-gray-400">
                          <i className="fa-solid fa-spinner animate-spin mr-1.5"></i> Memuat data rekap piket...
                        </div>
                      ) : filteredRekap.length === 0 ? (
                        <div className="text-center py-12 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                          <i className="fa-solid fa-shield-halved text-2xl text-gray-400 dark:text-gray-500 mb-2"></i>
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {rekapSearch ? `Tidak ada laporan piket yang sesuai dengan pencarian "${rekapSearch}".` : 'Tidak ada laporan piket yang sesuai dengan filter.'}
                          </p>
                          {rekapSearch && (
                            <button
                              type="button"
                              onClick={() => setRekapSearch('')}
                              className="mt-2 text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <i className="fa-solid fa-rotate-left text-[10px]"></i> Reset pencarian
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredRekap.map((item, idx) => (
                          <div key={item.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                                          <span>{idx + 1}. {item.guru_pelapor}</span>
                                      </div>
                                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                          {formatDateWita(item.tanggal)} ({item.tanggal ? getWitaDayName(new Date(item.tanggal + 'T00:00:00+08:00')) : '-'})
                                      </div>
                                  </div>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                      item.status_verifikasi === 'Disetujui' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      item.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  }`}>
                                      {item.status_verifikasi || 'Menunggu'}
                                  </span>
                              </div>

                              <div className="text-xs text-gray-700 dark:text-gray-200 space-y-1">
                                  <p><span className="font-semibold">Catatan Apel / Kejadian:</span> {item.catatan_apel || '-'}</p>
                                  {formatRekapAbsen(item.rekap_absen_kelas) && (
                                      <p><span className="font-semibold">Kehadiran Siswa:</span> <span className="font-medium text-teal-700 dark:text-teal-400">{formatRekapAbsen(item.rekap_absen_kelas)}</span></p>
                                  )}
                                  {item.link_foto && item.link_foto !== '-' && (
                                      <div className="flex items-center gap-2 mt-1.5">
                                          <img 
                                              src={transformGoogleDriveUrl(item.link_foto)} 
                                              alt="Foto Dokumentasi" 
                                              className="w-9 h-9 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
                                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                          />
                                          <a href={item.link_foto} target="_blank" rel="noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 text-xs">
                                              <i className="fa-solid fa-camera mr-1"></i> Lihat Foto Dokumentasi
                                          </a>
                                      </div>
                                  )}
                              </div>

                              {user?.role === 'Admin' && (
                                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 no-print">
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Disetujui'}
                                          onClick={() => updatePiketStatus(item.id, 'Disetujui')}
                                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                              item.status_verifikasi === 'Disetujui'
                                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 cursor-default opacity-80'
                                                  : 'bg-green-500 hover:bg-green-600 text-white disabled:opacity-50'
                                          }`}
                                      >
                                          {processingId === item.id ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-check"></i> Setujui</>}
                                      </button>
                                      <button
                                          disabled={processingId === item.id || item.status_verifikasi === 'Ditolak'}
                                          onClick={() => updatePiketStatus(item.id, 'Ditolak')}
                                          className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
                                              item.status_verifikasi === 'Ditolak'
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 cursor-default opacity-80'
                                                  : 'bg-red-500 hover:bg-red-600 text-white disabled:opacity-50'
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

                  <PrintSignature />

                  {/* Print & Export Actions */}
                  {filteredRekap.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 no-print">
                          <button 
                            type="button" 
                            onClick={exportRekapPiketCSV} 
                            className="btn-click w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
                          >
                              <i className="fa-solid fa-file-excel"></i> Export Excel (CSV)
                          </button>
                          <button 
                            type="button" 
                            onClick={() => window.print()} 
                            className="btn-click w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
                          >
                              <i className="fa-solid fa-print"></i> Cetak Rekap
                          </button>
                      </div>
                  )}
              </div>
            )}
        </div>
    </section>
  );
}

