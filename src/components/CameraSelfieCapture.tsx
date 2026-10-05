'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { drawWatermarkedCanvas, dataUrlToFile, getDefaultWatermarkOptions, reverseGeocodeNominatim, WatermarkCoordinates } from '@/lib/watermarkCanvas';

export interface CameraSelfieCaptureProps {
  onPhotoConfirmed: (file: File, previewUrl: string) => void;
  onCancel?: () => void;
  initialCoordinates?: WatermarkCoordinates | null;
  initialLocationName?: string | null;
  existingPhotoUrl?: string | null;
  initialFacingMode?: 'user' | 'environment';
  orientation?: 'portrait' | 'landscape';
  onRetake?: () => void;
}

export default function CameraSelfieCapture({
  onPhotoConfirmed,
  onCancel,
  initialCoordinates = null,
  initialLocationName = null,
  existingPhotoUrl = null,
  initialFacingMode = 'user',
  orientation = 'landscape',
  onRetake,
}: CameraSelfieCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const activeSessionIdRef = useRef(0);
  const facingModeRef = useRef<'user' | 'environment'>(initialFacingMode);
  const isRetakeRef = useRef(false);
  const isConfirmingRef = useRef(false);
  const isCapturingRef = useRef(false);
  const prevOrientationRef = useRef(orientation);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isCapturingRef.current = false;
      isConfirmingRef.current = false;
    };
  }, []);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(existingPhotoUrl || null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  // Synchronize internal capture state when existingPhotoUrl prop changes (e.g. form reset or Ganti Foto)
  useEffect(() => {
    setCapturedImage(existingPhotoUrl || null);
    isConfirmingRef.current = false;
    isCapturingRef.current = false;
    if (!existingPhotoUrl) {
      setCapturedFile(null);
    }
  }, [existingPhotoUrl]);

  const [coordinates, setCoordinates] = useState<WatermarkCoordinates | null>(initialCoordinates);
  const [locationName, setLocationName] = useState<string | null>(initialLocationName);
  const [gpsStatus, setGpsStatus] = useState<string>(initialLocationName || 'Mendeteksi GPS...');

  // 1. Live Geolocation tracking
  const requestLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setTimeout(() => {
        setGpsStatus('Mencari sinyal GPS...');
      }, 0);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoordinates(coords);
          setGpsStatus(`GPS OK (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`);
          // Reverse geocode via OpenStreetMap Nominatim
          reverseGeocodeNominatim(coords.latitude, coords.longitude)
            .then((locName) => {
              if (locName) {
                setLocationName(locName);
                setGpsStatus(locName);
              }
            })
            .catch((err: unknown) => {
              console.warn('[CameraCapture] Nominatim error:', err);
            });
        },
        (err) => {
          console.warn('[CameraCapture] Geolocation warning:', err.message);
          setGpsStatus('GPS tidak aktif / izin lokasi ditolak');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setTimeout(() => {
        setGpsStatus('Browser tidak mendukung geolokasi');
      }, 0);
    }
  }, []);

  // 2. Stop camera stream gracefully
  const stopCamera = useCallback(() => {
    // Invalidate in-flight camera start requests
    activeSessionIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // 3. Start camera stream with specified facingMode
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    isCapturingRef.current = false;
    const currentSession = ++activeSessionIdRef.current;
    setCameraError(null);

    stopCamera();
    activeSessionIdRef.current = currentSession;

    // Hardware sensor release pause (essential for iOS Safari)
    await new Promise(r => setTimeout(r, 150));
    if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {
      isStartingRef.current = false;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser ini tidak mendukung akses kamera langsung.');
      isStartingRef.current = false;
      return;
    }

    try {
      const isPortrait = orientation === 'portrait';
      const constraints: MediaStreamConstraints = {
        video: {
          // Defaults to facingMode: 'user', with resilient mode switching via { ideal: mode }
          facingMode: { ideal: mode },
          aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 16 / 9 },
          width: isPortrait ? { ideal: 720, max: 1080 } : { ideal: 1280, max: 1920 },
          height: isPortrait ? { ideal: 1280, max: 1920 } : { ideal: 720, max: 1080 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: unknown) {
        const e = err as { name?: string };
        // Fallback on OverconstrainedError / ConstraintNotSatisfiedError / TypeError / NotSupportedError for single-camera or legacy devices
        if (e?.name === 'OverconstrainedError' || e?.name === 'ConstraintNotSatisfiedError' || e?.name === 'TypeError' || e?.name === 'NotSupportedError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: mode },
                aspectRatio: isPortrait ? { ideal: 3 / 4 } : { ideal: 16 / 9 },
              },
              audio: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
        } else {
          throw err;
        }
      }

      if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {
        stream.getTracks().forEach(t => t.stop());
        isStartingRef.current = false;
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        try {
          await videoRef.current.play();
          if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          setIsStreaming(true);
        } catch (e: unknown) {
          if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {
            stream.getTracks().forEach(t => t.stop());
            return;
          }
          console.warn('Video play error:', e);
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          if (videoRef.current) {
            videoRef.current.srcObject = null;
          }
          const playErr = e as { message?: string };
          setCameraError(`Gagal memutar video kamera: ${playErr?.message || 'Autoplay diblokir browser'}. Harap ketuk tombol Coba Lagi.`);
          setIsStreaming(false);
        }
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || currentSession !== activeSessionIdRef.current) {
        return;
      }
      console.error('[CameraCapture] Camera access error:', err);
      const e = err as { name?: string; message?: string };
      let message = 'Gagal mengakses kamera.';
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        message = 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan browser.';
      } else if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
        message = 'Kamera tidak ditemukan pada perangkat Anda.';
      } else if (e?.name === 'NotReadableError' || e?.name === 'TrackStartError') {
        message = 'Kamera sedang digunakan oleh aplikasi lain.';
      } else {
        message = `Akses kamera gagal: ${e?.message || 'Error tidak diketahui'}`;
      }
      setCameraError(message);
      setIsStreaming(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [stopCamera, orientation]);

  // Toggle front/rear camera
  const toggleFacingMode = async () => {
    if (isStartingRef.current) return;
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    facingModeRef.current = nextMode;
    setFacingMode(nextMode);
    await startCamera(nextMode);
  };

  // Re-negotiate camera stream if orientation prop changes dynamically while streaming
  useEffect(() => {
    if (prevOrientationRef.current !== orientation) {
      prevOrientationRef.current = orientation;
      if (!capturedImage && isStreaming) {
        startCamera(facingModeRef.current || facingMode);
      }
    }
  }, [orientation, capturedImage, isStreaming, facingMode, startCamera]);

  // Start camera and track GPS when no photo is captured yet
  useEffect(() => {
    if (!capturedImage) {
      requestLocation();
      if (isRetakeRef.current) {
        isRetakeRef.current = false;
        startCamera(facingModeRef.current || initialFacingMode);
      } else {
        startCamera(initialFacingMode);
      }
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, requestLocation, stopCamera]);

  // 4. Capture photo and draw watermark
  const handleCapturePhoto = () => {
    if (isStartingRef.current || !isStreaming || capturedImage) return;
    if (isCapturingRef.current) return;
    if (!videoRef.current) return;
    if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
      showToast('Kamera Belum Siap', 'Harap tunggu hingga gambar kamera muncul sepenuhnya.', 'warning');
      return;
    }

    try {
      isCapturingRef.current = true;
      const watermarkOpts = getDefaultWatermarkOptions(coordinates, locationName);
      const isMirror = facingMode === 'user';
      const dataUrl = drawWatermarkedCanvas(videoRef.current, watermarkOpts, isMirror, orientation);
      const file = dataUrlToFile(dataUrl, `foto_kamera_${Date.now()}.jpg`);

      setCapturedImage(dataUrl);
      setCapturedFile(file);
      isConfirmingRef.current = false;
      stopCamera();
    } catch (err: unknown) {
      isCapturingRef.current = false;
      console.error('[CameraCapture] Error capturing frame:', err);
      const e = err as { message?: string };
      showToast('Gagal Mengambil Foto', e?.message || 'Silakan coba lagi.', 'error');
    }
  };

  // 5. Retake photo
  const handleRetake = () => {
    isRetakeRef.current = true;
    isCapturingRef.current = false;
    isConfirmingRef.current = false;
    setCapturedImage(null);
    setCapturedFile(null);
    try {
      onRetake?.();
    } catch (err: unknown) {
      console.warn('[CameraCapture] Error in onRetake:', err);
    }
  };

  // 6. Confirm and use photo
  const handleConfirmPhoto = () => {
    if (isConfirmingRef.current) return;
    if (!capturedFile && capturedImage) {
      isConfirmingRef.current = true;
      const file = dataUrlToFile(capturedImage, `foto_kamera_${Date.now()}.jpg`);
      stopCamera();
      try {
        const res = onPhotoConfirmed(file, capturedImage) as unknown;
        if (res && typeof (res as Promise<unknown>).catch === 'function') {
          (res as Promise<unknown>).catch((err: unknown) => {
            isConfirmingRef.current = false;
            console.error('[CameraCapture] Async error in onPhotoConfirmed:', err);
          });
        }
      } catch (err: unknown) {
        isConfirmingRef.current = false;
        console.error('[CameraCapture] Error in onPhotoConfirmed:', err);
      }
      return;
    }

    if (capturedFile && capturedImage) {
      isConfirmingRef.current = true;
      stopCamera();
      try {
        const res = onPhotoConfirmed(capturedFile, capturedImage) as unknown;
        if (res && typeof (res as Promise<unknown>).catch === 'function') {
          (res as Promise<unknown>).catch((err: unknown) => {
            isConfirmingRef.current = false;
            console.error('[CameraCapture] Async error in onPhotoConfirmed:', err);
          });
        }
      } catch (err: unknown) {
        isConfirmingRef.current = false;
        console.error('[CameraCapture] Error in onPhotoConfirmed:', err);
      }
    } else {
      showToast('Foto Belum Diambil', 'Harap ambil foto terlebih dahulu sebelum konfirmasi.', 'warning');
    }
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 shadow-sm transition-all">
      {/* Header status bar */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {capturedImage ? 'Preview Foto Kamera (Watermarked)' : 'Kamera Langsung Perangkat'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 max-w-full">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
            <i className="fa-solid fa-location-dot text-emerald-500 shrink-0"></i>
            <span className="truncate max-w-[150px] sm:max-w-none">{gpsStatus}</span>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded transition shrink-0"
              title="Batal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className={`relative w-full ${
        orientation === 'portrait' ? 'aspect-[3/4] max-w-sm mx-auto' : 'aspect-video'
      } rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-300 dark:border-slate-700`}>
        {/* Captured Image Preview */}
        {capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedImage}
              alt="Preview Kamera"
              className={`w-full h-full ${
                orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-video'
              } object-contain`}
            />
            <div className="absolute top-2 left-2 max-w-[calc(100%-1rem)] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-medium flex items-center gap-1.5 border border-white/20 truncate">
              <i className="fa-solid fa-check text-emerald-400 shrink-0"></i>
              <span className="shrink-0">Foto Terverifikasi</span>
              {locationName && <span className="text-slate-300 ml-1 max-w-[120px] sm:max-w-[200px] truncate">| {locationName}</span>}
            </div>
          </div>
        ) : (
          <>
            {/* Live Camera View */}
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full ${
                orientation === 'portrait' ? 'aspect-[3/4]' : 'aspect-video'
              } object-contain transform ${
                facingMode === 'user' ? '-scale-x-100' : ''
              } ${isStreaming ? 'block' : 'hidden'}`}
            />

            {/* Video loading state */}
            {!isStreaming && !cameraError && (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <i className="fa-solid fa-spinner fa-spin text-2xl text-emerald-500"></i>
                <span className="text-xs font-medium">Menghubungkan ke kamera perangkat...</span>
              </div>
            )}

            {/* Camera Error state */}
            {cameraError && (
              <div className="flex flex-col items-center justify-center p-5 text-center text-red-400 gap-3">
                <i className="fa-solid fa-triangle-exclamation text-3xl"></i>
                <div className="text-xs max-w-xs">{cameraError}</div>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-rotate-right"></i> Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-camera-rotate"></i> Ganti Kamera ({facingMode === 'user' ? 'Belakang' : 'Depan'})
                  </button>
                </div>
              </div>
            )}

            {/* Live Overlay Guide for Camera */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between items-start">
                  <span className="bg-black/50 backdrop-blur-sm text-[10px] text-white px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                    <i className="fa-solid fa-circle-dot text-red-500 animate-pulse"></i> LIVE
                  </span>
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="pointer-events-auto bg-black/60 hover:bg-black/80 backdrop-blur-sm text-[11px] text-slate-100 px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 transition"
                  >
                    <i className="fa-solid fa-camera-rotate text-emerald-400"></i>
                    <span>{facingMode === 'user' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
                  </button>
                </div>
                <div className="text-center text-white/80 text-[11px] font-medium drop-shadow bg-black/50 backdrop-blur-sm py-1 rounded-md mx-auto px-3">
                  {facingMode === 'user' ? 'Posisikan wajah Anda di tengah layar' : 'Arahkan kamera ke objek / aktivitas'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Controls & Action Buttons */}
      <div className="mt-3.5">
        {capturedImage ? (
          /* Preview Mode Action Buttons */
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <i className="fa-solid fa-camera-rotate text-slate-500"></i>
              Foto Ulang
            </button>
            <button
              type="button"
              onClick={handleConfirmPhoto}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <i className="fa-solid fa-check"></i>
              Gunakan Foto
            </button>
          </div>
        ) : (
          /* Live Camera Controls */
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Camera switch toggle button */}
            <button
              type="button"
              onClick={toggleFacingMode}
              title="Ganti Kamera Depan / Belakang"
              className="p-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm flex items-center gap-1.5"
            >
              <i className="fa-solid fa-camera-rotate text-emerald-500 text-base"></i>
            </button>

            {/* Visual Capture Button */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={!isStreaming}
              className="py-3 px-4 sm:px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-md shadow-emerald-700/20 transition transform active:scale-95"
            >
              <span className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
              </span>
              {facingMode === 'user' ? 'Ambil Foto Selfie' : 'Ambil Foto'}
            </button>

            {/* Refresh GPS button */}
            <button
              type="button"
              onClick={requestLocation}
              title="Perbarui koordinat GPS"
              className="p-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <i className="fa-solid fa-location-crosshairs text-base text-emerald-500"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
